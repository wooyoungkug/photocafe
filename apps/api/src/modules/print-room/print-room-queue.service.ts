import { Injectable, Logger, Optional, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';

export const PRINT_ROOM_QUEUE = 'print-room';

export interface PrintRoomJobPayload {
  /** PrintRoomJob.id */
  printRoomJobId: string;
  /** OrderItem.id (편의용) */
  orderItemId: string;
  /** 수동 트리거 여부 */
  isManual: boolean;
}

/**
 * 출력실 통합관리 — 큐 등록/재시도 담당.
 *
 * Redis 가 없는 환경에서는 BullMQ 큐 주입이 실패할 수 있으므로 Optional 로 받는다.
 * 큐가 없으면 enqueue 호출은 경고 로그만 남기고 조용히 종료 — API 메인 흐름은 영향 없음.
 */
@Injectable()
export class PrintRoomQueueService {
  private readonly logger = new Logger(PrintRoomQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @InjectQueue(PRINT_ROOM_QUEUE)
    private readonly queue?: Queue<PrintRoomJobPayload>,
  ) {}

  /**
   * OrderItem 단위로 출력실 작업을 큐에 등록.
   *
   * - 이미 printRoomStatus 가 비어있지 않으면(처리 중/완료) 스킵
   * - PrintRoomJob 레코드(status='pending') 를 먼저 만든 뒤 BullMQ job 추가
   * - Redis 미설정 등으로 큐가 없으면 DB 레코드만 남기고 종료 (수동 재시도 가능)
   */
  async enqueuePrintRoom(orderItemId: string, isManual = false): Promise<void> {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: {
        id: true,
        printMethod: true,
        printRoomStatus: true,
        order: { select: { id: true, orderNumber: true } },
      },
    });

    if (!item) {
      this.logger.warn(`[큐등록] OrderItem ${orderItemId} 없음 — 스킵`);
      return;
    }

    // 이미 처리 중/완료된 항목은 스킵 (수동 트리거인 경우에도 retry 메서드 권장)
    if (item.printRoomStatus && item.printRoomStatus !== 'waiting' && !isManual) {
      this.logger.debug(
        `[큐등록] OrderItem ${orderItemId} 이미 처리중 (status=${item.printRoomStatus}) — 스킵`,
      );
      return;
    }

    // PrintRoomJob 레코드 생성 (status=pending)
    const job = await this.prisma.printRoomJob.create({
      data: {
        orderItemId,
        isManual,
        status: 'pending',
      },
      select: { id: true },
    });

    // OrderItem.printRoomStatus = 'waiting' 으로 초기화 (없을 때만)
    if (!item.printRoomStatus) {
      await this.prisma.orderItem.update({
        where: { id: orderItemId },
        data: { printRoomStatus: 'waiting' },
      });
    }

    const payload: PrintRoomJobPayload = {
      printRoomJobId: job.id,
      orderItemId,
      isManual,
    };

    if (!this.queue) {
      this.logger.warn(
        `[큐등록] BullMQ 큐 비활성 (Redis 미설정) — PrintRoomJob ${job.id} 레코드만 생성, 수동 처리 필요`,
      );
      return;
    }

    try {
      await this.queue.add('process', payload, {
        jobId: job.id, // 동일 jobId 재등록 방지
      });
      this.logger.log(
        `[큐등록] PrintRoomJob ${job.id} (OrderItem ${orderItemId}, ${item.printMethod}) 큐 등록 완료`,
      );
    } catch (err) {
      this.logger.error(
        `[큐등록] BullMQ add 실패 (jobId=${job.id}): ${(err as Error)?.message}`,
        (err as Error)?.stack,
      );
    }
  }

  /**
   * 실패한 PrintRoomJob 을 재시도.
   *
   * - 새 PrintRoomJob 레코드를 만들지 않고 기존 레코드를 pending 으로 되돌린 후 큐에 재등록
   * - 큐 비활성 시 DB 만 갱신
   */
  async retryJob(printRoomJobId: string): Promise<void> {
    const job = await this.prisma.printRoomJob.findUnique({
      where: { id: printRoomJobId },
      select: { id: true, orderItemId: true, isManual: true, status: true },
    });
    if (!job) {
      throw new NotFoundException(`PrintRoomJob ${printRoomJobId} 없음`);
    }

    await this.prisma.printRoomJob.update({
      where: { id: printRoomJobId },
      data: {
        status: 'pending',
        errorLog: null,
        processedAt: null,
      },
    });

    await this.prisma.orderItem.update({
      where: { id: job.orderItemId },
      data: { printRoomStatus: 'waiting' },
    });

    if (!this.queue) {
      this.logger.warn(
        `[큐재시도] BullMQ 큐 비활성 — PrintRoomJob ${job.id} DB만 reset 됨`,
      );
      return;
    }

    const payload: PrintRoomJobPayload = {
      printRoomJobId: job.id,
      orderItemId: job.orderItemId,
      isManual: job.isManual,
    };

    try {
      // 같은 jobId 가 큐에 남아있을 수 있으니 제거 후 재등록
      const existing = await this.queue.getJob(job.id);
      if (existing) {
        await existing.remove();
      }
      await this.queue.add('process', payload, { jobId: job.id });
      this.logger.log(`[큐재시도] PrintRoomJob ${job.id} 재등록 완료`);
    } catch (err) {
      this.logger.error(
        `[큐재시도] 실패 (jobId=${job.id}): ${(err as Error)?.message}`,
      );
      throw err;
    }
  }
}

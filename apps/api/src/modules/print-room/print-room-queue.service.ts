import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PgBossService } from '@/common/pg-boss/pg-boss.service';

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
 * 출력실 통합관리 — 큐 등록/재시도 담당 (pg-boss 백엔드).
 *
 * pg-boss 시작 실패(예: DB 미접속) 환경에서도 API 자체는 부팅 가능.
 * `isReady()` 가 false 면 PrintRoomJob 레코드만 만들고 워커 큐 등록은 스킵 —
 * 수동 재시도(retryJob)로 복구 가능.
 */
@Injectable()
export class PrintRoomQueueService {
  private readonly logger = new Logger(PrintRoomQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pgBoss: PgBossService,
  ) {}

  /**
   * OrderItem 단위로 출력실 작업을 큐에 등록.
   *
   * - 이미 printRoomStatus 가 비어있지 않으면(처리 중/완료) 스킵
   * - PrintRoomJob 레코드(status='pending') 를 먼저 만든 뒤 pg-boss send
   * - pg-boss 가 비활성이면 DB 레코드만 남기고 종료 (수동 재시도 가능)
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

    if (!this.pgBoss.isReady()) {
      this.logger.warn(
        `[큐등록] pg-boss 비활성 — PrintRoomJob ${job.id} 레코드만 생성, 수동 처리 필요`,
      );
      return;
    }

    try {
      // BullMQ defaultJobOptions 와 동일한 재시도 정책:
      //   attempts: 3, backoff exponential 5초
      const jobId = await this.pgBoss.boss.send(PRINT_ROOM_QUEUE, payload, {
        // pg-boss 는 send 시 jobId 를 지정하면 멱등성 보장 (singletonKey)
        singletonKey: job.id,
        retryLimit: 3,
        retryDelay: 5,
        retryBackoff: true,
        retryDelayMax: 60,
      });
      this.logger.log(
        `[큐등록] PrintRoomJob ${job.id} (OrderItem ${orderItemId}, ${item.printMethod}) pg-boss 큐 등록 완료 — bossJobId=${jobId}`,
      );
    } catch (err) {
      this.logger.error(
        `[큐등록] pg-boss send 실패 (jobId=${job.id}): ${(err as Error)?.message}`,
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

    if (!this.pgBoss.isReady()) {
      this.logger.warn(
        `[큐재시도] pg-boss 비활성 — PrintRoomJob ${job.id} DB만 reset 됨`,
      );
      return;
    }

    const payload: PrintRoomJobPayload = {
      printRoomJobId: job.id,
      orderItemId: job.orderItemId,
      isManual: job.isManual,
    };

    try {
      // pg-boss 는 singletonKey 로 중복 방지. 재시도 시에는 새 job 으로 등록되므로
      // singletonKey 에 timestamp 를 덧붙여 중복 방지 우회.
      const bossJobId = await this.pgBoss.boss.send(PRINT_ROOM_QUEUE, payload, {
        singletonKey: `${job.id}-retry-${Date.now()}`,
        retryLimit: 3,
        retryDelay: 5,
        retryBackoff: true,
        retryDelayMax: 60,
      });
      this.logger.log(
        `[큐재시도] PrintRoomJob ${job.id} 재등록 완료 — bossJobId=${bossJobId}`,
      );
    } catch (err) {
      this.logger.error(
        `[큐재시도] 실패 (jobId=${job.id}): ${(err as Error)?.message}`,
      );
      throw err;
    }
  }
}

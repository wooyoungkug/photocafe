import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PrintRoomQueueService } from './print-room-queue.service';
import {
  PRINT_ROOM_STATUSES,
  PrintRoomStatus,
} from './dto/update-status.dto';
import { QueueQueryDto } from './dto/queue-query.dto';
import { DownloadLogQueryDto } from './dto/download-log-query.dto';
import { StatsQueryDto } from './dto/stats-query.dto';

/**
 * 출력실 통합관리 — REST API 비즈니스 로직.
 *
 * - Kanban 보드용 큐 조회 / 카드 상세
 * - 상태 수동 변경 / 재시도 트리거
 * - 다운로드 이력 / 일별 통계
 *
 * 큐 등록·재시도는 PrintRoomQueueService 위임.
 */
@Injectable()
export class PrintRoomService {
  private readonly logger = new Logger(PrintRoomService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: PrintRoomQueueService,
  ) {}

  // ==========================================================
  // 1) Kanban 큐 조회 — status 별 그룹화
  // ==========================================================
  async getQueue(query: QueueQueryDto) {
    const where: any = {
      // null(미진입) 은 보드에서 제외
      printRoomStatus: { in: [...PRINT_ROOM_STATUSES] },
    };

    if (query.printMethod) {
      where.printMethod = query.printMethod;
    }

    if (query.date) {
      const start = new Date(`${query.date}T00:00:00.000Z`);
      const end = new Date(`${query.date}T23:59:59.999Z`);
      where.order = { orderedAt: { gte: start, lte: end } };
    }

    const items = await this.prisma.orderItem.findMany({
      where,
      select: {
        id: true,
        size: true,
        pages: true,
        quantity: true,
        printMethod: true,
        printRoomStatus: true,
        order: {
          select: {
            orderNumber: true,
            client: { select: { clientName: true } },
          },
        },
        printRoomJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
            preset: { select: { gridCols: true, gridRows: true } },
          },
        },
        printDownloadLogs: {
          orderBy: { downloadedAt: 'desc' },
          take: 1,
          select: {
            downloadedAt: true,
            staffId: true,
          },
        },
        _count: { select: { printDownloadLogs: true } },
      },
      orderBy: [{ printRoomReadyAt: 'asc' }, { id: 'asc' }],
    });

    // staff 이름 일괄 조회 (lastDownloadedBy 표기용)
    const staffIds = Array.from(
      new Set(
        items
          .map((it) => it.printDownloadLogs[0]?.staffId)
          .filter((v): v is string => !!v),
      ),
    );
    const staffMap = new Map<string, string>();
    if (staffIds.length > 0) {
      const staffs = await this.prisma.staff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, name: true },
      });
      for (const s of staffs) staffMap.set(s.id, s.name);
    }

    // 그룹화
    const grouped: Record<PrintRoomStatus, any[]> = {
      waiting: [],
      ready: [],
      imposing: [],
      imposed: [],
      printing: [],
      done: [],
    };

    for (const it of items) {
      const status = it.printRoomStatus as PrintRoomStatus | null;
      if (!status || !grouped[status]) continue;

      const lastJob = it.printRoomJobs[0];
      const lastDl = it.printDownloadLogs[0];
      const nup =
        lastJob?.preset?.gridCols && lastJob?.preset?.gridRows
          ? lastJob.preset.gridCols * lastJob.preset.gridRows
          : null;

      grouped[status].push({
        orderItemId: it.id,
        orderNumber: it.order.orderNumber,
        studioName: it.order.client?.clientName ?? '',
        sizeCode: parseSizeCode(it.size),
        nup,
        pages: it.pages,
        quantity: it.quantity,
        printMethod: it.printMethod,
        printRoomStatus: status,
        lastDownloadedAt: lastDl?.downloadedAt ?? null,
        lastDownloadedBy: lastDl?.staffId
          ? staffMap.get(lastDl.staffId) ?? null
          : null,
        downloadCount: it._count.printDownloadLogs,
        impositionStatus: lastJob?.status ?? null,
      });
    }

    return grouped;
  }

  // ==========================================================
  // 2) 카드 상세 조회
  // ==========================================================
  async getItemDetail(orderItemId: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderedAt: true,
            status: true,
            client: {
              select: {
                id: true,
                clientName: true,
                clientCode: true,
              },
            },
          },
        },
        files: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            fileUrl: true,
            sortOrder: true,
          },
        },
        printReadyFiles: {
          orderBy: { preparedAt: 'desc' },
        },
        printRoomJobs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            preset: {
              select: {
                id: true,
                sizeCode: true,
                nup: true,
                gridCols: true,
                gridRows: true,
                paperOrientation: true,
              },
            },
          },
        },
        printDownloadLogs: {
          orderBy: { downloadedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!item) {
      throw new NotFoundException(
        `OrderItem ${orderItemId} 를 찾을 수 없습니다.`,
      );
    }

    // 다운로드 로그의 staff name 조회
    const staffIds = Array.from(
      new Set(
        item.printDownloadLogs
          .map((l) => l.staffId)
          .filter((v): v is string => !!v),
      ),
    );
    const staffMap = new Map<string, string>();
    if (staffIds.length > 0) {
      const staffs = await this.prisma.staff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, name: true },
      });
      for (const s of staffs) staffMap.set(s.id, s.name);
    }

    return {
      ...item,
      printDownloadLogs: item.printDownloadLogs.map((l) => ({
        ...l,
        // BigInt 직렬화 안전
        totalBytes: l.totalBytes.toString(),
        staffName: l.staffId ? staffMap.get(l.staffId) ?? null : null,
      })),
      // BigInt 직렬화 안전
      totalFileSize: item.totalFileSize.toString(),
    };
  }

  // ==========================================================
  // 3) 상태 수동 변경
  // ==========================================================
  async updateStatus(orderItemId: string, status: PrintRoomStatus) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: { id: true, printRoomStatus: true, printRoomReadyAt: true },
    });
    if (!item) {
      throw new NotFoundException(
        `OrderItem ${orderItemId} 를 찾을 수 없습니다.`,
      );
    }

    const now = new Date();
    const data: any = { printRoomStatus: status };
    if (status === 'ready' && !item.printRoomReadyAt) {
      data.printRoomReadyAt = now;
    }
    if (status === 'done') data.printRoomDoneAt = now;

    const updated = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data,
      select: {
        id: true,
        printRoomStatus: true,
        printRoomReadyAt: true,
        printRoomDoneAt: true,
      },
    });

    this.logger.log(
      `[상태변경] OrderItem ${orderItemId}: ${item.printRoomStatus ?? 'null'} → ${status}`,
    );
    return updated;
  }

  // ==========================================================
  // 4) 재시도 트리거
  // ==========================================================
  async retryItem(orderItemId: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: { id: true },
    });
    if (!item) {
      throw new NotFoundException(
        `OrderItem ${orderItemId} 를 찾을 수 없습니다.`,
      );
    }

    // 최근 실패 잡 우선
    const failedJob = await this.prisma.printRoomJob.findFirst({
      where: { orderItemId, status: 'failed' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (failedJob) {
      await this.queueService.retryJob(failedJob.id);
      return { jobId: failedJob.id, action: 'retry' as const };
    }

    // 실패 잡이 없으면 새로 enqueue (수동 트리거)
    await this.queueService.enqueuePrintRoom(orderItemId, true);
    const newJob = await this.prisma.printRoomJob.findFirst({
      where: { orderItemId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    return { jobId: newJob?.id ?? null, action: 'enqueue' as const };
  }

  // ==========================================================
  // 5) 다운로드 이력 조회
  // ==========================================================
  async getDownloadLogs(query: DownloadLogQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: any = {};
    if (query.staffId) where.staffId = query.staffId;
    if (query.orderItemId) where.orderItemId = query.orderItemId;
    if (query.from || query.to) {
      where.downloadedAt = {};
      if (query.from) {
        where.downloadedAt.gte = new Date(`${query.from}T00:00:00.000Z`);
      }
      if (query.to) {
        where.downloadedAt.lte = new Date(`${query.to}T23:59:59.999Z`);
      }
    }

    const [rows, total] = await Promise.all([
      this.prisma.printDownloadLog.findMany({
        where,
        orderBy: { downloadedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          orderItem: {
            select: {
              id: true,
              productionNumber: true,
              productName: true,
              size: true,
              order: {
                select: {
                  orderNumber: true,
                  client: { select: { clientName: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.printDownloadLog.count({ where }),
    ]);

    // staff name 일괄 조회
    const staffIds = Array.from(
      new Set(rows.map((r) => r.staffId).filter((v): v is string => !!v)),
    );
    const staffMap = new Map<string, string>();
    if (staffIds.length > 0) {
      const staffs = await this.prisma.staff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, name: true },
      });
      for (const s of staffs) staffMap.set(s.id, s.name);
    }

    return {
      data: rows.map((r) => ({
        ...r,
        totalBytes: r.totalBytes.toString(),
        staffName: r.staffId ? staffMap.get(r.staffId) ?? null : null,
      })),
      total,
      page,
      pageSize,
    };
  }

  // ==========================================================
  // 6) 일별 통계
  // ==========================================================
  async getStats(query: StatsQueryDto) {
    // 기본: 최근 7일
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const to = query.to
      ? new Date(`${query.to}T23:59:59.999Z`)
      : new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
    const from = query.from
      ? new Date(`${query.from}T00:00:00.000Z`)
      : new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);

    // 일자별 버킷 초기화
    const dayKey = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
        d.getUTCDate(),
      ).padStart(2, '0')}`;

    const buckets: Record<
      string,
      {
        date: string;
        totalItems: number;
        doneItems: number;
        downloadCount: number;
        failedCount: number;
      }
    > = {};
    for (
      let cursor = new Date(from);
      cursor.getTime() <= to.getTime();
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
    ) {
      const k = dayKey(cursor);
      buckets[k] = {
        date: k,
        totalItems: 0,
        doneItems: 0,
        downloadCount: 0,
        failedCount: 0,
      };
    }

    // 총 작업/완료/실패: PrintRoomJob.createdAt 기준
    const jobs = await this.prisma.printRoomJob.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true, status: true, processedAt: true },
    });
    for (const j of jobs) {
      const k = dayKey(j.createdAt);
      if (!buckets[k]) continue;
      buckets[k].totalItems += 1;
      if (j.status === 'done') buckets[k].doneItems += 1;
      if (j.status === 'failed') buckets[k].failedCount += 1;
    }

    // 다운로드 카운트: PrintDownloadLog.downloadedAt 기준
    const logs = await this.prisma.printDownloadLog.findMany({
      where: { downloadedAt: { gte: from, lte: to } },
      select: { downloadedAt: true, fileCount: true },
    });
    for (const l of logs) {
      const k = dayKey(l.downloadedAt);
      if (!buckets[k]) continue;
      buckets[k].downloadCount += l.fileCount;
    }

    return Object.values(buckets).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  // ==========================================================
  // 7) PrintRoomPreset CRUD (Phase 6 미리보기/관리 화면용)
  // ==========================================================
  async listPresets(opts: { activeOnly?: boolean; nup?: string } = {}) {
    const where: any = {};
    if (opts.activeOnly) where.isActive = true;
    if (opts.nup) where.nup = opts.nup;
    return this.prisma.printRoomPreset.findMany({
      where,
      orderBy: [{ nup: 'asc' }, { sizeCode: 'asc' }],
    });
  }

  async getPreset(id: string) {
    const preset = await this.prisma.printRoomPreset.findUnique({
      where: { id },
    });
    if (!preset) {
      throw new NotFoundException(`PrintRoomPreset ${id} 를 찾을 수 없습니다.`);
    }
    return preset;
  }

  async createPreset(data: {
    sizeCode: string;
    nup: string;
    paperOrientation: string;
    gridCols: number;
    gridRows: number;
    marginMm?: number;
    cropMarkLengthMm?: number;
    cropMarkThicknessPt?: number;
    cropMarkColor?: string;
    pdfVersion?: string;
    isActive?: boolean;
  }) {
    const existing = await this.prisma.printRoomPreset.findUnique({
      where: { sizeCode_nup: { sizeCode: data.sizeCode, nup: data.nup } },
    });
    if (existing) {
      throw new BadRequestException(
        `이미 등록된 프리셋입니다: ${data.sizeCode} / ${data.nup}`,
      );
    }
    return this.prisma.printRoomPreset.create({ data });
  }

  async updatePreset(
    id: string,
    data: Partial<{
      paperOrientation: string;
      gridCols: number;
      gridRows: number;
      marginMm: number;
      cropMarkLengthMm: number;
      cropMarkThicknessPt: number;
      cropMarkColor: string;
      pdfVersion: string;
      isActive: boolean;
    }>,
  ) {
    await this.getPreset(id);
    return this.prisma.printRoomPreset.update({ where: { id }, data });
  }

  async deactivatePreset(id: string) {
    await this.getPreset(id);
    return this.prisma.printRoomPreset.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

/**
 * OrderItem.size("210x297", "9×12인치" 등) → "AxB" 정규화 코드.
 * 매칭에 사용되는 ImpositionMatcher.normalizeSize 와 의도적으로 같은 규칙.
 */
export function parseSizeCode(size: string | null | undefined): string {
  if (!size) return '';
  return size
    .replace(/[×✕*]/g, 'x')
    .replace(/\s+/g, '')
    .replace(/인치$|inch$|\bin\b/gi, '')
    .replace(/mm$/i, '')
    .toLowerCase()
    .trim();
}

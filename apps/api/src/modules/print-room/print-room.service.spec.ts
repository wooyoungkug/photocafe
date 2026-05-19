/**
 * PrintRoomService 단위 테스트 (2026-05-19)
 *
 * 검증 대상:
 *  - getQueue: status 별 그룹화, printRoomStatus=null 제외, printMethod/date 필터
 *  - updateStatus:
 *      • status='ready' 진입 시 printRoomReadyAt 최초 1회만 기록 (회귀 테스트)
 *      • status='done' 시 printRoomDoneAt 기록
 *      • 미존재 OrderItem 은 NotFoundException
 *  - retryItem:
 *      • 실패 잡 존재 시 retryJob 호출 → { action: 'retry' }
 *      • 실패 잡 없으면 enqueuePrintRoom(_, true) 호출 → { action: 'enqueue' }
 *      • 미존재 OrderItem 은 NotFoundException
 *  - getStats: 기본 최근 7일 버킷 생성, job/log 집계 정확성
 *
 * 의존성:
 *  - PrismaService: 수동 mock
 *  - PrintRoomQueueService: 수동 mock
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrintRoomService, parseSizeCode } from './print-room.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PrintRoomQueueService } from './print-room-queue.service';

// =====================================================
// Mock 헬퍼
// =====================================================
function createMockPrisma() {
  return {
    orderItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    staff: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    printRoomJob: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    printDownloadLog: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };
}

function createMockQueueService() {
  return {
    retryJob: jest.fn().mockResolvedValue(undefined),
    enqueuePrintRoom: jest.fn().mockResolvedValue(undefined),
  };
}

// =====================================================
describe('PrintRoomService', () => {
  let service: PrintRoomService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let queueService: ReturnType<typeof createMockQueueService>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    queueService = createMockQueueService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrintRoomService,
        { provide: PrismaService, useValue: prisma },
        { provide: PrintRoomQueueService, useValue: queueService },
      ],
    }).compile();

    service = module.get<PrintRoomService>(PrintRoomService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================
  describe('getQueue', () => {
    const baseItem = {
      id: 'oi-1',
      size: '210x297',
      pages: 24,
      quantity: 1,
      printMethod: 'indigo',
      printRoomStatus: 'ready',
      order: {
        orderNumber: 'ORD-2026-0001',
        client: { clientName: '스튜디오A' },
      },
      printRoomJobs: [],
      printDownloadLogs: [],
      _count: { printDownloadLogs: 0 },
    };

    it('status 별로 그룹화하여 6개 키(waiting/ready/imposing/imposed/printing/done)를 반환한다', async () => {
      prisma.orderItem.findMany.mockResolvedValue([
        { ...baseItem, id: 'oi-1', printRoomStatus: 'ready' },
        { ...baseItem, id: 'oi-2', printRoomStatus: 'printing' },
        { ...baseItem, id: 'oi-3', printRoomStatus: 'done' },
      ]);

      const result = await service.getQueue({});

      expect(Object.keys(result).sort()).toEqual(
        ['done', 'imposed', 'imposing', 'printing', 'ready', 'waiting'].sort(),
      );
      expect(result.ready).toHaveLength(1);
      expect(result.printing).toHaveLength(1);
      expect(result.done).toHaveLength(1);
      expect(result.waiting).toHaveLength(0);
      expect(result.ready[0]).toMatchObject({
        orderItemId: 'oi-1',
        orderNumber: 'ORD-2026-0001',
        studioName: '스튜디오A',
        printRoomStatus: 'ready',
      });
    });

    it('Prisma where 절에 printRoomStatus IN [6개 상태] 가 포함되어 null 항목을 제외한다', async () => {
      prisma.orderItem.findMany.mockResolvedValue([]);

      await service.getQueue({});

      const callArg = prisma.orderItem.findMany.mock.calls[0][0];
      expect(callArg.where.printRoomStatus).toEqual({
        in: ['waiting', 'ready', 'imposing', 'imposed', 'printing', 'done'],
      });
    });

    it('printMethod 필터를 where 절에 적용한다', async () => {
      prisma.orderItem.findMany.mockResolvedValue([]);

      await service.getQueue({ printMethod: 'indigo' });

      const callArg = prisma.orderItem.findMany.mock.calls[0][0];
      expect(callArg.where.printMethod).toBe('indigo');
    });

    it('date 필터를 UTC 범위로 변환하여 order.orderedAt 에 적용한다', async () => {
      prisma.orderItem.findMany.mockResolvedValue([]);

      await service.getQueue({ date: '2026-05-19' });

      const callArg = prisma.orderItem.findMany.mock.calls[0][0];
      expect(callArg.where.order.orderedAt.gte.toISOString()).toBe(
        '2026-05-19T00:00:00.000Z',
      );
      expect(callArg.where.order.orderedAt.lte.toISOString()).toBe(
        '2026-05-19T23:59:59.999Z',
      );
    });

    it('알 수 없는 printRoomStatus 값은 무시한다 (방어 로직)', async () => {
      prisma.orderItem.findMany.mockResolvedValue([
        { ...baseItem, id: 'oi-x', printRoomStatus: 'unknown-status' as any },
      ]);

      const result = await service.getQueue({});

      // 6개 카테고리 모두 0
      const totalCount = Object.values(result).reduce(
        (acc, arr) => acc + arr.length,
        0,
      );
      expect(totalCount).toBe(0);
    });

    it('마지막 잡의 preset(gridCols x gridRows) 로부터 nup 을 계산한다', async () => {
      prisma.orderItem.findMany.mockResolvedValue([
        {
          ...baseItem,
          printRoomJobs: [
            { status: 'done', preset: { gridCols: 3, gridRows: 4 } },
          ],
        },
      ]);

      const result = await service.getQueue({});
      expect(result.ready[0].nup).toBe(12);
      expect(result.ready[0].impositionStatus).toBe('done');
    });

    it('preset 정보가 없으면 nup 은 null', async () => {
      prisma.orderItem.findMany.mockResolvedValue([
        { ...baseItem, printRoomJobs: [{ status: 'pending', preset: null }] },
      ]);

      const result = await service.getQueue({});
      expect(result.ready[0].nup).toBeNull();
    });
  });

  // ============================================================
  describe('updateStatus', () => {
    it('미존재 OrderItem 은 NotFoundException', async () => {
      prisma.orderItem.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('not-exist', 'ready'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.orderItem.update).not.toHaveBeenCalled();
    });

    it("[회귀] status='ready' 진입 시 printRoomReadyAt 이 null 이면 새로 기록한다", async () => {
      prisma.orderItem.findUnique.mockResolvedValue({
        id: 'oi-1',
        printRoomStatus: 'waiting',
        printRoomReadyAt: null,
      });
      prisma.orderItem.update.mockResolvedValue({
        id: 'oi-1',
        printRoomStatus: 'ready',
        printRoomReadyAt: new Date(),
        printRoomDoneAt: null,
      });

      await service.updateStatus('oi-1', 'ready');

      const updateArg = prisma.orderItem.update.mock.calls[0][0];
      expect(updateArg.data.printRoomStatus).toBe('ready');
      expect(updateArg.data.printRoomReadyAt).toBeInstanceOf(Date);
    });

    it("[회귀-핵심] status='ready' 재진입 시 기존 printRoomReadyAt 을 보존한다 (덮어쓰지 않음)", async () => {
      const originalReadyAt = new Date('2026-05-01T10:00:00.000Z');
      prisma.orderItem.findUnique.mockResolvedValue({
        id: 'oi-1',
        printRoomStatus: 'imposing',
        printRoomReadyAt: originalReadyAt, // 이미 기록되어 있음
      });
      prisma.orderItem.update.mockResolvedValue({
        id: 'oi-1',
        printRoomStatus: 'ready',
        printRoomReadyAt: originalReadyAt,
        printRoomDoneAt: null,
      });

      await service.updateStatus('oi-1', 'ready');

      const updateArg = prisma.orderItem.update.mock.calls[0][0];
      // 핵심: ready 재진입에서는 printRoomReadyAt 을 data 에 포함하지 않아야 함
      expect(updateArg.data.printRoomStatus).toBe('ready');
      expect(updateArg.data).not.toHaveProperty('printRoomReadyAt');
    });

    it("status='done' 시 printRoomDoneAt 을 항상 기록한다", async () => {
      prisma.orderItem.findUnique.mockResolvedValue({
        id: 'oi-1',
        printRoomStatus: 'printing',
        printRoomReadyAt: new Date('2026-05-01T10:00:00.000Z'),
      });
      prisma.orderItem.update.mockResolvedValue({
        id: 'oi-1',
        printRoomStatus: 'done',
        printRoomReadyAt: new Date('2026-05-01T10:00:00.000Z'),
        printRoomDoneAt: new Date(),
      });

      await service.updateStatus('oi-1', 'done');

      const updateArg = prisma.orderItem.update.mock.calls[0][0];
      expect(updateArg.data.printRoomStatus).toBe('done');
      expect(updateArg.data.printRoomDoneAt).toBeInstanceOf(Date);
      // ready 진입이 아니므로 readyAt 은 만지지 않음
      expect(updateArg.data).not.toHaveProperty('printRoomReadyAt');
    });

    it("status='waiting' 등 ready/done 외 상태는 readyAt/doneAt 을 만지지 않는다", async () => {
      prisma.orderItem.findUnique.mockResolvedValue({
        id: 'oi-1',
        printRoomStatus: 'ready',
        printRoomReadyAt: new Date('2026-05-01T10:00:00.000Z'),
      });
      prisma.orderItem.update.mockResolvedValue({
        id: 'oi-1',
        printRoomStatus: 'waiting',
        printRoomReadyAt: new Date('2026-05-01T10:00:00.000Z'),
        printRoomDoneAt: null,
      });

      await service.updateStatus('oi-1', 'waiting');

      const updateArg = prisma.orderItem.update.mock.calls[0][0];
      expect(updateArg.data.printRoomStatus).toBe('waiting');
      expect(updateArg.data).not.toHaveProperty('printRoomReadyAt');
      expect(updateArg.data).not.toHaveProperty('printRoomDoneAt');
    });
  });

  // ============================================================
  describe('retryItem', () => {
    it('미존재 OrderItem 은 NotFoundException', async () => {
      prisma.orderItem.findUnique.mockResolvedValue(null);

      await expect(service.retryItem('not-exist')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(queueService.retryJob).not.toHaveBeenCalled();
      expect(queueService.enqueuePrintRoom).not.toHaveBeenCalled();
    });

    it("실패한 PrintRoomJob 이 있으면 retryJob 을 호출하고 { action: 'retry' } 반환", async () => {
      prisma.orderItem.findUnique.mockResolvedValue({ id: 'oi-1' });
      prisma.printRoomJob.findFirst.mockResolvedValueOnce({ id: 'job-failed-1' });

      const result = await service.retryItem('oi-1');

      expect(queueService.retryJob).toHaveBeenCalledWith('job-failed-1');
      expect(queueService.enqueuePrintRoom).not.toHaveBeenCalled();
      expect(result).toEqual({ jobId: 'job-failed-1', action: 'retry' });
    });

    it("실패한 잡이 없으면 enqueuePrintRoom(_, true) 호출하고 { action: 'enqueue' } 반환", async () => {
      prisma.orderItem.findUnique.mockResolvedValue({ id: 'oi-1' });
      // 첫 findFirst (실패 잡 검색) → null
      prisma.printRoomJob.findFirst
        .mockResolvedValueOnce(null)
        // 두 번째 findFirst (새로 만든 잡 조회) → 생성된 job
        .mockResolvedValueOnce({ id: 'job-new-1' });

      const result = await service.retryItem('oi-1');

      expect(queueService.retryJob).not.toHaveBeenCalled();
      expect(queueService.enqueuePrintRoom).toHaveBeenCalledWith('oi-1', true);
      expect(result).toEqual({ jobId: 'job-new-1', action: 'enqueue' });
    });

    it("enqueue 후 생성된 잡 조회가 null 이어도 { action: 'enqueue', jobId: null } 반환", async () => {
      prisma.orderItem.findUnique.mockResolvedValue({ id: 'oi-1' });
      prisma.printRoomJob.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await service.retryItem('oi-1');

      expect(result).toEqual({ jobId: null, action: 'enqueue' });
    });
  });

  // ============================================================
  describe('getStats', () => {
    it('from/to 미지정 시 7일치 버킷을 정렬된 배열로 반환한다', async () => {
      prisma.printRoomJob.findMany.mockResolvedValue([]);
      prisma.printDownloadLog.findMany.mockResolvedValue([]);

      const result = await service.getStats({});

      expect(result).toHaveLength(7);
      // 각 버킷 형태 확인
      for (const b of result) {
        expect(b).toMatchObject({
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          totalItems: 0,
          doneItems: 0,
          downloadCount: 0,
          failedCount: 0,
        });
      }
      // 날짜 오름차순
      const dates = result.map((b) => b.date);
      expect([...dates].sort()).toEqual(dates);
    });

    it('PrintRoomJob 의 status 별로 totalItems/doneItems/failedCount 를 집계한다', async () => {
      // 명시적 범위로 결정성 보장
      const from = '2026-05-15';
      const to = '2026-05-17';
      prisma.printRoomJob.findMany.mockResolvedValue([
        { createdAt: new Date('2026-05-15T03:00:00.000Z'), status: 'done' },
        { createdAt: new Date('2026-05-15T05:00:00.000Z'), status: 'done' },
        { createdAt: new Date('2026-05-15T06:00:00.000Z'), status: 'failed' },
        { createdAt: new Date('2026-05-16T00:00:00.000Z'), status: 'pending' },
        { createdAt: new Date('2026-05-17T23:00:00.000Z'), status: 'failed' },
      ]);
      prisma.printDownloadLog.findMany.mockResolvedValue([
        { downloadedAt: new Date('2026-05-15T04:00:00.000Z'), fileCount: 10 },
        { downloadedAt: new Date('2026-05-17T01:00:00.000Z'), fileCount: 3 },
      ]);

      const result = await service.getStats({ from, to });

      expect(result).toHaveLength(3);
      const map = Object.fromEntries(result.map((b) => [b.date, b]));
      expect(map['2026-05-15']).toMatchObject({
        totalItems: 3,
        doneItems: 2,
        failedCount: 1,
        downloadCount: 10,
      });
      expect(map['2026-05-16']).toMatchObject({
        totalItems: 1,
        doneItems: 0,
        failedCount: 0,
        downloadCount: 0,
      });
      expect(map['2026-05-17']).toMatchObject({
        totalItems: 1,
        doneItems: 0,
        failedCount: 1,
        downloadCount: 3,
      });
    });
  });

  // ============================================================
  describe('parseSizeCode (헬퍼)', () => {
    it('×, ✕, *, 공백, 단위, 대소문자를 정규화한다', () => {
      expect(parseSizeCode('210×297mm')).toBe('210x297');
      expect(parseSizeCode('9 ✕ 12 인치')).toBe('9x12');
      expect(parseSizeCode('A4*A4')).toBe('a4xa4');
      expect(parseSizeCode(null)).toBe('');
      expect(parseSizeCode(undefined)).toBe('');
    });
  });
});

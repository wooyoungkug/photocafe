/**
 * PrintRoomController 단위 테스트 (2026-05-19)
 *
 * 목적: 컨트롤러가 PrintRoomService 메서드로 올바르게 위임하는지 확인.
 * 가드(JwtAuthGuard, StaffOnlyGuard)는 overrideGuard 로 우회.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PrintRoomController } from './print-room.controller';
import { PrintRoomService } from './print-room.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { StaffOnlyGuard } from '@/common/guards/staff-only.guard';

function createMockService() {
  return {
    getQueue: jest.fn(),
    getItemDetail: jest.fn(),
    updateStatus: jest.fn(),
    retryItem: jest.fn(),
    getDownloadLogs: jest.fn(),
    getStats: jest.fn(),
  };
}

describe('PrintRoomController', () => {
  let controller: PrintRoomController;
  let service: ReturnType<typeof createMockService>;

  beforeEach(async () => {
    service = createMockService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrintRoomController],
      providers: [{ provide: PrintRoomService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(StaffOnlyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PrintRoomController>(PrintRoomController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /print-room/queue', () => {
    it('쿼리를 service.getQueue 로 위임한다', async () => {
      const mockResult = {
        waiting: [],
        ready: [],
        imposing: [],
        imposed: [],
        printing: [],
        done: [],
      };
      service.getQueue.mockResolvedValue(mockResult);

      const result = await controller.getQueue({
        printMethod: 'indigo',
        date: '2026-05-19',
      });

      expect(service.getQueue).toHaveBeenCalledWith({
        printMethod: 'indigo',
        date: '2026-05-19',
      });
      expect(result).toBe(mockResult);
    });
  });

  describe('GET /print-room/items/:id', () => {
    it('id 를 service.getItemDetail 로 위임한다', async () => {
      service.getItemDetail.mockResolvedValue({ id: 'oi-1' });

      const result = await controller.getItem('oi-1');

      expect(service.getItemDetail).toHaveBeenCalledWith('oi-1');
      expect(result).toEqual({ id: 'oi-1' });
    });
  });

  describe('PATCH /print-room/items/:id/status', () => {
    it('id 와 dto.status 를 service.updateStatus 로 위임한다', async () => {
      service.updateStatus.mockResolvedValue({
        id: 'oi-1',
        printRoomStatus: 'ready',
      });

      const result = await controller.updateStatus('oi-1', { status: 'ready' });

      expect(service.updateStatus).toHaveBeenCalledWith('oi-1', 'ready');
      expect(result).toMatchObject({ printRoomStatus: 'ready' });
    });
  });

  describe('POST /print-room/items/:id/retry', () => {
    it('id 를 service.retryItem 으로 위임한다', async () => {
      service.retryItem.mockResolvedValue({
        jobId: 'job-1',
        action: 'retry' as const,
      });

      const result = await controller.retry('oi-1');

      expect(service.retryItem).toHaveBeenCalledWith('oi-1');
      expect(result).toEqual({ jobId: 'job-1', action: 'retry' });
    });
  });

  describe('GET /print-room/stats', () => {
    it('쿼리를 service.getStats 로 위임한다', async () => {
      service.getStats.mockResolvedValue([]);

      await controller.getStats({ from: '2026-05-15', to: '2026-05-17' });

      expect(service.getStats).toHaveBeenCalledWith({
        from: '2026-05-15',
        to: '2026-05-17',
      });
    });
  });

  describe('가드 메타데이터', () => {
    it('컨트롤러에 JwtAuthGuard + StaffOnlyGuard 가 wiring 되어 있다', () => {
      const guards = Reflect.getMetadata('__guards__', PrintRoomController);
      expect(guards).toBeDefined();
      const guardNames = guards.map((g: any) => g.name);
      expect(guardNames).toContain('JwtAuthGuard');
      expect(guardNames).toContain('StaffOnlyGuard');
    });
  });
});

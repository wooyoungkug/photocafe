/**
 * NotificationService 단위 테스트
 *
 * 검증:
 *  - create: DB 저장 + 카카오 발송 fire-and-forget
 *  - sendKakao: KakaoAlimtalk.isConfigured()=false 시 skip
 *  - markRead: 본인 외 알림 접근 시 NotFoundException
 *  - listForStaff: 페이지네이션 + cursor 인코딩
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { KakaoAlimtalkService } from '@/common/kakao-alimtalk/kakao-alimtalk.service';
import { NOTIFICATION_TYPES } from './dto/notification.dto';

function createMockPrisma() {
  return {
    notification: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    staff: {
      findUnique: jest.fn(),
    },
  };
}

function createMockKakao(configured = false) {
  return {
    isConfigured: jest.fn().mockReturnValue(configured),
    isSmsConfigured: jest.fn().mockReturnValue(configured),
    send: jest.fn().mockResolvedValue({ success: true, sentCount: 1, failedCount: 0, method: 'alimtalk' }),
  };
}

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let kakao: ReturnType<typeof createMockKakao>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    kakao = createMockKakao(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: KakaoAlimtalkService, useValue: kakao },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================
  describe('create', () => {
    it('알림을 DB에 저장하고 결과를 반환한다', async () => {
      const created = {
        id: 'notif-1',
        recipientStaffId: 'staff-1',
        type: NOTIFICATION_TYPES.ORDER_EDIT,
        title: '주문 수정',
        body: '내용',
        payload: null,
        link: '/orders/1',
        channel: 'inapp',
      };
      prisma.notification.create.mockResolvedValue(created);
      // sendKakao 내부에서 update 가 호출됨 (skipped 상태 기록)
      prisma.notification.update.mockResolvedValue({});

      const result = await service.create({
        recipientStaffId: 'staff-1',
        type: NOTIFICATION_TYPES.ORDER_EDIT,
        title: '주문 수정',
        body: '내용',
        link: '/orders/1',
      });

      expect(result).toEqual(created);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientStaffId: 'staff-1',
            type: NOTIFICATION_TYPES.ORDER_EDIT,
            title: '주문 수정',
            body: '내용',
            link: '/orders/1',
            channel: 'inapp',
          }),
        }),
      );
    });

    it('Kakao 미설정 시 sendKakao 가 skipped 상태로 기록된다', async () => {
      const created = {
        id: 'notif-2',
        recipientStaffId: 'staff-1',
        type: NOTIFICATION_TYPES.ORDER_EDIT,
        title: 't',
        body: 'b',
        payload: null,
        link: null,
        channel: 'inapp',
      };
      prisma.notification.create.mockResolvedValue(created);
      prisma.notification.update.mockResolvedValue({});
      kakao.isConfigured.mockReturnValue(false);

      await service.create({
        recipientStaffId: 'staff-1',
        type: NOTIFICATION_TYPES.ORDER_EDIT,
        title: 't',
        body: 'b',
      });

      // fire-and-forget — 마이크로태스크 큐 flush
      await new Promise((r) => setImmediate(r));

      // 카카오 발송은 호출되지 않아야 함
      expect(kakao.send).not.toHaveBeenCalled();
      // 대신 kakaoStatus='skipped' 로 update
      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'notif-2' },
          data: expect.objectContaining({ kakaoStatus: 'skipped', kakaoSentAt: null }),
        }),
      );
    });
  });

  // ============================================================
  describe('markRead', () => {
    it('본인의 알림은 readAt 갱신', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        recipientStaffId: 'staff-1',
        readAt: null,
      });
      prisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        readAt: new Date(),
      });

      const result = await service.markRead('notif-1', 'staff-1');

      expect(result.id).toBe('notif-1');
      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'notif-1' },
          data: expect.objectContaining({ readAt: expect.any(Date) }),
        }),
      );
    });

    it('이미 읽은 알림은 update 를 호출하지 않고 그대로 반환', async () => {
      const already = {
        id: 'notif-1',
        recipientStaffId: 'staff-1',
        readAt: new Date('2026-04-01'),
      };
      prisma.notification.findUnique.mockResolvedValue(already);

      const result = await service.markRead('notif-1', 'staff-1');

      expect(result).toEqual(already);
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('타인 알림 접근 시 NotFoundException', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        recipientStaffId: 'staff-OTHER',
        readAt: null,
      });

      await expect(service.markRead('notif-1', 'staff-1')).rejects.toThrow(NotFoundException);
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('존재하지 않는 알림은 NotFoundException', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);
      await expect(service.markRead('not-exist', 'staff-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  describe('listForStaff', () => {
    it('limit+1 조회 후 hasMore=true 면 nextCursor 발급', async () => {
      const items = Array.from({ length: 3 }, (_, i) => ({
        id: `n-${i}`,
        recipientStaffId: 'staff-1',
        createdAt: new Date(`2026-04-0${i + 1}`),
        readAt: null,
        title: 't',
        body: 'b',
        type: 'order_edit',
        payload: null,
        link: null,
        channel: 'inapp',
        kakaoStatus: null,
        kakaoSentAt: null,
      }));
      prisma.notification.findMany.mockResolvedValue(items);

      const result = await service.listForStaff('staff-1', { limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeTruthy();
      // findMany 가 take=limit+1 로 호출되었는지
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipientStaffId: 'staff-1' },
          take: 3,
        }),
      );
    });

    it('items 가 limit 이하면 nextCursor=null, hasMore=false', async () => {
      prisma.notification.findMany.mockResolvedValue([
        { id: 'n-1', recipientStaffId: 'staff-1', createdAt: new Date(), readAt: null },
      ]);

      const result = await service.listForStaff('staff-1', { limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('unreadOnly=true 면 readAt:null 조건이 추가된다', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await service.listForStaff('staff-1', { unreadOnly: true, limit: 10 });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipientStaffId: 'staff-1', readAt: null },
        }),
      );
    });
  });

  // ============================================================
  describe('unreadCount / markAllRead', () => {
    it('unreadCount: readAt:null 조건으로 count 호출', async () => {
      prisma.notification.count.mockResolvedValue(7);

      const n = await service.unreadCount('staff-1');

      expect(n).toBe(7);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { recipientStaffId: 'staff-1', readAt: null },
      });
    });

    it('markAllRead: 본인의 미확인 알림만 일괄 업데이트', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllRead('staff-1');

      expect(result).toEqual({ updated: 3 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { recipientStaffId: 'staff-1', readAt: null },
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      });
    });
  });
});

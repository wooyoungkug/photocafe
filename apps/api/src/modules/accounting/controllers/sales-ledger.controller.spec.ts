import { Test, TestingModule } from '@nestjs/testing';
import { SalesLedgerController } from './sales-ledger.controller';
import { SalesLedgerService } from '../services/sales-ledger.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

// ===== Mock SalesLedgerService =====

function createMockSalesLedgerService() {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    getSummary: jest.fn(),
    getClientSummary: jest.fn(),
    getMonthlyTrend: jest.fn(),
    getAgingAnalysis: jest.fn(),
    getClientDetail: jest.fn(),
    calculateCreditScore: jest.fn(),
    getDueDateSummary: jest.fn(),
    getPaymentPattern: jest.fn(),
    addReceipt: jest.fn(),
    confirmSales: jest.fn(),
    cancelSales: jest.fn(),
    backfillFromOrders: jest.fn(),
    updateOverdueStatus: jest.fn(),
    sendOverdueNotifications: jest.fn(),
    getSummaryByStaff: jest.fn(),
    getCollectionByStaff: jest.fn(),
    getLedgersByStaff: jest.fn(),
  };
}

describe('SalesLedgerController', () => {
  let controller: SalesLedgerController;
  let service: ReturnType<typeof createMockSalesLedgerService>;

  beforeEach(async () => {
    service = createMockSalesLedgerService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesLedgerController],
      providers: [
        { provide: SalesLedgerService, useValue: service },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SalesLedgerController>(SalesLedgerController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================================================
  // GET /sales-ledger (목록 조회)
  // =========================================================
  describe('findAll', () => {
    it('매출원장 목록을 조회해야 한다', async () => {
      const mockResult = {
        data: [{ id: 'ledger-1', ledgerNumber: 'SL-20260201-001' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      service.findAll.mockResolvedValue(mockResult);

      const query = { page: 1, limit: 20 };
      const result = await controller.findAll(query as any);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });

    it('필터 조건을 서비스에 전달해야 한다', async () => {
      service.findAll.mockResolvedValue({ data: [], meta: {} });

      const query = {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        clientId: 'client-1',
        paymentStatus: 'unpaid',
        search: '스튜디오',
        page: 1,
        limit: 20,
      };
      await controller.findAll(query as any);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  // =========================================================
  // GET /sales-ledger/summary (요약)
  // =========================================================
  describe('getSummary', () => {
    it('매출원장 요약 정보를 반환해야 한다', async () => {
      const mockSummary = {
        totalSales: 1000000,
        totalReceived: 600000,
        totalOutstanding: 400000,
        totalOverdue: 100000,
        ledgerCount: 10,
        clientCount: 5,
      };
      service.getSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSummary();

      expect(service.getSummary).toHaveBeenCalled();
      expect(result).toEqual(mockSummary);
    });
  });

  // =========================================================
  // GET /sales-ledger/client-summary (거래처별 집계)
  // =========================================================
  describe('getClientSummary', () => {
    it('기간 필터를 서비스에 전달해야 한다', async () => {
      service.getClientSummary.mockResolvedValue([]);

      await controller.getClientSummary('2026-01-01', '2026-01-31');

      expect(service.getClientSummary).toHaveBeenCalledWith({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });
    });

    it('기간 필터 없이 호출할 수 있어야 한다', async () => {
      service.getClientSummary.mockResolvedValue([]);

      await controller.getClientSummary(undefined, undefined);

      expect(service.getClientSummary).toHaveBeenCalledWith({
        startDate: undefined,
        endDate: undefined,
      });
    });
  });

  // =========================================================
  // GET /sales-ledger/monthly-trend (월별 추이)
  // =========================================================
  describe('getMonthlyTrend', () => {
    it('기본 12개월 추이를 조회해야 한다', async () => {
      service.getMonthlyTrend.mockResolvedValue([]);

      await controller.getMonthlyTrend(undefined);

      expect(service.getMonthlyTrend).toHaveBeenCalledWith(12);
    });

    it('지정된 월 수로 추이를 조회해야 한다', async () => {
      service.getMonthlyTrend.mockResolvedValue([]);

      await controller.getMonthlyTrend('6');

      expect(service.getMonthlyTrend).toHaveBeenCalledWith(6);
    });
  });

  // =========================================================
  // GET /sales-ledger/aging-analysis (Aging 분석)
  // =========================================================
  describe('getAgingAnalysis', () => {
    it('전체 Aging 분석을 조회해야 한다', async () => {
      const mockResult = {
        under30: 100000,
        days30to60: 50000,
        days60to90: 30000,
        over90: 20000,
        breakdown: [],
      };
      service.getAgingAnalysis.mockResolvedValue(mockResult);

      const result = await controller.getAgingAnalysis(undefined);

      expect(service.getAgingAnalysis).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockResult);
    });

    it('특정 거래처의 Aging 분석을 조회해야 한다', async () => {
      service.getAgingAnalysis.mockResolvedValue({ breakdown: [] });

      await controller.getAgingAnalysis('client-1');

      expect(service.getAgingAnalysis).toHaveBeenCalledWith('client-1');
    });
  });

  // =========================================================
  // GET /sales-ledger/client/:clientId/detail (거래처 상세)
  // =========================================================
  describe('getClientDetail', () => {
    it('거래처별 상세 분석을 조회해야 한다', async () => {
      const mockDetail = {
        client: { id: 'client-1' },
        summary: {},
        monthlyTrend: [],
        transactions: [],
        paymentHistory: [],
      };
      service.getClientDetail.mockResolvedValue(mockDetail);

      const result = await controller.getClientDetail('client-1');

      expect(service.getClientDetail).toHaveBeenCalledWith('client-1');
      expect(result).toEqual(mockDetail);
    });
  });

  // =========================================================
  // POST /sales-ledger/client/:clientId/calculate-credit-score
  // =========================================================
  describe('calculateCreditScore', () => {
    it('신용도 평가를 실행해야 한다', async () => {
      const mockResult = {
        clientId: 'client-1',
        score: 85,
        grade: 'A',
        creditLimit: 900000,
        riskLevel: 'low',
      };
      service.calculateCreditScore.mockResolvedValue(mockResult);

      const result = await controller.calculateCreditScore('client-1');

      expect(service.calculateCreditScore).toHaveBeenCalledWith('client-1');
      expect(result).toEqual(mockResult);
    });
  });

  // =========================================================
  // GET /sales-ledger/due-date-summary (수금예정일별 집계)
  // =========================================================
  describe('getDueDateSummary', () => {
    it('기간 필터를 서비스에 전달해야 한다', async () => {
      service.getDueDateSummary.mockResolvedValue({});

      await controller.getDueDateSummary('2026-02-01', '2026-02-28');

      expect(service.getDueDateSummary).toHaveBeenCalledWith({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      });
    });
  });

  // =========================================================
  // GET /sales-ledger/payment-pattern (수금 패턴)
  // =========================================================
  describe('getPaymentPattern', () => {
    it('기본 12개월 패턴을 조회해야 한다', async () => {
      service.getPaymentPattern.mockResolvedValue({});

      await controller.getPaymentPattern(undefined, undefined);

      expect(service.getPaymentPattern).toHaveBeenCalledWith({
        clientId: undefined,
        months: 12,
      });
    });

    it('특정 거래처의 패턴을 조회해야 한다', async () => {
      service.getPaymentPattern.mockResolvedValue({});

      await controller.getPaymentPattern('client-1', '6');

      expect(service.getPaymentPattern).toHaveBeenCalledWith({
        clientId: 'client-1',
        months: 6,
      });
    });
  });

  // =========================================================
  // GET /sales-ledger/:id (상세 조회)
  // =========================================================
  describe('findById', () => {
    it('매출원장 상세를 조회해야 한다', async () => {
      const mockLedger = { id: 'ledger-1', ledgerNumber: 'SL-20260201-001' };
      service.findById.mockResolvedValue(mockLedger);

      const result = await controller.findById('ledger-1');

      expect(service.findById).toHaveBeenCalledWith('ledger-1');
      expect(result).toEqual(mockLedger);
    });
  });

  // =========================================================
  // POST /sales-ledger/:id/receipts (수금 처리)
  // =========================================================
  describe('addReceipt', () => {
    it('수금 처리를 실행해야 한다', async () => {
      const dto = {
        receiptDate: '2026-02-15',
        amount: 50000,
        paymentMethod: 'bank_transfer',
        bankName: '국민은행',
      };
      service.addReceipt.mockResolvedValue({ id: 'ledger-1' });

      const result = await controller.addReceipt('ledger-1', dto as any);

      expect(service.addReceipt).toHaveBeenCalledWith(
        'ledger-1',
        dto,
        'system', // TODO: JWT에서 추출 예정
      );
      expect(result).toBeDefined();
    });
  });

  // =========================================================
  // POST /sales-ledger/:id/confirm (매출 확정)
  // =========================================================
  describe('confirmSales', () => {
    it('매출 확정을 실행해야 한다', async () => {
      service.confirmSales.mockResolvedValue({
        salesStatus: 'CONFIRMED',
      });

      const result = await controller.confirmSales('ledger-1');

      expect(service.confirmSales).toHaveBeenCalledWith('ledger-1', 'system');
      expect(result.salesStatus).toBe('CONFIRMED');
    });
  });

  // =========================================================
  // POST /sales-ledger/:id/cancel (매출 취소)
  // =========================================================
  describe('cancelSales', () => {
    it('매출 취소를 실행해야 한다', async () => {
      service.cancelSales.mockResolvedValue({
        salesStatus: 'CANCELLED',
      });

      const result = await controller.cancelSales('ledger-1');

      expect(service.cancelSales).toHaveBeenCalledWith('ledger-1');
      expect(result.salesStatus).toBe('CANCELLED');
    });
  });

  // =========================================================
  // POST /sales-ledger/backfill (백필)
  // =========================================================
  describe('backfillFromOrders', () => {
    it('백필 결과를 반환해야 한다', async () => {
      const mockResult = { total: 50, created: 48, failed: 2 };
      service.backfillFromOrders.mockResolvedValue(mockResult);

      const result = await controller.backfillFromOrders();

      expect(service.backfillFromOrders).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  // =========================================================
  // POST /sales-ledger/batch/update-overdue (연체 일괄처리)
  // =========================================================
  describe('updateOverdueStatus', () => {
    it('연체 상태 일괄 업데이트 결과를 반환해야 한다', async () => {
      service.updateOverdueStatus.mockResolvedValue({ updatedCount: 5 });

      const result = await controller.updateOverdueStatus();

      expect(service.updateOverdueStatus).toHaveBeenCalled();
      expect(result).toEqual({ updatedCount: 5 });
    });
  });

  // =========================================================
  // POST /sales-ledger/batch/send-overdue-notifications (연체 알림)
  // =========================================================
  describe('sendOverdueNotifications', () => {
    it('연체 알림 발송 결과를 반환해야 한다', async () => {
      const mockResult = {
        totalClients: 3,
        totalOverdueLedgers: 7,
        totalOverdueAmount: 1500000,
        notifications: [],
        message: '3개 거래처에 대한 연체 알림이 생성되었습니다.',
      };
      service.sendOverdueNotifications.mockResolvedValue(mockResult);

      const result = await controller.sendOverdueNotifications();

      expect(service.sendOverdueNotifications).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  // =========================================================
  // GET /sales-ledger/summary-by-staff (영업담당자별 요약)
  // =========================================================
  describe('getSummaryByStaff', () => {
    it('기간 필터를 서비스에 전달해야 한다', async () => {
      service.getSummaryByStaff.mockResolvedValue([]);

      await controller.getSummaryByStaff('2026-01-01', '2026-01-31');

      expect(service.getSummaryByStaff).toHaveBeenCalledWith({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });
    });
  });

  // =========================================================
  // GET /sales-ledger/collection-by-staff (영업담당자별 수금)
  // =========================================================
  describe('getCollectionByStaff', () => {
    it('기간 필터를 서비스에 전달해야 한다', async () => {
      service.getCollectionByStaff.mockResolvedValue([]);

      await controller.getCollectionByStaff('2026-01-01', '2026-01-31');

      expect(service.getCollectionByStaff).toHaveBeenCalledWith({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });
    });
  });

  // =========================================================
  // GET /sales-ledger/by-staff/:staffId (영업담당자별 목록)
  // =========================================================
  describe('getLedgersByStaff', () => {
    it('쿼리 파라미터를 변환하여 서비스에 전달해야 한다', async () => {
      service.getLedgersByStaff.mockResolvedValue({ data: [], meta: {} });

      await controller.getLedgersByStaff(
        'staff-1',
        '2026-01-01',
        '2026-01-31',
        'unpaid',
        '2',
        '10',
      );

      expect(service.getLedgersByStaff).toHaveBeenCalledWith('staff-1', {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        paymentStatus: 'unpaid',
        page: 2,
        limit: 10,
      });
    });

    it('옵션 파라미터 없이 기본값으로 호출할 수 있어야 한다', async () => {
      service.getLedgersByStaff.mockResolvedValue({ data: [], meta: {} });

      await controller.getLedgersByStaff(
        'staff-1',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(service.getLedgersByStaff).toHaveBeenCalledWith('staff-1', {
        startDate: undefined,
        endDate: undefined,
        paymentStatus: undefined,
        page: 1,
        limit: 20,
      });
    });
  });
});

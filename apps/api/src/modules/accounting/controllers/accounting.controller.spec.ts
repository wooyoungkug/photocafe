import { Test, TestingModule } from '@nestjs/testing';
import { AccountingController } from './accounting.controller';
import { AccountingService } from '../services/accounting.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VoucherType } from '../dto/accounting.dto';

// ===== Mock AccountingService =====

function createMockAccountingService() {
  return {
    // 계정과목
    findAllAccounts: jest.fn(),
    findAccountById: jest.fn(),
    createAccount: jest.fn(),
    updateAccount: jest.fn(),
    deleteAccount: jest.fn(),
    seedStandardAccounts: jest.fn(),
    // 전표
    findAllJournals: jest.fn(),
    findJournalById: jest.fn(),
    createJournal: jest.fn(),
    deleteJournal: jest.fn(),
    // 미수금
    findAllReceivables: jest.fn(),
    findReceivableById: jest.fn(),
    createReceivable: jest.fn(),
    addReceivablePayment: jest.fn(),
    getReceivableSummary: jest.fn(),
    // 미지급금
    findAllPayables: jest.fn(),
    findPayableById: jest.fn(),
    createPayable: jest.fn(),
    addPayablePayment: jest.fn(),
    getPayableSummary: jest.fn(),
    // 은행계좌
    findAllBankAccounts: jest.fn(),
    findBankAccountById: jest.fn(),
    createBankAccount: jest.fn(),
    updateBankAccount: jest.fn(),
    deleteBankAccount: jest.fn(),
    // 정산
    findAllSettlements: jest.fn(),
    createSettlement: jest.fn(),
    confirmSettlement: jest.fn(),
    // 요약
    getAccountingSummary: jest.fn(),
    getDailySummary: jest.fn(),
  };
}

describe('AccountingController', () => {
  let controller: AccountingController;
  let service: ReturnType<typeof createMockAccountingService>;

  beforeEach(async () => {
    service = createMockAccountingService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountingController],
      providers: [
        { provide: AccountingService, useValue: service },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AccountingController>(AccountingController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================================================
  // 계정과목 (Accounts)
  // =========================================================
  describe('계정과목', () => {
    describe('seedAccounts', () => {
      it('표준 계정과목 일괄 등록을 실행해야 한다', async () => {
        const mockResult = { created: 40, updated: 0, total: 40 };
        service.seedStandardAccounts.mockResolvedValue(mockResult);

        const result = await controller.seedAccounts();

        expect(service.seedStandardAccounts).toHaveBeenCalled();
        expect(result).toEqual(mockResult);
      });
    });

    describe('getAccounts', () => {
      it('계정과목 목록을 조회해야 한다', async () => {
        service.findAllAccounts.mockResolvedValue([
          { id: 'acc-1', code: '101', name: '현금' },
        ]);

        const result = await controller.getAccounts();

        expect(service.findAllAccounts).toHaveBeenCalled();
        expect(result).toHaveLength(1);
      });
    });

    describe('getAccountById', () => {
      it('계정과목 상세를 조회해야 한다', async () => {
        service.findAccountById.mockResolvedValue({
          id: 'acc-1',
          code: '101',
          name: '현금',
        });

        const result = await controller.getAccountById('acc-1');

        expect(service.findAccountById).toHaveBeenCalledWith('acc-1');
        expect(result.code).toBe('101');
      });
    });

    describe('createAccount', () => {
      it('계정과목을 등록해야 한다', async () => {
        const dto = { code: '125', name: '기타재고', type: 'ASSET' as any };
        service.createAccount.mockResolvedValue({ id: 'acc-new', ...dto });

        const result = await controller.createAccount(dto);

        expect(service.createAccount).toHaveBeenCalledWith(dto);
        expect(result.code).toBe('125');
      });
    });

    describe('updateAccount', () => {
      it('계정과목을 수정해야 한다', async () => {
        const dto = { name: '수정된 계정' };
        service.updateAccount.mockResolvedValue({ id: 'acc-1', name: '수정된 계정' });

        const result = await controller.updateAccount('acc-1', dto);

        expect(service.updateAccount).toHaveBeenCalledWith('acc-1', dto);
        expect(result.name).toBe('수정된 계정');
      });
    });

    describe('deleteAccount', () => {
      it('계정과목을 삭제(비활성화)해야 한다', async () => {
        service.deleteAccount.mockResolvedValue({ id: 'acc-1', isActive: false });

        await controller.deleteAccount('acc-1');

        expect(service.deleteAccount).toHaveBeenCalledWith('acc-1');
      });
    });
  });

  // =========================================================
  // 전표 (Journals)
  // =========================================================
  describe('전표', () => {
    describe('getJournals', () => {
      it('전표 목록을 조회해야 한다', async () => {
        const mockResult = {
          data: [{ id: 'j-1', voucherNo: 'V-2026-000001' }],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        };
        service.findAllJournals.mockResolvedValue(mockResult);

        const query = { page: 1, limit: 20 };
        const result = await controller.getJournals(query as any);

        expect(service.findAllJournals).toHaveBeenCalledWith(query);
        expect(result).toEqual(mockResult);
      });
    });

    describe('getJournalById', () => {
      it('전표 상세를 조회해야 한다', async () => {
        service.findJournalById.mockResolvedValue({
          id: 'j-1',
          voucherNo: 'V-2026-000001',
        });

        const result = await controller.getJournalById('j-1');

        expect(service.findJournalById).toHaveBeenCalledWith('j-1');
        expect(result.voucherNo).toBe('V-2026-000001');
      });
    });

    describe('createJournal', () => {
      it('전표를 등록해야 한다', async () => {
        const dto = {
          voucherType: VoucherType.RECEIPT,
          journalDate: '2026-02-01',
          totalAmount: 100000,
          entries: [
            { accountId: 'acc-1', transactionType: 'DEBIT' as const, amount: 100000 },
            { accountId: 'acc-2', transactionType: 'CREDIT' as const, amount: 100000 },
          ],
        };

        service.createJournal.mockResolvedValue({
          id: 'j-new',
          ...dto,
        });

        const result = await controller.createJournal(dto as any);

        expect(service.createJournal).toHaveBeenCalledWith(dto, 'system');
        expect(result).toBeDefined();
      });
    });

    describe('deleteJournal', () => {
      it('전표를 삭제해야 한다', async () => {
        service.deleteJournal.mockResolvedValue({ id: 'j-1' });

        await controller.deleteJournal('j-1');

        expect(service.deleteJournal).toHaveBeenCalledWith('j-1');
      });
    });
  });

  // =========================================================
  // 미수금 (Receivables)
  // =========================================================
  describe('미수금', () => {
    describe('getReceivables', () => {
      it('미수금 목록을 조회해야 한다', async () => {
        service.findAllReceivables.mockResolvedValue({
          data: [{ id: 'r-1' }],
          meta: { total: 1 },
        });

        const query = { status: 'outstanding' };
        const result = await controller.getReceivables(query as any);

        expect(service.findAllReceivables).toHaveBeenCalledWith(query);
        expect(result.data).toHaveLength(1);
      });
    });

    describe('getReceivableSummary', () => {
      it('미수금 요약을 조회해야 한다', async () => {
        const mockSummary = {
          totalReceivables: 500000,
          overdueAmount: 100000,
          clientCount: 5,
          aging: { under30: 200000, days30to60: 150000, days60to90: 100000, over90: 50000 },
        };
        service.getReceivableSummary.mockResolvedValue(mockSummary);

        const result = await controller.getReceivableSummary();

        expect(service.getReceivableSummary).toHaveBeenCalled();
        expect(result).toEqual(mockSummary);
      });
    });

    describe('getReceivableById', () => {
      it('미수금 상세를 조회해야 한다', async () => {
        service.findReceivableById.mockResolvedValue({
          id: 'r-1',
          balance: 200000,
        });

        const result = await controller.getReceivableById('r-1');

        expect(service.findReceivableById).toHaveBeenCalledWith('r-1');
        expect(result.balance).toBe(200000);
      });
    });

    describe('createReceivable', () => {
      it('미수금을 등록해야 한다', async () => {
        const dto = {
          clientId: 'client-1',
          clientName: '테스트',
          originalAmount: 200000,
          issueDate: '2026-02-01',
        };
        service.createReceivable.mockResolvedValue({ id: 'r-new', ...dto });

        const result = await controller.createReceivable(dto as any);

        expect(service.createReceivable).toHaveBeenCalledWith(dto);
        expect(result).toBeDefined();
      });
    });

    describe('addReceivablePayment', () => {
      it('미수금 수금 처리를 실행해야 한다', async () => {
        const dto = {
          amount: 100000,
          paymentDate: '2026-02-10',
          paymentMethod: 'bank_transfer',
        };
        service.addReceivablePayment.mockResolvedValue({
          id: 'r-1',
          paidAmount: 100000,
          balance: 100000,
        });

        const result = await controller.addReceivablePayment('r-1', dto as any);

        expect(service.addReceivablePayment).toHaveBeenCalledWith('r-1', dto);
        expect(result).toBeDefined();
      });
    });
  });

  // =========================================================
  // 미지급금 (Payables)
  // =========================================================
  describe('미지급금', () => {
    describe('getPayables', () => {
      it('미지급금 목록을 조회해야 한다', async () => {
        service.findAllPayables.mockResolvedValue({
          data: [{ id: 'p-1' }],
          meta: { total: 1 },
        });

        const result = await controller.getPayables({} as any);

        expect(service.findAllPayables).toHaveBeenCalled();
        expect(result.data).toHaveLength(1);
      });
    });

    describe('getPayableSummary', () => {
      it('미지급금 요약을 조회해야 한다', async () => {
        service.getPayableSummary.mockResolvedValue({
          totalPayables: 300000,
          supplierCount: 3,
        });

        const result = await controller.getPayableSummary();

        expect(service.getPayableSummary).toHaveBeenCalled();
        expect(result.totalPayables).toBe(300000);
      });
    });

    describe('getPayableById', () => {
      it('미지급금 상세를 조회해야 한다', async () => {
        service.findPayableById.mockResolvedValue({
          id: 'p-1',
          balance: 300000,
        });

        const result = await controller.getPayableById('p-1');

        expect(service.findPayableById).toHaveBeenCalledWith('p-1');
      });
    });

    describe('createPayable', () => {
      it('미지급금을 등록해야 한다', async () => {
        const dto = {
          supplierName: '매입처',
          originalAmount: 300000,
          issueDate: '2026-02-01',
        };
        service.createPayable.mockResolvedValue({ id: 'p-new', ...dto });

        const result = await controller.createPayable(dto as any);

        expect(service.createPayable).toHaveBeenCalledWith(dto);
      });
    });

    describe('addPayablePayment', () => {
      it('미지급금 지급 처리를 실행해야 한다', async () => {
        const dto = {
          amount: 150000,
          paymentDate: '2026-02-15',
          paymentMethod: 'bank_transfer',
        };
        service.addPayablePayment.mockResolvedValue({
          id: 'p-1',
          paidAmount: 150000,
        });

        const result = await controller.addPayablePayment('p-1', dto as any);

        expect(service.addPayablePayment).toHaveBeenCalledWith('p-1', dto);
      });
    });
  });

  // =========================================================
  // 은행계좌 (BankAccounts)
  // =========================================================
  describe('은행계좌', () => {
    describe('getBankAccounts', () => {
      it('은행계좌 목록을 조회해야 한다', async () => {
        service.findAllBankAccounts.mockResolvedValue([
          { id: 'ba-1', accountName: '사업자 계좌' },
        ]);

        const result = await controller.getBankAccounts();

        expect(service.findAllBankAccounts).toHaveBeenCalled();
        expect(result).toHaveLength(1);
      });
    });

    describe('getBankAccountById', () => {
      it('은행계좌 상세를 조회해야 한다', async () => {
        service.findBankAccountById.mockResolvedValue({
          id: 'ba-1',
          bankName: '국민은행',
        });

        const result = await controller.getBankAccountById('ba-1');

        expect(service.findBankAccountById).toHaveBeenCalledWith('ba-1');
      });
    });

    describe('createBankAccount', () => {
      it('은행계좌를 등록해야 한다', async () => {
        const dto = {
          accountName: '사업자',
          bankName: '국민은행',
          accountNumber: '123-456',
        };
        service.createBankAccount.mockResolvedValue({ id: 'ba-new', ...dto });

        await controller.createBankAccount(dto as any);

        expect(service.createBankAccount).toHaveBeenCalledWith(dto);
      });
    });

    describe('updateBankAccount', () => {
      it('은행계좌를 수정해야 한다', async () => {
        const dto = { accountName: '수정된 계좌' };
        service.updateBankAccount.mockResolvedValue({ id: 'ba-1', ...dto });

        await controller.updateBankAccount('ba-1', dto as any);

        expect(service.updateBankAccount).toHaveBeenCalledWith('ba-1', dto);
      });
    });

    describe('deleteBankAccount', () => {
      it('은행계좌를 삭제해야 한다', async () => {
        service.deleteBankAccount.mockResolvedValue({ id: 'ba-1' });

        await controller.deleteBankAccount('ba-1');

        expect(service.deleteBankAccount).toHaveBeenCalledWith('ba-1');
      });
    });
  });

  // =========================================================
  // 정산 (Settlements)
  // =========================================================
  describe('정산', () => {
    describe('getSettlements', () => {
      it('정산 목록을 조회해야 한다', async () => {
        service.findAllSettlements.mockResolvedValue([
          { id: 's-1', periodType: 'monthly' },
        ]);

        const result = await controller.getSettlements({} as any);

        expect(service.findAllSettlements).toHaveBeenCalled();
        expect(result).toHaveLength(1);
      });
    });

    describe('createSettlement', () => {
      it('정산을 생성해야 한다', async () => {
        const dto = {
          periodType: 'monthly',
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
        };
        service.createSettlement.mockResolvedValue({
          id: 's-new',
          status: 'draft',
        });

        const result = await controller.createSettlement(dto as any);

        expect(service.createSettlement).toHaveBeenCalledWith(dto);
        expect(result.status).toBe('draft');
      });
    });

    describe('confirmSettlement', () => {
      it('정산을 확정해야 한다', async () => {
        service.confirmSettlement.mockResolvedValue({
          id: 's-1',
          status: 'confirmed',
        });

        const result = await controller.confirmSettlement('s-1');

        expect(service.confirmSettlement).toHaveBeenCalledWith('s-1', 'system');
        expect(result.status).toBe('confirmed');
      });
    });
  });

  // =========================================================
  // 요약/통계 (Summary)
  // =========================================================
  describe('요약/통계', () => {
    describe('getAccountingSummary', () => {
      it('회계 요약을 조회해야 한다', async () => {
        const mockSummary = {
          totalSales: 1000000,
          totalPurchases: 400000,
          receivablesBalance: 200000,
          payablesBalance: 100000,
          netCashFlow: 600000,
        };
        service.getAccountingSummary.mockResolvedValue(mockSummary);

        const result = await controller.getAccountingSummary();

        expect(service.getAccountingSummary).toHaveBeenCalled();
        expect(result).toEqual(mockSummary);
      });
    });

    describe('getDailySummary', () => {
      it('지정 날짜의 일별 요약을 조회해야 한다', async () => {
        service.getDailySummary.mockResolvedValue({
          date: '2026-02-13',
          totalSales: 150000,
          netCashFlow: 100000,
        });

        const result = await controller.getDailySummary('2026-02-13');

        expect(service.getDailySummary).toHaveBeenCalledWith('2026-02-13');
        expect(result.date).toBe('2026-02-13');
      });

      it('날짜 미지정 시 오늘 날짜를 사용해야 한다', async () => {
        service.getDailySummary.mockResolvedValue({});

        await controller.getDailySummary(undefined);

        const today = new Date().toISOString().split('T')[0];
        expect(service.getDailySummary).toHaveBeenCalledWith(today);
      });
    });
  });
});

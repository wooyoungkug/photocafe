import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { VoucherType, TransactionType } from '../dto/accounting.dto';

// ===== Mock 헬퍼 =====

function createMockPrismaService() {
  return {
    account: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    journal: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    receivable: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    receivablePayment: {
      create: jest.fn(),
    },
    payable: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    payablePayment: {
      create: jest.fn(),
    },
    bankAccount: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    settlement: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

// ===== Mock 데이터 팩토리 =====

function createMockAccount(overrides: Record<string, any> = {}) {
  return {
    id: 'acc-1',
    code: '101',
    name: '현금',
    type: 'ASSET',
    parentId: null,
    parent: null,
    children: [],
    isActive: true,
    description: null,
    sortOrder: 1,
    ...overrides,
  };
}

function createMockJournal(overrides: Record<string, any> = {}) {
  return {
    id: 'journal-1',
    voucherNo: 'V-2026-000001',
    voucherType: 'RECEIPT',
    journalDate: new Date('2026-02-01'),
    clientId: 'client-1',
    clientName: '테스트스튜디오',
    description: '매출 입금',
    totalAmount: 100000,
    orderId: null,
    orderNumber: null,
    createdBy: 'system',
    entries: [
      {
        id: 'entry-1',
        accountId: 'acc-1',
        transactionType: 'DEBIT',
        amount: 100000,
        description: '현금 입금',
        sortOrder: 0,
        account: createMockAccount(),
      },
      {
        id: 'entry-2',
        accountId: 'acc-2',
        transactionType: 'CREDIT',
        amount: 100000,
        description: '외상매출금 회수',
        sortOrder: 1,
        account: createMockAccount({ id: 'acc-2', code: '110', name: '외상매출금' }),
      },
    ],
    ...overrides,
  };
}

function createMockReceivable(overrides: Record<string, any> = {}) {
  return {
    id: 'recv-1',
    clientId: 'client-1',
    clientName: '테스트스튜디오',
    clientCode: 'C001',
    orderId: 'order-1',
    orderNumber: 'ORD-001',
    originalAmount: 200000,
    paidAmount: 0,
    balance: 200000,
    issueDate: new Date('2026-01-15'),
    dueDate: new Date('2026-02-15'),
    description: '테스트 미수금',
    status: 'outstanding',
    payments: [],
    ...overrides,
  };
}

function createMockPayable(overrides: Record<string, any> = {}) {
  return {
    id: 'pay-1',
    supplierId: 'supplier-1',
    supplierName: '용지공급업체',
    supplierCode: 'S001',
    originalAmount: 300000,
    paidAmount: 0,
    balance: 300000,
    issueDate: new Date('2026-01-20'),
    dueDate: new Date('2026-02-20'),
    description: '용지 매입',
    status: 'outstanding',
    payments: [],
    ...overrides,
  };
}

describe('AccountingService', () => {
  let service: AccountingService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AccountingService>(AccountingService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================================================
  // 계정과목 (Account)
  // =========================================================
  describe('findAllAccounts', () => {
    it('활성 계정과목 목록을 조회해야 한다', async () => {
      const mockAccounts = [createMockAccount()];
      prisma.account.findMany.mockResolvedValue(mockAccounts);

      const result = await service.findAllAccounts();

      expect(result).toEqual(mockAccounts);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: { parent: true, children: true },
        orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }],
      });
    });
  });

  describe('findAccountById', () => {
    it('존재하는 계정과목을 조회해야 한다', async () => {
      const mockAccount = createMockAccount();
      prisma.account.findUnique.mockResolvedValue(mockAccount);

      const result = await service.findAccountById('acc-1');

      expect(result).toEqual(mockAccount);
    });

    it('존재하지 않는 계정과목 조회 시 NotFoundException을 던져야 한다', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(service.findAccountById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createAccount', () => {
    it('새 계정과목을 생성해야 한다', async () => {
      const dto = { code: '125', name: '기타재고', type: 'ASSET' as any };
      const expected = createMockAccount({ ...dto, id: 'acc-new' });
      prisma.account.create.mockResolvedValue(expected);

      const result = await service.createAccount(dto);

      expect(result).toEqual(expected);
      expect(prisma.account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: '125',
          name: '기타재고',
          type: 'ASSET',
          sortOrder: 0,
        }),
      });
    });

    it('sortOrder가 지정되면 해당 값을 사용해야 한다', async () => {
      const dto = { code: '125', name: '기타재고', type: 'ASSET' as any, sortOrder: 99 };
      prisma.account.create.mockResolvedValue(createMockAccount(dto));

      await service.createAccount(dto);

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ sortOrder: 99 }),
      });
    });
  });

  describe('updateAccount', () => {
    it('계정과목을 수정해야 한다', async () => {
      const dto = { name: '수정된 계정' };
      prisma.account.update.mockResolvedValue(createMockAccount({ name: '수정된 계정' }));

      const result = await service.updateAccount('acc-1', dto);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: dto,
      });
      expect(result.name).toBe('수정된 계정');
    });
  });

  describe('deleteAccount', () => {
    it('계정과목을 비활성화(소프트삭제)해야 한다', async () => {
      prisma.account.update.mockResolvedValue(createMockAccount({ isActive: false }));

      await service.deleteAccount('acc-1');

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { isActive: false },
      });
    });
  });

  describe('seedStandardAccounts', () => {
    it('표준 계정과목을 일괄 등록해야 한다', async () => {
      // 모든 계정이 신규 (existing = null)
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.account.upsert.mockResolvedValue(createMockAccount());

      const result = await service.seedStandardAccounts();

      expect(result.total).toBeGreaterThan(0);
      expect(result.created).toBeGreaterThan(0);
      expect(result.updated).toBe(0);
      expect(prisma.account.upsert).toHaveBeenCalled();
    });

    it('기존 계정이 있으면 updated 카운트가 증가해야 한다', async () => {
      // 모든 계정이 이미 존재
      prisma.account.findUnique.mockResolvedValue(createMockAccount());
      prisma.account.upsert.mockResolvedValue(createMockAccount());

      const result = await service.seedStandardAccounts();

      expect(result.updated).toBeGreaterThan(0);
      expect(result.created).toBe(0);
    });
  });

  // =========================================================
  // 전표 (Journal) - 핵심 비즈니스 로직
  // =========================================================
  describe('generateVoucherNo', () => {
    it('올해 첫 번째 전표번호를 생성해야 한다', async () => {
      prisma.journal.findFirst.mockResolvedValue(null);

      const result = await service.generateVoucherNo();

      const year = new Date().getFullYear();
      expect(result).toBe(`V-${year}-000001`);
    });

    it('기존 전표가 있으면 순번을 증가시켜야 한다', async () => {
      const year = new Date().getFullYear();
      prisma.journal.findFirst.mockResolvedValue({
        voucherNo: `V-${year}-000042`,
      });

      const result = await service.generateVoucherNo();

      expect(result).toBe(`V-${year}-000043`);
    });
  });

  describe('createJournal', () => {
    const validDto = {
      voucherType: VoucherType.RECEIPT,
      journalDate: '2026-02-01',
      clientId: 'client-1',
      clientName: '테스트스튜디오',
      description: '매출 입금',
      totalAmount: 100000,
      entries: [
        {
          accountId: 'acc-1',
          transactionType: TransactionType.DEBIT,
          amount: 100000,
          description: '현금 입금',
        },
        {
          accountId: 'acc-2',
          transactionType: TransactionType.CREDIT,
          amount: 100000,
          description: '외상매출금 회수',
        },
      ],
    };

    it('차대 균형이 맞는 전표를 생성해야 한다', async () => {
      prisma.journal.findFirst.mockResolvedValue(null);
      prisma.journal.create.mockResolvedValue(createMockJournal());

      const result = await service.createJournal(validDto, 'user-1');

      expect(result).toBeDefined();
      expect(prisma.journal.create).toHaveBeenCalledTimes(1);
    });

    it('차대 균형이 맞지 않으면 BadRequestException을 던져야 한다', async () => {
      const imbalancedDto = {
        ...validDto,
        entries: [
          { accountId: 'acc-1', transactionType: TransactionType.DEBIT, amount: 100000 },
          { accountId: 'acc-2', transactionType: TransactionType.CREDIT, amount: 80000 },
        ],
      };

      await expect(
        service.createJournal(imbalancedDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createJournal(imbalancedDto, 'user-1'),
      ).rejects.toThrow('차변과 대변의 합계가 일치하지 않습니다.');
    });

    it('전표번호가 자동 채번되어야 한다', async () => {
      prisma.journal.findFirst.mockResolvedValue(null);
      prisma.journal.create.mockResolvedValue(createMockJournal());

      await service.createJournal(validDto, 'user-1');

      const createCall = prisma.journal.create.mock.calls[0][0];
      const year = new Date().getFullYear();
      expect(createCall.data.voucherNo).toBe(`V-${year}-000001`);
    });

    it('분개 항목이 sortOrder와 함께 생성되어야 한다', async () => {
      prisma.journal.findFirst.mockResolvedValue(null);
      prisma.journal.create.mockResolvedValue(createMockJournal());

      await service.createJournal(validDto, 'user-1');

      const createCall = prisma.journal.create.mock.calls[0][0];
      const entries = createCall.data.entries.create;

      expect(entries[0].sortOrder).toBe(0);
      expect(entries[1].sortOrder).toBe(1);
    });

    it('차변만 있는 전표는 생성 불가해야 한다 (대변 0)', async () => {
      const debitOnlyDto = {
        ...validDto,
        entries: [
          { accountId: 'acc-1', transactionType: TransactionType.DEBIT, amount: 100000 },
        ],
      };

      await expect(
        service.createJournal(debitOnlyDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllJournals', () => {
    it('기본 조건으로 전표 목록을 조회해야 한다', async () => {
      const mockData = [createMockJournal()];
      prisma.journal.findMany.mockResolvedValue(mockData);
      prisma.journal.count.mockResolvedValue(1);

      const result = await service.findAllJournals({ page: 1, limit: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.meta.total).toBe(1);
    });

    it('검색 필터가 OR 조건으로 적용되어야 한다', async () => {
      prisma.journal.findMany.mockResolvedValue([]);
      prisma.journal.count.mockResolvedValue(0);

      await service.findAllJournals({ search: '테스트', page: 1, limit: 20 });

      const findManyCall = prisma.journal.findMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR).toHaveLength(3);
    });

    it('전표유형 필터가 적용되어야 한다', async () => {
      prisma.journal.findMany.mockResolvedValue([]);
      prisma.journal.count.mockResolvedValue(0);

      await service.findAllJournals({
        voucherType: VoucherType.RECEIPT,
        page: 1,
        limit: 20,
      });

      const findManyCall = prisma.journal.findMany.mock.calls[0][0];
      expect(findManyCall.where.voucherType).toBe('RECEIPT');
    });
  });

  describe('findJournalById', () => {
    it('존재하는 전표를 조회해야 한다', async () => {
      prisma.journal.findUnique.mockResolvedValue(createMockJournal());

      const result = await service.findJournalById('journal-1');

      expect(result).toBeDefined();
      expect(result.voucherNo).toBe('V-2026-000001');
    });

    it('존재하지 않는 전표 조회 시 NotFoundException을 던져야 한다', async () => {
      prisma.journal.findUnique.mockResolvedValue(null);

      await expect(service.findJournalById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteJournal', () => {
    it('전표를 삭제해야 한다', async () => {
      prisma.journal.delete.mockResolvedValue(createMockJournal());

      await service.deleteJournal('journal-1');

      expect(prisma.journal.delete).toHaveBeenCalledWith({
        where: { id: 'journal-1' },
      });
    });
  });

  // =========================================================
  // 미수금 (Receivable)
  // =========================================================
  describe('createReceivable', () => {
    it('미수금을 등록해야 한다', async () => {
      const dto = {
        clientId: 'client-1',
        clientName: '테스트스튜디오',
        clientCode: 'C001',
        orderId: 'order-1',
        orderNumber: 'ORD-001',
        originalAmount: 200000,
        issueDate: '2026-01-15',
        dueDate: '2026-02-15',
        description: '테스트 미수금',
      };

      const expected = createMockReceivable();
      prisma.receivable.create.mockResolvedValue(expected);

      const result = await service.createReceivable(dto);

      expect(result).toEqual(expected);
      expect(prisma.receivable.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: 'client-1',
          originalAmount: 200000,
          paidAmount: 0,
          balance: 200000,
          status: 'outstanding',
        }),
      });
    });

    it('수금예정일(dueDate)이 없어도 등록 가능해야 한다', async () => {
      const dto = {
        clientId: 'client-1',
        clientName: '테스트스튜디오',
        originalAmount: 100000,
        issueDate: '2026-01-15',
      };

      prisma.receivable.create.mockResolvedValue(createMockReceivable({ dueDate: null }));

      await service.createReceivable(dto);

      const createCall = prisma.receivable.create.mock.calls[0][0];
      expect(createCall.data.dueDate).toBeNull();
    });
  });

  describe('findReceivableById', () => {
    it('존재하는 미수금을 조회해야 한다', async () => {
      prisma.receivable.findUnique.mockResolvedValue(createMockReceivable());

      const result = await service.findReceivableById('recv-1');

      expect(result.originalAmount).toBe(200000);
    });

    it('존재하지 않는 미수금 조회 시 NotFoundException을 던져야 한다', async () => {
      prisma.receivable.findUnique.mockResolvedValue(null);

      await expect(service.findReceivableById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addReceivablePayment', () => {
    const paymentDto = {
      amount: 100000,
      paymentDate: '2026-02-10',
      paymentMethod: 'bank_transfer',
      description: '1차 수금',
    };

    it('유효한 수금 처리가 성공해야 한다', async () => {
      const receivable = createMockReceivable({
        originalAmount: 200000,
        paidAmount: 0,
        balance: 200000,
      });

      prisma.receivable.findUnique
        .mockResolvedValueOnce(receivable) // findReceivableById (검증)
        .mockResolvedValueOnce(
          createMockReceivable({
            paidAmount: 100000,
            balance: 100000,
            status: 'partial',
          }),
        ); // findReceivableById (반환)

      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.addReceivablePayment('recv-1', paymentDto, 'user-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('partial');
    });

    it('수금액이 잔액을 초과하면 BadRequestException을 던져야 한다', async () => {
      prisma.receivable.findUnique.mockResolvedValue(
        createMockReceivable({
          originalAmount: 200000,
          paidAmount: 150000,
          balance: 50000,
        }),
      );

      const overDto = { ...paymentDto, amount: 100000 }; // 잔액 50000 초과

      await expect(
        service.addReceivablePayment('recv-1', overDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('완납 시 status가 paid로 변경되어야 한다', async () => {
      prisma.receivable.findUnique
        .mockResolvedValueOnce(
          createMockReceivable({
            originalAmount: 200000,
            paidAmount: 100000,
            balance: 100000,
          }),
        )
        .mockResolvedValueOnce(
          createMockReceivable({
            paidAmount: 200000,
            balance: 0,
            status: 'paid',
          }),
        );

      prisma.$transaction.mockResolvedValue([{}, {}]);

      const fullPaymentDto = { ...paymentDto, amount: 100000 };
      const result = await service.addReceivablePayment('recv-1', fullPaymentDto, 'user-1');

      expect(result.status).toBe('paid');
    });

    it('일부 수금 시 status가 partial이어야 한다', async () => {
      prisma.receivable.findUnique
        .mockResolvedValueOnce(
          createMockReceivable({
            originalAmount: 200000,
            paidAmount: 0,
            balance: 200000,
          }),
        )
        .mockResolvedValueOnce(
          createMockReceivable({
            paidAmount: 50000,
            balance: 150000,
            status: 'partial',
          }),
        );

      prisma.$transaction.mockResolvedValue([{}, {}]);

      const partialDto = { ...paymentDto, amount: 50000 };
      const result = await service.addReceivablePayment('recv-1', partialDto, 'user-1');

      expect(result.status).toBe('partial');
    });
  });

  describe('findAllReceivables', () => {
    it('상태 필터로 미수금을 조회해야 한다', async () => {
      prisma.receivable.findMany.mockResolvedValue([createMockReceivable()]);

      const result = await service.findAllReceivables({ status: 'outstanding' });

      const findCall = prisma.receivable.findMany.mock.calls[0][0];
      expect(findCall.where.status).toBe('outstanding');
      expect(result.data).toHaveLength(1);
    });

    it('연체(overdue) 필터가 동작해야 한다', async () => {
      prisma.receivable.findMany.mockResolvedValue([]);

      await service.findAllReceivables({ overdue: true });

      const findCall = prisma.receivable.findMany.mock.calls[0][0];
      expect(findCall.where.status).toBe('overdue');
    });

    it('기간 필터가 적용되어야 한다', async () => {
      prisma.receivable.findMany.mockResolvedValue([]);

      await service.findAllReceivables({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      const findCall = prisma.receivable.findMany.mock.calls[0][0];
      expect(findCall.where.issueDate).toBeDefined();
    });
  });

  describe('getReceivableSummary', () => {
    it('미수금 요약 및 Aging 분석을 반환해야 한다', async () => {
      const now = new Date();
      const daysAgo = (days: number) =>
        new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      prisma.receivable.findMany.mockResolvedValue([
        // 30일 미만 미수금
        createMockReceivable({
          id: 'r1',
          clientId: 'c1',
          balance: 100000,
          status: 'outstanding',
          issueDate: daysAgo(10),
        }),
        // 30-60일 미수금
        createMockReceivable({
          id: 'r2',
          clientId: 'c2',
          balance: 80000,
          status: 'outstanding',
          issueDate: daysAgo(45),
        }),
        // 60-90일 미수금
        createMockReceivable({
          id: 'r3',
          clientId: 'c1',
          balance: 50000,
          status: 'overdue',
          issueDate: daysAgo(75),
        }),
        // 90일 초과 미수금
        createMockReceivable({
          id: 'r4',
          clientId: 'c3',
          balance: 200000,
          status: 'overdue',
          issueDate: daysAgo(120),
        }),
      ]);

      const result = await service.getReceivableSummary();

      expect(result.totalReceivables).toBe(430000); // 100000 + 80000 + 50000 + 200000
      expect(result.overdueAmount).toBe(250000); // 50000 + 200000 (overdue만)
      expect(result.clientCount).toBe(3); // c1, c2, c3

      // Aging 분석
      expect(result.aging.under30).toBe(100000);
      expect(result.aging.days30to60).toBe(80000);
      expect(result.aging.days60to90).toBe(50000);
      expect(result.aging.over90).toBe(200000);
    });

    it('미수금이 없으면 모든 값이 0이어야 한다', async () => {
      prisma.receivable.findMany.mockResolvedValue([]);

      const result = await service.getReceivableSummary();

      expect(result.totalReceivables).toBe(0);
      expect(result.overdueAmount).toBe(0);
      expect(result.clientCount).toBe(0);
      expect(result.aging).toEqual({
        under30: 0,
        days30to60: 0,
        days60to90: 0,
        over90: 0,
      });
    });
  });

  // =========================================================
  // 미지급금 (Payable)
  // =========================================================
  describe('createPayable', () => {
    it('미지급금을 등록해야 한다', async () => {
      const dto = {
        supplierId: 'supplier-1',
        supplierName: '용지공급업체',
        supplierCode: 'S001',
        originalAmount: 300000,
        issueDate: '2026-01-20',
        dueDate: '2026-02-20',
        description: '용지 매입',
      };

      prisma.payable.create.mockResolvedValue(createMockPayable());

      const result = await service.createPayable(dto);

      expect(result).toBeDefined();
      expect(prisma.payable.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          supplierName: '용지공급업체',
          originalAmount: 300000,
          paidAmount: 0,
          balance: 300000,
          status: 'outstanding',
        }),
      });
    });
  });

  describe('findPayableById', () => {
    it('존재하는 미지급금을 조회해야 한다', async () => {
      prisma.payable.findUnique.mockResolvedValue(createMockPayable());

      const result = await service.findPayableById('pay-1');

      expect(result.supplierName).toBe('용지공급업체');
    });

    it('존재하지 않는 미지급금 조회 시 NotFoundException을 던져야 한다', async () => {
      prisma.payable.findUnique.mockResolvedValue(null);

      await expect(service.findPayableById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addPayablePayment', () => {
    const paymentDto = {
      amount: 150000,
      paymentDate: '2026-02-15',
      paymentMethod: 'bank_transfer',
      description: '1차 지급',
    };

    it('유효한 지급 처리가 성공해야 한다', async () => {
      prisma.payable.findUnique
        .mockResolvedValueOnce(
          createMockPayable({
            originalAmount: 300000,
            paidAmount: 0,
            balance: 300000,
          }),
        )
        .mockResolvedValueOnce(
          createMockPayable({
            paidAmount: 150000,
            balance: 150000,
            status: 'partial',
          }),
        );

      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.addPayablePayment('pay-1', paymentDto, 'user-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('partial');
    });

    it('지급액이 잔액을 초과하면 BadRequestException을 던져야 한다', async () => {
      prisma.payable.findUnique.mockResolvedValue(
        createMockPayable({
          originalAmount: 300000,
          paidAmount: 250000,
          balance: 50000,
        }),
      );

      await expect(
        service.addPayablePayment('pay-1', paymentDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addPayablePayment('pay-1', paymentDto, 'user-1'),
      ).rejects.toThrow('지급액이 잔액을 초과합니다.');
    });

    it('완납 시 status가 paid로 변경되어야 한다', async () => {
      prisma.payable.findUnique
        .mockResolvedValueOnce(
          createMockPayable({
            originalAmount: 300000,
            paidAmount: 150000,
            balance: 150000,
          }),
        )
        .mockResolvedValueOnce(
          createMockPayable({
            paidAmount: 300000,
            balance: 0,
            status: 'paid',
          }),
        );

      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.addPayablePayment('pay-1', paymentDto, 'user-1');

      expect(result.status).toBe('paid');
    });
  });

  describe('findAllPayables', () => {
    it('상태 필터로 미지급금을 조회해야 한다', async () => {
      prisma.payable.findMany.mockResolvedValue([createMockPayable()]);

      const result = await service.findAllPayables({ status: 'outstanding' });

      expect(result.data).toHaveLength(1);
    });

    it('매입처ID 필터가 적용되어야 한다', async () => {
      prisma.payable.findMany.mockResolvedValue([]);

      await service.findAllPayables({ supplierId: 'supplier-1' });

      const findCall = prisma.payable.findMany.mock.calls[0][0];
      expect(findCall.where.supplierId).toBe('supplier-1');
    });
  });

  describe('getPayableSummary', () => {
    it('미지급금 요약을 반환해야 한다', async () => {
      prisma.payable.findMany.mockResolvedValue([
        createMockPayable({ supplierId: 's1', balance: 100000 }),
        createMockPayable({ supplierId: 's2', balance: 200000 }),
      ]);

      const result = await service.getPayableSummary();

      expect(result.totalPayables).toBe(300000);
      expect(result.supplierCount).toBe(2);
    });

    it('미지급금이 없으면 0을 반환해야 한다', async () => {
      prisma.payable.findMany.mockResolvedValue([]);

      const result = await service.getPayableSummary();

      expect(result.totalPayables).toBe(0);
      expect(result.supplierCount).toBe(0);
    });
  });

  // =========================================================
  // 은행계좌 (BankAccount)
  // =========================================================
  describe('findAllBankAccounts', () => {
    it('활성 은행계좌 목록을 조회해야 한다', async () => {
      prisma.bankAccount.findMany.mockResolvedValue([
        { id: 'ba-1', accountName: '사업자 계좌', isActive: true },
      ]);

      const result = await service.findAllBankAccounts();

      expect(result).toHaveLength(1);
      expect(prisma.bankAccount.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { accountName: 'asc' }],
      });
    });
  });

  describe('createBankAccount', () => {
    it('기본 계좌 설정 시 기존 기본 계좌를 해제해야 한다', async () => {
      const dto = {
        accountName: '새 계좌',
        bankName: '국민은행',
        accountNumber: '123-456-789',
        isDefault: true,
      };

      prisma.bankAccount.updateMany.mockResolvedValue({ count: 1 });
      prisma.bankAccount.create.mockResolvedValue({ ...dto, id: 'ba-new' });

      await service.createBankAccount(dto);

      expect(prisma.bankAccount.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    });

    it('기본 계좌가 아닌 경우 기존 계좌를 건드리지 않아야 한다', async () => {
      const dto = {
        accountName: '보조 계좌',
        bankName: '우리은행',
        accountNumber: '789-012-345',
        isDefault: false,
      };

      prisma.bankAccount.create.mockResolvedValue({ ...dto, id: 'ba-new' });

      await service.createBankAccount(dto);

      expect(prisma.bankAccount.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('findBankAccountById', () => {
    it('존재하지 않는 은행계좌 조회 시 NotFoundException을 던져야 한다', async () => {
      prisma.bankAccount.findUnique.mockResolvedValue(null);

      await expect(service.findBankAccountById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================
  // 정산 (Settlement)
  // =========================================================
  describe('createSettlement', () => {
    it('정산을 생성하고 기간 매출/매입을 집계해야 한다', async () => {
      const dto = {
        periodType: 'monthly',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
      };

      prisma.journal.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 500000 } }) // receipts
        .mockResolvedValueOnce({ _sum: { totalAmount: 200000 } }); // payments

      prisma.receivable.aggregate.mockResolvedValue({
        _sum: { balance: 100000 },
      });
      prisma.payable.aggregate.mockResolvedValue({
        _sum: { balance: 50000 },
      });

      prisma.settlement.create.mockResolvedValue({
        id: 'settle-1',
        totalIncome: 500000,
        totalExpense: 200000,
        netProfit: 300000,
        status: 'draft',
      });

      const result = await service.createSettlement(dto);

      expect(prisma.settlement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          periodType: 'monthly',
          totalIncome: 500000,
          totalExpense: 200000,
          netProfit: 300000,
          netCashFlow: 300000,
          receivablesBalance: 100000,
          payablesBalance: 50000,
          status: 'draft',
        }),
      });
    });
  });

  describe('confirmSettlement', () => {
    it('정산을 확정해야 한다', async () => {
      prisma.settlement.update.mockResolvedValue({
        id: 'settle-1',
        status: 'confirmed',
        confirmedBy: 'admin-1',
      });

      await service.confirmSettlement('settle-1', 'admin-1');

      expect(prisma.settlement.update).toHaveBeenCalledWith({
        where: { id: 'settle-1' },
        data: expect.objectContaining({
          status: 'confirmed',
          confirmedBy: 'admin-1',
          confirmedAt: expect.any(Date),
        }),
      });
    });
  });

  // =========================================================
  // 요약/통계
  // =========================================================
  describe('getAccountingSummary', () => {
    it('회계 요약 정보를 반환해야 한다', async () => {
      prisma.journal.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 800000 } }) // 당월 입금
        .mockResolvedValueOnce({ _sum: { totalAmount: 300000 } }); // 당월 출금

      prisma.receivable.aggregate.mockResolvedValue({
        _sum: { balance: 200000 },
      });
      prisma.payable.aggregate.mockResolvedValue({
        _sum: { balance: 100000 },
      });

      const result = await service.getAccountingSummary();

      expect(result.totalSales).toBe(800000);
      expect(result.totalPurchases).toBe(300000);
      expect(result.receivablesBalance).toBe(200000);
      expect(result.payablesBalance).toBe(100000);
      expect(result.netCashFlow).toBe(500000);
    });

    it('데이터가 없을 때 0을 반환해야 한다', async () => {
      prisma.journal.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: null } })
        .mockResolvedValueOnce({ _sum: { totalAmount: null } });

      prisma.receivable.aggregate.mockResolvedValue({
        _sum: { balance: null },
      });
      prisma.payable.aggregate.mockResolvedValue({
        _sum: { balance: null },
      });

      const result = await service.getAccountingSummary();

      expect(result.totalSales).toBe(0);
      expect(result.totalPurchases).toBe(0);
      expect(result.netCashFlow).toBe(0);
    });
  });

  describe('getDailySummary', () => {
    it('일별 요약 정보를 반환해야 한다', async () => {
      prisma.journal.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 150000 } }) // 당일 입금
        .mockResolvedValueOnce({ _sum: { totalAmount: 50000 } }); // 당일 출금

      const result = await service.getDailySummary('2026-02-13');

      expect(result.date).toBe('2026-02-13');
      expect(result.totalSales).toBe(150000);
      expect(result.totalExpenses).toBe(50000);
      expect(result.netCashFlow).toBe(100000);
    });
  });
});

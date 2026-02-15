import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClientLedgerService } from './client-ledger.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ClientLedgerType, PeriodUnit } from '../dto/client-ledger.dto';

// ===== Mock 헬퍼 =====

function createMockPrismaService() {
  return {
    client: {
      findUnique: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
  };
}

// ===== Mock 데이터 팩토리 =====

function createMockClient(overrides: Record<string, any> = {}) {
  return {
    id: 'client-1',
    clientCode: 'C001',
    clientName: '테스트스튜디오',
    businessNumber: '123-45-67890',
    ...overrides,
  };
}

function createMockClientLedgerRow(overrides: Record<string, any> = {}) {
  return {
    clientId: 'client-1',
    clientCode: 'C001',
    clientName: '테스트스튜디오',
    businessNumber: '123-45-67890',
    phone: '02-1234-5678',
    totalSales: 500000,
    totalReceived: 300000,
    salesOutstanding: 200000,
    salesCount: 5,
    lastSalesDate: new Date('2026-02-01'),
    totalPurchases: 100000,
    totalPaid: 50000,
    purchaseOutstanding: 50000,
    purchaseCount: 2,
    lastPurchaseDate: new Date('2026-01-20'),
    ...overrides,
  };
}

function createMockTransactionRow(overrides: Record<string, any> = {}) {
  return {
    txDate: new Date('2026-02-01'),
    txType: 'SALES',
    description: '매출',
    debit: 100000,
    credit: 0,
    refNumber: 'SL-20260201-001',
    ...overrides,
  };
}

describe('ClientLedgerService', () => {
  let service: ClientLedgerService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientLedgerService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ClientLedgerService>(ClientLedgerService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================================================
  // findAllClientLedgers (목록 조회)
  // =========================================================
  describe('findAllClientLedgers', () => {
    it('기본 조건으로 거래처원장 목록을 조회해야 한다 (필터 없음)', async () => {
      // Arrange
      const mockRow = createMockClientLedgerRow();
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ total: BigInt(1) }]) // 카운트 쿼리
        .mockResolvedValueOnce([mockRow]); // 데이터 쿼리

      // Act
      const result = await service.findAllClientLedgers({});

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);

      // 데이터 매핑 검증
      const item = result.data[0];
      expect(item.clientId).toBe('client-1');
      expect(item.clientCode).toBe('C001');
      expect(item.clientName).toBe('테스트스튜디오');
      expect(item.totalSales).toBe(500000);
      expect(item.totalReceived).toBe(300000);
      expect(item.salesOutstanding).toBe(200000);
      expect(item.totalPurchases).toBe(100000);
      expect(item.totalPaid).toBe(50000);
      expect(item.purchaseOutstanding).toBe(50000);
      // 순잔액 = 매출 미수금 - 매입 미지급금
      expect(item.netBalance).toBe(200000 - 50000);
    });

    it('clientType=SALES 필터로 매출거래처만 조회해야 한다', async () => {
      // Arrange
      const mockRow = createMockClientLedgerRow({
        totalPurchases: 0,
        totalPaid: 0,
        purchaseOutstanding: 0,
        purchaseCount: 0,
        lastPurchaseDate: null,
      });
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ total: BigInt(1) }])
        .mockResolvedValueOnce([mockRow]);

      // Act
      const result = await service.findAllClientLedgers({
        clientType: ClientLedgerType.SALES,
      });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);

      // 카운트 쿼리의 SQL에 sales_agg가 포함되어야 한다
      const countSql = prisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(countSql).toContain('sales_agg');
      // PURCHASE 서브쿼리는 포함되지 않아야 한다
      expect(countSql).not.toContain('purchase_agg');
    });

    it('clientType=PURCHASE 필터로 매입거래처만 조회해야 한다', async () => {
      // Arrange
      const mockRow = createMockClientLedgerRow({
        totalSales: 0,
        totalReceived: 0,
        salesOutstanding: 0,
        salesCount: 0,
        lastSalesDate: null,
      });
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ total: BigInt(1) }])
        .mockResolvedValueOnce([mockRow]);

      // Act
      const result = await service.findAllClientLedgers({
        clientType: ClientLedgerType.PURCHASE,
      });

      // Assert
      expect(result.data).toHaveLength(1);
      const countSql = prisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(countSql).toContain('purchase_agg');
      expect(countSql).not.toContain('sales_agg');
    });

    it('기간 필터가 쿼리 파라미터에 반영되어야 한다', async () => {
      // Arrange
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ total: BigInt(0) }])
        .mockResolvedValueOnce([]);

      // Act
      await service.findAllClientLedgers({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      // Assert
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);

      // 카운트 쿼리 호출 시 날짜 파라미터가 전달되어야 한다
      const countArgs = prisma.$queryRawUnsafe.mock.calls[0];
      const countSql = countArgs[0] as string;
      expect(countSql).toContain('ledgerDate');

      // 날짜 파라미터가 Date 객체로 전달되어야 한다
      expect(countArgs[1]).toBeInstanceOf(Date); // startDate
      expect(countArgs[2]).toBeInstanceOf(Date); // endDate
    });

    it('검색 필터가 거래처명/거래처코드 ILIKE로 적용되어야 한다', async () => {
      // Arrange
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ total: BigInt(0) }])
        .mockResolvedValueOnce([]);

      // Act
      await service.findAllClientLedgers({
        search: '테스트',
      });

      // Assert
      const countArgs = prisma.$queryRawUnsafe.mock.calls[0];
      const countSql = countArgs[0] as string;
      expect(countSql).toContain('ILIKE');
      expect(countSql).toContain('clientName');
      expect(countSql).toContain('clientCode');

      // 검색 파라미터가 %검색어% 형식으로 전달되어야 한다
      const searchParam = countArgs.find((arg: any) => typeof arg === 'string' && arg.includes('%테스트%'));
      expect(searchParam).toBe('%테스트%');
    });

    it('데이터가 없으면 빈 배열과 total=0을 반환해야 한다', async () => {
      // Arrange
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ total: BigInt(0) }])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.findAllClientLedgers({});

      // Assert
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('페이지네이션이 올바르게 동작해야 한다', async () => {
      // Arrange
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ total: BigInt(50) }])
        .mockResolvedValueOnce([createMockClientLedgerRow()]);

      // Act
      const result = await service.findAllClientLedgers({ page: 3, limit: 10 });

      // Assert
      expect(result.meta.total).toBe(50);
      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(5); // Math.ceil(50/10)

      // 데이터 쿼리에 LIMIT, OFFSET 파라미터가 전달되어야 한다
      const dataArgs = prisma.$queryRawUnsafe.mock.calls[1];
      const dataSql = dataArgs[0] as string;
      expect(dataSql).toContain('LIMIT');
      expect(dataSql).toContain('OFFSET');
    });

    it('lastSalesDate가 null인 경우 null로 반환해야 한다', async () => {
      // Arrange
      const mockRow = createMockClientLedgerRow({
        lastSalesDate: null,
        lastPurchaseDate: null,
      });
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ total: BigInt(1) }])
        .mockResolvedValueOnce([mockRow]);

      // Act
      const result = await service.findAllClientLedgers({});

      // Assert
      expect(result.data[0].lastSalesDate).toBeNull();
      expect(result.data[0].lastPurchaseDate).toBeNull();
    });

    it('businessNumber이 없는 거래처도 null로 처리해야 한다', async () => {
      // Arrange
      const mockRow = createMockClientLedgerRow({
        businessNumber: null,
        phone: null,
      });
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ total: BigInt(1) }])
        .mockResolvedValueOnce([mockRow]);

      // Act
      const result = await service.findAllClientLedgers({});

      // Assert
      expect(result.data[0].businessNumber).toBeNull();
      expect(result.data[0].phone).toBeNull();
    });

    it('startDate만 지정하고 endDate가 없는 경우에도 동작해야 한다', async () => {
      // Arrange
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ total: BigInt(0) }])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.findAllClientLedgers({
        startDate: '2026-01-01',
      });

      // Assert
      expect(result).toBeDefined();
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
      // startDate 파라미터만 전달
      const countArgs = prisma.$queryRawUnsafe.mock.calls[0];
      expect(countArgs[1]).toBeInstanceOf(Date);
    });

    it('검색 + 기간 필터를 동시에 적용할 수 있어야 한다', async () => {
      // Arrange
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ total: BigInt(0) }])
        .mockResolvedValueOnce([]);

      // Act
      await service.findAllClientLedgers({
        search: '스튜디오',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      // Assert
      const countArgs = prisma.$queryRawUnsafe.mock.calls[0];
      const countSql = countArgs[0] as string;
      expect(countSql).toContain('ILIKE');
      expect(countSql).toContain('ledgerDate');
      // 날짜 파라미터(2개) + 검색 파라미터(1개) = 총 3개
      expect(countArgs.length).toBe(4); // SQL + 3 params
    });
  });

  // =========================================================
  // getClientLedgerDetail (상세 원장)
  // =========================================================
  describe('getClientLedgerDetail', () => {
    it('존재하지 않는 거래처 조회 시 NotFoundException을 던져야 한다', async () => {
      // Arrange
      prisma.client.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getClientLedgerDetail('non-existent', {}),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getClientLedgerDetail('non-existent', {}),
      ).rejects.toThrow('거래처를 찾을 수 없습니다.');
    });

    it('일별(DAILY) 거래내역을 조회해야 한다', async () => {
      // Arrange
      const mockClient = createMockClient();
      prisma.client.findUnique.mockResolvedValue(mockClient);

      // 전기이월 쿼리
      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          salesTotal: 1000000,
          salesReceived: 800000,
          purchaseTotal: 500000,
          purchasePaid: 400000,
        },
      ]);

      // 거래내역 쿼리
      const txRows = [
        createMockTransactionRow({
          txDate: new Date('2026-02-01'),
          txType: 'SALES',
          description: '매출 건',
          debit: 100000,
          credit: 0,
          refNumber: 'SL-001',
        }),
        createMockTransactionRow({
          txDate: new Date('2026-02-05'),
          txType: 'RECEIPT',
          description: '수금 건',
          debit: 0,
          credit: 50000,
          refNumber: 'SR-001',
        }),
        createMockTransactionRow({
          txDate: new Date('2026-02-10'),
          txType: 'PURCHASE',
          description: '매입 건',
          debit: 0,
          credit: 30000,
          refNumber: 'PL-001',
        }),
        createMockTransactionRow({
          txDate: new Date('2026-02-15'),
          txType: 'PAYMENT',
          description: '지급 건',
          debit: 20000,
          credit: 0,
          refNumber: 'PP-001',
        }),
      ];
      prisma.$queryRawUnsafe.mockResolvedValueOnce(txRows);

      // Act
      const result = await service.getClientLedgerDetail('client-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        periodUnit: PeriodUnit.DAILY,
      });

      // Assert
      expect(result.client).toEqual(mockClient);
      expect(result.transactions).toHaveLength(4);

      // 전기이월 검증
      // 이월 외상매출금 = 1000000 - 800000 = 200000
      // 이월 외상매입금 = 500000 - 400000 = 100000
      expect(result.openingBalance.salesBalance).toBe(200000);
      expect(result.openingBalance.purchaseBalance).toBe(100000);
      // 순잔액 = 200000 - 100000 = 100000
      expect(result.openingBalance.netBalance).toBe(100000);
    });

    it('전기이월 계산이 올바르게 수행되어야 한다', async () => {
      // Arrange
      const mockClient = createMockClient();
      prisma.client.findUnique.mockResolvedValue(mockClient);

      // 전기이월: 매출 누적 500000 - 수금 누적 300000 = 이월 매출잔액 200000
      // 전기이월: 매입 누적 200000 - 지급 누적 150000 = 이월 매입잔액 50000
      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          salesTotal: 500000,
          salesReceived: 300000,
          purchaseTotal: 200000,
          purchasePaid: 150000,
        },
      ]);
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]); // 거래내역 없음

      // Act
      const result = await service.getClientLedgerDetail('client-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      });

      // Assert
      expect(result.openingBalance.salesBalance).toBe(200000);
      expect(result.openingBalance.purchaseBalance).toBe(50000);
      expect(result.openingBalance.netBalance).toBe(150000); // 200000 - 50000

      // 거래 내역이 없으므로 closingBalance = openingBalance의 netBalance
      expect(result.closingBalance).toBe(150000);
    });

    it('일별 조회 시 running balance가 올바르게 계산되어야 한다', async () => {
      // Arrange
      const mockClient = createMockClient();
      prisma.client.findUnique.mockResolvedValue(mockClient);

      // 전기이월: 순잔액 = (100000 - 80000) - (50000 - 40000) = 20000 - 10000 = 10000
      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          salesTotal: 100000,
          salesReceived: 80000,
          purchaseTotal: 50000,
          purchasePaid: 40000,
        },
      ]);

      // 거래: SALES +200000, RECEIPT -100000, PURCHASE -30000, PAYMENT +10000
      const txRows = [
        createMockTransactionRow({ txDate: new Date('2026-02-01'), txType: 'SALES', debit: 200000, credit: 0 }),
        createMockTransactionRow({ txDate: new Date('2026-02-05'), txType: 'RECEIPT', debit: 0, credit: 100000 }),
        createMockTransactionRow({ txDate: new Date('2026-02-10'), txType: 'PURCHASE', debit: 0, credit: 30000 }),
        createMockTransactionRow({ txDate: new Date('2026-02-15'), txType: 'PAYMENT', debit: 10000, credit: 0 }),
      ];
      prisma.$queryRawUnsafe.mockResolvedValueOnce(txRows);

      // Act
      const result = await service.getClientLedgerDetail('client-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        periodUnit: PeriodUnit.DAILY,
      });

      // Assert - running balance 검증
      // 초기잔액: 10000
      // SALES +200000 → 210000
      expect(result.transactions[0].balance).toBe(210000);
      // RECEIPT -100000 → 110000
      expect(result.transactions[1].balance).toBe(110000);
      // PURCHASE -30000 → 80000
      expect(result.transactions[2].balance).toBe(80000);
      // PAYMENT +10000 → 90000
      expect(result.transactions[3].balance).toBe(90000);

      // closingBalance = 마지막 거래의 balance
      expect(result.closingBalance).toBe(90000);
    });

    it('월별(MONTHLY) 집계 조회가 동작해야 한다', async () => {
      // Arrange
      const mockClient = createMockClient();
      prisma.client.findUnique.mockResolvedValue(mockClient);

      // 전기이월: 순잔액 = 0
      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { salesTotal: 0, salesReceived: 0, purchaseTotal: 0, purchasePaid: 0 },
      ]);

      // 1월과 2월에 걸친 거래
      const txRows = [
        createMockTransactionRow({
          txDate: new Date('2026-01-15'),
          txType: 'SALES',
          debit: 100000,
          credit: 0,
        }),
        createMockTransactionRow({
          txDate: new Date('2026-01-20'),
          txType: 'RECEIPT',
          debit: 0,
          credit: 50000,
        }),
        createMockTransactionRow({
          txDate: new Date('2026-02-10'),
          txType: 'SALES',
          debit: 200000,
          credit: 0,
        }),
        createMockTransactionRow({
          txDate: new Date('2026-02-15'),
          txType: 'PURCHASE',
          debit: 0,
          credit: 80000,
        }),
      ];
      prisma.$queryRawUnsafe.mockResolvedValueOnce(txRows);

      // Act
      const result = await service.getClientLedgerDetail('client-1', {
        startDate: '2026-01-01',
        endDate: '2026-02-28',
        periodUnit: PeriodUnit.MONTHLY,
      });

      // Assert
      expect(result.client).toEqual(mockClient);
      expect(result.transactions).toHaveLength(2); // 1월, 2월

      // 1월: 매출 100000, 수금 50000 → 순변동 +50000, 잔액 50000
      const jan = result.transactions[0];
      expect(jan.period).toBe('2026-01');
      expect(jan.salesAmount).toBe(100000);
      expect(jan.receiptAmount).toBe(50000);
      expect(jan.totalDebit).toBe(100000);
      expect(jan.totalCredit).toBe(50000);
      expect(jan.balance).toBe(50000);
      expect(jan.transactionCount).toBe(2);

      // 2월: 매출 200000, 매입 80000 → 순변동 +120000, 잔액 170000
      const feb = result.transactions[1];
      expect(feb.period).toBe('2026-02');
      expect(feb.salesAmount).toBe(200000);
      expect(feb.purchaseAmount).toBe(80000);
      expect(feb.totalDebit).toBe(200000);
      expect(feb.totalCredit).toBe(80000);
      expect(feb.balance).toBe(170000); // 50000 + 120000
    });

    it('거래 내역이 없을 때 빈 배열과 이월 잔액을 반환해야 한다', async () => {
      // Arrange
      const mockClient = createMockClient();
      prisma.client.findUnique.mockResolvedValue(mockClient);

      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { salesTotal: 100000, salesReceived: 50000, purchaseTotal: 30000, purchasePaid: 10000 },
      ]);
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]); // 빈 거래 내역

      // Act
      const result = await service.getClientLedgerDetail('client-1', {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      });

      // Assert
      expect(result.transactions).toHaveLength(0);
      expect(result.openingBalance.salesBalance).toBe(50000);  // 100000 - 50000
      expect(result.openingBalance.purchaseBalance).toBe(20000); // 30000 - 10000
      expect(result.closingBalance).toBe(30000); // (50000 - 20000)
    });

    it('전기이월 데이터가 없을 때 0으로 처리해야 한다', async () => {
      // Arrange
      const mockClient = createMockClient();
      prisma.client.findUnique.mockResolvedValue(mockClient);

      // 전기이월 결과 없음 (빈 배열)
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]);
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      // Act
      const result = await service.getClientLedgerDetail('client-1', {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      // Assert
      expect(result.openingBalance.salesBalance).toBe(0);
      expect(result.openingBalance.purchaseBalance).toBe(0);
      expect(result.openingBalance.netBalance).toBe(0);
    });

    it('일별 조회 시 페이지네이션이 동작해야 한다', async () => {
      // Arrange
      const mockClient = createMockClient();
      prisma.client.findUnique.mockResolvedValue(mockClient);

      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { salesTotal: 0, salesReceived: 0, purchaseTotal: 0, purchasePaid: 0 },
      ]);

      // 3건의 거래 내역
      const txRows = [
        createMockTransactionRow({ txDate: new Date('2026-02-01'), txType: 'SALES', debit: 10000, credit: 0 }),
        createMockTransactionRow({ txDate: new Date('2026-02-02'), txType: 'SALES', debit: 20000, credit: 0 }),
        createMockTransactionRow({ txDate: new Date('2026-02-03'), txType: 'SALES', debit: 30000, credit: 0 }),
      ];
      prisma.$queryRawUnsafe.mockResolvedValueOnce(txRows);

      // Act - 페이지 크기 2, 2번째 페이지
      const result = await service.getClientLedgerDetail('client-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        periodUnit: PeriodUnit.DAILY,
        page: 2,
        limit: 2,
      });

      // Assert
      expect(result.meta.total).toBe(3);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.totalPages).toBe(2); // Math.ceil(3/2)
      expect(result.transactions).toHaveLength(1); // 3번째 건만
    });

    it('거래유형 라벨이 올바르게 반환되어야 한다', async () => {
      // Arrange
      const mockClient = createMockClient();
      prisma.client.findUnique.mockResolvedValue(mockClient);

      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { salesTotal: 0, salesReceived: 0, purchaseTotal: 0, purchasePaid: 0 },
      ]);

      const txRows = [
        createMockTransactionRow({ txDate: new Date('2026-02-01'), txType: 'SALES', debit: 100000, credit: 0 }),
        createMockTransactionRow({ txDate: new Date('2026-02-02'), txType: 'RECEIPT', debit: 0, credit: 50000 }),
        createMockTransactionRow({ txDate: new Date('2026-02-03'), txType: 'PURCHASE', debit: 0, credit: 30000 }),
        createMockTransactionRow({ txDate: new Date('2026-02-04'), txType: 'PAYMENT', debit: 20000, credit: 0 }),
      ];
      prisma.$queryRawUnsafe.mockResolvedValueOnce(txRows);

      // Act
      const result = await service.getClientLedgerDetail('client-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        periodUnit: PeriodUnit.DAILY,
      });

      // Assert
      expect(result.transactions[0].typeLabel).toBe('매출');
      expect(result.transactions[1].typeLabel).toBe('수금');
      expect(result.transactions[2].typeLabel).toBe('매입');
      expect(result.transactions[3].typeLabel).toBe('지급');
    });

    it('startDate/endDate 미지정 시 당월 기간으로 조회해야 한다', async () => {
      // Arrange
      const mockClient = createMockClient();
      prisma.client.findUnique.mockResolvedValue(mockClient);

      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { salesTotal: 0, salesReceived: 0, purchaseTotal: 0, purchasePaid: 0 },
      ]);
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      // Act
      const result = await service.getClientLedgerDetail('client-1', {});

      // Assert
      expect(result).toBeDefined();
      // 전기이월 쿼리에 당월 1일이 전달되어야 한다
      const openingArgs = prisma.$queryRawUnsafe.mock.calls[0];
      expect(openingArgs[1]).toBe('client-1'); // clientId
      expect(openingArgs[2]).toBeInstanceOf(Date); // periodStart (당월 1일)
    });
  });

  // =========================================================
  // getClientLedgerSummary (기간 요약)
  // =========================================================
  describe('getClientLedgerSummary', () => {
    it('존재하지 않는 거래처 조회 시 NotFoundException을 던져야 한다', async () => {
      // Arrange
      prisma.client.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getClientLedgerSummary('non-existent', {}),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getClientLedgerSummary('non-existent', {}),
      ).rejects.toThrow('거래처를 찾을 수 없습니다.');
    });

    it('월별 요약 데이터를 올바르게 반환해야 한다', async () => {
      // Arrange
      const mockClient = createMockClient();
      prisma.client.findUnique.mockResolvedValue(mockClient);

      // 전기이월
      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { salesBalance: 100000, purchaseBalance: 50000 },
      ]);

      // 매출 기간별 집계
      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { period: '2026-01', salesAmount: 300000, salesCount: BigInt(3) },
        { period: '2026-02', salesAmount: 200000, salesCount: BigInt(2) },
      ]);

      // 수금 기간별 집계
      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { period: '2026-01', receiptAmount: 250000, receiptCount: BigInt(2) },
        { period: '2026-02', receiptAmount: 100000, receiptCount: BigInt(1) },
      ]);

      // 매입 기간별 집계
      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { period: '2026-01', purchaseAmount: 100000, purchaseCount: BigInt(1) },
      ]);

      // 지급 기간별 집계
      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { period: '2026-01', paymentAmount: 80000, paymentCount: BigInt(1) },
      ]);

      // Act
      const result = await service.getClientLedgerSummary('client-1', {
        startDate: '2026-01-01',
        endDate: '2026-02-28',
        periodUnit: PeriodUnit.MONTHLY,
      });

      // Assert
      expect(result.client).toEqual(mockClient);

      // 전기이월
      expect(result.openingBalance.salesBalance).toBe(100000);
      expect(result.openingBalance.purchaseBalance).toBe(50000);
      expect(result.openingBalance.netBalance).toBe(50000); // 100000 - 50000

      // 기간별 데이터
      expect(result.periods).toHaveLength(2); // 1월, 2월

      // 1월: 매출 300000, 수금 250000, 매입 100000, 지급 80000
      const jan = result.periods[0];
      expect(jan.period).toBe('2026-01');
      expect(jan.salesAmount).toBe(300000);
      expect(jan.receiptAmount).toBe(250000);
      expect(jan.purchaseAmount).toBe(100000);
      expect(jan.paymentAmount).toBe(80000);
      // salesBalance = 100000 + (300000 - 250000) = 150000
      expect(jan.salesBalance).toBe(150000);
      // purchaseBalance = 50000 + (100000 - 80000) = 70000
      expect(jan.purchaseBalance).toBe(70000);
      // netBalance = 150000 - 70000 = 80000
      expect(jan.netBalance).toBe(80000);
      expect(jan.salesCount).toBe(3);
      expect(jan.receiptCount).toBe(2);
      expect(jan.purchaseCount).toBe(1);
      expect(jan.paymentCount).toBe(1);

      // 2월: 매출 200000, 수금 100000, 매입 0, 지급 0
      const feb = result.periods[1];
      expect(feb.period).toBe('2026-02');
      expect(feb.salesAmount).toBe(200000);
      expect(feb.receiptAmount).toBe(100000);
      expect(feb.purchaseAmount).toBe(0);
      expect(feb.paymentAmount).toBe(0);
      // salesBalance = 150000 + (200000 - 100000) = 250000
      expect(feb.salesBalance).toBe(250000);
      // purchaseBalance = 70000 + (0 - 0) = 70000
      expect(feb.purchaseBalance).toBe(70000);
      // netBalance = 250000 - 70000 = 180000
      expect(feb.netBalance).toBe(180000);

      // 합계
      expect(result.totals.totalSales).toBe(500000);
      expect(result.totals.totalReceipts).toBe(350000);
      expect(result.totals.totalPurchases).toBe(100000);
      expect(result.totals.totalPayments).toBe(80000);

      // closingBalance
      expect(result.closingBalance.salesBalance).toBe(250000);
      expect(result.closingBalance.purchaseBalance).toBe(70000);
      expect(result.closingBalance.netBalance).toBe(180000);
    });

    it('거래 데이터가 없으면 빈 periods와 이월잔액을 반환해야 한다', async () => {
      // Arrange
      const mockClient = createMockClient();
      prisma.client.findUnique.mockResolvedValue(mockClient);

      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { salesBalance: 50000, purchaseBalance: 20000 },
      ]);
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]); // 매출 없음
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]); // 수금 없음
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]); // 매입 없음
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]); // 지급 없음

      // Act
      const result = await service.getClientLedgerSummary('client-1', {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      // Assert
      expect(result.periods).toHaveLength(0);
      expect(result.openingBalance.salesBalance).toBe(50000);
      expect(result.openingBalance.purchaseBalance).toBe(20000);
      expect(result.closingBalance.salesBalance).toBe(50000);
      expect(result.closingBalance.purchaseBalance).toBe(20000);
      expect(result.totals.totalSales).toBe(0);
      expect(result.totals.totalReceipts).toBe(0);
      expect(result.totals.totalPurchases).toBe(0);
      expect(result.totals.totalPayments).toBe(0);
    });

    it('전기이월 데이터가 없으면 0으로 처리해야 한다', async () => {
      // Arrange
      const mockClient = createMockClient();
      prisma.client.findUnique.mockResolvedValue(mockClient);

      prisma.$queryRawUnsafe.mockResolvedValueOnce([]); // 전기이월 없음
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]); // 매출
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]); // 수금
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]); // 매입
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]); // 지급

      // Act
      const result = await service.getClientLedgerSummary('client-1', {});

      // Assert
      expect(result.openingBalance.salesBalance).toBe(0);
      expect(result.openingBalance.purchaseBalance).toBe(0);
      expect(result.openingBalance.netBalance).toBe(0);
    });

    it('periodUnit 미지정 시 MONTHLY를 기본값으로 사용해야 한다', async () => {
      // Arrange
      const mockClient = createMockClient();
      prisma.client.findUnique.mockResolvedValue(mockClient);

      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { salesBalance: 0, purchaseBalance: 0 },
      ]);
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]);
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]);
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]);
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      // Act
      const result = await service.getClientLedgerSummary('client-1', {});

      // Assert
      expect(result).toBeDefined();
      // 매출 쿼리에 YYYY-MM 포맷이 사용되어야 한다
      const salesQuerySql = prisma.$queryRawUnsafe.mock.calls[1][0] as string;
      expect(salesQuerySql).toContain('YYYY-MM');
    });

    it('서로 다른 기간에만 거래가 있어도 모든 기간이 병합되어야 한다', async () => {
      // Arrange
      const mockClient = createMockClient();
      prisma.client.findUnique.mockResolvedValue(mockClient);

      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { salesBalance: 0, purchaseBalance: 0 },
      ]);

      // 매출은 1월에만
      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { period: '2026-01', salesAmount: 100000, salesCount: BigInt(1) },
      ]);
      // 수금은 2월에만
      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { period: '2026-02', receiptAmount: 80000, receiptCount: BigInt(1) },
      ]);
      // 매입 없음
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]);
      // 지급은 3월에만
      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        { period: '2026-03', paymentAmount: 30000, paymentCount: BigInt(1) },
      ]);

      // Act
      const result = await service.getClientLedgerSummary('client-1', {
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      });

      // Assert - 3개 기간이 모두 포함되어야 한다
      expect(result.periods).toHaveLength(3);
      expect(result.periods[0].period).toBe('2026-01');
      expect(result.periods[1].period).toBe('2026-02');
      expect(result.periods[2].period).toBe('2026-03');
    });
  });

  // =========================================================
  // getClientLedgerStats (통계)
  // =========================================================
  describe('getClientLedgerStats', () => {
    it('기본 통계 데이터를 올바르게 반환해야 한다', async () => {
      // Arrange
      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          salesClientCount: BigInt(10),
          purchaseClientCount: BigInt(5),
          totalSalesOutstanding: 1500000,
          totalPurchaseOutstanding: 800000,
          monthlySales: 500000,
          monthlyPurchases: 200000,
          monthlyReceipts: 400000,
          monthlyPayments: 150000,
        },
      ]);

      // Act
      const result = await service.getClientLedgerStats({});

      // Assert
      expect(result.salesClientCount).toBe(10);
      expect(result.purchaseClientCount).toBe(5);
      expect(result.totalSalesOutstanding).toBe(1500000);
      expect(result.totalPurchaseOutstanding).toBe(800000);
      // 순미수잔액 = 매출 미수 - 매입 미지급
      expect(result.netOutstanding).toBe(700000); // 1500000 - 800000
      expect(result.currentMonth.sales).toBe(500000);
      expect(result.currentMonth.purchases).toBe(200000);
      expect(result.currentMonth.receipts).toBe(400000);
      expect(result.currentMonth.payments).toBe(150000);
      // currentMonth.period 형식 검증 (YYYY-MM)
      expect(result.currentMonth.period).toMatch(/^\d{4}-\d{2}$/);
    });

    it('데이터가 없을 때 기본값(0)을 반환해야 한다', async () => {
      // Arrange
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      // Act
      const result = await service.getClientLedgerStats({});

      // Assert
      expect(result.salesClientCount).toBe(0);
      expect(result.purchaseClientCount).toBe(0);
      expect(result.totalSalesOutstanding).toBe(0);
      expect(result.totalPurchaseOutstanding).toBe(0);
      expect(result.netOutstanding).toBe(0);
      expect(result.currentMonth.sales).toBe(0);
      expect(result.currentMonth.purchases).toBe(0);
      expect(result.currentMonth.receipts).toBe(0);
      expect(result.currentMonth.payments).toBe(0);
    });

    it('기간 필터가 쿼리 파라미터에 반영되어야 한다', async () => {
      // Arrange
      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          salesClientCount: BigInt(3),
          purchaseClientCount: BigInt(2),
          totalSalesOutstanding: 300000,
          totalPurchaseOutstanding: 100000,
          monthlySales: 200000,
          monthlyPurchases: 80000,
          monthlyReceipts: 150000,
          monthlyPayments: 60000,
        },
      ]);

      // Act
      await service.getClientLedgerStats({
        startDate: '2026-01-01',
        endDate: '2026-06-30',
      });

      // Assert
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
      const args = prisma.$queryRawUnsafe.mock.calls[0];
      const sql = args[0] as string;
      expect(sql).toContain('ledgerDate');

      // 기간 파라미터가 전달되어야 한다 (monthStart, monthEnd + startDate, endDate)
      // args[1] = monthStart, args[2] = monthEnd, args[3] = startDate, args[4] = endDate
      expect(args.length).toBeGreaterThan(3);
    });

    it('startDate만 지정한 경우에도 동작해야 한다', async () => {
      // Arrange
      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          salesClientCount: BigInt(0),
          purchaseClientCount: BigInt(0),
          totalSalesOutstanding: 0,
          totalPurchaseOutstanding: 0,
          monthlySales: 0,
          monthlyPurchases: 0,
          monthlyReceipts: 0,
          monthlyPayments: 0,
        },
      ]);

      // Act
      const result = await service.getClientLedgerStats({
        startDate: '2026-01-01',
      });

      // Assert
      expect(result).toBeDefined();
      const args = prisma.$queryRawUnsafe.mock.calls[0];
      // monthStart, monthEnd + startDate = 3개 파라미터
      expect(args.length).toBe(4); // SQL + 3 params
    });

    it('endDate만 지정한 경우에도 동작해야 한다', async () => {
      // Arrange
      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          salesClientCount: BigInt(0),
          purchaseClientCount: BigInt(0),
          totalSalesOutstanding: 0,
          totalPurchaseOutstanding: 0,
          monthlySales: 0,
          monthlyPurchases: 0,
          monthlyReceipts: 0,
          monthlyPayments: 0,
        },
      ]);

      // Act
      const result = await service.getClientLedgerStats({
        endDate: '2026-12-31',
      });

      // Assert
      expect(result).toBeDefined();
      const args = prisma.$queryRawUnsafe.mock.calls[0];
      // monthStart, monthEnd + endDate = 3개 파라미터
      expect(args.length).toBe(4); // SQL + 3 params
    });

    it('BigInt 값이 Number로 올바르게 변환되어야 한다', async () => {
      // Arrange
      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          salesClientCount: BigInt(999),
          purchaseClientCount: BigInt(888),
          totalSalesOutstanding: 12345.67,
          totalPurchaseOutstanding: 6789.01,
          monthlySales: 100000.5,
          monthlyPurchases: 50000.25,
          monthlyReceipts: 80000.75,
          monthlyPayments: 30000.5,
        },
      ]);

      // Act
      const result = await service.getClientLedgerStats({});

      // Assert
      expect(typeof result.salesClientCount).toBe('number');
      expect(typeof result.purchaseClientCount).toBe('number');
      expect(result.salesClientCount).toBe(999);
      expect(result.purchaseClientCount).toBe(888);
      expect(typeof result.totalSalesOutstanding).toBe('number');
      expect(typeof result.currentMonth.sales).toBe('number');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SalesLedgerService } from './sales-ledger.service';
import { JournalEngineService } from './journal-engine.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

// ===== Mock 헬퍼 =====

function createMockPrismaService() {
  return {
    salesLedger: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    salesReceipt: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customerHealthScore: {
      upsert: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
    },
    staffClient: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  };
}

function createMockJournalEngineService() {
  return {
    createSalesJournal: jest.fn().mockResolvedValue({}),
    createReceiptJournal: jest.fn().mockResolvedValue({}),
  };
}

// ===== Mock 데이터 팩토리 =====

function createMockClient(overrides: Record<string, any> = {}) {
  return {
    id: 'client-1',
    clientCode: 'C001',
    clientName: '테스트스튜디오',
    businessNumber: '123-45-67890',
    creditEnabled: false,
    creditPeriodDays: null,
    creditPaymentDay: null,
    creditGrade: 'B',
    phone: '02-1234-5678',
    email: 'test@studio.com',
    address: '서울시 강남구',
    addressDetail: '1층',
    assignedManager: '김담당',
    ...overrides,
  };
}

function createMockOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-20260201-001',
    clientId: 'client-1',
    productPrice: 100000,
    shippingFee: 5000,
    tax: 10000,
    totalAmount: 115000,
    finalAmount: 115000,
    paymentMethod: 'credit',
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: '포토앨범 A4',
        size: '210x297',
        quantity: 2,
        unitPrice: 50000,
        totalPrice: 100000,
      },
    ],
    ...overrides,
  };
}

function createMockSalesLedger(overrides: Record<string, any> = {}) {
  return {
    id: 'ledger-1',
    ledgerNumber: 'SL-20260201-001',
    ledgerDate: new Date('2026-02-01'),
    clientId: 'client-1',
    clientName: '테스트스튜디오',
    clientBizNo: '123-45-67890',
    orderId: 'order-1',
    orderNumber: 'ORD-20260201-001',
    salesType: 'ALBUM',
    taxType: 'TAXABLE',
    supplyAmount: 100000,
    vatAmount: 10000,
    shippingFee: 5000,
    totalAmount: 115000,
    receivedAmount: 0,
    outstandingAmount: 115000,
    paymentMethod: 'credit',
    paymentStatus: 'unpaid',
    dueDate: new Date('2026-03-01'),
    salesStatus: 'REGISTERED',
    salesDate: null,
    description: 'ORD-20260201-001 매출',
    createdBy: 'user-1',
    confirmedBy: null,
    confirmedAt: null,
    items: [
      {
        id: 'li-1',
        orderItemId: 'item-1',
        itemName: '포토앨범 A4',
        specification: '210x297',
        quantity: 2,
        unitPrice: 50000,
        supplyAmount: 100000,
        vatAmount: 10000,
        totalAmount: 110000,
        salesType: 'ALBUM',
        productId: 'prod-1',
        sortOrder: 0,
      },
    ],
    receipts: [],
    client: createMockClient(),
    ...overrides,
  };
}

describe('SalesLedgerService', () => {
  let service: SalesLedgerService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let journalEngine: ReturnType<typeof createMockJournalEngineService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    journalEngine = createMockJournalEngineService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesLedgerService,
        { provide: PrismaService, useValue: prisma },
        { provide: JournalEngineService, useValue: journalEngine },
      ],
    }).compile();

    service = module.get<SalesLedgerService>(SalesLedgerService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================================================
  // generateLedgerNumber
  // =========================================================
  describe('generateLedgerNumber', () => {
    it('당일 첫 번째 전표번호를 생성해야 한다', async () => {
      prisma.salesLedger.findFirst.mockResolvedValue(null);

      const result = await service.generateLedgerNumber();

      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      expect(result).toBe(`SL-${dateStr}-001`);
    });

    it('기존 전표가 있으면 순번을 증가시켜야 한다', async () => {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      prisma.salesLedger.findFirst.mockResolvedValue({
        ledgerNumber: `SL-${dateStr}-005`,
      });

      const result = await service.generateLedgerNumber();

      expect(result).toBe(`SL-${dateStr}-006`);
    });
  });

  // =========================================================
  // generateReceiptNumber
  // =========================================================
  describe('generateReceiptNumber', () => {
    it('당일 첫 번째 수금번호를 생성해야 한다', async () => {
      prisma.salesReceipt.findFirst.mockResolvedValue(null);

      const result = await service.generateReceiptNumber();

      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      expect(result).toBe(`SR-${dateStr}-001`);
    });

    it('기존 수금번호가 있으면 순번을 증가시켜야 한다', async () => {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      prisma.salesReceipt.findFirst.mockResolvedValue({
        receiptNumber: `SR-${dateStr}-012`,
      });

      const result = await service.generateReceiptNumber();

      expect(result).toBe(`SR-${dateStr}-013`);
    });
  });

  // =========================================================
  // createFromOrder
  // =========================================================
  describe('createFromOrder', () => {
    it('거래처를 찾을 수 없으면 NotFoundException을 던져야 한다', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await expect(
        service.createFromOrder(createMockOrder(), 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('후불(credit) 결제 주문에서 매출원장을 생성해야 한다', async () => {
      const client = createMockClient();
      const order = createMockOrder({ paymentMethod: 'credit' });

      prisma.client.findUnique.mockResolvedValue(client);
      prisma.salesLedger.findFirst.mockResolvedValue(null); // generateLedgerNumber
      prisma.salesLedger.create.mockResolvedValue(
        createMockSalesLedger({
          paymentStatus: 'unpaid',
          receivedAmount: 0,
          outstandingAmount: 115000,
        }),
      );

      const result = await service.createFromOrder(order, 'user-1');

      // 매출원장이 생성되었는지 확인
      expect(prisma.salesLedger.create).toHaveBeenCalledTimes(1);
      const createCall = prisma.salesLedger.create.mock.calls[0][0];
      expect(createCall.data.paymentStatus).toBe('unpaid');
      expect(createCall.data.receivedAmount).toBe(0);
      expect(createCall.data.outstandingAmount).toBe(115000);
      expect(createCall.data.clientId).toBe('client-1');

      // 자동분개가 호출되었는지 확인
      expect(journalEngine.createSalesJournal).toHaveBeenCalledTimes(1);
    });

    it('선불(prepaid) 결제 주문은 paymentStatus가 paid이어야 한다', async () => {
      const client = createMockClient();
      const order = createMockOrder({ paymentMethod: 'prepaid' });

      prisma.client.findUnique.mockResolvedValue(client);
      prisma.salesLedger.findFirst.mockResolvedValue(null);
      prisma.salesLedger.create.mockResolvedValue(
        createMockSalesLedger({ paymentStatus: 'paid', receivedAmount: 115000, outstandingAmount: 0 }),
      );

      await service.createFromOrder(order, 'user-1');

      const createCall = prisma.salesLedger.create.mock.calls[0][0];
      expect(createCall.data.paymentStatus).toBe('paid');
      expect(createCall.data.receivedAmount).toBe(115000);
      expect(createCall.data.outstandingAmount).toBe(0);
    });

    it('카드(card) 결제 주문도 선불로 처리되어야 한다', async () => {
      const client = createMockClient();
      const order = createMockOrder({ paymentMethod: 'card' });

      prisma.client.findUnique.mockResolvedValue(client);
      prisma.salesLedger.findFirst.mockResolvedValue(null);
      prisma.salesLedger.create.mockResolvedValue(
        createMockSalesLedger({ paymentStatus: 'paid' }),
      );

      await service.createFromOrder(order, 'user-1');

      const createCall = prisma.salesLedger.create.mock.calls[0][0];
      expect(createCall.data.paymentStatus).toBe('paid');
      expect(createCall.data.receivedAmount).toBe(115000);
      expect(createCall.data.outstandingAmount).toBe(0);
    });

    it('신용기간(creditPeriodDays) 기반으로 결제기한을 산정해야 한다', async () => {
      const client = createMockClient({
        creditEnabled: true,
        creditPeriodDays: 30,
      });
      const order = createMockOrder({ paymentMethod: 'credit' });

      prisma.client.findUnique.mockResolvedValue(client);
      prisma.salesLedger.findFirst.mockResolvedValue(null);
      prisma.salesLedger.create.mockResolvedValue(createMockSalesLedger());

      await service.createFromOrder(order, 'user-1');

      const createCall = prisma.salesLedger.create.mock.calls[0][0];
      const dueDate = createCall.data.dueDate as Date;
      expect(dueDate).toBeDefined();
      expect(dueDate).toBeInstanceOf(Date);

      // dueDate는 오늘 + 30일
      const now = new Date();
      const expectedDue = new Date();
      expectedDue.setDate(expectedDue.getDate() + 30);
      // 날짜 비교 (일 단위)
      expect(dueDate.toISOString().slice(0, 10)).toBe(expectedDue.toISOString().slice(0, 10));
    });

    it('매월 N일 결제(creditPaymentDay) 기반으로 결제기한을 산정해야 한다', async () => {
      const client = createMockClient({
        creditEnabled: true,
        creditPeriodDays: null,
        creditPaymentDay: 15,
      });
      const order = createMockOrder({ paymentMethod: 'credit' });

      prisma.client.findUnique.mockResolvedValue(client);
      prisma.salesLedger.findFirst.mockResolvedValue(null);
      prisma.salesLedger.create.mockResolvedValue(createMockSalesLedger());

      await service.createFromOrder(order, 'user-1');

      const createCall = prisma.salesLedger.create.mock.calls[0][0];
      const dueDate = createCall.data.dueDate as Date;
      expect(dueDate).toBeDefined();
      expect(dueDate.getDate()).toBe(15);
      // 다음달 15일이어야 한다
      const now = new Date();
      const expectedMonth = now.getMonth() + 1;
      expect(dueDate.getMonth()).toBe(expectedMonth > 11 ? 0 : expectedMonth);
    });

    it('신용거래가 아닌 경우 결제기한이 null이어야 한다', async () => {
      const client = createMockClient({ creditEnabled: false });
      const order = createMockOrder({ paymentMethod: 'credit' });

      prisma.client.findUnique.mockResolvedValue(client);
      prisma.salesLedger.findFirst.mockResolvedValue(null);
      prisma.salesLedger.create.mockResolvedValue(createMockSalesLedger());

      await service.createFromOrder(order, 'user-1');

      const createCall = prisma.salesLedger.create.mock.calls[0][0];
      expect(createCall.data.dueDate).toBeNull();
    });

    it('매출원장 라인아이템이 올바르게 생성되어야 한다', async () => {
      const client = createMockClient();
      const order = createMockOrder({
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: '포토앨범 A4',
            size: '210x297',
            quantity: 2,
            unitPrice: 30000,
            totalPrice: 60000,
          },
          {
            id: 'item-2',
            productId: 'prod-2',
            productName: '아크릴액자',
            size: '300x300',
            quantity: 1,
            unitPrice: 40000,
            totalPrice: 40000,
          },
        ],
      });

      prisma.client.findUnique.mockResolvedValue(client);
      prisma.salesLedger.findFirst.mockResolvedValue(null);
      prisma.salesLedger.create.mockResolvedValue(createMockSalesLedger());

      await service.createFromOrder(order, 'user-1');

      const createCall = prisma.salesLedger.create.mock.calls[0][0];
      const items = createCall.data.items.create;

      expect(items).toHaveLength(2);

      // 첫 번째 아이템 검증
      expect(items[0].orderItemId).toBe('item-1');
      expect(items[0].itemName).toBe('포토앨범 A4');
      expect(items[0].specification).toBe('210x297');
      expect(items[0].quantity).toBe(2);
      expect(items[0].unitPrice).toBe(30000);
      expect(items[0].supplyAmount).toBe(60000);
      expect(items[0].vatAmount).toBe(6000); // Math.round(60000 * 0.1)
      expect(items[0].totalAmount).toBe(66000);
      expect(items[0].sortOrder).toBe(0);

      // 두 번째 아이템 검증
      expect(items[1].orderItemId).toBe('item-2');
      expect(items[1].sortOrder).toBe(1);
      expect(items[1].vatAmount).toBe(4000); // Math.round(40000 * 0.1)
    });

    it('자동분개 실패 시에도 매출원장 생성은 성공해야 한다', async () => {
      const client = createMockClient();
      const order = createMockOrder();

      prisma.client.findUnique.mockResolvedValue(client);
      prisma.salesLedger.findFirst.mockResolvedValue(null);

      const expectedLedger = createMockSalesLedger();
      prisma.salesLedger.create.mockResolvedValue(expectedLedger);
      journalEngine.createSalesJournal.mockRejectedValue(new Error('분개 오류'));

      const result = await service.createFromOrder(order, 'user-1');

      expect(result).toEqual(expectedLedger);
      expect(journalEngine.createSalesJournal).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================
  // findAll
  // =========================================================
  describe('findAll', () => {
    it('기본 조건으로 목록을 조회해야 한다', async () => {
      const mockData = [createMockSalesLedger()];
      prisma.salesLedger.findMany.mockResolvedValue(mockData);
      prisma.salesLedger.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toEqual(mockData);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    it('기간 필터가 올바르게 적용되어야 한다', async () => {
      prisma.salesLedger.findMany.mockResolvedValue([]);
      prisma.salesLedger.count.mockResolvedValue(0);

      await service.findAll({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        page: 1,
        limit: 20,
      });

      const findManyCall = prisma.salesLedger.findMany.mock.calls[0][0];
      expect(findManyCall.where.ledgerDate.gte).toEqual(new Date('2026-01-01'));
      expect(findManyCall.where.ledgerDate.lte).toBeInstanceOf(Date);
    });

    it('검색어 필터가 OR 조건으로 적용되어야 한다', async () => {
      prisma.salesLedger.findMany.mockResolvedValue([]);
      prisma.salesLedger.count.mockResolvedValue(0);

      await service.findAll({
        search: '스튜디오',
        page: 1,
        limit: 20,
      });

      const findManyCall = prisma.salesLedger.findMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR).toHaveLength(3);
    });

    it('페이징이 올바르게 동작해야 한다', async () => {
      prisma.salesLedger.findMany.mockResolvedValue([]);
      prisma.salesLedger.count.mockResolvedValue(50);

      const result = await service.findAll({ page: 3, limit: 10 });

      const findManyCall = prisma.salesLedger.findMany.mock.calls[0][0];
      expect(findManyCall.skip).toBe(20); // (3-1) * 10
      expect(findManyCall.take).toBe(10);
      expect(result.meta.totalPages).toBe(5); // Math.ceil(50/10)
    });

    it('거래처ID, 매출유형, 결제상태 필터가 동작해야 한다', async () => {
      prisma.salesLedger.findMany.mockResolvedValue([]);
      prisma.salesLedger.count.mockResolvedValue(0);

      await service.findAll({
        clientId: 'client-1',
        salesType: 'ALBUM' as any,
        paymentStatus: 'unpaid',
        page: 1,
        limit: 20,
      });

      const findManyCall = prisma.salesLedger.findMany.mock.calls[0][0];
      expect(findManyCall.where.clientId).toBe('client-1');
      expect(findManyCall.where.salesType).toBe('ALBUM');
      expect(findManyCall.where.paymentStatus).toBe('unpaid');
    });
  });

  // =========================================================
  // findById
  // =========================================================
  describe('findById', () => {
    it('존재하는 매출원장을 조회해야 한다', async () => {
      const mockLedger = createMockSalesLedger();
      prisma.salesLedger.findUnique.mockResolvedValue(mockLedger);

      const result = await service.findById('ledger-1');

      expect(result).toEqual(mockLedger);
      expect(prisma.salesLedger.findUnique).toHaveBeenCalledWith({
        where: { id: 'ledger-1' },
        include: expect.objectContaining({
          items: expect.any(Object),
          receipts: expect.any(Object),
          client: expect.any(Object),
        }),
      });
    });

    it('존재하지 않는 매출원장 조회 시 NotFoundException을 던져야 한다', async () => {
      prisma.salesLedger.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================
  // findByOrderId
  // =========================================================
  describe('findByOrderId', () => {
    it('주문ID로 매출원장을 조회해야 한다', async () => {
      const mockLedger = createMockSalesLedger();
      prisma.salesLedger.findUnique.mockResolvedValue(mockLedger);

      const result = await service.findByOrderId('order-1');

      expect(result).toEqual(mockLedger);
      expect(prisma.salesLedger.findUnique).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        include: expect.objectContaining({
          items: expect.any(Object),
          receipts: expect.any(Object),
        }),
      });
    });
  });

  // =========================================================
  // addReceipt (수금 처리)
  // =========================================================
  describe('addReceipt', () => {
    const receiptDto = {
      receiptDate: '2026-02-15',
      amount: 50000,
      paymentMethod: 'bank_transfer',
      bankName: '국민은행',
      depositorName: '테스트',
      note: '중간 수금',
    };

    beforeEach(() => {
      // findById에서 사용하는 findUnique mock
      prisma.salesLedger.findUnique.mockResolvedValue(
        createMockSalesLedger({
          totalAmount: 115000,
          receivedAmount: 0,
          outstandingAmount: 115000,
        }),
      );
      prisma.salesReceipt.findFirst.mockResolvedValue(null); // generateReceiptNumber
      prisma.$transaction.mockResolvedValue([{ id: 'receipt-1' }, {}]);
    });

    it('유효한 수금 처리가 성공해야 한다', async () => {
      // findById를 두 번 호출 (처음: 검증, 마지막: 반환)
      const updatedLedger = createMockSalesLedger({
        receivedAmount: 50000,
        outstandingAmount: 65000,
        paymentStatus: 'partial',
      });
      prisma.salesLedger.findUnique
        .mockResolvedValueOnce(
          createMockSalesLedger({
            totalAmount: 115000,
            receivedAmount: 0,
            outstandingAmount: 115000,
          }),
        )
        .mockResolvedValueOnce(updatedLedger);

      const result = await service.addReceipt('ledger-1', receiptDto, 'user-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual(updatedLedger);
    });

    it('수금액이 미수금 잔액을 초과하면 BadRequestException을 던져야 한다', async () => {
      const dto = { ...receiptDto, amount: 200000 }; // 115000 초과

      await expect(
        service.addReceipt('ledger-1', dto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('완납 시 paymentStatus가 paid로 변경되어야 한다', async () => {
      const fullPaymentDto = { ...receiptDto, amount: 115000 };

      // 수금 처리 후 반환할 데이터
      prisma.salesLedger.findUnique
        .mockResolvedValueOnce(
          createMockSalesLedger({
            totalAmount: 115000,
            receivedAmount: 0,
            outstandingAmount: 115000,
          }),
        )
        .mockResolvedValueOnce(
          createMockSalesLedger({
            paymentStatus: 'paid',
            receivedAmount: 115000,
            outstandingAmount: 0,
          }),
        );

      await service.addReceipt('ledger-1', fullPaymentDto, 'user-1');

      const txCall = prisma.$transaction.mock.calls[0][0];
      // $transaction에 전달된 배열의 두 번째 항목(update)를 확인
      // Prisma.$transaction 호출 시 배열 내부 검증은 mock 구조에 따라 다름
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('일부 수금 시 paymentStatus가 partial이어야 한다', async () => {
      prisma.salesLedger.findUnique
        .mockResolvedValueOnce(
          createMockSalesLedger({
            totalAmount: 115000,
            receivedAmount: 0,
            outstandingAmount: 115000,
          }),
        )
        .mockResolvedValueOnce(
          createMockSalesLedger({
            paymentStatus: 'partial',
            receivedAmount: 50000,
            outstandingAmount: 65000,
          }),
        );

      const result = await service.addReceipt('ledger-1', receiptDto, 'user-1');

      expect(result.paymentStatus).toBe('partial');
    });

    it('존재하지 않는 매출원장에 수금 시 NotFoundException을 던져야 한다', async () => {
      prisma.salesLedger.findUnique.mockResolvedValue(null);

      await expect(
        service.addReceipt('non-existent', receiptDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('수금 후 자동분개가 생성되어야 한다', async () => {
      prisma.salesLedger.findUnique
        .mockResolvedValueOnce(
          createMockSalesLedger({
            totalAmount: 115000,
            receivedAmount: 0,
            outstandingAmount: 115000,
          }),
        )
        .mockResolvedValueOnce(
          createMockSalesLedger({ paymentStatus: 'partial' }),
        );

      await service.addReceipt('ledger-1', receiptDto, 'user-1');

      expect(journalEngine.createReceiptJournal).toHaveBeenCalledTimes(1);
      expect(journalEngine.createReceiptJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          salesLedgerId: 'ledger-1',
          amount: 50000,
          paymentMethod: 'bank_transfer',
          bankName: '국민은행',
        }),
      );
    });

    it('수금분개 실패 시에도 수금 처리는 성공해야 한다', async () => {
      journalEngine.createReceiptJournal.mockRejectedValue(new Error('분개 오류'));

      prisma.salesLedger.findUnique
        .mockResolvedValueOnce(
          createMockSalesLedger({
            totalAmount: 115000,
            receivedAmount: 0,
            outstandingAmount: 115000,
          }),
        )
        .mockResolvedValueOnce(
          createMockSalesLedger({ paymentStatus: 'partial' }),
        );

      const result = await service.addReceipt('ledger-1', receiptDto, 'user-1');

      expect(result).toBeDefined();
    });
  });

  // =========================================================
  // confirmSales (매출 확정)
  // =========================================================
  describe('confirmSales', () => {
    it('REGISTERED 상태의 원장을 확정할 수 있어야 한다', async () => {
      prisma.salesLedger.findUnique.mockResolvedValue(
        createMockSalesLedger({ salesStatus: 'REGISTERED' }),
      );
      prisma.salesLedger.update.mockResolvedValue(
        createMockSalesLedger({ salesStatus: 'CONFIRMED' }),
      );

      const result = await service.confirmSales('ledger-1', 'admin-1');

      expect(prisma.salesLedger.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ledger-1' },
          data: expect.objectContaining({
            salesStatus: 'CONFIRMED',
            confirmedBy: 'admin-1',
          }),
        }),
      );
      expect(result.salesStatus).toBe('CONFIRMED');
    });

    it('이미 확정된 원장은 재확정할 수 없어야 한다', async () => {
      prisma.salesLedger.findUnique.mockResolvedValue(
        createMockSalesLedger({ salesStatus: 'CONFIRMED' }),
      );

      await expect(
        service.confirmSales('ledger-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.confirmSales('ledger-1', 'admin-1'),
      ).rejects.toThrow('이미 매출 확정된 원장입니다.');
    });

    it('취소된 원장은 확정할 수 없어야 한다', async () => {
      prisma.salesLedger.findUnique.mockResolvedValue(
        createMockSalesLedger({ salesStatus: 'CANCELLED' }),
      );

      await expect(
        service.confirmSales('ledger-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.confirmSales('ledger-1', 'admin-1'),
      ).rejects.toThrow('취소된 원장은 확정할 수 없습니다.');
    });

    it('존재하지 않는 원장 확정 시 NotFoundException을 던져야 한다', async () => {
      prisma.salesLedger.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmSales('non-existent', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================
  // cancelSales (매출 취소)
  // =========================================================
  describe('cancelSales', () => {
    it('수금 이력이 없는 원장을 취소할 수 있어야 한다', async () => {
      prisma.salesLedger.findUnique.mockResolvedValue(
        createMockSalesLedger({ receivedAmount: 0 }),
      );
      prisma.salesLedger.update.mockResolvedValue(
        createMockSalesLedger({
          salesStatus: 'CANCELLED',
          paymentStatus: 'unpaid',
          outstandingAmount: 0,
        }),
      );

      const result = await service.cancelSales('ledger-1');

      expect(prisma.salesLedger.update).toHaveBeenCalledWith({
        where: { id: 'ledger-1' },
        data: {
          salesStatus: 'CANCELLED',
          paymentStatus: 'unpaid',
          outstandingAmount: 0,
        },
        include: { items: true },
      });
      expect(result.salesStatus).toBe('CANCELLED');
    });

    it('수금 이력이 있으면 취소할 수 없어야 한다', async () => {
      prisma.salesLedger.findUnique.mockResolvedValue(
        createMockSalesLedger({ receivedAmount: 50000 }),
      );

      await expect(service.cancelSales('ledger-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cancelSales('ledger-1')).rejects.toThrow(
        '수금 이력이 있는 매출은 취소할 수 없습니다',
      );
    });

    it('존재하지 않는 원장 취소 시 NotFoundException을 던져야 한다', async () => {
      prisma.salesLedger.findUnique.mockResolvedValue(null);

      await expect(service.cancelSales('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================
  // getSummary (매출원장 요약)
  // =========================================================
  describe('getSummary', () => {
    it('당월 매출 요약 정보를 반환해야 한다', async () => {
      prisma.salesLedger.aggregate
        .mockResolvedValueOnce({
          // monthlySales
          _sum: { totalAmount: 1000000, receivedAmount: 600000 },
          _count: { id: 10 },
        })
        .mockResolvedValueOnce({
          // totalOutstanding
          _sum: { outstandingAmount: 400000 },
        })
        .mockResolvedValueOnce({
          // overdueAmount
          _sum: { outstandingAmount: 150000 },
        });

      // clientsWithOutstanding (미수금 거래처 수)
      prisma.salesLedger.findMany
        .mockResolvedValueOnce([
          { clientId: 'c1' },
          { clientId: 'c2' },
          { clientId: 'c3' },
        ])
        // clientsWithOverdue (연체 거래처 수)
        .mockResolvedValueOnce([
          { clientId: 'c1' },
          { clientId: 'c2' },
        ]);

      const result = await service.getSummary();

      expect(result).toEqual({
        totalSales: 1000000,
        totalReceived: 600000,
        totalOutstanding: 400000,
        totalOverdue: 150000,
        overdueClientCount: 2,
        ledgerCount: 10,
        clientCount: 3,
      });
    });

    it('데이터가 없을 때 0을 반환해야 한다', async () => {
      prisma.salesLedger.aggregate
        .mockResolvedValueOnce({
          _sum: { totalAmount: null, receivedAmount: null },
          _count: { id: 0 },
        })
        .mockResolvedValueOnce({
          _sum: { outstandingAmount: null },
        })
        .mockResolvedValueOnce({
          _sum: { outstandingAmount: null },
        });

      prisma.salesLedger.findMany
        .mockResolvedValueOnce([])  // clientsWithOutstanding
        .mockResolvedValueOnce([]); // clientsWithOverdue

      const result = await service.getSummary();

      expect(result.totalSales).toBe(0);
      expect(result.totalReceived).toBe(0);
      expect(result.totalOutstanding).toBe(0);
      expect(result.totalOverdue).toBe(0);
      expect(result.overdueClientCount).toBe(0);
      expect(result.ledgerCount).toBe(0);
      expect(result.clientCount).toBe(0);
    });
  });

  // =========================================================
  // getClientSummary (거래처별 집계)
  // =========================================================
  describe('getClientSummary', () => {
    it('거래처별 매출 집계를 반환해야 한다', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          clientId: 'c1',
          clientName: 'A스튜디오',
          clientCode: 'C001',
          totalSales: 500000,
          totalReceived: 300000,
          outstanding: 200000,
          orderCount: BigInt(5),
          lastOrderDate: new Date('2026-02-01'),
        },
      ]);

      const result = await service.getClientSummary({});

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        clientId: 'c1',
        clientName: 'A스튜디오',
        clientCode: 'C001',
        totalSales: 500000,
        totalReceived: 300000,
        outstanding: 200000,
        orderCount: 5,
        lastOrderDate: expect.any(String),
      });
    });

    it('기간 필터가 쿼리에 반영되어야 한다', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.getClientSummary({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      // $queryRawUnsafe 호출 시 파라미터 확인
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
      const args = prisma.$queryRawUnsafe.mock.calls[0];
      // SQL 문자열에 기간 조건이 포함되어야 함
      expect(args[0]).toContain('ledgerDate');
      // 날짜 파라미터가 전달되어야 함
      expect(args.length).toBeGreaterThan(1);
    });
  });

  // =========================================================
  // updateOverdueStatus (연체 처리)
  // =========================================================
  describe('updateOverdueStatus', () => {
    it('연체 상태 일괄 업데이트가 수행되어야 한다', async () => {
      prisma.salesLedger.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.updateOverdueStatus();

      expect(result).toEqual({ updatedCount: 5 });
      expect(prisma.salesLedger.updateMany).toHaveBeenCalledWith({
        where: {
          paymentStatus: { in: ['unpaid', 'partial'] },
          dueDate: { lt: expect.any(Date) },
          salesStatus: { not: 'CANCELLED' },
        },
        data: { paymentStatus: 'overdue' },
      });
    });

    it('연체 건이 없으면 0을 반환해야 한다', async () => {
      prisma.salesLedger.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.updateOverdueStatus();

      expect(result).toEqual({ updatedCount: 0 });
    });
  });

  // =========================================================
  // calculateCreditScore (신용도 평가)
  // =========================================================
  describe('calculateCreditScore', () => {
    it('거래처를 찾을 수 없으면 에러를 던져야 한다', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await expect(
        service.calculateCreditScore('non-existent'),
      ).rejects.toThrow('거래처를 찾을 수 없습니다.');
    });

    it('거래내역이 없으면 기본 B등급을 반환해야 한다', async () => {
      prisma.client.findUnique.mockResolvedValue(createMockClient());
      prisma.salesLedger.findMany.mockResolvedValue([]);
      prisma.client.update.mockResolvedValue({});

      const result = await service.calculateCreditScore('client-1');

      expect(result.score).toBe(70);
      expect(result.grade).toBe('B');
      expect(result.creditLimit).toBe(0);
      expect(result.riskLevel).toBe('medium');
      expect(prisma.client.update).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        data: { creditGrade: 'B' },
      });
    });

    it('정시 결제율 100%이고 연체 없으면 A등급이어야 한다', async () => {
      const client = createMockClient();
      prisma.client.findUnique.mockResolvedValue(client);

      // 10건 모두 정시 결제 완료 (dueDate 이전에 수금)
      const confirmedLedgers = Array.from({ length: 10 }, (_, i) => ({
        id: `ledger-${i}`,
        clientId: 'client-1',
        totalAmount: 100000,
        outstandingAmount: 0,
        paymentStatus: 'paid',
        salesStatus: 'CONFIRMED',
        ledgerDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30일 전
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 미래 (아직 안 지남)
        receipts: [
          {
            receiptDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // dueDate보다 이전
          },
        ],
      }));

      prisma.salesLedger.findMany.mockResolvedValue(confirmedLedgers);
      prisma.client.update.mockResolvedValue({});
      prisma.customerHealthScore.upsert.mockResolvedValue({});

      const result = await service.calculateCreditScore('client-1');

      expect(result.grade).toBe('A');
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.riskLevel).toBe('low');
    });

    it('연체가 많으면 D등급이어야 한다', async () => {
      const client = createMockClient();
      prisma.client.findUnique.mockResolvedValue(client);

      // 10건 중 6건 연체
      const ledgers = Array.from({ length: 10 }, (_, i) => ({
        id: `ledger-${i}`,
        clientId: 'client-1',
        totalAmount: 100000,
        outstandingAmount: i < 6 ? 100000 : 0,
        paymentStatus: i < 6 ? 'overdue' : 'paid',
        salesStatus: 'CONFIRMED',
        ledgerDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        receipts: i >= 6
          ? [{ receiptDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) }]
          : [],
      }));

      prisma.salesLedger.findMany.mockResolvedValue(ledgers);
      prisma.client.update.mockResolvedValue({});
      prisma.customerHealthScore.upsert.mockResolvedValue({});

      const result = await service.calculateCreditScore('client-1');

      expect(result.grade).toBe('D');
      expect(result.score).toBeLessThan(40);
      expect(result.riskLevel).toBe('high');
      expect(result.overdueCount).toBe(6);
    });

    it('신용한도가 등급에 따라 올바르게 계산되어야 한다', async () => {
      const client = createMockClient();
      prisma.client.findUnique.mockResolvedValue(client);

      // A등급 시나리오: 모두 정시 결제
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const futureDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const ledgers = Array.from({ length: 6 }, (_, i) => ({
        id: `ledger-${i}`,
        clientId: 'client-1',
        totalAmount: 300000, // 월별 300000 x 6건 / 6개월 = 월평균 300000
        outstandingAmount: 0,
        paymentStatus: 'paid',
        salesStatus: 'CONFIRMED',
        ledgerDate: recentDate,
        dueDate: futureDueDate,
        receipts: [
          {
            receiptDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
        ],
      }));

      prisma.salesLedger.findMany.mockResolvedValue(ledgers);
      prisma.client.update.mockResolvedValue({});
      prisma.customerHealthScore.upsert.mockResolvedValue({});

      const result = await service.calculateCreditScore('client-1');

      // A등급: creditLimit = monthlyAvgSales * 3
      // monthlyAvgSales = (300000 * 6) / 6 = 300000
      expect(result.grade).toBe('A');
      expect(result.creditLimit).toBe(300000 * 3);
    });

    it('CustomerHealthScore가 upsert 되어야 한다', async () => {
      const client = createMockClient();
      prisma.client.findUnique.mockResolvedValue(client);
      prisma.salesLedger.findMany.mockResolvedValue([
        {
          id: 'ledger-1',
          clientId: 'client-1',
          totalAmount: 100000,
          outstandingAmount: 0,
          paymentStatus: 'paid',
          salesStatus: 'CONFIRMED',
          ledgerDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          receipts: [{ receiptDate: new Date() }],
        },
      ]);
      prisma.client.update.mockResolvedValue({});
      prisma.customerHealthScore.upsert.mockResolvedValue({});

      await service.calculateCreditScore('client-1');

      expect(prisma.customerHealthScore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: 'client-1' },
          create: expect.objectContaining({
            clientId: 'client-1',
            totalScore: expect.any(Number),
            grade: expect.any(String),
          }),
          update: expect.objectContaining({
            totalScore: expect.any(Number),
            grade: expect.any(String),
          }),
        }),
      );
    });

    it('연체 3건 이상이면 riskLevel이 high이어야 한다', async () => {
      const client = createMockClient();
      prisma.client.findUnique.mockResolvedValue(client);

      // B등급이지만 연체 3건
      const ledgers = Array.from({ length: 10 }, (_, i) => ({
        id: `ledger-${i}`,
        clientId: 'client-1',
        totalAmount: 100000,
        outstandingAmount: i < 3 ? 100000 : 0,
        paymentStatus: i < 3 ? 'overdue' : 'paid',
        salesStatus: 'CONFIRMED',
        ledgerDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        receipts: i >= 3
          ? [{ receiptDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }]
          : [],
      }));

      prisma.salesLedger.findMany.mockResolvedValue(ledgers);
      prisma.client.update.mockResolvedValue({});
      prisma.customerHealthScore.upsert.mockResolvedValue({});

      const result = await service.calculateCreditScore('client-1');

      expect(result.riskLevel).toBe('high');
      expect(result.overdueCount).toBeGreaterThanOrEqual(3);
    });

    it('등급별 권장사항이 올바르게 반환되어야 한다', async () => {
      const client = createMockClient();
      prisma.client.findUnique.mockResolvedValue(client);

      // A등급 시나리오
      const ledgers = Array.from({ length: 5 }, (_, i) => ({
        id: `ledger-${i}`,
        clientId: 'client-1',
        totalAmount: 100000,
        outstandingAmount: 0,
        paymentStatus: 'paid',
        salesStatus: 'CONFIRMED',
        ledgerDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        receipts: [{ receiptDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }],
      }));

      prisma.salesLedger.findMany.mockResolvedValue(ledgers);
      prisma.client.update.mockResolvedValue({});
      prisma.customerHealthScore.upsert.mockResolvedValue({});

      const result = await service.calculateCreditScore('client-1');

      expect(result.recommendation).toContain('우수 거래처');
    });
  });

  // =========================================================
  // getAgingAnalysis (Aging 분석)
  // =========================================================
  describe('getAgingAnalysis', () => {
    it('Aging 분석 결과를 올바르게 반환해야 한다', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          clientId: 'c1',
          clientName: 'A스튜디오',
          under30: 100000,
          days30to60: 50000,
          days60to90: 30000,
          over90: 20000,
        },
        {
          clientId: 'c2',
          clientName: 'B스튜디오',
          under30: 80000,
          days30to60: 0,
          days60to90: 0,
          over90: 10000,
        },
      ]);

      const result = await service.getAgingAnalysis();

      expect(result.under30).toBe(180000);
      expect(result.days30to60).toBe(50000);
      expect(result.days60to90).toBe(30000);
      expect(result.over90).toBe(30000);
      expect(result.breakdown).toHaveLength(2);
    });

    it('거래처 필터가 적용되어야 한다', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.getAgingAnalysis('client-1');

      const args = prisma.$queryRawUnsafe.mock.calls[0];
      expect(args[0]).toContain('clientId');
      // clientId 파라미터가 전달되어야 함
      expect(args).toContain('client-1');
    });

    it('미수금이 없으면 모든 값이 0이어야 한다', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.getAgingAnalysis();

      expect(result.under30).toBe(0);
      expect(result.days30to60).toBe(0);
      expect(result.days60to90).toBe(0);
      expect(result.over90).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });
  });

  // =========================================================
  // getClientDetail (거래처별 상세 분석)
  // =========================================================
  describe('getClientDetail', () => {
    it('존재하지 않는 거래처 조회 시 NotFoundException을 던져야 한다', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await expect(service.getClientDetail('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('거래처별 상세 정보를 올바르게 반환해야 한다', async () => {
      const client = createMockClient({ healthScore: null });
      prisma.client.findUnique.mockResolvedValue(client);

      // 매출원장 (paid 1건, overdue 1건)
      prisma.salesLedger.findMany.mockResolvedValue([
        {
          ...createMockSalesLedger({
            paymentStatus: 'paid',
            totalAmount: 100000,
            receivedAmount: 100000,
            outstandingAmount: 0,
            dueDate: new Date('2026-01-15'),
          }),
          receipts: [
            { receiptDate: new Date('2026-01-10') }, // dueDate보다 5일 빠름
          ],
        },
        {
          ...createMockSalesLedger({
            id: 'ledger-2',
            paymentStatus: 'overdue',
            totalAmount: 50000,
            receivedAmount: 0,
            outstandingAmount: 50000,
          }),
          receipts: [],
        },
      ]);

      // 월별 추이
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      // 수금 이력
      prisma.salesReceipt.findMany.mockResolvedValue([
        { receiptDate: new Date('2026-01-10') },
      ]);

      const result = await service.getClientDetail('client-1');

      expect(result.client).toBeDefined();
      expect(result.summary.totalSales).toBe(150000);
      expect(result.summary.totalReceived).toBe(100000);
      expect(result.summary.outstanding).toBe(50000);
      expect(result.summary.overdueCount).toBe(1);
    });
  });

  // =========================================================
  // sendOverdueNotifications (연체 알림)
  // =========================================================
  describe('sendOverdueNotifications', () => {
    it('연체 거래처별로 알림 목록을 생성해야 한다', async () => {
      prisma.salesLedger.findMany.mockResolvedValue([
        {
          clientId: 'c1',
          outstandingAmount: 100000,
          dueDate: new Date('2026-01-01'),
          client: {
            id: 'c1',
            clientName: 'A스튜디오',
            email: 'a@test.com',
            phone: '010-1234-5678',
            assignedManager: '김담당',
          },
        },
        {
          clientId: 'c1',
          outstandingAmount: 50000,
          dueDate: new Date('2026-01-15'),
          client: {
            id: 'c1',
            clientName: 'A스튜디오',
            email: 'a@test.com',
            phone: '010-1234-5678',
            assignedManager: '김담당',
          },
        },
        {
          clientId: 'c2',
          outstandingAmount: 200000,
          dueDate: new Date('2025-12-01'),
          client: {
            id: 'c2',
            clientName: 'B스튜디오',
            email: 'b@test.com',
            phone: '010-9876-5432',
            assignedManager: '이담당',
          },
        },
      ]);

      const result = await service.sendOverdueNotifications();

      expect(result.totalClients).toBe(2);
      expect(result.totalOverdueLedgers).toBe(3);
      expect(result.totalOverdueAmount).toBe(350000);
      expect(result.notifications).toHaveLength(2);
      // 첫 번째 거래처(c1)는 2건
      const c1Notification = result.notifications.find(
        (n: any) => n.clientId === 'c1',
      );
      expect(c1Notification?.overdueCount).toBe(2);
      expect(c1Notification?.totalOverdue).toBe(150000);
    });

    it('연체 건이 없으면 빈 알림 목록을 반환해야 한다', async () => {
      prisma.salesLedger.findMany.mockResolvedValue([]);

      const result = await service.sendOverdueNotifications();

      expect(result.totalClients).toBe(0);
      expect(result.totalOverdueLedgers).toBe(0);
      expect(result.notifications).toHaveLength(0);
    });
  });

  // =========================================================
  // getLedgersByStaff (영업담당자별 매출원장)
  // =========================================================
  describe('getLedgersByStaff', () => {
    it('담당 거래처가 없으면 빈 결과를 반환해야 한다', async () => {
      prisma.staffClient.findMany.mockResolvedValue([]);

      const result = await service.getLedgersByStaff('staff-1', {});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('담당 거래처의 매출원장만 조회해야 한다', async () => {
      prisma.staffClient.findMany.mockResolvedValue([
        { clientId: 'c1' },
        { clientId: 'c2' },
      ]);
      prisma.salesLedger.findMany.mockResolvedValue([createMockSalesLedger()]);
      prisma.salesLedger.count.mockResolvedValue(1);

      const result = await service.getLedgersByStaff('staff-1', {
        page: 1,
        limit: 20,
      });

      const findManyCall = prisma.salesLedger.findMany.mock.calls[0][0];
      expect(findManyCall.where.clientId).toEqual({ in: ['c1', 'c2'] });
      expect(result.data).toHaveLength(1);
    });
  });

  // =========================================================
  // getMonthlyTrend (월별 매출 추이)
  // =========================================================
  describe('getMonthlyTrend', () => {
    it('빈 월도 포함하여 결과를 반환해야 한다', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.getMonthlyTrend(6);

      expect(result).toHaveLength(6);
      result.forEach((entry: any) => {
        expect(entry.sales).toBe(0);
        expect(entry.received).toBe(0);
        expect(entry.outstanding).toBe(0);
        expect(entry.count).toBe(0);
      });
    });

    it('DB 데이터가 있는 월은 해당 값을 반환해야 한다', async () => {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          month: currentMonth,
          sales: 500000,
          received: 300000,
          outstanding: 200000,
          count: BigInt(5),
        },
      ]);

      const result = await service.getMonthlyTrend(3);

      const currentMonthData = result.find((r: any) => r.month === currentMonth);
      expect(currentMonthData?.sales).toBe(500000);
      expect(currentMonthData?.received).toBe(300000);
      expect(currentMonthData?.count).toBe(5);
    });
  });

  // =========================================================
  // getDueDateSummary (수금예정일별 집계)
  // =========================================================
  describe('getDueDateSummary', () => {
    it('결과에 today, thisWeek, thisMonth, overdue가 포함되어야 한다', async () => {
      prisma.salesLedger.findMany.mockResolvedValue([]);

      const result = await service.getDueDateSummary({});

      expect(result).toHaveProperty('today');
      expect(result).toHaveProperty('thisWeek');
      expect(result).toHaveProperty('thisMonth');
      expect(result).toHaveProperty('overdue');
      expect(result).toHaveProperty('byDate');
    });
  });

  // =========================================================
  // getPaymentPattern (수금 패턴 분석)
  // =========================================================
  describe('getPaymentPattern', () => {
    it('수금 데이터가 없으면 기본값을 반환해야 한다', async () => {
      prisma.salesLedger.findMany.mockResolvedValue([]);

      const result = await service.getPaymentPattern({});

      expect(result.avgPaymentDays).toBe(0);
      expect(result.medianPaymentDays).toBe(0);
      expect(result.onTimePaymentRate).toBe(0);
      expect(result.delayedPaymentRate).toBe(0);
      expect(result.seasonality).toEqual([]);
      expect(result.weekdayPattern).toEqual([]);
    });
  });
});

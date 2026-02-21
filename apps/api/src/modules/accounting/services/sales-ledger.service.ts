import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  SalesLedgerQueryDto,
  CreateSalesReceiptDto,
} from '../dto/sales-ledger.dto';
import { JournalEngineService } from './journal-engine.service';
import { subDays, differenceInDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class SalesLedgerService {
  private readonly logger = new Logger(SalesLedgerService.name);

  constructor(
    private prisma: PrismaService,
    private journalEngine: JournalEngineService,
  ) {}

  // ===== 매출전표번호 생성 =====
  // 형식: SL-YYYYMMDD-NNN (일별 순번)
  async generateLedgerNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `SL-${dateStr}-`;

    const lastLedger = await this.prisma.salesLedger.findFirst({
      where: { ledgerNumber: { startsWith: prefix } },
      orderBy: { ledgerNumber: 'desc' },
    });

    let sequence = 1;
    if (lastLedger) {
      const lastSeq = parseInt(lastLedger.ledgerNumber.split('-')[2]);
      sequence = lastSeq + 1;
    }

    return `${prefix}${sequence.toString().padStart(3, '0')}`;
  }

  // ===== 수금번호 생성 =====
  async generateReceiptNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `SR-${dateStr}-`;

    const lastReceipt = await this.prisma.salesReceipt.findFirst({
      where: { receiptNumber: { startsWith: prefix } },
      orderBy: { receiptNumber: 'desc' },
    });

    let sequence = 1;
    if (lastReceipt) {
      const lastSeq = parseInt(lastReceipt.receiptNumber.split('-')[2]);
      sequence = lastSeq + 1;
    }

    return `${prefix}${sequence.toString().padStart(3, '0')}`;
  }

  // ===== 주문 접수 시 매출원장 자동 등록 =====
  async createFromOrder(order: {
    id: string;
    orderNumber: string;
    clientId: string;
    productPrice: number;
    shippingFee: number;
    tax: number;
    totalAmount: number;
    finalAmount: number;
    paymentMethod: string;
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      size: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }, createdBy: string) {
    // 거래처 정보 조회
    const client = await this.prisma.client.findUnique({
      where: { id: order.clientId },
    });

    if (!client) {
      throw new NotFoundException('거래처를 찾을 수 없습니다.');
    }

    const ledgerNumber = await this.generateLedgerNumber();

    // 공급가액 = 상품가격 (부가세 제외)
    const supplyAmount = order.productPrice;
    const vatAmount = order.tax;
    const shippingFee = order.shippingFee;
    const totalAmount = order.finalAmount;

    // 결제기한 산정 (거래처 신용거래 설정 기반)
    let dueDate: Date | null = null;
    if (client.creditEnabled && client.creditPeriodDays) {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + client.creditPeriodDays);
    } else if (client.creditEnabled && client.creditPaymentDay) {
      // 매월 N일 결제
      dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(client.creditPaymentDay);
    }

    // 선불 결제인 경우 이미 수금 완료
    const isPrepaid = order.paymentMethod === 'prepaid' || order.paymentMethod === 'card';
    const receivedAmount = isPrepaid ? totalAmount : 0;
    const outstandingAmount = isPrepaid ? 0 : totalAmount;
    const paymentStatus = isPrepaid ? 'paid' : 'unpaid';

    // 매출원장 라인아이템 생성 데이터
    const ledgerItems = order.items.map((item, index) => {
      const itemVat = Math.round(Number(item.totalPrice) * 0.1);
      return {
        orderItemId: item.id,
        itemName: item.productName,
        specification: item.size,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        supplyAmount: Number(item.totalPrice),
        vatAmount: itemVat,
        totalAmount: Number(item.totalPrice) + itemVat,
        salesType: 'ALBUM' as const, // 기본값, 추후 상품 카테고리에서 자동 매핑
        productId: item.productId,
        sortOrder: index,
      };
    });

    // 주문 제목 생성 (상품명 기반)
    const orderTitle = order.items.length === 1
      ? order.items[0].productName
      : `${order.items[0].productName} 외 ${order.items.length - 1}건`;

    const salesLedger = await this.prisma.salesLedger.create({
      data: {
        ledgerNumber,
        ledgerDate: new Date(),
        clientId: client.id,
        clientName: client.clientName,
        clientBizNo: client.businessNumber,
        staffId: client.assignedManager, // 거래처 담당자 설정
        orderId: order.id,
        orderNumber: order.orderNumber,
        salesType: 'ALBUM',
        taxType: 'TAXABLE',
        supplyAmount,
        vatAmount,
        shippingFee,
        totalAmount,
        receivedAmount,
        outstandingAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus,
        dueDate,
        salesStatus: 'REGISTERED',
        description: orderTitle,
        createdBy,
        items: {
          create: ledgerItems,
        },
      },
      include: {
        items: true,
        client: true,
      },
    });

    // 카드/선불 결제 시 SalesReceipt 자동 생성 (입금내역에 표시되도록)
    if (isPrepaid) {
      try {
        const receiptNumber = await this.generateReceiptNumber();
        await this.prisma.salesReceipt.create({
          data: {
            salesLedgerId: salesLedger.id,
            receiptNumber,
            receiptDate: new Date(),
            amount: totalAmount,
            paymentMethod: order.paymentMethod,
            note: '주문 시 자동 수금',
            createdBy,
          },
        });
      } catch (err) {
        this.logger.warn(`선불 수금 자동 생성 실패: ${err.message}`);
      }
    }

    // After salesLedger creation, create auto-journal
    try {
      await this.journalEngine.createSalesJournal({
        salesLedgerId: salesLedger.id,
        clientId: client.id,
        clientName: client.clientName,
        supplyAmount: Number(supplyAmount),
        vatAmount: Number(vatAmount),
        totalAmount: Number(totalAmount),
        accountCode: '402', // 제품매출
        orderId: order.id,
        orderNumber: order.orderNumber,
        description: orderTitle,
      });
    } catch (err) {
      // Journal creation failure should not block sales ledger creation
      // 분개 생성 실패 시 매출원장 생성은 계속 진행
    }

    return salesLedger;
  }

  // ===== 카드/선불 결제 SalesReceipt 백필 =====
  // 기존 카드/선불 결제 매출원장 중 SalesReceipt가 없는 건에 대해 자동 생성
  async backfillPrepaidReceipts(): Promise<{ created: number; errors: number }> {
    // SalesReceipt가 없는 카드/선불 결제 매출원장 조회
    const ledgersWithoutReceipt = await this.prisma.salesLedger.findMany({
      where: {
        paymentMethod: { in: ['card', 'prepaid'] },
        paymentStatus: 'paid',
        receipts: { none: {} },
      },
      select: {
        id: true,
        ledgerDate: true,
        totalAmount: true,
        paymentMethod: true,
        createdBy: true,
      },
    });

    let created = 0;
    let errors = 0;

    for (const ledger of ledgersWithoutReceipt) {
      try {
        const receiptNumber = await this.generateReceiptNumber();
        await this.prisma.salesReceipt.create({
          data: {
            salesLedgerId: ledger.id,
            receiptNumber,
            receiptDate: ledger.ledgerDate,
            amount: ledger.totalAmount,
            paymentMethod: ledger.paymentMethod,
            note: '주문 시 자동 수금 (백필)',
            createdBy: ledger.createdBy,
          },
        });
        created++;
      } catch (err) {
        this.logger.warn(`백필 실패 (ledgerId: ${ledger.id}): ${err.message}`);
        errors++;
      }
    }

    this.logger.log(`SalesReceipt 백필 완료: ${created}건 생성, ${errors}건 실패`);
    return { created, errors };
  }

  // ===== 매출 직접 등록 (홈페이지 외 매출) =====
  // Order 없이 직접 매출원장 생성 → 자동 전표 생성
  async createDirect(dto: {
    clientId: string;
    salesType: string;
    paymentMethod: string;
    supplyAmount: number;
    vatAmount: number;
    totalAmount: number;
    description?: string;
    items: Array<{
      itemName: string;
      specification?: string;
      quantity: number;
      unitPrice: number;
      supplyAmount: number;
      vatAmount: number;
      totalAmount: number;
    }>;
  }, createdBy: string) {
    // 거래처 정보 조회
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });

    if (!client) {
      throw new NotFoundException('거래처를 찾을 수 없습니다.');
    }

    const ledgerNumber = await this.generateLedgerNumber();

    // 결제기한 산정
    let dueDate: Date | null = null;
    if (client.creditEnabled && client.creditPeriodDays) {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + client.creditPeriodDays);
    } else if (client.creditEnabled && client.creditPaymentDay) {
      dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(client.creditPaymentDay);
    }

    // 선불 결제인 경우 이미 수금 완료
    const isPrepaid = dto.paymentMethod === 'prepaid' || dto.paymentMethod === 'card';
    const receivedAmount = isPrepaid ? dto.totalAmount : 0;
    const outstandingAmount = isPrepaid ? 0 : dto.totalAmount;
    const paymentStatus = isPrepaid ? 'paid' : 'unpaid';

    // 매출원장 라인아이템 생성
    const ledgerItems = dto.items.map((item, index) => ({
      itemName: item.itemName,
      specification: item.specification || '',
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      supplyAmount: Number(item.supplyAmount),
      vatAmount: Number(item.vatAmount),
      totalAmount: Number(item.totalAmount),
      salesType: dto.salesType as any,
      sortOrder: index,
    }));

    // 주문 제목 생성
    const orderTitle = dto.description || (
      dto.items.length === 1
        ? dto.items[0].itemName
        : `${dto.items[0].itemName} 외 ${dto.items.length - 1}건`
    );

    const salesLedger = await this.prisma.salesLedger.create({
      data: {
        ledgerNumber,
        ledgerDate: new Date(),
        clientId: client.id,
        clientName: client.clientName,
        clientBizNo: client.businessNumber,
        staffId: client.assignedManager,
        salesType: dto.salesType as any,
        taxType: 'TAXABLE',
        supplyAmount: dto.supplyAmount,
        vatAmount: dto.vatAmount,
        shippingFee: 0,
        totalAmount: dto.totalAmount,
        receivedAmount,
        outstandingAmount,
        paymentMethod: dto.paymentMethod,
        paymentStatus,
        dueDate,
        salesStatus: 'REGISTERED',
        description: orderTitle,
        createdBy,
        items: {
          create: ledgerItems,
        },
      },
      include: {
        items: true,
        client: true,
      },
    });

    // 자동 전표 생성
    try {
      await this.journalEngine.createSalesJournal({
        salesLedgerId: salesLedger.id,
        clientId: client.id,
        clientName: client.clientName,
        supplyAmount: Number(dto.supplyAmount),
        vatAmount: Number(dto.vatAmount),
        totalAmount: Number(dto.totalAmount),
        accountCode: '402',
        description: orderTitle,
      });
    } catch (err) {
      // 분개 생성 실패 시 매출원장 생성은 계속 진행
    }

    return salesLedger;
  }

  // ===== 전월이월 잔액 조회 =====
  async getCarryOverBalance(clientId: string, beforeDate: string) {
    const date = new Date(beforeDate);

    const result = await this.prisma.salesLedger.aggregate({
      where: {
        clientId,
        ledgerDate: { lt: date },
        salesStatus: { not: 'CANCELLED' },
      },
      _sum: {
        totalAmount: true,
        receivedAmount: true,
        outstandingAmount: true,
      },
    });

    return {
      totalDebit: Number(result._sum.totalAmount || 0),
      totalCredit: Number(result._sum.receivedAmount || 0),
      balance: Number(result._sum.outstandingAmount || 0),
    };
  }

  // ===== 매출원장 목록 조회 =====
  async findAll(query: SalesLedgerQueryDto) {
    const { startDate, endDate, clientId, salesType, paymentStatus, salesStatus, search, page = 1, limit = 20 } = query;

    const where: Prisma.SalesLedgerWhereInput = {};

    // 기간 필터
    if (startDate || endDate) {
      where.ledgerDate = {};
      if (startDate) where.ledgerDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.ledgerDate.lte = end;
      }
    }

    if (clientId) where.clientId = clientId;
    if (salesType) where.salesType = salesType;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (salesStatus) where.salesStatus = salesStatus;

    // 검색 (주문번호, 거래처명, 전표번호)
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
        { ledgerNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 전기이월잔액 (clientId + startDate가 있을 때만)
    let carryForwardBalance = 0;
    if (clientId && startDate) {
      const cfResult = await this.prisma.$queryRaw<any[]>`
        SELECT
          COALESCE(SUM("totalAmount"), 0)::decimal as "totalDebit",
          COALESCE(SUM("receivedAmount"), 0)::decimal as "totalCredit"
        FROM sales_ledgers
        WHERE "clientId" = ${clientId}
          AND "ledgerDate" < ${startDate}::date
      `;
      const totalDebit = parseFloat(cfResult[0]?.totalDebit || '0');
      const totalCredit = parseFloat(cfResult[0]?.totalCredit || '0');
      carryForwardBalance = totalDebit - totalCredit;
    }

    const [data, total] = await Promise.all([
      this.prisma.salesLedger.findMany({
        where,
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          receipts: { orderBy: { receiptDate: 'desc' } },
          client: {
            select: { id: true, clientCode: true, clientName: true, businessNumber: true },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              items: {
                select: {
                  id: true,
                  bindingType: true,
                },
                take: 1,
              },
            },
          },
        },
        orderBy: { ledgerDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.salesLedger.count({ where }),
    ]);

    // 당월 합계
    const totalDebit = data.reduce((sum, d) => sum + Number(d.totalAmount), 0);
    const totalCredit = data.reduce((sum, d) => sum + Number(d.receivedAmount), 0);
    const closingBalance = carryForwardBalance + totalDebit - totalCredit;

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      summary: {
        carryForwardBalance,
        totalDebit,
        totalCredit,
        closingBalance,
      },
    };
  }

  // ===== 매출원장 상세 조회 =====
  async findById(id: string) {
    const ledger = await this.prisma.salesLedger.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        receipts: { orderBy: { receiptDate: 'desc' } },
        client: {
          select: {
            id: true, clientCode: true, clientName: true,
            businessNumber: true, phone: true, email: true,
            address: true, addressDetail: true,
          },
        },
      },
    });

    if (!ledger) {
      throw new NotFoundException('매출원장을 찾을 수 없습니다.');
    }

    return ledger;
  }

  // ===== 주문번호로 매출원장 조회 =====
  async findByOrderId(orderId: string) {
    return this.prisma.salesLedger.findUnique({
      where: { orderId },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        receipts: { orderBy: { receiptDate: 'desc' } },
      },
    });
  }

  // ===== 수금 처리 =====
  async addReceipt(salesLedgerId: string, dto: CreateSalesReceiptDto, createdBy: string) {
    const ledger = await this.findById(salesLedgerId);

    const currentOutstanding = Number(ledger.outstandingAmount);
    if (dto.amount > currentOutstanding) {
      throw new BadRequestException(`수금액(${dto.amount})이 미수금 잔액(${currentOutstanding})을 초과합니다.`);
    }

    const receiptNumber = await this.generateReceiptNumber();
    const newReceived = Number(ledger.receivedAmount) + dto.amount;
    const newOutstanding = Number(ledger.totalAmount) - newReceived;
    const newPaymentStatus = newOutstanding <= 0 ? 'paid' : 'partial';

    const [receipt] = await this.prisma.$transaction([
      this.prisma.salesReceipt.create({
        data: {
          salesLedgerId,
          receiptNumber,
          receiptDate: new Date(dto.receiptDate),
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          bankName: dto.bankName,
          depositorName: dto.depositorName,
          note: dto.note,
          createdBy,
        },
      }),
      this.prisma.salesLedger.update({
        where: { id: salesLedgerId },
        data: {
          receivedAmount: newReceived,
          outstandingAmount: newOutstanding,
          paymentStatus: newPaymentStatus,
        },
      }),
    ]);

    // After receipt creation, create receipt journal
    try {
      await this.journalEngine.createReceiptJournal({
        salesLedgerId,
        clientId: ledger.clientId,
        clientName: ledger.clientName,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        bankName: dto.bankName,
        description: `${ledger.ledgerNumber} 수금 (${dto.paymentMethod})`,
      });
    } catch (err) {
      // 수금분개 생성 실패 시 수금 처리는 계속 진행
    }

    return this.findById(salesLedgerId);
  }

  // ===== 매출 확정 (배송완료 시) =====
  async confirmSales(salesLedgerId: string, confirmedBy: string) {
    const ledger = await this.findById(salesLedgerId);

    if (ledger.salesStatus === 'CONFIRMED') {
      throw new BadRequestException('이미 매출 확정된 원장입니다.');
    }
    if (ledger.salesStatus === 'CANCELLED') {
      throw new BadRequestException('취소된 원장은 확정할 수 없습니다.');
    }

    return this.prisma.salesLedger.update({
      where: { id: salesLedgerId },
      data: {
        salesStatus: 'CONFIRMED',
        salesDate: new Date(),
        confirmedBy,
        confirmedAt: new Date(),
      },
      include: { items: true, receipts: true },
    });
  }

  // ===== 매출 취소 (취소전표 포함) =====
  async cancelSales(salesLedgerId: string) {
    const ledger = await this.findById(salesLedgerId);

    if (ledger.salesStatus === 'CANCELLED') {
      throw new BadRequestException('이미 취소된 매출원장입니다.');
    }

    // 1. 연결된 모든 전표 조회 (매출 + 수금)
    const salesJournals = await this.journalEngine.getJournalsBySource('SALES', salesLedgerId);
    const receiptJournals = await this.journalEngine.getJournalsBySource('RECEIPT', salesLedgerId);
    const allJournals = [...salesJournals, ...receiptJournals];

    // 2. 이미 생성된 취소전표 확인 (중복 방지)
    const existingCancellations = await this.journalEngine.getJournalsBySource('CANCELLATION', salesLedgerId);
    const cancelledVoucherNos = new Set(
      existingCancellations
        .map(c => c.description?.match(/원전표: (JE-[\d-]+)/)?.[1])
        .filter(Boolean),
    );

    // 3. 각 전표에 대해 취소(반대) 전표 생성
    for (const journal of allJournals) {
      if (cancelledVoucherNos.has(journal.voucherNo)) continue;

      try {
        await this.journalEngine.createCancellationJournal({
          originalJournalId: journal.id,
          reason: journal.sourceType === 'SALES' ? '매출취소전표' : '수금취소전표',
        });
      } catch (err) {
        this.logger.warn(`취소전표 생성 실패 (${journal.voucherNo}): ${(err as Error).message}`);
      }
    }

    // 4. 매출원장 상태 업데이트
    return this.prisma.salesLedger.update({
      where: { id: salesLedgerId },
      data: {
        salesStatus: 'CANCELLED',
        paymentStatus: 'unpaid',
        outstandingAmount: 0,
      },
      include: { items: true },
    });
  }

  // ===== 매출원장 요약 (대시보드) =====
  async getSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 당월 매출 합계
    const monthlySales = await this.prisma.salesLedger.aggregate({
      where: {
        ledgerDate: { gte: startOfMonth },
        salesStatus: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true, receivedAmount: true },
      _count: { id: true },
    });

    // 총 미수금 잔액
    const totalOutstanding = await this.prisma.salesLedger.aggregate({
      where: {
        paymentStatus: { in: ['unpaid', 'partial', 'overdue'] },
        salesStatus: { not: 'CANCELLED' },
      },
      _sum: { outstandingAmount: true },
    });

    // 연체 미수금 (결제기한 초과)
    const overdueAmount = await this.prisma.salesLedger.aggregate({
      where: {
        paymentStatus: { in: ['unpaid', 'partial'] },
        dueDate: { lt: now },
        salesStatus: { not: 'CANCELLED' },
      },
      _sum: { outstandingAmount: true },
    });

    // 미수금 거래처 수
    const clientsWithOutstanding = await this.prisma.salesLedger.findMany({
      where: {
        paymentStatus: { in: ['unpaid', 'partial', 'overdue'] },
        salesStatus: { not: 'CANCELLED' },
      },
      select: { clientId: true },
      distinct: ['clientId'],
    });

    // 연체 거래처 수
    const clientsWithOverdue = await this.prisma.salesLedger.findMany({
      where: {
        paymentStatus: { in: ['unpaid', 'partial'] },
        dueDate: { lt: now },
        salesStatus: { not: 'CANCELLED' },
      },
      select: { clientId: true },
      distinct: ['clientId'],
    });

    return {
      totalSales: Number(monthlySales._sum.totalAmount || 0),
      totalReceived: Number(monthlySales._sum.receivedAmount || 0),
      totalOutstanding: Number(totalOutstanding._sum.outstandingAmount || 0),
      totalOverdue: Number(overdueAmount._sum.outstandingAmount || 0),
      overdueClientCount: clientsWithOverdue.length,
      ledgerCount: monthlySales._count.id,
      clientCount: clientsWithOutstanding.length,
    };
  }

  // ===== 거래처별 매출 집계 =====
  async getClientSummary(query: { startDate?: string; endDate?: string }) {
    // DB 수준 GROUP BY 집계
    const conditions: Prisma.Sql[] = [Prisma.sql`sl."salesStatus" != 'CANCELLED'`];

    if (query.startDate) {
      conditions.push(Prisma.sql`sl."ledgerDate" >= ${new Date(query.startDate)}`);
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(Prisma.sql`sl."ledgerDate" <= ${end}`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    const rows = await this.prisma.$queryRaw<
      {
        clientId: string;
        clientName: string;
        clientCode: string;
        totalSales: number;
        totalReceived: number;
        outstanding: number;
        orderCount: bigint;
        lastOrderDate: Date;
      }[]
    >(
      Prisma.sql`SELECT sl."clientId",
              sl."clientName",
              c."clientCode",
              COALESCE(SUM(sl."totalAmount"), 0)::float as "totalSales",
              COALESCE(SUM(sl."receivedAmount"), 0)::float as "totalReceived",
              COALESCE(SUM(sl."outstandingAmount"), 0)::float as outstanding,
              COUNT(sl.id) as "orderCount",
              MAX(sl."ledgerDate") as "lastOrderDate"
       FROM sales_ledgers sl
       JOIN clients c ON c.id = sl."clientId"
       WHERE ${whereClause}
       GROUP BY sl."clientId", sl."clientName", c."clientCode"
       ORDER BY "totalSales" DESC`,
    );

    return rows.map(r => ({
      clientId: r.clientId,
      clientName: r.clientName,
      clientCode: r.clientCode,
      totalSales: Number(r.totalSales),
      totalReceived: Number(r.totalReceived),
      outstanding: Number(r.outstanding),
      orderCount: Number(r.orderCount),
      lastOrderDate: r.lastOrderDate?.toISOString() || '',
    }));
  }

  // ===== 연체 처리 (배치/수동) =====
  async updateOverdueStatus() {
    const now = new Date();
    const result = await this.prisma.salesLedger.updateMany({
      where: {
        paymentStatus: { in: ['unpaid', 'partial'] },
        dueDate: { lt: now },
        salesStatus: { not: 'CANCELLED' },
      },
      data: { paymentStatus: 'overdue' },
    });
    return { updatedCount: result.count };
  }

  // ===== 기존 주문 매출원장 일괄 생성 (백필) =====
  async backfillFromOrders() {
    const BATCH_SIZE = 100;
    let created = 0;
    let failed = 0;
    let totalToProcess = 0;
    let skip = 0;

    // 배치 단위로 처리하여 메모리 부담 방지
    while (true) {
      // 매출원장이 없는 주문만 NOT EXISTS로 조회 (배치 단위)
      const orders = await this.prisma.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT o.id FROM orders o
         WHERE o.status != 'cancelled'
           AND NOT EXISTS (SELECT 1 FROM sales_ledgers sl WHERE sl."orderId" = o.id)
         ORDER BY o."orderedAt" ASC
         LIMIT ${BATCH_SIZE} OFFSET ${skip}`,
      );

      if (orders.length === 0) break;
      totalToProcess += orders.length;

      // 배치 내 주문 상세 조회
      const orderIds = orders.map(o => o.id);
      const fullOrders = await this.prisma.order.findMany({
        where: { id: { in: orderIds } },
        include: {
          items: {
            select: {
              id: true,
              productId: true,
              productName: true,
              size: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
      });

      for (const order of fullOrders) {
        try {
          await this.createFromOrder({
            id: order.id,
            orderNumber: order.orderNumber,
            clientId: order.clientId,
            productPrice: Number(order.productPrice),
            shippingFee: Number(order.shippingFee),
            tax: Number(order.tax),
            totalAmount: Number(order.totalAmount),
            finalAmount: Number(order.finalAmount),
            paymentMethod: order.paymentMethod,
            items: order.items.map((item: any) => ({
              id: item.id,
              productId: item.productId,
              productName: item.productName,
              size: item.size,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
              totalPrice: Number(item.totalPrice),
            })),
          }, 'system-backfill');
          created++;
        } catch (err: any) {
          // 백필 실패 시 건너뛰고 계속 진행
          failed++;
        }
      }

      // 다음 배치 (생성 성공한 건은 NOT EXISTS에서 제외되므로 skip은 실패 건만큼만)
      skip = failed;
      if (orders.length < BATCH_SIZE) break;
    }

    return { total: totalToProcess, created, failed };
  }

  // ===== 고아 매출원장 정리 (삭제된 주문의 매출원장 제거) =====
  async cleanupOrphaned() {
    const orphaned = await this.prisma.$queryRaw<{ id: string; ledgerNumber: string }[]>(
      Prisma.sql`SELECT sl.id, sl."ledgerNumber" FROM sales_ledgers sl
       WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = sl."orderId")`,
    );

    if (orphaned.length === 0) return { deleted: 0 };

    const orphanedIds = orphaned.map(o => o.id);

    // items 먼저 삭제 후 ledger 삭제
    await this.prisma.salesLedgerItem.deleteMany({
      where: { salesLedgerId: { in: orphanedIds } },
    });
    const result = await this.prisma.salesLedger.deleteMany({
      where: { id: { in: orphanedIds } },
    });

    return {
      deleted: result.count,
      ledgerNumbers: orphaned.map(o => o.ledgerNumber),
    };
  }

  // ===== 월별 매출 추이 =====
  async getMonthlyTrend(months: number = 12) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // DB 수준 월별 집계
    const rows = await this.prisma.$queryRaw<
      { month: string; sales: number; received: number; outstanding: number; count: bigint }[]
    >(
      Prisma.sql`SELECT TO_CHAR("ledgerDate", 'YYYY-MM') as month,
              COALESCE(SUM("totalAmount"), 0)::float as sales,
              COALESCE(SUM("receivedAmount"), 0)::float as received,
              COALESCE(SUM("outstandingAmount"), 0)::float as outstanding,
              COUNT(id) as count
       FROM sales_ledgers
       WHERE "ledgerDate" >= ${startDate}
         AND "salesStatus" != 'CANCELLED'
       GROUP BY month
       ORDER BY month ASC`,
    );

    const dbData = new Map(rows.map(r => [r.month, r]));

    // 빈 월도 포함하여 반환
    const result = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = dbData.get(key);
      result.push({
        month: key,
        sales: entry ? Number(entry.sales) : 0,
        received: entry ? Number(entry.received) : 0,
        outstanding: entry ? Number(entry.outstanding) : 0,
        count: entry ? Number(entry.count) : 0,
      });
    }

    return result;
  }

  // ===== Aging 분석 (실 데이터) =====
  async getAgingAnalysis(clientId?: string) {
    const now = new Date();
    const date30 = subDays(now, 30);
    const date60 = subDays(now, 60);
    const date90 = subDays(now, 90);

    const where: Prisma.SalesLedgerWhereInput = {
      paymentStatus: { in: ['unpaid', 'partial', 'overdue'] },
      salesStatus: { not: 'CANCELLED' },
    };
    if (clientId) where.clientId = clientId;

    // Raw SQL로 날짜 범위별 집계
    const conditions: Prisma.Sql[] = [
      Prisma.sql`sl."paymentStatus" IN ('unpaid', 'partial', 'overdue')`,
      Prisma.sql`sl."salesStatus" != 'CANCELLED'`,
    ];
    if (clientId) {
      conditions.push(Prisma.sql`sl."clientId" = ${clientId}`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    const rows = await this.prisma.$queryRaw<
      { clientId: string; clientName: string; under30: number; days30to60: number; days60to90: number; over90: number }[]
    >(
      Prisma.sql`SELECT
         sl."clientId",
         sl."clientName",
         SUM(CASE WHEN sl."ledgerDate" >= ${date30} THEN sl."outstandingAmount" ELSE 0 END)::float as under30,
         SUM(CASE WHEN sl."ledgerDate" >= ${date60} AND sl."ledgerDate" < ${date30} THEN sl."outstandingAmount" ELSE 0 END)::float as days30to60,
         SUM(CASE WHEN sl."ledgerDate" >= ${date90} AND sl."ledgerDate" < ${date60} THEN sl."outstandingAmount" ELSE 0 END)::float as days60to90,
         SUM(CASE WHEN sl."ledgerDate" < ${date90} THEN sl."outstandingAmount" ELSE 0 END)::float as over90
       FROM sales_ledgers sl
       WHERE ${whereClause}
       GROUP BY sl."clientId", sl."clientName"`,
    );

    return {
      under30: rows.reduce((sum, r) => sum + Number(r.under30 || 0), 0),
      under30ClientCount: rows.filter(r => Number(r.under30 || 0) > 0).length,
      days30to60: rows.reduce((sum, r) => sum + Number(r.days30to60 || 0), 0),
      days30to60ClientCount: rows.filter(r => Number(r.days30to60 || 0) > 0).length,
      days60to90: rows.reduce((sum, r) => sum + Number(r.days60to90 || 0), 0),
      days60to90ClientCount: rows.filter(r => Number(r.days60to90 || 0) > 0).length,
      over90: rows.reduce((sum, r) => sum + Number(r.over90 || 0), 0),
      over90ClientCount: rows.filter(r => Number(r.over90 || 0) > 0).length,
      breakdown: rows.map(r => ({
        clientId: r.clientId,
        clientName: r.clientName,
        under30: Number(r.under30 || 0),
        days30to60: Number(r.days30to60 || 0),
        days60to90: Number(r.days60to90 || 0),
        over90: Number(r.over90 || 0),
      })),
    };
  }

  // ===== 거래처별 상세 분석 =====
  async getClientDetail(clientId: string) {
    // 1. 거래처 정보
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { healthScore: true },
    });

    if (!client) {
      throw new NotFoundException('거래처를 찾을 수 없습니다.');
    }

    // 2. 매출원장 목록
    const ledgers = await this.prisma.salesLedger.findMany({
      where: { clientId, salesStatus: { not: 'CANCELLED' } },
      include: { receipts: true },
      orderBy: { ledgerDate: 'desc' },
    });

    // 3. 평균 결제 소요일 계산
    const paidLedgers = ledgers.filter(l => l.paymentStatus === 'paid' && l.dueDate);
    const paymentDelays = paidLedgers.map(l => {
      const lastReceipt = l.receipts.sort((a, b) => b.receiptDate.getTime() - a.receiptDate.getTime())[0];
      if (!lastReceipt || !l.dueDate) return 0;
      return differenceInDays(lastReceipt.receiptDate, l.dueDate);
    });
    const avgPaymentDays = paymentDelays.length > 0
      ? Math.round(paymentDelays.reduce((sum, d) => sum + d, 0) / paymentDelays.length)
      : 0;

    // 4. 정시 결제 비율
    const onTimeCount = paymentDelays.filter(d => d <= 0).length;
    const onTimePaymentRate = paidLedgers.length > 0
      ? Math.round((onTimeCount / paidLedgers.length) * 100)
      : 0;

    // 5. 월별 추이 (최근 12개월)
    const monthlyTrend = await this.getClientMonthlyTrend(clientId, 12);

    // 6. 수금 이력
    const receipts = await this.prisma.salesReceipt.findMany({
      where: { salesLedger: { clientId } },
      orderBy: { receiptDate: 'desc' },
      take: 50,
    });

    return {
      client,
      summary: {
        totalSales: ledgers.reduce((sum, l) => sum + Number(l.totalAmount), 0),
        totalReceived: ledgers.reduce((sum, l) => sum + Number(l.receivedAmount), 0),
        outstanding: ledgers.reduce((sum, l) => sum + Number(l.outstandingAmount), 0),
        avgPaymentDays,
        onTimePaymentRate,
        overdueCount: ledgers.filter(l => l.paymentStatus === 'overdue').length,
        lastPaymentDate: receipts[0]?.receiptDate.toISOString() || null,
      },
      monthlyTrend,
      transactions: ledgers.slice(0, 100), // 최근 100건
      paymentHistory: receipts,
    };
  }

  // ===== 거래처별 월별 추이 (내부 헬퍼) =====
  private async getClientMonthlyTrend(clientId: string, months: number = 12) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const rows = await this.prisma.$queryRaw<
      { month: string; sales: number; received: number; outstanding: number; count: bigint }[]
    >(
      Prisma.sql`SELECT TO_CHAR("ledgerDate", 'YYYY-MM') as month,
              COALESCE(SUM("totalAmount"), 0)::float as sales,
              COALESCE(SUM("receivedAmount"), 0)::float as received,
              COALESCE(SUM("outstandingAmount"), 0)::float as outstanding,
              COUNT(id) as count
       FROM sales_ledgers
       WHERE "ledgerDate" >= ${startDate}
         AND "salesStatus" != 'CANCELLED'
         AND "clientId" = ${clientId}
       GROUP BY month
       ORDER BY month ASC`,
    );

    const dbData = new Map(rows.map(r => [r.month, r]));

    // 빈 월도 포함하여 반환
    const result = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = dbData.get(key);
      result.push({
        month: key,
        sales: entry ? Number(entry.sales) : 0,
        received: entry ? Number(entry.received) : 0,
        outstanding: entry ? Number(entry.outstanding) : 0,
        count: entry ? Number(entry.count) : 0,
      });
    }

    return result;
  }

  // ===== 수금예정일별 집계 =====
  async getDueDateSummary(query: { startDate?: string; endDate?: string }) {
    const now = new Date();
    const today = startOfDay(now);
    const weekEnd = endOfWeek(now);
    const monthEnd = endOfMonth(now);

    const where: Prisma.SalesLedgerWhereInput = {
      paymentStatus: { in: ['unpaid', 'partial', 'overdue'] },
      salesStatus: { not: 'CANCELLED' },
    };

    // 기간 필터
    if (query.startDate || query.endDate) {
      where.dueDate = {};
      if (query.startDate) where.dueDate.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.dueDate.lte = end;
      }
    }

    const ledgers = await this.prisma.salesLedger.findMany({
      where,
      include: { client: { select: { id: true, clientCode: true, clientName: true } } },
      orderBy: { dueDate: 'asc' },
    });

    // 일자별 집계
    const byDateMap = new Map<
      string,
      { dueDate: string; count: number; amount: number; clients: Array<{ clientId: string; clientName: string; amount: number }> }
    >();

    ledgers.forEach(ledger => {
      if (!ledger.dueDate) return;
      const dateKey = ledger.dueDate.toISOString().slice(0, 10);
      if (!byDateMap.has(dateKey)) {
        byDateMap.set(dateKey, { dueDate: dateKey, count: 0, amount: 0, clients: [] });
      }
      const entry = byDateMap.get(dateKey)!;
      entry.count++;
      entry.amount += Number(ledger.outstandingAmount);
      entry.clients.push({
        clientId: ledger.clientId,
        clientName: ledger.clientName,
        amount: Number(ledger.outstandingAmount),
      });
    });

    return {
      today: ledgers
        .filter(l => l.dueDate && startOfDay(l.dueDate).getTime() === today.getTime())
        .reduce((sum, l) => sum + Number(l.outstandingAmount), 0),
      thisWeek: ledgers
        .filter(l => l.dueDate && l.dueDate <= weekEnd && l.dueDate >= today)
        .reduce((sum, l) => sum + Number(l.outstandingAmount), 0),
      thisMonth: ledgers
        .filter(l => l.dueDate && l.dueDate <= monthEnd && l.dueDate >= today)
        .reduce((sum, l) => sum + Number(l.outstandingAmount), 0),
      overdue: ledgers
        .filter(l => l.dueDate && l.dueDate < today)
        .reduce((sum, l) => sum + Number(l.outstandingAmount), 0),
      byDate: Array.from(byDateMap.values()).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    };
  }

  // ===== 신용도 자동 평가 =====
  async calculateCreditScore(clientId: string) {
    // 1. 거래처 기본 정보
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new Error('거래처를 찾을 수 없습니다.');
    }

    // 2. 전체 거래내역 및 수금내역 조회
    const ledgers = await this.prisma.salesLedger.findMany({
      where: { clientId, salesStatus: 'CONFIRMED' },
      include: { receipts: true },
    });

    if (ledgers.length === 0) {
      // 거래내역 없음 - 기본 B등급
      await this.prisma.client.update({
        where: { id: clientId },
        data: { creditGrade: 'B' },
      });
      return {
        clientId,
        clientName: client.clientName,
        score: 70,
        grade: 'B',
        creditLimit: 0,
        riskLevel: 'medium',
        metrics: {
          paymentComplianceRate: 0,
          receivablesTurnoverScore: 0,
          overdueHistoryScore: 0,
        },
        overdueCount: 0,
        monthlyAvgSales: 0,
        recommendation: '거래내역이 없어 기본 B등급으로 설정되었습니다.',
      };
    }

    // 3. 지표 계산
    const now = new Date();
    let onTimeCount = 0;
    let overdueCount = 0;
    let totalSales = 0;
    let totalOutstanding = 0;

    ledgers.forEach(ledger => {
      totalSales += Number(ledger.totalAmount);
      totalOutstanding += Number(ledger.outstandingAmount);

      // 정시 결제 판정: 수금일이 수금예정일 이하인 경우
      if (ledger.paymentStatus === 'paid' && ledger.receipts && ledger.receipts.length > 0) {
        const firstReceipt = ledger.receipts.sort((a: any, b: any) => a.receiptDate.getTime() - b.receiptDate.getTime())[0];
        if (ledger.dueDate) {
          const daysDiff = differenceInDays(firstReceipt.receiptDate, ledger.dueDate);
          if (daysDiff <= 0) {
            onTimeCount++;
          }
        } else {
          onTimeCount++; // dueDate 없으면 정시 결제로 간주
        }
      }

      // 연체 건수: paymentStatus가 overdue인 경우
      if (ledger.paymentStatus === 'overdue') {
        overdueCount++;
      }
    });

    const totalCount = ledgers.length;
    const avgSales = totalSales / totalCount;
    const avgOutstanding = totalOutstanding / totalCount;

    // 3.1 결제 이행률 (40% 가중치): (정시 결제 건수 / 총 건수) × 100
    const paymentComplianceRate = (onTimeCount / totalCount) * 100;
    const paymentComplianceScore = paymentComplianceRate * 0.4;

    // 3.2 미수금 회전율 (30% 가중치): 100 - (평균 미수금 / 평균 매출 × 100)
    const receivableRatio = avgSales > 0 ? (avgOutstanding / avgSales) * 100 : 0;
    const receivablesTurnoverScore = Math.max(0, 100 - receivableRatio) * 0.3;

    // 3.3 연체 이력 (30% 가중치): 100 - (연체 건수 / 총 건수 × 200)
    const overdueRatio = (overdueCount / totalCount) * 200;
    const overdueHistoryScore = Math.max(0, 100 - overdueRatio) * 0.3;

    // 4. 총점 계산 (0-100점)
    const totalScore = Math.min(100, Math.round(paymentComplianceScore + receivablesTurnoverScore + overdueHistoryScore));

    // 5. 등급 산정
    let grade = 'D';
    if (totalScore >= 80) grade = 'A';
    else if (totalScore >= 60) grade = 'B';
    else if (totalScore >= 40) grade = 'C';

    // 6. 월평균 매출 계산 (최근 6개월)
    const sixMonthsAgo = subDays(now, 180);
    const recentLedgers = ledgers.filter(l => l.ledgerDate >= sixMonthsAgo);
    const monthlyAvgSales = recentLedgers.length > 0 ? recentLedgers.reduce((sum, l) => sum + Number(l.totalAmount), 0) / 6 : 0;

    // 7. 신용한도 계산
    let creditLimit = 0;
    if (grade === 'A') creditLimit = monthlyAvgSales * 3;
    else if (grade === 'B') creditLimit = monthlyAvgSales * 2;
    else if (grade === 'C') creditLimit = monthlyAvgSales * 1;
    else if (grade === 'D') creditLimit = monthlyAvgSales * 0.5;

    // 8. 리스크 판정
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let riskReason: string | null = null;
    if (grade === 'D' || overdueCount >= 3) {
      riskLevel = 'high';
      riskReason = `신용등급 ${grade}, 연체 ${overdueCount}건`;
    } else if (grade === 'C') {
      riskLevel = 'medium';
    }

    // 9. 권장사항
    const recommendation = this.getRecommendation(grade, riskLevel, overdueCount);

    // 10. Client 업데이트
    await this.prisma.client.update({
      where: { id: clientId },
      data: { creditGrade: grade },
    });

    // 11. CustomerHealthScore 업데이트 (upsert)
    await this.prisma.customerHealthScore.upsert({
      where: { clientId },
      create: {
        clientId,
        totalScore,
        grade,
        isAtRisk: riskLevel === 'high',
        riskReason,
        lastCalculatedAt: now,
      },
      update: {
        totalScore,
        grade,
        isAtRisk: riskLevel === 'high',
        riskReason,
        lastCalculatedAt: now,
      },
    });

    return {
      clientId,
      clientName: client.clientName,
      score: totalScore,
      grade,
      creditLimit: Math.round(creditLimit),
      riskLevel,
      metrics: {
        paymentComplianceRate: Math.round(paymentComplianceRate * 10) / 10,
        receivablesTurnoverScore: Math.round(receivablesTurnoverScore * 10) / 10,
        overdueHistoryScore: Math.round(overdueHistoryScore * 10) / 10,
      },
      overdueCount,
      monthlyAvgSales: Math.round(monthlyAvgSales),
      recommendation,
    };
  }

  private getRecommendation(grade: string, riskLevel: string, overdueCount: number): string {
    if (grade === 'A') {
      return '우수 거래처입니다. 신용거래 한도를 확대하여 거래를 활성화하세요.';
    } else if (grade === 'B') {
      return '양호한 거래처입니다. 현재 신용한도를 유지하며 정기적으로 모니터링하세요.';
    } else if (grade === 'C') {
      return '주의가 필요한 거래처입니다. 신용한도를 축소하고 선입금 유도를 권장합니다.';
    } else {
      if (overdueCount >= 3) {
        return '고위험 거래처입니다. 신용거래를 제한하고 기존 미수금 회수에 집중하세요.';
      }
      return '신용거래를 신중히 검토하세요. 선입금 또는 소액 거래로 제한하는 것을 권장합니다.';
    }
  }

  // ===== 수금 패턴 분석 =====
  async getPaymentPattern(query: { clientId?: string; months?: number }) {
    const months = query.months || 12;
    const startDate = subDays(new Date(), months * 30);

    const where: any = {
      salesStatus: 'CONFIRMED',
      ledgerDate: { gte: startDate },
      receipts: { some: {} }, // 수금이 있는 건만
    };

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    const ledgers = await this.prisma.salesLedger.findMany({
      where,
      include: { receipts: true },
      orderBy: { ledgerDate: 'asc' },
    });

    if (ledgers.length === 0) {
      return {
        avgPaymentDays: 0,
        medianPaymentDays: 0,
        onTimePaymentRate: 0,
        delayedPaymentRate: 0,
        seasonality: [],
        weekdayPattern: [],
      };
    }

    // 결제 소요일 계산
    const paymentDaysArray: number[] = [];
    ledgers.forEach(ledger => {
      if (ledger.dueDate && ledger.receipts.length > 0) {
        const firstReceipt = ledger.receipts.sort((a, b) => a.receiptDate.getTime() - b.receiptDate.getTime())[0];
        const daysDiff = differenceInDays(firstReceipt.receiptDate, ledger.dueDate);
        paymentDaysArray.push(daysDiff);
      }
    });

    // 평균 결제 소요일
    const avgPaymentDays = paymentDaysArray.length > 0 ? paymentDaysArray.reduce((a, b) => a + b, 0) / paymentDaysArray.length : 0;

    // 중위값 결제 소요일
    const sorted = [...paymentDaysArray].sort((a, b) => a - b);
    const medianPaymentDays = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;

    // 정시 결제율 (≤ 0일)
    const onTimeCount = paymentDaysArray.filter(d => d <= 0).length;
    const onTimePaymentRate = paymentDaysArray.length > 0 ? (onTimeCount / paymentDaysArray.length) * 100 : 0;

    // 지연 빈도 (> 0일)
    const delayedPaymentRate = 100 - onTimePaymentRate;

    // 계절성 분석 (월별 평균 결제일)
    const monthlyMap = new Map<number, { total: number; count: number }>();
    ledgers.forEach(ledger => {
      if (ledger.dueDate && ledger.receipts.length > 0) {
        const month = ledger.ledgerDate.getMonth() + 1; // 1-12
        const firstReceipt = ledger.receipts.sort((a, b) => a.receiptDate.getTime() - b.receiptDate.getTime())[0];
        const daysDiff = differenceInDays(firstReceipt.receiptDate, ledger.dueDate);
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { total: 0, count: 0 });
        }
        const entry = monthlyMap.get(month)!;
        entry.total += daysDiff;
        entry.count++;
      }
    });

    const seasonality = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      avgPaymentDays: Math.round((data.total / data.count) * 10) / 10,
    }));

    // 요일별 패턴 (요일별 수금 건수, 평균 금액)
    const weekdayMap = new Map<number, { count: number; totalAmount: number }>();
    ledgers.forEach(ledger => {
      ledger.receipts.forEach(receipt => {
        const weekday = receipt.receiptDate.getDay(); // 0=일요일, 1=월요일, ...
        if (!weekdayMap.has(weekday)) {
          weekdayMap.set(weekday, { count: 0, totalAmount: 0 });
        }
        const entry = weekdayMap.get(weekday)!;
        entry.count++;
        entry.totalAmount += Number(receipt.amount);
      });
    });

    const weekdayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const weekdayPattern = Array.from(weekdayMap.entries()).map(([weekday, data]) => ({
      weekday: weekdayNames[weekday],
      count: data.count,
      avgAmount: Math.round(data.totalAmount / data.count),
    }));

    return {
      avgPaymentDays: Math.round(avgPaymentDays * 10) / 10,
      medianPaymentDays,
      onTimePaymentRate: Math.round(onTimePaymentRate * 10) / 10,
      delayedPaymentRate: Math.round(delayedPaymentRate * 10) / 10,
      seasonality: seasonality.sort((a, b) => a.month - b.month),
      weekdayPattern: weekdayPattern.sort((a, b) => {
        const order = ['월', '화', '수', '목', '금', '토', '일'];
        return order.indexOf(a.weekday) - order.indexOf(b.weekday);
      }),
    };
  }

  // ===== 연체 알림 배치 작업 =====
  async sendOverdueNotifications() {
    // 연체 상태인 매출원장 조회
    const overdueLedgers = await this.prisma.salesLedger.findMany({
      where: {
        paymentStatus: 'overdue',
        outstandingAmount: { gt: 0 },
      },
      include: {
        client: {
          select: {
            id: true,
            clientName: true,
            email: true,
            phone: true,
            assignedManager: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // 거래처별로 그룹화
    const clientMap = new Map<string, any[]>();
    overdueLedgers.forEach(ledger => {
      const clientId = ledger.clientId;
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, []);
      }
      clientMap.get(clientId)!.push(ledger);
    });

    const notifications = [];
    for (const [clientId, ledgers] of clientMap.entries()) {
      const totalOverdue = ledgers.reduce((sum, l) => sum + Number(l.outstandingAmount), 0);
      const client = ledgers[0].client;

      notifications.push({
        clientId,
        clientName: client.clientName,
        email: client.email,
        phone: client.phone,
        assignedManager: client.assignedManager,
        overdueCount: ledgers.length,
        totalOverdue,
        oldestDueDate: ledgers[0].dueDate,
      });
    }

    // TODO: 실제 알림 발송 로직 (이메일, SMS, 시스템 알림 등)
    // 현재는 로그만 반환
    return {
      totalClients: notifications.length,
      totalOverdueLedgers: overdueLedgers.length,
      totalOverdueAmount: overdueLedgers.reduce((sum, l) => sum + Number(l.outstandingAmount), 0),
      notifications,
      message: `${notifications.length}개 거래처에 대한 연체 알림이 생성되었습니다.`,
    };
  }

  // ===== 영업담당자별 미수금 요약 =====
  async getSummaryByStaff(query: { startDate?: string; endDate?: string }) {
    const conditions: Prisma.Sql[] = [Prisma.sql`sl."salesStatus" != 'CANCELLED'`];

    if (query.startDate) {
      conditions.push(Prisma.sql`sl."ledgerDate" >= ${new Date(query.startDate)}`);
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(Prisma.sql`sl."ledgerDate" <= ${end}`);
    }

    const joinCondition = Prisma.join(conditions, ' AND ');

    // 영업담당자별 집계 (StaffClient 중간 테이블 활용)
    const rows = await this.prisma.$queryRaw<
      {
        staffId: string;
        staffName: string;
        staffCode: string;
        totalSales: number;
        totalReceived: number;
        outstanding: number;
        clientCount: bigint;
        ledgerCount: bigint;
        collectionRate: number;
      }[]
    >(
      Prisma.sql`SELECT s."id" as "staffId",
              s."name" as "staffName",
              s."staffId" as "staffCode",
              COALESCE(SUM(sl."totalAmount"), 0)::float as "totalSales",
              COALESCE(SUM(sl."receivedAmount"), 0)::float as "totalReceived",
              COALESCE(SUM(sl."outstandingAmount"), 0)::float as outstanding,
              COUNT(DISTINCT sl."clientId") as "clientCount",
              COUNT(sl.id) as "ledgerCount",
              CASE
                WHEN SUM(sl."totalAmount") > 0
                THEN (SUM(sl."receivedAmount") / SUM(sl."totalAmount") * 100)::float
                ELSE 0
              END as "collectionRate"
       FROM staff s
       LEFT JOIN sales_ledgers sl ON sl."staffId" = s.id AND ${joinCondition}
       WHERE s."isActive" = true
       GROUP BY s.id, s.name, s."staffId"
       ORDER BY "totalSales" DESC`,
    );

    return rows.map(r => ({
      staffId: r.staffId,
      staffName: r.staffName,
      staffCode: r.staffCode,
      totalSales: Number(r.totalSales),
      totalReceived: Number(r.totalReceived),
      outstanding: Number(r.outstanding),
      clientCount: Number(r.clientCount),
      ledgerCount: Number(r.ledgerCount),
      collectionRate: Math.round(Number(r.collectionRate) * 10) / 10,
    }));
  }

  // ===== 영업담당자별 수금 실적 =====
  async getCollectionByStaff(query: { startDate?: string; endDate?: string }) {
    const conditions: Prisma.Sql[] = [Prisma.sql`s."isActive" = true`];

    if (query.startDate) {
      conditions.push(Prisma.sql`sr."receiptDate" >= ${new Date(query.startDate)}`);
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(Prisma.sql`sr."receiptDate" <= ${end}`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    // 영업담당자별 수금 실적 (수금방법별 집계 포함)
    const rows = await this.prisma.$queryRaw<
      {
        staffId: string;
        staffName: string;
        staffCode: string;
        totalReceived: number;
        receiptCount: bigint;
        cashAmount: number;
        bankTransferAmount: number;
        cardAmount: number;
        checkAmount: number;
      }[]
    >(
      Prisma.sql`SELECT s."id" as "staffId",
              s."name" as "staffName",
              s."staffId" as "staffCode",
              COALESCE(SUM(sr.amount), 0)::float as "totalReceived",
              COUNT(sr.id) as "receiptCount",
              COALESCE(SUM(CASE WHEN sr."paymentMethod" = 'cash' THEN sr.amount ELSE 0 END), 0)::float as "cashAmount",
              COALESCE(SUM(CASE WHEN sr."paymentMethod" = 'bank_transfer' THEN sr.amount ELSE 0 END), 0)::float as "bankTransferAmount",
              COALESCE(SUM(CASE WHEN sr."paymentMethod" = 'card' THEN sr.amount ELSE 0 END), 0)::float as "cardAmount",
              COALESCE(SUM(CASE WHEN sr."paymentMethod" = 'check' THEN sr.amount ELSE 0 END), 0)::float as "checkAmount"
       FROM staff s
       LEFT JOIN sales_ledgers sl ON sl."staffId" = s.id
       LEFT JOIN sales_receipts sr ON sr."salesLedgerId" = sl.id
       WHERE ${whereClause}
       GROUP BY s.id, s.name, s."staffId"
       ORDER BY "totalReceived" DESC`,
    );

    return rows.map(r => ({
      staffId: r.staffId,
      staffName: r.staffName,
      staffCode: r.staffCode,
      totalReceived: Number(r.totalReceived),
      receiptCount: Number(r.receiptCount),
      byMethod: {
        cash: Number(r.cashAmount),
        bankTransfer: Number(r.bankTransferAmount),
        card: Number(r.cardAmount),
        check: Number(r.checkAmount),
      },
    }));
  }

  // ===== 영업담당자별 상세 매출원장 목록 =====
  async getLedgersByStaff(staffId: string, query: {
    startDate?: string;
    endDate?: string;
    paymentStatus?: string;
    page?: number;
    limit?: number;
  }) {
    const { startDate, endDate, paymentStatus, page = 1, limit = 20 } = query;

    const where: Prisma.SalesLedgerWhereInput = {
      staffId,
      salesStatus: { not: 'CANCELLED' },
    };

    // 기간 필터
    if (startDate || endDate) {
      where.ledgerDate = {};
      if (startDate) where.ledgerDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.ledgerDate.lte = end;
      }
    }

    if (paymentStatus) where.paymentStatus = paymentStatus;

    const [data, total] = await Promise.all([
      this.prisma.salesLedger.findMany({
        where,
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          receipts: { orderBy: { receiptDate: 'desc' } },
          client: {
            select: { id: true, clientCode: true, clientName: true },
          },
        },
        orderBy: { ledgerDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.salesLedger.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ===== 영업담당자별 거래처 미수금 집계 =====
  async getClientsByStaff(staffId: string, query: { startDate?: string; endDate?: string }) {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`sl."staffId" = ${staffId}`,
      Prisma.sql`sl."salesStatus" != 'CANCELLED'`,
    ];

    if (query.startDate) {
      conditions.push(Prisma.sql`sl."ledgerDate" >= ${new Date(query.startDate)}`);
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(Prisma.sql`sl."ledgerDate" <= ${end}`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    // 담당자의 거래처별 미수금 집계
    const rows = await this.prisma.$queryRaw<
      {
        clientId: string;
        clientName: string;
        clientCode: string;
        totalSales: number;
        totalReceived: number;
        outstanding: number;
        ledgerCount: bigint;
        lastLedgerDate: Date;
      }[]
    >(
      Prisma.sql`SELECT sl."clientId",
              sl."clientName",
              c."clientCode",
              COALESCE(SUM(sl."totalAmount"), 0)::float as "totalSales",
              COALESCE(SUM(sl."receivedAmount"), 0)::float as "totalReceived",
              COALESCE(SUM(sl."outstandingAmount"), 0)::float as outstanding,
              COUNT(sl.id) as "ledgerCount",
              MAX(sl."ledgerDate") as "lastLedgerDate"
       FROM sales_ledgers sl
       JOIN clients c ON c.id = sl."clientId"
       WHERE ${whereClause}
       GROUP BY sl."clientId", sl."clientName", c."clientCode"
       ORDER BY outstanding DESC`,
    );

    return rows.map(r => ({
      clientId: r.clientId,
      clientName: r.clientName,
      clientCode: r.clientCode,
      totalSales: Number(r.totalSales),
      totalReceived: Number(r.totalReceived),
      outstanding: Number(r.outstanding),
      ledgerCount: Number(r.ledgerCount),
      lastLedgerDate: r.lastLedgerDate?.toISOString() || '',
    }));
  }

  // ===== 기존 매출원장 staffId 일괄 업데이트 =====
  async updateStaffIdFromClients() {
    // staffId가 null인 매출원장을 거래처의 assignedManager로 업데이트
    const result = await this.prisma.$executeRaw`
      UPDATE sales_ledgers sl
      SET "staffId" = c."assignedManager"
      FROM clients c
      WHERE sl."clientId" = c.id
        AND sl."staffId" IS NULL
        AND c."assignedManager" IS NOT NULL
    `;

    return {
      updatedCount: result,
      message: `${result}건의 매출원장에 담당자가 설정되었습니다.`,
    };
  }

  // ===== 입금내역 조회 (금일/당월/기간별) =====
  async getReceipts(query: {
    startDate?: string;
    endDate?: string;
    clientId?: string;
    paymentMethod?: string;
    page?: number;
    limit?: number;
  }) {
    const { startDate, endDate, clientId, paymentMethod, page = 1, limit = 50 } = query;

    const where: Prisma.SalesReceiptWhereInput = {};

    // 날짜 범위 필터
    if (startDate || endDate) {
      where.receiptDate = {};
      if (startDate) {
        where.receiptDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.receiptDate.lte = end;
      }
    }

    // 거래처 필터
    if (clientId) {
      where.salesLedger = { clientId };
    }

    // 결제방법 필터
    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    // 데이터 조회 및 총 개수 조회 병렬 실행
    const [data, total] = await Promise.all([
      this.prisma.salesReceipt.findMany({
        where,
        include: {
          salesLedger: {
            select: {
              clientId: true,
              clientName: true,
              ledgerNumber: true,
              orderNumber: true,
            },
          },
        },
        orderBy: { receiptDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.salesReceipt.count({ where }),
    ]);

    // 총 입금액 및 건수 집계
    const summary = await this.prisma.salesReceipt.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalAmount: Number(summary._sum.amount || 0),
        totalCount: summary._count.id,
      },
    };
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  SalesLedgerQueryDto,
  CreateSalesReceiptDto,
} from '../dto/sales-ledger.dto';
import { JournalEngineService } from './journal-engine.service';

@Injectable()
export class SalesLedgerService {
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

    const salesLedger = await this.prisma.salesLedger.create({
      data: {
        ledgerNumber,
        ledgerDate: new Date(),
        clientId: client.id,
        clientName: client.clientName,
        clientBizNo: client.businessNumber,
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
        description: `${order.orderNumber} 매출`,
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
        description: `${order.orderNumber} 매출`,
      });
    } catch (err) {
      // Journal creation failure should not block sales ledger creation
      console.error('자동분개 생성 실패:', err);
    }

    return salesLedger;
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

    const [data, total] = await Promise.all([
      this.prisma.salesLedger.findMany({
        where,
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          receipts: { orderBy: { receiptDate: 'desc' } },
          client: {
            select: { id: true, clientCode: true, clientName: true, businessNumber: true },
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
      console.error('수금분개 생성 실패:', err);
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

  // ===== 매출 취소 =====
  async cancelSales(salesLedgerId: string) {
    const ledger = await this.findById(salesLedgerId);

    if (Number(ledger.receivedAmount) > 0) {
      throw new BadRequestException('수금 이력이 있는 매출은 취소할 수 없습니다. 먼저 수금을 환불 처리하세요.');
    }

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

    return {
      totalSales: Number(monthlySales._sum.totalAmount || 0),
      totalReceived: Number(monthlySales._sum.receivedAmount || 0),
      totalOutstanding: Number(totalOutstanding._sum.outstandingAmount || 0),
      totalOverdue: Number(overdueAmount._sum.outstandingAmount || 0),
      ledgerCount: monthlySales._count.id,
      clientCount: clientsWithOutstanding.length,
    };
  }

  // ===== 거래처별 매출 집계 =====
  async getClientSummary(query: { startDate?: string; endDate?: string }) {
    // DB 수준 GROUP BY 집계
    const conditions: string[] = [`sl."salesStatus" != 'CANCELLED'`];
    const params: any[] = [];
    let paramIdx = 1;

    if (query.startDate) {
      conditions.push(`sl."ledgerDate" >= $${paramIdx}`);
      params.push(new Date(query.startDate));
      paramIdx++;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(`sl."ledgerDate" <= $${paramIdx}`);
      params.push(end);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const rows = await this.prisma.$queryRawUnsafe<
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
      `SELECT sl."clientId",
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
      ...params,
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
      const orders = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT o.id FROM orders o
         WHERE o.status != 'cancelled'
           AND NOT EXISTS (SELECT 1 FROM sales_ledgers sl WHERE sl."orderId" = o.id)
         ORDER BY o."orderedAt" ASC
         LIMIT $1 OFFSET $2`,
        BATCH_SIZE,
        skip,
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
          console.error(`백필 실패 (${order.orderNumber}):`, err.message);
          failed++;
        }
      }

      // 다음 배치 (생성 성공한 건은 NOT EXISTS에서 제외되므로 skip은 실패 건만큼만)
      skip = failed;
      if (orders.length < BATCH_SIZE) break;
    }

    return { total: totalToProcess, created, failed };
  }

  // ===== 월별 매출 추이 =====
  async getMonthlyTrend(months: number = 12) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // DB 수준 월별 집계
    const rows = await this.prisma.$queryRawUnsafe<
      { month: string; sales: number; received: number; outstanding: number; count: bigint }[]
    >(
      `SELECT TO_CHAR("ledgerDate", 'YYYY-MM') as month,
              COALESCE(SUM("totalAmount"), 0)::float as sales,
              COALESCE(SUM("receivedAmount"), 0)::float as received,
              COALESCE(SUM("outstandingAmount"), 0)::float as outstanding,
              COUNT(id) as count
       FROM sales_ledgers
       WHERE "ledgerDate" >= $1
         AND "salesStatus" != 'CANCELLED'
       GROUP BY month
       ORDER BY month ASC`,
      startDate,
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
}

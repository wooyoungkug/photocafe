import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  ClientLedgerListQueryDto,
  ClientLedgerDetailQueryDto,
  ClientTypeEnum,
  PeriodTypeEnum,
} from '../dto/client-ledger.dto';

@Injectable()
export class ClientLedgerService {
  constructor(private prisma: PrismaService) {}

  // ===== 거래처 목록 (매출/매입 집계) =====
  async findAll(query: ClientLedgerListQueryDto) {
    const {
      clientType = ClientTypeEnum.ALL,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
    } = query;

    // 기간 조건 생성
    const dateConditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (startDate) {
      dateConditions.push(`$${paramIdx}`);
      params.push(new Date(startDate));
      paramIdx++;
    } else {
      dateConditions.push(`NULL`);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateConditions.push(`$${paramIdx}`);
      params.push(end);
      paramIdx++;
    } else {
      dateConditions.push(`NULL`);
    }

    // 검색 조건
    let searchCondition = '';
    if (search) {
      searchCondition = `AND (c."clientName" ILIKE $${paramIdx} OR c."clientCode" ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const startDateParam = dateConditions[0];
    const endDateParam = dateConditions[1];

    // 매출 서브쿼리
    const salesSubquery = `
      SELECT sl."clientId",
             COALESCE(SUM(sl."totalAmount"), 0)::float as "totalSales",
             COALESCE(SUM(sl."receivedAmount"), 0)::float as "totalReceived",
             COALESCE(SUM(sl."outstandingAmount"), 0)::float as "salesOutstanding",
             COUNT(sl.id)::int as "salesCount",
             MAX(sl."ledgerDate") as "lastSalesDate"
      FROM sales_ledgers sl
      WHERE sl."salesStatus" != 'CANCELLED'
        ${startDateParam !== 'NULL' ? `AND sl."ledgerDate" >= ${startDateParam}` : ''}
        ${endDateParam !== 'NULL' ? `AND sl."ledgerDate" <= ${endDateParam}` : ''}
      GROUP BY sl."clientId"
    `;

    // 매입 서브쿼리
    const purchaseSubquery = `
      SELECT pl."supplierId" as "clientId",
             COALESCE(SUM(pl."totalAmount"), 0)::float as "totalPurchases",
             COALESCE(SUM(pl."paidAmount"), 0)::float as "totalPaid",
             COALESCE(SUM(pl."outstandingAmount"), 0)::float as "purchaseOutstanding",
             COUNT(pl.id)::int as "purchaseCount",
             MAX(pl."ledgerDate") as "lastPurchaseDate"
      FROM purchase_ledgers pl
      WHERE pl."purchaseStatus" != 'CANCELLED'
        ${startDateParam !== 'NULL' ? `AND pl."ledgerDate" >= ${startDateParam}` : ''}
        ${endDateParam !== 'NULL' ? `AND pl."ledgerDate" <= ${endDateParam}` : ''}
      GROUP BY pl."supplierId"
    `;

    // 거래처 유형 조건
    let joinCondition = '';
    if (clientType === ClientTypeEnum.SALES) {
      joinCondition = 'AND s."clientId" IS NOT NULL';
    } else if (clientType === ClientTypeEnum.PURCHASE) {
      joinCondition = 'AND p."clientId" IS NOT NULL';
    } else {
      joinCondition = 'AND (s."clientId" IS NOT NULL OR p."clientId" IS NOT NULL)';
    }

    const countQuery = `
      SELECT COUNT(DISTINCT c.id)::int as total
      FROM clients c
      LEFT JOIN (${salesSubquery}) s ON s."clientId" = c.id
      LEFT JOIN (${purchaseSubquery}) p ON p."clientId" = c.id
      WHERE c.status = 'active'
        ${joinCondition}
        ${searchCondition}
    `;

    const dataQuery = `
      SELECT c.id as "clientId",
             c."clientCode",
             c."clientName",
             c."businessNumber",
             c.phone,
             COALESCE(s."totalSales", 0) as "totalSales",
             COALESCE(s."totalReceived", 0) as "totalReceived",
             COALESCE(s."salesOutstanding", 0) as "salesOutstanding",
             COALESCE(s."salesCount", 0) as "salesCount",
             s."lastSalesDate",
             COALESCE(p."totalPurchases", 0) as "totalPurchases",
             COALESCE(p."totalPaid", 0) as "totalPaid",
             COALESCE(p."purchaseOutstanding", 0) as "purchaseOutstanding",
             COALESCE(p."purchaseCount", 0) as "purchaseCount",
             p."lastPurchaseDate"
      FROM clients c
      LEFT JOIN (${salesSubquery}) s ON s."clientId" = c.id
      LEFT JOIN (${purchaseSubquery}) p ON p."clientId" = c.id
      WHERE c.status = 'active'
        ${joinCondition}
        ${searchCondition}
      ORDER BY (COALESCE(s."totalSales", 0) + COALESCE(p."totalPurchases", 0)) DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    params.push(limit, (page - 1) * limit);

    const [countResult, data] = await Promise.all([
      this.prisma.$queryRawUnsafe<[{ total: number }]>(countQuery, ...params.slice(0, -2)),
      this.prisma.$queryRawUnsafe<any[]>(dataQuery, ...params),
    ]);

    const total = countResult[0]?.total || 0;

    // KPI 집계
    const summaryQuery = `
      SELECT
        COUNT(DISTINCT c.id)::int as "clientCount",
        COALESCE(SUM(s."totalSales"), 0)::float as "totalSales",
        COALESCE(SUM(s."totalReceived"), 0)::float as "totalReceived",
        COALESCE(SUM(s."salesOutstanding"), 0)::float as "totalSalesOutstanding",
        COALESCE(SUM(p."totalPurchases"), 0)::float as "totalPurchases",
        COALESCE(SUM(p."totalPaid"), 0)::float as "totalPaid",
        COALESCE(SUM(p."purchaseOutstanding"), 0)::float as "totalPurchaseOutstanding"
      FROM clients c
      LEFT JOIN (${salesSubquery}) s ON s."clientId" = c.id
      LEFT JOIN (${purchaseSubquery}) p ON p."clientId" = c.id
      WHERE c.status = 'active'
        ${joinCondition}
        ${searchCondition}
    `;

    const summaryResult = await this.prisma.$queryRawUnsafe<any[]>(
      summaryQuery,
      ...params.slice(0, -2),
    );

    const summary = summaryResult[0] || {};

    return {
      data: data.map((row) => ({
        ...row,
        totalSales: Number(row.totalSales),
        totalReceived: Number(row.totalReceived),
        salesOutstanding: Number(row.salesOutstanding),
        salesCount: Number(row.salesCount),
        totalPurchases: Number(row.totalPurchases),
        totalPaid: Number(row.totalPaid),
        purchaseOutstanding: Number(row.purchaseOutstanding),
        purchaseCount: Number(row.purchaseCount),
      })),
      summary: {
        clientCount: Number(summary.clientCount || 0),
        totalSales: Number(summary.totalSales || 0),
        totalReceived: Number(summary.totalReceived || 0),
        totalSalesOutstanding: Number(summary.totalSalesOutstanding || 0),
        totalPurchases: Number(summary.totalPurchases || 0),
        totalPaid: Number(summary.totalPaid || 0),
        totalPurchaseOutstanding: Number(summary.totalPurchaseOutstanding || 0),
      },
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ===== 거래처원장 상세 (일별 거래내역) =====
  async getDetail(clientId: string, query: ClientLedgerDetailQueryDto) {
    const { startDate, endDate, periodType = PeriodTypeEnum.DAILY } = query;

    // 거래처 확인
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        clientCode: true,
        clientName: true,
        businessNumber: true,
        representative: true,
        businessType: true,
        businessCategory: true,
        phone: true,
        email: true,
        address: true,
        addressDetail: true,
        creditGrade: true,
        paymentTerms: true,
      },
    });

    if (!client) {
      throw new NotFoundException('거래처를 찾을 수 없습니다.');
    }

    // 기간 설정 (기본: 당월)
    const now = new Date();
    const periodStart = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = endDate ? new Date(endDate) : now;
    periodEnd.setHours(23, 59, 59, 999);

    // 전기이월: 기간 시작일 이전 잔액 (매출 미수금 - 매입 미지급금 누적)
    const carryForwardResult = await this.prisma.$queryRawUnsafe<
      [{ salesBalance: number; purchaseBalance: number }]
    >(
      `SELECT
        COALESCE(
          (SELECT SUM("outstandingAmount")::float FROM sales_ledgers
           WHERE "clientId" = $1 AND "ledgerDate" < $2 AND "salesStatus" != 'CANCELLED'), 0
        ) as "salesBalance",
        COALESCE(
          (SELECT SUM("outstandingAmount")::float FROM purchase_ledgers
           WHERE "supplierId" = $1 AND "ledgerDate" < $2 AND "purchaseStatus" != 'CANCELLED'), 0
        ) as "purchaseBalance"
      `,
      clientId,
      periodStart,
    );

    const carryForward = {
      salesBalance: Number(carryForwardResult[0]?.salesBalance || 0),
      purchaseBalance: Number(carryForwardResult[0]?.purchaseBalance || 0),
    };

    // 매출 거래내역 (기간 내)
    const salesTransactions = await this.prisma.salesLedger.findMany({
      where: {
        clientId,
        ledgerDate: { gte: periodStart, lte: periodEnd },
        salesStatus: { not: 'CANCELLED' },
      },
      include: {
        receipts: { orderBy: { receiptDate: 'asc' } },
        order: {
          select: {
            items: {
              select: { productName: true, folderName: true },
              orderBy: { id: 'asc' },
            },
          },
        },
      },
      orderBy: { ledgerDate: 'asc' },
    });

    // 매입 거래내역 (기간 내)
    const purchaseTransactions = await this.prisma.purchaseLedger.findMany({
      where: {
        supplierId: clientId,
        ledgerDate: { gte: periodStart, lte: periodEnd },
        purchaseStatus: { not: 'CANCELLED' },
      },
      include: {
        payments: { orderBy: { paymentDate: 'asc' } },
      },
      orderBy: { ledgerDate: 'asc' },
    });

    // 통합 거래내역 생성 (차변/대변)
    const transactions: any[] = [];

    // 매출 발생 → 차변(debit): 매출액 발생
    for (const sl of salesTransactions) {
      const salesDesc = this.buildSalesDescription(sl);
      transactions.push({
        date: sl.ledgerDate,
        type: 'sales',
        ledgerNumber: sl.ledgerNumber,
        orderNumber: sl.orderNumber,
        description: salesDesc.description,
        productName: salesDesc.productName,
        title: salesDesc.title,
        debit: Number(sl.totalAmount),
        credit: 0,
        salesType: sl.salesType,
        paymentStatus: sl.paymentStatus,
      });

      // 수금 → 대변(credit): 수금액
      for (const receipt of sl.receipts) {
        transactions.push({
          date: receipt.receiptDate,
          type: 'receipt',
          ledgerNumber: receipt.receiptNumber,
          orderNumber: sl.orderNumber,
          description: `수금 (${this.getPaymentMethodLabel(receipt.paymentMethod)})`,
          debit: 0,
          credit: Number(receipt.amount),
          paymentMethod: receipt.paymentMethod,
        });
      }
    }

    // 매입 발생 → 대변(credit): 매입액 발생 (채무 증가)
    for (const pl of purchaseTransactions) {
      transactions.push({
        date: pl.ledgerDate,
        type: 'purchase',
        ledgerNumber: pl.ledgerNumber,
        orderNumber: '',
        description: pl.description || '매입',
        debit: 0,
        credit: Number(pl.totalAmount),
        purchaseType: pl.purchaseType,
        paymentStatus: pl.paymentStatus,
      });

      // 지급 → 차변(debit): 지급액
      for (const payment of pl.payments) {
        transactions.push({
          date: payment.paymentDate,
          type: 'payment',
          ledgerNumber: payment.paymentNumber,
          orderNumber: '',
          description: `지급 (${this.getPaymentMethodLabel(payment.paymentMethod)})`,
          debit: Number(payment.amount),
          credit: 0,
          paymentMethod: payment.paymentMethod,
        });
      }
    }

    // 날짜순 정렬
    transactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // running balance 계산
    let balance = carryForward.salesBalance - carryForward.purchaseBalance;
    const transactionsWithBalance = transactions.map((t) => {
      balance = balance + t.debit - t.credit;
      return {
        ...t,
        date: t.date instanceof Date ? t.date.toISOString() : t.date,
        balance,
      };
    });

    // 기간별 요약
    const periodSummary = this.buildPeriodSummary(
      transactionsWithBalance,
      periodType,
    );

    // 거래 총 합계
    const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);

    return {
      client,
      carryForward: {
        salesBalance: carryForward.salesBalance,
        purchaseBalance: carryForward.purchaseBalance,
        netBalance:
          carryForward.salesBalance - carryForward.purchaseBalance,
      },
      transactions: transactionsWithBalance,
      periodSummary,
      totals: {
        totalDebit,
        totalCredit,
        closingBalance: balance,
      },
      period: {
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString(),
        periodType,
      },
    };
  }

  // ===== 기간별 요약 생성 =====
  private buildPeriodSummary(
    transactions: any[],
    periodType: PeriodTypeEnum,
  ) {
    const groups: Record<
      string,
      {
        debit: number;
        credit: number;
        count: number;
        salesProductNames: string[];
        salesCount: number;
        receiptMethods: string[];
        purchaseCount: number;
        paymentMethods: string[];
      }
    > = {};

    for (const t of transactions) {
      const key = this.getPeriodKey(new Date(t.date), periodType);
      if (!groups[key]) {
        groups[key] = {
          debit: 0, credit: 0, count: 0,
          salesProductNames: [], salesCount: 0,
          receiptMethods: [], purchaseCount: 0, paymentMethods: [],
        };
      }
      groups[key].debit += t.debit;
      groups[key].credit += t.credit;
      groups[key].count++;

      if (t.type === 'sales') {
        groups[key].salesCount++;
        // description에서 상품명만 추출 (첫 번째 " - " 또는 " " 앞부분)
        const productName = (t.description || '매출').split(' - ')[0].split(' ')[0];
        if (!groups[key].salesProductNames.includes(productName)) {
          groups[key].salesProductNames.push(productName);
        }
      } else if (t.type === 'receipt') {
        const method = t.paymentMethod || '';
        if (method && !groups[key].receiptMethods.includes(method)) {
          groups[key].receiptMethods.push(method);
        }
      } else if (t.type === 'purchase') {
        groups[key].purchaseCount++;
      } else if (t.type === 'payment') {
        const method = t.paymentMethod || '';
        if (method && !groups[key].paymentMethods.includes(method)) {
          groups[key].paymentMethods.push(method);
        }
      }
    }

    let runningBalance = transactions.length > 0
      ? transactions[0].balance - transactions[0].debit + transactions[0].credit
      : 0;

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => {
        runningBalance = runningBalance + data.debit - data.credit;
        const description = this.buildPeriodDescription(data);
        return {
          period,
          debit: data.debit,
          credit: data.credit,
          balance: runningBalance,
          count: data.count,
          description,
        };
      });
  }

  // 기간별 적요 생성
  private buildPeriodDescription(data: {
    salesProductNames: string[];
    salesCount: number;
    receiptMethods: string[];
    purchaseCount: number;
    paymentMethods: string[];
  }): string {
    const parts: string[] = [];

    // 매출: "상품명 외 N건"
    if (data.salesCount > 0) {
      const name = data.salesProductNames[0] || '매출';
      let salesPart = name;
      if (data.salesCount > 1) {
        salesPart += ` 외 ${data.salesCount - 1}건`;
      }
      parts.push(salesPart);
    }

    // 수금: "수금(계좌이체)"
    if (data.receiptMethods.length > 0) {
      const methodLabel = this.getPaymentMethodLabel(data.receiptMethods[0]);
      parts.push(`수금(${methodLabel})`);
    }

    // 매입
    if (data.purchaseCount > 0) {
      parts.push(data.purchaseCount > 1 ? `매입 ${data.purchaseCount}건` : '매입');
    }

    // 지급: "지급(현금)"
    if (data.paymentMethods.length > 0) {
      const methodLabel = this.getPaymentMethodLabel(data.paymentMethods[0]);
      parts.push(`지급(${methodLabel})`);
    }

    return parts.join(', ');
  }

  private getPeriodKey(date: Date, periodType: PeriodTypeEnum): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    switch (periodType) {
      case PeriodTypeEnum.DAILY:
        return `${y}-${m}-${d}`;
      case PeriodTypeEnum.MONTHLY:
        return `${y}-${m}`;
      case PeriodTypeEnum.QUARTERLY: {
        const q = Math.ceil((date.getMonth() + 1) / 3);
        return `${y}-Q${q}`;
      }
      case PeriodTypeEnum.YEARLY:
        return `${y}`;
      default:
        return `${y}-${m}-${d}`;
    }
  }

  // 매출 적요: 상품명, 제목(폴더명) 분리 반환
  private buildSalesDescription(sl: any): {
    description: string;
    productName: string;
    title: string;
  } {
    const items = sl.order?.items || [];
    if (items.length === 0) {
      return {
        description: sl.description || '매출',
        productName: sl.description || '매출',
        title: '',
      };
    }

    const first = items[0];
    const productNameFull = first.productName || '';
    const folderName = first.folderName || '';

    // productName에서 상품명만 추출 ("졸업스타화보 - (251002) ..." → "졸업스타화보")
    const productName = productNameFull.split(' - ')[0].trim();

    // description: 기존 호환용 (상품명 + 폴더명)
    let descBase = productNameFull;
    if (folderName && !productNameFull.includes(folderName)) {
      descBase = `${productNameFull} - ${folderName}`;
    }
    if (items.length > 1) {
      descBase = `${descBase} 외 ${items.length - 1}건`;
    }

    return {
      description: descBase || sl.description || '매출',
      productName: productName || sl.description || '매출',
      title: folderName,
    };
  }

  private getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      cash: '현금',
      bank_transfer: '계좌이체',
      card: '카드',
      check: '수표',
      postpaid: '후불',
      other: '기타',
    };
    return labels[method] || method;
  }
}

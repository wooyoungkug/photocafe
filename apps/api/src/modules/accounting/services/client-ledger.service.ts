import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import {
  ClientLedgerListQueryDto,
  ClientLedgerDetailQueryDto,
  SendStatementEmailDto,
  ClientTypeEnum,
  PeriodTypeEnum,
} from '../dto/client-ledger.dto';

@Injectable()
export class ClientLedgerService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

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

    // 기간 조건 생성 (Prisma.sql fragments)
    const salesDateConditions: Prisma.Sql[] = [];
    const purchaseDateConditions: Prisma.Sql[] = [];

    if (startDate) {
      const start = new Date(startDate);
      salesDateConditions.push(Prisma.sql`AND sl."ledgerDate" >= ${start}`);
      purchaseDateConditions.push(Prisma.sql`AND pl."ledgerDate" >= ${start}`);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      salesDateConditions.push(Prisma.sql`AND sl."ledgerDate" <= ${end}`);
      purchaseDateConditions.push(Prisma.sql`AND pl."ledgerDate" <= ${end}`);
    }

    const salesDateFragment = salesDateConditions.length > 0
      ? Prisma.join(salesDateConditions, ' ')
      : Prisma.empty;
    const purchaseDateFragment = purchaseDateConditions.length > 0
      ? Prisma.join(purchaseDateConditions, ' ')
      : Prisma.empty;

    // 검색 조건
    const searchFragment = search
      ? Prisma.sql`AND (c."clientName" ILIKE ${`%${search}%`} OR c."clientCode" ILIKE ${`%${search}%`})`
      : Prisma.empty;

    // 매출 서브쿼리
    const salesSubquery = Prisma.sql`
      SELECT sl."clientId",
             COALESCE(SUM(sl."totalAmount"), 0)::float as "totalSales",
             COALESCE(SUM(sl."receivedAmount"), 0)::float as "totalReceived",
             COALESCE(SUM(sl."outstandingAmount"), 0)::float as "salesOutstanding",
             COUNT(sl.id)::int as "salesCount",
             MAX(sl."ledgerDate") as "lastSalesDate"
      FROM sales_ledgers sl
      WHERE sl."salesStatus" != 'CANCELLED'
        ${salesDateFragment}
      GROUP BY sl."clientId"
    `;

    // 매입 서브쿼리
    const purchaseSubquery = Prisma.sql`
      SELECT pl."supplierId" as "clientId",
             COALESCE(SUM(pl."totalAmount"), 0)::float as "totalPurchases",
             COALESCE(SUM(pl."paidAmount"), 0)::float as "totalPaid",
             COALESCE(SUM(pl."outstandingAmount"), 0)::float as "purchaseOutstanding",
             COUNT(pl.id)::int as "purchaseCount",
             MAX(pl."ledgerDate") as "lastPurchaseDate"
      FROM purchase_ledgers pl
      WHERE pl."purchaseStatus" != 'CANCELLED'
        ${purchaseDateFragment}
      GROUP BY pl."supplierId"
    `;

    // 거래처 유형 조건
    let joinCondition: Prisma.Sql;
    if (clientType === ClientTypeEnum.SALES) {
      joinCondition = Prisma.sql`AND s."clientId" IS NOT NULL`;
    } else if (clientType === ClientTypeEnum.PURCHASE) {
      joinCondition = Prisma.sql`AND p."clientId" IS NOT NULL`;
    } else {
      joinCondition = Prisma.sql`AND (s."clientId" IS NOT NULL OR p."clientId" IS NOT NULL)`;
    }

    const offset = (page - 1) * limit;

    const [countResult, data] = await Promise.all([
      this.prisma.$queryRaw<[{ total: number }]>(Prisma.sql`
        SELECT COUNT(DISTINCT c.id)::int as total
        FROM clients c
        LEFT JOIN (${salesSubquery}) s ON s."clientId" = c.id
        LEFT JOIN (${purchaseSubquery}) p ON p."clientId" = c.id
        WHERE c.status = 'active'
          ${joinCondition}
          ${searchFragment}
      `),
      this.prisma.$queryRaw<any[]>(Prisma.sql`
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
          ${searchFragment}
        ORDER BY (COALESCE(s."totalSales", 0) + COALESCE(p."totalPurchases", 0)) DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
    ]);

    const total = countResult[0]?.total || 0;

    // KPI 집계
    const summaryResult = await this.prisma.$queryRaw<any[]>(Prisma.sql`
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
        ${searchFragment}
    `);

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
    const carryForwardResult = await this.prisma.$queryRaw<
      [{ salesBalance: number; purchaseBalance: number }]
    >(Prisma.sql`
      SELECT
        COALESCE(
          (SELECT SUM("outstandingAmount")::float FROM sales_ledgers
           WHERE "clientId" = ${clientId} AND "ledgerDate" < ${periodStart} AND "salesStatus" != 'CANCELLED'), 0
        ) as "salesBalance",
        COALESCE(
          (SELECT SUM("outstandingAmount")::float FROM purchase_ledgers
           WHERE "supplierId" = ${clientId} AND "ledgerDate" < ${periodStart} AND "purchaseStatus" != 'CANCELLED'), 0
        ) as "purchaseBalance"
    `);

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

      // 입금 → 대변(credit): 입금액
      for (const receipt of sl.receipts) {
        transactions.push({
          date: receipt.receiptDate,
          type: 'receipt',
          ledgerNumber: receipt.receiptNumber,
          orderNumber: sl.orderNumber,
          description: `입금 (${this.getPaymentMethodLabel(receipt.paymentMethod)})`,
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

    // 입금: "입금(계좌이체)"
    if (data.receiptMethods.length > 0) {
      const methodLabel = this.getPaymentMethodLabel(data.receiptMethods[0]);
      parts.push(`입금(${methodLabel})`);
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

  // ===== 거래내역서 이메일 발송 =====
  async sendStatementEmail(clientId: string, dto: SendStatementEmailDto) {
    if (!this.emailService.isConfigured()) {
      return {
        success: false,
        error: 'SMTP가 설정되지 않았습니다. 시스템 설정에서 이메일 정보를 확인하세요.',
      };
    }

    // 거래내역 데이터 조회
    const data = await this.getDetail(clientId, {
      startDate: dto.startDate,
      endDate: dto.endDate,
      periodType: dto.statementType === 'monthly' ? PeriodTypeEnum.MONTHLY : PeriodTypeEnum.DAILY,
    });

    // 회사 정보 조회
    const companySettings = await this.prisma.systemSetting.findMany({
      where: { category: 'company' },
    });
    const settings: Record<string, string> = {};
    companySettings.forEach((s) => { settings[s.key] = s.value; });

    const statementTypeLabels: Record<string, string> = {
      detail: '세부 거래내역서',
      daily: '일별 거래내역서',
      monthly: '월별 거래내역서',
      period: '기간별 거래내역서',
    };

    const title = statementTypeLabels[dto.statementType] || '거래내역서';
    const subject = dto.subject || `[${settings.company_name || 'Printing114'}] ${data.client.clientName} ${title}`;

    // HTML 생성
    const html = this.buildStatementEmailHtml({
      title,
      client: data.client,
      carryForward: data.carryForward,
      transactions: data.transactions,
      periodSummary: data.periodSummary,
      totals: data.totals,
      startDate: dto.startDate || '',
      endDate: dto.endDate || '',
      statementType: dto.statementType,
      companySettings: settings,
      customMessage: dto.message,
    });

    return this.emailService.sendEmail({ to: dto.to, subject, html });
  }

  // ===== 이메일용 HTML 생성 =====
  private buildStatementEmailHtml(params: {
    title: string;
    client: any;
    carryForward: any;
    transactions: any[];
    periodSummary: any[];
    totals: any;
    startDate: string;
    endDate: string;
    statementType: string;
    companySettings: Record<string, string>;
    customMessage?: string;
  }): string {
    const { title, client, carryForward, transactions, totals, periodSummary, startDate, endDate, statementType, companySettings, customMessage } = params;
    const typeLabels: Record<string, string> = { sales: '매출', receipt: '입금', purchase: '매입', payment: '지급' };

    // 거래내역 테이블 행 생성
    let bodyRows = '';

    if (statementType === 'detail') {
      bodyRows = transactions.map((t) => {
        const date = new Date(t.date).toISOString().split('T')[0];
        return `<tr>
          <td style="border:1px solid #ddd;padding:6px 8px;text-align:center">${date}</td>
          <td style="border:1px solid #ddd;padding:6px 8px;text-align:center">${t.orderNumber || '-'}</td>
          <td style="border:1px solid #ddd;padding:6px 8px">${t.productName ? t.productName + ' - ' : ''}${t.description} [${typeLabels[t.type] || t.type}]</td>
          <td style="border:1px solid #ddd;padding:6px 8px;text-align:right">${t.debit > 0 ? Math.round(t.debit).toLocaleString() : ''}</td>
          <td style="border:1px solid #ddd;padding:6px 8px;text-align:right">${t.credit > 0 ? Math.round(t.credit).toLocaleString() : ''}</td>
          <td style="border:1px solid #ddd;padding:6px 8px;text-align:right">${Math.round(t.balance).toLocaleString()}</td>
        </tr>`;
      }).join('');
    } else if (statementType === 'daily') {
      // 일별 합계 그룹
      const dayGroups = new Map<string, { debit: number; credit: number; count: number; lastBalance: number }>();
      transactions.forEach((t) => {
        const date = new Date(t.date).toISOString().split('T')[0];
        if (!dayGroups.has(date)) dayGroups.set(date, { debit: 0, credit: 0, count: 0, lastBalance: 0 });
        const g = dayGroups.get(date)!;
        g.debit += t.debit;
        g.credit += t.credit;
        g.count++;
        g.lastBalance = t.balance;
      });

      bodyRows = Array.from(dayGroups.entries()).sort().map(([date, g]) => `<tr>
        <td style="border:1px solid #ddd;padding:6px 8px;text-align:center">${date}</td>
        <td style="border:1px solid #ddd;padding:6px 8px;text-align:center">${g.count}건</td>
        <td style="border:1px solid #ddd;padding:6px 8px">일별 합계</td>
        <td style="border:1px solid #ddd;padding:6px 8px;text-align:right">${g.debit > 0 ? Math.round(g.debit).toLocaleString() : '-'}</td>
        <td style="border:1px solid #ddd;padding:6px 8px;text-align:right">${g.credit > 0 ? Math.round(g.credit).toLocaleString() : '-'}</td>
        <td style="border:1px solid #ddd;padding:6px 8px;text-align:right">${Math.round(g.lastBalance).toLocaleString()}</td>
      </tr>`).join('');
    } else if (statementType === 'monthly') {
      bodyRows = periodSummary.map((ps) => `<tr>
        <td style="border:1px solid #ddd;padding:6px 8px;text-align:center" colspan="2">${ps.period}</td>
        <td style="border:1px solid #ddd;padding:6px 8px">${ps.description || '-'} (${ps.count}건)</td>
        <td style="border:1px solid #ddd;padding:6px 8px;text-align:right">${ps.debit > 0 ? Math.round(ps.debit).toLocaleString() : '-'}</td>
        <td style="border:1px solid #ddd;padding:6px 8px;text-align:right">${ps.credit > 0 ? Math.round(ps.credit).toLocaleString() : '-'}</td>
        <td style="border:1px solid #ddd;padding:6px 8px;text-align:right">${Math.round(ps.balance).toLocaleString()}</td>
      </tr>`).join('');
    } else {
      // period: 기간별 요약
      const salesTotal = transactions.filter(t => t.type === 'sales').reduce((s, t) => s + t.debit, 0);
      const receiptTotal = transactions.filter(t => t.type === 'receipt').reduce((s, t) => s + t.credit, 0);

      bodyRows = `
        <tr><td style="border:1px solid #ddd;padding:8px" colspan="3">전기이월 잔액</td>
            <td style="border:1px solid #ddd;padding:8px;text-align:right" colspan="3">${Math.round(carryForward?.netBalance || 0).toLocaleString()}원</td></tr>
        <tr><td style="border:1px solid #ddd;padding:8px" colspan="3">기간 매출 합계</td>
            <td style="border:1px solid #ddd;padding:8px;text-align:right" colspan="3">${Math.round(salesTotal).toLocaleString()}원</td></tr>
        <tr><td style="border:1px solid #ddd;padding:8px" colspan="3">기간 입금 합계</td>
            <td style="border:1px solid #ddd;padding:8px;text-align:right" colspan="3">-${Math.round(receiptTotal).toLocaleString()}원</td></tr>
        <tr style="background:#f5f5f5;font-weight:bold">
            <td style="border:1px solid #ddd;padding:8px" colspan="3">기말 미수금 잔액</td>
            <td style="border:1px solid #ddd;padding:8px;text-align:right;color:#dc2626" colspan="3">${Math.round(totals?.closingBalance || 0).toLocaleString()}원</td></tr>
      `;
    }

    const companyName = companySettings.company_name || 'Printing114';
    const now = new Date();
    const dateStr = `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일`;

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;font-family:'맑은 고딕','Malgun Gothic',sans-serif;background:#f9fafb">
  <div style="max-width:700px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <!-- 헤더 -->
    <div style="background:#1f2937;color:#fff;padding:24px;text-align:center">
      <h1 style="margin:0;font-size:22px;letter-spacing:4px">${title.split('').join(' ')}</h1>
      <p style="margin:8px 0 0;font-size:13px;opacity:0.8">기간: ${startDate} ~ ${endDate}</p>
    </div>

    <div style="padding:24px">
      ${customMessage ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px 16px;margin-bottom:20px;font-size:14px;color:#1e40af">${customMessage}</div>` : ''}

      <!-- 거래처 정보 -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
        <tr>
          <td style="background:#f3f4f6;padding:6px 12px;border:1px solid #ddd;font-weight:bold;width:100px">거래처명</td>
          <td style="padding:6px 12px;border:1px solid #ddd">${client.clientName}</td>
          <td style="background:#f3f4f6;padding:6px 12px;border:1px solid #ddd;font-weight:bold;width:100px">거래처코드</td>
          <td style="padding:6px 12px;border:1px solid #ddd">${client.clientCode}</td>
        </tr>
        <tr>
          <td style="background:#f3f4f6;padding:6px 12px;border:1px solid #ddd;font-weight:bold">사업자번호</td>
          <td style="padding:6px 12px;border:1px solid #ddd" colspan="3">${client.businessNumber || '-'}</td>
        </tr>
      </table>

      <!-- 거래내역 테이블 -->
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="border:1px solid #ddd;padding:8px;text-align:center">일자</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:center">${statementType === 'daily' ? '건수' : '주문번호'}</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left">적요</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:right">매출</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:right">입금</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:right">잔액</th>
          </tr>
        </thead>
        <tbody>
          <!-- 전기이월 -->
          <tr style="background:#fffbeb">
            <td style="border:1px solid #ddd;padding:6px 8px" colspan="3">전기이월</td>
            <td style="border:1px solid #ddd;padding:6px 8px;text-align:right">-</td>
            <td style="border:1px solid #ddd;padding:6px 8px;text-align:right">-</td>
            <td style="border:1px solid #ddd;padding:6px 8px;text-align:right">${Math.round(carryForward?.netBalance || 0).toLocaleString()}</td>
          </tr>
          ${bodyRows}
          <!-- 합계 -->
          ${statementType !== 'period' ? `<tr style="background:#f3f4f6;font-weight:bold">
            <td style="border:1px solid #ddd;padding:8px" colspan="3">합 계</td>
            <td style="border:1px solid #ddd;padding:8px;text-align:right">${Math.round(totals?.totalDebit || 0).toLocaleString()}</td>
            <td style="border:1px solid #ddd;padding:8px;text-align:right">${Math.round(totals?.totalCredit || 0).toLocaleString()}</td>
            <td style="border:1px solid #ddd;padding:8px;text-align:right">${Math.round(totals?.closingBalance || 0).toLocaleString()}</td>
          </tr>` : ''}
        </tbody>
      </table>

      <p style="font-size:12px;color:#6b7280;margin:16px 0">상기 금액은 당사 장부 기준이며, 차이가 있을 경우 연락 부탁드립니다.</p>
    </div>

    <!-- 하단 회사정보 -->
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 24px;text-align:center;font-size:12px;color:#6b7280">
      <p style="margin:0;font-weight:bold;color:#374151">${companyName}</p>
      <p style="margin:4px 0 0">발행일: ${dateStr} | 전화: ${companySettings.company_phone || '-'}</p>
    </div>
  </div>
</body>
</html>`;
  }
}

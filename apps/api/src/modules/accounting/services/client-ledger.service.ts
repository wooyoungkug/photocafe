import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  ClientLedgerQueryDto,
  ClientLedgerDetailQueryDto,
  ClientLedgerType,
  PeriodUnit,
} from '../dto/client-ledger.dto';

@Injectable()
export class ClientLedgerService {
  constructor(private prisma: PrismaService) {}

  // ===== 전체 거래처 원장 목록 =====
  // SalesLedger와 PurchaseLedger에서 거래처별로 집계
  async findAllClientLedgers(query: ClientLedgerQueryDto) {
    const { clientType = ClientLedgerType.ALL, search, startDate, endDate, page = 1, limit = 20 } = query;

    // 기간 조건 생성 (파라미터 바인딩)
    const dateConditions: { sales: string[]; purchase: string[] } = { sales: [], purchase: [] };
    const params: any[] = [];
    let paramIdx = 1;

    if (startDate) {
      dateConditions.sales.push(`sl."ledgerDate" >= $${paramIdx}`);
      dateConditions.purchase.push(`pl."ledgerDate" >= $${paramIdx}`);
      params.push(new Date(startDate));
      paramIdx++;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateConditions.sales.push(`sl."ledgerDate" <= $${paramIdx}`);
      dateConditions.purchase.push(`pl."ledgerDate" <= $${paramIdx}`);
      params.push(end);
      paramIdx++;
    }

    // 검색 조건 (거래처명 또는 거래처코드)
    let searchCondition = '';
    if (search) {
      searchCondition = `AND (c."clientName" ILIKE $${paramIdx} OR c."clientCode" ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const salesDateWhere = dateConditions.sales.length > 0
      ? 'AND ' + dateConditions.sales.join(' AND ')
      : '';
    const purchaseDateWhere = dateConditions.purchase.length > 0
      ? 'AND ' + dateConditions.purchase.join(' AND ')
      : '';

    // UNION으로 매출/매입 거래처 통합 집계
    // clientType에 따라 서브쿼리 구성
    let salesCTE = '';
    let purchaseCTE = '';

    if (clientType === ClientLedgerType.ALL || clientType === ClientLedgerType.SALES) {
      salesCTE = `
        sales_agg AS (
          SELECT
            sl."clientId",
            COALESCE(SUM(sl."totalAmount"), 0)::float AS "totalSales",
            COALESCE(SUM(sl."receivedAmount"), 0)::float AS "totalReceived",
            COALESCE(SUM(sl."outstandingAmount"), 0)::float AS "salesOutstanding",
            COUNT(sl.id)::int AS "salesCount",
            MAX(sl."ledgerDate") AS "lastSalesDate"
          FROM sales_ledgers sl
          WHERE sl."salesStatus" != 'CANCELLED' ${salesDateWhere}
          GROUP BY sl."clientId"
        )`;
    }

    if (clientType === ClientLedgerType.ALL || clientType === ClientLedgerType.PURCHASE) {
      purchaseCTE = `
        purchase_agg AS (
          SELECT
            pl."supplierId" AS "clientId",
            COALESCE(SUM(pl."totalAmount"), 0)::float AS "totalPurchases",
            COALESCE(SUM(pl."paidAmount"), 0)::float AS "totalPaid",
            COALESCE(SUM(pl."outstandingAmount"), 0)::float AS "purchaseOutstanding",
            COUNT(pl.id)::int AS "purchaseCount",
            MAX(pl."ledgerDate") AS "lastPurchaseDate"
          FROM purchase_ledgers pl
          WHERE pl."purchaseStatus" != 'CANCELLED' ${purchaseDateWhere}
          GROUP BY pl."supplierId"
        )`;
    }

    // CTE 조합
    let cteList: string[] = [];
    if (salesCTE) cteList.push(salesCTE);
    if (purchaseCTE) cteList.push(purchaseCTE);

    if (cteList.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const withClause = `WITH ${cteList.join(', ')}`;

    // 메인 쿼리 - 거래처 정보와 JOIN
    let mainQuery = '';
    if (clientType === ClientLedgerType.SALES) {
      mainQuery = `
        ${withClause}
        SELECT
          c.id AS "clientId",
          c."clientCode",
          c."clientName",
          c."businessNumber",
          c.phone,
          COALESCE(s."totalSales", 0) AS "totalSales",
          COALESCE(s."totalReceived", 0) AS "totalReceived",
          COALESCE(s."salesOutstanding", 0) AS "salesOutstanding",
          COALESCE(s."salesCount", 0) AS "salesCount",
          s."lastSalesDate",
          0::float AS "totalPurchases",
          0::float AS "totalPaid",
          0::float AS "purchaseOutstanding",
          0 AS "purchaseCount",
          NULL::timestamp AS "lastPurchaseDate"
        FROM clients c
        INNER JOIN sales_agg s ON s."clientId" = c.id
        WHERE 1=1 ${searchCondition}`;
    } else if (clientType === ClientLedgerType.PURCHASE) {
      mainQuery = `
        ${withClause}
        SELECT
          c.id AS "clientId",
          c."clientCode",
          c."clientName",
          c."businessNumber",
          c.phone,
          0::float AS "totalSales",
          0::float AS "totalReceived",
          0::float AS "salesOutstanding",
          0 AS "salesCount",
          NULL::timestamp AS "lastSalesDate",
          COALESCE(p."totalPurchases", 0) AS "totalPurchases",
          COALESCE(p."totalPaid", 0) AS "totalPaid",
          COALESCE(p."purchaseOutstanding", 0) AS "purchaseOutstanding",
          COALESCE(p."purchaseCount", 0) AS "purchaseCount",
          p."lastPurchaseDate"
        FROM clients c
        INNER JOIN purchase_agg p ON p."clientId" = c.id
        WHERE 1=1 ${searchCondition}`;
    } else {
      // ALL: FULL OUTER JOIN으로 매출/매입 모두 있는 거래처 통합
      mainQuery = `
        ${withClause}
        SELECT
          c.id AS "clientId",
          c."clientCode",
          c."clientName",
          c."businessNumber",
          c.phone,
          COALESCE(s."totalSales", 0) AS "totalSales",
          COALESCE(s."totalReceived", 0) AS "totalReceived",
          COALESCE(s."salesOutstanding", 0) AS "salesOutstanding",
          COALESCE(s."salesCount", 0) AS "salesCount",
          s."lastSalesDate",
          COALESCE(p."totalPurchases", 0) AS "totalPurchases",
          COALESCE(p."totalPaid", 0) AS "totalPaid",
          COALESCE(p."purchaseOutstanding", 0) AS "purchaseOutstanding",
          COALESCE(p."purchaseCount", 0) AS "purchaseCount",
          p."lastPurchaseDate"
        FROM clients c
        LEFT JOIN sales_agg s ON s."clientId" = c.id
        LEFT JOIN purchase_agg p ON p."clientId" = c.id
        WHERE (s."clientId" IS NOT NULL OR p."clientId" IS NOT NULL) ${searchCondition}`;
    }

    // 전체 건수 카운트
    const countQuery = `SELECT COUNT(*) AS total FROM (${mainQuery}) sub`;
    const countResult = await this.prisma.$queryRawUnsafe<{ total: bigint }[]>(
      countQuery,
      ...params,
    );
    const total = Number(countResult[0]?.total || 0);

    // 페이징된 데이터
    const offset = (page - 1) * limit;
    const dataQuery = `${mainQuery} ORDER BY "totalSales" DESC, "totalPurchases" DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(limit, offset);

    const rows = await this.prisma.$queryRawUnsafe<any[]>(dataQuery, ...params);

    const data = rows.map(r => ({
      clientId: r.clientId,
      clientCode: r.clientCode,
      clientName: r.clientName,
      businessNumber: r.businessNumber || null,
      phone: r.phone || null,
      totalSales: Number(r.totalSales || 0),
      totalReceived: Number(r.totalReceived || 0),
      salesOutstanding: Number(r.salesOutstanding || 0),
      salesCount: Number(r.salesCount || 0),
      lastSalesDate: r.lastSalesDate?.toISOString() || null,
      totalPurchases: Number(r.totalPurchases || 0),
      totalPaid: Number(r.totalPaid || 0),
      purchaseOutstanding: Number(r.purchaseOutstanding || 0),
      purchaseCount: Number(r.purchaseCount || 0),
      lastPurchaseDate: r.lastPurchaseDate?.toISOString() || null,
      // 순잔액: 매출 미수금 - 매입 미지급금
      netBalance: Number(r.salesOutstanding || 0) - Number(r.purchaseOutstanding || 0),
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ===== 거래처별 상세 원장 (일별 거래 내역) =====
  // 전기이월 → 일별 거래 → 잔액 형태
  async getClientLedgerDetail(clientId: string, query: ClientLedgerDetailQueryDto) {
    const { startDate, endDate, periodUnit = PeriodUnit.DAILY, page = 1, limit = 50 } = query;

    // 거래처 존재 확인
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, clientCode: true, clientName: true, businessNumber: true },
    });

    if (!client) {
      throw new NotFoundException('거래처를 찾을 수 없습니다.');
    }

    // 기간 설정 (기본: 당월)
    const now = new Date();
    const periodStart = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = endDate
      ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })()
      : (() => { const d = new Date(now.getFullYear(), now.getMonth() + 1, 0); d.setHours(23, 59, 59, 999); return d; })();

    // === 1. 전기이월 계산 ===
    // 조회 시작일 이전의 모든 거래를 합산하여 이월 잔액 산출
    const openingBalanceRows = await this.prisma.$queryRawUnsafe<{
      salesTotal: number;
      salesReceived: number;
      purchaseTotal: number;
      purchasePaid: number;
    }[]>(
      `SELECT
        COALESCE((
          SELECT SUM(sl."totalAmount")::float
          FROM sales_ledgers sl
          WHERE sl."clientId" = $1 AND sl."ledgerDate" < $2 AND sl."salesStatus" != 'CANCELLED'
        ), 0) AS "salesTotal",
        COALESCE((
          SELECT SUM(sr.amount)::float
          FROM sales_receipts sr
          INNER JOIN sales_ledgers sl ON sl.id = sr."salesLedgerId"
          WHERE sl."clientId" = $1 AND sr."receiptDate" < $2 AND sl."salesStatus" != 'CANCELLED'
        ), 0) AS "salesReceived",
        COALESCE((
          SELECT SUM(pl."totalAmount")::float
          FROM purchase_ledgers pl
          WHERE pl."supplierId" = $1 AND pl."ledgerDate" < $2 AND pl."purchaseStatus" != 'CANCELLED'
        ), 0) AS "purchaseTotal",
        COALESCE((
          SELECT SUM(pp.amount)::float
          FROM purchase_payments pp
          INNER JOIN purchase_ledgers pl ON pl.id = pp."purchaseLedgerId"
          WHERE pl."supplierId" = $1 AND pp."paymentDate" < $2 AND pl."purchaseStatus" != 'CANCELLED'
        ), 0) AS "purchasePaid"`,
      clientId,
      periodStart,
    );

    const ob = openingBalanceRows[0] || { salesTotal: 0, salesReceived: 0, purchaseTotal: 0, purchasePaid: 0 };
    // 이월 외상매출금 = 누적 매출 - 누적 수금
    const openingSalesBalance = Number(ob.salesTotal) - Number(ob.salesReceived);
    // 이월 외상매입금 = 누적 매입 - 누적 지급
    const openingPurchaseBalance = Number(ob.purchaseTotal) - Number(ob.purchasePaid);

    // === 2. 기간 내 거래 내역 통합 조회 ===
    // 4가지 유형: 매출 발생, 수금, 매입 발생, 지급
    const transactionRows = await this.prisma.$queryRawUnsafe<{
      txDate: Date;
      txType: string;
      description: string;
      debit: number;
      credit: number;
      refNumber: string;
    }[]>(
      `SELECT * FROM (
        -- 매출 발생 → 차변 (외상매출금 증가)
        SELECT
          sl."ledgerDate" AS "txDate",
          'SALES' AS "txType",
          COALESCE(sl.description, sl."orderNumber", '매출') AS description,
          sl."totalAmount"::float AS debit,
          0::float AS credit,
          sl."ledgerNumber" AS "refNumber"
        FROM sales_ledgers sl
        WHERE sl."clientId" = $1
          AND sl."ledgerDate" >= $2 AND sl."ledgerDate" <= $3
          AND sl."salesStatus" != 'CANCELLED'

        UNION ALL

        -- 수금 → 대변 (외상매출금 감소)
        SELECT
          sr."receiptDate" AS "txDate",
          'RECEIPT' AS "txType",
          COALESCE(sr.note, sr."receiptNumber", '수금') AS description,
          0::float AS debit,
          sr.amount::float AS credit,
          sr."receiptNumber" AS "refNumber"
        FROM sales_receipts sr
        INNER JOIN sales_ledgers sl ON sl.id = sr."salesLedgerId"
        WHERE sl."clientId" = $1
          AND sr."receiptDate" >= $2 AND sr."receiptDate" <= $3
          AND sl."salesStatus" != 'CANCELLED'

        UNION ALL

        -- 매입 발생 → 대변 (외상매입금 증가)
        SELECT
          pl."ledgerDate" AS "txDate",
          'PURCHASE' AS "txType",
          COALESCE(pl.description, '매입') AS description,
          0::float AS debit,
          pl."totalAmount"::float AS credit,
          pl."ledgerNumber" AS "refNumber"
        FROM purchase_ledgers pl
        WHERE pl."supplierId" = $1
          AND pl."ledgerDate" >= $2 AND pl."ledgerDate" <= $3
          AND pl."purchaseStatus" != 'CANCELLED'

        UNION ALL

        -- 지급 → 차변 (외상매입금 감소)
        SELECT
          pp."paymentDate" AS "txDate",
          'PAYMENT' AS "txType",
          COALESCE(pp.note, pp."paymentNumber", '지급') AS description,
          pp.amount::float AS debit,
          0::float AS credit,
          pp."paymentNumber" AS "refNumber"
        FROM purchase_payments pp
        INNER JOIN purchase_ledgers pl ON pl.id = pp."purchaseLedgerId"
        WHERE pl."supplierId" = $1
          AND pp."paymentDate" >= $2 AND pp."paymentDate" <= $3
          AND pl."purchaseStatus" != 'CANCELLED'
      ) t
      ORDER BY t."txDate" ASC, t."txType" ASC`,
      clientId,
      periodStart,
      periodEnd,
    );

    // === 3. PeriodUnit에 따라 집계 ===
    if (periodUnit === PeriodUnit.DAILY) {
      // 일별: 개별 거래 그대로 반환 (running balance 계산)
      let runningBalance = openingSalesBalance - openingPurchaseBalance;

      const transactions = transactionRows.map(row => {
        // 회계 표준에 따른 잔액 계산:
        // 차변(debit) 증가 = 외상매출금 증가 또는 외상매입금 감소 → 잔액 증가
        // 대변(credit) 증가 = 외상매출금 감소 또는 외상매입금 증가 → 잔액 감소
        const debit = Number(row.debit);
        const credit = Number(row.credit);

        // 매출/지급은 차변(debit) → 잔액 증가
        // 수금/매입은 대변(credit) → 잔액 감소
        if (row.txType === 'SALES') {
          runningBalance += debit;
        } else if (row.txType === 'RECEIPT') {
          runningBalance -= credit;
        } else if (row.txType === 'PURCHASE') {
          runningBalance -= credit;
        } else if (row.txType === 'PAYMENT') {
          runningBalance += debit;
        }

        return {
          date: row.txDate.toISOString().slice(0, 10),
          type: row.txType,
          typeLabel: this.getTransactionTypeLabel(row.txType),
          description: row.description,
          refNumber: row.refNumber,
          debit,
          credit,
          balance: Math.round(runningBalance * 100) / 100,
        };
      });

      // 페이지네이션
      const total = transactions.length;
      const paginatedData = transactions.slice((page - 1) * limit, page * limit);

      return {
        client,
        openingBalance: {
          salesBalance: Math.round(openingSalesBalance * 100) / 100,
          purchaseBalance: Math.round(openingPurchaseBalance * 100) / 100,
          netBalance: Math.round((openingSalesBalance - openingPurchaseBalance) * 100) / 100,
        },
        transactions: paginatedData,
        closingBalance: transactions.length > 0
          ? transactions[transactions.length - 1].balance
          : Math.round((openingSalesBalance - openingPurchaseBalance) * 100) / 100,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    // 월별/분기별/연별 집계
    const grouped = this.groupTransactionsByPeriod(transactionRows, periodUnit);
    let runningBalance = openingSalesBalance - openingPurchaseBalance;

    const aggregated = grouped.map(group => {
      const totalDebit = group.transactions.reduce((sum, t) => sum + Number(t.debit), 0);
      const totalCredit = group.transactions.reduce((sum, t) => sum + Number(t.credit), 0);

      const salesAmount = group.transactions
        .filter(t => t.txType === 'SALES')
        .reduce((sum, t) => sum + Number(t.debit), 0);
      const receiptAmount = group.transactions
        .filter(t => t.txType === 'RECEIPT')
        .reduce((sum, t) => sum + Number(t.credit), 0);
      const purchaseAmount = group.transactions
        .filter(t => t.txType === 'PURCHASE')
        .reduce((sum, t) => sum + Number(t.credit), 0);
      const paymentAmount = group.transactions
        .filter(t => t.txType === 'PAYMENT')
        .reduce((sum, t) => sum + Number(t.debit), 0);

      // 순변동: 차변합 - 대변합
      const netChange = totalDebit - totalCredit;
      runningBalance += netChange;

      return {
        period: group.periodKey,
        periodLabel: group.periodLabel,
        salesAmount: Math.round(salesAmount * 100) / 100,
        receiptAmount: Math.round(receiptAmount * 100) / 100,
        purchaseAmount: Math.round(purchaseAmount * 100) / 100,
        paymentAmount: Math.round(paymentAmount * 100) / 100,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        balance: Math.round(runningBalance * 100) / 100,
        transactionCount: group.transactions.length,
      };
    });

    const total = aggregated.length;
    const paginatedData = aggregated.slice((page - 1) * limit, page * limit);

    return {
      client,
      openingBalance: {
        salesBalance: Math.round(openingSalesBalance * 100) / 100,
        purchaseBalance: Math.round(openingPurchaseBalance * 100) / 100,
        netBalance: Math.round((openingSalesBalance - openingPurchaseBalance) * 100) / 100,
      },
      transactions: paginatedData,
      closingBalance: aggregated.length > 0
        ? aggregated[aggregated.length - 1].balance
        : Math.round((openingSalesBalance - openingPurchaseBalance) * 100) / 100,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ===== 거래처별 기간 요약 =====
  async getClientLedgerSummary(clientId: string, query: { startDate?: string; endDate?: string; periodUnit?: PeriodUnit }) {
    const { startDate, endDate, periodUnit = PeriodUnit.MONTHLY } = query;

    // 거래처 존재 확인
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, clientCode: true, clientName: true, businessNumber: true },
    });

    if (!client) {
      throw new NotFoundException('거래처를 찾을 수 없습니다.');
    }

    // 기간 설정 (기본: 최근 12개월)
    const now = new Date();
    const periodStart = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const periodEnd = endDate
      ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })()
      : (() => { const d = new Date(now.getFullYear(), now.getMonth() + 1, 0); d.setHours(23, 59, 59, 999); return d; })();

    // DB 레벨 집계 포맷 결정
    let dateFormat: string;
    switch (periodUnit) {
      case PeriodUnit.DAILY:
        dateFormat = 'YYYY-MM-DD';
        break;
      case PeriodUnit.QUARTERLY:
        dateFormat = 'YYYY-"Q"Q';
        break;
      case PeriodUnit.YEARLY:
        dateFormat = 'YYYY';
        break;
      case PeriodUnit.MONTHLY:
      default:
        dateFormat = 'YYYY-MM';
        break;
    }

    // 전기이월 계산
    const openingRows = await this.prisma.$queryRawUnsafe<{
      salesBalance: number;
      purchaseBalance: number;
    }[]>(
      `SELECT
        COALESCE((
          SELECT SUM(sl."totalAmount" - sl."receivedAmount")::float
          FROM sales_ledgers sl
          WHERE sl."clientId" = $1 AND sl."ledgerDate" < $2 AND sl."salesStatus" != 'CANCELLED'
        ), 0) AS "salesBalance",
        COALESCE((
          SELECT SUM(pl."totalAmount" - pl."paidAmount")::float
          FROM purchase_ledgers pl
          WHERE pl."supplierId" = $1 AND pl."ledgerDate" < $2 AND pl."purchaseStatus" != 'CANCELLED'
        ), 0) AS "purchaseBalance"`,
      clientId,
      periodStart,
    );

    const opening = openingRows[0] || { salesBalance: 0, purchaseBalance: 0 };

    // 매출 기간별 집계
    const salesRows = await this.prisma.$queryRawUnsafe<{
      period: string;
      salesAmount: number;
      salesCount: bigint;
    }[]>(
      `SELECT
        TO_CHAR(sl."ledgerDate", '${dateFormat}') AS period,
        COALESCE(SUM(sl."totalAmount"), 0)::float AS "salesAmount",
        COUNT(sl.id) AS "salesCount"
       FROM sales_ledgers sl
       WHERE sl."clientId" = $1
         AND sl."ledgerDate" >= $2 AND sl."ledgerDate" <= $3
         AND sl."salesStatus" != 'CANCELLED'
       GROUP BY period
       ORDER BY period ASC`,
      clientId,
      periodStart,
      periodEnd,
    );

    // 수금 기간별 집계
    const receiptRows = await this.prisma.$queryRawUnsafe<{
      period: string;
      receiptAmount: number;
      receiptCount: bigint;
    }[]>(
      `SELECT
        TO_CHAR(sr."receiptDate", '${dateFormat}') AS period,
        COALESCE(SUM(sr.amount), 0)::float AS "receiptAmount",
        COUNT(sr.id) AS "receiptCount"
       FROM sales_receipts sr
       INNER JOIN sales_ledgers sl ON sl.id = sr."salesLedgerId"
       WHERE sl."clientId" = $1
         AND sr."receiptDate" >= $2 AND sr."receiptDate" <= $3
         AND sl."salesStatus" != 'CANCELLED'
       GROUP BY period
       ORDER BY period ASC`,
      clientId,
      periodStart,
      periodEnd,
    );

    // 매입 기간별 집계
    const purchaseRows = await this.prisma.$queryRawUnsafe<{
      period: string;
      purchaseAmount: number;
      purchaseCount: bigint;
    }[]>(
      `SELECT
        TO_CHAR(pl."ledgerDate", '${dateFormat}') AS period,
        COALESCE(SUM(pl."totalAmount"), 0)::float AS "purchaseAmount",
        COUNT(pl.id) AS "purchaseCount"
       FROM purchase_ledgers pl
       WHERE pl."supplierId" = $1
         AND pl."ledgerDate" >= $2 AND pl."ledgerDate" <= $3
         AND pl."purchaseStatus" != 'CANCELLED'
       GROUP BY period
       ORDER BY period ASC`,
      clientId,
      periodStart,
      periodEnd,
    );

    // 지급 기간별 집계
    const paymentRows = await this.prisma.$queryRawUnsafe<{
      period: string;
      paymentAmount: number;
      paymentCount: bigint;
    }[]>(
      `SELECT
        TO_CHAR(pp."paymentDate", '${dateFormat}') AS period,
        COALESCE(SUM(pp.amount), 0)::float AS "paymentAmount",
        COUNT(pp.id) AS "paymentCount"
       FROM purchase_payments pp
       INNER JOIN purchase_ledgers pl ON pl.id = pp."purchaseLedgerId"
       WHERE pl."supplierId" = $1
         AND pp."paymentDate" >= $2 AND pp."paymentDate" <= $3
         AND pl."purchaseStatus" != 'CANCELLED'
       GROUP BY period
       ORDER BY period ASC`,
      clientId,
      periodStart,
      periodEnd,
    );

    // 모든 기간 키 수집 및 병합
    const periodSet = new Set<string>();
    salesRows.forEach(r => periodSet.add(r.period));
    receiptRows.forEach(r => periodSet.add(r.period));
    purchaseRows.forEach(r => periodSet.add(r.period));
    paymentRows.forEach(r => periodSet.add(r.period));

    const salesMap = new Map(salesRows.map(r => [r.period, r]));
    const receiptMap = new Map(receiptRows.map(r => [r.period, r]));
    const purchaseMap = new Map(purchaseRows.map(r => [r.period, r]));
    const paymentMap = new Map(paymentRows.map(r => [r.period, r]));

    const periods = Array.from(periodSet).sort();

    let salesRunningBalance = Number(opening.salesBalance);
    let purchaseRunningBalance = Number(opening.purchaseBalance);

    const summary = periods.map(period => {
      const sales = Number(salesMap.get(period)?.salesAmount || 0);
      const receipt = Number(receiptMap.get(period)?.receiptAmount || 0);
      const purchase = Number(purchaseMap.get(period)?.purchaseAmount || 0);
      const payment = Number(paymentMap.get(period)?.paymentAmount || 0);

      salesRunningBalance += sales - receipt;
      purchaseRunningBalance += purchase - payment;

      return {
        period,
        salesAmount: Math.round(sales * 100) / 100,
        receiptAmount: Math.round(receipt * 100) / 100,
        purchaseAmount: Math.round(purchase * 100) / 100,
        paymentAmount: Math.round(payment * 100) / 100,
        salesBalance: Math.round(salesRunningBalance * 100) / 100,
        purchaseBalance: Math.round(purchaseRunningBalance * 100) / 100,
        netBalance: Math.round((salesRunningBalance - purchaseRunningBalance) * 100) / 100,
        salesCount: Number(salesMap.get(period)?.salesCount || 0),
        receiptCount: Number(receiptMap.get(period)?.receiptCount || 0),
        purchaseCount: Number(purchaseMap.get(period)?.purchaseCount || 0),
        paymentCount: Number(paymentMap.get(period)?.paymentCount || 0),
      };
    });

    return {
      client,
      openingBalance: {
        salesBalance: Math.round(Number(opening.salesBalance) * 100) / 100,
        purchaseBalance: Math.round(Number(opening.purchaseBalance) * 100) / 100,
        netBalance: Math.round((Number(opening.salesBalance) - Number(opening.purchaseBalance)) * 100) / 100,
      },
      periods: summary,
      closingBalance: {
        salesBalance: Math.round(salesRunningBalance * 100) / 100,
        purchaseBalance: Math.round(purchaseRunningBalance * 100) / 100,
        netBalance: Math.round((salesRunningBalance - purchaseRunningBalance) * 100) / 100,
      },
      totals: {
        totalSales: Math.round(summary.reduce((sum, s) => sum + s.salesAmount, 0) * 100) / 100,
        totalReceipts: Math.round(summary.reduce((sum, s) => sum + s.receiptAmount, 0) * 100) / 100,
        totalPurchases: Math.round(summary.reduce((sum, s) => sum + s.purchaseAmount, 0) * 100) / 100,
        totalPayments: Math.round(summary.reduce((sum, s) => sum + s.paymentAmount, 0) * 100) / 100,
      },
    };
  }

  // ===== 거래처원장 통계 =====
  async getClientLedgerStats(query: { startDate?: string; endDate?: string }) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    // 기간 조건 (전체 기간 통계)
    const conditions: { sales: string[]; purchase: string[] } = { sales: [], purchase: [] };
    const params: any[] = [monthStart, monthEnd];
    let paramIdx = 3;

    if (query.startDate) {
      conditions.sales.push(`sl."ledgerDate" >= $${paramIdx}`);
      conditions.purchase.push(`pl."ledgerDate" >= $${paramIdx}`);
      params.push(new Date(query.startDate));
      paramIdx++;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      conditions.sales.push(`sl."ledgerDate" <= $${paramIdx}`);
      conditions.purchase.push(`pl."ledgerDate" <= $${paramIdx}`);
      params.push(end);
      paramIdx++;
    }

    const salesPeriodWhere = conditions.sales.length > 0
      ? 'AND ' + conditions.sales.join(' AND ')
      : '';
    const purchasePeriodWhere = conditions.purchase.length > 0
      ? 'AND ' + conditions.purchase.join(' AND ')
      : '';

    const rows = await this.prisma.$queryRawUnsafe<{
      salesClientCount: bigint;
      purchaseClientCount: bigint;
      totalSalesOutstanding: number;
      totalPurchaseOutstanding: number;
      monthlySales: number;
      monthlyPurchases: number;
      monthlyReceipts: number;
      monthlyPayments: number;
    }[]>(
      `SELECT
        -- 매출거래처 수 (기간 내 거래 있는)
        (SELECT COUNT(DISTINCT sl."clientId")
         FROM sales_ledgers sl
         WHERE sl."salesStatus" != 'CANCELLED' ${salesPeriodWhere}
        ) AS "salesClientCount",

        -- 매입거래처 수 (기간 내 거래 있는)
        (SELECT COUNT(DISTINCT pl."supplierId")
         FROM purchase_ledgers pl
         WHERE pl."purchaseStatus" != 'CANCELLED' ${purchasePeriodWhere}
        ) AS "purchaseClientCount",

        -- 총 매출 미수잔액
        (SELECT COALESCE(SUM(sl."outstandingAmount"), 0)::float
         FROM sales_ledgers sl
         WHERE sl."salesStatus" != 'CANCELLED'
           AND sl."paymentStatus" IN ('unpaid', 'partial', 'overdue')
        ) AS "totalSalesOutstanding",

        -- 총 매입 미지급잔액
        (SELECT COALESCE(SUM(pl."outstandingAmount"), 0)::float
         FROM purchase_ledgers pl
         WHERE pl."purchaseStatus" != 'CANCELLED'
           AND pl."paymentStatus" IN ('unpaid', 'partial', 'overdue')
        ) AS "totalPurchaseOutstanding",

        -- 당월 매출
        (SELECT COALESCE(SUM(sl."totalAmount"), 0)::float
         FROM sales_ledgers sl
         WHERE sl."salesStatus" != 'CANCELLED'
           AND sl."ledgerDate" >= $1 AND sl."ledgerDate" <= $2
        ) AS "monthlySales",

        -- 당월 매입
        (SELECT COALESCE(SUM(pl."totalAmount"), 0)::float
         FROM purchase_ledgers pl
         WHERE pl."purchaseStatus" != 'CANCELLED'
           AND pl."ledgerDate" >= $1 AND pl."ledgerDate" <= $2
        ) AS "monthlyPurchases",

        -- 당월 수금
        (SELECT COALESCE(SUM(sr.amount), 0)::float
         FROM sales_receipts sr
         INNER JOIN sales_ledgers sl ON sl.id = sr."salesLedgerId"
         WHERE sl."salesStatus" != 'CANCELLED'
           AND sr."receiptDate" >= $1 AND sr."receiptDate" <= $2
        ) AS "monthlyReceipts",

        -- 당월 지급
        (SELECT COALESCE(SUM(pp.amount), 0)::float
         FROM purchase_payments pp
         INNER JOIN purchase_ledgers pl ON pl.id = pp."purchaseLedgerId"
         WHERE pl."purchaseStatus" != 'CANCELLED'
           AND pp."paymentDate" >= $1 AND pp."paymentDate" <= $2
        ) AS "monthlyPayments"`,
      ...params,
    );

    const stats = rows[0] || {
      salesClientCount: 0n,
      purchaseClientCount: 0n,
      totalSalesOutstanding: 0,
      totalPurchaseOutstanding: 0,
      monthlySales: 0,
      monthlyPurchases: 0,
      monthlyReceipts: 0,
      monthlyPayments: 0,
    };

    return {
      salesClientCount: Number(stats.salesClientCount),
      purchaseClientCount: Number(stats.purchaseClientCount),
      totalSalesOutstanding: Number(stats.totalSalesOutstanding),
      totalPurchaseOutstanding: Number(stats.totalPurchaseOutstanding),
      netOutstanding: Number(stats.totalSalesOutstanding) - Number(stats.totalPurchaseOutstanding),
      currentMonth: {
        sales: Number(stats.monthlySales),
        purchases: Number(stats.monthlyPurchases),
        receipts: Number(stats.monthlyReceipts),
        payments: Number(stats.monthlyPayments),
        period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      },
    };
  }

  // ===== Helper: 거래 유형 라벨 =====
  private getTransactionTypeLabel(txType: string): string {
    switch (txType) {
      case 'SALES': return '매출';
      case 'RECEIPT': return '수금';
      case 'PURCHASE': return '매입';
      case 'PAYMENT': return '지급';
      default: return txType;
    }
  }

  // ===== Helper: 기간별 그룹핑 =====
  private groupTransactionsByPeriod(
    transactions: { txDate: Date; txType: string; description: string; debit: number; credit: number; refNumber: string }[],
    periodUnit: PeriodUnit,
  ): { periodKey: string; periodLabel: string; transactions: typeof transactions }[] {
    const grouped = new Map<string, { periodLabel: string; transactions: typeof transactions }>();

    for (const tx of transactions) {
      const date = tx.txDate;
      let periodKey: string;
      let periodLabel: string;

      switch (periodUnit) {
        case PeriodUnit.MONTHLY:
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          periodLabel = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
          break;
        case PeriodUnit.QUARTERLY: {
          const quarter = Math.ceil((date.getMonth() + 1) / 3);
          periodKey = `${date.getFullYear()}-Q${quarter}`;
          periodLabel = `${date.getFullYear()}년 ${quarter}분기`;
          break;
        }
        case PeriodUnit.YEARLY:
          periodKey = `${date.getFullYear()}`;
          periodLabel = `${date.getFullYear()}년`;
          break;
        default:
          periodKey = date.toISOString().slice(0, 10);
          periodLabel = date.toISOString().slice(0, 10);
          break;
      }

      if (!grouped.has(periodKey)) {
        grouped.set(periodKey, { periodLabel, transactions: [] });
      }
      grouped.get(periodKey)!.transactions.push(tx);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([periodKey, data]) => ({
        periodKey,
        periodLabel: data.periodLabel,
        transactions: data.transactions,
      }));
  }
}

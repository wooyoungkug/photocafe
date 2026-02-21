import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // ===== 미수금 대시보드 데이터 =====
  async getReceivablesDashboard() {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);
    const date30 = subDays(now, 30);
    const date60 = subDays(now, 60);
    const date90 = subDays(now, 90);

    // 1. 전체 미수금 현황
    const totalReceivables = await this.prisma.salesLedger.aggregate({
      where: {
        paymentStatus: { in: ['unpaid', 'partial', 'overdue'] },
        salesStatus: { not: 'CANCELLED' },
      },
      _sum: { outstandingAmount: true },
      _count: { id: true },
    });

    // 2. 연체 미수금 (결제기한 초과)
    const overdueReceivables = await this.prisma.salesLedger.aggregate({
      where: {
        paymentStatus: { in: ['unpaid', 'partial'] },
        dueDate: { lt: now },
        salesStatus: { not: 'CANCELLED' },
      },
      _sum: { outstandingAmount: true },
      _count: { id: true },
    });

    // 3. 당월 매출/수금
    const monthlyData = await this.prisma.salesLedger.aggregate({
      where: {
        ledgerDate: { gte: monthStart },
        salesStatus: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true, receivedAmount: true },
    });

    // 4. 당년 누적 매출/수금
    const yearlyData = await this.prisma.salesLedger.aggregate({
      where: {
        ledgerDate: { gte: yearStart },
        salesStatus: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true, receivedAmount: true },
    });

    // 5. 미수금 거래처 수
    const clientsWithReceivables = await this.prisma.salesLedger.findMany({
      where: {
        paymentStatus: { in: ['unpaid', 'partial', 'overdue'] },
        salesStatus: { not: 'CANCELLED' },
      },
      select: { clientId: true },
      distinct: ['clientId'],
    });

    // 6. Aging 분석
    const agingData = await this.prisma.$queryRaw<
      { under30: number; days30to60: number; days60to90: number; over90: number }[]
    >(
      Prisma.sql`SELECT
         SUM(CASE WHEN "ledgerDate" >= ${date30} THEN "outstandingAmount" ELSE 0 END)::float as under30,
         SUM(CASE WHEN "ledgerDate" >= ${date60} AND "ledgerDate" < ${date30} THEN "outstandingAmount" ELSE 0 END)::float as days30to60,
         SUM(CASE WHEN "ledgerDate" >= ${date90} AND "ledgerDate" < ${date60} THEN "outstandingAmount" ELSE 0 END)::float as days60to90,
         SUM(CASE WHEN "ledgerDate" < ${date90} THEN "outstandingAmount" ELSE 0 END)::float as over90
       FROM sales_ledgers
       WHERE "paymentStatus" IN ('unpaid', 'partial', 'overdue')
         AND "salesStatus" != 'CANCELLED'`,
    );

    // 7. 상위 미수금 거래처 (Top 10)
    const topClients = await this.prisma.$queryRaw<
      {
        clientId: string;
        clientName: string;
        clientCode: string;
        outstanding: number;
        ledgerCount: bigint;
      }[]
    >(
      Prisma.sql`SELECT sl."clientId",
              sl."clientName",
              c."clientCode",
              SUM(sl."outstandingAmount")::float as outstanding,
              COUNT(sl.id) as "ledgerCount"
       FROM sales_ledgers sl
       JOIN clients c ON c.id = sl."clientId"
       WHERE sl."paymentStatus" IN ('unpaid', 'partial', 'overdue')
         AND sl."salesStatus" != 'CANCELLED'
       GROUP BY sl."clientId", sl."clientName", c."clientCode"
       ORDER BY outstanding DESC
       LIMIT 10`,
    );

    // 8. 월별 수금 추이 (최근 6개월)
    const sixMonthsAgo = subDays(now, 180);
    const monthlyCollection = await this.prisma.$queryRaw<
      { month: string; received: number; count: bigint }[]
    >(
      Prisma.sql`SELECT TO_CHAR("ledgerDate", 'YYYY-MM') as month,
              SUM("receivedAmount")::float as received,
              COUNT(id) as count
       FROM sales_ledgers
       WHERE "ledgerDate" >= ${sixMonthsAgo}
         AND "salesStatus" != 'CANCELLED'
       GROUP BY month
       ORDER BY month ASC`,
    );

    // 9. 당월 수금 예정 (DueDate 기준)
    const monthEnd = endOfMonth(now);
    const dueThisMonth = await this.prisma.salesLedger.aggregate({
      where: {
        paymentStatus: { in: ['unpaid', 'partial'] },
        dueDate: { gte: monthStart, lte: monthEnd },
        salesStatus: { not: 'CANCELLED' },
      },
      _sum: { outstandingAmount: true },
      _count: { id: true },
    });

    return {
      summary: {
        totalReceivables: Number(totalReceivables._sum.outstandingAmount || 0),
        receivableCount: totalReceivables._count.id,
        overdueAmount: Number(overdueReceivables._sum.outstandingAmount || 0),
        overdueCount: overdueReceivables._count.id,
        clientCount: clientsWithReceivables.length,
        monthlySales: Number(monthlyData._sum.totalAmount || 0),
        monthlyReceived: Number(monthlyData._sum.receivedAmount || 0),
        yearlySales: Number(yearlyData._sum.totalAmount || 0),
        yearlyReceived: Number(yearlyData._sum.receivedAmount || 0),
        dueThisMonth: Number(dueThisMonth._sum.outstandingAmount || 0),
        dueThisMonthCount: dueThisMonth._count.id,
      },
      aging: {
        under30: Number(agingData[0]?.under30 || 0),
        days30to60: Number(agingData[0]?.days30to60 || 0),
        days60to90: Number(agingData[0]?.days60to90 || 0),
        over90: Number(agingData[0]?.over90 || 0),
      },
      topClients: topClients.map(c => ({
        clientId: c.clientId,
        clientName: c.clientName,
        clientCode: c.clientCode,
        outstanding: Number(c.outstanding),
        ledgerCount: Number(c.ledgerCount),
      })),
      monthlyCollection: monthlyCollection.map(m => ({
        month: m.month,
        received: Number(m.received),
        count: Number(m.count),
      })),
    };
  }
}

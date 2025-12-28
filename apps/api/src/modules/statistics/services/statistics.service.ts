import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { StatisticsQueryDto, ClientStatisticsQueryDto, ProductStatisticsQueryDto } from '../dto';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  // ==================== 대시보드 요약 ====================
  async getDashboardSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const [
      todayOrders,
      monthOrders,
      lastMonthOrders,
      pendingOrders,
      inProductionOrders,
      totalClients,
      activeClients,
    ] = await Promise.all([
      // 오늘 주문 건수 및 매출
      this.prisma.order.aggregate({
        where: { orderedAt: { gte: today } },
        _count: { id: true },
        _sum: { finalAmount: true },
      }),
      // 이번 달 주문
      this.prisma.order.aggregate({
        where: { orderedAt: { gte: thisMonth } },
        _count: { id: true },
        _sum: { finalAmount: true },
      }),
      // 지난 달 주문
      this.prisma.order.aggregate({
        where: {
          orderedAt: { gte: lastMonth, lte: lastMonthEnd },
        },
        _count: { id: true },
        _sum: { finalAmount: true },
      }),
      // 접수대기 주문
      this.prisma.order.count({
        where: { status: 'pending_receipt' },
      }),
      // 생산중 주문
      this.prisma.order.count({
        where: { status: 'in_production' },
      }),
      // 전체 거래처
      this.prisma.client.count(),
      // 활성 거래처 (최근 30일 주문)
      this.prisma.client.count({
        where: {
          orders: {
            some: {
              orderedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          },
        },
      }),
    ]);

    const monthGrowth =
      lastMonthOrders._sum.finalAmount && monthOrders._sum.finalAmount
        ? ((Number(monthOrders._sum.finalAmount) - Number(lastMonthOrders._sum.finalAmount)) /
            Number(lastMonthOrders._sum.finalAmount)) *
          100
        : 0;

    return {
      today: {
        orderCount: todayOrders._count.id,
        revenue: Number(todayOrders._sum.finalAmount) || 0,
      },
      thisMonth: {
        orderCount: monthOrders._count.id,
        revenue: Number(monthOrders._sum.finalAmount) || 0,
        growthRate: Math.round(monthGrowth * 10) / 10,
      },
      lastMonth: {
        orderCount: lastMonthOrders._count.id,
        revenue: Number(lastMonthOrders._sum.finalAmount) || 0,
      },
      orders: {
        pending: pendingOrders,
        inProduction: inProductionOrders,
      },
      clients: {
        total: totalClients,
        active: activeClients,
      },
    };
  }

  // ==================== 매출 통계 ====================
  async getSalesStatistics(query: StatisticsQueryDto) {
    const { startDate, endDate, groupBy = 'day' } = query;

    const where: Prisma.OrderWhereInput = {
      status: { not: 'cancelled' },
      ...(startDate || endDate
        ? {
            orderedAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    };

    // 기간별 매출 집계
    const orders = await this.prisma.order.findMany({
      where,
      select: {
        orderedAt: true,
        finalAmount: true,
        productPrice: true,
        tax: true,
      },
      orderBy: { orderedAt: 'asc' },
    });

    // 그룹화
    const grouped = new Map<string, { revenue: number; count: number; tax: number }>();

    for (const order of orders) {
      const date = order.orderedAt;
      let key: string;

      switch (groupBy) {
        case 'year':
          key = date.getFullYear().toString();
          break;
        case 'month':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().slice(0, 10);
          break;
        default:
          key = date.toISOString().slice(0, 10);
      }

      const current = grouped.get(key) || { revenue: 0, count: 0, tax: 0 };
      current.revenue += Number(order.finalAmount);
      current.tax += Number(order.tax);
      current.count += 1;
      grouped.set(key, current);
    }

    const data = Array.from(grouped.entries())
      .map(([period, stats]) => ({
        period,
        ...stats,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const totals = data.reduce(
      (acc, curr) => ({
        revenue: acc.revenue + curr.revenue,
        count: acc.count + curr.count,
        tax: acc.tax + curr.tax,
      }),
      { revenue: 0, count: 0, tax: 0 },
    );

    return {
      data,
      totals,
      period: { startDate, endDate, groupBy },
    };
  }

  // ==================== 거래처별 통계 ====================
  async getClientStatistics(query: ClientStatisticsQueryDto) {
    const { startDate, endDate, clientId, groupId } = query;

    const where: Prisma.OrderWhereInput = {
      status: { not: 'cancelled' },
      ...(clientId && { clientId }),
      ...(groupId && { client: { groupId } }),
      ...(startDate || endDate
        ? {
            orderedAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    };

    const clientStats = await this.prisma.order.groupBy({
      by: ['clientId'],
      where,
      _count: { id: true },
      _sum: { finalAmount: true },
    });

    // 거래처 정보 조회
    const clientIds = clientStats.map((s) => s.clientId);
    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds } },
      include: {
        group: {
          select: { id: true, groupName: true },
        },
      },
    });

    const clientMap = new Map(clients.map((c) => [c.id, c]));

    const data = clientStats
      .map((stat) => {
        const client = clientMap.get(stat.clientId);
        return {
          clientId: stat.clientId,
          clientCode: client?.clientCode,
          clientName: client?.clientName,
          groupName: client?.group?.groupName,
          orderCount: stat._count.id,
          revenue: Number(stat._sum.finalAmount) || 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return {
      data,
      totals: {
        clientCount: data.length,
        orderCount: data.reduce((sum, d) => sum + d.orderCount, 0),
        revenue: data.reduce((sum, d) => sum + d.revenue, 0),
      },
    };
  }

  // ==================== 제본방법별 통계 ====================
  async getBindingStatistics(query: StatisticsQueryDto) {
    const { startDate, endDate } = query;

    const where: Prisma.OrderItemWhereInput = {
      order: {
        status: { not: 'cancelled' },
        ...(startDate || endDate
          ? {
              orderedAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
    };

    const stats = await this.prisma.orderItem.groupBy({
      by: ['bindingType'],
      where,
      _count: { id: true },
      _sum: { quantity: true, totalPrice: true },
    });

    const data = stats
      .map((stat) => ({
        bindingType: stat.bindingType,
        orderCount: stat._count.id,
        quantity: stat._sum.quantity || 0,
        revenue: Number(stat._sum.totalPrice) || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      data,
      totals: {
        orderCount: data.reduce((sum, d) => sum + d.orderCount, 0),
        quantity: data.reduce((sum, d) => sum + d.quantity, 0),
        revenue: data.reduce((sum, d) => sum + d.revenue, 0),
      },
    };
  }

  // ==================== 상품별 통계 ====================
  async getProductStatistics(query: ProductStatisticsQueryDto) {
    const { startDate, endDate, categoryId } = query;

    const where: Prisma.OrderItemWhereInput = {
      order: {
        status: { not: 'cancelled' },
        ...(startDate || endDate
          ? {
              orderedAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
    };

    const stats = await this.prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where,
      _count: { id: true },
      _sum: { quantity: true, totalPrice: true },
    });

    const data = stats
      .map((stat) => ({
        productId: stat.productId,
        productName: stat.productName,
        orderCount: stat._count.id,
        quantity: stat._sum.quantity || 0,
        revenue: Number(stat._sum.totalPrice) || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20); // 상위 20개

    return {
      data,
      totals: {
        productCount: stats.length,
        orderCount: stats.reduce((sum, d) => sum + d._count.id, 0),
        quantity: stats.reduce((sum, d) => sum + (d._sum.quantity || 0), 0),
        revenue: stats.reduce((sum, d) => sum + Number(d._sum.totalPrice || 0), 0),
      },
    };
  }

  // ==================== 월별 추이 ====================
  async getMonthlyTrend(months: number = 12) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        status: { not: 'cancelled' },
        orderedAt: { gte: startDate, lte: endDate },
      },
      select: {
        orderedAt: true,
        finalAmount: true,
      },
    });

    const monthly = new Map<string, { revenue: number; count: number }>();

    for (const order of orders) {
      const key = `${order.orderedAt.getFullYear()}-${(order.orderedAt.getMonth() + 1).toString().padStart(2, '0')}`;
      const current = monthly.get(key) || { revenue: 0, count: 0 };
      current.revenue += Number(order.finalAmount);
      current.count += 1;
      monthly.set(key, current);
    }

    return Array.from(monthly.entries())
      .map(([month, stats]) => ({ month, ...stats }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}

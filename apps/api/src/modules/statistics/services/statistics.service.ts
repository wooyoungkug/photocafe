import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { StatisticsQueryDto, ClientStatisticsQueryDto, ProductStatisticsQueryDto, CategoryStatisticsQueryDto } from '../dto';

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
        orderCount: data.reduce((sum: number, d) => sum + d.orderCount, 0),
        revenue: data.reduce((sum: number, d) => sum + d.revenue, 0),
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
        orderCount: data.reduce((sum: number, d) => sum + d.orderCount, 0),
        quantity: data.reduce((sum: number, d) => sum + d.quantity, 0),
        revenue: data.reduce((sum: number, d) => sum + d.revenue, 0),
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
        orderCount: stats.reduce((sum: number, d) => sum + d._count.id, 0),
        quantity: stats.reduce((sum: number, d) => sum + (d._sum.quantity || 0), 0),
        revenue: stats.reduce((sum: number, d) => sum + Number(d._sum.totalPrice || 0), 0),
      },
    };
  }

  // ==================== 카테고리별 통계 ====================
  async getCategoryStatistics(query: CategoryStatisticsQueryDto) {
    const { startDate, endDate, categoryId, level } = query;

    const whereOrder: Prisma.OrderWhereInput = {
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

    // 주문 항목 조회
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: whereOrder,
      },
      select: {
        quantity: true,
        totalPrice: true,
        productId: true,
      },
    });

    // Product ID로 Category 정보 조회
    const productIds = [...new Set(orderItems.map(item => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        categoryId: true,
      },
    });

    const productCategoryMap = new Map(
      products.map(p => [p.id, p.categoryId])
    );

    // 카테고리별로 집계
    const categoryStats = new Map<string, { orderCount: number; quantity: number; revenue: number }>();

    for (const item of orderItems) {
      const catId = productCategoryMap.get(item.productId);
      if (!catId) continue;

      // categoryId 필터
      if (categoryId && catId !== categoryId) continue;

      const current = categoryStats.get(catId) || { orderCount: 0, quantity: 0, revenue: 0 };
      current.orderCount += 1;
      current.quantity += item.quantity;
      current.revenue += Number(item.totalPrice);
      categoryStats.set(catId, current);
    }

    // Category 정보 조회
    const categoryIds = [...categoryStats.keys()];
    const categories = await this.prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        ...(level && { level }),
      },
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    // 결과 정리
    const data = [...categoryStats.entries()]
      .map(([id, stats]) => {
        const category = categoryMap.get(id);
        if (!category) return null;
        return {
          categoryId: id,
          categoryCode: category.code,
          categoryName: category.name,
          level: category.level,
          parentName: category.parent?.name || null,
          ...stats,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.revenue - a!.revenue);

    return {
      data,
      totals: {
        categoryCount: data.length,
        orderCount: data.reduce((sum: number, d) => sum + (d?.orderCount || 0), 0),
        quantity: data.reduce((sum: number, d) => sum + (d?.quantity || 0), 0),
        revenue: data.reduce((sum: number, d) => sum + (d?.revenue || 0), 0),
      },
      period: { startDate, endDate },
    };
  }

  // ==================== 카테고리별 통계 (트리 구조) ====================
  async getCategoryTreeStatistics(query: CategoryStatisticsQueryDto) {
    const { startDate, endDate } = query;

    // 모든 카테고리 조회
    const allCategories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }],
    });

    // 주문 데이터 집계
    const whereOrder: Prisma.OrderWhereInput = {
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

    const orderItems = await this.prisma.orderItem.findMany({
      where: { order: whereOrder },
      select: {
        quantity: true,
        totalPrice: true,
        productId: true,
      },
    });

    // Product -> Category 매핑
    const productIds = [...new Set(orderItems.map(item => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        categoryId: true,
      },
    });

    const productCategoryMap = new Map(
      products.map(p => [p.id, p.categoryId])
    );

    // 카테고리별 집계 (소분류 기준)
    const stats = new Map<string, { orderCount: number; quantity: number; revenue: number }>();
    for (const item of orderItems) {
      const catId = productCategoryMap.get(item.productId);
      if (!catId) continue;

      const current = stats.get(catId) || { orderCount: 0, quantity: 0, revenue: 0 };
      current.orderCount += 1;
      current.quantity += item.quantity;
      current.revenue += Number(item.totalPrice);
      stats.set(catId, current);
    }

    // 중분류 합계 계산 (소분류 합산)
    const mediumStats = new Map<string, { orderCount: number; quantity: number; revenue: number }>();
    for (const cat of allCategories) {
      if (cat.level === 'small' && cat.parentId) {
        const childStats = stats.get(cat.id);
        if (childStats) {
          const current = mediumStats.get(cat.parentId) || { orderCount: 0, quantity: 0, revenue: 0 };
          current.orderCount += childStats.orderCount;
          current.quantity += childStats.quantity;
          current.revenue += childStats.revenue;
          mediumStats.set(cat.parentId, current);
        }
      }
    }

    // 중분류 직접 매출도 합산
    for (const cat of allCategories) {
      if (cat.level === 'medium') {
        const directStats = stats.get(cat.id);
        if (directStats) {
          const current = mediumStats.get(cat.id) || { orderCount: 0, quantity: 0, revenue: 0 };
          current.orderCount += directStats.orderCount;
          current.quantity += directStats.quantity;
          current.revenue += directStats.revenue;
          mediumStats.set(cat.id, current);
        }
      }
    }

    // 대분류 합계 계산 (중분류 합산)
    const largeStats = new Map<string, { orderCount: number; quantity: number; revenue: number }>();
    for (const cat of allCategories) {
      if (cat.level === 'medium' && cat.parentId) {
        const midStats = mediumStats.get(cat.id);
        if (midStats) {
          const current = largeStats.get(cat.parentId) || { orderCount: 0, quantity: 0, revenue: 0 };
          current.orderCount += midStats.orderCount;
          current.quantity += midStats.quantity;
          current.revenue += midStats.revenue;
          largeStats.set(cat.parentId, current);
        }
      }
    }

    // 대분류 직접 매출도 합산
    for (const cat of allCategories) {
      if (cat.level === 'large') {
        const directStats = stats.get(cat.id);
        if (directStats) {
          const current = largeStats.get(cat.id) || { orderCount: 0, quantity: 0, revenue: 0 };
          current.orderCount += directStats.orderCount;
          current.quantity += directStats.quantity;
          current.revenue += directStats.revenue;
          largeStats.set(cat.id, current);
        }
      }
    }

    // 트리 구조로 변환
    const tree = allCategories
      .filter(cat => cat.level === 'large')
      .map(large => {
        const mediumChildren = allCategories
          .filter(cat => cat.parentId === large.id && cat.level === 'medium')
          .map(medium => {
            const smallChildren = allCategories
              .filter(cat => cat.parentId === medium.id && cat.level === 'small')
              .map(small => ({
                id: small.id,
                code: small.code,
                name: small.name,
                level: small.level,
                ...((stats.get(small.id)) || { orderCount: 0, quantity: 0, revenue: 0 }),
              }))
              .sort((a, b) => b.revenue - a.revenue);

            return {
              id: medium.id,
              code: medium.code,
              name: medium.name,
              level: medium.level,
              ...((mediumStats.get(medium.id)) || { orderCount: 0, quantity: 0, revenue: 0 }),
              children: smallChildren,
            };
          })
          .sort((a, b) => b.revenue - a.revenue);

        return {
          id: large.id,
          code: large.code,
          name: large.name,
          level: large.level,
          ...((largeStats.get(large.id)) || { orderCount: 0, quantity: 0, revenue: 0 }),
          children: mediumChildren,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = tree.reduce((sum: number, t) => sum + t.revenue, 0);

    return {
      data: tree,
      totals: {
        categoryCount: allCategories.length,
        orderCount: tree.reduce((sum: number, t) => sum + t.orderCount, 0),
        quantity: tree.reduce((sum: number, t) => sum + t.quantity, 0),
        revenue: totalRevenue,
      },
      period: { startDate, endDate },
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

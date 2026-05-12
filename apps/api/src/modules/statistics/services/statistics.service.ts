import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { StatisticsQueryDto, ClientStatisticsQueryDto, ProductStatisticsQueryDto, CategoryStatisticsQueryDto } from '../dto';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  async getStaffSalesScopeId(staffId?: string): Promise<string | undefined> {
    if (!staffId) return undefined;
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, isSuperAdmin: true, salesViewScope: true },
    });
    if (!staff || staff.isSuperAdmin) return undefined;
    return staff.salesViewScope === 'own' ? staff.id : undefined;
  }

  // ==================== 대시보드 요약 ====================
  async getDashboardSummary(staffScopeId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const orderScope = staffScopeId ? { client: { assignedManager: staffScopeId } } : {};
    const clientScope = staffScopeId ? { assignedManager: staffScopeId } : {};

    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - today.getDay()); // 이번 주 월요일 기준

    const [
      todayOrders,
      monthOrders,
      lastMonthOrders,
      pendingOrders,
      inProductionOrders,
      totalClients,
      activeClients,
      todayNewClients,
      weekNewClients,
      monthNewClients,
      recentNewClients,
    ] = await Promise.all([
      // 오늘 주문 건수 및 매출
      this.prisma.order.aggregate({
        where: { orderedAt: { gte: today }, ...orderScope },
        _count: { id: true },
        _sum: { finalAmount: true },
      }),
      // 이번 달 주문
      this.prisma.order.aggregate({
        where: { orderedAt: { gte: thisMonth }, ...orderScope },
        _count: { id: true },
        _sum: { finalAmount: true },
      }),
      // 지난 달 주문
      this.prisma.order.aggregate({
        where: {
          orderedAt: { gte: lastMonth, lte: lastMonthEnd },
          ...orderScope,
        },
        _count: { id: true },
        _sum: { finalAmount: true },
      }),
      // 접수대기 주문
      this.prisma.order.count({
        where: { status: 'pending_receipt', ...orderScope },
      }),
      // 생산중 주문
      this.prisma.order.count({
        where: { status: 'in_production', ...orderScope },
      }),
      // 전체 거래처
      this.prisma.client.count({ where: clientScope }),
      // 활성 거래처 (최근 30일 주문)
      staffScopeId
        ? this.prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(DISTINCT o."clientId")::int AS count
            FROM orders o
            INNER JOIN clients c ON c.id = o."clientId"
            WHERE o."orderedAt" >= NOW() - INTERVAL '30 days'
              AND c."assignedManager" = ${staffScopeId}`
            .then(rows => Number(rows[0]?.count ?? 0))
        : this.prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(DISTINCT "clientId")::int AS count
            FROM orders
            WHERE "orderedAt" >= NOW() - INTERVAL '30 days'`
            .then(rows => Number(rows[0]?.count ?? 0)),
      // 오늘 신규가입
      this.prisma.client.count({ where: { ...clientScope, createdAt: { gte: today } } }),
      // 이번 주 신규가입
      this.prisma.client.count({ where: { ...clientScope, createdAt: { gte: thisWeek } } }),
      // 이번 달 신규가입
      this.prisma.client.count({ where: { ...clientScope, createdAt: { gte: thisMonth } } }),
      // 최근 신규가입 10명
      this.prisma.client.findMany({
        where: clientScope,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          clientCode: true,
          clientName: true,
          email: true,
          mobile: true,
          memberType: true,
          oauthProvider: true,
          createdAt: true,
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
      newClients: {
        today: todayNewClients,
        week: weekNewClients,
        month: monthNewClients,
        recent: recentNewClients,
      },
    };
  }

  // ==================== 매출 통계 ====================
  async getSalesStatistics(query: StatisticsQueryDto, staffScopeId?: string) {
    const { startDate, endDate, groupBy = 'day' } = query;

    // DB 수준 집계: DATE_TRUNC 사용
    let truncExpr: string;
    switch (groupBy) {
      case 'year':
        truncExpr = `TO_CHAR("orderedAt", 'YYYY')`;
        break;
      case 'month':
        truncExpr = `TO_CHAR("orderedAt", 'YYYY-MM')`;
        break;
      case 'week':
        truncExpr = `TO_CHAR(DATE_TRUNC('week', "orderedAt"), 'YYYY-MM-DD')`;
        break;
      default:
        truncExpr = `TO_CHAR("orderedAt", 'YYYY-MM-DD')`;
    }

    const conditions: Prisma.Sql[] = [Prisma.sql`status != 'cancelled'`];

    if (startDate) {
      conditions.push(Prisma.sql`"orderedAt" >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(Prisma.sql`"orderedAt" <= ${endDate}`);
    }
    if (staffScopeId) {
      conditions.push(Prisma.sql`"clientId" IN (SELECT id FROM clients WHERE "assignedManager" = ${staffScopeId})`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    const rows = await this.prisma.$queryRaw<
      { period: string; revenue: number; count: bigint; tax: number }[]
    >(
      Prisma.sql`SELECT ${Prisma.raw(truncExpr)} as period,
              COALESCE(SUM("finalAmount"), 0)::float as revenue,
              COUNT(id) as count,
              COALESCE(SUM(tax), 0)::float as tax
       FROM orders
       WHERE ${whereClause}
       GROUP BY period
       ORDER BY period ASC`,
    );

    const data = rows.map(r => ({
      period: r.period,
      revenue: Number(r.revenue),
      count: Number(r.count),
      tax: Number(r.tax),
    }));

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
  async getClientStatistics(query: ClientStatisticsQueryDto, staffScopeId?: string) {
    const { startDate, endDate, clientId, groupId } = query;

    const clientFilter: Prisma.ClientWhereInput = {
      ...(staffScopeId && { assignedManager: staffScopeId }),
      ...(groupId && { groupId }),
    };
    const where: Prisma.OrderWhereInput = {
      status: { not: 'cancelled' },
      ...(clientId && { clientId }),
      ...(Object.keys(clientFilter).length > 0 && { client: clientFilter }),
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
    const clientIds = clientStats.map((s: { clientId: string }) => s.clientId);
    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds } },
      include: {
        group: {
          select: { id: true, groupName: true },
        },
      },
    });

    const clientMap = new Map(clients.map((c: any) => [c.id, c]));

    const data = clientStats
      .map((stat: any) => {
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
      .sort((a: any, b: any) => b.revenue - a.revenue);

    return {
      data,
      totals: {
        clientCount: data.length,
        orderCount: data.reduce((sum: number, d: any) => sum + d.orderCount, 0),
        revenue: data.reduce((sum: number, d: any) => sum + d.revenue, 0),
      },
    };
  }

  // ==================== 제본방법별 통계 ====================
  async getBindingStatistics(query: StatisticsQueryDto, staffScopeId?: string) {
    const { startDate, endDate } = query;

    const where: Prisma.OrderItemWhereInput = {
      order: {
        status: { not: 'cancelled' },
        ...(staffScopeId && { client: { assignedManager: staffScopeId } }),
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
      .map((stat: any) => ({
        bindingType: stat.bindingType,
        orderCount: stat._count.id,
        quantity: stat._sum.quantity || 0,
        revenue: Number(stat._sum.totalPrice) || 0,
      }))
      .sort((a: any, b: any) => b.revenue - a.revenue);

    return {
      data,
      totals: {
        orderCount: data.reduce((sum: number, d: any) => sum + d.orderCount, 0),
        quantity: data.reduce((sum: number, d: any) => sum + d.quantity, 0),
        revenue: data.reduce((sum: number, d: any) => sum + d.revenue, 0),
      },
    };
  }

  // ==================== 상품별 통계 ====================
  async getProductStatistics(query: ProductStatisticsQueryDto, staffScopeId?: string) {
    const { startDate, endDate, categoryId } = query;

    const where: Prisma.OrderItemWhereInput = {
      order: {
        status: { not: 'cancelled' },
        ...(staffScopeId && { client: { assignedManager: staffScopeId } }),
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
      .map((stat: any) => ({
        productId: stat.productId,
        productName: stat.productName,
        orderCount: stat._count.id,
        quantity: stat._sum.quantity || 0,
        revenue: Number(stat._sum.totalPrice) || 0,
      }))
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 20); // 상위 20개

    return {
      data,
      totals: {
        productCount: stats.length,
        orderCount: stats.reduce((sum: number, d: any) => sum + d._count.id, 0),
        quantity: stats.reduce((sum: number, d: any) => sum + (d._sum.quantity || 0), 0),
        revenue: stats.reduce((sum: number, d: any) => sum + Number(d._sum.totalPrice || 0), 0),
      },
    };
  }

  // ==================== 카테고리별 통계 ====================
  async getCategoryStatistics(query: CategoryStatisticsQueryDto, staffScopeId?: string) {
    const { startDate, endDate, categoryId, level } = query;

    // DB 수준 JOIN + GROUP BY로 집계
    const conditions: Prisma.Sql[] = [Prisma.sql`o.status != 'cancelled'`];

    if (startDate) {
      conditions.push(Prisma.sql`o."orderedAt" >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(Prisma.sql`o."orderedAt" <= ${endDate}`);
    }
    if (categoryId) {
      conditions.push(Prisma.sql`p."categoryId" = ${categoryId}`);
    }
    if (staffScopeId) {
      conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM clients c WHERE c.id = o."clientId" AND c."assignedManager" = ${staffScopeId})`);
    }

    conditions.push(Prisma.sql`p."categoryId" IS NOT NULL`);
    const whereClause = Prisma.join(conditions, ' AND ');

    const rows = await this.prisma.$queryRaw<
      { categoryId: string; orderCount: bigint; quantity: bigint; revenue: number }[]
    >(
      Prisma.sql`SELECT p."categoryId",
              COUNT(oi.id) as "orderCount",
              COALESCE(SUM(oi.quantity), 0) as quantity,
              COALESCE(SUM(oi."totalPrice"), 0)::float as revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi."orderId"
       JOIN products p ON p.id = oi."productId"
       WHERE ${whereClause}
       GROUP BY p."categoryId"
       ORDER BY revenue DESC`,
    );

    const categoryIds = rows.map(r => r.categoryId);

    // Category 정보 조회
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

    const categoryMap = new Map(categories.map((c: any) => [c.id, c]));

    const data = rows
      .map(row => {
        const category = categoryMap.get(row.categoryId);
        if (!category) return null;
        return {
          categoryId: row.categoryId,
          categoryCode: category.code,
          categoryName: category.name,
          level: category.level,
          parentName: category.parent?.name || null,
          orderCount: Number(row.orderCount),
          quantity: Number(row.quantity),
          revenue: Number(row.revenue),
        };
      })
      .filter(Boolean);

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
  async getCategoryTreeStatistics(query: CategoryStatisticsQueryDto, staffScopeId?: string) {
    const { startDate, endDate } = query;

    // 모든 카테고리 조회
    const allCategories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }],
    });

    // DB 수준 JOIN + GROUP BY로 카테고리별 집계
    const conditions: Prisma.Sql[] = [Prisma.sql`o.status != 'cancelled'`];

    if (startDate) {
      conditions.push(Prisma.sql`o."orderedAt" >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(Prisma.sql`o."orderedAt" <= ${endDate}`);
    }
    if (staffScopeId) {
      conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM clients c WHERE c.id = o."clientId" AND c."assignedManager" = ${staffScopeId})`);
    }

    conditions.push(Prisma.sql`p."categoryId" IS NOT NULL`);
    const whereClause = Prisma.join(conditions, ' AND ');

    const rows = await this.prisma.$queryRaw<
      { categoryId: string; orderCount: bigint; quantity: bigint; revenue: number }[]
    >(
      Prisma.sql`SELECT p."categoryId",
              COUNT(oi.id) as "orderCount",
              COALESCE(SUM(oi.quantity), 0) as quantity,
              COALESCE(SUM(oi."totalPrice"), 0)::float as revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi."orderId"
       JOIN products p ON p.id = oi."productId"
       WHERE ${whereClause}
       GROUP BY p."categoryId"`,
    );

    // 소분류별 집계 Map
    const stats = new Map<string, { orderCount: number; quantity: number; revenue: number }>();
    for (const row of rows) {
      stats.set(row.categoryId, {
        orderCount: Number(row.orderCount),
        quantity: Number(row.quantity),
        revenue: Number(row.revenue),
      });
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
      .filter((cat: any) => cat.level === 'large')
      .map((large: any) => {
        const mediumChildren = allCategories
          .filter((cat: any) => cat.parentId === large.id && cat.level === 'medium')
          .map((medium: any) => {
            const smallChildren = allCategories
              .filter((cat: any) => cat.parentId === medium.id && cat.level === 'small')
              .map((small: any) => ({
                id: small.id,
                code: small.code,
                name: small.name,
                level: small.level,
                ...((stats.get(small.id)) || { orderCount: 0, quantity: 0, revenue: 0 }),
              }))
              .sort((a: any, b: any) => b.revenue - a.revenue);

            return {
              id: medium.id,
              code: medium.code,
              name: medium.name,
              level: medium.level,
              ...((mediumStats.get(medium.id)) || { orderCount: 0, quantity: 0, revenue: 0 }),
              children: smallChildren,
            };
          })
          .sort((a: any, b: any) => b.revenue - a.revenue);

        return {
          id: large.id,
          code: large.code,
          name: large.name,
          level: large.level,
          ...((largeStats.get(large.id)) || { orderCount: 0, quantity: 0, revenue: 0 }),
          children: mediumChildren,
        };
      })
      .sort((a: any, b: any) => b.revenue - a.revenue);

    const totalRevenue = tree.reduce((sum: number, t: any) => sum + t.revenue, 0);

    return {
      data: tree,
      totals: {
        categoryCount: allCategories.length,
        orderCount: tree.reduce((sum: number, t: any) => sum + t.orderCount, 0),
        quantity: tree.reduce((sum: number, t: any) => sum + t.quantity, 0),
        revenue: totalRevenue,
      },
      period: { startDate, endDate },
    };
  }

  // ==================== 월별 추이 ====================
  async getMonthlyTrend(months: number = 12, staffScopeId?: string) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const staffScopeCondition = staffScopeId
      ? Prisma.sql`AND "clientId" IN (SELECT id FROM clients WHERE "assignedManager" = ${staffScopeId})`
      : Prisma.empty;

    // DB 수준 월별 집계
    const rows = await this.prisma.$queryRaw<
      { month: string; revenue: number; count: bigint }[]
    >(
      Prisma.sql`SELECT TO_CHAR("orderedAt", 'YYYY-MM') as month,
              COALESCE(SUM("finalAmount"), 0)::float as revenue,
              COUNT(id) as count
       FROM orders
       WHERE status != 'cancelled'
         AND "orderedAt" >= ${startDate}
         AND "orderedAt" <= ${endDate}
         ${staffScopeCondition}
       GROUP BY month
       ORDER BY month ASC`,
    );

    return rows.map(r => ({
      month: r.month,
      revenue: Number(r.revenue),
      count: Number(r.count),
    }));
  }

  // ==================== 공정 현황 대시보드 ====================
  async getProcessDashboard(staffScopeId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orderScope = staffScopeId ? { client: { assignedManager: staffScopeId } } : {};

    const [statusCounts, processCounts, urgentOrders, todayHistory] = await Promise.all([
      // ORDER_STATUS별 건수
      this.prisma.order.groupBy({
        by: ['status'],
        where: orderScope,
        _count: { id: true },
      }),
      // currentProcess별 건수 (생산진행 상태만)
      this.prisma.order.groupBy({
        by: ['currentProcess'],
        where: { status: 'in_production', ...orderScope },
        _count: { id: true },
      }),
      // 긴급 주문 (미완료)
      this.prisma.order.findMany({
        where: { isUrgent: true, status: { notIn: ['shipped', 'cancelled'] }, ...orderScope },
        select: {
          id: true,
          orderNumber: true,
          currentProcess: true,
          requestedDeliveryDate: true,
          orderedAt: true,
          client: { select: { clientName: true } },
        },
        orderBy: { requestedDeliveryDate: 'asc' },
      }),
      // 오늘 ProcessHistory toStatus별 건수
      this.prisma.processHistory.groupBy({
        by: ['toStatus'],
        where: { processedAt: { gte: today } },
        _count: { id: true },
      }),
    ]);

    return {
      statusCounts: statusCounts.reduce<Record<string, number>>(
        (acc, c) => ({ ...acc, [c.status]: c._count.id }),
        {},
      ),
      processCounts: processCounts.reduce<Record<string, number>>(
        (acc, c) => ({ ...acc, [c.currentProcess ?? 'unknown']: c._count.id }),
        {},
      ),
      urgentOrders: urgentOrders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        clientName: o.client.clientName,
        currentProcess: o.currentProcess,
        requestedDeliveryDate: o.requestedDeliveryDate,
        orderedAt: o.orderedAt,
      })),
      todayActivity: {
        total: todayHistory.reduce((sum, h) => sum + h._count.id, 0),
        byStatus: todayHistory.reduce<Record<string, number>>(
          (acc, h) => ({ ...acc, [h.toStatus]: h._count.id }),
          {},
        ),
      },
    };
  }
}

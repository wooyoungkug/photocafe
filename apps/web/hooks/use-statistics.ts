'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// 대시보드 요약 타입
export interface DashboardSummary {
  today: {
    orderCount: number;
    revenue: number;
  };
  thisMonth: {
    orderCount: number;
    revenue: number;
    growthRate: number;
  };
  lastMonth: {
    orderCount: number;
    revenue: number;
  };
  orders: {
    pending: number;
    inProduction: number;
  };
  clients: {
    total: number;
    active: number;
  };
}

// 월별 추이 타입
export interface MonthlyTrend {
  month: string;
  revenue: number;
  count: number;
}

const STATISTICS_KEY = 'statistics';

export function useDashboardSummary() {
  return useQuery({
    queryKey: [STATISTICS_KEY, 'dashboard'],
    queryFn: () => api.get<DashboardSummary>('/statistics/dashboard'),
    refetchInterval: 60000, // 1분마다 갱신
    retry: false, // 인증 실패시 재시도 안함
    staleTime: 30000, // 30초간 캐시 유지
  });
}

export function useMonthlyTrend(months: number = 12) {
  return useQuery({
    queryKey: [STATISTICS_KEY, 'monthly-trend', months],
    queryFn: () => api.get<MonthlyTrend[]>('/statistics/monthly-trend', { months }),
  });
}

export function useSalesStatistics(params?: {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
}) {
  return useQuery({
    queryKey: [STATISTICS_KEY, 'sales', params],
    queryFn: () => api.get('/statistics/sales', params),
    enabled: !!params?.startDate || !!params?.endDate,
  });
}

export function useClientStatistics(params?: {
  startDate?: string;
  endDate?: string;
  clientId?: string;
  groupId?: string;
}) {
  return useQuery({
    queryKey: [STATISTICS_KEY, 'clients', params],
    queryFn: () => api.get('/statistics/clients', params),
  });
}

export function useProductStatistics(params?: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
}) {
  return useQuery({
    queryKey: [STATISTICS_KEY, 'products', params],
    queryFn: () => api.get('/statistics/products', params),
  });
}

// 매출품목분류별 통계 타입
export interface SalesCategoryStatItem {
  id: string;
  code: string;
  name: string;
  depth: number;
  orderCount: number;
  quantity: number;
  revenue: number;
  children?: SalesCategoryStatItem[];
}

export interface SalesCategoryStatistics {
  data: SalesCategoryStatItem[];
  totals: {
    categoryCount: number;
    orderCount: number;
    quantity: number;
    revenue: number;
  };
  period: {
    startDate?: string;
    endDate?: string;
  };
}

export function useSalesCategoryStatistics(params?: {
  startDate?: string;
  endDate?: string;
  salesCategoryId?: string;
  depth?: number;
}) {
  return useQuery({
    queryKey: [STATISTICS_KEY, 'sales-categories', params],
    queryFn: () => api.get<SalesCategoryStatistics>('/statistics/sales-categories', params as Record<string, string | number | boolean | undefined>),
  });
}

export function useSalesCategoryTreeStatistics(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: [STATISTICS_KEY, 'sales-categories', 'tree', params],
    queryFn: () => api.get<SalesCategoryStatistics>('/statistics/sales-categories/tree', params as Record<string, string | number | boolean | undefined>),
  });
}

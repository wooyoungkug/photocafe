import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type AnalyticsPeriod = 'today' | '7d' | '30d' | '90d';

export interface AnalyticsStats {
  totalViews: number;
  koreaViews: number;
  overseasViews: number;
  uniqueSessions: number;
  period: AnalyticsPeriod;
  startDate: string;
  endDate: string;
}

export interface TopPage {
  path: string;
  count: number;
  percentage: number;
}

export interface OsStat {
  os: string;
  count: number;
  percentage: number;
}

export interface GeoStats {
  korea: { count: number; percentage: number };
  overseas: { count: number; percentage: number };
  topKoreaCities: Array<{ city: string | null; count: number }>;
  topOverseasCountries: Array<{ country: string | null; count: number }>;
}

export interface TrendPoint {
  date: string;
  count: number;
}

const STALE_TIME = 5 * 60 * 1000; // 5분

export function useAnalyticsStats(period: AnalyticsPeriod = '30d') {
  return useQuery({
    queryKey: ['analytics', 'stats', period],
    queryFn: () => api.get<AnalyticsStats>('/analytics/stats', { period }),
    staleTime: STALE_TIME,
  });
}

export function useTopPages(period: AnalyticsPeriod = '30d', limit = 10) {
  return useQuery({
    queryKey: ['analytics', 'top-pages', period, limit],
    queryFn: () =>
      api.get<TopPage[]>('/analytics/top-pages', { period, limit }),
    staleTime: STALE_TIME,
  });
}

export function useOsStats(period: AnalyticsPeriod = '30d') {
  return useQuery({
    queryKey: ['analytics', 'os-stats', period],
    queryFn: () => api.get<OsStat[]>('/analytics/os-stats', { period }),
    staleTime: STALE_TIME,
  });
}

export function useGeoStats(period: AnalyticsPeriod = '30d') {
  return useQuery({
    queryKey: ['analytics', 'geo-stats', period],
    queryFn: () => api.get<GeoStats>('/analytics/geo-stats', { period }),
    staleTime: STALE_TIME,
  });
}

export type TrendGranularity = 'daily' | 'monthly' | 'yearly';

export function useAnalyticsTrend(period: AnalyticsPeriod = '30d', granularity: TrendGranularity = 'daily') {
  return useQuery({
    queryKey: ['analytics', 'trend', period, granularity],
    queryFn: () => api.get<TrendPoint[]>('/analytics/trend', { period, granularity }),
    staleTime: STALE_TIME,
  });
}

export interface IpStat {
  ip: string;
  count: number;
  lastVisit: string;
  country: string | null;
  city: string | null;
  isKorea: boolean;
  os: string | null;
  browser: string | null;
  suspicious: {
    ip: string;
    action: string;
    isActive: boolean;
    reason: string | null;
  } | null;
}

export function useIpStats(period: AnalyticsPeriod = '30d', limit = 50) {
  return useQuery({
    queryKey: ['analytics', 'ip-stats', period, limit],
    queryFn: () => api.get<IpStat[]>('/analytics/ip-stats', { period, limit }),
    staleTime: STALE_TIME,
  });
}

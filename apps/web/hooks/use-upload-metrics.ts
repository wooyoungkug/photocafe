import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MetricsPhaseStats {
    count: number;
    avgSpeedKbps: number;
    p10SpeedKbps: number;
    p20SpeedKbps: number;
    p30SpeedKbps: number;
    p40SpeedKbps: number;
    p50SpeedKbps: number;
    p60SpeedKbps: number;
    p70SpeedKbps: number;
    p80SpeedKbps: number;
    p90SpeedKbps: number;
    p95SpeedKbps: number;
    totalBytes: number;
}

export interface MetricsSpeedtestStats {
    count: number;
    avgSpeedKbps: number;
    p50SpeedKbps: number;
    p95SpeedKbps: number;
    maxSpeedKbps: number;
    totalBytes: number;
}

export interface MetricsSummary {
    range: string;
    since: string;
    phases: Record<string, MetricsPhaseStats>;
    speedtest?: MetricsSpeedtestStats;
}

export interface TimeseriesPoint {
    period: string;
    count: number;
    avgSpeedKbps: number;
    avgFileSize: number;
    avgDurationMs: number;
}

export interface TimeseriesResponse {
    data: TimeseriesPoint[];
    period: { startDate?: string; endDate?: string; groupBy: string };
}

export interface RecentMetric {
    id: string;
    kind: string;
    phase: string;
    endpoint: string | null;
    userId: string | null;
    userType: string | null;
    fileSize: number;
    durationMs: number;
    speedKbps: number;
    success: boolean;
    errorMessage: string | null;
    clientIp: string | null;
    countryCode: string | null;
    createdAt: string;
}

export function useUploadMetricsSummary(range: '1h' | '24h' | '7d' | '30d' = '24h') {
    return useQuery({
        queryKey: ['upload-metrics-summary', range],
        queryFn: () => api.get<MetricsSummary>('/upload/metrics/summary', { range }),
        refetchInterval: 30_000,
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    });
}

export type SizeBucket = 'all' | 'small' | 'medium' | 'large';

export function useUploadMetricsTimeseries(params: {
    kind?: 'real' | 'speedtest';
    phase?: 'client_to_api' | 'api_to_b2' | 'b2_download' | 'client_to_b2';
    groupBy?: 'hour' | 'day' | 'week' | 'month';
    sizeBucket?: SizeBucket;
    startDate?: string;
    endDate?: string;
}) {
    return useQuery({
        queryKey: ['upload-metrics-timeseries', params],
        queryFn: () =>
            api.get<TimeseriesResponse>('/upload/metrics/timeseries', {
                ...(params.kind ? { kind: params.kind } : {}),
                ...(params.phase ? { phase: params.phase } : {}),
                ...(params.groupBy ? { groupBy: params.groupBy } : {}),
                ...(params.sizeBucket && params.sizeBucket !== 'all' ? { sizeBucket: params.sizeBucket } : {}),
                ...(params.startDate ? { startDate: params.startDate } : {}),
                ...(params.endDate ? { endDate: params.endDate } : {}),
            }),
        refetchInterval: 60_000,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });
}

export function useUploadMetricsRecent(limit = 50, kind?: 'real' | 'speedtest') {
    return useQuery({
        queryKey: ['upload-metrics-recent', limit, kind],
        queryFn: () =>
            api.get<RecentMetric[]>('/upload/metrics/recent', {
                limit,
                ...(kind ? { kind } : {}),
            }),
        refetchInterval: 30_000,
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    });
}

export interface AggregatedStatRow {
    period: string;
    phase: string;
    count: number;
    avgSpeedKbps: number;
    p50SpeedKbps: number;
    p95SpeedKbps: number;
    totalBytes: number;
}

export interface AggregatedStatsResponse {
    periodType: string;
    rows: AggregatedStatRow[];
}

export function useUploadMetricsStats(period: 'day' | 'month' | 'quarter' | 'year' = 'month') {
    return useQuery({
        queryKey: ['upload-metrics-stats', period],
        queryFn: () =>
            api.get<AggregatedStatsResponse>('/upload/metrics/stats', { period }),
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export interface WeekdayStatRow {
    dow: number;
    phase: string;
    count: number;
    avgSpeedKbps: number;
    p50SpeedKbps: number;
    p95SpeedKbps: number;
    totalBytes: number;
}

export interface WeekdayStatsResponse {
    rows: WeekdayStatRow[];
}

export function useUploadMetricsWeekdayStats() {
    return useQuery({
        queryKey: ['upload-metrics-weekday-stats'],
        queryFn: () => api.get<WeekdayStatsResponse>('/upload/metrics/weekday-stats'),
        staleTime: 10 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export interface MetricsConfig {
    sampleRate: number;
    b2SampleRate: number;
    multipartChunkSize: number;     // bytes
    multipartConcurrency: number;
}

export function useUploadMetricsConfig() {
    return useQuery({
        queryKey: ['upload-metrics-config'],
        queryFn: () => api.get<MetricsConfig>('/upload/metrics/config'),
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
    });
}

export function useUpdateMetricsConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (patch: {
            sampleRate?: number;
            b2SampleRate?: number;
            multipartChunkSize?: number;
            multipartConcurrency?: number;
        }) => api.patch<MetricsConfig>('/upload/metrics/config', patch),
        onSuccess: (data) => {
            queryClient.setQueryData(['upload-metrics-config'], data);
        },
    });
}

export interface DiagnosticsInfo {
    ip: string | null;
    country: string | null;
    city: string | null;
    region: string | null;
    continent: string | null;
    cfRay: string | null;
    cfColo: string | null;     // 예: ICN, NRT, SIN
    userAgent: string | null;
    acceptLanguage: string | null;
    forwardedFor: string | null;
    protocol: string | null;
    server: { region: string; nodeVersion: string; nowIso: string };
}

export function useUploadDiagnostics() {
    return useQuery({
        queryKey: ['upload-diagnostics'],
        queryFn: () => api.get<DiagnosticsInfo>('/upload/diagnostics/me'),
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export interface StorageOverview {
    b2: {
        public: { bucket: string; fileCount: number; totalBytes: number };
        private: { bucket: string; fileCount: number; totalBytes: number };
        totalBytes: number;
        scannedAt: string;
        cacheAgeSeconds: number;
    };
    db: { sizeBytes: number; name: string };
    uploadTrend: {
        daily: Array<{ date: string; bytes: number; count: number }>;
        monthly: Array<{ month: string; bytes: number; count: number }>;
    };
    cost: {
        b2StorageMonthlyUsd: number;
        b2StorageMonthlyKrw: number;
        breakdown: { b2PublicUsd: number; b2PrivateUsd: number; totalUsd: number; totalKrw: number };
    };
}

export function useStorageOverview() {
    return useQuery({
        queryKey: ['storage-overview'],
        queryFn: () => api.get<StorageOverview>('/upload/metrics/storage-overview'),
        staleTime: 10 * 60_000,       // 10분 (B2 스캔이 오래 걸리므로 자주 호출 안 함)
        refetchInterval: 30 * 60_000, // 30분마다 자동 갱신
        refetchOnWindowFocus: false,
    });
}


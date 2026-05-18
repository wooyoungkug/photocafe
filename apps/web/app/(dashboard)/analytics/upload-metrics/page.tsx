'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { Gauge, Zap, Upload, RefreshCw, BarChart2, Database, HardDrive, DollarSign, TrendingUp } from 'lucide-react';
import {
    useUploadMetricsSummary,
    useUploadMetricsTimeseries,
    useUploadMetricsRecent,
    useUploadMetricsStats,
    useUploadMetricsWeekdayStats,
    useUploadMetricsConfig,
    useUpdateMetricsConfig,
    useStorageOverview,
    type AggregatedStatRow,
    type MetricsSummary,
    type StorageOverview,
} from '@/hooks/use-upload-metrics';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { DiagnosticsCard } from './_components/diagnostics-card';
import { BaselineTestCard } from './_components/baseline-test-card';
import { MultipartSettingsCard } from './_components/multipart-settings-card';
import { PathComparisonCard } from './_components/path-comparison-card';
import { TuningMatrixCard } from './_components/tuning-matrix-card';

const PHASE_LABEL: Record<string, string> = {
    client_to_api: '클라이언트 → API',
    api_to_b2: 'API → B2',
    client_to_b2: '클라이언트 → B2',
    b2_download: '다운로드',
};

function formatSpeed(kbps: number): string {
    if (!Number.isFinite(kbps) || kbps <= 0) return '—';
    if (kbps >= 1024) return `${(kbps / 1024).toFixed(2)} MB/s`;
    return `${kbps.toFixed(1)} KB/s`;
}

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
}

function formatDateTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString('ko-KR', { hour12: false });
    } catch {
        return iso;
    }
}

export default function UploadMetricsPage() {
    const [range, setRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
    const [groupBy, setGroupBy] = useState<'hour' | 'day'>('hour');
    const [statsPeriod, setStatsPeriod] = useState<'day' | 'month' | 'quarter' | 'year'>('month');
    const [recentPage, setRecentPage] = useState(1);
    const [sampleInput, setSampleInput] = useState<string>('');
    const [b2SampleInput, setB2SampleInput] = useState<string>('');
    const [trendTab, setTrendTab] = useState<'daily' | 'monthly'>('daily');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ sizeMb: number; durationMs: number; speedKbps: number } | null>(null);
    const [testingB2, setTestingB2] = useState(false);
    const [testResultB2, setTestResultB2] = useState<{ sizeMb: number; durationMs: number; speedKbps: number } | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const queryClient = useQueryClient();

    const summary = useUploadMetricsSummary(range);
    const tsClient = useUploadMetricsTimeseries({ phase: 'client_to_api', groupBy });
    const tsB2 = useUploadMetricsTimeseries({ phase: 'api_to_b2', groupBy });
    const recent = useUploadMetricsRecent(500);
    const stats = useUploadMetricsStats(statsPeriod);
    const weekdayStats = useUploadMetricsWeekdayStats();
    const config = useUploadMetricsConfig();
    const updateConfig = useUpdateMetricsConfig();
    const storageOverview = useStorageOverview();

    const clientPhase = summary.data?.phases?.client_to_api;    // 실측 클라이언트→API (presigned 이전 방식, 현재 거의 없음)
    const b2Phase = summary.data?.phases?.api_to_b2;            // API→B2 프로브 (512KB)
    const directPhase = summary.data?.phases?.client_to_b2;     // 클라이언트→B2 직접 멀티파트 업로드 (실제 업로드 경로)
    const speedtest = summary.data?.speedtest;                  // 속도테스트 별도 집계

    // 두 시계열을 period 기준으로 병합
    const mergedSeries = (() => {
        const map = new Map<string, { period: string; client?: number; b2?: number }>();
        for (const p of tsClient.data?.data ?? []) {
            map.set(p.period, { period: p.period, client: p.avgSpeedKbps });
        }
        for (const p of tsB2.data?.data ?? []) {
            const existing = map.get(p.period);
            if (existing) existing.b2 = p.avgSpeedKbps;
            else map.set(p.period, { period: p.period, b2: p.avgSpeedKbps });
        }
        return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
    })();

    async function runUploadTest(sizeMb: number) {
        if (testing) return;
        setTesting(true);
        setTestResult(null);
        try {
            const buf = new Uint8Array(sizeMb * 1024 * 1024);
            crypto.getRandomValues(buf.subarray(0, Math.min(buf.length, 65536)));
            const blob = new Blob([buf], { type: 'application/octet-stream' });
            const form = new FormData();
            form.append('file', blob, `speedtest-${sizeMb}mb.bin`);

            abortRef.current?.abort();
            abortRef.current = new AbortController();

            const start = performance.now();
            const res = await fetch(`${API_URL}/upload/speedtest/upload`, {
                method: 'POST',
                body: form,
                credentials: 'include',
                headers: { 'X-Auth-Context': 'staff' },
                signal: abortRef.current.signal,
            });
            const durationMs = performance.now() - start;
            if (!res.ok) {
                const body = await res.text();
                throw new Error(body || `HTTP ${res.status}`);
            }
            const totalBytes = sizeMb * 1024 * 1024;
            const speedKbps = totalBytes / 1024 / (durationMs / 1000);
            setTestResult({ sizeMb, durationMs, speedKbps });
            toast.success(`업로드 테스트 완료: ${formatSpeed(speedKbps)}`);
            queryClient.invalidateQueries({ queryKey: ['upload-metrics-summary'] });
            queryClient.invalidateQueries({ queryKey: ['upload-metrics-recent'] });
            queryClient.invalidateQueries({ queryKey: ['upload-metrics-timeseries'] });
        } catch (err: any) {
            toast.error(`테스트 실패: ${err?.message || '알 수 없는 오류'}`);
        } finally {
            setTesting(false);
        }
    }

    async function runB2UploadTest(sizeMb: number) {
        if (testingB2) return;
        setTestingB2(true);
        setTestResultB2(null);
        try {
            // 1) presigned URL 발급
            const presignRes = await fetch(`${API_URL}/upload/speedtest/b2-presign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Auth-Context': 'staff' },
                body: JSON.stringify({ sizeMb }),
                credentials: 'include',
            });
            if (!presignRes.ok) throw new Error(`presign 실패: HTTP ${presignRes.status}`);
            const { presignedUrl } = await presignRes.json();

            // 2) 랜덤 데이터 생성 후 B2에 직접 PUT
            const buf = new Uint8Array(sizeMb * 1024 * 1024);
            crypto.getRandomValues(buf.subarray(0, Math.min(buf.length, 65536)));
            const blob = new Blob([buf], { type: 'application/octet-stream' });

            const start = performance.now();
            const putRes = await fetch(presignedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/octet-stream' },
                body: blob,
            });
            const durationMs = performance.now() - start;
            if (!putRes.ok) throw new Error(`B2 PUT 실패: HTTP ${putRes.status}`);

            const totalBytes = sizeMb * 1024 * 1024;
            const speedKbps = totalBytes / 1024 / (durationMs / 1000);
            setTestResultB2({ sizeMb, durationMs, speedKbps });
            toast.success(`외실측 테스트 완료: ${formatSpeed(speedKbps)}`);

            // 3) 메트릭 기록
            void fetch(`${API_URL}/upload/metrics/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Auth-Context': 'staff' },
                credentials: 'include',
                body: JSON.stringify({ kind: 'speedtest', phase: 'client_to_b2', fileSize: totalBytes, durationMs }),
            }).catch(() => {});

            queryClient.invalidateQueries({ queryKey: ['upload-metrics-summary'] });
            queryClient.invalidateQueries({ queryKey: ['upload-metrics-recent'] });
        } catch (err: any) {
            toast.error(`외실측 테스트 실패: ${err?.message || '알 수 없는 오류'}`);
        } finally {
            setTestingB2(false);
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[24px] text-black font-normal">업로드 속도 모니터링</h1>
                    <p className="text-[14px] text-black font-normal mt-1">
                        실 업로드(API) {Math.round((config.data?.sampleRate ?? 0.1) * 100)}% · 외실측(B2 직접) {Math.round((config.data?.b2SampleRate ?? 0.3) * 100)}% 샘플링, 속도테스트는 100% 기록
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* 실 업로드 샘플링 비율 (API 인터셉터) */}
                    <div className="flex items-center gap-1">
                        <label htmlFor="sample-rate-input" className="text-[14px] text-black font-normal whitespace-nowrap">실 업로드 샘플</label>
                        <input
                            id="sample-rate-input"
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            title="실 업로드 샘플링 비율 (%)"
                            placeholder="0~100"
                            className="w-16 border rounded px-2 py-1 text-[14px] text-black text-center"
                            value={sampleInput !== '' ? sampleInput : Math.round((config.data?.sampleRate ?? 0.1) * 100).toString()}
                            onChange={(e) => setSampleInput(e.target.value)}
                            onBlur={() => {
                                const pct = parseFloat(sampleInput);
                                if (!Number.isFinite(pct)) return;
                                updateConfig.mutate({ sampleRate: pct / 100 }, {
                                    onSuccess: () => {
                                        setSampleInput('');
                                        toast.success(`실 업로드 샘플 ${pct}%로 변경됨`);
                                    },
                                    onError: () => toast.error('변경 실패'),
                                });
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                        />
                        <span className="text-[14px] text-black font-normal">%</span>
                    </div>
                    {/* 외실측(클라이언트→B2) 샘플링 비율 */}
                    <div className="flex items-center gap-1">
                        <label htmlFor="b2-sample-rate-input" className="text-[14px] text-black font-normal whitespace-nowrap">외실측 샘플</label>
                        <input
                            id="b2-sample-rate-input"
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            title="클라이언트→B2 직접 업로드 실측 샘플링 비율 (%)"
                            placeholder="0~100"
                            className="w-16 border rounded px-2 py-1 text-[14px] text-black text-center"
                            value={b2SampleInput !== '' ? b2SampleInput : Math.round((config.data?.b2SampleRate ?? 0.3) * 100).toString()}
                            onChange={(e) => setB2SampleInput(e.target.value)}
                            onBlur={() => {
                                const pct = parseFloat(b2SampleInput);
                                if (!Number.isFinite(pct)) return;
                                updateConfig.mutate({ b2SampleRate: pct / 100 }, {
                                    onSuccess: () => {
                                        setB2SampleInput('');
                                        window.localStorage.setItem('b2SampleRate', String(pct / 100));
                                        toast.success(`외실측 샘플 ${pct}%로 변경됨`);
                                    },
                                    onError: () => toast.error('변경 실패'),
                                });
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                        />
                        <span className="text-[14px] text-black font-normal">%</span>
                    </div>
                    <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
                        <TabsList>
                            <TabsTrigger value="1h">1시간</TabsTrigger>
                            <TabsTrigger value="24h">24시간</TabsTrigger>
                            <TabsTrigger value="7d">7일</TabsTrigger>
                            <TabsTrigger value="30d">30일</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            summary.refetch();
                            tsClient.refetch();
                            tsB2.refetch();
                            recent.refetch();
                        }}
                    >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        새로고침
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => storageOverview.refetch()}
                        disabled={storageOverview.isFetching}
                    >
                        <HardDrive className="w-4 h-4 mr-1" />
                        {storageOverview.isFetching ? '스캔 중...' : '스토리지 스캔'}
                    </Button>
                </div>
            </div>

            {/* 진단 정보 → 회선 진단 → 멀티파트 설정 → 경로 비교 → 청크/동시성 매트릭스 */}
            <DiagnosticsCard />
            <BaselineTestCard />
            <MultipartSettingsCard />
            <PathComparisonCard />
            <TuningMatrixCard />

            {/* 서버 스토리지 현황 */}
            {(() => {
                const so = storageOverview.data;
                const isLoading = storageOverview.isLoading;
                const isError = storageOverview.isError;

                function formatDateTimeShort(iso: string): string {
                    try {
                        return new Date(iso).toLocaleString('ko-KR', { hour12: false });
                    } catch {
                        return iso;
                    }
                }

                function formatCacheAge(seconds: number): string {
                    if (!Number.isFinite(seconds) || seconds < 0) return '—';
                    if (seconds < 60) return `${Math.round(seconds)}초 전`;
                    if (seconds < 3600) return `${Math.round(seconds / 60)}분 전`;
                    if (seconds < 86400) return `${Math.round(seconds / 3600)}시간 전`;
                    return `${Math.round(seconds / 86400)}일 전`;
                }

                if (isError) {
                    return (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
                                    <HardDrive className="w-5 h-5" /> 서버 스토리지 현황
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-6 space-y-3">
                                    <div className="text-[14px] text-black font-normal">스토리지 정보를 불러올 수 없습니다.</div>
                                    <Button variant="outline" size="sm" onClick={() => storageOverview.refetch()}>
                                        <RefreshCw className="w-4 h-4 mr-1" /> 재시도
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                }

                const trendData = so
                    ? (trendTab === 'daily' ? so.uploadTrend.daily : so.uploadTrend.monthly).map((d: any) => ({
                          period: trendTab === 'daily' ? d.date : d.month,
                          bytes: d.bytes,
                          count: d.count,
                          gb: d.bytes / 1024 ** 3,
                      }))
                    : [];

                // 최근 7개 항목 + 전 대비 증감 계산
                const recentTrend = trendData.slice(-7);
                const recentWithDiff = recentTrend.map((row, idx) => {
                    if (idx === 0) return { ...row, diffPct: null as number | null };
                    const prev = recentTrend[idx - 1].bytes;
                    if (!prev) return { ...row, diffPct: null };
                    return { ...row, diffPct: ((row.bytes - prev) / prev) * 100 };
                });

                return (
                    <div className="space-y-4">
                        <h2 className="text-[18px] text-black font-bold flex items-center gap-2">
                            <HardDrive className="w-5 h-5" /> 서버 스토리지 현황
                        </h2>

                        {/* KPI 카드 4개 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-[14px] text-black font-normal flex items-center gap-2">
                                        <HardDrive className="w-4 h-4" /> B2 총 보관 용량
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isLoading || !so ? (
                                        <div className="text-[14px] text-black font-normal">로딩 중...</div>
                                    ) : (
                                        <>
                                            <div className="text-[24px] text-black font-normal">{formatBytes(so.b2.totalBytes)}</div>
                                            <div className="text-[14px] text-black font-normal mt-1">
                                                public {so.b2.public.fileCount.toLocaleString()}개 / private {so.b2.private.fileCount.toLocaleString()}개
                                            </div>
                                            <div className="text-[13px] text-slate-500 font-normal mt-1">
                                                마지막 스캔 {formatDateTimeShort(so.b2.scannedAt)} ({formatCacheAge(so.b2.cacheAgeSeconds)})
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-[14px] text-black font-normal flex items-center gap-2">
                                        <Upload className="w-4 h-4" /> B2 Public 버킷
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isLoading || !so ? (
                                        <div className="text-[14px] text-black font-normal">로딩 중...</div>
                                    ) : (
                                        <>
                                            <div className="text-[24px] text-black font-normal">{formatBytes(so.b2.public.totalBytes)}</div>
                                            <div className="text-[14px] text-black font-normal mt-1">
                                                {so.b2.public.fileCount.toLocaleString()}개 파일
                                            </div>
                                            <div className="text-[13px] text-slate-500 font-normal mt-1">{so.b2.public.bucket}</div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-[14px] text-black font-normal flex items-center gap-2">
                                        <Database className="w-4 h-4" /> B2 Private 버킷
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isLoading || !so ? (
                                        <div className="text-[14px] text-black font-normal">로딩 중...</div>
                                    ) : (
                                        <>
                                            <div className="text-[24px] text-black font-normal">{formatBytes(so.b2.private.totalBytes)}</div>
                                            <div className="text-[14px] text-black font-normal mt-1">
                                                {so.b2.private.fileCount.toLocaleString()}개 파일
                                            </div>
                                            <div className="text-[13px] text-slate-500 font-normal mt-1">{so.b2.private.bucket}</div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-[14px] text-black font-normal flex items-center gap-2">
                                        <Database className="w-4 h-4" /> Railway DB
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isLoading || !so ? (
                                        <div className="text-[14px] text-black font-normal">로딩 중...</div>
                                    ) : (
                                        <>
                                            <div className="text-[24px] text-black font-normal">{formatBytes(so.db.sizeBytes)}</div>
                                            <div className="text-[14px] text-black font-normal mt-1">{so.db.name}</div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* 비용 카드 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" /> 예상 월 B2 스토리지 비용
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isLoading || !so ? (
                                    <div className="text-[14px] text-black font-normal">로딩 중...</div>
                                ) : (
                                    <>
                                        <div>
                                            <div className="text-[24px] text-black font-normal">
                                                ₩{so.cost.b2StorageMonthlyKrw.toLocaleString()}/월
                                            </div>
                                            <div className="text-[14px] text-black font-normal mt-1">
                                                ${so.cost.b2StorageMonthlyUsd.toFixed(2)}/월 · $0.006/GB 기준
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-[14px] text-black font-normal">
                                                <thead>
                                                    <tr className="border-b bg-slate-50">
                                                        <th className="text-left py-2 px-2">항목</th>
                                                        <th className="text-right py-2 px-2">용량</th>
                                                        <th className="text-right py-2 px-2">월 비용 (USD)</th>
                                                        <th className="text-right py-2 px-2">월 비용 (KRW)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr className="border-b">
                                                        <td className="py-2 px-2">B2 Public</td>
                                                        <td className="py-2 px-2 text-right">{formatBytes(so.b2.public.totalBytes)}</td>
                                                        <td className="py-2 px-2 text-right">${so.cost.breakdown.b2PublicUsd.toFixed(2)}</td>
                                                        <td className="py-2 px-2 text-right">
                                                            ₩{Math.round(so.cost.breakdown.b2PublicUsd * (so.cost.breakdown.totalKrw / Math.max(so.cost.breakdown.totalUsd, 0.0001))).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                    <tr className="border-b">
                                                        <td className="py-2 px-2">B2 Private</td>
                                                        <td className="py-2 px-2 text-right">{formatBytes(so.b2.private.totalBytes)}</td>
                                                        <td className="py-2 px-2 text-right">${so.cost.breakdown.b2PrivateUsd.toFixed(2)}</td>
                                                        <td className="py-2 px-2 text-right">
                                                            ₩{Math.round(so.cost.breakdown.b2PrivateUsd * (so.cost.breakdown.totalKrw / Math.max(so.cost.breakdown.totalUsd, 0.0001))).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                    <tr className="border-b font-bold">
                                                        <td className="py-2 px-2">합계</td>
                                                        <td className="py-2 px-2 text-right">{formatBytes(so.b2.totalBytes)}</td>
                                                        <td className="py-2 px-2 text-right">${so.cost.breakdown.totalUsd.toFixed(2)}</td>
                                                        <td className="py-2 px-2 text-right">₩{so.cost.breakdown.totalKrw.toLocaleString()}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="text-[13px] text-slate-500 font-normal">
                                            ※ Railway DB, API 호출 비용 별도 · 10GB 무료 구간 포함 미반영
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* 업로드 추세 차트 */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5" /> 일/월별 업로드 증감
                                    </CardTitle>
                                    <Tabs value={trendTab} onValueChange={(v) => setTrendTab(v as 'daily' | 'monthly')}>
                                        <TabsList>
                                            <TabsTrigger value="daily">일별(30일)</TabsTrigger>
                                            <TabsTrigger value="monthly">월별(12개월)</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isLoading || !so ? (
                                    <div className="text-[14px] text-black font-normal">로딩 중...</div>
                                ) : trendData.length === 0 ? (
                                    <div className="text-center py-6 text-slate-500 text-[14px]">추세 데이터가 없습니다.</div>
                                ) : (
                                    <>
                                        <div className="w-full h-[280px]">
                                            <ResponsiveContainer>
                                                <AreaChart data={trendData}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="period" />
                                                    <YAxis
                                                        tickFormatter={(v: number) => `${v.toFixed(1)} GB`}
                                                        label={{ value: 'GB', angle: -90, position: 'insideLeft' }}
                                                    />
                                                    <Tooltip
                                                        formatter={(value: any, name: any, item: any) => {
                                                            if (name === 'gb') {
                                                                const bytes = item?.payload?.bytes ?? 0;
                                                                return [formatBytes(bytes), '업로드'];
                                                            }
                                                            return [value, name];
                                                        }}
                                                        labelFormatter={(label: any, payload: any) => {
                                                            const cnt = payload?.[0]?.payload?.count;
                                                            return cnt != null ? `${label} · ${cnt}건` : label;
                                                        }}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="gb"
                                                        stroke="#3b82f6"
                                                        fill="#3b82f6"
                                                        fillOpacity={0.3}
                                                        name="업로드"
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-[14px] text-black font-normal">
                                                <thead>
                                                    <tr className="border-b bg-slate-50">
                                                        <th className="text-left py-2 px-2">{trendTab === 'daily' ? '날짜' : '월'}</th>
                                                        <th className="text-right py-2 px-2">업로드</th>
                                                        <th className="text-right py-2 px-2">건수</th>
                                                        <th className="text-right py-2 px-2">{trendTab === 'daily' ? '전일 대비' : '전월 대비'}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {recentWithDiff.map((row) => {
                                                        const diff = row.diffPct;
                                                        let diffEl: React.ReactNode = '—';
                                                        if (diff != null && Number.isFinite(diff)) {
                                                            if (diff > 0) {
                                                                diffEl = <span className="text-red-500">▲ {diff.toFixed(1)}%</span>;
                                                            } else if (diff < 0) {
                                                                diffEl = <span className="text-blue-500">▼ {Math.abs(diff).toFixed(1)}%</span>;
                                                            } else {
                                                                diffEl = <span className="text-slate-500">0.0%</span>;
                                                            }
                                                        }
                                                        return (
                                                            <tr key={row.period} className="border-b hover:bg-slate-50">
                                                                <td className="py-2 px-2 font-medium">{row.period}</td>
                                                                <td className="py-2 px-2 text-right">{formatBytes(row.bytes)}</td>
                                                                <td className="py-2 px-2 text-right">{row.count.toLocaleString()}</td>
                                                                <td className="py-2 px-2 text-right">{diffEl}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                );
            })()}

            {/* KPI 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[14px] text-black font-normal flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            {(directPhase?.count ?? 0) > 0
                                ? '클라이언트 → B2 (직접)'
                                : '클라이언트 → API (속도테스트)'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(directPhase?.count ?? 0) > 0 ? (
                            <>
                                <div className="text-[24px] text-black font-normal">
                                    {formatSpeed(directPhase?.avgSpeedKbps ?? 0)}
                                </div>
                                <div className="text-[14px] text-black font-normal mt-1">
                                    중앙값 {formatSpeed(directPhase?.p50SpeedKbps ?? 0)} · p95 {formatSpeed(directPhase?.p95SpeedKbps ?? 0)}
                                </div>
                                <div className="text-[14px] text-black font-normal mt-1">
                                    샘플 {directPhase?.count ?? 0}건 · 누적 {formatBytes(directPhase?.totalBytes ?? 0)}
                                </div>
                            </>
                        ) : speedtest && speedtest.count > 0 ? (
                            <>
                                <div className="text-[24px] text-black font-normal">
                                    {formatSpeed(speedtest.avgSpeedKbps)}
                                </div>
                                <div className="text-[14px] text-black font-normal mt-1">
                                    중앙값 {formatSpeed(speedtest.p50SpeedKbps)} · p95 {formatSpeed(speedtest.p95SpeedKbps)}
                                </div>
                                <div className="text-[14px] text-black font-normal mt-1">
                                    샘플 {speedtest.count}건 · 누적 {formatBytes(speedtest.totalBytes)}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-[24px] text-black font-normal">—</div>
                                <div className="text-[14px] text-black font-normal mt-1">데이터 없음</div>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[14px] text-black font-normal flex items-center gap-2">
                            <Zap className="w-4 h-4" /> API → B2 (B2 프로브)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-[24px] text-black font-normal">
                            {formatSpeed(b2Phase?.avgSpeedKbps ?? 0)}
                        </div>
                        <div className="text-[14px] text-black font-normal mt-1">
                            중앙값 {formatSpeed(b2Phase?.p50SpeedKbps ?? 0)} · p95 {formatSpeed(b2Phase?.p95SpeedKbps ?? 0)}
                        </div>
                        <div className="text-[14px] text-black font-normal mt-1">
                            샘플 {b2Phase?.count ?? 0}건 · 누적 {formatBytes(b2Phase?.totalBytes ?? 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[14px] text-black font-normal flex items-center gap-2">
                            <Gauge className="w-4 h-4" /> 병목 분석
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(() => {
                            const d = directPhase?.avgSpeedKbps ?? 0;
                            const b = b2Phase?.avgSpeedKbps ?? 0;
                            const st = speedtest?.avgSpeedKbps ?? 0;

                            // 1순위: 클라이언트→B2 직접 vs API→B2 프로브 비교
                            if (d > 0 && b > 0) {
                                if (b >= d) {
                                    const ratio = b / d;
                                    return (
                                        <>
                                            <div className="text-[24px] text-black font-normal">{ratio.toFixed(1)}배 역전</div>
                                            <div className="text-[14px] text-black font-normal mt-1">
                                                API→B2 프로브가 클라이언트→B2 직접보다 {ratio.toFixed(1)}배 빠름
                                            </div>
                                            <div className="text-[14px] text-black font-normal mt-1">
                                                → 클라이언트↔B2 외부망(한국→버지니아)이 주요 병목
                                            </div>
                                        </>
                                    );
                                } else {
                                    const ratio = d / b;
                                    return (
                                        <>
                                            <div className="text-[24px] text-red-500 font-normal">{ratio.toFixed(1)}배 느림</div>
                                            <div className="text-[14px] text-black font-normal mt-1">
                                                클라이언트→B2가 API→B2 프로브보다 {ratio.toFixed(1)}배 빠름
                                            </div>
                                            <div className="text-[14px] text-black font-normal mt-1">
                                                → B2 프로브 구간 또는 Railway↔B2 경로 점검 필요
                                            </div>
                                        </>
                                    );
                                }
                            }

                            // 2순위: 속도테스트(클라→API) vs B2 프로브 참고 비교
                            if (st > 0 && b > 0) {
                                const ratio = b >= st ? b / st : st / b;
                                return (
                                    <>
                                        <div className="text-[24px] text-black font-normal">참고 데이터</div>
                                        <div className="text-[14px] text-black font-normal mt-1">
                                            속도테스트(클라→API) {formatSpeed(st)} · B2 프로브 {formatSpeed(b)} ({ratio.toFixed(1)}배 차이)
                                        </div>
                                        <div className="text-[14px] text-slate-500 font-normal mt-1">
                                            ※ 실제 업로드(클라→B2 직접) 데이터 누적 시 정밀 분석 가능
                                        </div>
                                    </>
                                );
                            }

                            return <div className="text-[14px] text-black font-normal">데이터 부족</div>;
                        })()}
                    </CardContent>
                </Card>
            </div>

            {/* 세부 병목 분석 — 파트별 진단 */}
            {(() => {
                const d = directPhase?.avgSpeedKbps ?? 0;       // KB/s, 클라→B2 직접
                const b = b2Phase?.avgSpeedKbps ?? 0;            // KB/s, API→B2 프로브
                const chunkMb = config.data?.multipartChunkSize
                    ? Math.round(config.data.multipartChunkSize / 1024 / 1024)
                    : 5;
                const concurrency = config.data?.multipartConcurrency ?? 8;

                // 진단 등급 (KB/s 기준)
                const gradeSpeed = (kbps: number): { label: string; color: string; emoji: string } => {
                    if (kbps <= 0) return { label: '데이터 없음', color: 'text-slate-400', emoji: '—' };
                    if (kbps < 500) return { label: '매우 느림', color: 'text-red-600', emoji: '🔴' };
                    if (kbps < 1024) return { label: '느림', color: 'text-orange-500', emoji: '🟠' };
                    if (kbps < 5120) return { label: '보통', color: 'text-yellow-600', emoji: '🟡' };
                    if (kbps < 10240) return { label: '양호', color: 'text-green-600', emoji: '🟢' };
                    return { label: '우수', color: 'text-emerald-600', emoji: '🟢' };
                };

                // 한국 → 미국(버지니아) 추정 RTT — Cloudflare/CDN 통계 일반 평균 180~220ms
                const ASSUMED_RTT_MS = 200;
                // 단일 TCP 흐름 처리량 추정 = 64KB(기본 TCP window) / RTT
                const singleTcpKbps = 64 / (ASSUMED_RTT_MS / 1000);
                // 멀티파트 이론 최대 ≈ 단일 흐름 × 동시성 (실제로는 RTT 분산으로 보정)
                const theoreticalMaxKbps = singleTcpKbps * concurrency;
                // 실측 활용도 (%)
                const utilizationPct = theoreticalMaxKbps > 0 ? (d / theoreticalMaxKbps) * 100 : 0;

                const directGrade = gradeSpeed(d);
                const probeGrade = gradeSpeed(b);

                // 권장 조치 자동 생성 (현재 데이터 기반)
                const recommendations: Array<{ priority: number; title: string; effect: string; cost: string }> = [];
                if (d > 0 && d < 5120) {
                    recommendations.push({
                        priority: 1,
                        title: 'Cloudflare Workers 엣지 프록시 도입',
                        effect: '한국 인접 엣지(도쿄·서울)에서 TLS 종료 → 예상 3~10배 향상 (20~50 MB/s)',
                        cost: '무료 (Cloudflare Free 플랜 내) · 1~2일 작업',
                    });
                }
                if (chunkMb < 25) {
                    recommendations.push({
                        priority: recommendations.length + 1,
                        title: `청크 크기 ${chunkMb}MB → 25MB로 증가`,
                        effect: 'RTT 오버헤드 분산 효과 ↑ · 예상 20~40% 향상',
                        cost: '설정 변경만 · 즉시 적용 가능 (위 "멀티파트 설정" 카드)',
                    });
                }
                if (concurrency < 16) {
                    recommendations.push({
                        priority: recommendations.length + 1,
                        title: `동시성 ${concurrency} → 16으로 증가`,
                        effect: '병렬 TCP 흐름 ↑ · 브라우저 HTTP/2 멀티플렉싱 활용도 ↑',
                        cost: '설정 변경만 · 단 동시성 32 초과 시 브라우저 한계로 역효과',
                    });
                }
                if (recommendations.length === 0) {
                    recommendations.push({
                        priority: 1,
                        title: '현재 설정이 최적에 가까움',
                        effect: '추가 개선은 인프라 변경(R2/B2 멀티리전, 전용선) 검토 단계',
                        cost: '—',
                    });
                }

                const hasData = d > 0 || b > 0;
                if (!hasData) return null;

                return (
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
                                <Gauge className="w-5 h-5" /> 세부 병목 분석 (파트별 진단)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* 파트 1: 외부망 (한국 → 미국 B2) */}
                                <div className="border rounded-lg p-4 space-y-2">
                                    <div className="text-[14px] text-black font-bold flex items-center gap-1">
                                        <span>{directGrade.emoji}</span>
                                        <span>외부망</span>
                                    </div>
                                    <div className="text-[13px] text-slate-500">한국 ↔ 미국 버지니아 (B2)</div>
                                    <div className={`text-[18px] font-bold ${directGrade.color}`}>
                                        {formatSpeed(d)}
                                    </div>
                                    <div className="text-[14px] text-black font-normal">
                                        진단: <span className={directGrade.color}>{directGrade.label}</span>
                                    </div>
                                    <div className="text-[13px] text-slate-600 pt-2 border-t">
                                        <div>원인 (가능성 순):</div>
                                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                                            <li>한·미 RTT 약 {ASSUMED_RTT_MS}ms (지리적 거리)</li>
                                            <li>단일 TCP 흐름 한계 ≈ {Math.round(singleTcpKbps)} KB/s</li>
                                            <li>회선 혼잡(시간대) · 회사 라우터</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* 파트 2: 내부망 (Railway ↔ B2) */}
                                <div className="border rounded-lg p-4 space-y-2">
                                    <div className="text-[14px] text-black font-bold flex items-center gap-1">
                                        <span>{probeGrade.emoji}</span>
                                        <span>내부망</span>
                                    </div>
                                    <div className="text-[13px] text-slate-500">Railway(미국 오레곤) ↔ B2(버지니아)</div>
                                    <div className={`text-[18px] font-bold ${probeGrade.color}`}>
                                        {formatSpeed(b)}
                                    </div>
                                    <div className="text-[14px] text-black font-normal">
                                        진단: <span className={probeGrade.color}>{probeGrade.label}</span>
                                    </div>
                                    <div className="text-[13px] text-slate-600 pt-2 border-t">
                                        <div>특징:</div>
                                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                                            <li>미국 대륙 내 통신 (RTT ~50ms)</li>
                                            <li>presign/메타 호출 등 소량 페이로드 비중</li>
                                            <li>대용량 전송 경로로 직접 활용 불가</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* 파트 3: 멀티파트 설정 활용도 */}
                                <div className="border rounded-lg p-4 space-y-2">
                                    <div className="text-[14px] text-black font-bold flex items-center gap-1">
                                        <span>⚙️</span>
                                        <span>멀티파트 설정</span>
                                    </div>
                                    <div className="text-[13px] text-slate-500">현재 청크 / 동시성 / 활용도</div>
                                    <div className="text-[18px] font-bold text-black">
                                        {chunkMb} MB × {concurrency}
                                    </div>
                                    <div className="text-[14px] text-black font-normal">
                                        이론 최대: <span className="font-bold">{formatSpeed(theoreticalMaxKbps)}</span>
                                    </div>
                                    <div className="text-[14px] text-black font-normal">
                                        실측 활용도: <span className={utilizationPct < 30 ? 'text-red-600 font-bold' : utilizationPct < 70 ? 'text-yellow-600 font-bold' : 'text-green-600 font-bold'}>{utilizationPct.toFixed(1)}%</span>
                                    </div>
                                    <div className="text-[13px] text-slate-600 pt-2 border-t">
                                        <div>해석:</div>
                                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                                            <li>활용도 ≥ 70% → 설정 최적</li>
                                            <li>활용도 30~70% → 청크/동시성 조정 여지</li>
                                            <li>활용도 &lt; 30% → 외부망 자체가 병목</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* 파트 4: 권장 조치 */}
                                <div className="border rounded-lg p-4 space-y-2 bg-blue-50/30 border-blue-200">
                                    <div className="text-[14px] text-black font-bold flex items-center gap-1">
                                        <span>💡</span>
                                        <span>권장 조치 (우선순위 순)</span>
                                    </div>
                                    <div className="space-y-3 pt-1">
                                        {recommendations.slice(0, 3).map((rec) => (
                                            <div key={rec.priority} className="border-l-2 border-blue-400 pl-2">
                                                <div className="text-[14px] text-black font-bold">
                                                    {rec.priority}. {rec.title}
                                                </div>
                                                <div className="text-[13px] text-slate-700 mt-0.5">
                                                    효과: {rec.effect}
                                                </div>
                                                <div className="text-[13px] text-slate-500">
                                                    비용/난이도: {rec.cost}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 종합 결론 */}
                            <div className="mt-4 p-3 bg-slate-50 border rounded-lg">
                                <div className="text-[14px] text-black font-bold mb-1">🎯 종합</div>
                                <div className="text-[14px] text-black font-normal">
                                    {d > 0 && b > 0 && b / d >= 2 ? (
                                        <>
                                            <span className="font-bold text-red-600">주 병목은 외부망(한국↔미국)</span>입니다.
                                            내부망(Railway↔B2)이 {(b / d).toFixed(1)}배 빠른 것은 지리적 거리 차이의 결과로 정상.
                                            가장 큰 효과는 <span className="font-bold">한국 인접 엣지에서 TLS 종료</span>하는 Workers 프록시 도입이며,
                                            그 전엔 청크 크기를 25MB까지 늘려 RTT 오버헤드를 분산하는 것이 가장 빠른 개선책입니다.
                                        </>
                                    ) : d > 0 && b > 0 && d > b ? (
                                        <>
                                            <span className="font-bold text-amber-600">이례적: 클라이언트→B2가 더 빠름.</span>
                                            B2 프로브 측정 표본이 작거나(presign 등 짧은 호출), Railway↔B2 사이에 일시적 라우팅 이슈가 있을 수 있습니다.
                                            며칠 더 데이터 누적 후 재확인을 권장합니다.
                                        </>
                                    ) : (
                                        <>
                                            데이터 누적이 더 필요합니다. <span className="font-bold">'외부측 테스트'</span> 또는 <span className="font-bold">'경로 비교'</span> 카드에서 10MB 이상으로 5회 이상 측정 후 다시 확인하세요.
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })()}

            {/* 실측 분포 분석 (10분위) */}
            {(() => {
                type PhaseData = MetricsSummary['phases'][string];
                const PERCENTILES: { key: keyof PhaseData; label: string }[] = [
                    { key: 'p10SpeedKbps', label: 'p10 (하위 10%)' },
                    { key: 'p20SpeedKbps', label: 'p20 (하위 20%)' },
                    { key: 'p30SpeedKbps', label: 'p30 (하위 30%)' },
                    { key: 'p40SpeedKbps', label: 'p40 (하위 40%)' },
                    { key: 'p50SpeedKbps', label: 'p50 중앙값' },
                    { key: 'p60SpeedKbps', label: 'p60 (상위 40%)' },
                    { key: 'p70SpeedKbps', label: 'p70 (상위 30%)' },
                    { key: 'p80SpeedKbps', label: 'p80 (상위 20%)' },
                    { key: 'p90SpeedKbps', label: 'p90 (상위 10%)' },
                    { key: 'p95SpeedKbps', label: 'p95 (상위 5%)' },
                ];

                function diagSpeed(kbps: number): { label: string; cls: string; detail: string } {
                    if (!kbps || kbps <= 0) return { label: '—', cls: 'text-slate-400', detail: '데이터 없음' };
                    if (kbps < 100) return { label: '🔴 심각', cls: 'text-red-500', detail: '업로드 사실상 불가' };
                    if (kbps < 512) return { label: '🟠 매우 느림', cls: 'text-orange-500', detail: `1GB 파일 약 ${Math.round(1024 * 1024 / kbps / 60)}분` };
                    if (kbps < 1024) return { label: '🟡 느림', cls: 'text-yellow-500', detail: `1GB 파일 약 ${Math.round(1024 * 1024 / kbps / 60)}분` };
                    if (kbps < 3072) return { label: '🟢 보통', cls: 'text-green-500', detail: `1GB 파일 약 ${Math.round(1024 * 1024 / kbps / 60)}분` };
                    if (kbps < 10240) return { label: '💚 양호', cls: 'text-green-700', detail: `1GB 파일 약 ${Math.round(1024 * 1024 / kbps / 60)}분` };
                    return { label: '⚡ 우수', cls: 'text-sky-500', detail: `1GB 파일 ${Math.round(1024 * 1024 / kbps)}초` };
                }

                const hasData = (directPhase?.count ?? 0) > 0 || (b2Phase?.count ?? 0) > 0;

                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-[18px] text-black font-bold">실측 속도 분포 분석 (10분위)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!hasData ? (
                                <div className="text-[14px] text-black font-normal text-center py-4">아직 실측 데이터가 없습니다.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[14px] text-black font-normal">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 px-2">구간</th>
                                                <th className="text-right py-2 px-2">클라이언트→B2 (직접)</th>
                                                <th className="text-left py-2 px-3">진단</th>
                                                <th className="text-left py-2 px-2">1GB 예상</th>
                                                <th className="text-right py-2 px-2">API→B2 (프로브)</th>
                                                <th className="text-left py-2 px-3">진단</th>
                                                <th className="text-left py-2 px-2">1GB 예상</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {PERCENTILES.map(({ key, label }) => {
                                                const dVal = directPhase?.[key] ?? 0;
                                                const bVal = b2Phase?.[key] ?? 0;
                                                const dDiag = diagSpeed(dVal);
                                                const bDiag = diagSpeed(bVal);
                                                return (
                                                    <tr key={key} className="border-b hover:bg-slate-50">
                                                        <td className="py-2 px-2 font-medium">{label}</td>
                                                        <td className="py-2 px-2 text-right">{dVal > 0 ? formatSpeed(dVal) : '—'}</td>
                                                        <td className={`py-2 px-3 ${dDiag.cls}`}>{dVal > 0 ? dDiag.label : '—'}</td>
                                                        <td className="py-2 px-2 text-slate-600">{dVal > 0 ? dDiag.detail : '—'}</td>
                                                        <td className="py-2 px-2 text-right">{bVal > 0 ? formatSpeed(bVal) : '—'}</td>
                                                        <td className={`py-2 px-3 ${bDiag.cls}`}>{bVal > 0 ? bDiag.label : '—'}</td>
                                                        <td className="py-2 px-2 text-slate-600">{bVal > 0 ? bDiag.detail : '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    <div className="mt-3 p-3 bg-slate-50 rounded text-[13px] text-slate-600 space-y-1">
                                        <div><strong>기준 해석</strong>: p10 = 하위 10% 속도 (가장 느린 구간) · p50 = 중앙값 · p95 = 상위 5% (가장 빠른 구간)</div>
                                        <div><strong>앨범 1권 기준</strong>: 평균 원본 이미지 용량 1GB 기준 예상 소요 시간</div>
                                        <div><strong>클라이언트→B2 (직접)</strong>: 실제 멀티파트 업로드 속도 (presigned URL 경유, 가장 중요한 실측 지표)</div>
                                        <div><strong>API→B2 (프로브)</strong>: Railway API 서버에서 B2로 512KB 데이터 송신 시 측정한 내부망 속도</div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })()}

            {/* 속도 테스트 집계 */}
            {summary.data?.speedtest && summary.data.speedtest.count > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-[18px] text-black font-bold">
                            속도 테스트 결과 (클라이언트→API, {summary.data.speedtest.count}회)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-[24px] text-black font-normal">
                                    {formatSpeed(summary.data.speedtest.p50SpeedKbps)}
                                </div>
                                <div className="text-[14px] text-black font-normal">중앙값 (p50)</div>
                            </div>
                            <div>
                                <div className="text-[24px] text-black font-normal">
                                    {formatSpeed(summary.data.speedtest.p95SpeedKbps)}
                                </div>
                                <div className="text-[14px] text-black font-normal">상위 5% (p95)</div>
                            </div>
                            <div>
                                <div className="text-[24px] text-black font-normal">
                                    {formatSpeed(summary.data.speedtest.maxSpeedKbps)}
                                </div>
                                <div className="text-[14px] text-black font-normal">최고 속도</div>
                            </div>
                        </div>
                        <div className="mt-2 text-[13px] text-slate-500 text-center">
                            ※ 속도테스트는 API 서버(Railway 오리건)까지의 속도입니다. 실제 B2 업로드는 클라이언트→B2 직접 전송입니다.
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 지금 테스트 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-[18px] text-black font-bold">지금 속도 테스트</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                        {[1, 5, 10, 50].map((mb) => (
                            <Button
                                key={mb}
                                variant="outline"
                                size="sm"
                                disabled={testing}
                                onClick={() => runUploadTest(mb)}
                            >
                                {testing ? '진행 중...' : `${mb}MB 업로드 테스트`}
                            </Button>
                        ))}
                    </div>
                    {testResult && (
                        <div className="text-[14px] text-black font-normal">
                            {testResult.sizeMb}MB · {(testResult.durationMs / 1000).toFixed(2)}초 ·{' '}
                            <strong>{formatSpeed(testResult.speedKbps)}</strong>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 외실측 테스트 (클라이언트 → B2 직접) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-[18px] text-black font-bold">외실측 테스트 (클라이언트 → B2 직접)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-[14px] text-black font-normal">
                        이 테스트는 presigned URL을 발급받아 브라우저에서 B2(미국 버지니아)로 직접 PUT 업로드합니다.<br />
                        실제 앨범 업로드 경로와 동일하므로 가장 정확한 외부망 속도를 측정합니다.<br />
                        <span className="text-[13px] text-slate-500">※ 5MB 미만은 TCP 연결 수립 시간이 측정값을 왜곡(실제보다 느리게 측정)하므로 5MB부터 제공합니다.</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {[5, 10, 20, 50].map((mb) => (
                            <Button
                                key={mb}
                                variant="outline"
                                size="sm"
                                disabled={testingB2}
                                onClick={() => runB2UploadTest(mb)}
                            >
                                {testingB2 ? '측정 중...' : `${mb}MB 외실측`}
                            </Button>
                        ))}
                    </div>
                    {testResultB2 && (
                        <div className="text-[14px] text-black font-normal">
                            {testResultB2.sizeMb}MB · {(testResultB2.durationMs / 1000).toFixed(2)}초 ·{' '}
                            <strong>{formatSpeed(testResultB2.speedKbps)}</strong>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 시계열 차트 */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-[18px] text-black font-bold">구간별 속도 추이</CardTitle>
                        <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
                            <TabsList>
                                <TabsTrigger value="hour">시간별</TabsTrigger>
                                <TabsTrigger value="day">일별</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <CardContent>
                    <div style={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer>
                            <LineChart data={mergedSeries}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" />
                                <YAxis
                                    label={{ value: 'KB/s', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip
                                    formatter={(value: any) =>
                                        typeof value === 'number' ? formatSpeed(value) : value
                                    }
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="client"
                                    stroke="#3b82f6"
                                    name="클라이언트 → API"
                                    dot={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="b2"
                                    stroke="#10b981"
                                    name="API → B2"
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* 기간별 통계 */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
                            <BarChart2 className="w-5 h-5" /> 기간별 통계 (실 업로드)
                        </CardTitle>
                        <Tabs value={statsPeriod} onValueChange={(v) => setStatsPeriod(v as any)}>
                            <TabsList>
                                <TabsTrigger value="day">일별</TabsTrigger>
                                <TabsTrigger value="month">월별</TabsTrigger>
                                <TabsTrigger value="quarter">분기별</TabsTrigger>
                                <TabsTrigger value="year">연별</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {(() => {
                        const rows = stats.data?.rows ?? [];
                        // 기간별로 client_to_api / api_to_b2 / client_to_b2 피벗
                        const periodMap = new Map<string, { client?: AggregatedStatRow; b2?: AggregatedStatRow; direct?: AggregatedStatRow }>();
                        for (const r of rows) {
                            if (!periodMap.has(r.period)) periodMap.set(r.period, {});
                            const entry = periodMap.get(r.period)!;
                            if (r.phase === 'client_to_api') entry.client = r;
                            else if (r.phase === 'api_to_b2') entry.b2 = r;
                            else if (r.phase === 'client_to_b2') entry.direct = r;
                        }
                        const pivoted = Array.from(periodMap.entries())
                            .map(([period, v]) => ({ period, ...v }))
                            .sort((a, b) => b.period.localeCompare(a.period));

                        // 바 차트용 데이터 (오름차순)
                        const chartData = [...pivoted].reverse().map(p => ({
                            period: p.period,
                            client: p.client?.avgSpeedKbps ?? 0,
                            b2: p.b2?.avgSpeedKbps ?? 0,
                            direct: p.direct?.avgSpeedKbps ?? 0,
                        }));

                        return (
                            <>
                                {chartData.length > 0 && (
                                    <div style={{ width: '100%', height: 240 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="period" />
                                                <YAxis label={{ value: 'KB/s', angle: -90, position: 'insideLeft' }} />
                                                <Tooltip formatter={(v: any) => typeof v === 'number' ? formatSpeed(v) : v} />
                                                <Legend />
                                                <Bar dataKey="client" fill="#3b82f6" name="클라이언트 → API" />
                                                <Bar dataKey="b2" fill="#10b981" name="API → B2" />
                                                <Bar dataKey="direct" fill="#f59e0b" name="클라이언트 → B2 (직접)" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[14px] text-black font-normal">
                                        <thead>
                                            <tr className="border-b bg-slate-50">
                                                <th className="text-left py-2 px-2" rowSpan={2}>기간</th>
                                                <th className="text-center py-1 px-2 border-l" colSpan={4}>클라이언트 → B2 직접</th>
                                                <th className="text-center py-1 px-2 border-l" colSpan={4}>클라이언트 → API</th>
                                                <th className="text-center py-1 px-2 border-l" colSpan={4}>API → B2</th>
                                                <th className="text-right py-1 px-2 border-l" rowSpan={2}>총 데이터</th>
                                            </tr>
                                            <tr className="border-b">
                                                <th className="text-right py-2 px-2 border-l">평균</th>
                                                <th className="text-right py-2 px-2">p50</th>
                                                <th className="text-right py-2 px-2">p95</th>
                                                <th className="text-right py-2 px-2">건수</th>
                                                <th className="text-right py-2 px-2 border-l">평균</th>
                                                <th className="text-right py-2 px-2">p50</th>
                                                <th className="text-right py-2 px-2">p95</th>
                                                <th className="text-right py-2 px-2">건수</th>
                                                <th className="text-right py-2 px-2 border-l">평균</th>
                                                <th className="text-right py-2 px-2">p50</th>
                                                <th className="text-right py-2 px-2">p95</th>
                                                <th className="text-right py-2 px-2">건수</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pivoted.map(p => {
                                                const totalBytes = (p.client?.totalBytes ?? 0) + (p.b2?.totalBytes ?? 0) + (p.direct?.totalBytes ?? 0);
                                                return (
                                                    <tr key={p.period} className="border-b hover:bg-slate-50">
                                                        <td className="py-2 px-2 font-medium">{p.period}</td>
                                                        <td className="py-2 px-2 text-right border-l">{p.direct ? formatSpeed(p.direct.avgSpeedKbps) : '—'}</td>
                                                        <td className="py-2 px-2 text-right">{p.direct ? formatSpeed(p.direct.p50SpeedKbps) : '—'}</td>
                                                        <td className="py-2 px-2 text-right">{p.direct ? formatSpeed(p.direct.p95SpeedKbps) : '—'}</td>
                                                        <td className="py-2 px-2 text-right">{p.direct?.count ?? 0}</td>
                                                        <td className="py-2 px-2 text-right border-l">{formatSpeed(p.client?.avgSpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{formatSpeed(p.client?.p50SpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{formatSpeed(p.client?.p95SpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{p.client?.count ?? 0}</td>
                                                        <td className="py-2 px-2 text-right border-l">{formatSpeed(p.b2?.avgSpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{formatSpeed(p.b2?.p50SpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{formatSpeed(p.b2?.p95SpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{p.b2?.count ?? 0}</td>
                                                        <td className="py-2 px-2 text-right border-l">{formatBytes(totalBytes)}</td>
                                                    </tr>
                                                );
                                            })}
                                            {pivoted.length === 0 && (
                                                <tr>
                                                    <td colSpan={14} className="text-center py-6 text-slate-500">
                                                        아직 통계 데이터가 없습니다.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        );
                    })()}
                </CardContent>
            </Card>

            {/* 요일별 통계 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
                        <BarChart2 className="w-5 h-5" /> 요일별 통계 (실 업로드)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {(() => {
                        const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
                        const rows = weekdayStats.data?.rows ?? [];

                        const dowMap = new Map<number, { client?: (typeof rows)[0]; b2?: (typeof rows)[0] }>();
                        for (const r of rows) {
                            if (!dowMap.has(r.dow)) dowMap.set(r.dow, {});
                            const entry = dowMap.get(r.dow)!;
                            if (r.phase === 'client_to_api') entry.client = r;
                            else if (r.phase === 'api_to_b2') entry.b2 = r;
                        }

                        const pivoted = DOW_LABELS.map((label, idx) => ({
                            dow: idx,
                            label,
                            ...(dowMap.get(idx) ?? {}),
                        }));

                        const chartData = pivoted.map(p => ({
                            period: p.label,
                            client: p.client?.avgSpeedKbps ?? 0,
                            b2: p.b2?.avgSpeedKbps ?? 0,
                        }));

                        const hasData = rows.length > 0;

                        return (
                            <>
                                {hasData && (
                                    <div className="w-full h-60">
                                        <ResponsiveContainer>
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="period" />
                                                <YAxis label={{ value: 'KB/s', angle: -90, position: 'insideLeft' }} />
                                                <Tooltip formatter={(v: any) => typeof v === 'number' ? formatSpeed(v) : v} />
                                                <Legend />
                                                <Bar dataKey="client" fill="#3b82f6" name="클라이언트 → API" />
                                                <Bar dataKey="b2" fill="#10b981" name="API → B2" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[14px] text-black font-normal">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 px-2">요일</th>
                                                <th className="text-right py-2 px-2">클라이언트→API 평균</th>
                                                <th className="text-right py-2 px-2">p50</th>
                                                <th className="text-right py-2 px-2">p95</th>
                                                <th className="text-right py-2 px-2">건수</th>
                                                <th className="text-right py-2 px-2">API→B2 평균</th>
                                                <th className="text-right py-2 px-2">p50</th>
                                                <th className="text-right py-2 px-2">p95</th>
                                                <th className="text-right py-2 px-2">건수</th>
                                                <th className="text-right py-2 px-2">총 데이터</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pivoted.map(p => {
                                                const totalBytes = (p.client?.totalBytes ?? 0) + (p.b2?.totalBytes ?? 0);
                                                const isEmpty = !p.client && !p.b2;
                                                return (
                                                    <tr key={p.dow} className="border-b hover:bg-slate-50">
                                                        <td className="py-2 px-2 font-medium">{p.label}요일</td>
                                                        <td className="py-2 px-2 text-right">{isEmpty ? '—' : formatSpeed(p.client?.avgSpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{isEmpty ? '—' : formatSpeed(p.client?.p50SpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{isEmpty ? '—' : formatSpeed(p.client?.p95SpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{p.client?.count ?? 0}</td>
                                                        <td className="py-2 px-2 text-right">{isEmpty ? '—' : formatSpeed(p.b2?.avgSpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{isEmpty ? '—' : formatSpeed(p.b2?.p50SpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{isEmpty ? '—' : formatSpeed(p.b2?.p95SpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{p.b2?.count ?? 0}</td>
                                                        <td className="py-2 px-2 text-right">{formatBytes(totalBytes)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {!hasData && (
                                        <div className="text-center py-6 text-slate-500">아직 요일별 데이터가 없습니다.</div>
                                    )}
                                </div>
                            </>
                        );
                    })()}
                </CardContent>
            </Card>

            {/* 최근 측정 */}
            {(() => {
                const RECENT_PAGE_SIZE = 50;
                const allRecent = recent.data ?? [];
                const totalPages = Math.max(1, Math.ceil(allRecent.length / RECENT_PAGE_SIZE));
                const pagedRecent = allRecent.slice((recentPage - 1) * RECENT_PAGE_SIZE, recentPage * RECENT_PAGE_SIZE);
                return (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[18px] text-black font-bold">
                                    최근 측정 (최대 500건, {allRecent.length}건 로드됨)
                                </CardTitle>
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={recentPage <= 1}
                                            onClick={() => setRecentPage(p => Math.max(1, p - 1))}
                                        >
                                            이전
                                        </Button>
                                        <span className="text-[14px] text-black font-normal">
                                            {recentPage} / {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={recentPage >= totalPages}
                                            onClick={() => setRecentPage(p => Math.min(totalPages, p + 1))}
                                        >
                                            다음
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-[14px] text-black font-normal">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 px-2">일시</th>
                                            <th className="text-left py-2 px-2">종류</th>
                                            <th className="text-left py-2 px-2">구간</th>
                                            <th className="text-left py-2 px-2">엔드포인트</th>
                                            <th className="text-right py-2 px-2">용량</th>
                                            <th className="text-right py-2 px-2">소요</th>
                                            <th className="text-right py-2 px-2">속도</th>
                                            <th className="text-left py-2 px-2">국가</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagedRecent.map((m) => (
                                            <tr key={m.id} className="border-b hover:bg-slate-50">
                                                <td className="py-2 px-2">{formatDateTime(m.createdAt)}</td>
                                                <td className="py-2 px-2">
                                                    <Badge variant={m.kind === 'speedtest' ? 'default' : 'secondary'} className="text-xs">
                                                        {m.kind === 'speedtest' ? '테스트' : '실측'}
                                                    </Badge>
                                                </td>
                                                <td className="py-2 px-2">{PHASE_LABEL[m.phase] ?? m.phase}</td>
                                                <td className="py-2 px-2 text-xs text-slate-600">{m.endpoint ?? '—'}</td>
                                                <td className="py-2 px-2 text-right">{formatBytes(m.fileSize)}</td>
                                                <td className="py-2 px-2 text-right">{(m.durationMs / 1000).toFixed(2)}s</td>
                                                <td className="py-2 px-2 text-right">
                                                    <strong>{formatSpeed(m.speedKbps)}</strong>
                                                </td>
                                                <td className="py-2 px-2">{m.countryCode ?? '—'}</td>
                                            </tr>
                                        ))}
                                        {allRecent.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="text-center py-6 text-slate-500">
                                                    아직 측정 데이터가 없습니다.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 mt-4">
                                    <Button variant="outline" size="sm" disabled={recentPage <= 1} onClick={() => setRecentPage(1)}>
                                        처음
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={recentPage <= 1} onClick={() => setRecentPage(p => Math.max(1, p - 1))}>
                                        이전
                                    </Button>
                                    <span className="text-[14px] text-black font-normal px-2">
                                        {recentPage} / {totalPages} 페이지 ({(recentPage - 1) * RECENT_PAGE_SIZE + 1}~{Math.min(recentPage * RECENT_PAGE_SIZE, allRecent.length)}건)
                                    </span>
                                    <Button variant="outline" size="sm" disabled={recentPage >= totalPages} onClick={() => setRecentPage(p => Math.min(totalPages, p + 1))}>
                                        다음
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={recentPage >= totalPages} onClick={() => setRecentPage(totalPages)}>
                                        마지막
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })()}
        </div>
    );
}

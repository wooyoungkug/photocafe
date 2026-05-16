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
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { Gauge, Zap, Upload, RefreshCw, BarChart2 } from 'lucide-react';
import {
    useUploadMetricsSummary,
    useUploadMetricsTimeseries,
    useUploadMetricsRecent,
    useUploadMetricsStats,
    useUploadMetricsConfig,
    useUpdateMetricsConfig,
    type AggregatedStatRow,
} from '@/hooks/use-upload-metrics';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const PHASE_LABEL: Record<string, string> = {
    client_to_api: '클라이언트 → API',
    api_to_b2: 'API → B2',
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
    const [sampleInput, setSampleInput] = useState<string>('');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ sizeMb: number; durationMs: number; speedKbps: number } | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const queryClient = useQueryClient();

    const summary = useUploadMetricsSummary(range);
    const tsClient = useUploadMetricsTimeseries({ phase: 'client_to_api', groupBy });
    const tsB2 = useUploadMetricsTimeseries({ phase: 'api_to_b2', groupBy });
    const recent = useUploadMetricsRecent(50);
    const stats = useUploadMetricsStats(statsPeriod);
    const config = useUploadMetricsConfig();
    const updateConfig = useUpdateMetricsConfig();

    const clientPhase = summary.data?.phases?.client_to_api;
    const b2Phase = summary.data?.phases?.api_to_b2;

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

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[24px] text-black font-normal">업로드 속도 모니터링</h1>
                    <p className="text-[14px] text-black font-normal mt-1">
                        실 업로드는 {Math.round((config.data?.sampleRate ?? 0.1) * 100)}% 샘플링, 속도테스트는 100% 기록됩니다.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* 샘플링 비율 입력 */}
                    <div className="flex items-center gap-1">
                        <span className="text-[14px] text-black font-normal whitespace-nowrap">실 업로드 샘플</span>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            className="w-16 border rounded px-2 py-1 text-[14px] text-black text-center"
                            value={sampleInput !== '' ? sampleInput : Math.round((config.data?.sampleRate ?? 0.1) * 100).toString()}
                            onChange={(e) => setSampleInput(e.target.value)}
                            onBlur={() => {
                                const pct = parseFloat(sampleInput);
                                if (!Number.isFinite(pct)) return;
                                updateConfig.mutate(pct / 100, {
                                    onSuccess: () => {
                                        setSampleInput('');
                                        toast.success(`샘플링 ${pct}%로 변경됨`);
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
                </div>
            </div>

            {/* KPI 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[14px] text-black font-normal flex items-center gap-2">
                            <Upload className="w-4 h-4" /> 클라이언트 → API
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-[24px] text-black font-normal">
                            {formatSpeed(clientPhase?.avgSpeedKbps ?? 0)}
                        </div>
                        <div className="text-[14px] text-black font-normal mt-1">
                            중앙값 {formatSpeed(clientPhase?.p50SpeedKbps ?? 0)} · p95 {formatSpeed(clientPhase?.p95SpeedKbps ?? 0)}
                        </div>
                        <div className="text-[14px] text-black font-normal mt-1">
                            샘플 {clientPhase?.count ?? 0}건 · 누적 {formatBytes(clientPhase?.totalBytes ?? 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[14px] text-black font-normal flex items-center gap-2">
                            <Zap className="w-4 h-4" /> API → B2 (내부망)
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
                            <Gauge className="w-4 h-4" /> 병목 비율
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(() => {
                            const c = clientPhase?.avgSpeedKbps ?? 0;
                            const b = b2Phase?.avgSpeedKbps ?? 0;
                            if (!c || !b) return <div className="text-[14px] text-black font-normal">데이터 부족</div>;
                            const ratio = b / c;
                            return (
                                <>
                                    <div className="text-[24px] text-black font-normal">{ratio.toFixed(1)}배</div>
                                    <div className="text-[14px] text-black font-normal mt-1">
                                        B2가 클라이언트→API보다 {ratio.toFixed(1)}배 빠름
                                    </div>
                                    <div className="text-[14px] text-black font-normal mt-1">
                                        → 외부망(한국→오리건)이 주요 병목
                                    </div>
                                </>
                            );
                        })()}
                    </CardContent>
                </Card>
            </div>

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
                        // 기간별로 client_to_api / api_to_b2 피벗
                        const periodMap = new Map<string, { client?: AggregatedStatRow; b2?: AggregatedStatRow }>();
                        for (const r of rows) {
                            if (!periodMap.has(r.period)) periodMap.set(r.period, {});
                            const entry = periodMap.get(r.period)!;
                            if (r.phase === 'client_to_api') entry.client = r;
                            else if (r.phase === 'api_to_b2') entry.b2 = r;
                        }
                        const pivoted = Array.from(periodMap.entries())
                            .map(([period, v]) => ({ period, ...v }))
                            .sort((a, b) => b.period.localeCompare(a.period));

                        // 바 차트용 데이터 (오름차순)
                        const chartData = [...pivoted].reverse().map(p => ({
                            period: p.period,
                            client: p.client?.avgSpeedKbps ?? 0,
                            b2: p.b2?.avgSpeedKbps ?? 0,
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
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[14px] text-black font-normal">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 px-2">기간</th>
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
                                                return (
                                                    <tr key={p.period} className="border-b hover:bg-slate-50">
                                                        <td className="py-2 px-2 font-medium">{p.period}</td>
                                                        <td className="py-2 px-2 text-right">{formatSpeed(p.client?.avgSpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{formatSpeed(p.client?.p50SpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{formatSpeed(p.client?.p95SpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{p.client?.count ?? 0}</td>
                                                        <td className="py-2 px-2 text-right">{formatSpeed(p.b2?.avgSpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{formatSpeed(p.b2?.p50SpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{formatSpeed(p.b2?.p95SpeedKbps ?? 0)}</td>
                                                        <td className="py-2 px-2 text-right">{p.b2?.count ?? 0}</td>
                                                        <td className="py-2 px-2 text-right">{formatBytes(totalBytes)}</td>
                                                    </tr>
                                                );
                                            })}
                                            {pivoted.length === 0 && (
                                                <tr>
                                                    <td colSpan={10} className="text-center py-6 text-slate-500">
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

            {/* 최근 측정 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-[18px] text-black font-bold">최근 측정 (최대 50건)</CardTitle>
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
                                {(recent.data ?? []).map((m) => (
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
                                {(!recent.data || recent.data.length === 0) && (
                                    <tr>
                                        <td colSpan={8} className="text-center py-6 text-slate-500">
                                            아직 측정 데이터가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';

interface PingResult {
    samples: number[];   // ms each
    min: number;
    avg: number;
    max: number;
}

interface DownloadResult {
    sizeMb: number;
    durationMs: number;
    mbPerSec: number;
}

function formatMs(n: number): string {
    if (!Number.isFinite(n) || n <= 0) return '—';
    return `${Math.round(n)} ms`;
}

function formatMbps(n: number): string {
    if (!Number.isFinite(n) || n <= 0) return '—';
    return `${n.toFixed(2)} MB/s`;
}

async function pingOnce(signal: AbortSignal): Promise<number> {
    const t0 = performance.now();
    const res = await fetch(`${API_URL}/upload/diagnostics/ping`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.text();
    return performance.now() - t0;
}

export function BaselineTestCard() {
    const t = useTranslations('uploadMetrics.baseline');
    const [apiPing, setApiPing] = useState<PingResult | null>(null);
    const [b2Rtt, setB2Rtt] = useState<PingResult | null>(null);
    const [download, setDownload] = useState<DownloadResult | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const ranOnceRef = useRef(false);

    async function runMeasurement() {
        if (isRunning) return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setIsRunning(true);
        setApiPing(null);
        setB2Rtt(null);
        setDownload(null);

        try {
            // 1) API ping × 5
            const apiSamples: number[] = [];
            for (let i = 0; i < 5; i++) {
                if (controller.signal.aborted) return;
                try {
                    const ms = await pingOnce(controller.signal);
                    apiSamples.push(ms);
                } catch (err) {
                    if (controller.signal.aborted) return;
                    throw err;
                }
            }
            const apiMin = Math.min(...apiSamples);
            const apiMax = Math.max(...apiSamples);
            const apiAvg = apiSamples.reduce((a, b) => a + b, 0) / apiSamples.length;
            setApiPing({ samples: apiSamples, min: apiMin, avg: apiAvg, max: apiMax });

            // 2) B2 presign RTT × 3 (presign 호출 시간으로 대체)
            const b2Samples: number[] = [];
            for (let i = 0; i < 3; i++) {
                if (controller.signal.aborted) return;
                const t0 = performance.now();
                const res = await fetch(`${API_URL}/upload/speedtest/b2-presign`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Auth-Context': 'staff' },
                    body: JSON.stringify({ sizeMb: 1 }),
                    credentials: 'include',
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(`B2 presign HTTP ${res.status}`);
                await res.json();
                b2Samples.push(performance.now() - t0);
            }
            const b2Min = Math.min(...b2Samples);
            const b2Max = Math.max(...b2Samples);
            const b2Avg = b2Samples.reduce((a, b) => a + b, 0) / b2Samples.length;
            setB2Rtt({ samples: b2Samples, min: b2Min, avg: b2Avg, max: b2Max });

            // 3) 1MB 다운로드
            if (controller.signal.aborted) return;
            const t0 = performance.now();
            const dlRes = await fetch(`${API_URL}/upload/speedtest/download?sizeMb=1`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'X-Auth-Context': 'staff' },
                signal: controller.signal,
            });
            if (!dlRes.ok) throw new Error(`download HTTP ${dlRes.status}`);
            const blob = await dlRes.blob();
            const durationMs = performance.now() - t0;
            const sizeMb = blob.size / 1024 / 1024;
            const mbPerSec = sizeMb / (durationMs / 1000);
            setDownload({ sizeMb, durationMs, mbPerSec });
        } catch (err) {
            if (controller.signal.aborted) return;
            const msg = err instanceof Error ? err.message : 'unknown';
            toast.error(`${t('failed')}: ${msg}`);
        } finally {
            setIsRunning(false);
        }
    }

    // 페이지 진입 시 자동 1회
    useEffect(() => {
        if (ranOnceRef.current) return;
        ranOnceRef.current = true;
        void runMeasurement();
        return () => {
            abortRef.current?.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const maxApiMs = apiPing ? Math.max(...apiPing.samples, 1) : 1;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
                        <Activity className="w-5 h-5" /> {t('title')}
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runMeasurement()}
                        disabled={isRunning}
                    >
                        <RefreshCw className={`w-4 h-4 mr-1 ${isRunning ? 'animate-spin' : ''}`} />
                        {isRunning ? t('running') : t('rerun')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-[14px] text-black font-normal">{t('description')}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* API RTT */}
                    <div className="border rounded p-3 space-y-2">
                        <div className="text-[14px] text-black font-bold">{t('apiPing')}</div>
                        {apiPing ? (
                            <>
                                <div className="text-[24px] text-black font-normal">
                                    {formatMs(apiPing.avg)}
                                </div>
                                <div className="text-[14px] text-black font-normal">
                                    {t('min')} {formatMs(apiPing.min)} · {t('max')} {formatMs(apiPing.max)}
                                </div>
                                <div className="flex items-end gap-1 h-12 mt-1">
                                    {apiPing.samples.map((s, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 bg-blue-500 rounded-t"
                                            style={{ height: `${(s / maxApiMs) * 100}%` }}
                                            title={`#${i + 1}: ${formatMs(s)}`}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-[14px] text-black font-normal">
                                {isRunning ? t('measuring') : '—'}
                            </div>
                        )}
                    </div>

                    {/* B2 RTT */}
                    <div className="border rounded p-3 space-y-2">
                        <div className="text-[14px] text-black font-bold">{t('b2Rtt')}</div>
                        {b2Rtt ? (
                            <>
                                <div className="text-[24px] text-black font-normal">
                                    {formatMs(b2Rtt.avg)}
                                </div>
                                <div className="text-[14px] text-black font-normal">
                                    {t('min')} {formatMs(b2Rtt.min)} · {t('max')} {formatMs(b2Rtt.max)}
                                </div>
                                <div className="text-[13px] text-slate-500 font-normal mt-1">
                                    {t('b2RttNote')}
                                </div>
                            </>
                        ) : (
                            <div className="text-[14px] text-black font-normal">
                                {isRunning ? t('measuring') : '—'}
                            </div>
                        )}
                    </div>

                    {/* Download */}
                    <div className="border rounded p-3 space-y-2">
                        <div className="text-[14px] text-black font-bold">{t('download')}</div>
                        {download ? (
                            <>
                                <div className="text-[24px] text-black font-normal">
                                    {formatMbps(download.mbPerSec)}
                                </div>
                                <div className="text-[14px] text-black font-normal">
                                    {download.sizeMb.toFixed(2)} MB · {(download.durationMs / 1000).toFixed(2)}s
                                </div>
                            </>
                        ) : (
                            <div className="text-[14px] text-black font-normal">
                                {isRunning ? t('measuring') : '—'}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

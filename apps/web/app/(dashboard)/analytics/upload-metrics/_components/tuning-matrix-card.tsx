'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Grid3x3, CheckCircle2, Save } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';
import { useUpdateMetricsConfig } from '@/hooks/use-upload-metrics';

const CHUNK_SIZES_MB = [5, 10, 25, 50] as const;
const CONCURRENCIES = [1, 4, 8, 16] as const;

type ChunkSize = (typeof CHUNK_SIZES_MB)[number];
type Concurrency = (typeof CONCURRENCIES)[number];

interface CellKey {
    chunkMb: ChunkSize;
    concurrency: Concurrency;
}

interface CellResult {
    durationMs: number;
    mbPerSec: number;
}

function cellKeyToString(k: CellKey): string {
    return `${k.chunkMb}x${k.concurrency}`;
}

function buildRandomBlob(sizeBytes: number): Blob {
    const buf = new Uint8Array(sizeBytes);
    const head = Math.min(buf.length, 65536);
    if (typeof crypto !== 'undefined') {
        crypto.getRandomValues(buf.subarray(0, head));
    }
    if (head < buf.length) buf.fill(0xff, head);
    return new Blob([buf], { type: 'application/octet-stream' });
}

function formatMbps(n: number): string {
    if (!Number.isFinite(n) || n <= 0) return '—';
    return `${n.toFixed(2)} MB/s`;
}

export function TuningMatrixCard() {
    const t = useTranslations('uploadMetrics.tuningMatrix');
    const [totalSizeMb, setTotalSizeMb] = useState<number>(50);
    const [results, setResults] = useState<Record<string, CellResult>>({});
    const [running, setRunning] = useState<string | null>(null); // 진행 중 cellKey
    const [globalRunning, setGlobalRunning] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const updateConfig = useUpdateMetricsConfig();

    async function measureCell(cell: CellKey, signal: AbortSignal): Promise<CellResult> {
        const chunkBytes = cell.chunkMb * 1024 * 1024;
        const totalBytes = totalSizeMb * 1024 * 1024;
        const numParts = Math.max(1, Math.ceil(totalBytes / chunkBytes));

        // 각 청크별 presign 발급
        const presignedUrls: string[] = [];
        for (let i = 0; i < numParts; i++) {
            if (signal.aborted) throw new DOMException('cancelled', 'AbortError');
            const presignRes = await fetch(`${API_URL}/upload/speedtest/b2-presign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Auth-Context': 'staff' },
                body: JSON.stringify({ sizeMb: cell.chunkMb }),
                credentials: 'include',
                signal,
            });
            if (!presignRes.ok) throw new Error(`presign HTTP ${presignRes.status}`);
            const { presignedUrl } = (await presignRes.json()) as { presignedUrl: string };
            presignedUrls.push(presignedUrl);
        }

        // 랜덤 청크 1개 생성 후 모든 청크에서 재사용 (메모리/시간 절약)
        const chunkBlob = buildRandomBlob(chunkBytes);

        const t0 = performance.now();
        let cursor = 0;
        const workers: Promise<void>[] = [];
        const runWorker = async () => {
            while (cursor < numParts) {
                if (signal.aborted) throw new DOMException('cancelled', 'AbortError');
                const idx = cursor++;
                const url = presignedUrls[idx];
                const putRes = await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    body: chunkBlob,
                    signal,
                });
                if (!putRes.ok) throw new Error(`part ${idx + 1} HTTP ${putRes.status}`);
            }
        };
        for (let i = 0; i < Math.min(cell.concurrency, numParts); i++) {
            workers.push(runWorker());
        }
        await Promise.all(workers);
        const durationMs = performance.now() - t0;
        const totalMb = (numParts * cell.chunkMb);
        const mbPerSec = totalMb / (durationMs / 1000);
        return { durationMs, mbPerSec };
    }

    async function runCell(cell: CellKey) {
        if (running || globalRunning) return;
        const key = cellKeyToString(cell);
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setRunning(key);
        try {
            const result = await measureCell(cell, controller.signal);
            setResults((prev) => ({ ...prev, [key]: result }));
        } catch (err) {
            if (!controller.signal.aborted) {
                const msg = err instanceof Error ? err.message : 'unknown';
                toast.error(`${t('failed')} ${key}: ${msg}`);
            }
        } finally {
            setRunning(null);
        }
    }

    async function runAll() {
        if (running || globalRunning) return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setGlobalRunning(true);
        setResults({});
        try {
            for (const chunkMb of CHUNK_SIZES_MB) {
                for (const concurrency of CONCURRENCIES) {
                    if (controller.signal.aborted) return;
                    const cell: CellKey = { chunkMb, concurrency };
                    const key = cellKeyToString(cell);
                    setRunning(key);
                    try {
                        const result = await measureCell(cell, controller.signal);
                        setResults((prev) => ({ ...prev, [key]: result }));
                    } catch (err) {
                        if (controller.signal.aborted) return;
                        const msg = err instanceof Error ? err.message : 'unknown';
                        toast.error(`${t('failed')} ${key}: ${msg}`);
                    }
                }
            }
            if (!controller.signal.aborted) toast.success(t('allDone'));
        } finally {
            setRunning(null);
            setGlobalRunning(false);
        }
    }

    // 최적 셀 찾기
    const entries = Object.entries(results);
    const best = entries.length > 0
        ? entries.reduce((a, b) => (b[1].mbPerSec > a[1].mbPerSec ? b : a))
        : null;

    function isBestKey(key: string): boolean {
        return !!(best && best[0] === key);
    }

    function parseKey(key: string): CellKey | null {
        const m = key.match(/^(\d+)x(\d+)$/);
        if (!m) return null;
        return {
            chunkMb: parseInt(m[1], 10) as ChunkSize,
            concurrency: parseInt(m[2], 10) as Concurrency,
        };
    }

    async function saveBestSetting() {
        if (!best) return;
        const parsed = parseKey(best[0]);
        if (!parsed) return;
        const chunkBytes = parsed.chunkMb * 1024 * 1024;
        try {
            window.localStorage.setItem('multipartChunkSize', String(chunkBytes));
            window.localStorage.setItem('multipartConcurrency', String(parsed.concurrency));
        } catch { /* ignore */ }
        try {
            await updateConfig.mutateAsync({
                multipartChunkSize: chunkBytes,
                multipartConcurrency: parsed.concurrency,
            });
            toast.success(`${t('saved')}: ${parsed.chunkMb}MB × ${parsed.concurrency}`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'unknown';
            toast.error(`${t('saveFailed')}: ${msg}`);
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
                        <Grid3x3 className="w-5 h-5" /> {t('title')}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <label htmlFor="tuning-size" className="text-[14px] text-black font-normal">
                            {t('totalSizeLabel')}
                        </label>
                        <select
                            id="tuning-size"
                            className="border rounded px-2 py-1 text-[14px] text-black"
                            value={totalSizeMb}
                            onChange={(e) => setTotalSizeMb(parseInt(e.target.value, 10))}
                            disabled={!!running || globalRunning}
                        >
                            <option value={50}>50 MB</option>
                            <option value={100}>100 MB</option>
                        </select>
                        <Button
                            size="sm"
                            onClick={() => runAll()}
                            disabled={!!running || globalRunning}
                        >
                            {globalRunning ? t('runningAll') : t('runAll')}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => saveBestSetting()}
                            disabled={!best || updateConfig.isPending}
                        >
                            <Save className="w-4 h-4 mr-1" />
                            {t('saveBest')}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-[14px] text-black font-normal">{t('description')}</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-[14px] text-black font-normal border-collapse">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="text-left py-2 px-2 border">
                                    {t('chunkVsConcurrency')}
                                </th>
                                {CONCURRENCIES.map((c) => (
                                    <th key={c} className="text-center py-2 px-2 border">
                                        {t('concurrency')} {c}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {CHUNK_SIZES_MB.map((chunkMb) => (
                                <tr key={chunkMb} className="border-b">
                                    <td className="py-2 px-2 border font-medium">
                                        {t('chunk')} {chunkMb} MB
                                    </td>
                                    {CONCURRENCIES.map((concurrency) => {
                                        const key = cellKeyToString({ chunkMb, concurrency });
                                        const r = results[key];
                                        const isRunningCell = running === key;
                                        const isBest = isBestKey(key);
                                        return (
                                            <td
                                                key={concurrency}
                                                className={`py-2 px-2 border text-center cursor-pointer transition-colors ${
                                                    isRunningCell
                                                        ? 'bg-yellow-100 animate-pulse'
                                                        : isBest
                                                        ? 'bg-green-50'
                                                        : 'hover:bg-slate-50'
                                                }`}
                                                onClick={() => runCell({ chunkMb, concurrency })}
                                            >
                                                {isRunningCell ? (
                                                    <span className="text-yellow-700">{t('measuring')}</span>
                                                ) : r ? (
                                                    <div className="space-y-1">
                                                        <div className={isBest ? 'font-bold text-green-700' : ''}>
                                                            {formatMbps(r.mbPerSec)}
                                                        </div>
                                                        {isBest && (
                                                            <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                {t('best')}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">{t('clickToMeasure')}</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {best && (
                    <div className="text-[14px] text-black font-normal p-3 bg-green-50 rounded border border-green-200">
                        <strong>{t('bestCombination')}:</strong> {best[0].replace('x', ` MB × ${t('concurrency')} `)} · {formatMbps(best[1].mbPerSec)}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

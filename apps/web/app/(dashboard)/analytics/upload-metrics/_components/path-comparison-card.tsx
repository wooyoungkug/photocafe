'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitCompare, CheckCircle2 } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';

type PathKey = 'A' | 'B' | 'C';

interface PathResult {
    key: PathKey;
    label: string;
    durationMs: number;
    mbPerSec: number;
}

function buildRandomBlob(sizeBytes: number): Blob {
    // 큰 무작위 데이터는 비용이 크므로 처음 64KB만 진짜 랜덤, 이후 0xff 패딩
    const buf = new Uint8Array(sizeBytes);
    const head = Math.min(buf.length, 65536);
    if (typeof crypto !== 'undefined') {
        crypto.getRandomValues(buf.subarray(0, head));
    }
    if (head < buf.length) buf.fill(0xff, head);
    return new Blob([buf], { type: 'application/octet-stream' });
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const t = setTimeout(resolve, ms);
        signal.addEventListener('abort', () => {
            clearTimeout(t);
            reject(new DOMException('cancelled', 'AbortError'));
        }, { once: true });
    });
}

function formatMbps(n: number): string {
    if (!Number.isFinite(n) || n <= 0) return '—';
    return `${n.toFixed(2)} MB/s`;
}

export function PathComparisonCard() {
    const t = useTranslations('uploadMetrics.pathComparison');
    const [sizeMb, setSizeMb] = useState<number>(10);
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<PathResult[]>([]);
    const [progress, setProgress] = useState<string>('');
    const abortRef = useRef<AbortController | null>(null);

    async function runDirectPut(blob: Blob, signal: AbortSignal): Promise<number> {
        // 1) presign 발급
        const presignRes = await fetch(`${API_URL}/upload/speedtest/b2-presign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Auth-Context': 'staff' },
            body: JSON.stringify({ sizeMb }),
            credentials: 'include',
            signal,
        });
        if (!presignRes.ok) throw new Error(`presign HTTP ${presignRes.status}`);
        const { presignedUrl } = (await presignRes.json()) as { presignedUrl: string };

        const t0 = performance.now();
        const putRes = await fetch(presignedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: blob,
            signal,
        });
        const durationMs = performance.now() - t0;
        if (!putRes.ok) throw new Error(`B2 PUT HTTP ${putRes.status}`);

        // 메트릭 기록 (A 경로 — 단일 PUT)
        try {
            await fetch(`${API_URL}/upload/metrics/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Auth-Context': 'staff' },
                credentials: 'include',
                body: JSON.stringify({
                    kind: 'speedtest',
                    phase: 'client_to_b2',
                    fileSize: blob.size,
                    durationMs,
                    endpoint: '/speedtest/single-put',
                }),
            });
        } catch { /* fire-and-forget */ }

        return durationMs;
    }

    async function runApiPut(blob: Blob, signal: AbortSignal): Promise<number> {
        const form = new FormData();
        form.append('file', blob, `path-test-${sizeMb}mb.bin`);
        const t0 = performance.now();
        const res = await fetch(`${API_URL}/upload/speedtest/api-put`, {
            method: 'POST',
            body: form,
            credentials: 'include',
            headers: { 'X-Auth-Context': 'staff' },
            signal,
        });
        const durationMs = performance.now() - t0;
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`api-put HTTP ${res.status} ${body.slice(0, 80)}`);
        }
        return durationMs;
    }

    async function runMultipart(blob: Blob, signal: AbortSignal): Promise<number> {
        // 멀티파트 시뮬레이션: 청크 크기 5MB 고정, 동시성은 현재 localStorage 값(기본 8)
        const chunkSize = 5 * 1024 * 1024;
        const concurrency = (() => {
            try {
                const v = window.localStorage.getItem('multipartConcurrency');
                const n = v ? parseInt(v, 10) : NaN;
                return Number.isFinite(n) && n >= 1 && n <= 32 ? n : 8;
            } catch {
                return 8;
            }
        })();

        const parts: Blob[] = [];
        for (let off = 0; off < blob.size; off += chunkSize) {
            parts.push(blob.slice(off, Math.min(off + chunkSize, blob.size)));
        }

        // 각 청크별 presign 발급
        const presignedUrls: string[] = [];
        for (const part of parts) {
            const partMb = part.size / 1024 / 1024;
            const presignRes = await fetch(`${API_URL}/upload/speedtest/b2-presign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Auth-Context': 'staff' },
                body: JSON.stringify({ sizeMb: Math.max(1, Math.ceil(partMb)) }),
                credentials: 'include',
                signal,
            });
            if (!presignRes.ok) throw new Error(`multipart presign HTTP ${presignRes.status}`);
            const { presignedUrl } = (await presignRes.json()) as { presignedUrl: string };
            presignedUrls.push(presignedUrl);
        }

        const t0 = performance.now();
        let cursor = 0;
        const workers: Promise<void>[] = [];
        const runWorker = async () => {
            while (cursor < parts.length) {
                if (signal.aborted) throw new DOMException('cancelled', 'AbortError');
                const idx = cursor++;
                const url = presignedUrls[idx];
                const chunk = parts[idx];
                const putRes = await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    body: chunk,
                    signal,
                });
                if (!putRes.ok) throw new Error(`part ${idx + 1} HTTP ${putRes.status}`);
            }
        };
        for (let i = 0; i < Math.min(concurrency, parts.length); i++) {
            workers.push(runWorker());
        }
        await Promise.all(workers);
        return performance.now() - t0;
    }

    async function runComparison() {
        if (running) return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setRunning(true);
        setResults([]);

        try {
            const sizeBytes = sizeMb * 1024 * 1024;
            const blob = buildRandomBlob(sizeBytes);
            const sizeMbActual = blob.size / 1024 / 1024;

            const order: { key: PathKey; label: string; run: (b: Blob, s: AbortSignal) => Promise<number> }[] = [
                { key: 'A', label: t('pathA'), run: runDirectPut },
                { key: 'B', label: t('pathB'), run: runApiPut },
                { key: 'C', label: t('pathC'), run: runMultipart },
            ];

            const collected: PathResult[] = [];
            for (const item of order) {
                if (controller.signal.aborted) return;
                setProgress(`${item.label} (${item.key})...`);
                const durationMs = await item.run(blob, controller.signal);
                const mbPerSec = sizeMbActual / (durationMs / 1000);
                const result: PathResult = { key: item.key, label: item.label, durationMs, mbPerSec };
                collected.push(result);
                setResults([...collected]);
                // 측정 간섭 방지용 휴식
                try {
                    await sleep(500, controller.signal);
                } catch { /* aborted */ }
            }
            setProgress('');
            if (!controller.signal.aborted) toast.success(t('done'));
        } catch (err) {
            if (controller.signal.aborted) return;
            const msg = err instanceof Error ? err.message : 'unknown';
            toast.error(`${t('failed')}: ${msg}`);
        } finally {
            setRunning(false);
            setProgress('');
        }
    }

    const fastest = results.length > 0
        ? results.reduce((a, b) => (b.mbPerSec > a.mbPerSec ? b : a))
        : null;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
                        <GitCompare className="w-5 h-5" /> {t('title')}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <label htmlFor="path-size" className="text-[14px] text-black font-normal">
                            {t('sizeLabel')}
                        </label>
                        <select
                            id="path-size"
                            className="border rounded px-2 py-1 text-[14px] text-black"
                            value={sizeMb}
                            onChange={(e) => setSizeMb(parseInt(e.target.value, 10))}
                            disabled={running}
                        >
                            <option value={5}>5 MB</option>
                            <option value={10}>10 MB</option>
                            <option value={25}>25 MB</option>
                            <option value={50}>50 MB</option>
                        </select>
                        <Button
                            size="sm"
                            onClick={() => runComparison()}
                            disabled={running}
                        >
                            {running ? t('running') : t('start')}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-[14px] text-black font-normal">{t('description')}</p>
                {progress && (
                    <div className="text-[14px] text-blue-600 font-normal">{progress}</div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-[14px] text-black font-normal">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="text-left py-2 px-2">{t('colPath')}</th>
                                <th className="text-right py-2 px-2">{t('colDuration')}</th>
                                <th className="text-right py-2 px-2">{t('colSpeed')}</th>
                                <th className="text-right py-2 px-2">{t('colRelative')}</th>
                                <th className="text-left py-2 px-2">{t('colNote')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(['A', 'B', 'C'] as PathKey[]).map((key) => {
                                const r = results.find((x) => x.key === key);
                                const label = key === 'A' ? t('pathA') : key === 'B' ? t('pathB') : t('pathC');
                                const isFastest = !!(fastest && r && fastest.key === r.key);
                                const relative = r && fastest
                                    ? (r.mbPerSec / fastest.mbPerSec) * 100
                                    : null;
                                return (
                                    <tr key={key} className="border-b hover:bg-slate-50">
                                        <td className="py-2 px-2 font-medium">
                                            <span className="inline-block w-6 text-slate-500">{key}.</span>
                                            {label}
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            {r ? `${(r.durationMs / 1000).toFixed(2)}s` : '—'}
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <strong>{r ? formatMbps(r.mbPerSec) : '—'}</strong>
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            {relative != null ? `${relative.toFixed(1)}%` : '—'}
                                        </td>
                                        <td className="py-2 px-2">
                                            {isFastest && (
                                                <Badge className="bg-green-500 hover:bg-green-600">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    {t('fastest')}
                                                </Badge>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useUploadMetricsConfig, useUpdateMetricsConfig } from '@/hooks/use-upload-metrics';

const CHUNK_OPTIONS_MB = [5, 10, 25, 50] as const;
const CONCURRENCY_OPTIONS = [1, 2, 4, 8, 16] as const;

export function MultipartSettingsCard() {
    const t = useTranslations('uploadMetrics.multipartSettings');
    const { data: config, isLoading } = useUploadMetricsConfig();
    const updateConfig = useUpdateMetricsConfig();

    const [chunkMb, setChunkMb] = useState<number>(5);
    const [concurrency, setConcurrency] = useState<number>(8);
    const [initialized, setInitialized] = useState(false);

    // 백엔드 config → 로컬 state 초기화 (1회)
    useEffect(() => {
        if (!config || initialized) return;
        const serverChunkMb = Math.round(config.multipartChunkSize / 1024 / 1024);
        setChunkMb(serverChunkMb);
        setConcurrency(config.multipartConcurrency);
        setInitialized(true);
        // localStorage 도 동기화
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('multipartChunkSize', String(config.multipartChunkSize));
                window.localStorage.setItem('multipartConcurrency', String(config.multipartConcurrency));
            }
        } catch { /* ignore */ }
    }, [config, initialized]);

    async function saveSettings() {
        const chunkBytes = chunkMb * 1024 * 1024;
        try {
            window.localStorage.setItem('multipartChunkSize', String(chunkBytes));
            window.localStorage.setItem('multipartConcurrency', String(concurrency));
        } catch { /* ignore */ }
        try {
            await updateConfig.mutateAsync({
                multipartChunkSize: chunkBytes,
                multipartConcurrency: concurrency,
            });
            toast.success(`${t('saved')}: ${chunkMb}MB × ${concurrency}`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'unknown';
            toast.error(`${t('saveFailed')}: ${msg}`);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
                    <Settings2 className="w-5 h-5" /> {t('title')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-[14px] text-black font-normal">{t('description')}</p>
                {isLoading ? (
                    <div className="text-[14px] text-black font-normal">{t('loading')}</div>
                ) : (
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="ms-chunk" className="text-[14px] text-black font-normal">
                                {t('chunkLabel')}
                            </label>
                            <select
                                id="ms-chunk"
                                className="border rounded px-3 py-2 text-[14px] text-black"
                                value={chunkMb}
                                onChange={(e) => setChunkMb(parseInt(e.target.value, 10))}
                                disabled={updateConfig.isPending}
                            >
                                {CHUNK_OPTIONS_MB.map((mb) => (
                                    <option key={mb} value={mb}>
                                        {mb} MB
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="ms-conc" className="text-[14px] text-black font-normal">
                                {t('concurrencyLabel')}
                            </label>
                            <select
                                id="ms-conc"
                                className="border rounded px-3 py-2 text-[14px] text-black"
                                value={concurrency}
                                onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
                                disabled={updateConfig.isPending}
                            >
                                {CONCURRENCY_OPTIONS.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Button
                            onClick={() => saveSettings()}
                            disabled={updateConfig.isPending}
                        >
                            <Save className="w-4 h-4 mr-1" />
                            {updateConfig.isPending ? t('saving') : t('save')}
                        </Button>
                    </div>
                )}
                <div className="text-[13px] text-slate-500 font-normal">
                    {t('threshold')}
                </div>
            </CardContent>
        </Card>
    );
}

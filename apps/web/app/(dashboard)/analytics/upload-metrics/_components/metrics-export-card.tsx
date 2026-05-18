'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '@/lib/api';

type ExportFormat = 'csv' | 'json';
type KindFilter = '' | 'real' | 'speedtest';
type PhaseFilter = '' | 'client_to_api' | 'api_to_b2' | 'client_to_b2' | 'b2_download';

function toIsoDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export function MetricsExportCard() {
    const t = useTranslations('uploadMetrics.export');

    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const [from, setFrom] = useState<string>(toIsoDate(sevenDaysAgo));
    const [to, setTo] = useState<string>(toIsoDate(today));
    const [kind, setKind] = useState<KindFilter>('');
    const [phase, setPhase] = useState<PhaseFilter>('');
    const [downloadingFormat, setDownloadingFormat] = useState<ExportFormat | null>(null);

    async function handleDownload(format: ExportFormat) {
        if (!from || !to) return;
        if (from > to) {
            toast.error(t('invalidRange'));
            return;
        }
        if (downloadingFormat) return;

        setDownloadingFormat(format);
        try {
            const params = new URLSearchParams();
            params.set('from', from);
            params.set('to', to);
            params.set('format', format);
            if (kind) params.set('kind', kind);
            if (phase) params.set('phase', phase);

            // 페이지 내 다른 fetch 호출과 동일 패턴: 쿠키 인증(credentials: 'include') + X-Auth-Context
            const res = await fetch(`${API_URL}/upload/metrics/export?${params.toString()}`, {
                credentials: 'include',
                headers: { 'X-Auth-Context': 'staff' },
            });

            if (!res.ok) {
                const body = await res.text().catch(() => '');
                throw new Error(body || `HTTP ${res.status}`);
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `upload-metrics-${from}_${to}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success(t('downloadSuccess'));
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'unknown';
            toast.error(`${t('downloadFailed')}: ${msg}`);
        } finally {
            setDownloadingFormat(null);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
                    <Download className="w-5 h-5" /> {t('title')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-[14px] text-black font-normal">{t('description')}</p>
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="metrics-export-from" className="text-[14px] text-black font-normal">
                            {t('fromLabel')}
                        </label>
                        <input
                            id="metrics-export-from"
                            type="date"
                            value={from}
                            max={to || undefined}
                            onChange={(e) => setFrom(e.target.value)}
                            disabled={downloadingFormat !== null}
                            className="border rounded px-3 py-2 text-[14px] text-black"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="metrics-export-to" className="text-[14px] text-black font-normal">
                            {t('toLabel')}
                        </label>
                        <input
                            id="metrics-export-to"
                            type="date"
                            value={to}
                            min={from || undefined}
                            onChange={(e) => setTo(e.target.value)}
                            disabled={downloadingFormat !== null}
                            className="border rounded px-3 py-2 text-[14px] text-black"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="metrics-export-kind" className="text-[14px] text-black font-normal">
                            {t('kindLabel')}
                        </label>
                        <select
                            id="metrics-export-kind"
                            value={kind}
                            onChange={(e) => setKind(e.target.value as KindFilter)}
                            disabled={downloadingFormat !== null}
                            className="border rounded px-3 py-2 text-[14px] text-black"
                        >
                            <option value="">{t('kindAll')}</option>
                            <option value="real">{t('kindReal')}</option>
                            <option value="speedtest">{t('kindSpeedtest')}</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="metrics-export-phase" className="text-[14px] text-black font-normal">
                            {t('phaseLabel')}
                        </label>
                        <select
                            id="metrics-export-phase"
                            value={phase}
                            onChange={(e) => setPhase(e.target.value as PhaseFilter)}
                            disabled={downloadingFormat !== null}
                            className="border rounded px-3 py-2 text-[14px] text-black"
                        >
                            <option value="">{t('phaseAll')}</option>
                            <option value="client_to_api">{t('phaseClientToApi')}</option>
                            <option value="api_to_b2">{t('phaseApiToB2')}</option>
                            <option value="client_to_b2">{t('phaseClientToB2')}</option>
                            <option value="b2_download">{t('phaseB2Download')}</option>
                        </select>
                    </div>
                    <div className="flex items-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => handleDownload('csv')}
                            disabled={downloadingFormat !== null || !from || !to}
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-1" />
                            {downloadingFormat === 'csv' ? t('downloading') : t('downloadCsv')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleDownload('json')}
                            disabled={downloadingFormat !== null || !from || !to}
                        >
                            <FileJson className="w-4 h-4 mr-1" />
                            {downloadingFormat === 'json' ? t('downloading') : t('downloadJson')}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

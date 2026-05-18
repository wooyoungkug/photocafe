'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, RefreshCw } from 'lucide-react';
import { useUploadDiagnostics } from '@/hooks/use-upload-metrics';

/**
 * Cloudflare 공항코드 → 도시명 매핑 (주요 지역).
 * 알 수 없는 코드는 그대로 표시.
 */
const COLO_CITY: Record<string, string> = {
    ICN: '서울',
    NRT: '도쿄',
    KIX: '오사카',
    SIN: '싱가포르',
    HKG: '홍콩',
    PVG: '상하이',
    PEK: '베이징',
    LAX: '로스앤젤레스',
    SFO: '샌프란시스코',
    SEA: '시애틀',
    PDX: '포틀랜드',
    DFW: '댈러스',
    IAD: '워싱턴',
    EWR: '뉴욕',
    LHR: '런던',
    FRA: '프랑크푸르트',
    AMS: '암스테르담',
    CDG: '파리',
    SYD: '시드니',
    TPE: '타이베이',
};

const COUNTRY_FLAG: Record<string, string> = {
    KR: '🇰🇷',
    US: '🇺🇸',
    JP: '🇯🇵',
    CN: '🇨🇳',
    TW: '🇹🇼',
    HK: '🇭🇰',
    SG: '🇸🇬',
    GB: '🇬🇧',
    DE: '🇩🇪',
    FR: '🇫🇷',
    NL: '🇳🇱',
    AU: '🇦🇺',
};

const COUNTRY_NAME: Record<string, string> = {
    KR: '한국',
    US: '미국',
    JP: '일본',
    CN: '중국',
    TW: '대만',
    HK: '홍콩',
    SG: '싱가포르',
    GB: '영국',
    DE: '독일',
    FR: '프랑스',
    NL: '네덜란드',
    AU: '호주',
};

const SERVER_REGION_LABEL: Record<string, string> = {
    'us-west2': 'Railway 미국 오레곤',
    'us-west1': 'Railway 미국 오레곤',
    'us-east4': 'Railway 미국 버지니아',
    'us-east1': 'Railway 미국 버지니아',
    'asia-southeast1': 'Railway 싱가포르',
    'asia-northeast1': 'Railway 도쿄',
    'europe-west4': 'Railway 네덜란드',
};

interface NetworkInfo {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
}

export function DiagnosticsCard() {
    const t = useTranslations('uploadMetrics.diagnostics');
    const { data, isLoading, isError, refetch, isFetching } = useUploadDiagnostics();
    const [deviceMemory, setDeviceMemory] = useState<number | null>(null);
    const [network, setNetwork] = useState<NetworkInfo | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
        try {
            const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
            if (typeof dm === 'number') setDeviceMemory(dm);
        } catch { /* ignore */ }
        try {
            const conn = (navigator as Navigator & {
                connection?: { effectiveType?: string; downlink?: number; rtt?: number };
            }).connection;
            if (conn) {
                setNetwork({
                    effectiveType: conn.effectiveType,
                    downlink: conn.downlink,
                    rtt: conn.rtt,
                });
            }
        } catch { /* ignore */ }
    }, []);

    function formatColo(colo: string | null): string {
        if (!colo) return '—';
        const city = COLO_CITY[colo];
        return city ? `🛬 ${colo} (${city})` : `🛬 ${colo}`;
    }

    function formatCountry(country: string | null): string {
        if (!country) return '—';
        const flag = COUNTRY_FLAG[country] ?? '';
        const name = COUNTRY_NAME[country] ?? country;
        return flag ? `${flag} ${name}` : name;
    }

    function formatServerRegion(region: string): string {
        return SERVER_REGION_LABEL[region] ?? region;
    }

    function truncateUA(ua: string | null, max = 50): string {
        if (!ua) return '—';
        return ua.length > max ? ua.slice(0, max) + '...' : ua;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
                        <Globe className="w-5 h-5" /> {t('title')}
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
                        {t('refresh')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-[14px] text-black font-normal">{t('loading')}</div>
                ) : isError || !data ? (
                    <div className="text-[14px] text-black font-normal">{t('loadError')}</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                        <Row label={t('ipLabel')} value={data.ip ?? '—'} />
                        <Row label={t('countryLabel')} value={formatCountry(data.country)} />
                        <Row label={t('cfColoLabel')} value={formatColo(data.cfColo)} />
                        <Row label={t('cityLabel')} value={data.city ?? '—'} />
                        <Row label={t('protocolLabel')} value={data.protocol ?? '—'} />
                        <Row label={t('browserLabel')} value={truncateUA(data.userAgent)} />
                        <Row
                            label={t('memoryLabel')}
                            value={deviceMemory != null ? `${deviceMemory} GB` : '—'}
                        />
                        <Row
                            label={t('connectionLabel')}
                            value={
                                network
                                    ? `${network.effectiveType ?? '—'} · ${network.downlink ?? '—'} Mbps · ${network.rtt ?? '—'} ms`
                                    : '—'
                            }
                        />
                        <Row
                            label={t('serverLabel')}
                            value={formatServerRegion(data.server.region)}
                        />
                        <Row
                            label={t('nodeVersionLabel')}
                            value={data.server.nodeVersion}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between border-b py-2">
            <span className="text-[14px] text-black font-normal">{label}</span>
            <span className="text-[14px] text-black font-normal text-right">{value}</span>
        </div>
    );
}

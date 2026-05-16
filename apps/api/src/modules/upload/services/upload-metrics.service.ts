import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { B2StorageService } from './b2-storage.service';

export type MetricPhase = 'client_to_api' | 'api_to_b2' | 'b2_download' | 'client_to_b2';

export interface RecordMetricInput {
    kind: 'real' | 'speedtest';
    phase: MetricPhase;
    endpoint?: string | null;
    userId?: string | null;
    userType?: string | null;
    fileSize: number;
    durationMs: number;
    success?: boolean;
    errorMessage?: string | null;
    clientIp?: string | null;
    userAgent?: string | null;
    countryCode?: string | null;
    metadata?: Record<string, unknown> | null;
}

export interface MetricsQuery {
    kind?: 'real' | 'speedtest';
    phase?: MetricPhase;
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
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

export interface WeekdayStatRow {
    dow: number;
    phase: string;
    count: number;
    avgSpeedKbps: number;
    p50SpeedKbps: number;
    p95SpeedKbps: number;
    totalBytes: number;
}

@Injectable()
export class UploadMetricsService {
    private readonly logger = new Logger(UploadMetricsService.name);

    /** 런타임 샘플링 비율 (0~1). 재시작 시 env 기본값으로 초기화된다. */
    private _sampleRate: number;
    /** 클라이언트→B2 직접 업로드 실측 기록 샘플링 비율 (0~1). */
    private _b2SampleRate: number;

    constructor(private readonly prisma: PrismaService) {
        const raw = process.env.UPLOAD_METRICS_SAMPLE_RATE;
        const parsed = raw ? parseFloat(raw) : 0.5;
        this._sampleRate = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1) : 0.5;
        const b2Raw = process.env.UPLOAD_METRICS_B2_SAMPLE_RATE;
        const b2Parsed = b2Raw ? parseFloat(b2Raw) : 0.3;
        this._b2SampleRate = Number.isFinite(b2Parsed) ? Math.min(Math.max(b2Parsed, 0), 1) : 0.3;
    }

    getSampleRate(): number {
        return this._sampleRate;
    }

    setSampleRate(rate: number): number {
        this._sampleRate = Math.min(Math.max(Number.isFinite(rate) ? rate : 0.1, 0), 1);
        return this._sampleRate;
    }

    getB2SampleRate(): number {
        return this._b2SampleRate;
    }

    setB2SampleRate(rate: number): number {
        this._b2SampleRate = Math.min(Math.max(Number.isFinite(rate) ? rate : 0.3, 0), 1);
        return this._b2SampleRate;
    }

    /**
     * 메트릭을 비동기 저장. 실패하더라도 호출자에게 영향 없음.
     * setImmediate 를 통해 요청 응답 흐름과 분리.
     */
    record(input: RecordMetricInput): void {
        setImmediate(async () => {
            try {
                const durationSec = Math.max(input.durationMs, 1) / 1000;
                const speedKbps = input.fileSize / 1024 / durationSec;

                await this.prisma.uploadMetric.create({
                    data: {
                        kind: input.kind,
                        phase: input.phase,
                        endpoint: input.endpoint ?? null,
                        userId: input.userId ?? null,
                        userType: input.userType ?? null,
                        fileSize: BigInt(Math.max(0, Math.floor(input.fileSize))),
                        durationMs: Math.max(0, Math.floor(input.durationMs)),
                        speedKbps: Number.isFinite(speedKbps) ? speedKbps : 0,
                        success: input.success ?? true,
                        errorMessage: input.errorMessage ?? null,
                        clientIp: input.clientIp ?? null,
                        userAgent: input.userAgent ?? null,
                        countryCode: input.countryCode ?? null,
                        metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
                    },
                });
            } catch (err) {
                this.logger.warn(`메트릭 저장 실패: ${(err as Error).message}`);
            }
        });
    }

    /**
     * 시계열 집계 (DB 수준 GROUP BY)
     */
    async getTimeSeries(query: MetricsQuery) {
        const { kind, phase, startDate, endDate, groupBy = 'hour' } = query;

        let truncExpr: string;
        switch (groupBy) {
            case 'year':
                truncExpr = `TO_CHAR("createdAt", 'YYYY')`;
                break;
            case 'quarter':
                truncExpr = `TO_CHAR("createdAt", 'YYYY') || '-Q' || EXTRACT(QUARTER FROM "createdAt")::text`;
                break;
            case 'month':
                truncExpr = `TO_CHAR("createdAt", 'YYYY-MM')`;
                break;
            case 'week':
                truncExpr = `TO_CHAR(DATE_TRUNC('week', "createdAt"), 'YYYY-MM-DD')`;
                break;
            case 'day':
                truncExpr = `TO_CHAR("createdAt", 'YYYY-MM-DD')`;
                break;
            default:
                truncExpr = `TO_CHAR(DATE_TRUNC('hour', "createdAt"), 'YYYY-MM-DD HH24:00')`;
        }

        const conditions: Prisma.Sql[] = [Prisma.sql`1=1`];
        if (kind) conditions.push(Prisma.sql`kind = ${kind}`);
        if (phase) conditions.push(Prisma.sql`phase = ${phase}`);
        if (startDate) conditions.push(Prisma.sql`"createdAt" >= ${startDate}`);
        if (endDate) conditions.push(Prisma.sql`"createdAt" <= ${endDate}`);
        const whereClause = Prisma.join(conditions, ' AND ');

        const rows = await this.prisma.$queryRaw<
            { period: string; count: bigint; avg_speed: number; avg_size: number; avg_duration: number }[]
        >(
            Prisma.sql`SELECT ${Prisma.raw(truncExpr)} as period,
                COUNT(*) as count,
                COALESCE(AVG("speedKbps"), 0)::float as avg_speed,
                COALESCE(AVG("fileSize"::bigint), 0)::float as avg_size,
                COALESCE(AVG("durationMs"), 0)::float as avg_duration
              FROM upload_metrics
              WHERE ${whereClause}
              GROUP BY period
              ORDER BY period ASC`,
        );

        return {
            data: rows.map(r => ({
                period: r.period,
                count: Number(r.count),
                avgSpeedKbps: Number(r.avg_speed),
                avgFileSize: Number(r.avg_size),
                avgDurationMs: Number(r.avg_duration),
            })),
            period: { startDate, endDate, groupBy },
        };
    }

    /**
     * 최근 N건 조회
     */
    async getRecent(limit = 50, kind?: 'real' | 'speedtest') {
        const rows = await this.prisma.uploadMetric.findMany({
            where: kind ? { kind } : undefined,
            orderBy: { createdAt: 'desc' },
            take: Math.min(Math.max(limit, 1), 500),
        });
        return rows.map(r => ({
            ...r,
            fileSize: Number(r.fileSize),
        }));
    }

    /**
     * 범위별 요약 통계 (평균/p50/p95)
     */
    async getSummary(range: '1h' | '24h' | '7d' | '30d' = '24h') {
        const ms: Record<typeof range, number> = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
        };
        const since = new Date(Date.now() - ms[range]);

        const phases = ['client_to_api', 'api_to_b2', 'client_to_b2'] as const;
        const result: Record<string, any> = {};

        for (const phase of phases) {
            const rows = await this.prisma.$queryRaw<
                {
                    count: bigint;
                    avg_speed: number;
                    p10_speed: number;
                    p20_speed: number;
                    p30_speed: number;
                    p40_speed: number;
                    p50_speed: number;
                    p60_speed: number;
                    p70_speed: number;
                    p80_speed: number;
                    p90_speed: number;
                    p95_speed: number;
                    total_bytes: number;
                }[]
            >(
                Prisma.sql`SELECT
                    COUNT(*) as count,
                    COALESCE(AVG("speedKbps"), 0)::float as avg_speed,
                    COALESCE(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p10_speed,
                    COALESCE(PERCENTILE_CONT(0.20) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p20_speed,
                    COALESCE(PERCENTILE_CONT(0.30) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p30_speed,
                    COALESCE(PERCENTILE_CONT(0.40) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p40_speed,
                    COALESCE(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p50_speed,
                    COALESCE(PERCENTILE_CONT(0.60) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p60_speed,
                    COALESCE(PERCENTILE_CONT(0.70) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p70_speed,
                    COALESCE(PERCENTILE_CONT(0.80) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p80_speed,
                    COALESCE(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p90_speed,
                    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p95_speed,
                    COALESCE(SUM("fileSize"::bigint), 0)::float as total_bytes
                  FROM upload_metrics
                  WHERE phase = ${phase} AND kind = 'real' AND "createdAt" >= ${since}`,
            );
            const row = rows[0];
            result[phase] = {
                count: Number(row?.count ?? 0),
                avgSpeedKbps: Number(row?.avg_speed ?? 0),
                p10SpeedKbps: Number(row?.p10_speed ?? 0),
                p20SpeedKbps: Number(row?.p20_speed ?? 0),
                p30SpeedKbps: Number(row?.p30_speed ?? 0),
                p40SpeedKbps: Number(row?.p40_speed ?? 0),
                p50SpeedKbps: Number(row?.p50_speed ?? 0),
                p60SpeedKbps: Number(row?.p60_speed ?? 0),
                p70SpeedKbps: Number(row?.p70_speed ?? 0),
                p80SpeedKbps: Number(row?.p80_speed ?? 0),
                p90SpeedKbps: Number(row?.p90_speed ?? 0),
                p95SpeedKbps: Number(row?.p95_speed ?? 0),
                totalBytes: Number(row?.total_bytes ?? 0),
            };
        }

        // speedtest 별도 집계 (client_to_api phase 한정).
        // 1MB 스피드테스트 데이터가 real 통계의 p10~p40을 오염시키는 문제를 분리 표시.
        const speedtestRows = await this.prisma.$queryRaw<
            {
                count: bigint;
                avg_speed: number;
                p50_speed: number;
                p95_speed: number;
                max_speed: number;
                total_bytes: number;
            }[]
        >(
            Prisma.sql`SELECT
                COUNT(*) as count,
                COALESCE(AVG("speedKbps"), 0)::float as avg_speed,
                COALESCE(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p50_speed,
                COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p95_speed,
                COALESCE(MAX("speedKbps"), 0)::float as max_speed,
                COALESCE(SUM("fileSize"::bigint), 0)::float as total_bytes
              FROM upload_metrics
              WHERE phase = 'client_to_api' AND kind = 'speedtest' AND "createdAt" >= ${since}`,
        );
        const speedtestRow = speedtestRows[0];
        const speedtest = {
            count: Number(speedtestRow?.count ?? 0),
            avgSpeedKbps: Number(speedtestRow?.avg_speed ?? 0),
            p50SpeedKbps: Number(speedtestRow?.p50_speed ?? 0),
            p95SpeedKbps: Number(speedtestRow?.p95_speed ?? 0),
            maxSpeedKbps: Number(speedtestRow?.max_speed ?? 0),
            totalBytes: Number(speedtestRow?.total_bytes ?? 0),
        };

        return { range, since, phases: result, speedtest };
    }

    /**
     * 일/월/분기/연별 집계 통계 (실 업로드 only).
     * 각 기간·구간별 평균/p50/p95 속도 및 누적 용량 반환.
     */
    async getAggregatedStats(periodType: 'day' | 'month' | 'quarter' | 'year'): Promise<{
        periodType: string;
        rows: AggregatedStatRow[];
    }> {
        let truncExpr: string;
        let limitRows: number;
        switch (periodType) {
            case 'year':
                truncExpr = `TO_CHAR("createdAt", 'YYYY')`;
                limitRows = 10;
                break;
            case 'quarter':
                truncExpr = `TO_CHAR("createdAt", 'YYYY') || '-Q' || EXTRACT(QUARTER FROM "createdAt")::text`;
                limitRows = 12;
                break;
            case 'month':
                truncExpr = `TO_CHAR("createdAt", 'YYYY-MM')`;
                limitRows = 24;
                break;
            default:
                truncExpr = `TO_CHAR("createdAt", 'YYYY-MM-DD')`;
                limitRows = 90;
        }

        const rows = await this.prisma.$queryRaw<
            {
                period: string;
                phase: string;
                count: bigint;
                avg_speed: number;
                p50_speed: number;
                p95_speed: number;
                total_bytes: number;
            }[]
        >(
            Prisma.sql`SELECT
                ${Prisma.raw(truncExpr)} as period,
                phase,
                COUNT(*) as count,
                COALESCE(AVG("speedKbps"), 0)::float as avg_speed,
                COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p50_speed,
                COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p95_speed,
                COALESCE(SUM("fileSize"::bigint), 0)::float as total_bytes
              FROM upload_metrics
              WHERE kind = 'real'
                AND phase IN ('client_to_api', 'api_to_b2')
              GROUP BY period, phase
              ORDER BY period DESC
              LIMIT ${limitRows * 2}`,
        );

        return {
            periodType,
            rows: rows.map(r => ({
                period: r.period,
                phase: r.phase,
                count: Number(r.count),
                avgSpeedKbps: Number(r.avg_speed),
                p50SpeedKbps: Number(r.p50_speed),
                p95SpeedKbps: Number(r.p95_speed),
                totalBytes: Number(r.total_bytes),
            })),
        };
    }

    /**
     * 요일별 집계 통계 (실 업로드 only).
     * DOW: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토 (PostgreSQL EXTRACT DOW 기준)
     */
    async getWeekdayStats(): Promise<{ rows: WeekdayStatRow[] }> {
        const rows = await this.prisma.$queryRaw<
            {
                dow: number;
                phase: string;
                count: bigint;
                avg_speed: number;
                p50_speed: number;
                p95_speed: number;
                total_bytes: number;
            }[]
        >(
            Prisma.sql`SELECT
                EXTRACT(DOW FROM "createdAt")::int as dow,
                phase,
                COUNT(*) as count,
                COALESCE(AVG("speedKbps"), 0)::float as avg_speed,
                COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p50_speed,
                COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p95_speed,
                COALESCE(SUM("fileSize"::bigint), 0)::float as total_bytes
              FROM upload_metrics
              WHERE kind = 'real'
                AND phase IN ('client_to_api', 'api_to_b2')
              GROUP BY dow, phase
              ORDER BY dow ASC`,
        );

        return {
            rows: rows.map(r => ({
                dow: Number(r.dow),
                phase: r.phase,
                count: Number(r.count),
                avgSpeedKbps: Number(r.avg_speed),
                p50SpeedKbps: Number(r.p50_speed),
                p95SpeedKbps: Number(r.p95_speed),
                totalBytes: Number(r.total_bytes),
            })),
        };
    }

    /**
     * 스토리지 사용 현황 + 비용 한눈에 보기.
     *
     * - B2 public/private 버킷 객체 수·바이트 (B2StorageService 캐시 1시간)
     * - PostgreSQL DB 크기 (pg_database_size)
     * - 업로드 추이: 최근 30일(일별) + 최근 12개월(월별), kind='real' success=true
     * - 비용: B2 스토리지 $0.006/GB/월, 1 USD = 1,400 KRW
     *
     * 모든 외부 호출은 개별 try/catch 로 감싸 부분 실패해도 응답을 채워 반환한다.
     */
    async getStorageOverview(b2Service?: B2StorageService) {
        const RATE_USD_TO_KRW = 1400;
        const B2_PRICE_PER_GB_USD = 0.006;
        const BYTES_PER_GB = 1024 ** 3;

        // ---- B2 버킷 스캔 (병렬) ----
        const publicBucketName = b2Service?.getPublicBucket?.() ?? '';
        const privateBucketName = b2Service?.getPrivateBucket?.() ?? '';
        const b2Enabled = !!b2Service && b2Service.isEnabled?.() === true;

        const emptyStats = { fileCount: 0, totalBytes: 0, scannedAt: new Date() };
        const [publicStats, privateStats] = await Promise.all([
            b2Enabled && publicBucketName
                ? b2Service!.getBucketStats(publicBucketName).catch(err => {
                      this.logger.warn(`B2 public 버킷 스캔 실패: ${(err as Error).message}`);
                      return emptyStats;
                  })
                : Promise.resolve(emptyStats),
            b2Enabled && privateBucketName
                ? b2Service!.getBucketStats(privateBucketName).catch(err => {
                      this.logger.warn(`B2 private 버킷 스캔 실패: ${(err as Error).message}`);
                      return emptyStats;
                  })
                : Promise.resolve(emptyStats),
        ]);

        const totalBytes = publicStats.totalBytes + privateStats.totalBytes;
        // 둘 중 더 최근 스캔 시각을 대표값으로 (가장 최근 데이터 기준)
        const scannedAt =
            publicStats.scannedAt.getTime() >= privateStats.scannedAt.getTime()
                ? publicStats.scannedAt
                : privateStats.scannedAt;
        const cacheAgeSeconds = Math.max(
            0,
            Math.floor((Date.now() - scannedAt.getTime()) / 1000),
        );

        // ---- DB 크기 ----
        let dbSizeBytes = 0;
        let dbName = '';
        try {
            const dbSizeResult = await this.prisma.$queryRaw<
                [{ bytes: bigint; name: string }]
            >`
                SELECT pg_database_size(current_database()) as bytes,
                       current_database() as name
            `;
            const row = dbSizeResult?.[0];
            if (row) {
                dbSizeBytes = Number(row.bytes);
                dbName = String(row.name ?? '');
            }
        } catch (err) {
            this.logger.warn(`DB 크기 조회 실패: ${(err as Error).message}`);
        }

        // ---- 업로드 추이 (일별 30일 / 월별 12개월) ----
        let dailyRows: Array<{ date: string; bytes: bigint; count: bigint }> = [];
        try {
            dailyRows = await this.prisma.$queryRaw<
                Array<{ date: string; bytes: bigint; count: bigint }>
            >`
                SELECT
                    DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC')::date::text as date,
                    COALESCE(SUM("fileSize"::bigint), 0) as bytes,
                    COUNT(*) as count
                FROM upload_metrics
                WHERE success = true
                  AND kind = 'real'
                  AND "createdAt" >= NOW() - INTERVAL '30 days'
                GROUP BY 1
                ORDER BY 1
            `;
        } catch (err) {
            this.logger.warn(`일별 업로드 추이 조회 실패: ${(err as Error).message}`);
        }

        let monthlyRows: Array<{ month: string; bytes: bigint; count: bigint }> = [];
        try {
            monthlyRows = await this.prisma.$queryRaw<
                Array<{ month: string; bytes: bigint; count: bigint }>
            >`
                SELECT
                    TO_CHAR(DATE_TRUNC('month', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM') as month,
                    COALESCE(SUM("fileSize"::bigint), 0) as bytes,
                    COUNT(*) as count
                FROM upload_metrics
                WHERE success = true
                  AND kind = 'real'
                  AND "createdAt" >= NOW() - INTERVAL '12 months'
                GROUP BY 1
                ORDER BY 1
            `;
        } catch (err) {
            this.logger.warn(`월별 업로드 추이 조회 실패: ${(err as Error).message}`);
        }

        // ---- 비용 계산 ----
        const toGb = (bytes: number) => bytes / BYTES_PER_GB;
        const b2PublicUsd = +(toGb(publicStats.totalBytes) * B2_PRICE_PER_GB_USD).toFixed(4);
        const b2PrivateUsd = +(toGb(privateStats.totalBytes) * B2_PRICE_PER_GB_USD).toFixed(4);
        const b2StorageMonthlyUsd = +(b2PublicUsd + b2PrivateUsd).toFixed(4);
        const b2StorageMonthlyKrw = Math.round(b2StorageMonthlyUsd * RATE_USD_TO_KRW);

        return {
            b2: {
                public: {
                    bucket: publicBucketName,
                    fileCount: publicStats.fileCount,
                    totalBytes: publicStats.totalBytes,
                },
                private: {
                    bucket: privateBucketName,
                    fileCount: privateStats.fileCount,
                    totalBytes: privateStats.totalBytes,
                },
                totalBytes,
                scannedAt: scannedAt.toISOString(),
                cacheAgeSeconds,
            },
            db: {
                sizeBytes: dbSizeBytes,
                name: dbName,
            },
            uploadTrend: {
                daily: dailyRows.map(r => ({
                    date: r.date,
                    bytes: Number(r.bytes),
                    count: Number(r.count),
                })),
                monthly: monthlyRows.map(r => ({
                    month: r.month,
                    bytes: Number(r.bytes),
                    count: Number(r.count),
                })),
            },
            cost: {
                b2StorageMonthlyUsd,
                b2StorageMonthlyKrw,
                breakdown: {
                    b2PublicUsd,
                    b2PrivateUsd,
                    totalUsd: b2StorageMonthlyUsd,
                    totalKrw: b2StorageMonthlyKrw,
                },
            },
        };
    }
}

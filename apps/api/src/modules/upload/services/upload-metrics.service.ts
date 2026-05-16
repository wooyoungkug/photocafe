import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface RecordMetricInput {
    kind: 'real' | 'speedtest';
    phase: 'client_to_api' | 'api_to_b2' | 'b2_download';
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
    phase?: 'client_to_api' | 'api_to_b2' | 'b2_download';
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

@Injectable()
export class UploadMetricsService {
    private readonly logger = new Logger(UploadMetricsService.name);

    constructor(private readonly prisma: PrismaService) {}

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

        const phases = ['client_to_api', 'api_to_b2'] as const;
        const result: Record<string, any> = {};

        for (const phase of phases) {
            const rows = await this.prisma.$queryRaw<
                {
                    count: bigint;
                    avg_speed: number;
                    p50_speed: number;
                    p95_speed: number;
                    total_bytes: number;
                }[]
            >(
                Prisma.sql`SELECT
                    COUNT(*) as count,
                    COALESCE(AVG("speedKbps"), 0)::float as avg_speed,
                    COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p50_speed,
                    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "speedKbps"), 0)::float as p95_speed,
                    COALESCE(SUM("fileSize"::bigint), 0)::float as total_bytes
                  FROM upload_metrics
                  WHERE phase = ${phase} AND "createdAt" >= ${since}`,
            );
            const row = rows[0];
            result[phase] = {
                count: Number(row?.count ?? 0),
                avgSpeedKbps: Number(row?.avg_speed ?? 0),
                p50SpeedKbps: Number(row?.p50_speed ?? 0),
                p95SpeedKbps: Number(row?.p95_speed ?? 0),
                totalBytes: Number(row?.total_bytes ?? 0),
            };
        }

        return { range, since, phases: result };
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
}

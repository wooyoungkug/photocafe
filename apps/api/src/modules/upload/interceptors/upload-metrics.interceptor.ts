import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { tap, catchError, throwError } from 'rxjs';
import { UploadMetricsService } from '../services/upload-metrics.service';

/**
 * 업로드 컨트롤러 메서드 진입~종료 시간을 측정해 UploadMetric 으로 기록.
 *
 * 정책:
 * - 실 업로드(`/upload/album-file` 등): UPLOAD_METRICS_SAMPLE_RATE (기본 0.1, 10%) 샘플링
 * - 속도테스트(`/upload/speedtest/*`): 100% 기록 + kind='speedtest'
 * - req.metricsSampled = true 플래그를 심어 B2StorageService 가 같은 요청만 페어 기록하도록 함
 */
@Injectable()
export class UploadMetricsInterceptor implements NestInterceptor {
    constructor(private readonly metrics: UploadMetricsService) {}

    intercept(context: ExecutionContext, next: CallHandler) {
        const req = context.switchToHttp().getRequest<any>();
        const path: string = req?.route?.path || req?.url || '';

        // presign 엔드포인트는 URL 발급만 하고 데이터 전송이 없으므로 기록 제외
        if (typeof path === 'string' && path.includes('presign')) {
            req.metricsSampled = false;
            return next.handle();
        }

        const isSpeedtest = typeof path === 'string' && path.includes('/speedtest/');

        // 메트릭 대상 결정 — 서비스에서 런타임 sampleRate 를 매 요청마다 읽음
        const sampled = isSpeedtest || Math.random() < this.metrics.getSampleRate();
        req.metricsSampled = sampled;
        req.metricsKind = isSpeedtest ? 'speedtest' : 'real';

        if (!sampled) {
            return next.handle();
        }

        const start = process.hrtime.bigint();

        const finalize = (success: boolean, errorMessage?: string) => {
            const end = process.hrtime.bigint();
            const durationMs = Number((end - start) / 1_000_000n);
            const file = req.file as { size?: number } | undefined;
            const fileSize = file?.size ?? 0;

            // 파일이 없거나 다운로드 테스트인 경우 (다운로드는 별도 처리)
            if (fileSize <= 0 && !isSpeedtest) {
                return;
            }

            const user = req.user || {};
            const cfCountry = req.headers?.['cf-ipcountry'];
            const cfRay = req.headers?.['cf-ray'];
            const userAgent = req.headers?.['user-agent'];
            const ip =
                (req.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
                req.ip ||
                req.socket?.remoteAddress;

            this.metrics.record({
                kind: req.metricsKind,
                phase: 'client_to_api',
                endpoint: typeof path === 'string' ? path : null,
                userId: user?.sub || user?.id || null,
                userType: user?.type || (user?.sub ? 'authenticated' : 'anonymous'),
                fileSize,
                durationMs,
                success,
                errorMessage,
                clientIp: typeof ip === 'string' ? ip : null,
                userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 500) : null,
                countryCode: typeof cfCountry === 'string' ? cfCountry : null,
                metadata: typeof cfRay === 'string' ? { cfRay } : null,
            });
        };

        return next.handle().pipe(
            tap(() => finalize(true)) as any,
            catchError((err) => {
                finalize(false, (err as Error)?.message?.slice(0, 500));
                return throwError(() => err);
            }) as any,
        );
    }
}

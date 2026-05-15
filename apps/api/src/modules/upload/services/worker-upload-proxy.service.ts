import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

/**
 * Cloudflare Worker 업로드 프록시용 서명 URL 발급기.
 *
 * R2 Workers binding 을 통해 브라우저 ↔ R2 사이 RTT 를 제거하기 위한 보조 서비스.
 * S3 presigned URL 대신 Worker 가 검증할 HMAC 서명 URL 을 생성한다.
 *
 * 환경변수:
 *   - UPLOAD_WORKER_ENABLED=true        활성화 토글
 *   - UPLOAD_WORKER_URL                 Worker 베이스 URL (예: https://upload.photocafe.co.kr)
 *   - UPLOAD_WORKER_SECRET              Worker 와 공유하는 HMAC 시크릿 (32+ bytes)
 *
 * 서명 payload: `${key}|${uploadId}|${partNumber}|${exp}`
 *   - exp 는 unix epoch seconds
 *   - sig 는 base64url 인코딩된 HMAC-SHA256 결과
 */
@Injectable()
export class WorkerUploadProxyService {
  private readonly logger = new Logger(WorkerUploadProxyService.name);
  private enabled = false;
  private baseUrl = '';
  private secret = '';

  constructor(private readonly config: ConfigService) {
    this.hydrate();
  }

  private getFirst(...keys: string[]): string {
    for (const k of keys) {
      const v = this.config.get<string>(k);
      if (v && String(v).trim()) return String(v).trim();
    }
    return '';
  }

  private hydrate(): void {
    const flag = this.getFirst('UPLOAD_WORKER_ENABLED').toLowerCase();
    if (flag !== 'true' && flag !== '1') {
      this.enabled = false;
      return;
    }
    const url = this.getFirst('UPLOAD_WORKER_URL').replace(/\/+$/, '');
    const secret = this.getFirst('UPLOAD_WORKER_SECRET');
    if (!url || !secret) {
      this.logger.warn(
        'UPLOAD_WORKER_ENABLED=true 이지만 UPLOAD_WORKER_URL 또는 UPLOAD_WORKER_SECRET 미설정 — 비활성화',
      );
      this.enabled = false;
      return;
    }
    this.baseUrl = url;
    this.secret = secret;
    this.enabled = true;
    this.logger.log(`Worker upload proxy: enabled (url=${url})`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 청크별 Worker 업로드 URL 발급.
   * Worker 는 PUT 요청 본문을 R2 binding 으로 그대로 uploadPart 한다.
   */
  signPartUrl(params: {
    key: string;
    uploadId: string;
    partNumber: number;
    expiresInSeconds?: number;
  }): string {
    if (!this.enabled) {
      throw new Error('Worker upload proxy is not enabled');
    }
    const expiresIn = Number.isFinite(params.expiresInSeconds) && params.expiresInSeconds! > 0
      ? Math.min(params.expiresInSeconds!, 3600)
      : 1800;
    const exp = Math.floor(Date.now() / 1000) + expiresIn;
    const payload = `${params.key}|${params.uploadId}|${params.partNumber}|${exp}`;
    const sig = createHmac('sha256', this.secret).update(payload).digest('base64url');

    const qs = new URLSearchParams({
      key: params.key,
      uploadId: params.uploadId,
      partNumber: String(params.partNumber),
      exp: String(exp),
      sig,
    });
    return `${this.baseUrl}/parts?${qs.toString()}`;
  }
}

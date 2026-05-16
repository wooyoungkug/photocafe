import { Injectable, Logger, OnModuleInit, Optional, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutBucketCorsCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NodeHttp2Handler } from '@smithy/node-http-handler';
import * as fs from 'fs';
import * as path from 'path';
import { UploadMetricsService } from './upload-metrics.service';

/**
 * order.service.sanitizeStorageKeyPart 와 동일한 정규화.
 * 업로드/다운로드 양쪽이 같은 키를 만들어야 매칭됨.
 */
function sanitizeStorageKeyPart(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/^\.+/, '')
    .replace(/\.\./g, '_')
    .replace(/[^a-zA-Z0-9._/-]/g, '_');
}

/** Backblaze B2 S3-compatible API region (docs: us-east-005) */
const B2_REGION = 'us-east-005';

const DEFAULT_PRESIGN_SECONDS = 300;

@Injectable()
export class B2StorageService implements OnModuleInit {
  private readonly logger = new Logger(B2StorageService.name);
  private client: S3Client | null = null;
  private privateBucket = '';
  private publicBucket = '';
  /** e.g. https://f005.backblazeb2.com/file/photocafe-public or custom CDN path */
  private publicUrlPrefix = '';
  private enabled = false;

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly metrics?: UploadMetricsService,
  ) {
    this.hydrate();
  }

  /**
   * B2 전송 구간(API→B2) 측정. 호출자가 명시적으로 사용.
   * 실패해도 호출자에게 영향 없음.
   * 샘플링은 호출자가 결정해 이 메서드를 호출할지 여부로 제어한다.
   */
  private recordTransfer(
    bytes: number,
    durationMs: number,
    success: boolean,
    errorMessage?: string,
    extra?: { endpoint?: string; userId?: string; userType?: string; kind?: 'real' | 'speedtest' },
  ): void {
    if (!this.metrics) return;
    this.metrics.record({
      kind: extra?.kind ?? 'real',
      phase: 'api_to_b2',
      endpoint: extra?.endpoint ?? null,
      userId: extra?.userId ?? null,
      userType: extra?.userType ?? null,
      fileSize: bytes,
      durationMs,
      success,
      errorMessage,
    });
  }

  private getFirst(...keys: string[]): string {
    for (const k of keys) {
      const v = this.config.get<string>(k);
      if (v && String(v).trim()) return String(v).trim();
    }
    return '';
  }

  private hydrate(): void {
    const endpoint = this.getFirst('B2_S3_ENDPOINT', 'B2_ORIGINALS_ENDPOINT');
    const keyId = this.getFirst('B2_KEY_ID', 'B2_ORIGINALS_KEY_ID');
    const appKey = this.getFirst('B2_APPLICATION_KEY', 'B2_ORIGINALS_APP_KEY');
    this.privateBucket = this.getFirst('B2_PRIVATE_BUCKET', 'B2_ORIGINALS_BUCKET');
    this.publicBucket = this.getFirst('B2_PUBLIC_BUCKET');

    const explicitBase = this.getFirst('B2_PUBLIC_BASE_URL');
    if (explicitBase) {
      this.publicUrlPrefix = explicitBase.replace(/\/$/, '');
    } else if (this.publicBucket) {
      this.publicUrlPrefix = `https://f005.backblazeb2.com/file/${this.publicBucket}`;
    } else {
      this.publicUrlPrefix = '';
    }

    if (endpoint && keyId && appKey && this.privateBucket) {
      this.client = new S3Client({
        region: B2_REGION,
        endpoint,
        forcePathStyle: true,
        // CRC32 자동 추가 비활성: presigned URL 단순화 + 브라우저 PUT 호환성 ↑
        requestChecksumCalculation: 'WHEN_REQUIRED',
        credentials: { accessKeyId: keyId, secretAccessKey: appKey },
        // HTTP/2 multiplexing: 단일 세션 위 다수 스트림 동시 처리 → TLS 핸드셰이크 횟수 감소
        requestHandler: new NodeHttp2Handler({
          requestTimeout: 120_000,
          sessionTimeout: 60_000,
        }),
        // 일시적 오류(503, 429, 네트워크 단절) 시 지수 백오프 자동 재시도
        maxAttempts: 3,
      });
      this.enabled = true;
    }
  }

  /** True when private bucket + Application Key are configured (public bucket optional) */
  isEnabled(): boolean {
    return this.enabled;
  }

  getPrivateBucket(): string {
    return this.privateBucket;
  }

  getPublicBucket(): string {
    return this.publicBucket;
  }

  onModuleInit(): void {
    if (this.enabled) {
      this.logger.log(
        `B2: private=${this.privateBucket}, public=${this.publicBucket || '—'}; public URL base=${this.publicUrlPrefix || '—'}`,
      );

      // B2_CONFIGURE_CORS=true 일 때만 부팅 시 CORS 자동 등록.
      // 운영에서는 최초 1회만 켜고 다시 끄는 것을 권장.
      if (this.getFirst('B2_CONFIGURE_CORS').toLowerCase() === 'true') {
        this.configurePrivateBucketCors().catch((err) => {
          this.logger.error(
            `B2 CORS configuration failed: ${err?.message || err}`,
          );
        });
      }
    } else {
      this.logger.log(
        'B2 object storage: off (set B2_S3_ENDPOINT, B2_KEY_ID, B2_APPLICATION_KEY, B2_PRIVATE_BUCKET — or legacy B2_ORIGINALS_*)',
      );
    }
  }

  private requireClient(): S3Client {
    if (!this.client) {
      throw new Error('B2 is not configured');
    }
    return this.client;
  }

  /**
   * Private bucket: 원본·완성본 등. 버킷은 B2 콘솔에서 private 유지, 접근은 프리사인드 URL 권장.
   */
  async putPrivateObject(key: string, body: Buffer, contentType: string): Promise<string> {
    const s3 = this.requireClient();
    const start = process.hrtime.bigint();
    let success = false;
    let errorMessage: string | undefined;
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: this.privateBucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      success = true;
      return key;
    } catch (err) {
      errorMessage = (err as Error)?.message;
      throw err;
    } finally {
      const durationMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
      this.recordTransfer(body.length, durationMs, success, errorMessage);
    }
  }

  /**
   * 디스크 임시파일을 streaming으로 업로드. 메모리에 전체를 올리지 않으므로
   * 수백MB ~ 수GB 파일을 안전하게 처리한다.
   */
  async putPrivateObjectFromPath(
    key: string,
    filePath: string,
    contentType: string,
  ): Promise<string> {
    const s3 = this.requireClient();
    const size = fs.statSync(filePath).size;
    const stream = fs.createReadStream(filePath);
    const start = process.hrtime.bigint();
    let success = false;
    let errorMessage: string | undefined;
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: this.privateBucket,
          Key: key,
          Body: stream,
          ContentType: contentType,
          ContentLength: size,
        }),
      );
      success = true;
    } catch (err) {
      errorMessage = (err as Error)?.message;
      throw err;
    } finally {
      // ReadStream이 다 안 읽혀도 핸들 닫기
      stream.destroy();
      const durationMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
      this.recordTransfer(size, durationMs, success, errorMessage);
    }
    return key;
  }

  /**
   * Public bucket: 썸네일, 로고, 워터마크 미리보기. 버킷/파일은 B2에서 public 또는 CDN 뒤에 둔다.
   */
  async putPublicObject(key: string, body: Buffer, contentType: string): Promise<string> {
    if (!this.publicBucket) {
      throw new Error('B2_PUBLIC_BUCKET is not set');
    }
    const s3 = this.requireClient();
    const start = process.hrtime.bigint();
    let success = false;
    let errorMessage: string | undefined;
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: this.publicBucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      success = true;
      return key;
    } catch (err) {
      errorMessage = (err as Error)?.message;
      throw err;
    } finally {
      const durationMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
      this.recordTransfer(body.length, durationMs, success, errorMessage);
    }
  }

  /**
   * 브라우저 직접 업로드용 presigned PUT URL 발급.
   *
   * 흐름: 브라우저 → B2 직접 PUT (Railway 경유 안 함)
   *
   * - 기본 15분(900초). 업로드는 큰 파일이라 GET(5분) 정책보다 길게 허용.
   *   상한 30분 — 그 이상 필요하면 멀티파트 업로드를 검토.
   * - ContentType 을 서명에 포함시키므로 브라우저는 동일한 헤더로만 PUT 가능.
   *   → 사용자가 임의 MIME 으로 바꿔치기하는 변조 방지.
   * - bucket: 'private' (기본) / 'public' 선택. public 은 publicBucket 설정 필수.
   *
   * @param key 객체 키 — 호출자가 사용자별 prefix(users/{userId}/...) 강제할 것
   * @param contentType MIME (예: 'image/jpeg', 'application/pdf')
   * @param bucket 'private' | 'public' (기본 'private')
   * @param expiresIn 초 단위, 기본 900(15분), 상한 1800(30분)
   */
  async getPresignedPutUrl(
    key: string,
    contentType: string,
    bucket: 'private' | 'public' = 'private',
    expiresIn: number = 900,
  ): Promise<string> {
    const s3 = this.requireClient();

    // TTL 상한 가드 — 보안 정책상 30분 초과 금지
    const MAX_EXPIRES = 1800;
    const exp =
      Number.isFinite(expiresIn) && expiresIn > 0
        ? Math.min(expiresIn, MAX_EXPIRES)
        : 900;

    let targetBucket: string;
    if (bucket === 'public') {
      if (!this.publicBucket) {
        throw new Error('B2_PUBLIC_BUCKET is not set');
      }
      targetBucket = this.publicBucket;
    } else {
      targetBucket = this.privateBucket;
    }

    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      ContentType: contentType,
      // public 버킷은 1년 immutable 캐시 정책 유지
      ...(bucket === 'public'
        ? { CacheControl: 'public, max-age=31536000, immutable' }
        : {}),
    });

    return getSignedUrl(s3, command, { expiresIn: exp });
  }

  /**
   * Multipart 업로드 시작 — uploadId 발급.
   * 큰 파일을 청크로 쪼개 병렬 PUT 하기 위한 1단계.
   */
  async createMultipartUpload(
    key: string,
    contentType: string,
  ): Promise<string> {
    const s3 = this.requireClient();
    const res = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: this.privateBucket,
        Key: key,
        ContentType: contentType,
      }),
    );
    if (!res.UploadId) {
      throw new Error('CreateMultipartUpload returned no UploadId');
    }
    return res.UploadId;
  }

  /**
   * Multipart 파트 업로드용 presigned PUT URL 발급 (2단계).
   * 브라우저가 직접 청크를 PUT 한다. 응답 ETag 를 수집해 complete 단계로 전달.
   */
  async getPresignedUploadPartUrl(
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn: number = 900,
  ): Promise<string> {
    const s3 = this.requireClient();
    const MAX_EXPIRES = 1800;
    const exp =
      Number.isFinite(expiresIn) && expiresIn > 0
        ? Math.min(expiresIn, MAX_EXPIRES)
        : 900;
    const command = new UploadPartCommand({
      Bucket: this.privateBucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    return getSignedUrl(s3, command, { expiresIn: exp });
  }

  /**
   * Multipart 업로드 완료 (3단계) — 수집한 ETag 들로 S3 에 통합 요청.
   * parts 는 PartNumber 오름차순이어야 한다.
   */
  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: Array<{ PartNumber: number; ETag: string }>,
  ): Promise<void> {
    const s3 = this.requireClient();
    const sorted = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);
    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.privateBucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: sorted },
      }),
    );
  }

  /**
   * Multipart 업로드 취소 — 사용자 취소/오류 시 B2 에 쌓인 파트 정리.
   * 호출 실패는 호출자가 무시해도 무방 (B2 lifecycle 가 미완료 multipart 자동 정리).
   */
  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    const s3 = this.requireClient();
    await s3.send(
      new AbortMultipartUploadCommand({
        Bucket: this.privateBucket,
        Key: key,
        UploadId: uploadId,
      }),
    );
  }

  getPublicObjectUrl(key: string): string {
    if (!this.publicUrlPrefix) {
      throw new Error('B2 public URL base is not configured (B2_PUBLIC_BUCKET or B2_PUBLIC_BASE_URL)');
    }
    const parts = key.split('/').map((s) => encodeURIComponent(s));
    return `${this.publicUrlPrefix}/${parts.join('/')}`;
  }

  /**
   * Private 객체 GET용. 기본 5분(300초). `B2_PRESIGN_EXPIRES_IN`으로 기본값 덮어쓰기.
   * `downloadFileName` 지정 시 응답에 Content-Disposition 헤더가 붙어
   * 브라우저가 해당 이름으로 저장한다(한글 등 비ASCII는 RFC 5987로 인코딩).
   */
  async getPrivatePresignedUrl(
    key: string,
    expiresInOverride?: number,
    options?: { downloadFileName?: string },
  ): Promise<string> {
    const s3 = this.requireClient();
    const fromEnv = this.getFirst('B2_PRESIGN_EXPIRES_IN');
    const base =
      expiresInOverride ??
      (fromEnv ? parseInt(fromEnv, 10) : DEFAULT_PRESIGN_SECONDS);
    const exp = Number.isFinite(base) && base > 0 ? base : DEFAULT_PRESIGN_SECONDS;

    const input: ConstructorParameters<typeof GetObjectCommand>[0] = {
      Bucket: this.privateBucket,
      Key: key,
    };
    if (options?.downloadFileName) {
      const name = options.downloadFileName;
      const asciiFallback = name.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, "'");
      const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) =>
        '%' + c.charCodeAt(0).toString(16).toUpperCase(),
      );
      input.ResponseContentDisposition = `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
    }

    return getSignedUrl(s3, new GetObjectCommand(input), { expiresIn: exp });
  }

  async deletePrivateObject(key: string): Promise<void> {
    const s3 = this.requireClient();
    await s3.send(
      new DeleteObjectCommand({ Bucket: this.privateBucket, Key: key }),
    );
  }

  async deletePublicObject(key: string): Promise<void> {
    if (!this.publicBucket) {
      throw new Error('B2_PUBLIC_BUCKET is not set');
    }
    const s3 = this.requireClient();
    await s3.send(
      new DeleteObjectCommand({ Bucket: this.publicBucket, Key: key }),
    );
  }

  /**
   * Railway 컨테이너 재시작으로 /app/uploads 가 비워졌을 때, B2 백업 원본을
   * 로컬 캐시(`{uploadBase}/.b2-cache/{orderNumber}/{fileName}`)에 자동 복원한다.
   *
   * - resolveLocalPath(f) 가 빈 문자열을 반환하는 파일만 다운로드 대상.
   * - 캐시에 이미 있으면 다운로드 스킵 후 originalPath 만 갱신.
   * - B2 비활성/다운로드 실패는 조용히 스킵 — 호출자의 missing 검증에서 잡힌다.
   *
   * 부수효과: 다운로드 또는 캐시 매칭 성공 시 `f.originalPath = cachePath` 로
   *           입력 배열 원소를 mutate. 이후 resolveLocalPath 가 캐시 경로를 즉시 해석.
   *
   * B2 키 규칙: `orders/{safeOrderNumber}/originals/{safeFileName}`
   *   — order.service.uploadMovedFileToB2 와 동일.
   */
  async hydrateB2CacheForFiles(
    orderNumber: string,
    files: Array<{ originalPath?: string | null; fileUrl?: string | null; fileName?: string | null }>,
    uploadBase: string,
    resolveLocalPath: (f: any) => string,
  ): Promise<void> {
    if (!this.enabled) return;
    if (!orderNumber || !files?.length) return;

    const cacheDir = path.join(uploadBase, '.b2-cache', orderNumber);
    const safeOrder = sanitizeStorageKeyPart(orderNumber);

    for (const f of files) {
      if (resolveLocalPath(f)) continue;
      const fileName = (f.fileName || '').toString();
      if (!fileName) continue;
      try {
        const safeName = sanitizeStorageKeyPart(fileName);
        const b2Key = `orders/${safeOrder}/originals/${safeName}`;
        const cachePath = path.join(cacheDir, fileName);
        if (fs.existsSync(cachePath)) {
          (f as any).originalPath = cachePath;
          continue;
        }
        const url = await this.getPrivatePresignedUrl(b2Key, 300);
        const res = await fetch(url);
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(cachePath, buf);
        (f as any).originalPath = cachePath;
      } catch {
        // 다운로드 실패는 호출자 missing 검증에서 처리
      }
    }
  }

  /**
   * 브라우저 직접 업로드용 CORS 규칙을 private 버킷에 등록한다.
   *
   * - `B2_CONFIGURE_CORS=true` 일 때 onModuleInit 에서 자동 실행
   * - 수동으로도 호출 가능 (별도 스크립트, 관리자 endpoint 등)
   *
   * AllowedOrigins:
   *   - https://photocafe.co.kr (운영)
   *   - http://localhost:3002   (로컬 개발)
   *   - B2_CORS_EXTRA_ORIGINS 환경변수(콤마 구분)로 추가 가능
   *
   * 주의: B2 CORS 는 S3 호환 API 로 설정하지만, 일부 헤더는 B2 가 무시할 수 있다.
   *      실제 동작은 브라우저 → presigned URL PUT 으로 검증할 것.
   */
  async configurePrivateBucketCors(): Promise<void> {
    const s3 = this.requireClient();

    const extra = this.getFirst('B2_CORS_EXTRA_ORIGINS');
    const origins = [
      'https://photocafe.co.kr',
      'http://localhost:3002',
      ...(extra ? extra.split(',').map((s) => s.trim()).filter(Boolean) : []),
    ];

    await s3.send(
      new PutBucketCorsCommand({
        Bucket: this.privateBucket,
        CORSConfiguration: {
          CORSRules: [
            {
              ID: 'photocafe-browser-direct-upload',
              AllowedOrigins: origins,
              AllowedMethods: ['PUT'],
              AllowedHeaders: [
                'Content-Type',
                'x-amz-content-sha256',
                'x-amz-date',
                'Authorization',
              ],
              // ETag 는 멀티파트 후속 처리/체크섬 검증에 필요
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    );

    this.logger.log(
      `B2 CORS configured on '${this.privateBucket}' for ${origins.length} origin(s): ${origins.join(', ')}`,
    );
  }
}

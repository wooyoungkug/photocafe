import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  PutBucketCorsCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 storage service — B2StorageService 와 같은 인터페이스의 S3 호환 구현.
 *
 * 테스트 목적: B2(미국) vs R2(전 세계 엣지) 업로드 속도 비교용.
 * 환경변수:
 *   - R2_ENABLED=true      활성화 토글 (false/미설정 시 비활성)
 *   - R2_ENDPOINT          https://<account-id>.r2.cloudflarestorage.com
 *   - R2_KEY_ID            R2 API 토큰의 Access Key ID
 *   - R2_SECRET            R2 API 토큰의 Secret Access Key
 *   - R2_BUCKET            테스트 버킷 이름 (예: photocafe-r2-test)
 *   - R2_CONFIGURE_CORS=true (선택) 부팅 시 1회 CORS 자동 등록
 */
@Injectable()
export class R2StorageService implements OnModuleInit {
  private readonly logger = new Logger(R2StorageService.name);
  private client: S3Client | null = null;
  private bucket = '';
  private enabled = false;

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
    const flag = this.getFirst('R2_ENABLED').toLowerCase();
    if (flag !== 'true' && flag !== '1') {
      this.enabled = false;
      return;
    }

    const endpoint = this.getFirst('R2_ENDPOINT');
    const keyId = this.getFirst('R2_KEY_ID');
    const secret = this.getFirst('R2_SECRET');
    this.bucket = this.getFirst('R2_BUCKET');

    if (endpoint && keyId && secret && this.bucket) {
      this.client = new S3Client({
        region: 'auto',
        endpoint,
        forcePathStyle: true,
        credentials: { accessKeyId: keyId, secretAccessKey: secret },
      });
      this.enabled = true;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getBucket(): string {
    return this.bucket;
  }

  onModuleInit(): void {
    if (this.enabled) {
      this.logger.log(`R2: bucket=${this.bucket}, endpoint configured`);

      if (this.getFirst('R2_CONFIGURE_CORS').toLowerCase() === 'true') {
        this.configureCors().catch((err) => {
          this.logger.error(`R2 CORS configuration failed: ${err?.message || err}`);
        });
      }
    } else {
      this.logger.log('R2 object storage: off (set R2_ENABLED=true + R2_ENDPOINT/R2_KEY_ID/R2_SECRET/R2_BUCKET)');
    }
  }

  private requireClient(): S3Client {
    if (!this.client) {
      throw new Error('R2 is not configured');
    }
    return this.client;
  }

  async getPresignedPutUrl(
    key: string,
    contentType: string,
    expiresIn: number = 900,
  ): Promise<string> {
    const s3 = this.requireClient();
    const MAX_EXPIRES = 1800;
    const exp = Number.isFinite(expiresIn) && expiresIn > 0
      ? Math.min(expiresIn, MAX_EXPIRES)
      : 900;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(s3, command, { expiresIn: exp });
  }

  async getPrivatePresignedUrl(key: string, expiresInOverride?: number): Promise<string> {
    const s3 = this.requireClient();
    const base = expiresInOverride ?? 300;
    const exp = Number.isFinite(base) && base > 0 ? base : 300;
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: exp,
    });
  }

  async createMultipartUpload(key: string, contentType: string): Promise<string> {
    const s3 = this.requireClient();
    const res = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
    );
    if (!res.UploadId) {
      throw new Error('CreateMultipartUpload returned no UploadId');
    }
    return res.UploadId;
  }

  async getPresignedUploadPartUrl(
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn: number = 900,
  ): Promise<string> {
    const s3 = this.requireClient();
    const MAX_EXPIRES = 1800;
    const exp = Number.isFinite(expiresIn) && expiresIn > 0
      ? Math.min(expiresIn, MAX_EXPIRES)
      : 900;
    const command = new UploadPartCommand({
      Bucket: this.bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    return getSignedUrl(s3, command, { expiresIn: exp });
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: Array<{ PartNumber: number; ETag: string }>,
  ): Promise<void> {
    const s3 = this.requireClient();
    const sorted = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);
    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: sorted },
      }),
    );
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    const s3 = this.requireClient();
    await s3.send(
      new AbortMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
      }),
    );
  }

  async configureCors(): Promise<void> {
    const s3 = this.requireClient();

    const extra = this.getFirst('R2_CORS_EXTRA_ORIGINS');
    const origins = [
      'https://photocafe.co.kr',
      'http://localhost:3002',
      ...(extra ? extra.split(',').map((s) => s.trim()).filter(Boolean) : []),
    ];

    await s3.send(
      new PutBucketCorsCommand({
        Bucket: this.bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              ID: 'photocafe-browser-direct-upload-r2',
              AllowedOrigins: origins,
              AllowedMethods: ['PUT', 'GET', 'HEAD'],
              AllowedHeaders: [
                'Content-Type',
                'x-amz-content-sha256',
                'x-amz-date',
                'Authorization',
              ],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    );

    this.logger.log(
      `R2 CORS configured on '${this.bucket}' for ${origins.length} origin(s): ${origins.join(', ')}`,
    );
  }
}

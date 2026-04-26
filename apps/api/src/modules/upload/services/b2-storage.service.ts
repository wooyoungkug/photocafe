import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
        credentials: { accessKeyId: keyId, secretAccessKey: appKey },
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
    await s3.send(
      new PutObjectCommand({
        Bucket: this.privateBucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
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
    await s3.send(
      new PutObjectCommand({
        Bucket: this.publicBucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return key;
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
   */
  async getPrivatePresignedUrl(key: string, expiresInOverride?: number): Promise<string> {
    const s3 = this.requireClient();
    const fromEnv = this.getFirst('B2_PRESIGN_EXPIRES_IN');
    const base =
      expiresInOverride ??
      (fromEnv ? parseInt(fromEnv, 10) : DEFAULT_PRESIGN_SECONDS);
    const exp = Number.isFinite(base) && base > 0 ? base : DEFAULT_PRESIGN_SECONDS;
    return getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: this.privateBucket, Key: key }),
      { expiresIn: exp },
    );
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
}

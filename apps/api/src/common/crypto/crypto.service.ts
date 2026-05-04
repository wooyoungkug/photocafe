import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * 개인정보(PII) 컬럼 암호화 서비스 (AES-256-GCM)
 *
 * 설계서 v1.1 보안 요구사항:
 *   - 전화번호, 주소, 이메일 등 PII 컬럼은 저장 시 AES-256 암호화
 *   - 키 유출 대비를 위해 키 버전(KeyId)을 prefix 로 함께 저장 → 키 로테이션 지원
 *
 * 저장 포맷: `enc:v1:{iv_base64}:{ciphertext_base64}:{authTag_base64}`
 *   - 평문 식별: `enc:` prefix 가 없으면 원본 그대로 반환 (마이그레이션 점진 적용)
 *
 * 키 관리:
 *   - PII_ENCRYPTION_KEY  : 32bytes 짜리 마스터 키 (hex 64자 또는 base64 44자)
 *   - PII_KEY_VERSION     : 현재 키 버전 (기본값 'v1'), 로테이션 시 v2 발급 후 점진 마이그레이션
 *
 * ⚠️ 주의:
 *   - 암호화 컬럼은 검색 인덱스가 무력화됨 (LIKE/부분일치 불가).
 *     검색이 필요하면 별도 해시 컬럼 (e.g. `emailHash = sha256(email)`) 을 둬야 함.
 *   - GCM 모드는 IV 재사용 시 평문 복원이 가능하므로 매 호출마다 랜덤 IV 생성.
 */
@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name);
  private key: Buffer | null = null;
  private keyVersion = 'v1';
  private enabled = false;
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12; // GCM 권장 12 bytes
  private static readonly AUTH_TAG_LENGTH = 16;
  private static readonly PREFIX = 'enc:';

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const rawKey = this.config.get<string>('PII_ENCRYPTION_KEY');
    const version = this.config.get<string>('PII_KEY_VERSION') || 'v1';

    if (!rawKey || rawKey.trim().length === 0) {
      this.logger.warn(
        'PII_ENCRYPTION_KEY 미설정: 개인정보 암호화 비활성. 운영환경에서 반드시 설정하세요.',
      );
      return;
    }

    let buf: Buffer | null = null;
    // hex(64자) 우선, 실패 시 base64 시도
    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
      buf = Buffer.from(rawKey, 'hex');
    } else {
      try {
        const tmp = Buffer.from(rawKey, 'base64');
        if (tmp.length === 32) buf = tmp;
      } catch {
        // ignore
      }
    }

    if (!buf || buf.length !== 32) {
      throw new Error(
        'PII_ENCRYPTION_KEY 형식이 잘못되었습니다. hex 64자 또는 base64(32bytes) 가 필요합니다.',
      );
    }

    this.key = buf;
    this.keyVersion = version;
    this.enabled = true;
    this.logger.log(`PII 암호화 활성 (key version=${this.keyVersion}, AES-256-GCM)`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 평문을 암호화. enabled=false 면 원본 그대로 반환 (점진 적용).
   */
  encrypt(plaintext: string | null | undefined): string | null {
    if (plaintext == null) return null;
    if (plaintext === '') return '';
    if (!this.enabled || !this.key) return plaintext;
    // 이미 암호화된 값이면 중복 암호화 방지
    if (this.isEncrypted(plaintext)) return plaintext;

    const iv = crypto.randomBytes(CryptoService.IV_LENGTH);
    const cipher = crypto.createCipheriv(CryptoService.ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
      `${CryptoService.PREFIX}${this.keyVersion}`,
      iv.toString('base64'),
      ciphertext.toString('base64'),
      authTag.toString('base64'),
    ].join(':');
  }

  /**
   * 암호문을 복호화. 평문이면 원본 그대로 반환.
   */
  decrypt(value: string | null | undefined): string | null {
    if (value == null) return null;
    if (value === '') return '';
    if (!this.isEncrypted(value)) return value;
    if (!this.enabled || !this.key) {
      this.logger.warn('암호화된 값이 발견되었으나 PII 키가 비활성 상태입니다.');
      return value;
    }

    try {
      const parts = value.split(':');
      // ['enc', 'v1', iv, ct, tag]
      if (parts.length !== 5) return value;
      const iv = Buffer.from(parts[2], 'base64');
      const ciphertext = Buffer.from(parts[3], 'base64');
      const authTag = Buffer.from(parts[4], 'base64');

      const decipher = crypto.createDecipheriv(CryptoService.ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return plaintext.toString('utf8');
    } catch (e: any) {
      this.logger.error(`PII 복호화 실패: ${e.message}`);
      return value;
    }
  }

  /**
   * 암호화 여부 판별 (prefix 검사)
   */
  isEncrypted(value: string): boolean {
    return typeof value === 'string' && value.startsWith(CryptoService.PREFIX);
  }

  /**
   * 검색용 결정적 해시 (SHA-256). 동일 평문은 동일 해시 → unique 인덱스 가능.
   * ⚠️ rainbow table 공격 방어를 위해 PII_HASH_PEPPER 를 추가로 섞는다.
   */
  hashForLookup(plaintext: string | null | undefined): string | null {
    if (!plaintext) return null;
    const pepper = this.config.get<string>('PII_HASH_PEPPER') || '';
    return crypto.createHash('sha256').update(plaintext + pepper).digest('hex');
  }
}

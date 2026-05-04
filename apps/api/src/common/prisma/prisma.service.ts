import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CryptoService } from '../crypto/crypto.service';

/**
 * 암호화 대상 PII 컬럼 매핑.
 * 모델명 → 컬럼명 배열.
 *
 * 설계서 v1.1 기준 대상:
 *   - User       : email, phone
 *   - Client     : email, phone, mobile, address, addressDetail,
 *                  contactPhone, contactEmail, taxInvoiceEmail,
 *                  practicalManagerPhone, approvalManagerPhone
 *   - Staff      : email, companyEmail, phone, mobile, address, addressDetail
 *   - ClientAddress : phone, address, addressDetail
 *
 * ⚠️ password 는 bcrypt 해시이므로 암호화 대상이 아님.
 * ⚠️ email 은 로그인 키로 사용되므로 암호화 시 lookup 해시 컬럼이 필요.
 *    1단계: address/phone 등 비검색 컬럼 먼저 적용 (이메일은 별도 마이그레이션 필요).
 */
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  User: ['phone'],
  Client: [
    'phone',
    'mobile',
    'address',
    'addressDetail',
    'contactPhone',
    'practicalManagerPhone',
    'approvalManagerPhone',
  ],
  Staff: ['phone', 'mobile', 'address', 'addressDetail'],
  ClientAddress: ['phone', 'address', 'addressDetail'],
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly crypto?: CryptoService) {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    // 암호화 미들웨어: write 시 암호화, read 시 복호화
    // CryptoService 가 비활성(키 미설정)이면 자동으로 평문 통과 → 안전
    if (this.crypto) {
      this.$use(async (params, next) => {
        const fields = ENCRYPTED_FIELDS[params.model || ''];
        if (!fields || fields.length === 0) {
          return next(params);
        }

        // 1) Write 작업: data 내부 PII 컬럼 암호화
        if (
          ['create', 'update', 'upsert', 'createMany', 'updateMany'].includes(params.action) &&
          params.args
        ) {
          this.encryptArgsRecursive(params.args, fields);
        }

        const result = await next(params);

        // 2) Read 결과: 응답 내부 PII 컬럼 복호화
        if (result) {
          this.decryptResultRecursive(result, fields);
        }
        return result;
      });

      this.logger.log(
        `PII 암호화 미들웨어 등록 완료 (대상 모델: ${Object.keys(ENCRYPTED_FIELDS).join(', ')})`,
      );
    }

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private encryptArgsRecursive(args: any, fields: string[]): void {
    if (!args || !this.crypto) return;
    const targets = ['data', 'create', 'update'];
    for (const t of targets) {
      if (args[t]) {
        // createMany: data 가 배열일 수 있음
        if (Array.isArray(args[t])) {
          for (const item of args[t]) this.encryptObjectFields(item, fields);
        } else {
          this.encryptObjectFields(args[t], fields);
        }
      }
    }
  }

  private encryptObjectFields(obj: any, fields: string[]): void {
    if (!obj || typeof obj !== 'object' || !this.crypto) return;
    for (const f of fields) {
      const v = obj[f];
      if (typeof v === 'string') {
        obj[f] = this.crypto.encrypt(v);
      } else if (v && typeof v === 'object' && 'set' in v && typeof v.set === 'string') {
        // Prisma update 의 { set: 'value' } 형식 대응
        v.set = this.crypto.encrypt(v.set);
      }
    }
  }

  private decryptResultRecursive(result: any, fields: string[]): void {
    if (!result || !this.crypto) return;
    if (Array.isArray(result)) {
      for (const r of result) this.decryptResultRecursive(r, fields);
      return;
    }
    if (typeof result !== 'object') return;
    for (const f of fields) {
      const v = result[f];
      if (typeof v === 'string' && this.crypto.isEncrypted(v)) {
        result[f] = this.crypto.decrypt(v);
      }
    }
  }
}

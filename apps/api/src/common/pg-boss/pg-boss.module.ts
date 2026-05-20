import { Global, Module } from '@nestjs/common';
import { PgBossService } from './pg-boss.service';

/**
 * pg-boss 큐 엔진을 앱 전체에 단일 인스턴스로 노출.
 *
 * - `@Global()` 이므로 한 번만 import (AppModule) 하면 어디서든 주입 가능
 * - 별도의 Redis 불필요 — 기존 Postgres(DATABASE_URL) 를 그대로 사용
 *
 * 사용 모듈은 단순히:
 * ```ts
 * imports: []  // 별도 import 없음
 * providers: [MyService]  // 안에서 PgBossService 주입
 * ```
 */
@Global()
@Module({
  providers: [PgBossService],
  exports: [PgBossService],
})
export class PgBossModule {}

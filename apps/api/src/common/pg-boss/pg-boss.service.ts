import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { PgBoss } from 'pg-boss';

/**
 * pg-boss 인스턴스를 관리하는 글로벌 서비스.
 *
 * - `DATABASE_URL` 을 그대로 사용 (별도 Redis 불필요)
 * - `start()` 가 자동으로 `pgboss` 스키마를 생성·마이그레이션
 * - 앱 종료 시 `stop({ graceful: true })` 로 active job 완료 대기
 *
 * 사용 패턴:
 * ```ts
 * constructor(private readonly pgBoss: PgBossService) {}
 * async someMethod() {
 *   await this.pgBoss.boss.send('queue-name', payload);
 * }
 * ```
 */
@Injectable()
export class PgBossService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(PgBossService.name);
  private _boss?: PgBoss;
  private _started = false;

  async onModuleInit(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      this.logger.error(
        'DATABASE_URL 이 설정되지 않아 pg-boss 초기화를 건너뜁니다.',
      );
      return;
    }

    this._boss = new PgBoss({
      connectionString,
      // 기본값 그대로 사용:
      //   - supervise: true  (만료/스케줄 자동 관리)
      //   - schedule: true   (cron 스케줄 지원)
      //   - migrate: true    (start() 시 자동 스키마 마이그레이션)
    });

    this._boss.on('error', (err: Error) => {
      this.logger.error(`pg-boss 내부 오류: ${err?.message}`, err?.stack);
    });

    try {
      await this._boss.start();
      this._started = true;
      this.logger.log('pg-boss 시작됨 (스키마: pgboss)');
    } catch (err) {
      this.logger.error(
        `pg-boss 시작 실패: ${(err as Error)?.message}`,
        (err as Error)?.stack,
      );
      // 시작 실패해도 API 자체는 부팅 가능하게 둠
      // (소비자는 isReady() 체크 후 enqueue)
    }
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    if (!this._boss || !this._started) return;
    try {
      this.logger.log(`pg-boss 정상 종료 시작 (signal=${signal ?? 'unknown'})`);
      await this._boss.stop({ graceful: true, timeout: 30_000 });
      this.logger.log('pg-boss 종료 완료');
    } catch (err) {
      this.logger.error(`pg-boss 종료 중 오류: ${(err as Error)?.message}`);
    }
  }

  /**
   * 초기화 완료 여부. enqueue/work 호출 전 가드용.
   */
  isReady(): boolean {
    return this._started && !!this._boss;
  }

  /**
   * pg-boss 인스턴스. 초기화 전 접근 시 예외.
   *
   * Redis 가 미설정인 환경에서 BullMQ Optional 큐와 유사한 동작을 원하면
   * 호출 측에서 `isReady()` 로 먼저 확인하고 분기.
   */
  get boss(): PgBoss {
    if (!this._boss) {
      throw new Error(
        'pg-boss 가 초기화되지 않았습니다. DATABASE_URL 또는 시작 로그를 확인하세요.',
      );
    }
    return this._boss;
  }
}

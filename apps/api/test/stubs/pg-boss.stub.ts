/**
 * pg-boss 의 Jest 용 CJS 스텁.
 *
 * pg-boss v12+ 는 ESM 전용이라 ts-jest CJS 환경에서 import 가 불가능하다.
 * 실제 테스트는 PgBossService 를 mock 처리하므로 이 스텁은 컴파일 통과용.
 */
export class PgBoss {
  constructor(_: unknown) {
    /* noop */
  }
  on(_event: string, _handler: unknown): void {
    /* noop */
  }
  async start(): Promise<this> {
    return this;
  }
  async stop(_opts?: unknown): Promise<void> {
    /* noop */
  }
  async createQueue(_name: string): Promise<void> {
    /* noop */
  }
  async send(
    _name: string,
    _data?: unknown,
    _options?: unknown,
  ): Promise<string | null> {
    return 'stub-job-id';
  }
  async work(..._args: unknown[]): Promise<string> {
    return 'stub-worker-id';
  }
}

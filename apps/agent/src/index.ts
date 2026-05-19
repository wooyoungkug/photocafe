/**
 * PhotoCafe 핫폴더 에이전트 — 메인 엔트리.
 *
 * 시작 흐름:
 *  1. config.json 로드 (없으면 기본값 생성)
 *  2. Poller 시작 (30초 간격 폴링 + heartbeat)
 *  3. 로컬 HTTP 서버 시작 (status/config 관리용)
 *  4. SIGINT/SIGTERM 시 정상 종료
 */

import { AgentConfig, loadConfig, maskToken } from './config';
import { Poller } from './poller';
import { startHttpServer } from './http-server';
import { logger } from './logger';

async function main() {
  logger.info('=== PhotoCafe 핫폴더 에이전트 시작 ===');

  let cfg: AgentConfig = loadConfig();
  logger.info(`config: apiBaseUrl=${cfg.apiBaseUrl}, token=${maskToken(cfg.token)}, indigo=${cfg.indigoHotfolder}, inkjet=${cfg.inkjetHotfolder}, poll=${cfg.pollIntervalSec}s, httpPort=${cfg.httpPort}`);

  if (!cfg.token) {
    logger.warn('⚠️ config.json 의 token 이 비어있음. ERP /settings/agent 에서 발급 후 채워주세요.');
    logger.warn('⚠️ 토큰 없이도 폴러는 시작되지만 모든 API 호출은 401 실패합니다.');
  }

  const poller = new Poller(() => cfg);
  await poller.start();

  const server = startHttpServer({
    poller,
    port: cfg.httpPort,
    getCfg: () => cfg,
    setCfg: (next) => {
      cfg = next;
    },
  });

  // 종료 시그널 처리
  function shutdown() {
    logger.info('종료 시그널 수신 — 정리 중…');
    poller.stop();
    server.close(() => {
      logger.info('정상 종료');
      process.exit(0);
    });
    // 5초 후 강제 종료 (안전망)
    setTimeout(() => process.exit(1), 5000).unref();
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error(`치명적 오류: ${(err as Error).message}`);
  process.exit(1);
});

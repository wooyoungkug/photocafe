import * as http from 'http';
import { AgentConfig, loadConfig, saveConfig, maskToken } from './config';
import { Poller } from './poller';
import { logger } from './logger';

/**
 * 로컬 관리용 HTTP 서버 (기본 포트 9199).
 *
 * - GET  /status — 현재 폴러 상태 + 에이전트 정보
 * - GET  /config — 마스킹된 설정값
 * - POST /config — 설정 변경 (Body: JSON, 일부 필드만 가능)
 *
 * CORS 미허용 — 로컬에서 curl/관리자 도구로만 사용 가정.
 */

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function send(res: http.ServerResponse, code: number, body: unknown): void {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

export function startHttpServer(opts: {
  poller: Poller;
  port: number;
  getCfg: () => AgentConfig;
  setCfg: (next: AgentConfig) => void;
}): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = req.url || '/';
    const method = req.method || 'GET';

    try {
      if (url === '/status' && method === 'GET') {
        return send(res, 200, {
          state: opts.poller.state,
          uptimeSec: Math.floor(process.uptime()),
        });
      }

      if (url === '/config' && method === 'GET') {
        const cfg = opts.getCfg();
        return send(res, 200, {
          apiBaseUrl: cfg.apiBaseUrl,
          token: maskToken(cfg.token),
          indigoHotfolder: cfg.indigoHotfolder,
          inkjetHotfolder: cfg.inkjetHotfolder,
          pollIntervalSec: cfg.pollIntervalSec,
          httpPort: cfg.httpPort,
        });
      }

      if (url === '/config' && method === 'POST') {
        const body = (await readJsonBody(req)) as Partial<AgentConfig>;
        const cur = opts.getCfg();
        const next: AgentConfig = {
          ...cur,
          ...body,
          // 비어 있는 token 으로 덮어쓰지 않음
          token: body.token && body.token.trim() ? body.token.trim() : cur.token,
        };
        saveConfig(next);
        opts.setCfg(next);
        return send(res, 200, { ok: true });
      }

      send(res, 404, { error: 'Not Found' });
    } catch (err) {
      logger.error(`http error: ${(err as Error).message}`);
      send(res, 500, { error: (err as Error).message });
    }
  });

  server.listen(opts.port, '127.0.0.1', () => {
    logger.info(`로컬 HTTP 서버 http://127.0.0.1:${opts.port} 시작`);
  });

  server.on('error', (err) => {
    logger.error(`HTTP 서버 오류: ${err.message}`);
  });

  return server;
}

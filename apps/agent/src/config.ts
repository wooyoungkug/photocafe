import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

export interface AgentConfig {
  apiBaseUrl: string;
  token: string;
  indigoHotfolder: string;
  inkjetHotfolder: string;
  pollIntervalSec: number;
  httpPort: number;
}

export const DEFAULT_CONFIG: AgentConfig = {
  apiBaseUrl: 'https://api.photocafe.co.kr/api/v1',
  token: '',
  indigoHotfolder: 'C:\\hotfolder\\indigo',
  inkjetHotfolder: 'C:\\hotfolder\\inkjet',
  pollIntervalSec: 30,
  httpPort: 9199,
};

const CONFIG_FILENAME = 'config.json';

/** config.json 의 절대 경로 — 실행 디렉터리(cwd) 기준 */
export function configPath(): string {
  return path.resolve(process.cwd(), CONFIG_FILENAME);
}

export function loadConfig(): AgentConfig {
  const p = configPath();
  if (!fs.existsSync(p)) {
    logger.warn(`config.json 없음. 기본값 생성: ${p}`);
    fs.writeFileSync(p, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (err) {
    logger.error(`config.json 파싱 실패: ${(err as Error).message}`);
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(cfg: AgentConfig): void {
  const p = configPath();
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf8');
  logger.info(`config 저장됨: ${p}`);
}

/** 평문 토큰 마스킹: "ag_a1b2c3d4...zzzz" → "ag_a1b2c3d4…(masked)" */
export function maskToken(token: string): string {
  if (!token) return '(empty)';
  if (token.length < 12) return '(short)';
  return `${token.slice(0, 12)}…`;
}

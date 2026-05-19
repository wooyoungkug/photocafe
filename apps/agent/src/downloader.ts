import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { AgentConfig } from './config';
import { PendingFile } from './api';
import { logger } from './logger';

/**
 * presigned URL → 로컬 핫폴더 저장.
 *
 * 경로 규칙:
 *  - 인디고: {indigoHotfolder}/{YYMMDD}/{orderNumber}/{fileName}
 *  - 잉크젯: {inkjetHotfolder}/{YYMMDD}/{orderNumber}/{fileName}
 *  - 주문일자 없으면 preparedAt 일자로 fallback
 *  - orderNumber 없으면 'unknown' 사용
 *  - fileName 이 비정상이면 printReadyFileId 로 fallback
 */

function yymmdd(iso: string | null): string {
  if (!iso) return 'unknown-date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown-date';
  const y = d.getFullYear().toString().slice(2);
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${y}${m}${dd}`;
}

/** Windows 파일 시스템에서 금지된 문자 치환 */
function safe(s: string | null | undefined): string {
  if (!s) return 'unknown';
  return s.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/^\.+/, '').trim() || 'unknown';
}

function chooseHotfolder(cfg: AgentConfig, printMethod: string): string {
  if (printMethod === 'indigo') return cfg.indigoHotfolder;
  if (printMethod === 'inkjet') return cfg.inkjetHotfolder;
  // 알 수 없는 방식 → 인디고 폴더의 'other' 하위로
  return path.join(cfg.indigoHotfolder, '__other__');
}

export function buildLocalPath(cfg: AgentConfig, file: PendingFile): string {
  const base = chooseHotfolder(cfg, file.printMethod);
  const dateDir = yymmdd(file.orderedAt ?? file.preparedAt);
  const orderDir = safe(file.orderNumber);
  const fileName = safe(file.fileName) || `${file.printReadyFileId}.bin`;
  return path.join(base, dateDir, orderDir, fileName);
}

export async function downloadFile(
  cfg: AgentConfig,
  file: PendingFile,
): Promise<{ localPath: string; fileSize: number }> {
  const localPath = buildLocalPath(cfg, file);
  const dir = path.dirname(localPath);
  fs.mkdirSync(dir, { recursive: true });

  const tmpPath = `${localPath}.tmp`;
  logger.info(`다운로드: ${file.fileName} → ${localPath}`);

  const res = await fetch(file.downloadUrl);
  if (!res.ok) {
    throw new Error(`다운로드 실패: HTTP ${res.status} ${file.fileName}`);
  }
  if (!res.body) {
    throw new Error(`응답 body 없음: ${file.fileName}`);
  }

  // Node 18+ 의 fetch body 는 Web ReadableStream — Node Readable 로 변환
  const nodeStream = Readable.fromWeb(res.body as any);
  const out = fs.createWriteStream(tmpPath);
  await pipeline(nodeStream, out);

  // 원자적 rename (덮어쓰기 안전)
  fs.renameSync(tmpPath, localPath);

  const stat = fs.statSync(localPath);
  return { localPath, fileSize: stat.size };
}

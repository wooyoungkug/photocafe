import * as os from 'os';
import { AgentConfig } from './config';
import { api } from './api';
import { downloadFile } from './downloader';
import { logger } from './logger';

export interface PollerState {
  running: boolean;
  lastPolledAt: Date | null;
  lastError: string | null;
  filesDownloaded: number;
  filesFailed: number;
  agentInfo: {
    id: string;
    name: string;
    machineName: string | null;
  } | null;
}

export class Poller {
  private timer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private busy = false;
  state: PollerState = {
    running: false,
    lastPolledAt: null,
    lastError: null,
    filesDownloaded: 0,
    filesFailed: 0,
    agentInfo: null,
  };

  constructor(private getCfg: () => AgentConfig) {}

  async start(): Promise<void> {
    if (this.state.running) {
      logger.warn('이미 실행 중');
      return;
    }
    this.state.running = true;
    logger.info('Poller 시작');

    // 초기 토큰 검증 + 정보 수신
    try {
      const cfg = this.getCfg();
      const info = await api.status(cfg);
      this.state.agentInfo = {
        id: info.id,
        name: info.name,
        machineName: info.machineName,
      };
      logger.info(`인증 OK — 에이전트: ${info.name} (id=${info.id})`);
    } catch (err) {
      logger.error(`토큰 검증 실패: ${(err as Error).message}`);
      this.state.lastError = (err as Error).message;
      // 검증 실패해도 폴링은 시작 — config 가 나중에 갱신될 수 있음
    }

    this.scheduleNext();
    this.scheduleHeartbeat();
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.timer = null;
    this.heartbeatTimer = null;
    this.state.running = false;
    logger.info('Poller 중지');
  }

  private scheduleNext(): void {
    const cfg = this.getCfg();
    const intervalMs = Math.max(5, cfg.pollIntervalSec) * 1000;
    this.timer = setTimeout(() => this.tick().catch(() => {}), intervalMs);
  }

  private scheduleHeartbeat(): void {
    // 30초 권장. pollIntervalSec 와 무관하게 고정 30초로 운영
    this.heartbeatTimer = setTimeout(() => this.sendHeartbeat().catch(() => {}), 30_000);
  }

  private async sendHeartbeat(): Promise<void> {
    try {
      const cfg = this.getCfg();
      await api.heartbeat(cfg, { machineName: os.hostname() });
      logger.debug('heartbeat 송신 OK');
    } catch (err) {
      logger.warn(`heartbeat 실패: ${(err as Error).message}`);
    } finally {
      this.scheduleHeartbeat();
    }
  }

  private async tick(): Promise<void> {
    if (this.busy) {
      logger.debug('이전 폴 진행 중 — skip');
      this.scheduleNext();
      return;
    }
    this.busy = true;
    try {
      const cfg = this.getCfg();
      const pending = await api.pendingFiles(cfg, 50);
      this.state.lastPolledAt = new Date();
      this.state.lastError = null;

      if (pending.length === 0) {
        logger.debug('미다운 파일 없음');
        return;
      }

      logger.info(`미다운 파일 ${pending.length}건 발견. 순차 다운로드 시작`);

      for (const file of pending) {
        try {
          const result = await downloadFile(cfg, file);
          await api.markDownloaded(cfg, {
            printReadyFileId: file.printReadyFileId,
            localPath: result.localPath,
            fileSize: result.fileSize,
          });
          this.state.filesDownloaded++;
          logger.info(`✓ ${file.fileName} (${result.fileSize}B)`);
        } catch (err) {
          this.state.filesFailed++;
          logger.error(`✗ ${file.fileName}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      this.state.lastError = (err as Error).message;
      logger.error(`폴링 실패: ${(err as Error).message}`);
    } finally {
      this.busy = false;
      this.scheduleNext();
    }
  }
}

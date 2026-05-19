import { AgentConfig } from './config';

/**
 * ERP API 클라이언트 — 네이티브 fetch 사용 (Node 18+).
 */

export interface PendingFile {
  printReadyFileId: string;
  fileName: string;
  fileSize: number;
  printMethod: 'indigo' | 'inkjet' | string;
  fileType: string;
  b2Key: string;
  downloadUrl: string;
  orderItemId: string;
  orderNumber: string | null;
  studioCode: string | null;
  studioName: string | null;
  productionNumber: string | null;
  productName: string | null;
  orderedAt: string | null;
  preparedAt: string;
}

function buildUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
}

async function request<T>(
  cfg: AgentConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(buildUrl(cfg.apiBaseUrl, path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-Token': cfg.token,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${method} ${path} → HTTP ${res.status} ${text}`);
  }
  // 일부 응답은 본문이 없음
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  }
  return undefined as unknown as T;
}

export const api = {
  async status(cfg: AgentConfig) {
    return request<{
      id: string;
      name: string;
      machineName: string | null;
      lastHeartbeatAt: string | null;
      isActive: boolean;
    }>(cfg, 'GET', '/agent/status');
  },

  async pendingFiles(cfg: AgentConfig, limit = 50) {
    return request<PendingFile[]>(cfg, 'GET', `/agent/pending-files?limit=${limit}`);
  },

  async markDownloaded(
    cfg: AgentConfig,
    body: { printReadyFileId: string; localPath: string; fileSize: number },
  ) {
    return request<{ recorded: boolean; reason?: string }>(
      cfg,
      'POST',
      '/agent/mark-downloaded',
      body,
    );
  },

  async heartbeat(cfg: AgentConfig, body: { machineName?: string }) {
    return request<unknown>(cfg, 'POST', '/agent/heartbeat', body);
  },
};

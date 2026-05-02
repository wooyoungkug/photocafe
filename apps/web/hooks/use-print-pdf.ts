'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ==================== Types ====================

export interface PrintQueueItem {
  id: string;
  orderId: string;
  orderNumber: string;
  isUrgent: boolean;
  studioName: string;
  clientId?: string;
  productionNumber: string;
  productName: string;
  folderName?: string;
  size: string;
  pages: number;
  printMethod: string;
  paper: string;
  bindingType: string;
  colorIntentId?: string;
  fileCount: number;
  nup?: string | null;
  orderedAt: string;
  requestedDeliveryDate?: string;
  pdfStatus?: 'pending' | 'in_progress' | 'completed' | 'failed';
  salesRep?: string;
  salesRepPhone?: string;
  quantity?: number;
  pageLayout?: string;
  bindingDirection?: string;
  printSide?: string;
  /** OrderItem.pdfPath 존재 여부 — PDF변환성공 배지 클릭 시 인라인 열기 가능 조건 */
  hasPdf?: boolean;
  warnings?: string[];
}

export interface PrintQueueResponse {
  items: PrintQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IndexOptions {
  showDateTime: boolean;
  showOrderNumber: boolean;
  showStudioName: boolean;
  showSpec: boolean;
  showPaper: boolean;
  showPageInfo: boolean;
  showColorMode: boolean;
  showBinding: boolean;
  showSide: boolean;
  showNup: boolean;
  showImageArea: boolean;
  showSalesRep: boolean;
}

export interface GeneratePrintPdfRequest {
  orderItemIds: string[];
  outputPath?: string;
  indexOptions: IndexOptions;
  includeBleed: boolean;
  includeCropMarks: boolean;
  includeColorBar?: boolean;
  nupOverride?: string;
  indexOrderKeys?: string[];
  indexPosition?: 'top' | 'bottom';
  canvasWidthMm?: number;
  canvasHeightMm?: number;
  imageWidthMm?: number;
  imageHeightMm?: number;
}

export interface PdfJobResult {
  orderItemId: string;
  orderNumber: string;
  studioName: string;
  status: 'completed' | 'failed' | 'pending' | 'in_progress';
  pdfPath?: string;
  /** 다운로드 파일명 */
  fileName?: string;
  /** 하위폴더 분리용(양면/단면) */
  side?: string;
  /** 하위폴더 분리용 인디고 도수 (예: 4도, 6도) */
  colorMode?: string;
  error?: string;
}

export interface PdfJobProgress {
  jobId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  totalItems: number;
  completedItems: number;
  /** 전체 페이지 수 (세밀 진행률) */
  totalPages?: number;
  /** 처리된 페이지 수 */
  processedPages?: number;
  currentItem?: string;
  results: PdfJobResult[];
  createdAt: string;
}

// ==================== 기본 인덱스 옵션 ====================

export const DEFAULT_INDEX_OPTIONS: IndexOptions = {
  showDateTime: true,
  showOrderNumber: true,
  showStudioName: true,
  showSpec: true,
  showPaper: true,
  showPageInfo: true,
  showColorMode: true,
  showBinding: true,
  showSide: true,
  showNup: true,
  showImageArea: false,
  showSalesRep: false,
};

// ==================== Hooks ====================

export interface PrinterInfo {
  name: string;
  driver: string;
  port: string;
}

const PRINT_AGENT_URL = 'http://localhost:9199';
const AGENT_TIMEOUT_MS = 2000;

async function fetchPrintersFromAgent(): Promise<PrinterInfo[] | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);
    const res = await fetch(`${PRINT_AGENT_URL}/printers`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function checkPrintAgentRunning(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);
    const res = await fetch(`${PRINT_AGENT_URL}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export interface AgentWatchConfig {
  watchEnabled: boolean;
  watchFolder: string;
  indigoPrinter: string;
  inkjetPrinter: string;
  watching: boolean;
  printedCount: number;
}

export async function fetchAgentWatchConfig(): Promise<AgentWatchConfig | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);
    const res = await fetch(`${PRINT_AGENT_URL}/watch-config`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function saveAgentWatchConfig(
  cfg: Partial<Pick<AgentWatchConfig, 'watchEnabled' | 'watchFolder' | 'indigoPrinter' | 'inkjetPrinter'>>,
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${PRINT_AGENT_URL}/watch-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export function usePrinterList() {
  return useQuery<PrinterInfo[]>({
    queryKey: ['printers'],
    queryFn: async () => {
      // 로컬 에이전트 우선 시도
      const fromAgent = await fetchPrintersFromAgent();
      if (fromAgent !== null) return fromAgent;
      // 에이전트 없으면 서버 API (로컬 개발 환경용)
      return api.get<PrinterInfo[]>('/print-pdf/printers');
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export function usePrintQueue(params?: {
  dateFrom?: string;
  dateTo?: string;
  studioName?: string;
  spec?: string;
  paper?: string;
  urgentOnly?: boolean;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['print-queue', params],
    queryFn: () =>
      api.get<PrintQueueResponse>('/print-pdf/queue', {
        ...(params?.dateFrom && { dateFrom: params.dateFrom }),
        ...(params?.dateTo && { dateTo: params.dateTo }),
        ...(params?.studioName && { studioName: params.studioName }),
        ...(params?.spec && { spec: params.spec }),
        ...(params?.paper && { paper: params.paper }),
        ...(params?.urgentOnly && { urgentOnly: params.urgentOnly }),
        ...(params?.page && { page: params.page }),
        ...(params?.limit && { limit: params.limit }),
      }),
    refetchInterval: 30000, // 30초 자동 갱신
  });
}

export function usePrintQueueItemDetail(orderItemId: string | null, printToken?: string) {
  return useQuery({
    queryKey: ['print-queue-item', orderItemId, printToken],
    queryFn: () => printToken
      ? api.get(`/print-pdf/queue/${orderItemId}/slip-data?printToken=${printToken}`)
      : api.get(`/print-pdf/queue/${orderItemId}`),
    enabled: !!orderItemId,
  });
}

export function useGeneratePrintPdf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GeneratePrintPdfRequest) =>
      api.post<PdfJobProgress>('/print-pdf/generate', data, { timeout: 300000 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-queue'] });
    },
  });
}

export function usePdfJobStatus(jobId: string | null) {
  return useQuery<PdfJobProgress | null>({
    queryKey: ['pdf-job', jobId],
    queryFn: async () => {
      try {
        return await api.get<PdfJobProgress>(`/print-pdf/jobs/${jobId}/status`);
      } catch (err: any) {
        // 백엔드 재시작 등으로 Job이 사라진 경우: 실패로 간주하고 폴링 중단
        const msg = String(err?.message || '');
        if (msg.includes('찾을 수 없') || msg.toLowerCase().includes('not found')) {
          return {
            jobId: jobId!,
            status: 'failed',
            totalItems: 0,
            completedItems: 0,
            results: [],
            createdAt: new Date().toISOString(),
          } as unknown as PdfJobProgress;
        }
        throw err;
      }
    },
    enabled: !!jobId,
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data as PdfJobProgress | undefined;
      // 완료/실패 시 폴링 중지
      if (data?.status === 'completed' || data?.status === 'failed') return false;
      return 1000; // 1초 간격 폴링 (세밀한 페이지 진행률 반영)
    },
  });
}

export function useDownloadPdf() {
  return useMutation({
    mutationFn: (jobId: string) =>
      api.downloadBlob(`/print-pdf/jobs/${jobId}/download`, 'print-output.pdf'),
  });
}

// ==================== 에이전트 PDF 저장 ====================

/**
 * 로컬 프린트 에이전트(localhost:9199)에 PDF blob을 직접 저장한다.
 * 브라우저 권한 팝업 없이 Z:\ 등 모든 경로에 저장 가능하다.
 * 에이전트 미실행 / 미설정 시 false 반환 → 호출측에서 폴백 사용.
 */
export async function savePdfViaAgent(
  blob: Blob,
  fileName: string,
  subPath: string,
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000); // 2분 타임아웃 (대용량 PDF 대비)
    const res = await fetch(`${PRINT_AGENT_URL}/save-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Filename': encodeURIComponent(fileName),
        'X-Subpath': encodeURIComponent(subPath),
      },
      body: blob,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/** 에이전트가 현재 사용 중인 PDF 저장 경로 조회 */
export async function getAgentSavePath(): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);
    const res = await fetch(`${PRINT_AGENT_URL}/save-config`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return '';
    const data = await res.json();
    return data.savePath || '';
  } catch {
    return '';
  }
}

/** 에이전트의 PDF 저장 경로를 설정 (agent-config.json에 영속화) */
export async function setAgentSavePath(savePath: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${PRINT_AGENT_URL}/save-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savePath }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

// ==================== 에이전트 풀(pull) 방식 저장 / 슬립 인쇄 ====================

/**
 * 브라우저 blob 전송 없이 에이전트가 Railway에서 직접 PDF를 다운로드하여 저장.
 * 기존 savePdfViaAgent(blob...) 보다 신뢰성 높음 (대용량 PDF에서도 안정).
 *
 * 흐름:
 *   1) Railway에서 일회용 다운로드 토큰 발급 → downloadUrl 획득
 *   2) 에이전트(localhost:9199)에 downloadUrl 전달 → 에이전트가 직접 Railway에서 PDF 다운로드 후 저장
 */
export async function downloadAndSaveViaAgent(
  jobId: string,
  itemId: string,
  fileName: string,
  subPath: string,
): Promise<boolean> {
  try {
    // 1. Railway에서 일회용 에이전트 다운로드 토큰 발급
    const tokenData = await api.post<{ downloadUrl?: string; fileName?: string }>(
      `/print-pdf/jobs/${jobId}/items/${itemId}/agent-token`,
    );
    if (!tokenData?.downloadUrl) return false;

    // 2. 에이전트에게 URL 전달 (에이전트가 직접 Railway에서 다운로드)
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    const agentRes = await fetch(`${PRINT_AGENT_URL}/pull-and-save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        downloadUrl: tokenData.downloadUrl,
        fileName,
        subPath,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return agentRes.ok;
  } catch {
    return false;
  }
}

/**
 * 임포지션 결과(JDF + PDF + ImagePDF)를 에이전트로 다운로드.
 *
 * 흐름:
 *   1) Railway POST /imposition/jobs/:jobId/agent-tokens → 3종의 downloadUrl + fileName 획득
 *   2) 각 파일을 에이전트 /pull-and-save 에 순차 전달 → 에이전트가 Railway에서 직접 다운로드
 *
 * 반환: 다운로드 시도/성공 카운트
 */
export async function downloadImpositionViaAgent(
  jobId: string,
  subPath: string,
): Promise<{ requested: number; saved: number }> {
  try {
    const tokens = await api.post<{
      jdf?: { downloadUrl: string; fileName: string };
      pdf?: { downloadUrl: string; fileName: string };
      imagePdf?: { downloadUrl: string; fileName: string };
    }>(`/imposition/jobs/${jobId}/agent-tokens`);

    const targets = [tokens?.jdf, tokens?.pdf, tokens?.imagePdf].filter(
      (t): t is { downloadUrl: string; fileName: string } => !!t?.downloadUrl,
    );
    if (targets.length === 0) return { requested: 0, saved: 0 };

    let saved = 0;
    for (const t of targets) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 60000);
        const res = await fetch(`${PRINT_AGENT_URL}/pull-and-save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            downloadUrl: t.downloadUrl,
            fileName: t.fileName,
            subPath,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) saved += 1;
      } catch {
        // 개별 파일 실패해도 다음 파일 계속 시도
      }
    }
    return { requested: targets.length, saved };
  } catch {
    return { requested: 0, saved: 0 };
  }
}

/**
 * 에이전트가 로컬 Chrome으로 슬립(작업지시서) 페이지를 인쇄.
 *
 * 흐름:
 *   1) Railway에서 슬립 인쇄 토큰 발급 → slipUrl 획득
 *   2) 에이전트(localhost:9199)에 slipUrl + 프린터명 전달 → 로컬 Chrome으로 인쇄
 */
export async function printSlipViaAgent(
  orderItemId: string,
  printerName: string,
): Promise<boolean> {
  try {
    // 1. Railway에서 슬립 인쇄 토큰 발급
    const tokenData = await api.post<{ token?: string; slipUrl?: string }>(
      `/print-pdf/queue/${orderItemId}/print-token`,
    );
    if (!tokenData?.slipUrl) return false;

    // 2. 에이전트에게 URL 인쇄 요청
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000); // 인쇄는 시간이 걸림
    const agentRes = await fetch(`${PRINT_AGENT_URL}/print-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: tokenData.slipUrl,
        printerName,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return agentRes.ok;
  } catch {
    return false;
  }
}

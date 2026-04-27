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

export function usePrinterList() {
  return useQuery<PrinterInfo[]>({
    queryKey: ['printers'],
    queryFn: () => api.get<PrinterInfo[]>('/print-pdf/printers'),
    staleTime: 60 * 1000, // 1분 캐시
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

export function usePrintQueueItemDetail(orderItemId: string | null) {
  return useQuery({
    queryKey: ['print-queue-item', orderItemId],
    queryFn: () => api.get(`/print-pdf/queue/${orderItemId}`),
    enabled: !!orderItemId,
  });
}

export function useGeneratePrintPdf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GeneratePrintPdfRequest) =>
      api.post<PdfJobProgress>('/print-pdf/generate', data),
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

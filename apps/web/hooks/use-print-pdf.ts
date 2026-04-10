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
}

export interface PrintQueueResponse {
  items: PrintQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IndexOptions {
  showDate: boolean;
  showDateTime: boolean;
  showOrderNumber: boolean;
  showStudioName: boolean;
  showSpec: boolean;
  showPaper: boolean;
  showPageInfo: boolean;
  showColorMode: boolean;
  showBinding: boolean;
  showNup: boolean;
}

export interface GeneratePrintPdfRequest {
  orderItemIds: string[];
  outputPath?: string;
  indexOptions: IndexOptions;
  includeBleed: boolean;
  includeCropMarks: boolean;
  nupOverride?: string;
  indexOrderKeys?: string[];
  indexPosition?: 'top' | 'bottom';
  canvasWidthMm?: number;
  canvasHeightMm?: number;
}

export interface PdfJobResult {
  orderItemId: string;
  orderNumber: string;
  studioName: string;
  status: 'completed' | 'failed' | 'pending' | 'in_progress';
  pdfPath?: string;
  error?: string;
}

export interface PdfJobProgress {
  jobId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  totalItems: number;
  completedItems: number;
  currentItem?: string;
  results: PdfJobResult[];
  createdAt: string;
}

// ==================== 기본 인덱스 옵션 ====================

export const DEFAULT_INDEX_OPTIONS: IndexOptions = {
  showDate: true,
  showDateTime: true,
  showOrderNumber: true,
  showStudioName: true,
  showSpec: true,
  showPaper: true,
  showPageInfo: true,
  showColorMode: true,
  showBinding: true,
  showNup: true,
};

// ==================== Hooks ====================

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
  return useQuery({
    queryKey: ['pdf-job', jobId],
    queryFn: () => api.get<PdfJobProgress>(`/print-pdf/jobs/${jobId}/status`),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data as PdfJobProgress | undefined;
      // 완료/실패 시 폴링 중지
      if (data?.status === 'completed' || data?.status === 'failed') return false;
      return 2000; // 2초 간격 폴링
    },
  });
}

export function useDownloadPdf() {
  return useMutation({
    mutationFn: (jobId: string) =>
      api.downloadBlob(`/print-pdf/jobs/${jobId}/download`, 'print-output.pdf'),
  });
}

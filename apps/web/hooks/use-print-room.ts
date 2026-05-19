'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ==================== Types ====================

export type PrintRoomStatus =
  | 'waiting'
  | 'ready'
  | 'imposing'
  | 'imposed'
  | 'printing'
  | 'done';

export const PRINT_ROOM_STATUSES: PrintRoomStatus[] = [
  'waiting',
  'ready',
  'imposing',
  'imposed',
  'printing',
  'done',
];

export type ImpositionJobStatus = 'pending' | 'done' | 'failed' | null;

export interface PrintRoomQueueItem {
  orderItemId: string;
  orderNumber: string;
  studioName: string;
  sizeCode: string;
  nup: number | null;
  pages: number;
  quantity: number;
  printMethod: string | null;
  printRoomStatus: PrintRoomStatus;
  lastDownloadedAt: string | null;
  lastDownloadedBy: string | null;
  downloadCount: number;
  impositionStatus: ImpositionJobStatus;
}

export type PrintRoomQueue = Record<PrintRoomStatus, PrintRoomQueueItem[]>;

export interface QueueQueryParams {
  date?: string;
  printMethod?: 'indigo' | 'inkjet';
}

export interface PrintRoomItemDetail {
  id: string;
  size: string | null;
  pages: number;
  quantity: number;
  printMethod: string | null;
  printRoomStatus: PrintRoomStatus | null;
  productName?: string | null;
  productionNumber?: string | null;
  totalFileSize?: string;
  order: {
    id: string;
    orderNumber: string;
    orderedAt: string;
    status: string;
    client?: {
      id: string;
      clientName: string;
      clientCode: string;
    } | null;
  };
  files: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    fileUrl: string;
    sortOrder: number;
  }>;
  printReadyFiles?: Array<Record<string, unknown>>;
  printRoomJobs?: Array<{
    id: string;
    status: ImpositionJobStatus;
    createdAt: string;
    preset?: {
      id: string;
      sizeCode: string | null;
      nup: number | null;
      gridCols: number | null;
      gridRows: number | null;
      paperOrientation: string | null;
    } | null;
  }>;
  printDownloadLogs?: Array<{
    id: string;
    downloadedAt: string;
    staffId: string | null;
    staffName: string | null;
    fileCount: number;
    totalBytes: string;
  }>;
}

export interface DownloadLogRow {
  id: string;
  downloadedAt: string;
  staffId: string | null;
  staffName: string | null;
  orderItemId: string;
  fileCount: number;
  totalBytes: string;
  orderItem: {
    id: string;
    productionNumber: string | null;
    productName: string | null;
    size: string | null;
    order: {
      orderNumber: string;
      client?: { clientName: string } | null;
    };
  } | null;
}

export interface DownloadLogResponse {
  data: DownloadLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DownloadLogQueryParams {
  from?: string;
  to?: string;
  staffId?: string;
  orderItemId?: string;
  page?: number;
  pageSize?: number;
}

export interface RetryResponse {
  jobId: string | null;
  action: 'retry' | 'enqueue';
}

// ==================== Hooks ====================

const PRINT_ROOM_QUEUE_KEY = ['print-room', 'queue'] as const;
const PRINT_ROOM_DETAIL_KEY = ['print-room', 'detail'] as const;
const PRINT_ROOM_LOGS_KEY = ['print-room', 'download-logs'] as const;

export interface UseQueueOptions extends QueueQueryParams {
  /** 30초 자동 새로고침 여부 */
  autoRefresh?: boolean;
}

export function useQueueQuery(opts: UseQueueOptions = {}) {
  const { autoRefresh, date, printMethod } = opts;
  return useQuery<PrintRoomQueue>({
    queryKey: [...PRINT_ROOM_QUEUE_KEY, date ?? null, printMethod ?? null],
    queryFn: () =>
      api.get<PrintRoomQueue>('/print-room/queue', {
        date,
        printMethod,
      }),
    refetchInterval: autoRefresh ? 30_000 : false,
    refetchOnWindowFocus: autoRefresh,
    staleTime: 10_000,
  });
}

export function useItemDetail(orderItemId: string | null) {
  return useQuery<PrintRoomItemDetail>({
    queryKey: [...PRINT_ROOM_DETAIL_KEY, orderItemId],
    queryFn: () =>
      api.get<PrintRoomItemDetail>(`/print-room/items/${orderItemId}`),
    enabled: !!orderItemId,
  });
}

export function useUpdateStatusMutation() {
  const qc = useQueryClient();
  return useMutation<
    { id: string; printRoomStatus: PrintRoomStatus },
    Error,
    { orderItemId: string; status: PrintRoomStatus }
  >({
    mutationFn: ({ orderItemId, status }) =>
      api.patch(`/print-room/items/${orderItemId}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRINT_ROOM_QUEUE_KEY });
      qc.invalidateQueries({ queryKey: PRINT_ROOM_DETAIL_KEY });
    },
  });
}

export function useRetryMutation() {
  const qc = useQueryClient();
  return useMutation<RetryResponse, Error, string>({
    mutationFn: (orderItemId) =>
      api.post<RetryResponse>(`/print-room/items/${orderItemId}/retry`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRINT_ROOM_QUEUE_KEY });
    },
  });
}

// ==================== PrintRoomPreset (Phase 6) ====================

export interface PrintRoomPreset {
  id: string;
  sizeCode: string;
  nup: string;
  paperOrientation: 'portrait' | 'landscape';
  gridCols: number;
  gridRows: number;
  marginMm: number;
  cropMarkLengthMm: number;
  cropMarkThicknessPt: number;
  cropMarkColor: string;
  pdfVersion: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrintRoomPresetInput {
  sizeCode: string;
  nup: string;
  paperOrientation: 'portrait' | 'landscape';
  gridCols: number;
  gridRows: number;
  marginMm?: number;
  cropMarkLengthMm?: number;
  cropMarkThicknessPt?: number;
  cropMarkColor?: string;
  pdfVersion?: string;
  isActive?: boolean;
}

const PRINT_ROOM_PRESETS_KEY = ['print-room', 'presets'] as const;

export function usePrintRoomPresets(opts?: { activeOnly?: boolean; nup?: string }) {
  return useQuery<PrintRoomPreset[]>({
    queryKey: [...PRINT_ROOM_PRESETS_KEY, opts ?? null],
    queryFn: () =>
      api.get<PrintRoomPreset[]>('/print-room/presets', {
        activeOnly: opts?.activeOnly ? 'true' : undefined,
        nup: opts?.nup,
      }),
    staleTime: 30_000,
  });
}

export function useCreatePrintRoomPreset() {
  const qc = useQueryClient();
  return useMutation<PrintRoomPreset, Error, CreatePrintRoomPresetInput>({
    mutationFn: (input) =>
      api.post<PrintRoomPreset>('/print-room/presets', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRINT_ROOM_PRESETS_KEY });
    },
  });
}

export function useDownloadLogsQuery(params: DownloadLogQueryParams = {}) {
  return useQuery<DownloadLogResponse>({
    queryKey: [...PRINT_ROOM_LOGS_KEY, params],
    queryFn: () =>
      api.get<DownloadLogResponse>('/print-room/download-logs', {
        from: params.from,
        to: params.to,
        staffId: params.staffId,
        orderItemId: params.orderItemId,
        page: params.page,
        pageSize: params.pageSize,
      }),
    staleTime: 10_000,
  });
}

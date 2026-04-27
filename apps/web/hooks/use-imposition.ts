'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ==================== Types ====================

export interface ImpositionPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  pages: number[];
  rotation: 0 | 90;
  tackEdge?: 'left' | 'right' | 'top' | 'bottom';
  creaseX?: number;
  creaseY?: number;
  isPair?: boolean;
}

export interface ImpositionSheet {
  sheetIndex: number;
  placements: ImpositionPlacement[];
  tackEdge?: 'left' | 'right' | 'top' | 'bottom';
}

export interface ImpositionResult {
  nup: number;
  cols: number;
  rows: number;
  rotation: 0 | 90;
  utilization: number;
  sheetWidth: number;
  sheetHeight: number;
  unitWidth: number;
  unitHeight: number;
  pageCount: number;
  sheetCount: number;
  sheets: ImpositionSheet[];
  warnings: string[];
  echo: {
    productWidth: number;
    productHeight: number;
    bleed: number;
    gutter: number;
    margin: { top: number; right: number; bottom: number; left: number };
    creaseWidth?: number;
    tackMargin?: number;
    tackEdge?: string;
    bindingType: string;
  };
}

export type BindingType = 'compressed' | 'tack' | 'perfect' | 'flat';

export interface CalculateImpositionRequest {
  productWidth: number;
  productHeight: number;
  pageCount: number;
  bindingType: BindingType;
  sheetWidth?: number;
  sheetHeight?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  bleed?: number;
  gutter?: number;
  creaseWidth?: number;
  tackMargin?: number;
  tackEdge?: 'left' | 'right' | 'top' | 'bottom';
  rotationPolicy?: '0' | '90' | 'auto';
  grainDirection?: 'short' | 'long';
  manualNup?: number;
  centerAlign?: boolean;
  noGutter?: boolean;
}

export interface ImpositionPreset {
  id: string;
  name: string;
  bindingType: BindingType;
  productSize?: string | null;
  targetNup?: number | null;
  sheetWidth: number;
  sheetHeight: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  creaseWidth?: number | null;
  tackMargin?: number | null;
  tackEdge?: 'left' | 'right' | 'top' | 'bottom' | null;
  gutter: number;
  bleed: number;
  grainDirection: 'short' | 'long';
  rotationPolicy: '0' | '90' | 'auto';
  isDefault: boolean;
  companyId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePresetRequest extends Omit<ImpositionPreset, 'id' | 'createdAt' | 'updatedAt'> {}

export interface ImpositionJob {
  id: string;
  orderId?: string | null;
  orderItemId?: string | null;
  presetId: string;
  pageCount: number;
  sheetCount: number;
  nup: number;
  rotation: number;
  utilization: number;
  jdfPath?: string | null;
  pdfPath?: string | null;
  imagePdfPath?: string | null;
  status: 'pending' | 'done' | 'failed';
  error?: string | null;
  warnings?: string[];
  createdAt: string;
  /** 서버 자동저장 성공 여부 — true 면 클라이언트는 다운로드 트리거를 생략한다 */
  autoSaved?: boolean;
  /** 자동저장된 이미지 PDF 의 절대경로 (서버 디스크) */
  autoSavedPath?: string | null;
  autoSavedJdfPath?: string | null;
  autoSavedSourcePdfPath?: string | null;
}

// ==================== Hooks ====================

export function useImpositionCalculate() {
  return useMutation<ImpositionResult, Error, CalculateImpositionRequest>({
    mutationFn: (body) => api.post<ImpositionResult>('/imposition/calculate', body),
  });
}

export function useImpositionPresets(bindingType?: string) {
  return useQuery<ImpositionPreset[]>({
    queryKey: ['imposition-presets', bindingType ?? 'all'],
    queryFn: () =>
      api.get<ImpositionPreset[]>(
        bindingType ? `/imposition/presets?bindingType=${bindingType}` : '/imposition/presets',
      ),
  });
}

export function useCreateImpositionPreset() {
  const qc = useQueryClient();
  return useMutation<ImpositionPreset, Error, CreatePresetRequest>({
    mutationFn: (body) => api.post<ImpositionPreset>('/imposition/presets', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imposition-presets'] }),
  });
}

/**
 * 임포지션 실행 다이얼로그 전용. 동일 파라미터의 _즉시_ 프리셋이 있으면 재사용.
 * 백엔드가 find-or-create 로 동작하므로 프리셋 목록이 무한 누적되지 않는다.
 */
export function useFindOrCreateImpositionPreset() {
  const qc = useQueryClient();
  return useMutation<ImpositionPreset, Error, CreatePresetRequest>({
    mutationFn: (body) =>
      api.post<ImpositionPreset>('/imposition/presets/find-or-create', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imposition-presets'] }),
  });
}

export function useUpdateImpositionPreset() {
  const qc = useQueryClient();
  return useMutation<ImpositionPreset, Error, { id: string; body: Partial<CreatePresetRequest> }>({
    mutationFn: ({ id, body }) => api.patch<ImpositionPreset>(`/imposition/presets/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imposition-presets'] }),
  });
}

export function useDeleteImpositionPreset() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/imposition/presets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imposition-presets'] }),
  });
}

export interface ImpositionMarks {
  crop?: boolean;
  bleed?: boolean;
  registration?: boolean;
  colorBar?: boolean;
  jobMeta?: boolean;
  fold?: boolean;
}

export function useRunImposition() {
  return useMutation<
    ImpositionJob,
    Error,
    {
      orderId: string;
      orderItemId: string;
      presetId: string;
      manualNup?: number;
      marks?: ImpositionMarks;
    }
  >({
    mutationFn: ({ orderId, orderItemId, ...body }) =>
      api.post<ImpositionJob>(
        `/imposition/orders/${orderId}/items/${orderItemId}/imposition`,
        body,
      ),
  });
}

export function useDownloadImpositionJdf() {
  return useMutation<void, Error, string>({
    mutationFn: (jobId) =>
      api.downloadBlob(`/imposition/jobs/${jobId}/jdf`, `imposition_${jobId}.jdf`),
  });
}

export function useDownloadImpositionPdf() {
  return useMutation<void, Error, string>({
    mutationFn: (jobId) =>
      api.downloadBlob(`/imposition/jobs/${jobId}/pdf`, `imposition_${jobId}.pdf`),
  });
}

export function useDownloadImpositionImagePdf() {
  return useMutation<void, Error, string>({
    mutationFn: (jobId) =>
      api.downloadBlob(`/imposition/jobs/${jobId}/image-pdf`, `imposition_image_${jobId}.pdf`),
  });
}

export function useDownloadImpositionBatchZip() {
  return useMutation<void, Error, string[]>({
    mutationFn: (jobIds) => {
      const idsParam = encodeURIComponent(jobIds.join(','));
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      return api.downloadBlob(
        `/imposition/jobs/batch-zip?ids=${idsParam}`,
        `imposition_batch_${ts}.zip`,
      );
    },
  });
}

// ==================== Rules (v1.1) ====================

export interface ImpositionRule {
  id: string;
  productSize?: string | null;
  bindingType?: BindingType | null;
  minPages?: number | null;
  maxPages?: number | null;
  priority: number;
  presetId: string;
  preset?: ImpositionPreset;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRuleRequest {
  productSize?: string | null;
  bindingType?: BindingType | null;
  minPages?: number | null;
  maxPages?: number | null;
  priority?: number;
  presetId: string;
  description?: string | null;
  isActive?: boolean;
}

export function useImpositionRules() {
  return useQuery<ImpositionRule[]>({
    queryKey: ['imposition-rules'],
    queryFn: () => api.get<ImpositionRule[]>('/imposition/rules'),
  });
}

export function useCreateImpositionRule() {
  const qc = useQueryClient();
  return useMutation<ImpositionRule, Error, CreateRuleRequest>({
    mutationFn: (body) => api.post<ImpositionRule>('/imposition/rules', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imposition-rules'] }),
  });
}

export function useUpdateImpositionRule() {
  const qc = useQueryClient();
  return useMutation<ImpositionRule, Error, { id: string; body: Partial<CreateRuleRequest> }>({
    mutationFn: ({ id, body }) => api.patch<ImpositionRule>(`/imposition/rules/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imposition-rules'] }),
  });
}

export function useDeleteImpositionRule() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/imposition/rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imposition-rules'] }),
  });
}

// ==================== Match ====================

export interface MatchRequest {
  productSize?: string;
  bindingType?: BindingType;
  pageCount?: number;
}

export interface MatchResult {
  matched: boolean;
  preset: ImpositionPreset | null;
  rule: ImpositionRule | null;
}

export function useMatchImposition() {
  return useMutation<MatchResult, Error, MatchRequest>({
    mutationFn: (body) => api.post<MatchResult>('/imposition/match', body),
  });
}

/**
 * 여러 주문항목을 한 번에 매칭 확인 (print-queue 테이블의 "자동 임포지션" 컬럼용).
 * 서버 엔드포인트가 단건 POST /imposition/match 이므로 Promise.all 로 병렬 호출.
 */
export function useMatchImpositionBatch() {
  return useMutation<MatchResult[], Error, MatchRequest[]>({
    mutationFn: async (inputs) => {
      return Promise.all(
        inputs.map((body) => api.post<MatchResult>('/imposition/match', body)),
      );
    },
  });
}

// ==================== Seed ====================

export function useSeedImposition() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean; count: number }, Error, void>({
    mutationFn: () => api.post('/imposition/seed', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['imposition-presets'] });
      qc.invalidateQueries({ queryKey: ['imposition-rules'] });
    },
  });
}

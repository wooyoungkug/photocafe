'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, API_URL } from '@/lib/api';
import {
  PurchaseQuotation,
  PurchaseQuotationListResponse,
  PurchaseQuotationQueryParams,
  CreatePurchaseQuotationDto,
  UpdatePurchaseQuotationDto,
  PurchaseQuotationFile,
} from '@/lib/types/purchase-quotation';

const KEY = 'purchase-quotations';

// ==================== 목록 ====================
export function usePurchaseQuotations(params?: PurchaseQuotationQueryParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () =>
      api.get<PurchaseQuotationListResponse>(
        '/purchase-quotations',
        params as any,
      ),
  });
}

// ==================== 단건 ====================
export function usePurchaseQuotation(id: string | null | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () =>
      api.get<PurchaseQuotation>(`/purchase-quotations/${id}`),
    enabled: !!id,
  });
}

// ==================== 등록 ====================
export function useCreatePurchaseQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePurchaseQuotationDto) =>
      api.post<PurchaseQuotation>('/purchase-quotations', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

// ==================== 수정 ====================
export function useUpdatePurchaseQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: UpdatePurchaseQuotationDto;
    }) =>
      api.patch<PurchaseQuotation>(`/purchase-quotations/${id}`, dto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [KEY, vars.id] });
    },
  });
}

// ==================== 삭제 ====================
export function useDeletePurchaseQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean }>(`/purchase-quotations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

// ==================== 파일 업로드 ====================
// FormData 사용을 위해 fetch 직접 호출 (api.post는 JSON 전용)
export function useUploadPurchaseQuotationFile() {
  return useMutation({
    mutationFn: async (file: File): Promise<PurchaseQuotationFile> => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/purchase-quotations/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `업로드 실패 (HTTP ${response.status})`);
      }

      return response.json();
    },
  });
}

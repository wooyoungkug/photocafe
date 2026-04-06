'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Quotation,
  QuotationQueryParams,
  CreateQuotationDto,
  UpdateQuotationDto,
  SendQuotationDto,
} from '@/lib/types/quotation';

const QUOTATIONS_KEY = 'quotations';

// ==================== 견적 목록 ====================

export function useQuotations(params?: QuotationQueryParams) {
  return useQuery({
    queryKey: [QUOTATIONS_KEY, params],
    queryFn: () =>
      api.get<{
        data: Quotation[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>('/quotations', params as any),
  });
}

// ==================== 견적 상세 ====================

export function useQuotation(id: string | null) {
  return useQuery({
    queryKey: [QUOTATIONS_KEY, id],
    queryFn: () => api.get<Quotation>(`/quotations/${id}`),
    enabled: !!id,
  });
}

// ==================== 견적 통계 ====================

export function useQuotationStats() {
  return useQuery({
    queryKey: [QUOTATIONS_KEY, 'stats'],
    queryFn: () =>
      api.get<{
        total: number;
        byStatus: Record<string, number>;
        byType: Record<string, number>;
      }>('/quotations/stats'),
  });
}

// ==================== 견적 생성 ====================

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateQuotationDto) =>
      api.post<Quotation>('/quotations', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUOTATIONS_KEY] });
    },
  });
}

// ==================== 견적 수정 ====================

export function useUpdateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateQuotationDto }) =>
      api.put<Quotation>(`/quotations/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUOTATIONS_KEY] });
    },
  });
}

// ==================== 견적 상태 변경 ====================

export function useUpdateQuotationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<Quotation>(`/quotations/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUOTATIONS_KEY] });
    },
  });
}

// ==================== 견적 삭제 ====================

export function useDeleteQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/quotations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUOTATIONS_KEY] });
    },
  });
}

// ==================== 견적 발송 ====================

export function useSendQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SendQuotationDto }) =>
      api.post<Quotation>(`/quotations/${id}/send`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUOTATIONS_KEY] });
    },
  });
}

// ==================== 단가 조회 ====================

export function useQuotationPriceLookup(params: {
  clientId?: string;
  categoryId?: string;
  specificationId?: string;
}) {
  return useQuery({
    queryKey: ['quotation-price', params],
    queryFn: () =>
      api.get<{ unitPrice: number; priceSource: string; specName?: string }>(
        '/quotations/price-lookup',
        params as any,
      ),
    enabled: !!params.specificationId,
  });
}

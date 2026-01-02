'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  HalfProduct,
  HalfProductListResponse,
  HalfProductQueryParams,
  CreateHalfProductDto,
  UpdateHalfProductDto,
} from '@/lib/types';

const HALF_PRODUCTS_KEY = 'half-products';

export function useHalfProducts(params?: HalfProductQueryParams) {
  return useQuery({
    queryKey: [HALF_PRODUCTS_KEY, params],
    queryFn: () =>
      api.get<HalfProductListResponse>(
        '/half-products',
        params as Record<string, string | number | boolean | undefined>
      ),
  });
}

export function useHalfProduct(id: string) {
  return useQuery({
    queryKey: [HALF_PRODUCTS_KEY, id],
    queryFn: () => api.get<HalfProduct>(`/half-products/${id}`),
    enabled: !!id,
  });
}

export function useCreateHalfProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHalfProductDto) =>
      api.post<HalfProduct>('/half-products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HALF_PRODUCTS_KEY] });
    },
  });
}

export function useUpdateHalfProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHalfProductDto }) =>
      api.put<HalfProduct>(`/half-products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HALF_PRODUCTS_KEY] });
    },
  });
}

export function useDeleteHalfProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/half-products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HALF_PRODUCTS_KEY] });
    },
  });
}

// 가격 계산
export function useCalculateHalfProductPrice() {
  return useMutation({
    mutationFn: ({
      id,
      quantity,
      specificationId,
      optionSelections,
    }: {
      id: string;
      quantity: number;
      specificationId?: string;
      optionSelections?: { optionId: string; value: string }[];
    }) =>
      api.post<{ basePrice: number; totalPrice: number; breakdown: Record<string, number> }>(
        `/half-products/${id}/calculate-price`,
        { quantity, specificationId, optionSelections }
      ),
  });
}

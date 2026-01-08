'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ProductSpecification {
  id: string;
  productId: string;
  name: string;
  width: number;
  height: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpecificationDto {
  name: string;
  width: number;
  height: number;
  unit: 'mm' | 'inch';
}

export interface UpdateSpecificationDto {
  name?: string;
  width?: number;
  height?: number;
  unit?: 'mm' | 'inch';
}

const SPECIFICATIONS_KEY = 'specifications';

// ==================== 규격 조회 ====================

export function useProductSpecifications(productId: string) {
  return useQuery({
    queryKey: [SPECIFICATIONS_KEY, productId],
    queryFn: () => api.get<ProductSpecification[]>(`/products/${productId}/specifications`),
    enabled: !!productId,
  });
}

export function useProductSpecification(productId: string, specId: string) {
  return useQuery({
    queryKey: [SPECIFICATIONS_KEY, productId, specId],
    queryFn: () => api.get<ProductSpecification>(`/products/${productId}/specifications/${specId}`),
    enabled: !!productId && !!specId,
  });
}

// ==================== 규격 추가 ====================

export function useAddSpecification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: CreateSpecificationDto }) =>
      api.post<ProductSpecification>(`/products/${productId}/specifications`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, variables.productId],
      });
    },
  });
}

// ==================== 규격 수정 ====================

export function useUpdateSpecification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      specId,
      data,
    }: {
      productId: string;
      specId: string;
      data: UpdateSpecificationDto;
    }) => api.put<ProductSpecification>(`/products/${productId}/specifications/${specId}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, variables.productId, variables.specId],
      });
    },
  });
}

// ==================== 규격 삭제 ====================

export function useDeleteSpecification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, specId }: { productId: string; specId: string }) =>
      api.delete(`/products/${productId}/specifications/${specId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, variables.productId],
      });
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// 타입 정의
export interface MyProductOptions {
  specificationId?: string;
  specificationName?: string;
  bindingId?: string;
  bindingName?: string;
  paperId?: string;
  paperName?: string;
  coverId?: string;
  coverName?: string;
  printSide?: 'single' | 'double';
  copperPlateType?: 'none' | 'public' | 'owned';
  copperPlateId?: string;
  copperPlateName?: string;
  foilColor?: string;
  foilColorName?: string;
  foilPosition?: string;
  foilPositionName?: string;
  finishingIds?: string[];
  finishingNames?: string[];
}

export interface MyProduct {
  id: string;
  clientId: string;
  productId: string;
  name: string;
  thumbnailUrl?: string;
  options: MyProductOptions;
  defaultQuantity: number;
  memo?: string;
  sortOrder: number;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    productCode: string;
    productName: string;
    thumbnailUrl?: string;
    basePrice: number;
    isActive: boolean;
  };
}

export interface CreateMyProductDto {
  clientId: string;
  productId: string;
  name: string;
  thumbnailUrl?: string;
  options: MyProductOptions;
  defaultQuantity?: number;
  memo?: string;
}

export interface UpdateMyProductDto {
  name?: string;
  thumbnailUrl?: string;
  options?: MyProductOptions;
  defaultQuantity?: number;
  memo?: string;
  sortOrder?: number;
}

const MY_PRODUCTS_KEY = 'my-products';

// 고객별 마이상품 목록 조회
export function useMyProductsByClient(clientId: string | undefined) {
  return useQuery<MyProduct[]>({
    queryKey: [MY_PRODUCTS_KEY, 'client', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return api.get<MyProduct[]>(`/my-products/client/${clientId}`);
    },
    enabled: !!clientId,
  });
}

// 마이상품 상세 조회
export function useMyProduct(id: string | undefined) {
  return useQuery<MyProduct>({
    queryKey: [MY_PRODUCTS_KEY, id],
    queryFn: () => api.get<MyProduct>(`/my-products/${id}`),
    enabled: !!id,
  });
}

// 마이상품 생성
export function useCreateMyProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateMyProductDto) =>
      api.post<MyProduct>('/my-products', dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [MY_PRODUCTS_KEY, 'client', variables.clientId],
      });
    },
  });
}

// 마이상품 수정
export function useUpdateMyProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMyProductDto }) =>
      api.put<MyProduct>(`/my-products/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MY_PRODUCTS_KEY] });
    },
  });
}

// 마이상품 삭제
export function useDeleteMyProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/my-products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MY_PRODUCTS_KEY] });
    },
  });
}

// 마이상품 사용 기록
export function useRecordMyProductUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post(`/my-products/${id}/usage`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MY_PRODUCTS_KEY] });
    },
  });
}

// 마이상품 순서 변경
export function useReorderMyProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientId,
      items,
    }: {
      clientId: string;
      items: { id: string; sortOrder: number }[];
    }) => api.post(`/my-products/client/${clientId}/reorder`, items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [MY_PRODUCTS_KEY, 'client', variables.clientId],
      });
    },
  });
}

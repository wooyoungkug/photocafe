'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Product, ProductListResponse, ProductQueryParams, CreateProductDto, UpdateProductDto, ProcessTemplateStep, ProductTypeInfo, ProductTypeOptions } from '@/lib/types';

const PRODUCTS_KEY = 'products';

export function useProducts(params?: ProductQueryParams) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, params],
    queryFn: () => api.get<ProductListResponse>('/products', params as Record<string, string | number | boolean | undefined>),
    staleTime: 2 * 60 * 1000, // 2분간 캐시 유지
    gcTime: 5 * 60 * 1000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, id],
    queryFn: () => api.get<Product>(`/products/${id}`),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2분간 캐시 유지 (페이지 이동 시 재요청 방지)
    gcTime: 5 * 60 * 1000,
  });
}

export function useCategoryProducts(categoryId: string, params?: Omit<ProductQueryParams, 'categoryId'>) {
  // categoryId가 빈 문자열이면 전체 상품 조회
  const queryParams = categoryId
    ? { categoryId, ...params }
    : { ...params, isActive: true };

  return useQuery({
    queryKey: [PRODUCTS_KEY, 'category', categoryId || 'all', params],
    queryFn: () => api.get<ProductListResponse>('/products', queryParams as Record<string, string | number | boolean | undefined>),
    staleTime: 2 * 60 * 1000, // 2분간 캐시 유지
    gcTime: 5 * 60 * 1000,
  });
}

export function useNewProducts(limit: number = 10) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, 'new', limit],
    queryFn: () => api.get<ProductListResponse>('/products', {
      isNew: true,
      limit,
      isActive: true,
    }),
  });
}

export function useBestProducts(limit: number = 10) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, 'best', limit],
    queryFn: () => api.get<ProductListResponse>('/products', {
      isBest: true,
      limit,
      isActive: true,
    }),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductDto) => api.post<Product>('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
      api.put<Product>(`/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}

// ==================== 상품 유형 / 공정 템플릿 ====================

export function useProductTypes() {
  return useQuery({
    queryKey: [PRODUCTS_KEY, 'product-types'],
    queryFn: () => api.get<ProductTypeInfo[]>('/products/product-types'),
    staleTime: 30 * 60 * 1000, // 30분 캐시 (거의 변하지 않는 데이터)
  });
}

export function useProcessTemplates(productType?: string) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, 'process-templates', productType],
    queryFn: () =>
      api.get<ProcessTemplateStep[]>(
        `/products/process-templates/${productType}`,
      ),
    enabled: !!productType,
    staleTime: 30 * 60 * 1000,
  });
}

export function useProductTypeOptions(productType?: string) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, 'type-options', productType],
    queryFn: () =>
      api.get<ProductTypeOptions>(
        `/products/type-options/${productType}`,
      ),
    enabled: !!productType,
    staleTime: 30 * 60 * 1000,
  });
}

export function useSyncProductPapers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, printMethods }: { productId: string; printMethods?: string[] }) =>
      api.post(`/products/${productId}/sync-papers`, { printMethods }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
    },
  });
}

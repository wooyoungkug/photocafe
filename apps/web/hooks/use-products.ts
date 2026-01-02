'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Product, ProductListResponse, ProductQueryParams } from '@/lib/types';

const PRODUCTS_KEY = 'products';

export function useProducts(params?: ProductQueryParams) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, params],
    queryFn: () => api.get<ProductListResponse>('/products', params as Record<string, string | number | boolean | undefined>),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, id],
    queryFn: () => api.get<Product>(`/products/${id}`),
    enabled: !!id,
  });
}

export function useCategoryProducts(categoryId: string, params?: Omit<ProductQueryParams, 'categoryId'>) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, 'category', categoryId, params],
    queryFn: () => api.get<ProductListResponse>('/products', {
      categoryId,
      ...params,
    } as Record<string, string | number | boolean | undefined>),
    enabled: !!categoryId,
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

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Product, ProductListResponse, ProductQueryParams, CreateProductDto, UpdateProductDto } from '@/lib/types';

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

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SalesCategory {
  id: string;
  code: string;
  name: string;
  depth: number;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  parent?: {
    id: string;
    code: string;
    name: string;
  } | null;
  children?: SalesCategory[];
  _count?: {
    children: number;
  };
}

export interface CreateSalesCategoryInput {
  code?: string;
  name: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
  description?: string;
}

export interface UpdateSalesCategoryInput {
  code?: string;
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
  description?: string;
}

export interface SalesCategoryQueryParams {
  parentId?: string;
  isActive?: boolean;
  search?: string;
  depth?: number;
}

const SALES_CATEGORIES_KEY = 'sales-categories';

export function useSalesCategories(params?: SalesCategoryQueryParams) {
  return useQuery({
    queryKey: [SALES_CATEGORIES_KEY, params],
    queryFn: () => api.get<SalesCategory[]>('/sales-categories', params as Record<string, string | number | boolean | undefined>),
  });
}

export function useSalesCategoryTree() {
  return useQuery({
    queryKey: [SALES_CATEGORIES_KEY, 'tree'],
    queryFn: () => api.get<SalesCategory[]>('/sales-categories/tree'),
  });
}

export function useSalesCategory(id: string) {
  return useQuery({
    queryKey: [SALES_CATEGORIES_KEY, id],
    queryFn: () => api.get<SalesCategory>(`/sales-categories/${id}`),
    enabled: !!id,
  });
}

export function useCreateSalesCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSalesCategoryInput) =>
      api.post<SalesCategory>('/sales-categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_CATEGORIES_KEY] });
    },
  });
}

export function useUpdateSalesCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSalesCategoryInput }) =>
      api.put<SalesCategory>(`/sales-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_CATEGORIES_KEY] });
    },
  });
}

export function useDeleteSalesCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/sales-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_CATEGORIES_KEY] });
    },
  });
}

export function useMoveSalesCategoryUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.post<SalesCategory>(`/sales-categories/${id}/move-up`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_CATEGORIES_KEY] });
    },
  });
}

export function useMoveSalesCategoryDown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.post<SalesCategory>(`/sales-categories/${id}/move-down`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_CATEGORIES_KEY] });
    },
  });
}

export function useReorderSalesCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) =>
      api.post<{ success: boolean }>('/sales-categories/reorder', items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_CATEGORIES_KEY] });
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
  MoveCategoryInput,
  VisibilityInput,
  CategoryQueryParams,
} from '@/lib/types';

const CATEGORIES_KEY = 'categories';

export function useCategories(params?: CategoryQueryParams) {
  return useQuery({
    queryKey: [CATEGORIES_KEY, params],
    queryFn: () => api.get<Category[]>('/categories', params),
  });
}

export function useCategoryTree() {
  return useQuery({
    queryKey: [CATEGORIES_KEY, 'tree'],
    queryFn: () => api.get<Category[]>('/categories/tree'),
  });
}

export function useTopMenuCategories() {
  return useQuery({
    queryKey: [CATEGORIES_KEY, 'top-menu'],
    queryFn: () => api.get<Category[]>('/categories/top-menu'),
  });
}

export function useVisibleCategories(isLoggedIn: boolean) {
  return useQuery({
    queryKey: [CATEGORIES_KEY, 'visible', isLoggedIn],
    queryFn: () => api.get<Category[]>('/categories/visible', { isLoggedIn }),
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: [CATEGORIES_KEY, id],
    queryFn: () => api.get<Category>(`/categories/${id}`),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryInput) =>
      api.post<Category>('/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryInput }) =>
      api.put<Category>(`/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
    },
  });
}

export function useUpdateVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VisibilityInput }) =>
      api.patch<Category>(`/categories/${id}/visibility`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
    },
  });
}

export function useMoveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MoveCategoryInput }) =>
      api.patch<Category>(`/categories/${id}/move`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
    },
  });
}

export function useMoveCategoryUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.post<Category>(`/categories/${id}/move-up`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
    },
  });
}

export function useMoveCategoryDown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.post<Category>(`/categories/${id}/move-down`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
    },
  });
}

export function useMoveCategoryToTop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.post<Category>(`/categories/${id}/move-to-top`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) =>
      api.post<{ success: boolean }>('/categories/reorder', items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
    },
  });
}

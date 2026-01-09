'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Paper,
  PaperManufacturer,
  PaperSupplier,
  CreatePaperDto,
  CreatePaperManufacturerDto,
  CreatePaperSupplierDto,
} from '@/lib/types/paper';

// ==================== 용지대리점 ====================

export function usePaperSuppliers(isActive?: boolean) {
  return useQuery({
    queryKey: ['paper-suppliers', { isActive }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (isActive !== undefined) params.append('isActive', String(isActive));
      const data = await api.get<PaperSupplier[]>(`/paper-suppliers?${params}`);
      return data ?? [];
    },
    staleTime: 0,
  });
}

export function usePaperSupplier(id: string) {
  return useQuery({
    queryKey: ['paper-suppliers', id],
    queryFn: async () => {
      const data = await api.get<PaperSupplier>(`/paper-suppliers/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePaperSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreatePaperSupplierDto) => {
      const data = await api.post<PaperSupplier>('/paper-suppliers', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paper-suppliers'] });
    },
  });
}

export function useUpdatePaperSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dto }: Partial<CreatePaperSupplierDto> & { id: string }) => {
      const data = await api.put<PaperSupplier>(`/paper-suppliers/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paper-suppliers'] });
    },
  });
}

export function useDeletePaperSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/paper-suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paper-suppliers'] });
    },
  });
}

// ==================== 제지사 ====================

export function usePaperManufacturers(isActive?: boolean) {
  return useQuery({
    queryKey: ['paper-manufacturers', { isActive }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (isActive !== undefined) params.append('isActive', String(isActive));
      const data = await api.get<PaperManufacturer[]>(`/paper-manufacturers?${params}`);
      console.log('Fetched manufacturers:', data);
      return data ?? [];
    },
    staleTime: 0,
  });
}

export function usePaperManufacturer(id: string) {
  return useQuery({
    queryKey: ['paper-manufacturers', id],
    queryFn: async () => {
      const data = await api.get<PaperManufacturer>(`/paper-manufacturers/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePaperManufacturer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreatePaperManufacturerDto) => {
      console.log('Creating manufacturer with dto:', dto);
      const data = await api.post<PaperManufacturer>('/paper-manufacturers', dto);
      console.log('Create manufacturer response:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Manufacturer created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['paper-manufacturers'] });
    },
    onError: (error: any) => {
      console.error('Failed to create manufacturer:', error);
      console.error('Error response:', error.response?.data);
    },
  });
}

export function useUpdatePaperManufacturer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dto }: Partial<CreatePaperManufacturerDto> & { id: string }) => {
      const data = await api.put<PaperManufacturer>(`/paper-manufacturers/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paper-manufacturers'] });
    },
  });
}

export function useDeletePaperManufacturer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/paper-manufacturers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paper-manufacturers'] });
    },
  });
}

// ==================== 용지 ====================

interface PaperQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  paperType?: string;
  printMethod?: string;
  manufacturerId?: string;
  isActive?: boolean;
}

interface PaperListResponse {
  data: Paper[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function usePapers(params: PaperQueryParams = {}) {
  return useQuery({
    queryKey: ['papers', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', String(params.page));
      if (params.limit) searchParams.append('limit', String(params.limit));
      if (params.search) searchParams.append('search', params.search);
      if (params.paperType) searchParams.append('paperType', params.paperType);
      if (params.printMethod) searchParams.append('printMethods', params.printMethod);
      if (params.manufacturerId) searchParams.append('manufacturerId', params.manufacturerId);
      if (params.isActive !== undefined) searchParams.append('isActive', String(params.isActive));

      const data = await api.get<PaperListResponse>(`/papers?${searchParams}`);
      return data;
    },
  });
}

export function usePaper(id: string) {
  return useQuery({
    queryKey: ['papers', id],
    queryFn: async () => {
      const data = await api.get<Paper>(`/papers/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePapersByType(paperType: 'roll' | 'sheet') {
  return useQuery({
    queryKey: ['papers', 'type', paperType],
    queryFn: async () => {
      const data = await api.get<Paper[]>(`/papers/type/${paperType}`);
      return data;
    },
  });
}

export function usePapersByPrintMethod(method: string) {
  return useQuery({
    queryKey: ['papers', 'print-method', method],
    queryFn: async () => {
      const data = await api.get<Paper[]>(`/papers/print-method/${method}`);
      return data;
    },
    enabled: !!method,
  });
}

export function useCreatePaper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreatePaperDto) => {
      const data = await api.post<Paper>('/papers', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
    },
  });
}

export function useUpdatePaper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dto }: Partial<CreatePaperDto> & { id: string }) => {
      const data = await api.put<Paper>(`/papers/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
    },
  });
}

export function useDeletePaper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/papers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface PublicCopperPlate {
  id: string;
  plateName: string;
  plateCode: string | null;
  plateType: string;
  widthMm: number | null;
  heightMm: number | null;
  storageLocation: string | null;
  imageUrl: string | null;
  aiFileUrl: string | null;
  designFileUrl: string | null;
  description: string | null;
  defaultEngravingText: string | null;
  status: string;
  sortOrder: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCopperPlateListResponse {
  data: PublicCopperPlate[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PublicCopperPlateQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  plateType?: string;
}

export interface CreatePublicCopperPlateDto {
  plateName: string;
  plateCode?: string;
  plateType?: string;
  widthMm?: number;
  heightMm?: number;
  storageLocation?: string;
  imageUrl?: string;
  aiFileUrl?: string;
  designFileUrl?: string;
  description?: string;
  defaultEngravingText?: string;
  status?: string;
  sortOrder?: number;
}

export interface ProductPublicCopperPlate {
  id: string;
  productId: string;
  publicCopperPlateId: string;
  engravingText: string | null;
  isDefault: boolean;
  sortOrder: number;
  publicCopperPlate: PublicCopperPlate;
}

const PUBLIC_COPPER_PLATES_KEY = 'public-copper-plates';

export function usePublicCopperPlates(params?: PublicCopperPlateQueryParams) {
  return useQuery({
    queryKey: [PUBLIC_COPPER_PLATES_KEY, params],
    queryFn: () => api.get<PublicCopperPlateListResponse>('/public-copper-plates', params as Record<string, string | number | boolean | undefined>),
  });
}

export function usePublicCopperPlate(id: string) {
  return useQuery({
    queryKey: [PUBLIC_COPPER_PLATES_KEY, id],
    queryFn: () => api.get<PublicCopperPlate>(`/public-copper-plates/${id}`),
    enabled: !!id,
  });
}

export function useCreatePublicCopperPlate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePublicCopperPlateDto) => api.post<PublicCopperPlate>('/public-copper-plates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PUBLIC_COPPER_PLATES_KEY] });
    },
  });
}

export function useUpdatePublicCopperPlate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePublicCopperPlateDto> }) =>
      api.put<PublicCopperPlate>(`/public-copper-plates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PUBLIC_COPPER_PLATES_KEY] });
    },
  });
}

export function useDeletePublicCopperPlate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/public-copper-plates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PUBLIC_COPPER_PLATES_KEY] });
    },
  });
}

// 상품의 공용동판 목록 조회
export function useProductPublicCopperPlates(productId: string) {
  return useQuery({
    queryKey: [PUBLIC_COPPER_PLATES_KEY, 'product', productId],
    queryFn: () => api.get<ProductPublicCopperPlate[]>(`/public-copper-plates/product/${productId}`),
    enabled: !!productId,
  });
}

// 상품에 공용동판 연결
export function useLinkPublicCopperPlateToProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      plateId,
      data,
    }: {
      productId: string;
      plateId: string;
      data: { engravingText?: string };
    }) => api.post(`/public-copper-plates/product/${productId}/link/${plateId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PUBLIC_COPPER_PLATES_KEY] });
    },
  });
}

// 상품에서 공용동판 연결 해제
export function useUnlinkPublicCopperPlateFromProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, plateId }: { productId: string; plateId: string }) =>
      api.delete(`/public-copper-plates/product/${productId}/unlink/${plateId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PUBLIC_COPPER_PLATES_KEY] });
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  GroupProductPrice,
  GroupHalfProductPrice,
  SetGroupProductPriceDto,
  SetGroupHalfProductPriceDto,
  CalculateProductPriceDto,
  CalculateHalfProductPriceDto,
  PriceCalculationResult,
  ProductSummary,
  HalfProductSummary,
  GroupProductionSettingPrice,
  SetGroupProductionSettingPricesDto,
<<<<<<< Updated upstream
  ClientProductionSettingPrice,
  SetClientProductionSettingPricesDto,
  ClientProductionSettingSummary,
=======
>>>>>>> Stashed changes
} from '@/lib/types/pricing';
import { PaginatedResponse } from '@/lib/types/client';

const PRICING_KEY = 'pricing';
const PRODUCTS_KEY = 'products';
const HALF_PRODUCTS_KEY = 'half-products';

// ==================== 상품 목록 (가격 포함) ====================

export function useProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, params],
    queryFn: () => api.get<PaginatedResponse<ProductSummary>>('/products', params),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, id],
    queryFn: () => api.get<ProductSummary>(`/products/${id}`),
    enabled: !!id,
  });
}

// ==================== 반제품 목록 ====================

export function useHalfProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  categoryLargeId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: [HALF_PRODUCTS_KEY, params],
    queryFn: () => api.get<PaginatedResponse<HalfProductSummary>>('/half-products', params),
  });
}

// ==================== 그룹 상품 가격 ====================

export function useGroupProductPrices(groupId: string) {
  return useQuery({
    queryKey: [PRICING_KEY, 'group-products', groupId],
    queryFn: () => api.get<GroupProductPrice[]>(`/pricing/groups/${groupId}/products`),
    enabled: !!groupId,
  });
}

export function useSetGroupProductPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: SetGroupProductPriceDto) =>
      api.post<GroupProductPrice>('/pricing/groups/products', dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PRICING_KEY, 'group-products', variables.groupId],
      });
    },
  });
}

export function useDeleteGroupProductPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, productId }: { groupId: string; productId: string }) =>
      api.delete(`/pricing/groups/${groupId}/products/${productId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PRICING_KEY, 'group-products', variables.groupId],
      });
    },
  });
}

// ==================== 그룹 반제품 가격 ====================

export function useGroupHalfProductPrices(groupId: string) {
  return useQuery({
    queryKey: [PRICING_KEY, 'group-half-products', groupId],
    queryFn: () => api.get<GroupHalfProductPrice[]>(`/pricing/groups/${groupId}/half-products`),
    enabled: !!groupId,
  });
}

export function useSetGroupHalfProductPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: SetGroupHalfProductPriceDto) =>
      api.post<GroupHalfProductPrice>('/pricing/groups/half-products', dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PRICING_KEY, 'group-half-products', variables.groupId],
      });
    },
  });
}

export function useDeleteGroupHalfProductPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, halfProductId }: { groupId: string; halfProductId: string }) =>
      api.delete(`/pricing/groups/${groupId}/half-products/${halfProductId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PRICING_KEY, 'group-half-products', variables.groupId],
      });
    },
  });
}

// ==================== 가격 계산 ====================

export function useCalculateProductPrice() {
  return useMutation({
    mutationFn: (dto: CalculateProductPriceDto) =>
      api.post<PriceCalculationResult>('/pricing/calculate/product', dto),
  });
}

export function useCalculateHalfProductPrice() {
  return useMutation({
    mutationFn: (dto: CalculateHalfProductPriceDto) =>
      api.post<PriceCalculationResult>('/pricing/calculate/half-product', dto),
  });
}

// ==================== 그룹 생산설정 단가 ====================

export function useGroupProductionSettingPrices(clientGroupId: string, productionSettingId?: string) {
  return useQuery({
    queryKey: [PRICING_KEY, 'group-production-settings', clientGroupId, productionSettingId],
    queryFn: () => {
      const params = productionSettingId ? { productionSettingId } : undefined;
      return api.get<GroupProductionSettingPrice[]>(
        `/pricing/groups/${clientGroupId}/production-settings`,
        params
      );
    },
    enabled: !!clientGroupId,
  });
}

export function useSetGroupProductionSettingPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: SetGroupProductionSettingPricesDto) =>
      api.post<GroupProductionSettingPrice[]>('/pricing/groups/production-settings', dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PRICING_KEY, 'group-production-settings', variables.clientGroupId],
      });
    },
  });
}

export function useDeleteGroupProductionSettingPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientGroupId, productionSettingId }: { clientGroupId: string; productionSettingId: string }) =>
      api.delete(`/pricing/groups/${clientGroupId}/production-settings/${productionSettingId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PRICING_KEY, 'group-production-settings', variables.clientGroupId],
      });
    },
  });
}
<<<<<<< Updated upstream

// ==================== 거래처 개별 생산설정 단가 ====================

export function useClientProductionSettingPrices(clientId: string, productionSettingId?: string) {
  return useQuery({
    queryKey: [PRICING_KEY, 'client-production-settings', clientId, productionSettingId],
    queryFn: () => {
      const params = productionSettingId ? { productionSettingId } : undefined;
      return api.get<ClientProductionSettingPrice[]>(
        `/pricing/clients/${clientId}/production-settings`,
        params
      );
    },
    enabled: !!clientId,
  });
}

export function useClientProductionSettingSummary(clientId: string) {
  return useQuery({
    queryKey: [PRICING_KEY, 'client-production-settings-summary', clientId],
    queryFn: () => api.get<ClientProductionSettingSummary[]>(
      `/pricing/clients/${clientId}/production-settings/summary`
    ),
    enabled: !!clientId,
  });
}

export function useSetClientProductionSettingPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: SetClientProductionSettingPricesDto) =>
      api.post<ClientProductionSettingPrice[]>('/pricing/clients/production-settings', dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PRICING_KEY, 'client-production-settings', variables.clientId],
      });
      queryClient.invalidateQueries({
        queryKey: [PRICING_KEY, 'client-production-settings-summary', variables.clientId],
      });
    },
  });
}

export function useDeleteClientProductionSettingPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, productionSettingId }: { clientId: string; productionSettingId: string }) =>
      api.delete(`/pricing/clients/${clientId}/production-settings/${productionSettingId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PRICING_KEY, 'client-production-settings', variables.clientId],
      });
      queryClient.invalidateQueries({
        queryKey: [PRICING_KEY, 'client-production-settings-summary', variables.clientId],
      });
    },
  });
}
=======
>>>>>>> Stashed changes

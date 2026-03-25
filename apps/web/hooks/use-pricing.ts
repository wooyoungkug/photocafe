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
  ClientProductionSettingPrice,
  SetClientProductionSettingPricesDto,
  ClientProductionSettingSummary,
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

export function useCloneStandardToGroupPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientGroupId, productionSettingId }: { clientGroupId: string; productionSettingId: string }) =>
      api.post<GroupProductionSettingPrice[]>(`/pricing/groups/${clientGroupId}/clone-standard/${productionSettingId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PRICING_KEY, 'group-production-settings', variables.clientGroupId],
      });
    },
  });
}

export function useCloneAllToGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ targetGroupId, sourceType, sourceId }: { targetGroupId: string; sourceType: 'standard' | 'group' | 'client'; sourceId?: string }) =>
      api.post<{ copiedSettings: number; copiedPrices: number }>(`/pricing/groups/${targetGroupId}/clone-all`, { sourceType, sourceId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PRICING_KEY, 'group-production-settings', variables.targetGroupId],
      });
    },
  });
}

export function useApplyWeightAllToGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientGroupId, weightPercent, categoryId }: { clientGroupId: string; weightPercent: number; categoryId?: string }) =>
      api.post<{ appliedSettings: number; appliedPrices: number; weightPercent: number }>(
        `/pricing/groups/${clientGroupId}/apply-weight-all`,
        { weightPercent, categoryId }
      ),
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

// ==================== 거래처 개별단가 클론/가중치 ====================

export function useCloneStandardToClientPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, productionSettingId }: { clientId: string; productionSettingId: string }) =>
      api.post<ClientProductionSettingPrice[]>(`/pricing/clients/${clientId}/clone-standard/${productionSettingId}`),
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

export function useCloneGroupToClientPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, clientGroupId, productionSettingId }: { clientId: string; clientGroupId: string; productionSettingId: string }) =>
      api.post<ClientProductionSettingPrice[]>(`/pricing/clients/${clientId}/clone-group/${productionSettingId}?clientGroupId=${clientGroupId}`),
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

export function useCloneAllToClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, sourceType, sourceId }: { clientId: string; sourceType: 'standard' | 'group' | 'client'; sourceId?: string }) =>
      api.post<{ copiedSettings: number; copiedPrices: number }>(`/pricing/clients/${clientId}/clone-all`, { sourceType, sourceId }),
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

export function useApplyWeightAllToClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, weightPercent, categoryId }: { clientId: string; weightPercent: number; categoryId?: string }) =>
      api.post<{ appliedSettings: number; appliedPrices: number; weightPercent: number }>(
        `/pricing/clients/${clientId}/apply-weight-all`,
        { weightPercent, categoryId }
      ),
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

// ==================== 앨범 페이지 단가 조회 ====================

export interface AlbumPagePriceResult {
  pricePerPage: number;
  bindingBasePrice: number;
  bindingPricePerPage: number;
  bindingRangePrices: Record<string, number> | null;
  coverPrice: number;
  missingReason: string | null;
  billingExtraPages: number;
  nup?: string | null;
  priceSource?: string | null; // 'client' | 'group' | 'standard'
  groupName?: string | null;   // 그룹 단가인 경우 그룹명
  postProcessingPrice: number; // 후가공비 (코팅 등)
  postProcessingSettingId?: string | null; // 후가공 생산설정 ID (딥링크용)
}

export function useAlbumPagePrice(
  productionSettingId: string | undefined,
  specificationId: string | undefined,
  colorMode: '4c' | '6c',
  pageLayout: 'single' | 'spread',
  bindingProductionSettingId?: string,
  paperId?: string,
  clientId?: string,
  productId?: string,
) {
  return useQuery({
    queryKey: [PRICING_KEY, 'album-page-price', productionSettingId, specificationId, colorMode, pageLayout, bindingProductionSettingId, paperId, clientId, productId],
    queryFn: () =>
      api.get<AlbumPagePriceResult>('/pricing/album-page-price', {
        productionSettingId,
        specificationId,
        colorMode,
        pageLayout,
        ...(bindingProductionSettingId ? { bindingProductionSettingId } : {}),
        ...(paperId ? { paperId } : {}),
        ...(clientId ? { clientId } : {}),
        ...(productId ? { productId } : {}),
      }),
    enabled: !!productionSettingId && !!specificationId,
    staleTime: 5 * 60 * 1000, // 5분 캐시
    placeholderData: (previousData: AlbumPagePriceResult | undefined) => previousData, // 조건 변경 중 이전 데이터 유지 (깜빡임 방지)
  });
}

// ==================== 추가주문 단가 계산 ====================

export interface AlbumOrderCalculateResult {
  pricePerPage: number;
  printPrice: number;
  paperPrice: number;
  bindingPrice: number;
  postProcessingPrice: number;
  unitPrice: number;
  specificationId?: string;
  nup?: string;
  coverPrice?: number;
  bindingOnlyPrice?: number;
  bindingRangePrices?: Record<string, number> | null;
  bindingBasePrice?: number;
  bindingPricePerPage?: number;
  billingExtraPages?: number;
  appliedPolicy?: string;
  priceSource?: string; // 'client' | 'group' | 'standard'
  groupName?: string | null;
}

export function useCalculateAlbumOrderPrice(params: {
  productId: string | undefined;
  widthInch: number | undefined;
  heightInch: number | undefined;
  pageCount: number | undefined;
  colorMode: '4c' | '6c';
  pageLayout: 'single' | 'spread';
  paperId?: string;
  clientId?: string;
}) {
  return useQuery({
    queryKey: [
      PRICING_KEY, 'calculate-album-order',
      params.productId, params.widthInch, params.heightInch,
      params.pageCount, params.colorMode, params.pageLayout,
      params.paperId, params.clientId,
    ],
    queryFn: () => api.post<AlbumOrderCalculateResult>('/pricing/calculate/album-order', params),
    enabled: !!params.productId && !!params.widthInch && !!params.heightInch && !!params.pageCount,
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== 표준단가 Flat 조회 ====================

export function useStandardPricesFlat(productionSettingId: string | undefined) {
  return useQuery({
    queryKey: [PRICING_KEY, 'standard-flat', productionSettingId],
    queryFn: () => api.get<any[]>(`/pricing/standard/${productionSettingId}/prices`),
    enabled: !!productionSettingId,
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== 단가 검증 ====================

export function useValidatePrices() {
  return useMutation({
    mutationFn: (dto: { productionSettingId: string; prices: any[]; mode?: string }) =>
      api.post<{ valid: boolean; warnings: string[]; errors: string[] }>('/pricing/validate', dto),
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// 가격 계산 방식 타입
export type PricingType = 'paper_output_spec' | 'nup_page_range' | 'finishing_spec_nup' | 'binding_page' | 'finishing_qty' | 'finishing_page';

export interface PricingTypeOption {
  value: PricingType;
  label: string;
}

// 생산그룹 타입
export interface ProductionGroup {
  id: string;
  code: string;
  name: string;
  depth: number;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: ProductionGroup;
  children?: ProductionGroup[];
  settings?: ProductionSetting[];
  _count?: {
    settings: number;
    children: number;
  };
}

// 인디고 Up별 가격 타입
export interface IndigoUpPrice {
  up: number;
  weight: number;
  singleSidedPrice: number;
  doubleSidedPrice: number;
}

// 잉크젯 규격별 가격 타입
export interface InkjetSpecPrice {
  specificationId: string;
  singleSidedPrice: number;
  weight?: number; // 규격별 가중치 (기본값: 1.0)
  isBaseSpec?: boolean; // 기준규격 여부
}

// 생산설정 타입
export interface ProductionSetting {
  id: string;
  groupId: string;
  codeName: string | null;
  vendorType: string;
  pricingType: PricingType;
  settingName: string | null;
  sCode: string | null;
  settingFee: number;
  basePrice: number;
  workDays: number;
  weightInfo: string | null;
  // 용지별 출력단가 설정
  printMethod?: string;
  paperIds?: string[];
  singleSidedPrice?: number;
  doubleSidedPrice?: number;
  // 인디고 Up별 가격 (paper_output_spec 인디고용)
  indigoUpPrices?: IndigoUpPrice[];
  // 잉크젯 규격별 가격 (paper_output_spec 잉크젯용)
  inkjetSpecPrices?: InkjetSpecPrice[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  group?: ProductionGroup;
  specifications?: ProductionSettingSpecification[];
  prices?: ProductionSettingPrice[];
  _count?: {
    specifications: number;
    prices: number;
  };
}

// 규격 연결 타입
export interface ProductionSettingSpecification {
  id: string;
  productionSettingId: string;
  specificationId: string;
  price: number | null;
  sortOrder: number;
  specification?: {
    id: string;
    code: string;
    name: string;
    widthInch: number;
    heightInch: number;
    widthMm: number;
    heightMm: number;
  };
}

// 가격 타입
export interface ProductionSettingPrice {
  id: string;
  productionSettingId: string;
  specificationId: string | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  price: number;
}

const PRODUCTION_KEY = 'production';

// ==================== 생산그룹 ====================

export function useProductionGroups(params?: {
  parentId?: string;
  depth?: number;
  isActive?: boolean;
  search?: string;
}) {
  return useQuery({
    queryKey: [PRODUCTION_KEY, 'groups', params],
    queryFn: () => api.get<ProductionGroup[]>('/production/groups', params),
  });
}

export function useProductionGroupTree() {
  return useQuery({
    queryKey: [PRODUCTION_KEY, 'groups', 'tree'],
    queryFn: () => api.get<ProductionGroup[]>('/production/groups/tree'),
  });
}

export function useProductionGroup(id: string) {
  return useQuery({
    queryKey: [PRODUCTION_KEY, 'groups', id],
    queryFn: () => api.get<ProductionGroup>(`/production/groups/${id}`),
    enabled: !!id,
  });
}

export function useCreateProductionGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      code: string;
      name: string;
      parentId?: string;
      sortOrder?: number;
      isActive?: boolean;
    }) => api.post<ProductionGroup>('/production/groups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTION_KEY, 'groups'] });
    },
  });
}

export function useUpdateProductionGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      code?: string;
      name?: string;
      sortOrder?: number;
      isActive?: boolean;
    }) => api.put<ProductionGroup>(`/production/groups/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTION_KEY, 'groups'] });
    },
  });
}

export function useDeleteProductionGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/production/groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTION_KEY, 'groups'] });
    },
  });
}

export function useMoveProductionGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
      api.post<ProductionGroup>(`/production/groups/${id}/move-${direction}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTION_KEY, 'groups'] });
    },
  });
}

// ==================== 생산설정 ====================

export function useProductionSettings(params?: {
  groupId?: string;
  pricingType?: PricingType;
  isActive?: boolean;
}) {
  return useQuery({
    queryKey: [PRODUCTION_KEY, 'settings', params],
    queryFn: () => api.get<ProductionSetting[]>('/production/settings', params),
  });
}

export function usePricingTypes() {
  return useQuery({
    queryKey: [PRODUCTION_KEY, 'pricing-types'],
    queryFn: () => api.get<PricingTypeOption[]>('/production/settings/pricing-types'),
  });
}

export function useProductionSetting(id: string) {
  return useQuery({
    queryKey: [PRODUCTION_KEY, 'settings', id],
    queryFn: () => api.get<ProductionSetting>(`/production/settings/${id}`),
    enabled: !!id,
  });
}

export function useCreateProductionSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      groupId: string;
      codeName?: string;
      vendorType?: string;
      pricingType: PricingType;
      settingName?: string;
      sCode?: string;
      settingFee?: number;
      basePrice?: number;
      workDays?: number;
      weightInfo?: string;
      printMethod?: string;
      paperIds?: string[];
      singleSidedPrice?: number;
      doubleSidedPrice?: number;
      indigoUpPrices?: IndigoUpPrice[];
      inkjetSpecPrices?: InkjetSpecPrice[];
      baseSpecificationId?: string; // 잉크젯 기준규격 ID
      specificationIds?: string[];
      sortOrder?: number;
      isActive?: boolean;
    }) => api.post<ProductionSetting>('/production/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTION_KEY] });
    },
  });
}

export function useUpdateProductionSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      codeName?: string;
      vendorType?: string;
      pricingType?: PricingType;
      settingName?: string;
      sCode?: string;
      settingFee?: number;
      basePrice?: number;
      workDays?: number;
      weightInfo?: string;
      printMethod?: string;
      paperIds?: string[];
      singleSidedPrice?: number;
      doubleSidedPrice?: number;
      indigoUpPrices?: IndigoUpPrice[];
      inkjetSpecPrices?: InkjetSpecPrice[];
      baseSpecificationId?: string; // 잉크젯 기준규격 ID
      specificationIds?: string[];
      sortOrder?: number;
      isActive?: boolean;
    }) => api.put<ProductionSetting>(`/production/settings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTION_KEY] });
    },
  });
}

export function useDeleteProductionSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/production/settings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTION_KEY] });
    },
  });
}

export function useUpdateSettingSpecifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, specificationIds }: { id: string; specificationIds: string[] }) =>
      api.put<ProductionSetting>(`/production/settings/${id}/specifications`, { specificationIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTION_KEY] });
    },
  });
}

export function useUpdateSettingPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, prices }: {
      id: string;
      prices: Array<{
        specificationId?: string;
        minQuantity?: number;
        maxQuantity?: number;
        price: number;
      }>;
    }) => api.put<ProductionSetting>(`/production/settings/${id}/prices`, { prices }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTION_KEY] });
    },
  });
}

export function useMoveProductionSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
      api.post<ProductionSetting>(`/production/settings/${id}/move-${direction}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTION_KEY] });
    },
  });
}

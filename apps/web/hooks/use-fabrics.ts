import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// 타입 정의
export type FabricCategory = 'leather' | 'cloth' | 'velvet' | 'silk' | 'linen' | 'canvas' | 'synthetic' | 'other';
export type FabricMaterial = 'genuine_leather' | 'pu_leather' | 'pvc_leather' | 'cotton' | 'polyester' | 'nylon' | 'wool' | 'mixed' | 'other';
export type FabricUnitType = 'm' | 'roll' | 'yard';

export const FABRIC_CATEGORY_LABELS: Record<FabricCategory, string> = {
  leather: '가죽',
  cloth: '천',
  velvet: '벨벳',
  silk: '실크',
  linen: '린넨',
  canvas: '캔버스',
  synthetic: '합성',
  other: '기타',
};

export const FABRIC_MATERIAL_LABELS: Record<FabricMaterial, string> = {
  genuine_leather: '천연가죽',
  pu_leather: 'PU가죽',
  pvc_leather: 'PVC가죽',
  cotton: '면',
  polyester: '폴리에스터',
  nylon: '나일론',
  wool: '울',
  mixed: '혼방',
  other: '기타',
};

export const FABRIC_UNIT_LABELS: Record<FabricUnitType, string> = {
  m: '미터당',
  roll: '롤당',
  yard: '야드당',
};

export const FABRIC_CATEGORY_COLORS: Record<FabricCategory, string> = {
  leather: 'bg-amber-100 text-amber-800 border-amber-200',
  cloth: 'bg-blue-100 text-blue-800 border-blue-200',
  velvet: 'bg-purple-100 text-purple-800 border-purple-200',
  silk: 'bg-pink-100 text-pink-800 border-pink-200',
  linen: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  canvas: 'bg-orange-100 text-orange-800 border-orange-200',
  synthetic: 'bg-gray-100 text-gray-800 border-gray-200',
  other: 'bg-slate-100 text-slate-800 border-slate-200',
};

export interface FabricSupplier {
  id: string;
  code: string;
  name: string;
  phone?: string;
  mobile?: string;
  email?: string;
  fax?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  representative?: string;
  website?: string;
  description?: string;
  memo?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    fabrics: number;
  };
}

export interface Fabric {
  id: string;
  code: string;
  name: string;
  category: FabricCategory;
  material: FabricMaterial;
  colorCode?: string;
  colorName?: string;
  widthCm?: number;
  thickness?: number;
  weight?: number;
  supplierId?: string;
  supplier?: {
    id: string;
    code: string;
    name: string;
  };
  basePrice: number;
  unitType: FabricUnitType;
  discountRate: number;
  discountPrice?: number;
  stockQuantity: number;
  minStockLevel: number;
  forAlbumCover: boolean;
  forBoxCover: boolean;
  forFrameCover: boolean;
  forOther: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
  description?: string;
  memo?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFabricDto {
  code: string;
  name: string;
  category?: FabricCategory;
  material?: FabricMaterial;
  colorCode?: string;
  colorName?: string;
  widthCm?: number;
  thickness?: number;
  weight?: number;
  supplierId?: string;
  basePrice?: number;
  unitType?: FabricUnitType;
  discountRate?: number;
  discountPrice?: number;
  stockQuantity?: number;
  minStockLevel?: number;
  forAlbumCover?: boolean;
  forBoxCover?: boolean;
  forFrameCover?: boolean;
  forOther?: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
  description?: string;
  memo?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateFabricDto {
  code?: string;
  name?: string;
  category?: FabricCategory;
  material?: FabricMaterial;
  colorCode?: string;
  colorName?: string;
  widthCm?: number;
  thickness?: number;
  weight?: number;
  supplierId?: string;
  basePrice?: number;
  unitType?: FabricUnitType;
  discountRate?: number;
  discountPrice?: number;
  stockQuantity?: number;
  minStockLevel?: number;
  forAlbumCover?: boolean;
  forBoxCover?: boolean;
  forFrameCover?: boolean;
  forOther?: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
  description?: string;
  memo?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateFabricSupplierDto {
  code: string;
  name: string;
  phone?: string;
  mobile?: string;
  email?: string;
  fax?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  representative?: string;
  website?: string;
  description?: string;
  memo?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateFabricSupplierDto {
  code?: string;
  name?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  fax?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  representative?: string;
  website?: string;
  description?: string;
  memo?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface FabricListResponse {
  data: Fabric[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ==================== 원단 공급업체 훅 ====================

// 공급업체 목록 조회
export function useFabricSuppliers(includeInactive = false) {
  return useQuery<FabricSupplier[]>({
    queryKey: ['fabric-suppliers', { includeInactive }],
    queryFn: () => api.get<FabricSupplier[]>('/fabrics/suppliers', { includeInactive }),
  });
}

// 공급업체 상세 조회
export function useFabricSupplier(id: string | undefined) {
  return useQuery<FabricSupplier>({
    queryKey: ['fabric-suppliers', id],
    queryFn: () => api.get<FabricSupplier>(`/fabrics/suppliers/${id}`),
    enabled: !!id,
  });
}

// 공급업체 등록
export function useCreateFabricSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateFabricSupplierDto) => api.post<FabricSupplier>('/fabrics/suppliers', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabric-suppliers'] });
    },
  });
}

// 공급업체 수정
export function useUpdateFabricSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateFabricSupplierDto }) =>
      api.put<FabricSupplier>(`/fabrics/suppliers/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabric-suppliers'] });
    },
  });
}

// 공급업체 삭제
export function useDeleteFabricSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/fabrics/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabric-suppliers'] });
    },
  });
}

// ==================== 원단 훅 ====================

// 원단 목록 조회
export function useFabrics(params?: {
  search?: string;
  category?: string;
  material?: string;
  supplierId?: string;
  includeInactive?: boolean;
  isActive?: boolean;
  forAlbumCover?: boolean;
  forBoxCover?: boolean;
  forFrameCover?: boolean;
  page?: number;
  limit?: number;
}) {
  return useQuery<FabricListResponse>({
    queryKey: ['fabrics', params],
    queryFn: () => api.get<FabricListResponse>('/fabrics', params),
  });
}

// 원단 상세 조회
export function useFabric(id: string | undefined) {
  return useQuery<Fabric>({
    queryKey: ['fabrics', id],
    queryFn: () => api.get<Fabric>(`/fabrics/${id}`),
    enabled: !!id,
  });
}

// 재고 부족 원단 조회
export function useLowStockFabrics() {
  return useQuery<Fabric[]>({
    queryKey: ['fabrics', 'low-stock'],
    queryFn: () => api.get<Fabric[]>('/fabrics/low-stock'),
  });
}

// 원단 등록
export function useCreateFabric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateFabricDto) => api.post<Fabric>('/fabrics', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrics'] });
    },
  });
}

// 원단 수정
export function useUpdateFabric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateFabricDto }) =>
      api.put<Fabric>(`/fabrics/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrics'] });
    },
  });
}

// 원단 삭제
export function useDeleteFabric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/fabrics/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrics'] });
    },
  });
}

// 재고 업데이트
export function useUpdateFabricStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      quantity,
      operation,
    }: {
      id: string;
      quantity: number;
      operation: 'add' | 'subtract' | 'set';
    }) => api.post<Fabric>(`/fabrics/${id}/stock`, { quantity, operation }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrics'] });
    },
  });
}

// 순서 변경
export function useReorderFabric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      direction,
    }: {
      id: string;
      direction: 'up' | 'down';
    }) => api.post<Fabric>(`/fabrics/${id}/reorder`, { direction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrics'] });
    },
  });
}

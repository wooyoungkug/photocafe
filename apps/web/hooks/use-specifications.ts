'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// 방향 타입
export type Orientation = 'landscape' | 'portrait' | 'square';

// 전역 규격 (생산설정용)
export interface Specification {
  id: string;
  code: string;
  name: string;
  widthInch: number;
  heightInch: number;
  widthMm: number;
  heightMm: number;
  // 방향 (가로형/세로형)
  orientation: Orientation;
  pairId?: string;  // 쌍이 되는 규격의 ID
  // 용도 플래그 (중첩 사용 가능)
  forIndigo: boolean;   // 인디고출력전용
  forInkjet: boolean;   // 잉크젯출력전용
  forAlbum: boolean;    // 앨범전용
  forFrame: boolean;    // 액자전용
  forBooklet: boolean;  // 인쇄책자전용
  nup?: string | null;  // "1++up" | "1+up" | "1up" | "2up" | "4up" | "8up"
  squareMeters?: number;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 제품별 규격
export interface ProductSpecification {
  id: string;
  productId: string;
  name: string;
  width: number;
  height: number;
  unit: 'mm' | 'inch';
  createdAt: string;
  updatedAt: string;
}

// 전역 규격 생성 DTO
export interface CreateGlobalSpecificationDto {
  name?: string;
  widthInch: number;
  heightInch: number;
  widthMm: number;
  heightMm: number;
  orientation?: Orientation;
  forIndigo?: boolean;   // 인디고출력전용
  forInkjet?: boolean;   // 잉크젯출력전용
  forAlbum?: boolean;
  forFrame?: boolean;
  forBooklet?: boolean;
  squareMeters?: number;
  description?: string;
  sortOrder?: number;
  createPair?: boolean;  // 쌍 자동 생성 여부 (기본값: true)
}

// 전역 규격 수정 DTO
export interface UpdateGlobalSpecificationDto extends Partial<CreateGlobalSpecificationDto> {
  isActive?: boolean;
}

// 제품별 규격 생성 DTO (기존)
export interface CreateSpecificationDto {
  name: string;
  width: number;
  height: number;
  unit: 'mm' | 'inch';
}

export interface UpdateSpecificationDto {
  name?: string;
  width?: number;
  height?: number;
  unit?: 'mm' | 'inch';
}

const SPECIFICATIONS_KEY = 'specifications';

// ==================== 전역 규격 조회 ====================

export function useSpecifications(params?: {
  forIndigo?: boolean;
  forInkjet?: boolean;
  forAlbum?: boolean;
  forFrame?: boolean;
  forBooklet?: boolean;
  isActive?: boolean;
}) {
  return useQuery({
    queryKey: [SPECIFICATIONS_KEY, 'global', params],
    queryFn: () => api.get<Specification[]>('/specifications', params),
  });
}

// 잉크젯 출력용 규격 (잉크젯출력전용/앨범전용/액자전용)
export function useInkjetSpecifications() {
  return useQuery({
    queryKey: [SPECIFICATIONS_KEY, 'inkjet'],
    queryFn: async () => {
      const data = await api.get<Specification[]>('/specifications');
      // 잉크젯출력전용, 앨범전용, 액자전용 중 하나라도 true인 규격 필터링
      return data?.filter(spec => spec.forInkjet || spec.forAlbum || spec.forFrame) ?? [];
    },
  });
}

// 인디고 출력용 규격
export function useIndigoSpecifications() {
  return useQuery({
    queryKey: [SPECIFICATIONS_KEY, 'indigo'],
    queryFn: async () => {
      const data = await api.get<Specification[]>('/specifications');
      // 인디고출력전용인 규격 필터링
      return data?.filter(spec => spec.forIndigo) ?? [];
    },
  });
}

// 단일 전역 규격 조회
export function useSpecification(id: string) {
  return useQuery({
    queryKey: [SPECIFICATIONS_KEY, 'global', id],
    queryFn: () => api.get<Specification>(`/specifications/${id}`),
    enabled: !!id,
  });
}

// ==================== 전역 규격 생성/수정/삭제 ====================

// 전역 규격 생성 (가로/세로 쌍 자동 생성)
export function useCreateGlobalSpecification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGlobalSpecificationDto) =>
      api.post<{ main: Specification; pair: Specification; message: string } | Specification>(
        '/specifications',
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, 'global'],
      });
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, 'indigo'],
      });
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, 'inkjet'],
      });
    },
  });
}

// 전역 규격 수정
export function useUpdateGlobalSpecification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGlobalSpecificationDto }) =>
      api.put<Specification>(`/specifications/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, 'global'],
      });
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, 'global', variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, 'indigo'],
      });
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, 'inkjet'],
      });
    },
  });
}

// 전역 규격 삭제
export function useDeleteGlobalSpecification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/specifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, 'global'],
      });
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, 'indigo'],
      });
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, 'inkjet'],
      });
    },
  });
}

// ==================== 제품별 규격 조회 ====================

export function useProductSpecifications(productId: string) {
  return useQuery({
    queryKey: [SPECIFICATIONS_KEY, productId],
    queryFn: () => api.get<ProductSpecification[]>(`/products/${productId}/specifications`),
    enabled: !!productId,
  });
}

export function useProductSpecification(productId: string, specId: string) {
  return useQuery({
    queryKey: [SPECIFICATIONS_KEY, productId, specId],
    queryFn: () => api.get<ProductSpecification>(`/products/${productId}/specifications/${specId}`),
    enabled: !!productId && !!specId,
  });
}

// ==================== 규격 추가 ====================

export function useAddSpecification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: CreateSpecificationDto }) =>
      api.post<ProductSpecification>(`/products/${productId}/specifications`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, variables.productId],
      });
    },
  });
}

// ==================== 규격 수정 ====================

export function useUpdateSpecification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      specId,
      data,
    }: {
      productId: string;
      specId: string;
      data: UpdateSpecificationDto;
    }) => api.put<ProductSpecification>(`/products/${productId}/specifications/${specId}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, variables.productId, variables.specId],
      });
    },
  });
}

// ==================== 규격 삭제 ====================

export function useDeleteSpecification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, specId }: { productId: string; specId: string }) =>
      api.delete(`/products/${productId}/specifications/${specId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SPECIFICATIONS_KEY, variables.productId],
      });
    },
  });
}

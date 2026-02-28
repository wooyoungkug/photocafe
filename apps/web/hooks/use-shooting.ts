'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ==================== 타입 정의 ====================

/** 촬영 유형 */
export type ShootingType =
  | 'wedding'
  | 'studio'
  | 'outdoor'
  | 'product'
  | 'profile'
  | 'event'
  | 'other';

/** 촬영 상태 */
export type ShootingStatus =
  | 'draft'
  | 'published'
  | 'bidding'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export const SHOOTING_STATUS_LABELS: Record<ShootingStatus, string> = {
  draft: '초안',
  published: '공고중',
  bidding: '응찰중',
  confirmed: '확정',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소',
};

export const SHOOTING_TYPE_LABELS: Record<ShootingType, string> = {
  wedding: '웨딩',
  studio: '스튜디오',
  outdoor: '야외',
  product: '제품',
  profile: '프로필',
  event: '행사',
  other: '기타',
};

/** 촬영 일정 */
export interface Shooting {
  id: string;
  title: string;
  type: ShootingType;
  status: ShootingStatus;
  scheduledDate: string;
  scheduledTime?: string;
  estimatedDuration?: number; // 분 단위
  location?: string;
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
  description?: string;
  requirements?: string;
  budget?: number;
  clientId?: string;
  clientName?: string;
  photographerId?: string;
  photographerName?: string;
  bidCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** 촬영 생성 DTO */
export interface CreateShootingDto {
  title: string;
  type: ShootingType;
  scheduledDate: string;
  scheduledTime?: string;
  estimatedDuration?: number;
  location?: string;
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
  description?: string;
  requirements?: string;
  budget?: number;
  clientId?: string;
  clientName?: string;
}

/** 촬영 수정 DTO */
export interface UpdateShootingDto extends Partial<CreateShootingDto> {}

/** 촬영 상태 변경 DTO */
export interface UpdateShootingStatusDto {
  status: ShootingStatus;
  note?: string;
}

/** 촬영 목록 조회 파라미터 */
export interface ShootingListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: ShootingType;
  status?: ShootingStatus;
  startDate?: string;
  endDate?: string;
  clientId?: string;
  photographerId?: string;
  createdBy?: string;
}

/** 페이지네이션 응답 */
export interface PaginatedShootingResponse {
  data: Shooting[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ==================== Query Keys ====================

const SHOOTINGS_KEY = 'shootings';

// ==================== Hooks ====================

/** 촬영 일정 목록 조회 */
export function useShootings(params?: ShootingListParams) {
  return useQuery({
    queryKey: [SHOOTINGS_KEY, params],
    queryFn: () =>
      api.get<PaginatedShootingResponse>(
        '/shootings',
        params as Record<string, string | number | boolean | undefined>,
      ),
  });
}

/** 촬영 일정 상세 조회 */
export function useShooting(id: string) {
  return useQuery({
    queryKey: [SHOOTINGS_KEY, id],
    queryFn: () => api.get<Shooting>(`/shootings/${id}`),
    enabled: !!id,
  });
}

/** 촬영 일정 생성 */
export function useCreateShooting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateShootingDto) =>
      api.post<Shooting>('/shootings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOOTINGS_KEY] });
    },
  });
}

/** 촬영 일정 수정 */
export function useUpdateShooting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShootingDto }) =>
      api.patch<Shooting>(`/shootings/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SHOOTINGS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHOOTINGS_KEY, variables.id] });
    },
  });
}

/** 촬영 일정 삭제 */
export function useDeleteShooting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/shootings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOOTINGS_KEY] });
    },
  });
}

/** 촬영 상태 변경 */
export function useUpdateShootingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateShootingStatusDto) =>
      api.patch<Shooting>(`/shootings/${id}/status`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SHOOTINGS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHOOTINGS_KEY, variables.id] });
    },
  });
}

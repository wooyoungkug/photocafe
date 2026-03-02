'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ShootingType } from '@/lib/constants/shooting-types';

// re-export
export type { ShootingType } from '@/lib/constants/shooting-types';
export { SHOOTING_TYPE_LABELS, SHOOTING_TYPE_COLORS } from '@/lib/constants/shooting-types';

// ==================== 타입 정의 ====================

/** 촬영 상태 (백엔드 shooting.constants.ts 기준) */
export type ShootingStatus =
  | 'draft'
  | 'recruiting'
  | 'bidding'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export const SHOOTING_STATUS_LABELS: Record<ShootingStatus, string> = {
  draft: '초안',
  recruiting: '모집중',
  bidding: '응찰중',
  confirmed: '확정',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소',
};

/** 촬영 일정 (백엔드 ShootingSchedule 모델 기준) */
export interface Shooting {
  id: string;
  scheduleId?: string;
  clientName: string;
  shootingType: ShootingType;
  venueName: string;
  venueAddress: string;
  venueFloor?: string;
  venueHall?: string;
  latitude?: number;
  longitude?: number;
  shootingDate: string;
  duration?: number;
  status: ShootingStatus;
  assignedStaffId?: string;
  assignedStaff?: {
    id: string;
    name: string;
    email?: string;
  };
  assignedClientId?: string;
  assignedClient?: {
    id: string;
    clientName: string;
    email?: string;
  };
  linkedRecruitmentId?: string;
  maxBidders: number;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  createdBy: string;
  creator?: {
    id: string;
    clientName: string;
    contactPerson?: string;
    contactPhone?: string;
    memberType: string;
    mobile?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    bids: number;
  };
}

/** 촬영 생성 DTO (백엔드 CreateShootingDto 기준) */
export interface CreateShootingDto {
  clientName: string;
  shootingType: ShootingType;
  venueName: string;
  venueAddress: string;
  venueFloor?: string;
  venueHall?: string;
  latitude?: number;
  longitude?: number;
  shootingDate: string;
  duration?: number;
  maxBidders?: number;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  // 구인 연동 옵션
  enableRecruitment?: boolean;
  recruitmentClientId?: string;
  recruitmentTitle?: string;
  recruitmentBudget?: number;
  recruitmentDescription?: string;
  recruitmentRequirements?: string;
}

/** 촬영 수정 DTO */
export interface UpdateShootingDto extends Partial<CreateShootingDto> {}

/** 촬영 상태 변경 DTO */
export interface UpdateShootingStatusDto {
  status: ShootingStatus;
  reason?: string;
}

/** 촬영 목록 조회 파라미터 */
export interface ShootingListParams {
  page?: number;
  limit?: number;
  search?: string;
  shootingType?: ShootingType;
  status?: ShootingStatus;
  startDate?: string;
  endDate?: string;
  assignedStaffId?: string;
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

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ==================== 타입 정의 ====================

/** 작가 정보 */
export interface Photographer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  specialties?: string[]; // 전문 분야
  portfolioUrl?: string;
  description?: string;
  reliability: number; // 신뢰도 점수 (0~100)
  totalShootings: number;
  completedShootings: number;
  cancelledShootings: number;
  averageRating?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 작가 통계 */
export interface PhotographerStats {
  photographerId: string;
  totalShootings: number;
  completedShootings: number;
  cancelledShootings: number;
  noShowCount: number;
  averageRating: number;
  totalReviews: number;
  reliability: number;
  recentShootings: {
    id: string;
    title: string;
    scheduledDate: string;
    status: string;
    rating?: number;
  }[];
  monthlyStats: {
    month: string;
    shootingCount: number;
    completedCount: number;
    cancelledCount: number;
    averageRating: number;
  }[];
}

/** 작가 목록 조회 파라미터 */
export interface PhotographerListParams {
  page?: number;
  limit?: number;
  search?: string;
  specialty?: string;
  minReliability?: number;
  isActive?: boolean;
  sortBy?: 'reliability' | 'rating' | 'totalShootings' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/** 페이지네이션 응답 */
export interface PaginatedPhotographerResponse {
  data: Photographer[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ==================== Query Keys ====================

const PHOTOGRAPHERS_KEY = 'photographers';

// ==================== Hooks ====================

/** 작가 목록 조회 (신뢰도 포함) */
export function usePhotographers(params?: PhotographerListParams) {
  return useQuery({
    queryKey: [PHOTOGRAPHERS_KEY, params],
    queryFn: () =>
      api.get<PaginatedPhotographerResponse>(
        '/photographers',
        params as Record<string, string | number | boolean | undefined>,
      ),
  });
}

/** 작가 통계 조회 */
export function usePhotographerStats(id: string) {
  return useQuery({
    queryKey: [PHOTOGRAPHERS_KEY, id, 'stats'],
    queryFn: () => api.get<PhotographerStats>(`/photographers/${id}/stats`),
    enabled: !!id,
  });
}

/** 작가 신뢰도 재계산 */
export function useRecalculateReliability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ reliability: number }>(`/photographers/${id}/recalculate`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [PHOTOGRAPHERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [PHOTOGRAPHERS_KEY, id] });
      queryClient.invalidateQueries({ queryKey: [PHOTOGRAPHERS_KEY, id, 'stats'] });
    },
  });
}

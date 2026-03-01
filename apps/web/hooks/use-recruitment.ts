'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Recruitment,
  CreateRecruitmentInput,
  UpdateRecruitmentInput,
  RecruitmentQueryParams,
} from '@/lib/types/recruitment';

const RECRUITMENT_KEY = 'recruitments';

/** 촬영유형별 평균 예산 조회 */
export function useAverageBudget() {
  return useQuery({
    queryKey: [RECRUITMENT_KEY, 'average-budget'],
    queryFn: () =>
      api.get<Record<string, { avg: number; count: number }>>(
        '/recruitments/stats/average-budget',
      ),
    staleTime: 1000 * 60 * 10, // 10분 캐시
  });
}

export function useRecruitments(params?: RecruitmentQueryParams) {
  return useQuery({
    queryKey: [RECRUITMENT_KEY, params],
    queryFn: () =>
      api.get<{
        data: Recruitment[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>('/recruitments', params as any),
  });
}

export function useRecruitment(id: string | undefined) {
  return useQuery({
    queryKey: [RECRUITMENT_KEY, id],
    queryFn: () => api.get<Recruitment>(`/recruitments/${id}`),
    enabled: !!id,
  });
}

export function useCreateRecruitment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRecruitmentInput) =>
      api.post<Recruitment>('/recruitments', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECRUITMENT_KEY] });
    },
  });
}

export function useUpdateRecruitment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecruitmentInput }) =>
      api.patch<Recruitment>(`/recruitments/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECRUITMENT_KEY] });
    },
  });
}

export function useDeleteRecruitment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/recruitments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECRUITMENT_KEY] });
    },
  });
}

export function usePublishPrivate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      privateDeadlineHours,
    }: {
      id: string;
      privateDeadlineHours?: number;
    }) =>
      api.post(`/recruitments/${id}/publish`, { privateDeadlineHours }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECRUITMENT_KEY] });
    },
  });
}

export function useGoPublic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/recruitments/${id}/go-public`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECRUITMENT_KEY] });
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RecruitmentBid, MyRecruitmentBid, CreateBidInput } from '@/lib/types/recruitment';

const RECRUITMENT_KEY = 'recruitments';

export function useRecruitmentBids(recruitmentId: string | undefined) {
  return useQuery({
    queryKey: [RECRUITMENT_KEY, recruitmentId, 'bids'],
    queryFn: () =>
      api.get<RecruitmentBid[]>(`/recruitments/${recruitmentId}/bids`),
    enabled: !!recruitmentId,
  });
}

export function useCreateBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recruitmentId, data }: { recruitmentId: string; data: CreateBidInput }) =>
      api.post<RecruitmentBid>(`/recruitments/${recruitmentId}/bids`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: [RECRUITMENT_KEY, variables.recruitmentId] });
    },
  });
}

export function useSelectBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      recruitmentId,
      bidId,
    }: {
      recruitmentId: string;
      bidId: string;
    }) => api.post(`/recruitments/${recruitmentId}/bids/${bidId}/select`),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: [RECRUITMENT_KEY] });
    },
  });
}

export function useRejectBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      recruitmentId,
      bidId,
      reason,
    }: {
      recruitmentId: string;
      bidId: string;
      reason?: string;
    }) =>
      api.post(`/recruitments/${recruitmentId}/bids/${bidId}/reject`, { reason }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: [RECRUITMENT_KEY] });
    },
  });
}

export function useMyRecruitmentBids(enabled = true) {
  return useQuery({
    queryKey: [RECRUITMENT_KEY, 'my-bids'],
    queryFn: () => api.get<MyRecruitmentBid[]>('/recruitments/my-bids'),
    enabled,
  });
}

export function useCancelMyBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recruitmentId }: { recruitmentId: string }) =>
      api.delete(`/recruitments/${recruitmentId}/bids/my`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECRUITMENT_KEY] });
    },
  });
}

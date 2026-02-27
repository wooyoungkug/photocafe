'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ==================== 타입 정의 ====================

/** 응찰 상태 */
export type BidStatus = 'pending' | 'selected' | 'rejected' | 'withdrawn';

export const BID_STATUS_LABELS: Record<BidStatus, string> = {
  pending: '대기중',
  selected: '확정',
  rejected: '거절',
  withdrawn: '철회',
};

/** 응찰 정보 */
export interface ShootingBid {
  id: string;
  shootingId: string;
  photographerId: string;
  photographerName: string;
  photographerProfileImage?: string;
  bidAmount: number;
  message?: string;
  portfolioUrls?: string[];
  estimatedDuration?: number;
  status: BidStatus;
  reliability?: number; // 작가 신뢰도 점수
  totalShootings?: number; // 총 촬영 건수
  selectedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** 응찰 생성 DTO */
export interface CreateBidDto {
  bidAmount: number;
  message?: string;
  portfolioUrls?: string[];
  estimatedDuration?: number;
}

/** 공고 발행 DTO */
export interface PublishShootingDto {
  bidDeadline?: string;
  notifyPhotographers?: boolean;
}

// ==================== Query Keys ====================

const SHOOTINGS_KEY = 'shootings';
const BIDS_KEY = 'bids';

// ==================== Hooks ====================

/** 촬영 공고의 응찰자 목록 조회 */
export function useShootingBids(shootingId: string) {
  return useQuery({
    queryKey: [SHOOTINGS_KEY, shootingId, BIDS_KEY],
    queryFn: () => api.get<ShootingBid[]>(`/shootings/${shootingId}/bids`),
    enabled: !!shootingId,
  });
}

/** 촬영 공고 발행 */
export function usePublishShooting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shootingId, ...data }: { shootingId: string } & PublishShootingDto) =>
      api.post(`/shootings/${shootingId}/publish`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SHOOTINGS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHOOTINGS_KEY, variables.shootingId] });
    },
  });
}

/** 응찰 (작가가 촬영에 입찰) */
export function useCreateBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shootingId, ...data }: { shootingId: string } & CreateBidDto) =>
      api.post<ShootingBid>(`/shootings/${shootingId}/bids`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SHOOTINGS_KEY, variables.shootingId, BIDS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHOOTINGS_KEY, variables.shootingId] });
    },
  });
}

/** 작가 확정 (응찰 선택) */
export function useSelectBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shootingId, bidId }: { shootingId: string; bidId: string }) =>
      api.post(`/shootings/${shootingId}/bids/${bidId}/select`, {}),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SHOOTINGS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHOOTINGS_KEY, variables.shootingId] });
      queryClient.invalidateQueries({ queryKey: [SHOOTINGS_KEY, variables.shootingId, BIDS_KEY] });
    },
  });
}

/** 작가 거절 (응찰 거절) */
export function useRejectBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shootingId,
      bidId,
      reason,
    }: {
      shootingId: string;
      bidId: string;
      reason?: string;
    }) =>
      api.post(`/shootings/${shootingId}/bids/${bidId}/reject`, { reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SHOOTINGS_KEY, variables.shootingId, BIDS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHOOTINGS_KEY, variables.shootingId] });
    },
  });
}

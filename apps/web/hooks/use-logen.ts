'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LogenStatus {
  configured: boolean;
  env: string;
  userId: string;
}

export interface LogenTrackingResult {
  success: boolean;
  trackingNumber: string;
  alreadyExists?: boolean;
  message?: string;
}

export interface LogenBulkResult {
  results: Array<{
    orderId: string;
    orderNumber?: string;
    trackingNumber?: string;
    success: boolean;
    error?: string;
  }>;
  total: number;
  successCount: number;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

const LOGEN_KEY = 'logen';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** 로젠택배 API 연동 상태 조회 */
export function useLogenStatus() {
  return useQuery({
    queryKey: [LOGEN_KEY, 'status'],
    queryFn: () => api.get<LogenStatus>('/delivery/logen/status'),
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** 단건 송장 자동 발급 */
export function useGenerateLogenTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) =>
      api.post<LogenTrackingResult>('/delivery/logen/generate-tracking', {
        orderId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping', 'ready'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/** 복수건 송장 일괄 자동 발급 */
export function useBulkLogenTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderIds: string[]) =>
      api.post<LogenBulkResult>('/delivery/logen/generate-tracking/bulk', {
        orderIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping', 'ready'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

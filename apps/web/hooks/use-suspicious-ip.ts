import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SuspiciousIp {
  id: string;
  ip: string;
  reason: string | null;
  action: string; // 'block' | 'monitor'
  country: string | null;
  city: string | null;
  isKorea: boolean;
  visitCount: number;
  memo: string | null;
  isActive: boolean;
  blockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSuspiciousIpPayload {
  ip: string;
  reason?: string;
  action?: 'block' | 'monitor';
  memo?: string;
  visitCount?: number;
}

export interface UpdateSuspiciousIpPayload {
  action?: 'block' | 'monitor';
  reason?: string;
  memo?: string;
  isActive?: boolean;
}

const QUERY_KEY = ['suspicious-ips'];

export function useSuspiciousIps(action?: string, search?: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, action, search],
    queryFn: () =>
      api.get<SuspiciousIp[]>('/analytics/suspicious-ips', {
        ...(action ? { action } : {}),
        ...(search ? { search } : {}),
      }),
    staleTime: 60 * 1000,
  });
}

export function useCreateSuspiciousIp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSuspiciousIpPayload) =>
      api.post<SuspiciousIp>('/analytics/suspicious-ips', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'ip-stats'] });
    },
    onError: (error: Error) => {
      console.error('[의심 IP 등록 실패]', error.message);
    },
  });
}

export function useUpdateSuspiciousIp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSuspiciousIpPayload }) =>
      api.patch<SuspiciousIp>(`/analytics/suspicious-ips/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'ip-stats'] });
    },
    onError: (error: Error) => {
      console.error('[의심 IP 수정 실패]', error.message);
    },
  });
}

export function useDeleteSuspiciousIp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/analytics/suspicious-ips/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'ip-stats'] });
    },
    onError: (error: Error) => {
      console.error('[의심 IP 삭제 실패]', error.message);
    },
  });
}

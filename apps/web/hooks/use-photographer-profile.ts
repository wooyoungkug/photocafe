'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PhotographerProfile, NotificationLogResponse } from '@/lib/types/recruitment';

const PROFILE_KEY = 'photographer-profile';
const REGIONS_KEY = 'korean-regions';
const NOTIFICATIONS_KEY = 'recruitment-notifications';

export function usePhotographerProfile() {
  return useQuery({
    queryKey: [PROFILE_KEY],
    queryFn: () => api.get<PhotographerProfile>('/photographer-profile'),
  });
}

export function useUpsertPhotographerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PhotographerProfile>) =>
      api.put<PhotographerProfile>('/photographer-profile', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROFILE_KEY] });
    },
  });
}

export function useKoreanRegions() {
  return useQuery({
    queryKey: [REGIONS_KEY],
    queryFn: () =>
      api.get<{ provinces: string[]; regions: Record<string, string[]> }>(
        '/photographer-profile/regions'
      ),
  });
}

export function useRecruitmentNotifications(id: string | undefined) {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, id],
    queryFn: () =>
      api.get<NotificationLogResponse>(`/recruitments/${id}/notifications`),
    enabled: !!id,
  });
}

export function useResendNotifications(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/recruitments/${id}/resend`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY, id] });
    },
  });
}

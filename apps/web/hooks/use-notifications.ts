'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api';

// 알림 타입
export type NotificationType =
  | 'order_edit'
  | 'reprint_request'
  | 'print_operator_assigned'
  | 'order_status_changed'
  | string;

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown> | null;
  link?: string | null;
  readAt?: string | null;
  channel?: string;
  createdAt: string;
}

export interface NotificationsPage {
  items: Notification[];
  nextCursor: string | null;
}

export interface UnreadCountResponse {
  count: number;
}

// Query Keys
export const NOTIFICATIONS_KEY = 'notifications';

// 알림 목록 조회 (cursor pagination)
export function useNotifications(opts?: {
  unreadOnly?: boolean;
  limit?: number;
  enabled?: boolean;
}) {
  const { unreadOnly, limit = 20, enabled = true } = opts ?? {};

  return useInfiniteQuery<NotificationsPage>({
    queryKey: [NOTIFICATIONS_KEY, 'list', { unreadOnly, limit }],
    queryFn: ({ pageParam }) =>
      api.get<NotificationsPage>('/notifications/me', {
        unreadOnly,
        limit,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

// 미확인 알림 수 조회 (30초 폴링 + 포커스 리프레시)
export function useUnreadCount() {
  return useQuery<UnreadCountResponse>({
    queryKey: [NOTIFICATIONS_KEY, 'unread-count'],
    queryFn: () =>
      api.get<UnreadCountResponse>('/notifications/me/unread-count'),
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

// 알림 읽음 처리
export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.patch<{ ok: true }>(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}

// 모두 읽음 처리
export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<{ updated: number }>('/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}

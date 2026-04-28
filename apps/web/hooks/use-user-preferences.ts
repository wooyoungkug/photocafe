'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export type LayoutMode = 'top' | 'side';

export interface UserPreferences {
  pinnedMenus: string[];
  layoutMode: LayoutMode;
}

const QUERY_KEY = ['me', 'preferences'] as const;

const DEFAULT_PREFERENCES: UserPreferences = {
  pinnedMenus: [],
  layoutMode: 'top',
};

/**
 * UI 환경설정 (핀 메뉴 / 레이아웃 모드) 조회
 *
 * staff 로그인 상태에서만 서버를 조회하고, 그 외엔 기본값을 반환합니다.
 */
export function useUserPreferences() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isStaff = isAuthenticated && (user?.role === 'admin' || user?.role === 'staff');

  return useQuery<UserPreferences>({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<UserPreferences>('/auth/me/preferences'),
    enabled: !!isStaff,
    staleTime: 1000 * 60 * 5,
    placeholderData: DEFAULT_PREFERENCES,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: Partial<UserPreferences>) =>
      api.patch<UserPreferences>('/auth/me/preferences', dto),
    onMutate: async (dto) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<UserPreferences>(QUERY_KEY);
      if (previous) {
        queryClient.setQueryData<UserPreferences>(QUERY_KEY, {
          ...previous,
          ...dto,
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(QUERY_KEY, ctx.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
    },
  });
}

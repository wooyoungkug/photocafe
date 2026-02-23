'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ==================== 타입 정의 ====================

export interface ToolUsageStats {
  accessCount: number;
  useCount: number;
}

type ToolUsageMap = Record<string, ToolUsageStats>;

// ==================== 훅 ====================

/**
 * 여러 도구의 사용 통계를 한 번에 조회
 */
export function useToolUsageBulk(toolIds: string[]) {
  return useQuery<ToolUsageMap>({
    queryKey: ['tool-usage', toolIds.sort().join(',')],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/tool-usage?toolIds=${toolIds.join(',')}`
      );
      if (!res.ok) throw new Error('도구 사용 통계를 가져올 수 없습니다.');
      return res.json();
    },
    staleTime: 30_000,
    enabled: toolIds.length > 0,
  });
}

/**
 * 단일 도구의 사용 통계 훅
 *
 * - `stats`: 접속/사용 카운트
 * - `trackAccess()`: 접속 카운트 +1 (컴포넌트 마운트 시 1회)
 * - `trackUse()`: 사용 카운트 +1 (도구 실행 시)
 */
export function useToolUsage(toolId: string) {
  const queryClient = useQueryClient();

  const { data } = useQuery<ToolUsageStats>({
    queryKey: ['tool-usage', toolId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/tool-usage?toolIds=${toolId}`
      );
      if (!res.ok) throw new Error('도구 사용 통계를 가져올 수 없습니다.');
      const map: ToolUsageMap = await res.json();
      return map[toolId] || { accessCount: 0, useCount: 0 };
    },
    staleTime: 30_000,
  });

  // 접속 카운트 증가 (컴포넌트 마운트 시 1회 호출)
  const accessMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/tool-usage/${toolId}/access`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('접속 카운트 증가에 실패했습니다.');
      return res.json() as Promise<ToolUsageStats>;
    },
    onSuccess: (updatedStats) => {
      queryClient.setQueryData(['tool-usage', toolId], updatedStats);
    },
  });

  // 사용 카운트 증가 (도구 실행 시 호출)
  const usageMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/tool-usage/${toolId}/use`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('사용 카운트 증가에 실패했습니다.');
      return res.json() as Promise<ToolUsageStats>;
    },
    onSuccess: (updatedStats) => {
      queryClient.setQueryData(['tool-usage', toolId], updatedStats);
    },
  });

  return {
    stats: data || { accessCount: 0, useCount: 0 },
    trackAccess: () => accessMutation.mutate(),
    trackUse: () => usageMutation.mutate(),
  };
}

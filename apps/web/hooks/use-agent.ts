'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AgentToken {
  id: string;
  name: string;
  tokenPrefix: string;
  machineName: string | null;
  lastHeartbeatAt: string | null;
  lastIp: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentTokenResponse extends AgentToken {
  /** 평문 토큰 — 응답 시점 1회만 노출 */
  token: string;
}

const AGENT_TOKENS_KEY = ['agent-tokens'] as const;

export function useAgentTokens() {
  return useQuery<AgentToken[]>({
    queryKey: AGENT_TOKENS_KEY,
    queryFn: () => api.get<AgentToken[]>('/agent-tokens'),
    refetchInterval: 15_000, // heartbeat 변화 빠르게 반영
  });
}

export function useCreateAgentToken() {
  const qc = useQueryClient();
  return useMutation<CreateAgentTokenResponse, Error, { name: string }>({
    mutationFn: (input) =>
      api.post<CreateAgentTokenResponse>('/agent-tokens', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AGENT_TOKENS_KEY });
    },
  });
}

export function useDeactivateAgentToken() {
  const qc = useQueryClient();
  return useMutation<AgentToken, Error, string>({
    mutationFn: (id) => api.delete<AgentToken>(`/agent-tokens/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AGENT_TOKENS_KEY });
    },
  });
}

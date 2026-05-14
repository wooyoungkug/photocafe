'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ChatMessage {
  id: string;
  bidId: string;
  senderId: string;
  senderName: string;
  senderRole: 'studio' | 'photographer';
  content: string;
  createdAt: string;
}

const CHAT_KEY = 'chat-messages';
const LS_PREFIX = 'chat_last_read_';

// localStorage에 마지막 읽은 시각 저장/조회
export function markChatRead(bidId: string, messages: ChatMessage[]) {
  if (typeof window === 'undefined' || !messages.length) return;
  const latest = messages[messages.length - 1];
  localStorage.setItem(`${LS_PREFIX}${bidId}`, latest.createdAt);
}

function getLastRead(bidId: string): Date | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(`${LS_PREFIX}${bidId}`);
  return stored ? new Date(stored) : null;
}

/**
 * 채팅 메시지 조회
 * @param bidId - null이면 비활성
 * @param refetchInterval - 기본 3000ms (패널 열릴 때), 백그라운드용은 느리게
 */
export function useChatMessages(bidId: string | null, refetchInterval = 3000) {
  return useQuery({
    queryKey: [CHAT_KEY, bidId],
    queryFn: () =>
      api.get<ChatMessage[]>(`/recruitment/bids/${bidId}/messages`),
    enabled: !!bidId,
    refetchInterval,
    refetchIntervalInBackground: false,
  });
}

/**
 * 안 읽은 메시지 존재 여부 (채팅 버튼 깜박거림용)
 * - 패널 닫혀 있어도 백그라운드에서 10초마다 폴링
 * - 상대방 메시지 중 lastRead 이후 것이 있으면 true
 */
export function useChatUnread(bidId: string | null, myClientId: string): boolean {
  const { data: messages } = useChatMessages(bidId, 10000);

  return useMemo(() => {
    if (!messages?.length || !bidId) return false;
    const lastRead = getLastRead(bidId);
    return messages.some(
      (m) =>
        m.senderId !== myClientId &&
        (!lastRead || new Date(m.createdAt) > lastRead),
    );
  }, [messages, bidId, myClientId]);
}

/**
 * 채팅 메시지 전송
 */
export function useSendChatMessage(bidId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      api.post<ChatMessage>(`/recruitment/bids/${bidId}/messages`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CHAT_KEY, bidId] });
    },
  });
}

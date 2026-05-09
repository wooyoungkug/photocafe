'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type NoteAiAction = 'summarize' | 'proofread' | 'suggest-title' | 'to-bullets';

export interface NoteAiAssistRequest {
  action: NoteAiAction;
  noteId?: string;
  title?: string;
  content: string;
  contentFormat?: 'html' | 'text';
}

export interface NoteAiAssistResponse {
  action: NoteAiAction;
  result: string | string[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  daily: number;
  dailyLimit: number;
}

export function useNoteAiStatus() {
  return useQuery({
    queryKey: ['note-ai-status'],
    queryFn: () => api.get<{ enabled: boolean }>('/notes/ai/status'),
    staleTime: 60_000,
  });
}

export function useNoteAiAssist() {
  return useMutation({
    mutationFn: (payload: NoteAiAssistRequest) =>
      api.post<NoteAiAssistResponse>('/notes/ai-assist', payload, { timeout: 60000 }),
  });
}

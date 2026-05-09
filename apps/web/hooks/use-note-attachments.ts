'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, API_URL } from '@/lib/api';
import type { NoteAttachment } from '@/lib/types/schedule';

const ATT_KEY = 'note-attachments';

export function useNoteAttachments(memoId: string | null) {
  return useQuery({
    queryKey: [ATT_KEY, memoId],
    queryFn: () => api.get<NoteAttachment[]>(`/memos/${memoId}/attachments`),
    enabled: !!memoId,
  });
}

export function useUploadNoteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memoId, file }: { memoId: string; file: File }) => {
      const fd = new FormData();
      fd.append('file', file);
      let impersonateAuth: Record<string, string> = {};
      if (typeof window !== 'undefined') {
        try {
          const isImpersonateTab = !!sessionStorage.getItem('impersonate-session');
          if (isImpersonateTab) {
            const raw = sessionStorage.getItem('impersonate-tokens');
            if (raw) {
              const tokens = JSON.parse(raw);
              if (tokens?.accessToken) {
                impersonateAuth = { Authorization: `Bearer ${tokens.accessToken}` };
              }
            }
          }
        } catch {}
      }
      const res = await fetch(`${API_URL}/memos/${memoId}/attachments`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
        headers: impersonateAuth,
      });
      if (!res.ok) {
        let msg = '업로드 실패';
        try {
          const data = await res.json();
          msg = data?.message || msg;
        } catch {}
        throw new Error(msg);
      }
      return (await res.json()) as NoteAttachment;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [ATT_KEY, vars.memoId] });
      qc.invalidateQueries({ queryKey: ['memos'] });
    },
  });
}

export function useDeleteNoteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; memoId: string }) =>
      api.delete(`/attachments/${id}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [ATT_KEY, vars.memoId] });
      qc.invalidateQueries({ queryKey: ['memos'] });
    },
  });
}

export async function fetchFreshAttachmentUrl(id: string): Promise<string> {
  const data = await api.get<{ url: string }>(`/attachments/${id}/url`);
  return data.url;
}

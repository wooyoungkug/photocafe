'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { NoteTagDto } from '@/lib/types/schedule';

export type NoteTagWithCount = NoteTagDto & {
  _count?: { memos: number };
};

const TAGS_KEY = 'note-tags';

export interface CreateNoteTagDto {
  name: string;
  color?: string;
}

export interface UpdateNoteTagDto extends Partial<CreateNoteTagDto> {}

export function useNoteTags() {
  return useQuery({
    queryKey: [TAGS_KEY],
    queryFn: () => api.get<NoteTagWithCount[]>('/note-tags'),
  });
}

export function useCreateNoteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNoteTagDto) => api.post<NoteTagWithCount>('/note-tags', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TAGS_KEY] }),
  });
}

export function useUpdateNoteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNoteTagDto }) =>
      api.put<NoteTagWithCount>(`/note-tags/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TAGS_KEY] });
      qc.invalidateQueries({ queryKey: ['memos'] });
    },
  });
}

export function useDeleteNoteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/note-tags/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TAGS_KEY] });
      qc.invalidateQueries({ queryKey: ['memos'] });
    },
  });
}

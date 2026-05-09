'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Note,
  CreateNoteDto,
  UpdateNoteDto,
  QueryNoteDto,
  Notebook,
  CreateNotebookDto,
  UpdateNotebookDto,
  NoteTag,
  CreateNoteTagDto,
  UpdateNoteTagDto,
} from '@/lib/types/note';

const NOTES_KEY = 'notes';
const NOTEBOOKS_KEY = 'notebooks';
const NOTE_TAGS_KEY = 'note-tags';

// =============================================================================
// Note (노트장)
// =============================================================================

export function useNotes(query?: QueryNoteDto) {
  return useQuery({
    queryKey: [NOTES_KEY, query],
    queryFn: () => {
      const params = new URLSearchParams();
      if (query?.scope) params.append('scope', query.scope);
      if (query?.search) params.append('search', query.search);
      if (query?.notebookId) params.append('notebookId', query.notebookId);
      if (query?.tagId) params.append('tagId', query.tagId);
      const qs = params.toString();
      return api.get<Note[]>(`/notes${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useNoteDetail(id: string) {
  return useQuery({
    queryKey: [NOTES_KEY, id],
    queryFn: () => api.get<Note>(`/notes/${id}`),
    enabled: !!id,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateNoteDto) => api.post<Note>('/notes', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateNoteDto & { id: string }) =>
      api.put<Note>(`/notes/${id}`, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: [NOTES_KEY, variables.id] });
      }
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] });
    },
  });
}

// =============================================================================
// Notebook (노트 분류 폴더)
// =============================================================================

export function useNotebooks() {
  return useQuery({
    queryKey: [NOTEBOOKS_KEY],
    queryFn: () => api.get<Notebook[]>('/notebooks'),
  });
}

export function useCreateNotebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateNotebookDto) => api.post<Notebook>('/notebooks', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [NOTEBOOKS_KEY] }),
  });
}

export function useUpdateNotebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateNotebookDto & { id: string }) =>
      api.put<Notebook>(`/notebooks/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [NOTEBOOKS_KEY] }),
  });
}

export function useDeleteNotebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notebooks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [NOTEBOOKS_KEY] }),
  });
}

// =============================================================================
// NoteTag (노트 태그)
// =============================================================================

export function useNoteTags() {
  return useQuery({
    queryKey: [NOTE_TAGS_KEY],
    queryFn: () => api.get<NoteTag[]>('/note-tags'),
  });
}

export function useCreateNoteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateNoteTagDto) => api.post<NoteTag>('/note-tags', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [NOTE_TAGS_KEY] }),
  });
}

export function useUpdateNoteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateNoteTagDto & { id: string }) =>
      api.put<NoteTag>(`/note-tags/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [NOTE_TAGS_KEY] }),
  });
}

export function useDeleteNoteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/note-tags/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTE_TAGS_KEY] });
      qc.invalidateQueries({ queryKey: [NOTES_KEY] });
    },
  });
}

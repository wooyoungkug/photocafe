'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Notebook } from '@/lib/types/schedule';

export type NotebookWithCounts = Notebook & {
  _count?: { memos: number; children: number };
};

export interface NotebookTreeNode extends NotebookWithCounts {
  children: NotebookTreeNode[];
}

export interface CreateNotebookDto {
  name: string;
  color?: string;
  icon?: string;
  parentId?: string | null;
  scope?: 'personal' | 'department' | 'all';
  sortOrder?: number;
}

export interface UpdateNotebookDto extends Partial<CreateNotebookDto> {}

const NOTEBOOKS_KEY = 'notebooks';

export function useNotebooks() {
  return useQuery({
    queryKey: [NOTEBOOKS_KEY],
    queryFn: () => api.get<NotebookWithCounts[]>('/notebooks'),
  });
}

export function useNotebookTree() {
  const { data, ...rest } = useNotebooks();
  const tree = useMemo<NotebookTreeNode[]>(() => {
    if (!data) return [];
    const map = new Map<string, NotebookTreeNode>();
    data.forEach((n) => map.set(n.id, { ...n, children: [] }));
    const roots: NotebookTreeNode[] = [];
    data.forEach((n) => {
      const node = map.get(n.id)!;
      if (n.parentId && map.has(n.parentId)) {
        map.get(n.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    const sortRec = (arr: NotebookTreeNode[]) => {
      arr.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      arr.forEach((n) => sortRec(n.children));
    };
    sortRec(roots);
    return roots;
  }, [data]);
  return { ...rest, data: tree, flat: data };
}

export function useCreateNotebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNotebookDto) => api.post<NotebookWithCounts>('/notebooks', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTEBOOKS_KEY] });
    },
  });
}

export function useUpdateNotebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNotebookDto }) =>
      api.put<NotebookWithCounts>(`/notebooks/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTEBOOKS_KEY] });
    },
  });
}

export function useDeleteNotebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notebooks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTEBOOKS_KEY] });
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface RecruitmentTemplate {
  id: string;
  clientId: string;
  category: 'description' | 'requirements';
  title: string;
  content: string;
  sortOrder: number;
  createdAt: string;
}

const TEMPLATE_KEY = 'recruitment-templates';

export function useRecruitmentTemplates(category?: string) {
  return useQuery({
    queryKey: [TEMPLATE_KEY, category],
    queryFn: () =>
      api.get<RecruitmentTemplate[]>('/recruitment-templates', {
        ...(category ? { category } : {}),
      }),
  });
}

export function useCreateRecruitmentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { category: string; title: string; content: string }) =>
      api.post<RecruitmentTemplate>('/recruitment-templates', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATE_KEY] });
    },
  });
}

export function useDeleteRecruitmentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/recruitment-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATE_KEY] });
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ColorIntent,
  CreateColorIntentInput,
  UpdateColorIntentInput,
  BindingIntent,
  CreateBindingIntentInput,
  UpdateBindingIntentInput,
  FoldingIntent,
  CreateFoldingIntentInput,
  UpdateFoldingIntentInput,
  ProofingIntent,
  CreateProofingIntentInput,
  UpdateProofingIntentInput,
  FileSpec,
  CreateFileSpecInput,
  UpdateFileSpecInput,
  QualityControl,
  CreateQualityControlInput,
  UpdateQualityControlInput,
  JdfIntentsResponse,
} from '@/lib/types/jdf';
import { toast } from 'sonner';

// ==================== 전체 JDF Intent 조회 ====================
export function useJdfIntents() {
  return useQuery<JdfIntentsResponse>({
    queryKey: ['jdf-intents'],
    queryFn: async () => {
      const data = await api.get<JdfIntentsResponse>('/jdf');
      return data;
    },
  });
}

// ==================== ColorIntent ====================
export function useColorIntents(includeInactive = false) {
  return useQuery<ColorIntent[]>({
    queryKey: ['color-intents', includeInactive],
    queryFn: async () => {
      const data = await api.get<ColorIntent[]>('/jdf/color-intents', { includeInactive });
      return data ?? [];
    },
  });
}

export function useColorIntent(id: string) {
  return useQuery<ColorIntent>({
    queryKey: ['color-intent', id],
    queryFn: async () => {
      const data = await api.get<ColorIntent>(`/jdf/color-intents/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateColorIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateColorIntentInput) => {
      return api.post<ColorIntent>('/jdf/color-intents', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['color-intents'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('색상 의도가 생성되었습니다');
    },
    onError: () => {
      toast.error('색상 의도 생성에 실패했습니다');
    },
  });
}

export function useUpdateColorIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateColorIntentInput }) => {
      return api.put<ColorIntent>(`/jdf/color-intents/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['color-intents'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('색상 의도가 수정되었습니다');
    },
    onError: () => {
      toast.error('색상 의도 수정에 실패했습니다');
    },
  });
}

export function useDeleteColorIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete<void>(`/jdf/color-intents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['color-intents'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('색상 의도가 삭제되었습니다');
    },
    onError: () => {
      toast.error('색상 의도 삭제에 실패했습니다');
    },
  });
}

// ==================== BindingIntent ====================
export function useBindingIntents(includeInactive = false) {
  return useQuery<BindingIntent[]>({
    queryKey: ['binding-intents', includeInactive],
    queryFn: async () => {
      const data = await api.get<BindingIntent[]>('/jdf/binding-intents', { includeInactive });
      return data ?? [];
    },
  });
}

export function useBindingIntent(id: string) {
  return useQuery<BindingIntent>({
    queryKey: ['binding-intent', id],
    queryFn: async () => {
      const data = await api.get<BindingIntent>(`/jdf/binding-intents/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateBindingIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBindingIntentInput) => {
      return api.post<BindingIntent>('/jdf/binding-intents', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['binding-intents'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('제본 의도가 생성되었습니다');
    },
    onError: () => {
      toast.error('제본 의도 생성에 실패했습니다');
    },
  });
}

export function useUpdateBindingIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBindingIntentInput }) => {
      return api.put<BindingIntent>(`/jdf/binding-intents/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['binding-intents'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('제본 의도가 수정되었습니다');
    },
    onError: () => {
      toast.error('제본 의도 수정에 실패했습니다');
    },
  });
}

export function useDeleteBindingIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete<void>(`/jdf/binding-intents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['binding-intents'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('제본 의도가 삭제되었습니다');
    },
    onError: () => {
      toast.error('제본 의도 삭제에 실패했습니다');
    },
  });
}

// ==================== FoldingIntent ====================
export function useFoldingIntents(includeInactive = false) {
  return useQuery<FoldingIntent[]>({
    queryKey: ['folding-intents', includeInactive],
    queryFn: async () => {
      const data = await api.get<FoldingIntent[]>('/jdf/folding-intents', { includeInactive });
      return data ?? [];
    },
  });
}

export function useFoldingIntent(id: string) {
  return useQuery<FoldingIntent>({
    queryKey: ['folding-intent', id],
    queryFn: async () => {
      const data = await api.get<FoldingIntent>(`/jdf/folding-intents/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateFoldingIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFoldingIntentInput) => {
      return api.post<FoldingIntent>('/jdf/folding-intents', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folding-intents'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('접지 의도가 생성되었습니다');
    },
    onError: () => {
      toast.error('접지 의도 생성에 실패했습니다');
    },
  });
}

export function useUpdateFoldingIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFoldingIntentInput }) => {
      return api.put<FoldingIntent>(`/jdf/folding-intents/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folding-intents'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('접지 의도가 수정되었습니다');
    },
    onError: () => {
      toast.error('접지 의도 수정에 실패했습니다');
    },
  });
}

export function useDeleteFoldingIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete<void>(`/jdf/folding-intents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folding-intents'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('접지 의도가 삭제되었습니다');
    },
    onError: () => {
      toast.error('접지 의도 삭제에 실패했습니다');
    },
  });
}

// ==================== ProofingIntent ====================
export function useProofingIntents(includeInactive = false) {
  return useQuery<ProofingIntent[]>({
    queryKey: ['proofing-intents', includeInactive],
    queryFn: async () => {
      const data = await api.get<ProofingIntent[]>('/jdf/proofing-intents', { includeInactive });
      return data ?? [];
    },
  });
}

export function useProofingIntent(id: string) {
  return useQuery<ProofingIntent>({
    queryKey: ['proofing-intent', id],
    queryFn: async () => {
      const data = await api.get<ProofingIntent>(`/jdf/proofing-intents/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProofingIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProofingIntentInput) => {
      return api.post<ProofingIntent>('/jdf/proofing-intents', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofing-intents'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('교정 의도가 생성되었습니다');
    },
    onError: () => {
      toast.error('교정 의도 생성에 실패했습니다');
    },
  });
}

export function useUpdateProofingIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProofingIntentInput }) => {
      return api.put<ProofingIntent>(`/jdf/proofing-intents/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofing-intents'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('교정 의도가 수정되었습니다');
    },
    onError: () => {
      toast.error('교정 의도 수정에 실패했습니다');
    },
  });
}

export function useDeleteProofingIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete<void>(`/jdf/proofing-intents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proofing-intents'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('교정 의도가 삭제되었습니다');
    },
    onError: () => {
      toast.error('교정 의도 삭제에 실패했습니다');
    },
  });
}

// ==================== FileSpec ====================
export function useFileSpecs(includeInactive = false) {
  return useQuery<FileSpec[]>({
    queryKey: ['file-specs', includeInactive],
    queryFn: async () => {
      const data = await api.get<FileSpec[]>('/jdf/file-specs', { includeInactive });
      return data ?? [];
    },
  });
}

export function useFileSpec(id: string) {
  return useQuery<FileSpec>({
    queryKey: ['file-spec', id],
    queryFn: async () => {
      const data = await api.get<FileSpec>(`/jdf/file-specs/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateFileSpec() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFileSpecInput) => {
      return api.post<FileSpec>('/jdf/file-specs', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-specs'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('파일 규격이 생성되었습니다');
    },
    onError: () => {
      toast.error('파일 규격 생성에 실패했습니다');
    },
  });
}

export function useUpdateFileSpec() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFileSpecInput }) => {
      return api.put<FileSpec>(`/jdf/file-specs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-specs'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('파일 규격이 수정되었습니다');
    },
    onError: () => {
      toast.error('파일 규격 수정에 실패했습니다');
    },
  });
}

export function useDeleteFileSpec() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete<void>(`/jdf/file-specs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-specs'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('파일 규격이 삭제되었습니다');
    },
    onError: () => {
      toast.error('파일 규격 삭제에 실패했습니다');
    },
  });
}

// ==================== QualityControl ====================
export function useQualityControls(includeInactive = false) {
  return useQuery<QualityControl[]>({
    queryKey: ['quality-controls', includeInactive],
    queryFn: async () => {
      const data = await api.get<QualityControl[]>('/jdf/quality-controls', { includeInactive });
      return data ?? [];
    },
  });
}

export function useQualityControl(id: string) {
  return useQuery<QualityControl>({
    queryKey: ['quality-control', id],
    queryFn: async () => {
      const data = await api.get<QualityControl>(`/jdf/quality-controls/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateQualityControl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateQualityControlInput) => {
      return api.post<QualityControl>('/jdf/quality-controls', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-controls'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('품질 기준이 생성되었습니다');
    },
    onError: () => {
      toast.error('품질 기준 생성에 실패했습니다');
    },
  });
}

export function useUpdateQualityControl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateQualityControlInput }) => {
      return api.put<QualityControl>(`/jdf/quality-controls/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-controls'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('품질 기준이 수정되었습니다');
    },
    onError: () => {
      toast.error('품질 기준 수정에 실패했습니다');
    },
  });
}

export function useDeleteQualityControl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete<void>(`/jdf/quality-controls/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-controls'] });
      queryClient.invalidateQueries({ queryKey: ['jdf-intents'] });
      toast.success('품질 기준이 삭제되었습니다');
    },
    onError: () => {
      toast.error('품질 기준 삭제에 실패했습니다');
    },
  });
}

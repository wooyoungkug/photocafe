import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Consultation,
  ConsultationCategory,
  ConsultationQueryParams,
  ConsultationStats,
  CreateConsultationDto,
  UpdateConsultationDto,
  CreateConsultationCategoryDto,
  UpdateConsultationCategoryDto,
  CreateFollowUpDto,
  ConsultationStatus,
} from '@/lib/types/consultation';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ==================== 상담 목록/상세 ====================

export function useConsultations(params?: ConsultationQueryParams) {
  return useQuery<PaginatedResponse<Consultation>>({
    queryKey: ['consultations', params],
    queryFn: () => api.get<PaginatedResponse<Consultation>>('/consultations', params as Record<string, string | number | boolean | undefined>),
  });
}

export function useConsultation(id: string) {
  return useQuery<Consultation>({
    queryKey: ['consultation', id],
    queryFn: () => api.get<Consultation>(`/consultations/${id}`),
    enabled: !!id,
  });
}

export function useClientConsultations(clientId: string, limit = 10) {
  return useQuery<Consultation[]>({
    queryKey: ['clientConsultations', clientId, limit],
    queryFn: () => api.get<Consultation[]>(`/consultations/client/${clientId}`, { limit }),
    enabled: !!clientId,
  });
}

export function useConsultationStats(startDate?: string, endDate?: string) {
  return useQuery<ConsultationStats>({
    queryKey: ['consultationStats', startDate, endDate],
    queryFn: () => api.get<ConsultationStats>('/consultations/stats', { startDate, endDate }),
  });
}

// ==================== 상담 CRUD ====================

export function useCreateConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateConsultationDto) => api.post<Consultation>('/consultations', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['clientConsultations'] });
      queryClient.invalidateQueries({ queryKey: ['consultationStats'] });
    },
  });
}

export function useUpdateConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConsultationDto }) =>
      api.put<Consultation>(`/consultations/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['consultation', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['clientConsultations'] });
    },
  });
}

export function useUpdateConsultationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ConsultationStatus }) =>
      api.patch<Consultation>(`/consultations/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['consultation', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['consultationStats'] });
    },
  });
}

export function useResolveConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, resolution, resolvedBy }: { id: string; resolution: string; resolvedBy: string }) =>
      api.patch<Consultation>(`/consultations/${id}/resolve`, { resolution, resolvedBy }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['consultation', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['consultationStats'] });
    },
  });
}

export function useDeleteConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/consultations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['clientConsultations'] });
      queryClient.invalidateQueries({ queryKey: ['consultationStats'] });
    },
  });
}

// ==================== 후속 조치 ====================

export function useAddFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ consultationId, data }: { consultationId: string; data: CreateFollowUpDto }) =>
      api.post(`/consultations/${consultationId}/follow-up`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultation', variables.consultationId] });
    },
  });
}

// ==================== 상담 분류 ====================

export function useConsultationCategories(includeInactive = false) {
  return useQuery<ConsultationCategory[]>({
    queryKey: ['consultationCategories', includeInactive],
    queryFn: () => api.get<ConsultationCategory[]>('/consultation-categories', { includeInactive }),
  });
}

export function useConsultationCategory(id: string) {
  return useQuery<ConsultationCategory>({
    queryKey: ['consultationCategory', id],
    queryFn: () => api.get<ConsultationCategory>(`/consultation-categories/${id}`),
    enabled: !!id,
  });
}

export function useCreateConsultationCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateConsultationCategoryDto) =>
      api.post<ConsultationCategory>('/consultation-categories', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultationCategories'] });
    },
  });
}

export function useUpdateConsultationCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConsultationCategoryDto }) =>
      api.put<ConsultationCategory>(`/consultation-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultationCategories'] });
    },
  });
}

export function useDeleteConsultationCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/consultation-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultationCategories'] });
    },
  });
}

export function useInitializeConsultationCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<ConsultationCategory[]>('/consultation-categories/initialize'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultationCategories'] });
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Consultation,
  ConsultationCategory,
  ConsultationTag,
  ConsultationTagMapping,
  ConsultationAlert,
  ConsultationSLA,
  CustomerHealthScore,
  ConsultationGuide,
  ConsultationQueryParams,
  AlertQueryParams,
  ClientTimelineQueryParams,
  CreateConsultationDto,
  UpdateConsultationDto,
  CreateFollowUpDto,
  CreateTagDto,
  UpdateTagDto,
  CreateAlertDto,
  ResolveAlertDto,
  CreateSLADto,
  UpdateSLADto,
  CreateSurveyDto,
  CreateGuideDto,
  UpdateGuideDto,
  CreateChannelLogDto,
  CreateConsultationCategoryDto,
  UpdateConsultationCategoryDto,
  PaginatedResponse,
  DashboardStats,
  ClientTimeline,
  SurveyStats,
  ChannelStats,
} from '@/lib/types/cs';

const CONSULTATIONS_KEY = 'consultations';
const CS_DASHBOARD_KEY = 'cs-dashboard';
const CS_TAGS_KEY = 'cs-tags';
const CS_ALERTS_KEY = 'cs-alerts';
const CS_SLA_KEY = 'cs-sla';
const CS_HEALTH_KEY = 'cs-health';
const CS_GUIDES_KEY = 'cs-guides';
const CS_CATEGORIES_KEY = 'consultation-categories';

// ==================== 상담 분류 ====================

export function useConsultationCategories(includeInactive?: boolean) {
  return useQuery({
    queryKey: [CS_CATEGORIES_KEY, includeInactive],
    queryFn: () => api.get<ConsultationCategory[]>('/consultation-categories',
      includeInactive ? { includeInactive: 'true' } : undefined
    ),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConsultationCategoryDto) =>
      api.post<ConsultationCategory>('/consultation-categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_CATEGORIES_KEY] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConsultationCategoryDto }) =>
      api.put<ConsultationCategory>(`/consultation-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_CATEGORIES_KEY] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/consultation-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_CATEGORIES_KEY] });
    },
  });
}

// ==================== 상담 내역 ====================

export function useConsultations(params?: ConsultationQueryParams) {
  return useQuery({
    queryKey: [CONSULTATIONS_KEY, params],
    queryFn: () => api.get<PaginatedResponse<Consultation>>('/consultations', params as Record<string, any>),
  });
}

export function useConsultation(id: string) {
  return useQuery({
    queryKey: [CONSULTATIONS_KEY, id],
    queryFn: () => api.get<Consultation>(`/consultations/${id}`),
    enabled: !!id,
  });
}

export function useCreateConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConsultationDto) =>
      api.post<Consultation>('/consultations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONSULTATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CS_DASHBOARD_KEY] });
    },
  });
}

export function useUpdateConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConsultationDto }) =>
      api.put<Consultation>(`/consultations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONSULTATIONS_KEY] });
    },
  });
}

export function useUpdateConsultationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, updatedBy }: { id: string; status: string; updatedBy?: string }) =>
      api.patch(`/consultations/${id}/status`, { status, updatedBy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONSULTATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CS_DASHBOARD_KEY] });
    },
  });
}

export function useResolveConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, resolution, resolvedBy }: { id: string; resolution: string; resolvedBy: string }) =>
      api.patch(`/consultations/${id}/resolve`, { resolution, resolvedBy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONSULTATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CS_DASHBOARD_KEY] });
    },
  });
}

export function useDeleteConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/consultations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONSULTATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CS_DASHBOARD_KEY] });
    },
  });
}

export function useAddFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ consultationId, data }: { consultationId: string; data: CreateFollowUpDto }) =>
      api.post(`/consultations/${consultationId}/follow-ups`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONSULTATIONS_KEY] });
    },
  });
}

// ==================== CS 대시보드 ====================

export function useCSDashboard(params?: { startDate?: string; endDate?: string; counselorId?: string }) {
  return useQuery({
    queryKey: [CS_DASHBOARD_KEY, params],
    queryFn: () => api.get<DashboardStats>('/cs/dashboard', params as Record<string, any>),
    refetchInterval: 60000, // 1분마다 갱신
  });
}

// ==================== 태그 관리 ====================

export function useConsultationTags(category?: string) {
  return useQuery({
    queryKey: [CS_TAGS_KEY, category],
    queryFn: () => api.get<ConsultationTag[]>('/cs/tags', category ? { category } : undefined),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTagDto) => api.post<ConsultationTag>('/cs/tags', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_TAGS_KEY] });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTagDto }) =>
      api.put<ConsultationTag>(`/cs/tags/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_TAGS_KEY] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/cs/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_TAGS_KEY] });
    },
  });
}

export function useAddTagsToConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ consultationId, tagIds }: { consultationId: string; tagIds: string[] }) =>
      api.post<ConsultationTagMapping[]>(`/cs/consultations/${consultationId}/tags`, { tagIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONSULTATIONS_KEY] });
    },
  });
}

export function useRemoveTagFromConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ consultationId, tagId }: { consultationId: string; tagId: string }) =>
      api.delete(`/cs/consultations/${consultationId}/tags/${tagId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONSULTATIONS_KEY] });
    },
  });
}

export function useAutoTagConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (consultationId: string) =>
      api.post<ConsultationTagMapping[]>(`/cs/consultations/${consultationId}/auto-tag`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONSULTATIONS_KEY] });
    },
  });
}

// ==================== 알림 관리 ====================

export function useAlerts(params?: AlertQueryParams) {
  return useQuery({
    queryKey: [CS_ALERTS_KEY, params],
    queryFn: () => api.get<PaginatedResponse<ConsultationAlert>>('/cs/alerts', params as Record<string, any>),
    refetchInterval: 30000, // 30초마다 갱신
  });
}

export function useUnreadAlertCount() {
  return useQuery({
    queryKey: [CS_ALERTS_KEY, 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/cs/alerts/unread-count'),
    refetchInterval: 30000,
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAlertDto) => api.post<ConsultationAlert>('/cs/alerts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_ALERTS_KEY] });
    },
  });
}

export function useMarkAlertAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, readBy }: { id: string; readBy: string }) =>
      api.patch(`/cs/alerts/${id}/read`, { readBy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_ALERTS_KEY] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResolveAlertDto }) =>
      api.patch(`/cs/alerts/${id}/resolve`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_ALERTS_KEY] });
    },
  });
}

// ==================== SLA 관리 ====================

export function useSLAs() {
  return useQuery({
    queryKey: [CS_SLA_KEY],
    queryFn: () => api.get<ConsultationSLA[]>('/cs/sla'),
  });
}

export function useCreateSLA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSLADto) => api.post<ConsultationSLA>('/cs/sla', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_SLA_KEY] });
    },
  });
}

export function useUpdateSLA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSLADto }) =>
      api.put<ConsultationSLA>(`/cs/sla/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_SLA_KEY] });
    },
  });
}

export function useDeleteSLA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/cs/sla/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_SLA_KEY] });
    },
  });
}

// ==================== 고객 건강 점수 ====================

export function useCustomerHealthScore(clientId: string) {
  return useQuery({
    queryKey: [CS_HEALTH_KEY, clientId],
    queryFn: () => api.get<CustomerHealthScore>(`/cs/health-scores/${clientId}`),
    enabled: !!clientId,
  });
}

export function useAtRiskCustomers() {
  return useQuery({
    queryKey: [CS_HEALTH_KEY, 'at-risk'],
    queryFn: () => api.get<CustomerHealthScore[]>('/cs/health-scores/at-risk'),
  });
}

export function useCalculateHealthScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) =>
      api.post<CustomerHealthScore>(`/cs/health-scores/${clientId}/calculate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_HEALTH_KEY] });
    },
  });
}

// ==================== 만족도 조사 ====================

export function useCreateSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSurveyDto) => api.post('/cs/surveys', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_HEALTH_KEY] });
      queryClient.invalidateQueries({ queryKey: [CS_DASHBOARD_KEY] });
    },
  });
}

export function useSurveyStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['cs-surveys', 'stats', startDate, endDate],
    queryFn: () => api.get<SurveyStats>('/cs/surveys/stats', { startDate, endDate }),
  });
}

// ==================== 상담 가이드 ====================

export function useConsultationGuides(categoryId?: string, tagCodes?: string[]) {
  return useQuery({
    queryKey: [CS_GUIDES_KEY, categoryId, tagCodes],
    queryFn: () => api.get<ConsultationGuide[]>('/cs/guides', {
      categoryId,
      tagCodes: tagCodes?.join(','),
    }),
  });
}

export function useCreateGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGuideDto) => api.post<ConsultationGuide>('/cs/guides', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_GUIDES_KEY] });
    },
  });
}

export function useUpdateGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGuideDto }) =>
      api.put<ConsultationGuide>(`/cs/guides/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_GUIDES_KEY] });
    },
  });
}

export function useDeleteGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/cs/guides/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_GUIDES_KEY] });
    },
  });
}

export function useRecommendedGuides(consultationId: string) {
  return useQuery({
    queryKey: [CS_GUIDES_KEY, 'recommended', consultationId],
    queryFn: () => api.get<ConsultationGuide[]>(`/cs/consultations/${consultationId}/recommended-guides`),
    enabled: !!consultationId,
  });
}

export function useMarkGuideUsed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post(`/cs/guides/${id}/use`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_GUIDES_KEY] });
    },
  });
}

export function useMarkGuideHelpful() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post(`/cs/guides/${id}/helpful`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CS_GUIDES_KEY] });
    },
  });
}

// ==================== 고객 타임라인 ====================

export function useClientTimeline(clientId: string, params?: ClientTimelineQueryParams) {
  return useQuery({
    queryKey: ['client-timeline', clientId, params],
    queryFn: () => api.get<ClientTimeline>(`/cs/clients/${clientId}/timeline`, params as Record<string, any>),
    enabled: !!clientId,
  });
}

// ==================== 채널 통계 ====================

export function useChannelStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['cs-channels', 'stats', startDate, endDate],
    queryFn: () => api.get<ChannelStats>('/cs/channels/stats', { startDate, endDate }),
  });
}

export function useCreateChannelLog() {
  return useMutation({
    mutationFn: (data: CreateChannelLogDto) => api.post('/cs/channels', data),
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ==================== 타입 정의 ====================

export interface HrCommittee {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  members?: HrCommitteeMember[];
  agendas?: HrAgenda[];
  createdAt: string;
  updatedAt: string;
}

export interface HrCommitteeMember {
  id: string;
  committeeId: string;
  staffId: string;
  role: 'CHAIRMAN' | 'MEMBER';
  appointedAt: string;
  releasedAt?: string;
  staff?: {
    id: string;
    name: string;
    position?: string;
    department?: { name: string };
  };
}

export interface HrAgenda {
  id: string;
  committeeId: string;
  type: 'REWARD' | 'PENALTY' | 'PROMOTION' | 'TRANSFER' | 'DISMISSAL' | 'OTHER';
  title: string;
  description?: string;
  targetStaffId?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'VOTED' | 'CLOSED';
  evidence?: string;
  createdBy: string;
  votes?: HrAgendaVote[];
  decision?: HrAgendaDecision;
  targetStaff?: { id: string; name: string };
  committee?: { id: string; name: string };
  createdAt: string;
}

export interface HrAgendaVote {
  id: string;
  agendaId: string;
  voterId: string;
  vote: 'APPROVE' | 'REJECT' | 'ABSTAIN';
  comment?: string;
  votedAt: string;
  voter?: { id: string; name: string };
}

export interface HrAgendaDecision {
  id: string;
  agendaId: string;
  decision: 'APPROVED' | 'REJECTED';
  summary?: string;
  effectiveDate?: string;
  decidedAt: string;
}

export interface DisciplineRecord {
  id: string;
  staffId: string;
  agendaId?: string;
  type: 'REWARD' | 'PENALTY';
  category: string;
  title: string;
  description?: string;
  effectiveDate: string;
  createdBy: string;
  staff?: { id: string; name: string };
  createdAt: string;
}

/** 위원회 목록 조회 파라미터 */
export interface HrCommitteeQuery {
  page?: number;
  limit?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  search?: string;
}

/** 안건 목록 조회 파라미터 */
export interface HrAgendaQuery {
  page?: number;
  limit?: number;
  committeeId?: string;
  type?: HrAgenda['type'];
  status?: HrAgenda['status'];
  targetStaffId?: string;
  search?: string;
}

/** 상벌 기록 조회 파라미터 */
export interface DisciplineRecordQuery {
  page?: number;
  limit?: number;
  staffId?: string;
  type?: 'REWARD' | 'PENALTY';
  search?: string;
}

/** 페이지네이션 응답 */
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ==================== Query Keys ====================

const HR_COMMITTEES_KEY = 'hr-committees';
const HR_AGENDAS_KEY = 'hr-agendas';
const DISCIPLINE_RECORDS_KEY = 'discipline-records';

// ==================== 위원회 Hooks ====================

/** 인사위원회 목록 조회 */
export function useHrCommittees(query?: HrCommitteeQuery) {
  return useQuery({
    queryKey: [HR_COMMITTEES_KEY, query],
    queryFn: () =>
      api.get<PaginatedResponse<HrCommittee>>(
        '/hr-committees',
        query as Record<string, string | number | boolean | undefined>,
      ),
  });
}

/** 인사위원회 상세 조회 */
export function useHrCommittee(id: string) {
  return useQuery({
    queryKey: [HR_COMMITTEES_KEY, id],
    queryFn: () => api.get<HrCommittee>(`/hr-committees/${id}`),
    enabled: !!id,
  });
}

/** 인사위원회 생성 */
export function useCreateHrCommittee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post<HrCommittee>('/hr-committees', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HR_COMMITTEES_KEY] });
    },
  });
}

/** 인사위원회 수정 */
export function useUpdateHrCommittee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{ name: string; description: string; status: 'ACTIVE' | 'INACTIVE' }>;
    }) => api.patch<HrCommittee>(`/hr-committees/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [HR_COMMITTEES_KEY] });
      queryClient.invalidateQueries({ queryKey: [HR_COMMITTEES_KEY, variables.id] });
    },
  });
}

/** 인사위원회 삭제 */
export function useDeleteHrCommittee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/hr-committees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HR_COMMITTEES_KEY] });
    },
  });
}

// ==================== 위원회 멤버 Hooks ====================

/** 위원회 멤버 추가 */
export function useAddCommitteeMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      committeeId,
      staffId,
      role,
    }: {
      committeeId: string;
      staffId: string;
      role: 'CHAIRMAN' | 'MEMBER';
    }) =>
      api.post<HrCommitteeMember>(`/hr-committees/${committeeId}/members`, {
        staffId,
        role,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [HR_COMMITTEES_KEY] });
      queryClient.invalidateQueries({
        queryKey: [HR_COMMITTEES_KEY, variables.committeeId],
      });
    },
  });
}

/** 위원회 멤버 제거 */
export function useRemoveCommitteeMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      committeeId,
      memberId,
    }: {
      committeeId: string;
      memberId: string;
    }) => api.delete(`/hr-committees/${committeeId}/members/${memberId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [HR_COMMITTEES_KEY] });
      queryClient.invalidateQueries({
        queryKey: [HR_COMMITTEES_KEY, variables.committeeId],
      });
    },
  });
}

// ==================== 안건 Hooks ====================

/** 안건 목록 조회 */
export function useHrAgendas(query?: HrAgendaQuery) {
  return useQuery({
    queryKey: [HR_AGENDAS_KEY, query],
    queryFn: () =>
      api.get<PaginatedResponse<HrAgenda>>(
        '/hr-agendas',
        query as Record<string, string | number | boolean | undefined>,
      ),
  });
}

/** 안건 상세 조회 */
export function useHrAgenda(id: string) {
  return useQuery({
    queryKey: [HR_AGENDAS_KEY, id],
    queryFn: () => api.get<HrAgenda>(`/hr-agendas/${id}`),
    enabled: !!id,
  });
}

/** 안건 생성 */
export function useCreateHrAgenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Omit<HrAgenda, 'id' | 'status' | 'votes' | 'decision' | 'targetStaff' | 'committee' | 'createdAt'>,
    ) => api.post<HrAgenda>('/hr-agendas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HR_AGENDAS_KEY] });
    },
  });
}

/** 안건 제출 (DRAFT → SUBMITTED) */
export function useSubmitHrAgenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.patch<HrAgenda>(`/hr-agendas/${id}/submit`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [HR_AGENDAS_KEY] });
      queryClient.invalidateQueries({ queryKey: [HR_AGENDAS_KEY, id] });
    },
  });
}

/** 투표 */
export function useCastVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      agendaId,
      vote,
      comment,
    }: {
      agendaId: string;
      vote: 'APPROVE' | 'REJECT' | 'ABSTAIN';
      comment?: string;
    }) => api.post<HrAgendaVote>(`/hr-agendas/${agendaId}/votes`, { vote, comment }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [HR_AGENDAS_KEY] });
      queryClient.invalidateQueries({ queryKey: [HR_AGENDAS_KEY, variables.agendaId] });
    },
  });
}

/** 의결 (최종 결정) */
export function useMakeDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      agendaId,
      decision,
      summary,
      effectiveDate,
    }: {
      agendaId: string;
      decision: 'APPROVED' | 'REJECTED';
      summary?: string;
      effectiveDate?: string;
    }) =>
      api.post<HrAgendaDecision>(`/hr-agendas/${agendaId}/decision`, {
        decision,
        summary,
        effectiveDate,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [HR_AGENDAS_KEY] });
      queryClient.invalidateQueries({ queryKey: [HR_AGENDAS_KEY, variables.agendaId] });
    },
  });
}

// ==================== 상벌 기록 Hooks ====================

/** 상벌 기록 목록 조회 */
export function useDisciplineRecords(query?: DisciplineRecordQuery) {
  return useQuery({
    queryKey: [DISCIPLINE_RECORDS_KEY, query],
    queryFn: () =>
      api.get<PaginatedResponse<DisciplineRecord>>(
        '/discipline-records',
        query as Record<string, string | number | boolean | undefined>,
      ),
  });
}

/** 상벌 기록 생성 */
export function useCreateDisciplineRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Omit<DisciplineRecord, 'id' | 'staff' | 'createdAt'>,
    ) => api.post<DisciplineRecord>('/discipline-records', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DISCIPLINE_RECORDS_KEY] });
    },
  });
}

/** 상벌 기록 삭제 */
export function useDeleteDisciplineRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/discipline-records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DISCIPLINE_RECORDS_KEY] });
    },
  });
}

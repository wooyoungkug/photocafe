'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ==================== 타입 정의 ====================

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  defaultDays: number;
  deductDays: number;
  isActive: boolean;
  sortOrder: number;
}

export interface LeaveBalance {
  id: string;
  staffId: string;
  year: number;
  leaveTypeCode: string;
  totalDays: number;
  usedDays: number;
  adjustedDays: number;
  memo?: string;
  staff?: { id: string; name: string; department?: { id: string; name: string } };
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  days: number;
  reason?: string;
  status: 'PENDING' | 'TEAM_APPROVED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvals?: LeaveApproval[];
  staff?: {
    id: string;
    name: string;
    department?: { name: string };
    team?: { name: string };
  };
  createdAt: string;
}

export interface LeaveApproval {
  id: string;
  requestId: string;
  approverStaffId: string;
  step: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment?: string;
  decidedAt?: string;
  approver?: { id: string; name: string };
}

export interface LeaveCalendarEntry {
  date: string;
  staffId: string;
  staffName: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  days: number;
}

export interface MinStaffingRule {
  id: string;
  departmentId?: string;
  teamId?: string;
  minCount: number;
  isActive: boolean;
  department?: { id: string; name: string };
  team?: { id: string; name: string };
}

/** 잔여일수 조회 파라미터 */
export interface LeaveBalanceQuery {
  staffId?: string;
  year?: number;
}

/** 휴가신청 목록 조회 파라미터 */
export interface LeaveRequestQuery {
  page?: number;
  limit?: number;
  staffId?: string;
  status?: LeaveRequest['status'];
  leaveTypeCode?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  teamId?: string;
  search?: string;
}

/** 휴가 캘린더 조회 파라미터 */
export interface LeaveCalendarQuery {
  departmentId?: string;
  teamId?: string;
  year: number;
  month: number;
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

const LEAVE_TYPES_KEY = 'leave-types';
const LEAVE_BALANCES_KEY = 'leave-balances';
const LEAVE_REQUESTS_KEY = 'leave-requests';
const LEAVE_APPROVALS_KEY = 'leave-approvals';
const LEAVE_CALENDAR_KEY = 'leave-calendar';
const MIN_STAFFING_RULES_KEY = 'min-staffing-rules';

// ==================== 휴가 유형 Hooks ====================

/** 휴가 유형 목록 조회 */
export function useLeaveTypes() {
  return useQuery({
    queryKey: [LEAVE_TYPES_KEY],
    queryFn: () => api.get<LeaveType[]>('/leave-types'),
  });
}

/** 휴가 유형 생성 */
export function useCreateLeaveType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<LeaveType, 'id'>) =>
      api.post<LeaveType>('/leave-types', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_TYPES_KEY] });
    },
  });
}

/** 휴가 유형 수정 */
export function useUpdateLeaveType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<LeaveType, 'id'>> }) =>
      api.patch<LeaveType>(`/leave-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_TYPES_KEY] });
    },
  });
}

// ==================== 잔여일수 Hooks ====================

/** 잔여일수 목록 조회 */
export function useLeaveBalances(query: LeaveBalanceQuery) {
  return useQuery({
    queryKey: [LEAVE_BALANCES_KEY, query],
    queryFn: () =>
      api.get<LeaveBalance[]>(
        '/leave-balances',
        query as Record<string, string | number | boolean | undefined>,
      ),
  });
}

/** 연차 일괄 생성 */
export function useGenerateLeaveBalances() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { year: number; staffIds?: string[] }) =>
      api.post<{ generated: number }>('/leave-balances/generate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_BALANCES_KEY] });
    },
  });
}

/** 잔여일수 조정 */
export function useAdjustLeaveBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      adjustedDays,
      memo,
    }: {
      id: string;
      adjustedDays: number;
      memo?: string;
    }) =>
      api.patch<LeaveBalance>(`/leave-balances/${id}/adjust`, {
        adjustedDays,
        memo,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_BALANCES_KEY] });
    },
  });
}

// ==================== 휴가 신청 Hooks ====================

/** 휴가 신청 목록 조회 */
export function useLeaveRequests(query?: LeaveRequestQuery) {
  return useQuery({
    queryKey: [LEAVE_REQUESTS_KEY, query],
    queryFn: () =>
      api.get<PaginatedResponse<LeaveRequest>>(
        '/leave-requests',
        query as Record<string, string | number | boolean | undefined>,
      ),
  });
}

/** 휴가 신청 상세 조회 */
export function useLeaveRequest(id: string) {
  return useQuery({
    queryKey: [LEAVE_REQUESTS_KEY, id],
    queryFn: () => api.get<LeaveRequest>(`/leave-requests/${id}`),
    enabled: !!id,
  });
}

/** 휴가 신청 생성 */
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Omit<LeaveRequest, 'id' | 'staffId' | 'status' | 'approvals' | 'staff' | 'createdAt'>,
    ) => api.post<LeaveRequest>('/leave-requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [LEAVE_BALANCES_KEY] });
    },
  });
}

/** 휴가 신청 취소 */
export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.patch<LeaveRequest>(`/leave-requests/${id}/cancel`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [LEAVE_REQUESTS_KEY, id] });
      queryClient.invalidateQueries({ queryKey: [LEAVE_BALANCES_KEY] });
    },
  });
}

/** 휴가 승인/반려 */
export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      status,
      comment,
    }: {
      requestId: string;
      status: 'APPROVED' | 'REJECTED';
      comment?: string;
    }) =>
      api.patch<LeaveRequest>(`/leave-requests/${requestId}/approve`, {
        status,
        comment,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_REQUESTS_KEY] });
      queryClient.invalidateQueries({
        queryKey: [LEAVE_REQUESTS_KEY, variables.requestId],
      });
      queryClient.invalidateQueries({ queryKey: [LEAVE_APPROVALS_KEY] });
      queryClient.invalidateQueries({ queryKey: [LEAVE_BALANCES_KEY] });
    },
  });
}

/** 내 결재 대기 목록 조회 */
export function usePendingApprovals() {
  return useQuery({
    queryKey: [LEAVE_APPROVALS_KEY, 'pending'],
    queryFn: () => api.get<LeaveRequest[]>('/leave-requests/pending-approvals'),
  });
}

// ==================== 캘린더 Hooks ====================

/** 휴가 캘린더 데이터 조회 */
export function useLeaveCalendar(query: LeaveCalendarQuery) {
  return useQuery({
    queryKey: [LEAVE_CALENDAR_KEY, query],
    queryFn: () =>
      api.get<LeaveCalendarEntry[]>(
        '/leave-calendar',
        query as unknown as Record<string, string | number | boolean | undefined>,
      ),
  });
}

// ==================== 최소 인원 규칙 Hooks ====================

/** 최소 인원 규칙 목록 조회 */
export function useMinStaffingRules() {
  return useQuery({
    queryKey: [MIN_STAFFING_RULES_KEY],
    queryFn: () => api.get<MinStaffingRule[]>('/min-staffing-rules'),
  });
}

/** 최소 인원 규칙 생성 */
export function useCreateMinStaffingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<MinStaffingRule, 'id'>) =>
      api.post<MinStaffingRule>('/min-staffing-rules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MIN_STAFFING_RULES_KEY] });
    },
  });
}

/** 최소 인원 규칙 수정 */
export function useUpdateMinStaffingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<MinStaffingRule, 'id'>>;
    }) => api.patch<MinStaffingRule>(`/min-staffing-rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MIN_STAFFING_RULES_KEY] });
    },
  });
}

/** 최소 인원 규칙 삭제 */
export function useDeleteMinStaffingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/min-staffing-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MIN_STAFFING_RULES_KEY] });
    },
  });
}

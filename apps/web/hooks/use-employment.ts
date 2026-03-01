'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Employment,
  Invitation,
  InvitationValidation,
  CreateInvitationRequest,
  UpdateEmploymentRequest,
  AcceptInvitationRequest,
  AcceptInvitationExistingRequest,
  InvitationCreateResult,
  ClientDepartment,
  CreateClientDepartmentRequest,
  UpdateClientDepartmentRequest,
} from '@/lib/types/employment';

const EMPLOYMENT_KEY = 'employments';
const INVITATION_KEY = 'invitations';
const DEPARTMENTS_KEY = 'employee-departments';

// ==================== 직원 목록 ====================

export function useEmployeesByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: [EMPLOYMENT_KEY, clientId],
    queryFn: () => api.get<Employment[]>(`/employments/client/${clientId}`),
    enabled: !!clientId,
  });
}

// ==================== 부서 목록 ====================

export function useEmployeeDepartments(clientId: string | undefined) {
  return useQuery({
    queryKey: [DEPARTMENTS_KEY, clientId],
    queryFn: () => api.get<ClientDepartment[]>(`/employments/departments/${clientId}`),
    enabled: !!clientId,
  });
}

// ==================== 부서 관리 (Manager 전용) ====================

export function useCreateClientDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClientDepartmentRequest) =>
      api.post<ClientDepartment>('/employments/departments', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [DEPARTMENTS_KEY, variables.clientId] });
    },
  });
}

export function useUpdateClientDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientDepartmentRequest }) =>
      api.put<ClientDepartment>(`/employments/departments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] });
    },
  });
}

export function useDeleteClientDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean }>(`/employments/departments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] });
    },
  });
}

// ==================== 초대 목록 ====================

export function useInvitationsByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: [INVITATION_KEY, clientId],
    queryFn: () => api.get<Invitation[]>(`/employments/invitations/${clientId}`),
    enabled: !!clientId,
  });
}

// ==================== 초대 생성 ====================

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvitationRequest) =>
      api.post<InvitationCreateResult>('/employments/invite', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [INVITATION_KEY, variables.clientId],
      });
    },
  });
}

// ==================== 초대 취소 ====================

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      api.delete<{ success: boolean; message: string }>(
        `/employments/invitations/${invitationId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVITATION_KEY] });
    },
  });
}

// ==================== 권한/역할 수정 ====================

export function useUpdateEmployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEmploymentRequest;
    }) => api.patch<Employment>(`/employments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYMENT_KEY] });
      queryClient.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] });
    },
  });
}

// ==================== 직원 제거 ====================

export function useRemoveEmployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean; message: string }>(`/employments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYMENT_KEY] });
    },
  });
}

// ==================== 아이디 중복 확인 (Public) ====================

export function useCheckLoginId(loginId: string | undefined) {
  return useQuery({
    queryKey: ['check-login-id', loginId],
    queryFn: () => api.get<{ available: boolean }>(`/employments/check-login-id/${loginId}`),
    enabled: !!loginId && loginId.length >= 4,
    retry: false,
  });
}

// ==================== 초대 토큰 검증 (Public) ====================

export function useValidateInvitation(token: string | undefined) {
  return useQuery({
    queryKey: ['invitation-validate', token],
    queryFn: () =>
      api.get<InvitationValidation>(`/employments/invite/${token}`),
    enabled: !!token,
    retry: false,
  });
}

// ==================== 초대 수락 (신규 계정) ====================

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (data: AcceptInvitationRequest) =>
      api.post<{ success: boolean; message: string; userId: string }>(
        '/employments/invite/accept',
        data,
      ),
  });
}

// ==================== 초대 수락 (기존 계정) ====================

export function useAcceptInvitationExisting() {
  return useMutation({
    mutationFn: (data: AcceptInvitationExistingRequest) =>
      api.post<{ success: boolean; message: string; userId: string }>(
        '/employments/invite/accept-existing',
        data,
      ),
  });
}

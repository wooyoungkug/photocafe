'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Staff,
  Department,
  CreateStaffRequest,
  UpdateStaffRequest,
  StaffQuery,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from '@/lib/types/staff';

const STAFF_KEY = 'staff';
const DEPARTMENTS_KEY = 'departments';

// ==================== 직원 조회 ====================

export function useStaffList(query?: StaffQuery) {
  return useQuery({
    queryKey: [STAFF_KEY, query],
    queryFn: () =>
      api.get<{
        data: Staff[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>('/staff', query as Record<string, string | number | boolean | undefined>),
  });
}

export function useStaff(id: string) {
  return useQuery({
    queryKey: [STAFF_KEY, id],
    queryFn: () => api.get<Staff>(`/staff/${id}`),
    enabled: !!id,
  });
}

// ==================== 직원 생성 ====================

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStaffRequest) => api.post<Staff>('/staff', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_KEY] });
    },
  });
}

// ==================== 직원 수정 ====================

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffRequest }) =>
      api.put<Staff>(`/staff/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_KEY] });
    },
  });
}

// ==================== 비밀번호 변경 ====================

export function useChangeStaffPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      api.patch<{ success: boolean; message: string }>(`/staff/${id}/password`, {
        newPassword,
      }),
  });
}

// ==================== 직원 삭제 ====================

export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean; message: string }>(`/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_KEY] });
    },
  });
}

// ==================== 담당 회원 관리 ====================

export function useAssignClients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ staffId, clientIds }: { staffId: string; clientIds: string[] }) =>
      api.put<Staff>(`/staff/${staffId}/clients`, { clientIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_KEY] });
    },
  });
}

export function useAddClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      staffId,
      clientId,
      isPrimary,
    }: {
      staffId: string;
      clientId: string;
      isPrimary?: boolean;
    }) =>
      api.post<Staff>(
        `/staff/${staffId}/clients/${clientId}${isPrimary ? '?isPrimary=true' : ''}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_KEY] });
    },
  });
}

export function useRemoveClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ staffId, clientId }: { staffId: string; clientId: string }) =>
      api.delete<Staff>(`/staff/${staffId}/clients/${clientId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_KEY] });
    },
  });
}

// ==================== IP 접근 관리 ====================

export function useUpdateAllowedIps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ips }: { id: string; ips: string[] }) =>
      api.patch<{ id: string; allowedIps: string[] }>(`/staff/${id}/allowed-ips`, {
        ips,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_KEY] });
    },
  });
}

// ==================== 권한 관리 ====================

export function useUpdateMenuPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      permissions,
    }: {
      id: string;
      permissions: Record<string, any>;
    }) =>
      api.patch<{ id: string; menuPermissions: any }>(`/staff/${id}/menu-permissions`, {
        permissions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_KEY] });
    },
  });
}

export function useUpdateCategoryPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      permissions,
    }: {
      id: string;
      permissions: Record<string, boolean>;
    }) =>
      api.patch<{ id: string; categoryPermissions: any }>(
        `/staff/${id}/category-permissions`,
        { permissions }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_KEY] });
    },
  });
}

export function useUpdateProcessPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      permissions,
    }: {
      id: string;
      permissions: Record<string, any>;
    }) =>
      api.patch<{ id: string; processPermissions: any }>(
        `/staff/${id}/process-permissions`,
        { permissions }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_KEY] });
    },
  });
}

// ==================== 부서 관리 ====================

export function useDepartments() {
  return useQuery({
    queryKey: [DEPARTMENTS_KEY],
    queryFn: () => api.get<Department[]>('/departments'),
  });
}

export function useDepartment(id: string) {
  return useQuery({
    queryKey: [DEPARTMENTS_KEY, id],
    queryFn: () => api.get<Department>(`/departments/${id}`),
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDepartmentRequest) =>
      api.post<Department>('/departments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentRequest }) =>
      api.put<Department>(`/departments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean; message: string }>(`/departments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] });
    },
  });
}

// ==================== 지점 관리 ====================

const BRANCHES_KEY = 'branches';

export interface Branch {
  id: string;
  branchCode: string;
  branchName: string;
  isHeadquarters: boolean;
  address?: string;
  phone?: string;
  isActive: boolean;
}

export function useBranches(isActive?: boolean) {
  return useQuery({
    queryKey: [BRANCHES_KEY, isActive],
    queryFn: () => api.get<Branch[]>('/branches', isActive !== undefined ? { isActive } : undefined),
  });
}

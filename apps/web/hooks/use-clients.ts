'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Client,
  ClientGroup,
  CreateClientDto,
  UpdateClientDto,
  CreateClientGroupDto,
  UpdateClientGroupDto,
  PaginatedResponse,
} from '@/lib/types/client';

const CLIENTS_KEY = 'clients';
const CLIENT_GROUPS_KEY = 'client-groups';

// ==================== 거래처 ====================

export function useClients(params?: {
  page?: number;
  limit?: number;
  search?: string;
  groupId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: [CLIENTS_KEY, params],
    queryFn: () => api.get<PaginatedResponse<Client>>('/clients', params),
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: [CLIENTS_KEY, id],
    queryFn: () => api.get<Client>(`/clients/${id}`),
    enabled: !!id,
  });
}

export function useNextClientCode() {
  return useQuery({
    queryKey: [CLIENTS_KEY, 'next-code'],
    queryFn: () => api.get<{ code: string }>('/clients/next-code'),
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientDto) => api.post<Client>('/clients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTS_KEY] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientDto }) =>
      api.put<Client>(`/clients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTS_KEY] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTS_KEY] });
    },
  });
}

export function useChangeClientGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, groupId }: { id: string; groupId: string | null }) =>
      api.patch(`/clients/${id}/group`, { groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTS_KEY] });
    },
  });
}

// ==================== 거래처 그룹 ====================

export function useClientGroups(params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}) {
  return useQuery({
    queryKey: [CLIENT_GROUPS_KEY, params],
    queryFn: () => api.get<PaginatedResponse<ClientGroup>>('/client-groups', params),
  });
}

export function useClientGroup(id: string) {
  return useQuery({
    queryKey: [CLIENT_GROUPS_KEY, id],
    queryFn: () => api.get<ClientGroup>(`/client-groups/${id}`),
    enabled: !!id,
  });
}

export function useCreateClientGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientGroupDto) =>
      api.post<ClientGroup>('/client-groups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENT_GROUPS_KEY] });
    },
  });
}

export function useUpdateClientGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientGroupDto }) =>
      api.put<ClientGroup>(`/client-groups/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENT_GROUPS_KEY] });
    },
  });
}

export function useDeleteClientGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/client-groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENT_GROUPS_KEY] });
    },
  });
}

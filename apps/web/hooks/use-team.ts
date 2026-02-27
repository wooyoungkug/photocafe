'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Team,
  CreateTeamRequest,
  UpdateTeamRequest,
  TeamQuery,
} from '@/lib/types/staff';

const TEAMS_KEY = 'teams';
const DEPARTMENTS_KEY = 'departments';

export function useTeams(query?: TeamQuery) {
  return useQuery({
    queryKey: [TEAMS_KEY, query],
    queryFn: () =>
      api.get<Team[]>('/teams', query as Record<string, string | number | boolean | undefined>),
  });
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: [TEAMS_KEY, id],
    queryFn: () => api.get<Team>(`/teams/${id}`),
    enabled: !!id,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTeamRequest) => api.post<Team>('/teams', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEAMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeamRequest }) =>
      api.put<Team>(`/teams/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEAMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean; message: string }>(`/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEAMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] });
    },
  });
}

export function useAssignTeamMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, staffIds }: { teamId: string; staffIds: string[] }) =>
      api.put<Team>(`/teams/${teamId}/members`, { staffIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEAMS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, staffId }: { teamId: string; staffId: string }) =>
      api.delete<{ success: boolean; message: string }>(`/teams/${teamId}/members/${staffId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEAMS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useSetTeamLeader() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, staffId }: { teamId: string; staffId: string }) =>
      api.patch<Team>(`/teams/${teamId}/leader`, { staffId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEAMS_KEY] });
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Todo,
  CreateTodoDto,
  UpdateTodoDto,
  QueryTodoDto,
  Schedule,
  CreateScheduleDto,
  UpdateScheduleDto,
  QueryScheduleDto,
  Memo,
  CreateMemoDto,
  UpdateMemoDto,
  QueryMemoDto,
} from '@/lib/types/schedule';

const TODOS_KEY = 'todos';
const SCHEDULES_KEY = 'schedules';
const MEMOS_KEY = 'memos';

// ==================== Todo Hooks ====================

export function useTodos(query: QueryTodoDto = {}) {
  return useQuery({
    queryKey: [TODOS_KEY, query],
    queryFn: () => api.get<Todo[]>('/todos', query as Record<string, string | number | boolean | undefined>),
  });
}

export function useTodo(id: string) {
  return useQuery({
    queryKey: [TODOS_KEY, id],
    queryFn: () => api.get<Todo>(`/todos/${id}`),
    enabled: !!id,
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTodoDto) => api.post<Todo>('/todos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TODOS_KEY] });
    },
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTodoDto }) =>
      api.put<Todo>(`/todos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TODOS_KEY] });
    },
  });
}

export function useCompleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.patch<Todo>(`/todos/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TODOS_KEY] });
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/todos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TODOS_KEY] });
    },
  });
}

// ==================== Schedule Hooks ====================

export function useSchedules(query: QueryScheduleDto) {
  return useQuery({
    queryKey: [SCHEDULES_KEY, query],
    queryFn: () => api.get<Schedule[]>('/schedules', query as unknown as Record<string, string | number | boolean | undefined>),
    enabled: !!query.startDate && !!query.endDate,
  });
}

export function useSchedule(id: string) {
  return useQuery({
    queryKey: [SCHEDULES_KEY, id],
    queryFn: () => api.get<Schedule>(`/schedules/${id}`),
    enabled: !!id,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateScheduleDto) => api.post<Schedule>('/schedules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SCHEDULES_KEY] });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduleDto }) =>
      api.put<Schedule>(`/schedules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SCHEDULES_KEY] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SCHEDULES_KEY] });
    },
  });
}

// ==================== Memo Hooks ====================

export function useMemos(query: QueryMemoDto = {}) {
  return useQuery({
    queryKey: [MEMOS_KEY, query],
    queryFn: () => api.get<Memo[]>('/memos', query as Record<string, string | number | boolean | undefined>),
  });
}

export function useCreateMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMemoDto) => api.post<Memo>('/memos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMOS_KEY] });
    },
  });
}

export function useUpdateMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMemoDto }) =>
      api.put<Memo>(`/memos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMOS_KEY] });
    },
  });
}

export function useDeleteMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/memos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMOS_KEY] });
    },
  });
}

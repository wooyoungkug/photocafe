'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface BulkResult {
  success: number;
  failed: string[];
  skipped?: string[];
}

interface DuplicateResult extends BulkResult {
  newOrderIds: string[];
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { orderIds: string[]; status: string; note?: string }) =>
      api.post<BulkResult>('/orders/bulk/update-status', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useBulkCancel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { orderIds: string[]; reason?: string }) =>
      api.post<BulkResult>('/orders/bulk/cancel', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useBulkDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { orderIds: string[] }) =>
      api.post<BulkResult>('/orders/bulk/delete', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useBulkDuplicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { orderIds: string[] }) =>
      api.post<DuplicateResult>('/orders/bulk/duplicate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useBulkResetAmount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { orderIds: string[] }) =>
      api.post<BulkResult>('/orders/bulk/reset-amount', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useBulkUpdateReceiptDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { orderIds: string[]; receiptDate: string }) =>
      api.post<BulkResult>('/orders/bulk/update-receipt-date', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useDataCleanup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { startDate: string; endDate: string; deleteThumbnails?: boolean }) =>
      api.post<{ success: number; deleted: number }>('/orders/bulk/data-cleanup', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// 주문 단위 원본 이미지 삭제
export function useDeleteOrderOriginals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      api.delete<{ totalDeletedCount: number; totalFreedMB: number }>(`/orders/${orderId}/originals`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// 원본 이미지 일괄 삭제
export function useBulkDeleteOriginals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { orderIds: string[] }) =>
      api.post<BulkResult>('/orders/bulk/delete-originals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// 반품 상태
export const RETURN_STATUS = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  COLLECTING: 'collecting',
  COLLECTED: 'collected',
  INSPECTING: 'inspecting',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

export const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: '반품신청',
  approved: '반품승인',
  collecting: '수거중',
  collected: '수거완료',
  inspecting: '검수중',
  completed: '반품완료',
  rejected: '반품거절',
};

// 반품 사유
export const RETURN_REASONS = {
  DEFECT: 'defect',
  WRONG_ITEM: 'wrong_item',
  DAMAGED: 'damaged',
  CUSTOMER_CHANGE: 'customer_change',
  OTHER: 'other',
} as const;

export const RETURN_REASON_LABELS: Record<string, string> = {
  defect: '제품 불량',
  wrong_item: '오배송',
  damaged: '배송중 파손',
  customer_change: '고객 변심',
  other: '기타',
};

// 반품 타입
export const RETURN_TYPES = {
  RETURN: 'return',
  EXCHANGE: 'exchange',
} as const;

export const RETURN_TYPE_LABELS: Record<string, string> = {
  return: '반품',
  exchange: '교환',
};

// 반품 아이템 타입
export interface ReturnRequestItem {
  id: string;
  returnRequestId: string;
  orderItemId: string;
  quantity: number;
  reason?: string;
  condition?: string;
  orderItem?: {
    id: string;
    productName: string;
    size: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  };
}

// 반품 이력 타입
export interface ReturnHistory {
  id: string;
  returnRequestId: string;
  fromStatus?: string;
  toStatus: string;
  processType: string;
  note?: string;
  processedBy: string;
  processedAt: string;
}

// 반품 요청 타입
export interface ReturnRequest {
  id: string;
  returnNumber: string;
  orderId: string;
  clientId: string;
  type: string;
  status: string;
  reason: string;
  reasonDetail?: string;
  shippingFeeChargedTo?: string;
  returnShippingFee?: number;
  returnCourierCode?: string;
  returnTrackingNumber?: string;
  returnShippedAt?: string;
  returnDeliveredAt?: string;
  exchangeCourierCode?: string;
  exchangeTrackingNumber?: string;
  exchangeShippedAt?: string;
  exchangeDeliveredAt?: string;
  refundAmount?: number;
  refundMethod?: string;
  refundedAt?: string;
  goodsflowReturnId?: string;
  goodsflowStatus?: string;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  completedBy?: string;
  completedAt?: string;
  rejectedReason?: string;
  adminMemo?: string;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
  };
  items: ReturnRequestItem[];
  history: ReturnHistory[];
}

// 페이지네이션 응답
export interface PaginatedReturnResponse {
  data: ReturnRequest[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Query Keys
const RETURN_REQUESTS_KEY = 'return-requests';

// 반품 목록 조회
export function useReturnRequests(params?: {
  clientId?: string;
  orderId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [RETURN_REQUESTS_KEY, params],
    queryFn: () =>
      api.get<PaginatedReturnResponse>('/return-requests', params),
    enabled: !params?.clientId || !!params.clientId,
  });
}

// 주문별 반품 목록 조회
export function useReturnRequestsByOrder(orderId?: string) {
  return useQuery({
    queryKey: [RETURN_REQUESTS_KEY, 'by-order', orderId],
    queryFn: () =>
      api.get<ReturnRequest[]>(`/orders/${orderId}/return-requests`),
    enabled: !!orderId,
  });
}

// 단일 반품 조회
export function useReturnRequest(id?: string) {
  return useQuery({
    queryKey: [RETURN_REQUESTS_KEY, id],
    queryFn: () => api.get<ReturnRequest>(`/return-requests/${id}`),
    enabled: !!id,
  });
}

// 반품 이력 조회
export function useReturnHistory(id?: string) {
  return useQuery({
    queryKey: [RETURN_REQUESTS_KEY, id, 'history'],
    queryFn: () => api.get<ReturnHistory[]>(`/return-requests/${id}/history`),
    enabled: !!id,
  });
}

// 반품 신청
export function useCreateReturnRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: {
        type: string;
        reason: string;
        reasonDetail?: string;
        items: { orderItemId: string; quantity: number; reason?: string; condition?: string }[];
      };
    }) => api.post<ReturnRequest>(`/orders/${orderId}/return-request`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [RETURN_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId] });
    },
  });
}

// 반품 승인
export function useApproveReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        shippingFeeChargedTo?: string;
        returnShippingFee?: number;
        adminMemo?: string;
      };
    }) => api.patch<ReturnRequest>(`/return-requests/${id}/approve`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [RETURN_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [RETURN_REQUESTS_KEY, variables.id] });
    },
  });
}

// 반품 거절
export function useRejectReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { rejectedReason: string };
    }) => api.patch<ReturnRequest>(`/return-requests/${id}/reject`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [RETURN_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [RETURN_REQUESTS_KEY, variables.id] });
    },
  });
}

// 반품 운송장 입력
export function useUpdateReturnTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { courierCode: string; trackingNumber: string };
    }) => api.patch<ReturnRequest>(`/return-requests/${id}/tracking`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [RETURN_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [RETURN_REQUESTS_KEY, variables.id] });
    },
  });
}

// 반품 완료 처리
export function useCompleteReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.patch<ReturnRequest>(`/return-requests/${id}/complete`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [RETURN_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [RETURN_REQUESTS_KEY, id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// 교환 재발송 등록
export function useExchangeShip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { courierCode: string; trackingNumber: string };
    }) => api.patch<ReturnRequest>(`/return-requests/${id}/exchange-ship`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [RETURN_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [RETURN_REQUESTS_KEY, variables.id] });
    },
  });
}

// 반품 상태 변경
export function useUpdateReturnStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: string;
      note?: string;
    }) => api.patch<ReturnRequest>(`/return-requests/${id}/status`, { status, note }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [RETURN_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [RETURN_REQUESTS_KEY, variables.id] });
    },
  });
}

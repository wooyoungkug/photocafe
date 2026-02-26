'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// 수리 상태
export const RETURN_STATUS = {
  REQUESTED: 'requested',
  COLLECTING: 'collecting',
  COLLECTED: 'collected',
  INSPECTING: 'inspecting',
  COMPLETED: 'completed',
} as const;

export const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: '수리신청',
  collecting: '수거중',
  collected: '수거완료',
  inspecting: '검수중',
  completed: '수리완료',
};

// 앨범수리 사유
export const REPAIR_REASONS = {
  PAGE_REPLACE: 'page_replace',
  COVER_REPAIR: 'cover_repair',
  INNER_REPAIR: 'inner_repair',
  SHIPPING_DAMAGE: 'shipping_damage',
} as const;

export const REPAIR_REASON_LABELS: Record<string, string> = {
  page_replace: '페이지교체 (유상)',
  cover_repair: '표지수리 (무상)',
  inner_repair: '내지수리 (무상)',
  shipping_damage: '배송중파손 (무상)',
};

// 유상/무상 여부
export const REPAIR_REASON_PAID: Record<string, boolean> = {
  page_replace: true,
  cover_repair: false,
  inner_repair: false,
  shipping_damage: false,
};

// 모든 사유 라벨
export const ALL_REASON_LABELS: Record<string, string> = {
  ...REPAIR_REASON_LABELS,
};

// 반품 타입
export const RETURN_TYPES = {
  ALBUM_REPAIR: 'album_repair',
} as const;

export const RETURN_TYPE_LABELS: Record<string, string> = {
  album_repair: '앨범수리(재발송)',
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
  requestedBy: string;
  completedBy?: string;
  completedAt?: string;
  repairPages?: { pageNumber: number; fileName: string; fileUrl: string; thumbnailUrl?: string; isCompanion?: boolean }[];
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

// 앨범수리 신청
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
        repairPages?: { pageNumber: number; fileName: string; fileUrl: string; thumbnailUrl?: string; isCompanion?: boolean }[];
      };
    }) => api.post<ReturnRequest>(`/orders/${orderId}/return-request`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [RETURN_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId] });
    },
  });
}

// 수리 운송장 입력
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

// 수리 완료 처리
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

// 수리 상태 변경
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

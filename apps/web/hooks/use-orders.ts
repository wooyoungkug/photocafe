'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// 주문 상태
export const ORDER_STATUS = {
  PENDING_RECEIPT: 'pending_receipt',
  RECEIPT_COMPLETED: 'receipt_completed',
  IN_PRODUCTION: 'in_production',
  READY_FOR_SHIPPING: 'ready_for_shipping',
  SHIPPED: 'shipped',
  CANCELLED: 'cancelled',
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_receipt: '접수대기',
  receipt_completed: '접수완료',
  in_production: '생산진행',
  ready_for_shipping: '배송준비',
  shipped: '배송완료',
  cancelled: '취소',
};

// 주문 파일 타입
export interface OrderFile {
  id: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  pageRange: string;
  pageStart: number;
  pageEnd: number;
  width: number;
  height: number;
  widthInch: number;
  heightInch: number;
  dpi: number;
  fileSize: number;
  sortOrder: number;
}

// 주문 항목 타입
export interface OrderItem {
  id: string;
  productionNumber: string;
  productId: string;
  productName: string;
  size: string;
  pages: number;
  printMethod: string;
  paper: string;
  bindingType: string;
  coverMaterial?: string;
  foilName?: string;
  foilColor?: string;
  foilPosition?: string;
  finishingOptions: string[];
  fabricName?: string;
  folderName?: string;
  thumbnailUrl?: string;
  totalFileSize?: number;
  pageLayout?: string;
  bindingDirection?: string;
  originalsDeleted?: boolean;
  pdfStatus?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  files: OrderFile[];
}

// 배송 정보 타입
export interface OrderShipping {
  id: string;
  recipientName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail?: string;
  courierCode?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

// 공정 이력 타입
export interface ProcessHistory {
  id: string;
  fromStatus?: string;
  toStatus: string;
  processType: string;
  note?: string;
  processedBy: string;
  processedByName?: string;
  processedAt: string;
}

// 주문 타입
export interface Order {
  id: string;
  orderNumber: string;
  barcode: string;
  clientId: string;
  client: {
    id: string;
    clientCode: string;
    clientName: string;
    assignedStaff?: { staff: { id: string; name: string } }[];
  };
  productPrice: number;
  shippingFee: number;
  tax: number;
  totalAmount: number;
  finalAmount: number;
  paymentMethod: string;
  isUrgent: boolean;
  isDuplicateOverride?: boolean;
  requestedDeliveryDate?: string;
  customerMemo?: string;
  productMemo?: string;
  adminMemo?: string;
  status: string;
  currentProcess: string;
  orderedAt: string;
  items: OrderItem[];
  shipping: OrderShipping;
  processHistory: ProcessHistory[];
}

// 주문 생성 DTO
export interface CreateOrderDto {
  clientId: string;
  paymentMethod?: string;
  isUrgent?: boolean;
  requestedDeliveryDate?: Date;
  customerMemo?: string;
  productMemo?: string;
  items: {
    productId: string;
    productName: string;
    size: string;
    pages: number;
    printMethod: string;
    paper: string;
    bindingType: string;
    coverMaterial?: string;
    foilName?: string;
    foilColor?: string;
    foilPosition?: string;
    finishingOptions?: string[];
    quantity: number;
    unitPrice: number;
    // 앨범 주문 추가 필드
    colorMode?: string;
    pageLayout?: string;
    bindingDirection?: string;
    fabricName?: string;
    folderName?: string;
    fileCount?: number;
  }[];
  shipping: {
    recipientName: string;
    phone: string;
    postalCode: string;
    address: string;
    addressDetail?: string;
  };
}

// 페이지네이션 응답
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Query Keys
const ORDERS_KEY = 'orders';

// 주문 목록 조회
export function useOrders(params?: {
  page?: number;
  limit?: number;
  search?: string;
  clientId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  isUrgent?: boolean;
}) {
  return useQuery({
    queryKey: [ORDERS_KEY, params],
    queryFn: () => api.get<PaginatedResponse<Order>>('/orders', params),
  });
}

// 내 주문 목록 조회 (거래처별)
export function useMyOrders(clientId?: string, params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: [ORDERS_KEY, 'my', clientId, params],
    queryFn: () => api.get<PaginatedResponse<Order>>('/orders', {
      ...params,
      clientId,
    }),
    enabled: !!clientId,
  });
}

// 단일 주문 조회
export function useOrder(id: string) {
  return useQuery({
    queryKey: [ORDERS_KEY, id],
    queryFn: () => api.get<Order>(`/orders/${id}`),
    enabled: !!id,
  });
}

// 주문 생성
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrderDto) => api.post<Order>('/orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    },
  });
}

// 주문 상태 변경
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, currentProcess, note }: {
      id: string;
      status: string;
      currentProcess?: string;
      note?: string;
    }) => api.patch<Order>(`/orders/${id}/status`, { status, currentProcess, note }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, variables.id] });
    },
  });
}

// 주문 취소
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post<Order>(`/orders/${id}/cancel`, { reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, variables.id] });
    },
  });
}

// 관리자 금액/수량 조정
export interface AdjustOrderData {
  adjustmentAmount?: number;
  adjustmentReason?: string;
  itemUpdates?: {
    itemId: string;
    quantity?: number;
    unitPrice?: number;
    pageLayout?: string;
    bindingDirection?: string;
    fabricName?: string;
  }[];
}

export function useAdjustOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdjustOrderData }) =>
      api.patch<Order>(`/orders/${id}/adjust`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, variables.id] });
    },
  });
}

// 주문 상태별 카운트
export function useOrderStatusCounts() {
  return useQuery({
    queryKey: [ORDERS_KEY, 'status-counts'],
    queryFn: () => api.get<Record<string, number>>('/orders/status-counts'),
  });
}

// 주문 공정 이력 조회 (이름 포함)
export function useOrderHistory(orderId: string | null) {
  return useQuery({
    queryKey: [ORDERS_KEY, orderId, 'history'],
    queryFn: () => api.get<ProcessHistory[]>(`/orders/${orderId}/history`),
    enabled: !!orderId,
  });
}

// ==================== 파일검수 관련 ====================

// 검수 시작
export function useStartInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      api.post(`/api/v1/orders/${orderId}/start-inspection`, {}),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, orderId] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    },
  });
}

// 파일 검수 (승인/거부)
export function useInspectFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      fileId,
      inspectionStatus,
      inspectionNote,
    }: {
      orderId: string;
      fileId: string;
      inspectionStatus: 'approved' | 'rejected';
      inspectionNote?: string;
    }) =>
      api.patch(`/api/v1/orders/${orderId}/files/${fileId}/inspect`, {
        inspectionStatus,
        inspectionNote,
      }),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, orderId] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    },
  });
}

// 검수 보류
export function useHoldInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      reason,
      sendSms = true,
    }: {
      orderId: string;
      reason: string;
      sendSms?: boolean;
    }) => api.post(`/api/v1/orders/${orderId}/hold-inspection`, { reason, sendSms }),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, orderId] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    },
  });
}

// 검수 완료
export function useCompleteInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, note }: { orderId: string; note?: string }) =>
      api.post(`/api/v1/orders/${orderId}/complete-inspection`, { note }),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, orderId] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    },
  });
}

// 해당 상품의 최근 주문 옵션 조회
export interface LastProductOptions {
  bindingType: string;
  paper: string;
  printMethod: string;
  coverMaterial?: string | null;
  foilName?: string | null;
  foilColor?: string | null;
  foilPosition?: string | null;
  finishingOptions: string[];
  fabricName?: string | null;
  fabricSnapshot?: {
    id: string;
    code?: string;
    name: string;
    thumbnailUrl?: string | null;
    basePrice?: number;
    category?: string;
    colorCode?: string | null;
    colorName?: string | null;
  } | null;
}

export function useLastProductOptions(clientId?: string, productId?: string) {
  return useQuery({
    queryKey: [ORDERS_KEY, 'last-product-options', clientId, productId],
    queryFn: () =>
      api.get<LastProductOptions | null>('/orders/last-product-options', {
        clientId,
        productId,
      }),
    enabled: !!clientId && !!productId,
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
}

// ==================== 일자별 주문/입금 집계 ====================

export interface DailyOrderSummary {
  date: string;
  orderCount: number;
  orderAmount: number;
  depositAmount: number;
}

export interface DailyOrderSummaryResponse {
  data: DailyOrderSummary[];
  summary: {
    carryForwardBalance: number;
    totalOrders: number;
    totalOrderAmount: number;
    totalDepositAmount: number;
    totalOutstanding: number;
    closingBalance: number;
  };
}

export function useDailyOrderSummary(params: {
  startDate: string;
  endDate: string;
  clientId?: string;
}) {
  return useQuery({
    queryKey: [ORDERS_KEY, 'daily-summary', params],
    queryFn: () =>
      api.get<DailyOrderSummaryResponse>('/orders/daily-summary', params),
    enabled: !!params.clientId,
  });
}

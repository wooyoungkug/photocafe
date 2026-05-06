'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
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
  ready_for_shipping: '제작완료',
  shipped: '거래완료',
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
  /** 작업지시서 출력(또는 출력완료 확인) 기록 시각 — 있으면 확인 열에 「지시서」 */
  slipAutoPrintedAt?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  files: OrderFile[];
  // 관리자 사양 편집 (2026-05-01) — 백엔드 OrderItem 모델 직접 노출
  colorIntentId?: string;
  printSide?: 'single' | 'double' | 'spread' | string;
  fileSpecId?: string;
  nup?: string | null;
}

// 배송 정보 타입
export interface OrderShipping {
  id: string;
  senderType?: string;
  senderName?: string;
  senderPhone?: string;
  senderPostalCode?: string;
  senderAddress?: string;
  senderAddressDetail?: string;
  receiverType?: string;
  recipientName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail?: string;
  deliveryMethod?: string;
  deliveryFee?: number;
  deliveryFeeType?: string;
  fareType?: string;
  deliveryMemo?: string;
  courierCode?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  bundleId?: string;
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
    assignedManager?: string | null;
    managerName?: string | null;
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
  createdAt?: string;
  items: OrderItem[];
  shipping: OrderShipping;
  processHistory: ProcessHistory[];
  salesLedger?: {
    id: string;
    receivedAmount: number;
    outstandingAmount: number;
    paymentStatus: string;
    totalAmount: number;
  };
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
    fileSpecId?: string;
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
    total: number | null;
    page: number | null;
    limit: number;
    totalPages: number | null;
    hasMore?: boolean;
    nextCursor?: string | null;
  };
}

// Query Keys
const ORDERS_KEY = 'orders';

// 주문 목록 조회 (offset 페이지네이션, 기존 호환)
export function useOrders(params?: {
  page?: number;
  limit?: number;
  search?: string;
  clientId?: string;
  status?: string;
  /** 관리자 주문목록 세부 공정 탭 — 지정 시 status 보다 우선 (API) */
  productionStage?: string;
  startDate?: string;
  endDate?: string;
  isUrgent?: boolean;
}) {
  return useQuery({
    queryKey: [ORDERS_KEY, params],
    queryFn: () => api.get<PaginatedResponse<Order>>('/orders', params),
  });
}

// 주문 목록 무한스크롤 (cursor 기반)
export function useInfiniteOrders(params?: {
  limit?: number;
  search?: string;
  clientId?: string;
  status?: string;
  productionStage?: string;
  startDate?: string;
  endDate?: string;
  isUrgent?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: [ORDERS_KEY, 'infinite', params],
    queryFn: ({ pageParam }) =>
      api.get<PaginatedResponse<Order>>('/orders', {
        ...params,
        cursor: pageParam || undefined,
        limit: params?.limit ?? 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
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

/** 접수완료 후 브라우저에서 지시서를 출력한 뒤 서버에 완료 기록 (PDF 완료 후에만 가능) */
export function useConfirmOrderItemSlipPrinted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      api.patch<{ ok: boolean; reason?: string }>(`/orders/items/${itemId}/slip-printed`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
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

// ==================== 편집 + 메시지/감사 ====================

// 주문 편집 시 통과해야 하는 재출력 단계 — 본 상태에서 사양 변경 시 ReprintConfirmDialog로 인터셉트
export const ORDER_REPRINT_REQUIRED_STATUSES = [
  'printed',
  'ready_for_shipping',
  'reprint_requested',
  'reprint_in_production',
];

export interface EditOrderWithAuditPayload extends AdjustOrderData {
  message?: string;
  notifyOperator?: boolean;
  assignPrintOperatorId?: string | null;
}

// PATCH /orders/:id/edit-with-message — 사양 편집 + 메시지/담당자/알림 함께 전송
export function useEditOrderWithAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditOrderWithAuditPayload }) =>
      api.patch<Order>(`/orders/${id}/edit-with-message`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: ['order-edit-history', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'me'] });
    },
  });
}

// 재출력 요청 — POST /orders/:id/reprint
export interface ReprintItemInput {
  itemId: string;
  pages: number[];
  reason: string;
}

export interface ReprintRequestPayload {
  items: ReprintItemInput[];
  notifyOperator?: boolean;
  settlementMode?: 'append_pending';
}

export interface ReprintJobResult {
  id: string;
  orderId: string;
  status: string;
  totalAdditionalCost: number;
  createdAt: string;
}

export function useRequestReprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReprintRequestPayload }) =>
      api.post<ReprintJobResult>(`/orders/${id}/reprint`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: ['order-edit-history', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'me'] });
    },
  });
}

// 출력담당자 지정 — PATCH /orders/:id/print-operator
export function useSetPrintOperator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, operatorId }: { id: string; operatorId: string | null }) =>
      api.patch<Order>(`/orders/${id}/print-operator`, { operatorId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: ['order-edit-history', variables.id] });
    },
  });
}

// 편집 이력 조회 — GET /orders/:id/edit-history
export interface OrderEditHistoryChange {
  field: string;
  before: unknown;
  after: unknown;
  itemId?: string;
}

export interface OrderEditHistoryItem {
  id: string;
  orderId: string;
  editorId?: string;
  editor?: { id: string; name: string; staffId?: string };
  changedFields: OrderEditHistoryChange[] | null;
  message?: string | null;
  notifyOperator?: boolean;
  reprintJobId?: string | null;
  reprintJob?: ReprintJobResult | null;
  createdAt: string;
}

export interface OrderEditHistoryResponse {
  items: OrderEditHistoryItem[];
  nextCursor: string | null;
}

export function useOrderEditHistory(orderId: string | null, opts?: { limit?: number }) {
  const limit = opts?.limit ?? 20;
  return useInfiniteQuery({
    queryKey: ['order-edit-history', orderId, limit],
    queryFn: ({ pageParam }) =>
      api.get<OrderEditHistoryResponse>(`/orders/${orderId}/edit-history`, {
        limit,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!orderId,
  });
}

// 주문 상태별 카운트
export function useOrderStatusCounts() {
  return useQuery({
    queryKey: [ORDERS_KEY, 'status-counts'],
    queryFn: () => api.get<Record<string, number>>('/orders/status-counts'),
  });
}

// 공정단계별 주문 건수 (탭 카운트)
export function useProductionStageCounts(params?: { startDate?: string; endDate?: string; search?: string }) {
  return useQuery({
    queryKey: [ORDERS_KEY, 'production-stage-counts', params],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.startDate) qs.set('startDate', params.startDate);
      if (params?.endDate) qs.set('endDate', params.endDate);
      if (params?.search) qs.set('search', params.search);
      const query = qs.toString();
      return api.get<Record<string, number>>(`/orders/production-stage-counts${query ? `?${query}` : ''}`);
    },
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

/** 접수대기 주문: 항목별 개별 이미지 소프트 삭제 */
export function useDeleteOrderItemFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      fileId,
    }: {
      orderId: string;
      itemId: string;
      fileId: string;
    }) =>
      api.delete<{ message: string; fileId: string }>(
        `/api/v1/orders/${orderId}/items/${itemId}/files/${fileId}`,
      ),
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
      }).then(data => data ?? null),
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

export interface UpdateShippingPayload {
  orderId: string;
  // 발송인
  senderType?: string;
  senderName?: string;
  senderPhone?: string;
  senderPostalCode?: string;
  senderAddress?: string;
  senderAddressDetail?: string;
  // 수령인
  receiverType?: string;
  recipientName?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  // 배송
  deliveryMethod?: string;
  deliveryFee?: number;
  deliveryFeeType?: string;
  fareType?: string;
  deliveryMemo?: string;
  // 택배사/송장
  courierCode?: string;
  trackingNumber?: string;
}

// 배송 정보 업데이트 (전체 배송정보 수정)
export function useUpdateShipping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, ...rest }: UpdateShippingPayload) =>
      api.patch<OrderShipping>(`/orders/${orderId}/shipping`, rest),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['shipping'] });
    },
  });
}

// 고객용 배송정보 수정 + 배송비 정산
export interface UpdateShippingWithFeePayload {
  orderId: string;
  receiverType?: string;
  recipientName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail?: string;
  deliveryMemo?: string;
  paymentMethod?: string; // 'bank_transfer' | 'credit'
}

export interface UpdateShippingWithFeeResult {
  feeDifference: number;
  newShippingFee: number;
  creditAdded: number;
  paymentRequired: boolean;
  bankAccount?: string;
}

export function useUpdateShippingWithFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, ...rest }: UpdateShippingWithFeePayload) =>
      api.patch<UpdateShippingWithFeeResult>(`/orders/${orderId}/shipping-with-fee`, rest),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, variables.orderId] });
    },
  });
}

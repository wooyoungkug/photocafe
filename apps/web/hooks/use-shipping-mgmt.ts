'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Order, OrderShipping } from '@/hooks/use-orders';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 제작완료 주문 목록 응답 */
export interface ShippingReadyResponse {
  data: Order[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** 바코드 스캔 결과 */
export interface BarcodeScanResult {
  order: Order;
}

/** 묶음배송 후보 */
export interface BundleCandidate {
  recipientName: string;
  address: string;
  orders: Order[];
}

/** 묶음배송 감지 응답 */
export interface BundleDetectResponse {
  candidates: BundleCandidate[];
  totalBundleable: number;
}

/** 묶음배송 정보 */
export interface ShippingBundle {
  id: string;
  orders: Order[];
  recipientName: string;
  address: string;
  courierCode?: string;
  trackingNumber?: string;
  createdAt: string;
}

/** 일괄 송장 입력 항목 */
export interface BulkTrackingItem {
  orderId: string;
  courierCode: string;
  trackingNumber: string;
}

/** 운송장 PDF 생성 결과 */
export interface LabelGenerateResult {
  url: string;
  orderId: string;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

const SHIPPING_KEY = 'shipping';
const SHIPPING_READY_KEY = [SHIPPING_KEY, 'ready'];
const SHIPPING_BUNDLE_KEY = [SHIPPING_KEY, 'bundle'];

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** 제작완료 주문 목록 조회 */
export function useShippingReady(params?: {
  page?: number;
  limit?: number;
  search?: string;
  courierCode?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: [...SHIPPING_READY_KEY, params],
    queryFn: () =>
      api.get<ShippingReadyResponse>('/delivery/shipping/ready', params),
  });
}

/** 바코드로 주문 조회 */
export function useBarcodeScan(barcode: string) {
  return useQuery({
    queryKey: [SHIPPING_KEY, 'scan', barcode],
    queryFn: () =>
      api.get<BarcodeScanResult>(`/delivery/shipping/scan/${barcode}`),
    enabled: !!barcode && barcode.length > 0,
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** 묶음배송 후보 감지 */
export function useDetectBundles() {
  return useMutation({
    mutationFn: () =>
      api.post<BundleDetectResponse>('/delivery/shipping/bundle/detect'),
  });
}

/** 묶음배송 생성 */
export function useCreateBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { orderIds: string[] }) =>
      api.post<ShippingBundle>('/delivery/shipping/bundle', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHIPPING_READY_KEY });
      queryClient.invalidateQueries({ queryKey: SHIPPING_BUNDLE_KEY });
    },
  });
}

/** 묶음배송 해제 */
export function useDeleteBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bundleId: string) =>
      api.delete(`/delivery/shipping/bundle/${bundleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHIPPING_READY_KEY });
      queryClient.invalidateQueries({ queryKey: SHIPPING_BUNDLE_KEY });
    },
  });
}

/** 묶음 송장 등록 */
export function useUpdateBundleTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bundleId,
      courierCode,
      trackingNumber,
    }: {
      bundleId: string;
      courierCode: string;
      trackingNumber: string;
    }) =>
      api.patch<ShippingBundle>(
        `/delivery/shipping/bundle/${bundleId}/tracking`,
        { courierCode, trackingNumber }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHIPPING_READY_KEY });
      queryClient.invalidateQueries({ queryKey: SHIPPING_BUNDLE_KEY });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/** 다건 송장 일괄 입력 */
export function useBulkTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: BulkTrackingItem[]) =>
      api.patch<{ updated: number }>('/delivery/shipping/bulk-tracking', {
        items,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHIPPING_READY_KEY });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/** 운송장 PDF 생성 */
export function useGenerateLabel() {
  return useMutation({
    mutationFn: ({
      orderId,
      format,
    }: {
      orderId: string;
      format?: string;
    }) =>
      api.post<LabelGenerateResult>(
        `/delivery/label/generate/${orderId}${format ? `?format=${format}` : ''}`
      ),
  });
}

/** 운송장 PDF 다운로드 */
export function useDownloadLabel() {
  return useMutation({
    mutationFn: (orderId: string) =>
      api.downloadBlob(
        `/delivery/label/download/${orderId}`,
        `label-${orderId}.pdf`
      ),
  });
}

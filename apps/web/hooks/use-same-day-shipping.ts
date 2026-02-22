'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SameDayOrderWithFee {
  orderId: string;
  orderNumber: string;
  shippingFee: number;
}

export interface SameDayShippingInfo {
  applicable: boolean;
  totalProductAmount: number;
  totalShippingCharged: number;
  /** 원래 청구된 배송비 총액 (환불 전) */
  totalShippingOriginal: number;
  /** 이미 환불 처리된 배송비 금액 */
  totalShippingRefunded: number;
  freeThreshold: number;
  ordersWithFee: SameDayOrderWithFee[];
}

/**
 * 당일 합배송 현황 조회
 * - 동일 거래처의 오늘 접수 주문 합산 금액 및 이미 청구된 배송비 확인
 * - 합산이 무료배송 기준 이상이면 기존 주문 배송비가 환불됨 (주문 생성 시 자동 적용)
 */
export function useSameDayShipping(clientId?: string | null) {
  return useQuery<SameDayShippingInfo>({
    queryKey: ['same-day-shipping', clientId],
    queryFn: () => api.get<SameDayShippingInfo>('/orders/same-day-shipping', { clientId: clientId! }),
    enabled: !!clientId,
    staleTime: 30_000, // 30초 캐시 (주문 페이지에서 자주 바뀔 수 있음)
  });
}

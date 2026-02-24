'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface TrackingDetail {
  status: string;
  level: number;
  location: string;
  time: string;
}

export interface TrackingInfo {
  courierName: string;
  invoiceNo: string;
  level: number;
  isDelivered: boolean;
  details: TrackingDetail[];
}

export interface CourierInfo {
  code: string;
  name: string;
}

export function useDeliveryTracking(courierCode?: string, trackingNumber?: string) {
  return useQuery({
    queryKey: ['tracking', courierCode, trackingNumber],
    queryFn: () =>
      api.get<TrackingInfo>('/delivery/tracking', { courierCode, trackingNumber }),
    enabled: !!courierCode && !!trackingNumber,
    staleTime: 1000 * 60 * 5, // 5분 캐시
    retry: false,
  });
}

export function useCourierList() {
  return useQuery({
    queryKey: ['couriers'],
    queryFn: () => api.get<CourierInfo[]>('/delivery/couriers'),
    staleTime: Infinity,
  });
}

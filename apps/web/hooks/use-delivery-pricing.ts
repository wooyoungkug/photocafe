'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ==================== 타입 정의 ====================

export const DELIVERY_METHODS = ['parcel', 'motorcycle', 'damas', 'freight'] as const;
export type DeliveryMethod = typeof DELIVERY_METHODS[number];

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  parcel: '택배',
  motorcycle: '오토바이(퀵)',
  damas: '다마스',
  freight: '화물',
};

export interface DistanceRange {
  minDistance: number;
  maxDistance: number;
  price: number;
}

export interface SizeRange {
  name: string;
  maxWeight?: number;
  maxVolume?: number;
  price: number;
}

export interface DeliveryPricing {
  id: string;
  deliveryMethod: DeliveryMethod;
  name: string;
  baseFee: number;
  packagingFee?: number; // 포장비 (택배 전용)
  shippingFee?: number; // 배송비 (택배 전용)
  distanceRanges?: DistanceRange[];
  extraPricePerKm?: number;
  maxBaseDistance?: number;
  nightSurchargeRate?: number;
  nightStartHour?: number;
  nightEndHour?: number;
  weekendSurchargeRate?: number;
  sizeRanges?: SizeRange[];
  islandFee?: number;
  freeThreshold?: number;
  sortOrder: number;
  isActive: boolean;
}

export interface CalculateDeliveryFeeParams {
  deliveryMethod: DeliveryMethod;
  distance?: number;
  weight?: number;
  volume?: number;
  orderAmount?: number;
  isIsland?: boolean;
  isNight?: boolean;
  isWeekend?: boolean;
}

export interface DeliveryFeeResult {
  baseFee: number;
  distanceFee: number;
  surchargeFee: number;
  extraFee: number;
  totalFee: number;
  isFree: boolean;
  breakdown?: {
    distanceRange?: string;
    surchargeRate?: number;
    surchargeType?: string;
  };
}

// ==================== 훅 ====================

export function useDeliveryPricings() {
  return useQuery<DeliveryPricing[]>({
    queryKey: ['delivery-pricings'],
    queryFn: () => api.get<DeliveryPricing[]>('/delivery-pricing'),
  });
}

export function useDeliveryPricing(method: DeliveryMethod) {
  return useQuery<DeliveryPricing>({
    queryKey: ['delivery-pricing', method],
    queryFn: () => api.get<DeliveryPricing>(`/delivery-pricing/${method}`),
    enabled: !!method,
  });
}

export function useCreateDeliveryPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: Partial<DeliveryPricing>) => api.post<DeliveryPricing>('/delivery-pricing', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-pricings'] });
    },
  });
}

export function useUpdateDeliveryPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ method, dto }: { method: DeliveryMethod; dto: Partial<DeliveryPricing> }) =>
      api.put<DeliveryPricing>(`/delivery-pricing/${method}`, dto),
    onSuccess: (_, { method }) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-pricings'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-pricing', method] });
    },
  });
}

export function useDeleteDeliveryPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (method: DeliveryMethod) => api.delete(`/delivery-pricing/${method}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-pricings'] });
    },
  });
}

export function useCalculateDeliveryFee() {
  return useMutation({
    mutationFn: (params: CalculateDeliveryFeeParams) =>
      api.post<DeliveryFeeResult>('/delivery-pricing/calculate', params),
  });
}

export function useInitializeDeliveryPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<{ message: string }>('/delivery-pricing/initialize'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-pricings'] });
    },
  });
}

// ==================== 네이버 지도 API 훅 ====================

export interface GeocodingResult {
  success: boolean;
  message?: string;
  data?: {
    address: string;
    roadAddress?: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
}

export interface DistanceResult {
  success: boolean;
  message?: string;
  data?: {
    distance: number;
    distanceText: string;
    duration: number;
    durationText: string;
    tollFare: number;
    fuelPrice: number;
  };
}

export interface AddressDeliveryFeeResult {
  success: boolean;
  message?: string;
  data?: {
    route: {
      start: string;
      goal: string;
      distance: number;
      distanceText: string;
      duration: number;
      durationText: string;
    };
    fee: {
      baseFee: number;
      distanceFee: number;
      surcharge: number;
      totalFee: number;
      breakdown: {
        distanceRange?: string;
        surchargeType?: string;
        surchargeRate?: number;
      };
    };
    deliveryMethod: string;
    deliveryMethodLabel: string;
  };
}

/**
 * 주소를 좌표로 변환 (Geocoding)
 */
export function useGeocode() {
  return useMutation({
    mutationFn: (address: string) =>
      api.get<GeocodingResult>('/delivery-pricing/geocode', { address }),
  });
}

/**
 * 두 주소 간 거리 계산
 */
export function useCalculateDistance() {
  return useMutation({
    mutationFn: (params: { startAddress: string; goalAddress: string }) =>
      api.post<DistanceResult>('/delivery-pricing/distance', params),
  });
}

/**
 * 주소 기반 배송비 자동 계산
 */
export function useCalculateDeliveryFeeByAddress() {
  return useMutation({
    mutationFn: (params: {
      startAddress: string;
      goalAddress: string;
      deliveryMethod: 'motorcycle' | 'damas' | 'freight';
      isNight?: boolean;
      isWeekend?: boolean;
    }) => api.post<AddressDeliveryFeeResult>('/delivery-pricing/calculate-by-address', params),
  });
}

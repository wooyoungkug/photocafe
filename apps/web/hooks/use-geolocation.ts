'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ==================== 타입 정의 ====================

/** 위치 좌표 */
export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

/** Geolocation 훅 상태 */
export interface GeolocationState {
  position: GeoPosition | null;
  error: string | null;
  isLoading: boolean;
  isSupported: boolean;
}

/** Geofencing 상태 */
export interface GeofencingState {
  isWithinArrival: boolean;
  isWithinDeparture: boolean;
  distance: number | null; // 미터 단위
}

/** 위치 로그 */
export interface LocationLog {
  id: string;
  shootingId: string;
  photographerId: string;
  photographerName?: string;
  type: 'check_in' | 'check_out' | 'periodic';
  latitude: number;
  longitude: number;
  accuracy?: number;
  distanceFromVenue?: number; // 촬영장소로부터의 거리 (미터)
  note?: string;
  createdAt: string;
}

/** 위치 로그 생성 DTO */
export interface CreateLocationLogDto {
  type: 'check_in' | 'check_out' | 'periodic';
  latitude: number;
  longitude: number;
  accuracy?: number;
  note?: string;
}

// ==================== Haversine 유틸 ====================

const EARTH_RADIUS_METERS = 6_371_000;

/** 각도를 라디안으로 변환 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Haversine 공식으로 두 좌표 간의 거리를 계산합니다.
 * @param lat1 - 시작점 위도
 * @param lng1 - 시작점 경도
 * @param lat2 - 도착점 위도
 * @param lng2 - 도착점 경도
 * @returns 거리 (미터 단위)
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

// ==================== Query Keys ====================

const SHOOTINGS_KEY = 'shootings';
const LOCATION_KEY = 'location';

// ==================== API Hooks ====================

/** 촬영 위치 로그 조회 */
export function useShootingLocation(shootingId: string) {
  return useQuery({
    queryKey: [SHOOTINGS_KEY, shootingId, LOCATION_KEY],
    queryFn: () => api.get<LocationLog[]>(`/shootings/${shootingId}/location`),
    enabled: !!shootingId,
  });
}

/** 위치 체크인/체크아웃 로그 생성 */
export function useCreateLocationLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shootingId,
      ...data
    }: { shootingId: string } & CreateLocationLogDto) =>
      api.post<LocationLog>(`/shootings/${shootingId}/location`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SHOOTINGS_KEY, variables.shootingId, LOCATION_KEY],
      });
    },
  });
}

// ==================== 브라우저 Geolocation Hooks ====================

/** navigator.geolocation.watchPosition() 래퍼 훅 */
export function useGeolocation(options?: PositionOptions): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: true,
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  });

  const watchIdRef = useRef<number | null>(null);

  const defaultOptions: PositionOptions = useMemo(
    () => ({
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 5_000,
      ...options,
    }),
    // options 객체의 개별 속성만 비교
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options?.enableHighAccuracy, options?.timeout, options?.maximumAge],
  );

  const handleSuccess = useCallback((geoPosition: GeolocationPosition) => {
    setState({
      position: {
        latitude: geoPosition.coords.latitude,
        longitude: geoPosition.coords.longitude,
        accuracy: geoPosition.coords.accuracy,
        timestamp: geoPosition.timestamp,
      },
      error: null,
      isLoading: false,
      isSupported: true,
    });
  }, []);

  const handleError = useCallback((geoError: GeolocationPositionError) => {
    let errorMessage: string;

    switch (geoError.code) {
      case geoError.PERMISSION_DENIED:
        errorMessage = '위치 정보 접근 권한이 거부되었습니다.';
        break;
      case geoError.POSITION_UNAVAILABLE:
        errorMessage = '위치 정보를 사용할 수 없습니다.';
        break;
      case geoError.TIMEOUT:
        errorMessage = '위치 정보 요청 시간이 초과되었습니다.';
        break;
      default:
        errorMessage = '알 수 없는 위치 오류가 발생했습니다.';
    }

    setState((prev) => ({
      ...prev,
      error: errorMessage,
      isLoading: false,
    }));
  }, []);

  useEffect(() => {
    if (!state.isSupported) {
      setState((prev) => ({
        ...prev,
        error: '이 브라우저는 위치 정보를 지원하지 않습니다.',
        isLoading: false,
      }));
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      defaultOptions,
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [state.isSupported, handleSuccess, handleError, defaultOptions]);

  return state;
}

/**
 * Geofencing 훅 - 목표 지점까지의 거리 기반 도착/이탈 판정
 * @param targetLat - 목표 위도
 * @param targetLng - 목표 경도
 * @param arrivalRadius - 도착 판정 반경 (미터, 기본값: 200)
 * @param departureRadius - 이탈 판정 반경 (미터, 기본값: 500)
 */
export function useGeofencing(
  targetLat: number,
  targetLng: number,
  arrivalRadius: number = 200,
  departureRadius: number = 500,
): GeolocationState & GeofencingState {
  const geolocation = useGeolocation();

  const geofencing = useMemo<GeofencingState>(() => {
    if (!geolocation.position) {
      return {
        isWithinArrival: false,
        isWithinDeparture: false,
        distance: null,
      };
    }

    const distance = calculateHaversineDistance(
      geolocation.position.latitude,
      geolocation.position.longitude,
      targetLat,
      targetLng,
    );

    return {
      isWithinArrival: distance <= arrivalRadius,
      isWithinDeparture: distance <= departureRadius,
      distance: Math.round(distance), // 소수점 버림
    };
  }, [
    geolocation.position,
    targetLat,
    targetLng,
    arrivalRadius,
    departureRadius,
  ]);

  return {
    ...geolocation,
    ...geofencing,
  };
}

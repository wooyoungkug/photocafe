import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodingResult {
  address: string;
  roadAddress?: string;
  coordinates: Coordinates;
}

export interface DirectionsResult {
  distance: number; // 미터
  duration: number; // 밀리초
  distanceKm: number; // 킬로미터
  durationMinutes: number; // 분
  tollFare: number; // 톨게이트 요금
  fuelPrice: number; // 연료비
  path?: [number, number][]; // 경로 좌표
}

export interface DeliveryFeeCalculation {
  distance: number; // km
  duration: number; // 분
  baseFee: number;
  distanceFee: number;
  surcharge: number;
  totalFee: number;
  breakdown: {
    distanceRange?: string;
    surchargeType?: string;
    surchargeRate?: number;
  };
}

@Injectable()
export class NaverMapService {
  private readonly logger = new Logger(NaverMapService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl = 'https://naveropenapi.apigw.ntruss.com';

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('NAVER_MAP_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('NAVER_MAP_CLIENT_SECRET') || '';
  }

  /**
   * 주소를 좌표로 변환 (Geocoding)
   */
  async geocode(address: string): Promise<GeocodingResult | null> {
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn('네이버 지도 API 키가 설정되지 않았습니다.');
      return null;
    }

    try {
      const url = `${this.baseUrl}/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`;

      const response = await fetch(url, {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': this.clientId,
          'X-NCP-APIGW-API-KEY': this.clientSecret,
        },
      });

      if (!response.ok) {
        this.logger.error(`Geocoding API 에러: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data.status !== 'OK' || !data.addresses || data.addresses.length === 0) {
        this.logger.warn(`주소를 찾을 수 없습니다: ${address}`);
        return null;
      }

      const addr = data.addresses[0];
      return {
        address: addr.jibunAddress || address,
        roadAddress: addr.roadAddress,
        coordinates: {
          lat: parseFloat(addr.y),
          lng: parseFloat(addr.x),
        },
      };
    } catch (error) {
      this.logger.error(`Geocoding 실패: ${error.message}`);
      return null;
    }
  }

  /**
   * 두 지점 간 경로 및 거리 계산 (Directions 5)
   */
  async getDirections(
    start: Coordinates,
    goal: Coordinates,
    option: 'trafast' | 'tracomfort' | 'traoptimal' | 'traavoidtoll' | 'traavoidcaronly' = 'trafast'
  ): Promise<DirectionsResult | null> {
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn('네이버 지도 API 키가 설정되지 않았습니다.');
      return null;
    }

    try {
      const startStr = `${start.lng},${start.lat}`;
      const goalStr = `${goal.lng},${goal.lat}`;

      const url = `${this.baseUrl}/map-direction/v1/driving?start=${startStr}&goal=${goalStr}&option=${option}`;

      const response = await fetch(url, {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': this.clientId,
          'X-NCP-APIGW-API-KEY': this.clientSecret,
        },
      });

      if (!response.ok) {
        this.logger.error(`Directions API 에러: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data.code !== 0 || !data.route || !data.route[option]) {
        this.logger.warn(`경로를 찾을 수 없습니다`);
        return null;
      }

      const route = data.route[option][0];
      const summary = route.summary;

      return {
        distance: summary.distance, // 미터
        duration: summary.duration, // 밀리초
        distanceKm: Math.round(summary.distance / 100) / 10, // km (소수점 1자리)
        durationMinutes: Math.round(summary.duration / 60000), // 분
        tollFare: summary.tollFare || 0,
        fuelPrice: summary.fuelPrice || 0,
        path: route.path,
      };
    } catch (error) {
      this.logger.error(`Directions 실패: ${error.message}`);
      return null;
    }
  }

  /**
   * 주소로 거리 계산
   */
  async calculateDistanceByAddress(
    startAddress: string,
    goalAddress: string
  ): Promise<DirectionsResult | null> {
    const startGeo = await this.geocode(startAddress);
    if (!startGeo) {
      this.logger.error(`출발지 주소를 찾을 수 없습니다: ${startAddress}`);
      return null;
    }

    const goalGeo = await this.geocode(goalAddress);
    if (!goalGeo) {
      this.logger.error(`도착지 주소를 찾을 수 없습니다: ${goalAddress}`);
      return null;
    }

    return this.getDirections(startGeo.coordinates, goalGeo.coordinates);
  }

  /**
   * 거리 기반 배송비 계산
   */
  calculateDeliveryFee(
    distanceKm: number,
    distanceRanges: { minDistance: number; maxDistance: number; price: number }[],
    extraPricePerKm: number = 0,
    maxBaseDistance: number = 20,
    options?: {
      isNight?: boolean;
      isWeekend?: boolean;
      nightSurchargeRate?: number;
      weekendSurchargeRate?: number;
    }
  ): DeliveryFeeCalculation {
    // 거리 구간에 맞는 기본 요금 찾기
    let baseFee = 0;
    let matchedRange = '';

    // 정렬된 거리 구간에서 찾기
    const sortedRanges = [...distanceRanges].sort((a, b) => a.minDistance - b.minDistance);

    for (const range of sortedRanges) {
      if (distanceKm >= range.minDistance && distanceKm < range.maxDistance) {
        baseFee = range.price;
        matchedRange = `${range.minDistance}~${range.maxDistance}km`;
        break;
      }
    }

    // 구간을 벗어난 경우 마지막 구간 + 추가 요금
    if (!matchedRange && sortedRanges.length > 0) {
      const lastRange = sortedRanges[sortedRanges.length - 1];
      if (distanceKm >= lastRange.maxDistance) {
        baseFee = lastRange.price;
        matchedRange = `${lastRange.minDistance}~${lastRange.maxDistance}km`;
      }
    }

    // 기본 거리 초과분에 대한 추가 요금
    let distanceFee = 0;
    if (distanceKm > maxBaseDistance && extraPricePerKm > 0) {
      const extraDistance = distanceKm - maxBaseDistance;
      distanceFee = Math.ceil(extraDistance) * extraPricePerKm;
    }

    // 할증료 계산
    let surcharge = 0;
    let surchargeType = '';
    let surchargeRate = 0;

    const nightRate = options?.nightSurchargeRate || 0;
    const weekendRate = options?.weekendSurchargeRate || 0;

    if (options?.isNight && nightRate > 0) {
      surchargeRate += nightRate;
      surchargeType = '야간';
    }
    if (options?.isWeekend && weekendRate > 0) {
      surchargeRate += weekendRate;
      surchargeType = surchargeType ? `${surchargeType}+주말` : '주말';
    }

    if (surchargeRate > 0) {
      surcharge = Math.round((baseFee + distanceFee) * surchargeRate);
    }

    const totalFee = baseFee + distanceFee + surcharge;

    return {
      distance: distanceKm,
      duration: 0,
      baseFee,
      distanceFee,
      surcharge,
      totalFee,
      breakdown: {
        distanceRange: matchedRange,
        surchargeType: surchargeType || undefined,
        surchargeRate: surchargeRate || undefined,
      },
    };
  }
}

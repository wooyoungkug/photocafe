import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodingResult {
  address: string;
  roadAddress?: string;
  coordinates: Coordinates;
}

interface DirectionsResult {
  distanceKm: number;
  durationMinutes: number;
}

interface DeliveryFeeCalculation {
  baseFee: number;
  distanceFee: number;
  surcharge: number;
  totalFee: number;
  breakdown: string;
}

@Injectable()
export class KakaoMapService {
  private readonly logger = new Logger(KakaoMapService.name);
  private readonly kakaoRestApiKey: string;

  constructor(private configService: ConfigService) {
    this.kakaoRestApiKey = this.configService.get<string>('KAKAO_REST_API_KEY') || '';

    if (!this.kakaoRestApiKey) {
      this.logger.warn('KAKAO_REST_API_KEY가 설정되지 않았습니다.');
    }
  }

  /**
   * 주소를 좌표로 변환 (Geocoding)
   * https://developers.kakao.com/docs/latest/ko/local/dev-guide#address-coord
   */
  async geocode(address: string): Promise<GeocodingResult | null> {
    try {
      const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `KakaoAK ${this.kakaoRestApiKey}`,
        },
      });

      if (!response.ok) {
        this.logger.error(`Kakao Geocoding API error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (!data.documents || data.documents.length === 0) {
        // 주소 검색 실패 시 키워드 검색 시도
        return this.searchKeyword(address);
      }

      const result = data.documents[0];
      return {
        address: result.address?.address_name || address,
        roadAddress: result.road_address?.address_name,
        coordinates: {
          lat: parseFloat(result.y),
          lng: parseFloat(result.x),
        },
      };
    } catch (error) {
      this.logger.error('Geocoding failed:', error);
      return null;
    }
  }

  /**
   * 키워드로 장소 검색 (주소 검색 실패 시 대체)
   */
  async searchKeyword(keyword: string): Promise<GeocodingResult | null> {
    try {
      const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `KakaoAK ${this.kakaoRestApiKey}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (!data.documents || data.documents.length === 0) {
        return null;
      }

      const result = data.documents[0];
      return {
        address: result.address_name || keyword,
        roadAddress: result.road_address_name,
        coordinates: {
          lat: parseFloat(result.y),
          lng: parseFloat(result.x),
        },
      };
    } catch (error) {
      this.logger.error('Keyword search failed:', error);
      return null;
    }
  }

  /**
   * 두 좌표 간 자동차 경로 탐색
   * https://developers.kakao.com/docs/latest/ko/kakaonavi/dev-guide
   *
   * 카카오 모빌리티 API (길찾기)
   */
  async getDirections(
    start: Coordinates,
    goal: Coordinates,
  ): Promise<DirectionsResult | null> {
    try {
      // 카카오 모빌리티 길찾기 API
      const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${start.lng},${start.lat}&destination=${goal.lng},${goal.lat}&priority=RECOMMEND`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `KakaoAK ${this.kakaoRestApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.error(`Kakao Directions API error: ${response.status}`);
        // API 실패 시 직선거리로 대체
        return this.calculateStraightLineDistance(start, goal);
      }

      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        return this.calculateStraightLineDistance(start, goal);
      }

      const route = data.routes[0];
      const summary = route.summary;

      return {
        distanceKm: Math.round((summary.distance / 1000) * 10) / 10, // m -> km (소수점 1자리)
        durationMinutes: Math.round(summary.duration / 60), // 초 -> 분
      };
    } catch (error) {
      this.logger.error('Directions API failed:', error);
      return this.calculateStraightLineDistance(start, goal);
    }
  }

  /**
   * 직선거리 계산 (Haversine 공식) - API 실패 시 대체
   */
  private calculateStraightLineDistance(
    start: Coordinates,
    goal: Coordinates,
  ): DirectionsResult {
    const R = 6371; // 지구 반지름 (km)
    const dLat = this.toRad(goal.lat - start.lat);
    const dLon = this.toRad(goal.lng - start.lng);
    const lat1 = this.toRad(start.lat);
    const lat2 = this.toRad(goal.lat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistance = R * c;

    // 도로 거리는 직선거리의 약 1.3배로 추정
    const roadDistance = Math.round(straightDistance * 1.3 * 10) / 10;
    // 평균 시속 30km/h로 추정
    const duration = Math.round((roadDistance / 30) * 60);

    return {
      distanceKm: roadDistance,
      durationMinutes: duration,
    };
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * 주소로 거리 계산 (Geocoding + Directions)
   */
  async calculateDistanceByAddress(
    startAddress: string,
    goalAddress: string,
  ): Promise<DirectionsResult | null> {
    // 1. 출발지 좌표 변환
    const startCoords = await this.geocode(startAddress);
    if (!startCoords) {
      this.logger.warn(`출발지 주소 변환 실패: ${startAddress}`);
      return null;
    }

    // 2. 도착지 좌표 변환
    const goalCoords = await this.geocode(goalAddress);
    if (!goalCoords) {
      this.logger.warn(`도착지 주소 변환 실패: ${goalAddress}`);
      return null;
    }

    // 3. 경로 탐색
    return this.getDirections(startCoords.coordinates, goalCoords.coordinates);
  }

  /**
   * 거리별 배송비 계산
   */
  calculateDeliveryFee(
    distanceKm: number,
    distanceRanges: Array<{ minDistance: number; maxDistance: number; price: number }>,
    extraPricePerKm: number,
    maxBaseDistance: number,
    options?: {
      isNight?: boolean;
      isWeekend?: boolean;
      nightSurchargeRate?: number;
      weekendSurchargeRate?: number;
    },
  ): DeliveryFeeCalculation {
    let baseFee = 0;
    let distanceFee = 0;
    let surcharge = 0;
    let breakdown = '';

    // 1. 거리 구간별 요금 찾기
    const matchedRange = distanceRanges.find(
      (range) => distanceKm >= range.minDistance && distanceKm < range.maxDistance,
    );

    if (matchedRange) {
      distanceFee = matchedRange.price;
      breakdown = `${matchedRange.minDistance}~${matchedRange.maxDistance}km 구간`;
    } else if (distanceKm >= maxBaseDistance) {
      // 최대 거리 초과 시
      const lastRange = distanceRanges[distanceRanges.length - 1];
      if (lastRange) {
        distanceFee = lastRange.price;
        const extraKm = distanceKm - maxBaseDistance;
        const extraFee = Math.ceil(extraKm) * extraPricePerKm;
        distanceFee += extraFee;
        breakdown = `${maxBaseDistance}km 초과 (+${Math.ceil(extraKm)}km × ${extraPricePerKm.toLocaleString()}원)`;
      }
    }

    // 2. 할증 계산
    const nightRate = options?.nightSurchargeRate || 0;
    const weekendRate = options?.weekendSurchargeRate || 0;

    if (options?.isNight && nightRate > 0) {
      surcharge += distanceFee * nightRate;
      breakdown += ` + 야간할증 ${(nightRate * 100).toFixed(0)}%`;
    }

    if (options?.isWeekend && weekendRate > 0) {
      surcharge += distanceFee * weekendRate;
      breakdown += ` + 주말할증 ${(weekendRate * 100).toFixed(0)}%`;
    }

    const totalFee = baseFee + distanceFee + Math.round(surcharge);

    return {
      baseFee,
      distanceFee,
      surcharge: Math.round(surcharge),
      totalFee,
      breakdown,
    };
  }
}

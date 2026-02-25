import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

@Injectable()
export class TrackingService {
  /** 인메모리 캐시: key = "courierCode:trackingNumber" */
  private cache = new Map<string, { data: TrackingInfo; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30분

  constructor(private readonly configService: ConfigService) {}

  async getTrackingInfo(courierCode: string, trackingNumber: string): Promise<TrackingInfo> {
    // 캐시 확인
    const cacheKey = `${courierCode}:${trackingNumber}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const apiKey = this.configService.get<string>('SWEETTRACKER_API_KEY');

    if (!apiKey) {
      throw new HttpException(
        '배송 추적 서비스가 설정되지 않았습니다. (SWEETTRACKER_API_KEY 미설정)',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const params = new URLSearchParams({
      t_key: apiKey,
      t_code: courierCode,
      t_invoice: trackingNumber,
    });

    let response: Response;
    try {
      response = await fetch(
        `https://info.sweettracker.co.kr/api/v1/trackingInfo?${params.toString()}`,
        { signal: AbortSignal.timeout(10000) },
      );
    } catch {
      throw new HttpException(
        '배송 추적 서비스 연결에 실패했습니다.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!response.ok) {
      throw new HttpException(
        '배송 추적 서비스 응답 오류',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const data = await response.json();

    // Sweet Tracker returns `msg` field on error (e.g. invalid key, bad invoice)
    if (data.msg) {
      throw new HttpException(
        data.msg,
        HttpStatus.NOT_FOUND,
      );
    }

    const result: TrackingInfo = {
      courierName: data.companyName || '',
      invoiceNo: data.invoiceNo || trackingNumber,
      level: Number(data.level) || 0,
      isDelivered: data.completeYN === 'Y',
      details: (data.trackingDetails || []).map((d: Record<string, string>) => ({
        status: d.kind || '',
        level: Number(d.level) || 0,
        location: d.where || '',
        time: d.when || '',
      })),
    };

    // 캐시 저장
    this.cache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return result;
  }
}

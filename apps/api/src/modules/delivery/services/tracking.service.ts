import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogenService } from './logen.service';

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
  /** API 제한 시 택배사 직접 조회 URL */
  directTrackingUrl?: string;
}

/** 택배사 코드 → 이름 매핑 */
const COURIER_NAMES: Record<string, string> = {
  '01': '우체국택배',
  '04': 'CJ대한통운',
  '05': '한진택배',
  '06': '로젠택배',
  '08': '롯데택배',
  '11': '일양로지스',
  '23': '경동택배',
  '32': '합동택배',
  '88': '대신택배',
};

/** 택배사 코드 → 직접 조회 URL 매핑 */
const DIRECT_TRACKING_URLS: Record<string, (trackingNumber: string) => string> = {
  '01': (no) => `https://service.epost.go.kr/trace.RetrieveDomRi498.postal?sid1=${no}`,
  '04': (no) => `https://trace.cjlogistics.com/next/tracking.html?wblNo=${no}`,
  '05': (no) => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mession-id=&wblnumText2=${no}`,
  '06': (no) => `https://www.ilogen.com/web/personal/trace/${no}`,
  '08': (no) => `https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=${no}`,
};

@Injectable()
export class TrackingService {
  /** 인메모리 캐시: key = "courierCode:trackingNumber" */
  private cache = new Map<string, { data: TrackingInfo; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6시간

  constructor(
    private readonly configService: ConfigService,
    private readonly logenService: LogenService,
  ) {}

  /** 택배사 직접 조회 URL 반환 */
  getDirectTrackingUrl(courierCode: string, trackingNumber: string): string | undefined {
    return DIRECT_TRACKING_URLS[courierCode]?.(trackingNumber);
  }

  async getTrackingInfo(
    courierCode: string,
    trackingNumber: string,
    bypassCache = false,
  ): Promise<TrackingInfo> {
    // 캐시 확인 (bypassCache=true이면 건너뜀)
    const cacheKey = `${courierCode}:${trackingNumber}`;
    const cached = this.cache.get(cacheKey);
    if (!bypassCache && cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const apiKey = this.configService.get<string>('SWEETTRACKER_API_KEY');

    if (!apiKey) {
      // SWEETTRACKER 미설정 시 로젠 API 직접 조회 시도 (courierCode=06)
      if (courierCode === '06' && this.logenService.isConfigured()) {
        const logenResult = await this.logenService.getTrackingInfo(trackingNumber);
        if (logenResult) {
          this.cache.set(cacheKey, { data: logenResult, expiresAt: Date.now() + this.CACHE_TTL_MS });
          return logenResult;
        }
      }
      // 로젠 API도 실패하면 직접 조회 URL 안내
      const directUrl = this.getDirectTrackingUrl(courierCode, trackingNumber);
      throw new HttpException(
        { message: '배송 조회 서비스가 준비되지 않았습니다. 아래 링크에서 직접 조회해 주세요.', directTrackingUrl: directUrl },
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
      // 연결 실패 시 만료된 캐시라도 반환
      if (cached) return cached.data;
      throw new HttpException(
        '배송 추적 서비스 연결에 실패했습니다.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!response.ok) {
      if (cached) return cached.data;
      throw new HttpException(
        '배송 추적 서비스 응답 오류',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const data = await response.json();

    // Sweet Tracker returns `msg` field on error (e.g. rate limit, invalid key)
    if (data.msg) {
      // 하루 요청 건수 초과 등 에러 시 만료된 캐시라도 반환
      if (cached) return cached.data;
      // 캐시도 없으면 직접 조회 URL 포함하여 에러 반환
      const directUrl = this.getDirectTrackingUrl(courierCode, trackingNumber);
      throw new HttpException(
        { message: data.msg, directTrackingUrl: directUrl },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result: TrackingInfo = {
      courierName: data.companyName || COURIER_NAMES[courierCode] || '',
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

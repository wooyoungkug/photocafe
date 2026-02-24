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
  constructor(private readonly configService: ConfigService) {}

  async getTrackingInfo(courierCode: string, trackingNumber: string): Promise<TrackingInfo> {
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

    if (!data.status) {
      throw new HttpException(
        data.msg || '배송 정보를 조회할 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
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
  }
}

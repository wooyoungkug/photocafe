import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 굿스플로(Goodsflow) 반품 API 연동 서비스
 *
 * 굿스플로 API 키가 .env에 설정되지 않으면 수동 모드로 동작합니다.
 * 수동 모드에서는 모든 메서드가 null을 반환하며,
 * 관리자가 직접 택배사에 수거 예약 후 운송장을 입력해야 합니다.
 *
 * .env 설정:
 *   GOODSFLOW_API_KEY=발급받은_API_키
 *   GOODSFLOW_API_URL=https://api.goodsflow.io (기본값)
 */

export interface GoodsflowReturnResult {
  returnId: string;
  trackingNumber: string;
  courierCode: string;
  estimatedPickupDate: string;
}

@Injectable()
export class GoodsflowService {
  private readonly logger = new Logger(GoodsflowService.name);
  private readonly apiKey: string | undefined;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOODSFLOW_API_KEY');
    this.apiUrl =
      this.configService.get<string>('GOODSFLOW_API_URL') ||
      'https://api.goodsflow.io';

    if (this.apiKey) {
      this.logger.log('굿스플로 API 연동 활성화');
    } else {
      this.logger.warn(
        '굿스플로 API 키 미설정 - 수동 운송장 입력 모드로 동작합니다. ' +
          '.env에 GOODSFLOW_API_KEY를 설정하세요.',
      );
    }
  }

  /** 굿스플로 연동 활성화 여부 */
  isEnabled(): boolean {
    return !!this.apiKey;
  }

  /**
   * 반품 수거 요청
   *
   * 굿스플로 API가 활성화되면 자동 수거 요청 + 운송장 발급.
   * 비활성화 시 null 반환 → 수동 운송장 입력 필요.
   */
  async requestReturnPickup(params: {
    originalTrackingNumber: string;
    originalCourierCode: string;
    senderName: string;
    senderPhone: string;
    senderAddress: string;
    senderPostalCode: string;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    receiverPostalCode: string;
    goodsName: string;
    memo?: string;
  }): Promise<GoodsflowReturnResult | null> {
    if (!this.apiKey) {
      this.logger.debug(
        '굿스플로 미연동 - 수동 운송장 입력 필요',
      );
      return null;
    }

    try {
      // TODO: 굿스플로 API 계약 후 실제 엔드포인트 구현
      // const response = await fetch(`${this.apiUrl}/v1/returns`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${this.apiKey}`,
      //   },
      //   body: JSON.stringify({
      //     originInvoiceNo: params.originalTrackingNumber,
      //     originCarrierCode: params.originalCourierCode,
      //     sender: { ... },
      //     receiver: { ... },
      //     goods: { name: params.goodsName },
      //   }),
      // });
      // const data = await response.json();

      this.logger.log(
        `굿스플로 반품 수거 요청: ${params.originalTrackingNumber}`,
      );

      // 실제 구현 시 API 응답을 반환
      // return {
      //   returnId: data.returnId,
      //   trackingNumber: data.trackingNumber,
      //   courierCode: data.courierCode,
      //   estimatedPickupDate: data.estimatedPickupDate,
      // };

      return null; // API 계약 전까지 null 반환
    } catch (error) {
      this.logger.error('굿스플로 반품 수거 요청 실패', error);
      return null;
    }
  }

  /**
   * 반품 상태 조회 (굿스플로)
   */
  async getReturnStatus(
    goodsflowReturnId: string,
  ): Promise<{ status: string; details: unknown[] } | null> {
    if (!this.apiKey) return null;

    try {
      // TODO: 굿스플로 API 계약 후 구현
      this.logger.debug(`굿스플로 반품 상태 조회: ${goodsflowReturnId}`);
      return null;
    } catch (error) {
      this.logger.error('굿스플로 반품 상태 조회 실패', error);
      return null;
    }
  }
}

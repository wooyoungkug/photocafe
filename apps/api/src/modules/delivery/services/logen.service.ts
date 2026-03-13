import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { format } from 'date-fns';
import type {
  LogenOrderData,
  LogenSlipNoResponse,
  LogenRegisterResponse,
  LogenTrackingResponse,
  LogenTrackingDetail,
} from '../dto/logen.dto';
import type { TrackingInfo } from './tracking.service';

@Injectable()
export class LogenService {
  private readonly logger = new Logger(LogenService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /** 로젠택배 API 기본 URL */
  private get baseUrl(): string {
    const env = this.config.get<string>('LOGEN_API_ENV', 'dev');
    return env === 'prod'
      ? 'https://openapi.ilogen.com/lrm02b-edi/edi'
      : 'https://topenapi.ilogen.com/lrm02b-edi/edi';
  }

  /** 업체코드 */
  private get userId(): string {
    return this.config.get<string>('LOGEN_USER_ID', '');
  }

  /** 거래처코드 */
  private get custCd(): string {
    return this.config.get<string>('LOGEN_CUST_CD', '');
  }

  /** API Key */
  private get apiKey(): string {
    return this.config.get<string>('LOGEN_API_KEY', '');
  }

  /** API 설정 여부 확인 */
  isConfigured(): boolean {
    return !!this.userId && !!this.custCd;
  }

  /** API 설정 상태 반환 */
  getStatus() {
    return {
      configured: this.isConfigured(),
      env: this.config.get<string>('LOGEN_API_ENV', 'dev'),
      userId: this.userId ? `${this.userId.slice(0, 4)}****` : '',
    };
  }

  // -------------------------------------------------------------------------
  // 1) 송장번호 발급
  // -------------------------------------------------------------------------

  async getSlipNo(qty: number = 1): Promise<string[]> {
    this.ensureConfigured();

    const body = {
      userId: this.userId,
      data: { slipQty: qty },
    };

    const res = await this.callApi<LogenSlipNoResponse>(
      '/getSlipNo',
      body,
    );

    if (res.sttsCd === 'FAIL') {
      throw new HttpException(
        `로젠택배 송장번호 발급 실패: ${res.sttsMsg}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const slipNumbers = (res.data1 || [])
      .filter((d) => d.resultCd === 'TRUE')
      .map((d) => d.slipNo);

    if (slipNumbers.length === 0) {
      throw new HttpException(
        '로젠택배 송장번호를 발급받지 못했습니다.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return slipNumbers;
  }

  // -------------------------------------------------------------------------
  // 2) 화물 등록
  // -------------------------------------------------------------------------

  async registerOrders(orders: LogenOrderData[]): Promise<LogenRegisterResponse> {
    this.ensureConfigured();

    const body = {
      userId: this.userId,
      data: orders,
    };

    const res = await this.callApi<LogenRegisterResponse>(
      '/registerOrderData',
      body,
    );

    if (res.sttsCd === 'FAIL') {
      throw new HttpException(
        `로젠택배 화물등록 실패: ${res.sttsMsg}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return res;
  }

  // -------------------------------------------------------------------------
  // 3) 운송장 출력 팝업 URL
  // -------------------------------------------------------------------------

  getInvoicePrintUrl(takeDt?: string): string {
    this.ensureConfigured();
    const dt = takeDt || format(new Date(), 'yyyyMMdd');
    const params = new URLSearchParams({
      userId: this.userId,
      custCd: this.custCd,
      takeDt: dt,
    });
    return `${this.baseUrl}/outSlipPrintPop?${params.toString()}`;
  }

  // -------------------------------------------------------------------------
  // 4) 단건 자동 발급 (송장발급 → 화물등록 → DB 업데이트)
  // -------------------------------------------------------------------------

  async generateTrackingForOrder(orderId: string, processedBy: string) {
    this.ensureConfigured();

    // 1. 주문 + 배송정보 조회
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shipping: true, items: { select: { productName: true } } },
    });

    if (!order) {
      throw new HttpException('주문을 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    if (!order.shipping) {
      throw new HttpException('배송정보가 없는 주문입니다.', HttpStatus.BAD_REQUEST);
    }
    if (order.shipping.trackingNumber) {
      return {
        success: true,
        trackingNumber: order.shipping.trackingNumber,
        message: '이미 송장번호가 등록되어 있습니다.',
        alreadyExists: true,
      };
    }

    // 2. 송장번호 발급
    const [slipNo] = await this.getSlipNo(1);

    // 3. 로젠 시스템에 화물 등록
    const takeDt = format(new Date(), 'yyyyMMdd');
    const goodsNm = order.items.map((i) => i.productName).join(', ').slice(0, 100) || '인쇄물';

    const logenOrder: LogenOrderData = {
      custCd: this.custCd,
      takeDt,
      slipNo,
      fixTakeNo: order.orderNumber,
      sndCustNm: order.shipping.senderName || '포토카페',
      sndCustAddr: this.buildFullAddress(
        order.shipping.senderAddress,
        order.shipping.senderAddressDetail,
      ),
      sndTelNo: (order.shipping.senderPhone || '').replace(/\D/g, ''),
      rcvCustNm: order.shipping.recipientName,
      rcvCustAddr: this.buildFullAddress(
        order.shipping.address,
        order.shipping.addressDetail,
      ),
      rcvTelNo: (order.shipping.phone || '').replace(/\D/g, ''),
      fareTy: order.shipping.fareType === 'cod' ? '060' : '030', // 착불:060, 선불:030
      qty: 1,
      dlvFare: Number(order.shipping.deliveryFee) || 0,
      goodsNm,
    };

    await this.registerOrders([logenOrder]);

    // 4. DB 업데이트 (트랜잭션)
    await this.prisma.$transaction(async (tx) => {
      await tx.orderShipping.update({
        where: { orderId },
        data: {
          courierCode: '06', // 로젠택배
          trackingNumber: slipNo,
          shippedAt: new Date(),
        },
      });

      await tx.processHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: order.status,
          processType: 'tracking_assigned',
          note: `로젠택배 자동발급 송장: ${slipNo}`,
          processedBy,
        },
      });
    });

    this.logger.log(`주문 ${order.orderNumber}: 로젠 송장 ${slipNo} 자동발급 완료`);

    return { success: true, trackingNumber: slipNo, alreadyExists: false };
  }

  // -------------------------------------------------------------------------
  // 5) 복수건 일괄 발급
  // -------------------------------------------------------------------------

  async generateTrackingBulk(orderIds: string[], processedBy: string) {
    this.ensureConfigured();

    const results: Array<{
      orderId: string;
      orderNumber?: string;
      trackingNumber?: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const orderId of orderIds) {
      try {
        const result = await this.generateTrackingForOrder(orderId, processedBy);
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          select: { orderNumber: true },
        });
        results.push({
          orderId,
          orderNumber: order?.orderNumber,
          trackingNumber: result.trackingNumber,
          success: true,
        });
      } catch (e) {
        results.push({
          orderId,
          success: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return { results, total: orderIds.length, successCount };
  }

  // -------------------------------------------------------------------------
  // 6) 배송 조회
  // -------------------------------------------------------------------------

  /** 로젠 API로 배송 추적 정보 조회. 실패 시 null 반환 (폴백 가능하도록) */
  async getTrackingInfo(slipNo: string): Promise<TrackingInfo | null> {
    if (!this.isConfigured()) return null;

    let res: LogenTrackingResponse;
    try {
      res = await this.callApi<LogenTrackingResponse>('/getTrackingInfo', {
        userId: this.userId,
        data: { slipNo },
      });
    } catch (e) {
      this.logger.warn(`로젠 배송조회 API 호출 실패: ${slipNo}`, e);
      return null;
    }

    if (res.sttsCd === 'FAIL') {
      this.logger.warn(`로젠 배송조회 FAIL: ${res.sttsMsg}`);
      return null;
    }

    // 응답 포맷 확인용 (처음 연동 시 로그 확인 가능)
    this.logger.debug(`로젠 배송조회 raw: ${JSON.stringify(res)}`);

    const history: LogenTrackingDetail[] = res.data1 ?? [];
    const details = history.map((d) => ({
      status: d.statusNm ?? '',
      level: this.statusCdToLevel(d.statusCd ?? ''),
      location: d.location ?? d.branchNm ?? '',
      time: d.processDt ?? d.regDt ?? '',
    }));

    // 현재 전체 단계: 이력 중 가장 높은 level
    const currentLevel = details.length > 0
      ? Math.max(...details.map((d) => d.level))
      : 0;

    // 현황 데이터 (data가 배열일 수도 있음에 대비)
    const mainData = Array.isArray(res.data) ? res.data[0] : res.data;
    const isDelivered =
      mainData?.statusCd === '91' ||
      mainData?.statusNm?.includes('완료') ||
      currentLevel >= 6;

    return {
      courierName: '로젠택배',
      invoiceNo: slipNo,
      level: currentLevel,
      isDelivered,
      details,
    };
  }

  /** 로젠 상태코드 → Sweettracker 호환 level (1~6) 변환 */
  private statusCdToLevel(statusCd: string): number {
    if (statusCd === '01') return 1;                          // 접수
    if (statusCd === '11') return 2;                          // 집하
    if (['12', '21', '22', '31', '32'].includes(statusCd)) return 3; // 이동중
    if (['41', '42'].includes(statusCd)) return 4;            // 지역도착
    if (statusCd === '82') return 5;                          // 배달중
    if (statusCd === '91') return 6;                          // 배달완료
    return 0;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private ensureConfigured() {
    if (!this.isConfigured()) {
      throw new HttpException(
        '로젠택배 API가 설정되지 않았습니다. (LOGEN_USER_ID, LOGEN_CUST_CD 확인)',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private buildFullAddress(address?: string | null, detail?: string | null): string {
    return [address, detail].filter(Boolean).join(' ');
  }

  private async callApi<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new HttpException(
        '로젠택배 API 연결에 실패했습니다.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!response.ok) {
      throw new HttpException(
        `로젠택배 API 응답 오류 (${response.status})`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return response.json() as Promise<T>;
  }
}

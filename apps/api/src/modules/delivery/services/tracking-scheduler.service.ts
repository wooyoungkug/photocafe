import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TrackingService, TrackingDetail } from './tracking.service';
import { SystemSettingsService } from '../../system-settings/system-settings.service';

/** 기본 폴링 시간 (시스템설정 미등록 시) */
const DEFAULT_POLL_HOURS = '9,10,12,14,16,18';

@Injectable()
export class TrackingSchedulerService {
  private readonly logger = new Logger(TrackingSchedulerService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly trackingService: TrackingService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  /**
   * 매시 정각마다 실행 → 시스템설정의 활성 시간에 해당하면 폴링 수행
   */
  @Cron('0 0 * * * *', { timeZone: 'Asia/Seoul' })
  async scheduledPoll() {
    const currentHour = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Seoul',
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(currentHour, 10);

    const pollHours = await this.getActivePollHours();

    if (!pollHours.includes(hour)) {
      return; // 활성 시간이 아님 → 건너뜀
    }

    this.logger.log(`[${hour}시] 설정된 폴링 시간 - 배송추적 시작`);
    await this.handleTrackingPoll();
  }

  /**
   * 시스템설정에서 폴링 활성 시간 조회
   * key: tracking_poll_hours, 값: "9,10,12,14,16,18" (쉼표 구분)
   */
  async getActivePollHours(): Promise<number[]> {
    const value = await this.systemSettings.getValue(
      'tracking_poll_hours',
      DEFAULT_POLL_HOURS,
    );
    return value
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0 && n <= 23);
  }

  /**
   * 실제 폴링 로직 (스케줄/수동 공통)
   */
  async handleTrackingPoll() {
    if (this.isRunning) {
      this.logger.warn('이전 배송추적 폴링이 아직 실행 중입니다. 건너뜁니다.');
      return;
    }

    this.isRunning = true;
    this.logger.log('=== 자동 배송추적 폴링 시작 ===');

    try {
      const eligibleOrders = await this.getEligibleOrders();
      this.logger.log(`추적 대상 주문: ${eligibleOrders.length}건`);

      let updatedCount = 0;
      let deliveredCount = 0;
      let errorCount = 0;

      for (const order of eligibleOrders) {
        try {
          const result = await this.pollAndUpdateOrder(order);
          if (result.newEvents > 0) updatedCount++;
          if (result.delivered) deliveredCount++;
        } catch (err) {
          errorCount++;
          this.logger.error(
            `주문 ${order.orderNumber} 추적 실패: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        // API 호출 간 200ms 딜레이
        await this.delay(200);
      }

      this.logger.log(
        `=== 배송추적 폴링 완료: 갱신 ${updatedCount}건, 배달완료 ${deliveredCount}건, 오류 ${errorCount}건 ===`,
      );
    } catch (err) {
      this.logger.error(`배송추적 폴링 전체 오류: ${err}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 추적 대상 주문 조회:
   * - courierCode + trackingNumber 있음
   * - deliveredAt IS NULL (아직 배달 안 됨)
   * - 주문 상태: ready_for_shipping 또는 shipped
   */
  private async getEligibleOrders() {
    return this.prisma.order.findMany({
      where: {
        status: { in: ['ready_for_shipping', 'shipped'] },
        shipping: {
          courierCode: { not: null },
          trackingNumber: { not: null },
          deliveredAt: null,
        },
      },
      include: {
        shipping: true,
      },
      orderBy: { orderedAt: 'asc' },
    });
  }

  /**
   * 개별 주문 폴링 & ProcessHistory 기록
   */
  private async pollAndUpdateOrder(
    order: any,
  ): Promise<{ newEvents: number; delivered: boolean }> {
    const shipping = order.shipping;
    if (!shipping?.courierCode || !shipping?.trackingNumber) {
      return { newEvents: 0, delivered: false };
    }

    const trackingInfo = await this.trackingService.getTrackingInfo(
      shipping.courierCode,
      shipping.trackingNumber,
      true, // bypassCache
    );

    const previousCount = shipping.lastTrackingDetailCount || 0;
    const currentCount = trackingInfo.details.length;

    // 새 이벤트 없음
    if (currentCount <= previousCount) {
      if (trackingInfo.isDelivered && !shipping.deliveredAt) {
        await this.markDelivered(order);
        return { newEvents: 0, delivered: true };
      }
      return { newEvents: 0, delivered: false };
    }

    // 새 추적 이벤트: details[previousCount..currentCount-1]
    const newDetails = trackingInfo.details.slice(previousCount);

    await this.prisma.$transaction(async (tx) => {
      for (const detail of newDetails) {
        await tx.processHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: order.status,
            processType: 'tracking_update',
            note: this.formatTrackingNote(detail, trackingInfo.courierName),
            processedBy: 'system',
          },
        });
      }

      await tx.orderShipping.update({
        where: { orderId: order.id },
        data: { lastTrackingDetailCount: currentCount },
      });
    });

    this.logger.log(
      `주문 ${order.orderNumber}: 추적 이벤트 ${newDetails.length}건 기록`,
    );

    // 배달완료 확인
    let delivered = false;
    if (trackingInfo.isDelivered && !shipping.deliveredAt) {
      await this.markDelivered(order);
      delivered = true;
    }

    return { newEvents: newDetails.length, delivered };
  }

  /**
   * 배달완료 자동 처리
   */
  private async markDelivered(order: any) {
    await this.prisma.$transaction(async (tx) => {
      await tx.orderShipping.update({
        where: { orderId: order.id },
        data: { deliveredAt: new Date() },
      });

      const updateData: any = {
        currentProcess: 'delivered',
        processHistory: {
          create: {
            fromStatus: order.status,
            toStatus: 'shipped',
            processType: 'delivery_completed',
            note: '자동 배달완료 확인 (배송추적)',
            processedBy: 'system',
          },
        },
      };

      if (order.status !== 'shipped') {
        updateData.status = 'shipped';
      }

      await tx.order.update({
        where: { id: order.id },
        data: updateData,
      });
    });

    this.logger.log(`주문 ${order.orderNumber}: 자동 배달완료 처리`);
  }

  /**
   * 추적 이벤트를 읽기 쉬운 메모로 변환
   */
  private formatTrackingNote(detail: TrackingDetail, courierName: string): string {
    const levelLabels: Record<number, string> = {
      1: '접수',
      2: '집하',
      3: '이동중',
      4: '지역도착',
      5: '배달중',
      6: '배달완료',
    };
    const levelLabel = levelLabels[detail.level] || detail.status || `상태${detail.level}`;
    return `[${courierName}] ${levelLabel} - ${detail.location} (${detail.time})`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

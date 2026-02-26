import { Controller, Get, Post, Query, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { TrackingService } from '../services/tracking.service';
import { TrackingSchedulerService } from '../services/tracking-scheduler.service';
import { COURIER_CODES, ACTIVE_COURIER_CODES } from '../dto/delivery-pricing.dto';

@ApiTags('delivery')
@Controller('delivery')
export class TrackingController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly trackingSchedulerService: TrackingSchedulerService,
  ) {}

  @Get('tracking')
  @Public()
  @ApiOperation({ summary: '배송 추적 조회 (스마트택배)' })
  @ApiQuery({ name: 'courierCode', description: '택배사 코드 (예: 06=로젠택배)', example: '06' })
  @ApiQuery({ name: 'trackingNumber', description: '운송장 번호', example: '1234567890' })
  async getTracking(
    @Query('courierCode') courierCode: string,
    @Query('trackingNumber') trackingNumber: string,
  ) {
    if (!courierCode || !trackingNumber) {
      throw new BadRequestException('택배사 코드와 운송장 번호를 입력해주세요.');
    }
    return this.trackingService.getTrackingInfo(courierCode, trackingNumber);
  }

  @Get('tracking/direct-url')
  @Public()
  @ApiOperation({ summary: '택배사 직접 조회 URL (API 제한 시 대안)' })
  @ApiQuery({ name: 'courierCode', description: '택배사 코드' })
  @ApiQuery({ name: 'trackingNumber', description: '운송장 번호' })
  getDirectTrackingUrl(
    @Query('courierCode') courierCode: string,
    @Query('trackingNumber') trackingNumber: string,
  ) {
    const url = this.trackingService.getDirectTrackingUrl(courierCode, trackingNumber);
    return { url: url || null };
  }

  @Get('couriers')
  @Public()
  @ApiOperation({ summary: '활성 택배사 목록 조회 (계약/연동 완료된 택배사만)' })
  getCouriers() {
    return ACTIVE_COURIER_CODES
      .filter((code) => COURIER_CODES[code])
      .map((code) => ({ code, name: COURIER_CODES[code] }));
  }

  @Get('couriers/all')
  @Public()
  @ApiOperation({ summary: '전체 택배사 목록 조회 (참조용)' })
  getAllCouriers() {
    return Object.entries(COURIER_CODES).map(([code, name]) => ({ code, name }));
  }

  @Post('tracking/poll')
  @ApiOperation({ summary: '배송추적 수동 폴링 (관리자)' })
  async manualPoll() {
    await this.trackingSchedulerService.handleTrackingPoll();
    return { success: true, message: '배송추적 폴링 완료' };
  }
}

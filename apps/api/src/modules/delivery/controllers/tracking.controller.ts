import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { TrackingService } from '../services/tracking.service';
import { COURIER_CODES } from '../dto/delivery-pricing.dto';

@ApiTags('delivery')
@Controller('delivery')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

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
  @ApiOperation({ summary: '지원 택배사 목록 조회' })
  getCouriers() {
    return Object.entries(COURIER_CODES).map(([code, name]) => ({ code, name }));
  }
}

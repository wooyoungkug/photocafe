import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DeliveryPricingService } from '../services/delivery-pricing.service';
import { KakaoMapService } from '../services/kakao-map.service';
import {
  CreateDeliveryPricingDto,
  UpdateDeliveryPricingDto,
  CalculateDeliveryFeeDto,
  DeliveryMethod,
  DELIVERY_METHOD_LABELS,
} from '../dto/delivery-pricing.dto';

@ApiTags('배송비 설정')
@Controller('delivery-pricing')
export class DeliveryPricingController {
  constructor(
    private readonly deliveryPricingService: DeliveryPricingService,
    private readonly kakaoMapService: KakaoMapService,
  ) {}

  @Get()
  @ApiOperation({ summary: '배송비 설정 전체 조회' })
  async findAll() {
    return this.deliveryPricingService.findAll();
  }

  @Get('methods')
  @ApiOperation({ summary: '배송방법 목록 조회' })
  async getMethods() {
    return DELIVERY_METHOD_LABELS;
  }

  @Get(':method')
  @ApiOperation({ summary: '배송방법별 설정 조회' })
  async findByMethod(@Param('method') method: DeliveryMethod) {
    return this.deliveryPricingService.findByMethod(method);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '배송비 설정 생성' })
  async create(@Body() dto: CreateDeliveryPricingDto) {
    return this.deliveryPricingService.create(dto);
  }

  @Put(':method')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '배송비 설정 수정' })
  async update(
    @Param('method') method: DeliveryMethod,
    @Body() dto: UpdateDeliveryPricingDto
  ) {
    return this.deliveryPricingService.update(method, dto);
  }

  @Delete(':method')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '배송비 설정 삭제' })
  async delete(@Param('method') method: DeliveryMethod) {
    return this.deliveryPricingService.delete(method);
  }

  @Post('calculate')
  @ApiOperation({
    summary: '배송비 계산',
    description: `
## 배송비 계산 공식

### 오토바이(퀵) / 다마스
\`\`\`
총 배송비 = 거리별단가 + 할증요금

거리별단가:
- 0~5km: 8,000원 (오토바이) / 15,000원 (다마스)
- 5~10km: 12,000원 / 20,000원
- 10~15km: 16,000원 / 25,000원
- 15~20km: 20,000원 / 30,000원
- 20km 초과: 최대구간단가 + (초과km × km당추가요금)

할증요금:
- 야간(22시~06시): +30%
- 주말/공휴일: +20%
\`\`\`

### 택배
\`\`\`
총 배송비 = 기본요금 + 도서산간추가
- 기본요금: 3,500원
- 도서산간: +3,000원
- 무료배송: 50,000원 이상
\`\`\`

### 화물
\`\`\`
총 배송비 = 기본요금 + 크기별추가 + 할증요금
- 기본요금: 30,000원
- 크기별: 소형(0), 중형(+20,000), 대형(+50,000), 특대형(+100,000)
\`\`\`
    `,
  })
  async calculate(@Body() dto: CalculateDeliveryFeeDto) {
    return this.deliveryPricingService.calculateFee(dto);
  }

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '기본 배송비 설정 초기화' })
  async initialize() {
    return this.deliveryPricingService.initializeDefaultPricing();
  }

  // ==================== 카카오 지도 API ====================

  @Get('geocode')
  @ApiOperation({ summary: '주소를 좌표로 변환 (Geocoding)' })
  @ApiQuery({ name: 'address', required: true, description: '변환할 주소' })
  async geocode(@Query('address') address: string) {
    const result = await this.kakaoMapService.geocode(address);
    if (!result) {
      return { success: false, message: '주소를 찾을 수 없습니다.' };
    }
    return { success: true, data: result };
  }

  @Post('distance')
  @ApiOperation({
    summary: '두 주소 간 거리 계산',
    description: '카카오 모빌리티 API를 사용하여 실제 도로 거리를 계산합니다.',
  })
  async calculateDistance(
    @Body() body: { startAddress: string; goalAddress: string }
  ) {
    const result = await this.kakaoMapService.calculateDistanceByAddress(
      body.startAddress,
      body.goalAddress
    );

    if (!result) {
      return {
        success: false,
        message: '경로를 찾을 수 없습니다. 주소를 확인해주세요.',
      };
    }

    return {
      success: true,
      data: {
        distance: result.distanceKm,
        distanceText: `${result.distanceKm}km`,
        duration: result.durationMinutes,
        durationText: `${result.durationMinutes}분`,
      },
    };
  }

  @Post('calculate-by-address')
  @ApiOperation({
    summary: '주소 기반 배송비 자동 계산',
    description: `
## 사용 방법
1. 출발지 주소와 도착지 주소를 입력합니다.
2. 배송 방법(motorcycle/damas/freight)을 선택합니다.
3. 카카오 모빌리티 API로 실제 도로 거리를 계산합니다.
4. 설정된 거리별 요금표에 따라 배송비를 자동 산출합니다.

## 할증 옵션
- isNight: 야간 할증 (22시~06시)
- isWeekend: 주말/공휴일 할증

## 요금 정보
- 카카오맵 API: 월 30만 건 무료, 초과 시 0.6원/건
    `,
  })
  async calculateByAddress(
    @Body()
    body: {
      startAddress: string;
      goalAddress: string;
      deliveryMethod: 'motorcycle' | 'damas' | 'freight';
      isNight?: boolean;
      isWeekend?: boolean;
    }
  ) {
    // 1. 거리 계산
    const distanceResult = await this.kakaoMapService.calculateDistanceByAddress(
      body.startAddress,
      body.goalAddress
    );

    if (!distanceResult) {
      return {
        success: false,
        message: '경로를 찾을 수 없습니다. 주소를 확인해주세요.',
      };
    }

    // 2. 해당 배송방법의 요금 설정 조회
    const pricing = await this.deliveryPricingService.findByMethod(body.deliveryMethod);
    if (!pricing) {
      return {
        success: false,
        message: `${body.deliveryMethod} 배송 설정이 없습니다.`,
      };
    }

    // 3. 배송비 계산
    const distanceRanges = (pricing.distanceRanges as any[]) || [];
    const feeResult = this.kakaoMapService.calculateDeliveryFee(
      distanceResult.distanceKm,
      distanceRanges,
      Number(pricing.extraPricePerKm) || 0,
      Number(pricing.maxBaseDistance) || 20,
      {
        isNight: body.isNight,
        isWeekend: body.isWeekend,
        nightSurchargeRate: Number(pricing.nightSurchargeRate) || 0,
        weekendSurchargeRate: Number(pricing.weekendSurchargeRate) || 0,
      }
    );

    return {
      success: true,
      data: {
        route: {
          start: body.startAddress,
          goal: body.goalAddress,
          distance: distanceResult.distanceKm,
          distanceText: `${distanceResult.distanceKm}km`,
          duration: distanceResult.durationMinutes,
          durationText: `${distanceResult.durationMinutes}분`,
        },
        fee: {
          baseFee: feeResult.baseFee,
          distanceFee: feeResult.distanceFee,
          surcharge: feeResult.surcharge,
          totalFee: feeResult.totalFee,
          breakdown: feeResult.breakdown,
        },
        deliveryMethod: body.deliveryMethod,
        deliveryMethodLabel: DELIVERY_METHOD_LABELS[body.deliveryMethod],
      },
    };
  }
}

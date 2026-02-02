import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateDeliveryPricingDto,
  UpdateDeliveryPricingDto,
  CalculateDeliveryFeeDto,
  DeliveryFeeResultDto,
  DeliveryMethod,
  DistanceRangeDto,
  SizeRangeDto,
} from '../dto/delivery-pricing.dto';

@Injectable()
export class DeliveryPricingService {
  constructor(private prisma: PrismaService) {}

  // ==================== CRUD ====================

  async findAll() {
    return this.prisma.deliveryPricing.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findByMethod(deliveryMethod: DeliveryMethod) {
    const pricing = await this.prisma.deliveryPricing.findUnique({
      where: { deliveryMethod },
    });

    if (!pricing) {
      throw new NotFoundException(`배송방법 '${deliveryMethod}' 설정을 찾을 수 없습니다`);
    }

    return pricing;
  }

  async create(dto: CreateDeliveryPricingDto) {
    const { distanceRanges, sizeRanges, ...data } = dto;

    return this.prisma.deliveryPricing.create({
      data: {
        ...data,
        baseFee: data.baseFee ?? 0,
        distanceRanges: distanceRanges ? JSON.parse(JSON.stringify(distanceRanges)) : Prisma.JsonNull,
        sizeRanges: sizeRanges ? JSON.parse(JSON.stringify(sizeRanges)) : Prisma.JsonNull,
      },
    });
  }

  // distanceRanges 유효성 검증
  private isValidDistanceRanges(ranges: any): boolean {
    if (!Array.isArray(ranges) || ranges.length === 0) return false;
    return ranges.every(
      (r) => r && typeof r === 'object' && 'minDistance' in r && 'maxDistance' in r && 'price' in r
    );
  }

  // sizeRanges 유효성 검증
  private isValidSizeRanges(ranges: any): boolean {
    if (!Array.isArray(ranges) || ranges.length === 0) return false;
    return ranges.every((r) => r && typeof r === 'object' && 'name' in r && 'price' in r);
  }

  async update(deliveryMethod: DeliveryMethod, dto: UpdateDeliveryPricingDto) {
    console.log('[배송비 업데이트] deliveryMethod:', deliveryMethod);
    console.log('[배송비 업데이트] dto:', JSON.stringify(dto, null, 2));

    const { distanceRanges, sizeRanges, ...data } = dto;

    // 유효하지 않은 distanceRanges/sizeRanges는 업데이트하지 않음
    const validDistanceRanges = this.isValidDistanceRanges(distanceRanges) ? distanceRanges : undefined;
    const validSizeRanges = this.isValidSizeRanges(sizeRanges) ? sizeRanges : undefined;

    console.log('[배송비 업데이트] validDistanceRanges:', JSON.stringify(validDistanceRanges, null, 2));
    console.log('[배송비 업데이트] validSizeRanges:', JSON.stringify(validSizeRanges, null, 2));
    console.log('[배송비 업데이트] data:', JSON.stringify(data, null, 2));

    // upsert를 사용하여 없으면 생성, 있으면 업데이트
    return this.prisma.deliveryPricing.upsert({
      where: { deliveryMethod },
      create: {
        deliveryMethod,
        name: data.name || deliveryMethod,
        baseFee: data.baseFee ?? 0,
        distanceRanges: validDistanceRanges ? JSON.parse(JSON.stringify(validDistanceRanges)) : Prisma.JsonNull,
        sizeRanges: validSizeRanges ? JSON.parse(JSON.stringify(validSizeRanges)) : Prisma.JsonNull,
        ...data,
      },
      update: {
        ...data,
        ...(validDistanceRanges !== undefined && {
          distanceRanges: JSON.parse(JSON.stringify(validDistanceRanges)),
        }),
        ...(validSizeRanges !== undefined && {
          sizeRanges: JSON.parse(JSON.stringify(validSizeRanges)),
        }),
      },
    });
  }

  async delete(deliveryMethod: DeliveryMethod) {
    await this.findByMethod(deliveryMethod);
    return this.prisma.deliveryPricing.delete({
      where: { deliveryMethod },
    });
  }

  // ==================== 배송비 계산 ====================

  /**
   * 배송비 계산 메인 함수
   *
   * 계산 공식:
   * - 오토바이/다마스: 기본요금 + 거리별단가 + 할증(야간/주말)
   * - 택배: 기본요금 + 도서산간추가 (무료배송 조건 적용)
   * - 화물: 기본요금 + 크기별추가 + 할증(야간/주말)
   */
  async calculateFee(dto: CalculateDeliveryFeeDto): Promise<DeliveryFeeResultDto> {
    const pricing = await this.findByMethod(dto.deliveryMethod);

    switch (dto.deliveryMethod) {
      case 'motorcycle':
      case 'damas':
        return this.calculateDistanceBasedFee(pricing, dto);
      case 'parcel':
        return this.calculateParcelFee(pricing, dto);
      case 'freight':
        return this.calculateFreightFee(pricing, dto);
      default:
        throw new NotFoundException('지원하지 않는 배송방법입니다');
    }
  }

  /**
   * 오토바이/다마스 거리별 요금 계산
   *
   * 공식:
   * 1. 거리 구간에 해당하는 단가 찾기
   * 2. 최대거리 초과 시: 최대구간단가 + (초과거리 × km당추가요금)
   * 3. 야간/주말 할증 적용
   *
   * 예시 (오토바이):
   * - 거리: 12km, 야간
   * - 구간: [0-5km: 8000원, 5-10km: 12000원, 10-15km: 16000원]
   * - 기본요금: 16000원 (10-15km 구간)
   * - 야간할증: 16000 × 0.3 = 4800원
   * - 총액: 20800원
   */
  private calculateDistanceBasedFee(
    pricing: any,
    dto: CalculateDeliveryFeeDto
  ): DeliveryFeeResultDto {
    const distance = dto.distance ?? 0;
    const baseFee = Number(pricing.baseFee) || 0;

    // 거리 구간별 단가
    let distanceFee = 0;
    let distanceRange = '';
    const distanceRanges = (pricing.distanceRanges as DistanceRangeDto[]) || [];

    if (distanceRanges.length > 0) {
      // 해당 거리 구간 찾기
      const range = distanceRanges.find(
        r => distance >= r.minDistance && distance < r.maxDistance
      );

      if (range) {
        distanceFee = range.price;
        distanceRange = `${range.minDistance}~${range.maxDistance}km`;
      } else {
        // 최대 구간 초과 시
        const maxRange = distanceRanges[distanceRanges.length - 1];
        const maxBaseDistance = pricing.maxBaseDistance || maxRange.maxDistance;
        const extraPricePerKm = Number(pricing.extraPricePerKm) || 0;

        if (distance >= maxBaseDistance) {
          distanceFee = maxRange.price;
          const extraDistance = distance - maxBaseDistance;
          distanceFee += extraDistance * extraPricePerKm;
          distanceRange = `${maxBaseDistance}km 초과 (+${extraDistance.toFixed(1)}km)`;
        } else {
          // 구간 사이에 없으면 가장 가까운 상위 구간
          const upperRange = distanceRanges.find(r => distance < r.maxDistance);
          if (upperRange) {
            distanceFee = upperRange.price;
            distanceRange = `${upperRange.minDistance}~${upperRange.maxDistance}km`;
          }
        }
      }
    }

    // 할증 계산
    let surchargeFee = 0;
    let surchargeRate = 0;
    let surchargeType = '';
    const subtotal = baseFee + distanceFee;

    // 야간 할증
    if (dto.isNight && pricing.nightSurchargeRate) {
      const nightRate = Number(pricing.nightSurchargeRate);
      surchargeFee += subtotal * nightRate;
      surchargeRate += nightRate;
      surchargeType = '야간';
    }

    // 주말/공휴일 할증
    if (dto.isWeekend && pricing.weekendSurchargeRate) {
      const weekendRate = Number(pricing.weekendSurchargeRate);
      surchargeFee += subtotal * weekendRate;
      surchargeRate += weekendRate;
      surchargeType = surchargeType ? `${surchargeType}+주말` : '주말';
    }

    const totalFee = Math.round(baseFee + distanceFee + surchargeFee);

    return {
      baseFee,
      distanceFee,
      surchargeFee: Math.round(surchargeFee),
      extraFee: 0,
      totalFee,
      isFree: false,
      breakdown: {
        distanceRange,
        surchargeRate,
        surchargeType,
      },
    };
  }

  /**
   * 택배 요금 계산
   *
   * 공식:
   * 1. 주문금액 >= 무료배송기준 → 무료
   * 2. 도서산간 → 기본요금 + 도서산간추가
   * 3. 일반 → 기본요금
   */
  private calculateParcelFee(
    pricing: any,
    dto: CalculateDeliveryFeeDto
  ): DeliveryFeeResultDto {
    const baseFee = Number(pricing.baseFee) || 0;
    const islandFee = dto.isIsland ? (Number(pricing.islandFee) || 0) : 0;
    const freeThreshold = Number(pricing.freeThreshold) || 0;

    // 무료배송 체크
    const orderAmount = dto.orderAmount ?? 0;
    const isFree = freeThreshold > 0 && orderAmount >= freeThreshold;

    if (isFree) {
      return {
        baseFee: 0,
        distanceFee: 0,
        surchargeFee: 0,
        extraFee: 0,
        totalFee: 0,
        isFree: true,
      };
    }

    const totalFee = baseFee + islandFee;

    return {
      baseFee,
      distanceFee: 0,
      surchargeFee: 0,
      extraFee: islandFee,
      totalFee,
      isFree: false,
      breakdown: {
        distanceRange: dto.isIsland ? '도서산간' : '일반',
      },
    };
  }

  /**
   * 화물 요금 계산
   *
   * 공식:
   * 1. 무게/부피에 해당하는 크기 구간 찾기
   * 2. 기본요금 + 크기별추가요금
   * 3. 야간/주말 할증 적용
   */
  private calculateFreightFee(
    pricing: any,
    dto: CalculateDeliveryFeeDto
  ): DeliveryFeeResultDto {
    const baseFee = Number(pricing.baseFee) || 0;
    const weight = dto.weight ?? 0;
    const volume = dto.volume ?? 0;

    // 크기 구간별 추가요금
    let sizeFee = 0;
    let sizeName = '';
    const sizeRanges = (pricing.sizeRanges as SizeRangeDto[]) || [];

    if (sizeRanges.length > 0) {
      // 무게 또는 부피 기준으로 구간 찾기
      const range = sizeRanges.find(r => {
        const weightOk = !r.maxWeight || weight <= r.maxWeight;
        const volumeOk = !r.maxVolume || volume <= r.maxVolume;
        return weightOk && volumeOk;
      });

      if (range) {
        sizeFee = range.price;
        sizeName = range.name;
      } else {
        // 최대 구간 적용
        const maxRange = sizeRanges[sizeRanges.length - 1];
        sizeFee = maxRange.price;
        sizeName = maxRange.name + ' (초과)';
      }
    }

    // 할증 계산
    let surchargeFee = 0;
    let surchargeRate = 0;
    let surchargeType = '';
    const subtotal = baseFee + sizeFee;

    if (dto.isNight && pricing.nightSurchargeRate) {
      const nightRate = Number(pricing.nightSurchargeRate);
      surchargeFee += subtotal * nightRate;
      surchargeRate += nightRate;
      surchargeType = '야간';
    }

    if (dto.isWeekend && pricing.weekendSurchargeRate) {
      const weekendRate = Number(pricing.weekendSurchargeRate);
      surchargeFee += subtotal * weekendRate;
      surchargeRate += weekendRate;
      surchargeType = surchargeType ? `${surchargeType}+주말` : '주말';
    }

    const totalFee = Math.round(baseFee + sizeFee + surchargeFee);

    return {
      baseFee,
      distanceFee: 0,
      surchargeFee: Math.round(surchargeFee),
      extraFee: sizeFee,
      totalFee,
      isFree: false,
      breakdown: {
        distanceRange: sizeName,
        surchargeRate,
        surchargeType,
      },
    };
  }

  // ==================== 초기 데이터 설정 ====================

  /**
   * 기본 배송비 설정 초기화 (기존 데이터 덮어쓰기)
   */
  async initializeDefaultPricing() {
    // production_settings 배송 데이터 기준으로 초기화
    const defaults = [
      {
        deliveryMethod: 'parcel' as const,
        name: '택배',
        baseFee: 5500, // production_settings 기준
        islandFee: 3000,
        freeThreshold: 50000,
        packagingFee: 0,
        shippingFee: 0,
        sortOrder: 1,
        isActive: true,
      },
      {
        deliveryMethod: 'motorcycle' as const,
        name: '오토바이(퀵)',
        baseFee: 0,
        packagingFee: 0,
        shippingFee: 0,
        distanceRanges: [
          { minDistance: 0, maxDistance: 5, price: 3000 },
          { minDistance: 5, maxDistance: 10, price: 13000 },
          { minDistance: 10, maxDistance: 15, price: 18000 },
          { minDistance: 15, maxDistance: 20, price: 20000 },
        ],
        extraPricePerKm: 1000,
        maxBaseDistance: 20,
        nightSurchargeRate: 0.3,
        nightStartHour: 22,
        nightEndHour: 6,
        weekendSurchargeRate: 0.2,
        sortOrder: 2,
        isActive: true,
      },
      {
        deliveryMethod: 'damas' as const,
        name: '다마스',
        baseFee: 55000, // production_settings 기준
        packagingFee: 0,
        shippingFee: 0,
        distanceRanges: [
          { minDistance: 0, maxDistance: 5, price: 15000 },
          { minDistance: 5, maxDistance: 10, price: 20000 },
          { minDistance: 10, maxDistance: 15, price: 25000 },
          { minDistance: 15, maxDistance: 20, price: 30000 },
        ],
        extraPricePerKm: 1500,
        maxBaseDistance: 20,
        nightSurchargeRate: 0.3,
        weekendSurchargeRate: 0.2,
        sortOrder: 3,
        isActive: true,
      },
      {
        deliveryMethod: 'freight' as const,
        name: '화물',
        baseFee: 30000,
        packagingFee: 0,
        shippingFee: 0,
        sizeRanges: [
          { name: '소형', maxWeight: 30, maxVolume: 0.1, price: 0 },
          { name: '중형', maxWeight: 100, maxVolume: 0.5, price: 20000 },
          { name: '대형', maxWeight: 300, maxVolume: 1.0, price: 50000 },
          { name: '특대형', maxWeight: null, maxVolume: null, price: 100000 },
        ],
        nightSurchargeRate: 0.2,
        weekendSurchargeRate: 0.1,
        sortOrder: 4,
        isActive: true,
      },
      {
        deliveryMethod: 'pickup' as const,
        name: '방문수령',
        baseFee: 0,
        packagingFee: 0,
        shippingFee: 0,
        sortOrder: 5,
        isActive: true,
      },
    ];

    // 기존 데이터 모두 삭제 후 새로 생성 (깔끔한 초기화)
    await this.prisma.deliveryPricing.deleteMany({});

    for (const def of defaults) {
      const { distanceRanges, sizeRanges, ...data } = def;
      await this.prisma.deliveryPricing.create({
        data: {
          ...data,
          distanceRanges: distanceRanges ? JSON.parse(JSON.stringify(distanceRanges)) : Prisma.JsonNull,
          sizeRanges: sizeRanges ? JSON.parse(JSON.stringify(sizeRanges)) : Prisma.JsonNull,
        },
      });
    }

    return { message: '기본 배송비 설정이 초기화되었습니다' };
  }
}

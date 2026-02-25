import { IsString, IsOptional, IsInt, Min, IsBoolean, IsIn, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

// ==================== 배송방법 타입 ====================

export const DELIVERY_METHODS = ['parcel', 'motorcycle', 'damas', 'freight', 'pickup'] as const;
export type DeliveryMethod = typeof DELIVERY_METHODS[number];

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  parcel: '택배',
  motorcycle: '오토바이(퀵)',
  damas: '다마스',
  freight: '화물',
  pickup: '방문수령',
};

// ==================== 택배사 코드 (스마트택배 기준) ====================

/** 전체 택배사 코드 목록 (참조용) */
export const COURIER_CODES: Record<string, string> = {
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

/**
 * 계약/연동 완료된 활성 택배사 코드 목록
 * - 기본: 로젠택배(06)만 활성화
 * - 다른 택배사 계약 시 이 배열에 코드 추가
 *   예) CJ대한통운 계약 → '04' 추가
 */
export const ACTIVE_COURIER_CODES: string[] = [
  '06', // 로젠택배 (기본, 자동발급 지원)
  // '04', // CJ대한통운 (계약 후 활성화)
  // '05', // 한진택배 (계약 후 활성화)
  // '01', // 우체국택배 (계약 후 활성화)
  // '08', // 롯데택배 (계약 후 활성화)
  // '11', // 일양로지스 (계약 후 활성화)
  // '23', // 경동택배 (계약 후 활성화)
  // '32', // 합동택배 (계약 후 활성화)
  // '88', // 대신택배 (계약 후 활성화)
];

// ==================== 거리 구간 단가 DTO ====================

export class DistanceRangeDto {
  @ApiProperty({ description: '시작 거리 (km)' })
  @IsNumber()
  minDistance: number;

  @ApiProperty({ description: '종료 거리 (km)' })
  @IsNumber()
  maxDistance: number;

  @ApiProperty({ description: '단가 (원)' })
  @IsNumber()
  price: number;
}

// ==================== 크기/무게 구간 DTO (화물용) ====================

export class SizeRangeDto {
  @ApiProperty({ description: '구간명 (예: 소형, 중형, 대형)' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '최대 무게 (kg)' })
  @IsOptional()
  @IsNumber()
  maxWeight?: number;

  @ApiPropertyOptional({ description: '최대 부피 (m³)' })
  @IsOptional()
  @IsNumber()
  maxVolume?: number;

  @ApiProperty({ description: '추가요금 (원)' })
  @IsNumber()
  price: number;
}

// ==================== 배송비 설정 DTO ====================

export class CreateDeliveryPricingDto {
  @ApiProperty({ description: '배송방법', enum: DELIVERY_METHODS })
  @IsIn(DELIVERY_METHODS)
  deliveryMethod: DeliveryMethod;

  @ApiProperty({ description: '표시명' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '기본요금', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  baseFee?: number;

  // 택배용
  @ApiPropertyOptional({ description: '포장비 (택배 전용)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  packagingFee?: number;

  @ApiPropertyOptional({ description: '배송비 (택배 전용)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  shippingFee?: number;

  // 거리별 요금 설정 (오토바이/다마스용)
  @ApiPropertyOptional({ description: '거리 구간별 단가 배열', type: [DistanceRangeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DistanceRangeDto)
  distanceRanges?: DistanceRangeDto[];

  @ApiPropertyOptional({ description: 'km당 추가요금 (최대거리 초과 시)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  extraPricePerKm?: number;

  @ApiPropertyOptional({ description: '기본요금 적용 최대거리 (km)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxBaseDistance?: number;

  // 할증 설정
  @ApiPropertyOptional({ description: '야간할증 비율 (0.3 = 30%)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  nightSurchargeRate?: number;

  @ApiPropertyOptional({ description: '야간 시작 시간', default: 22 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  nightStartHour?: number;

  @ApiPropertyOptional({ description: '야간 종료 시간', default: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  nightEndHour?: number;

  @ApiPropertyOptional({ description: '주말/공휴일 할증 비율' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weekendSurchargeRate?: number;

  // 화물용
  @ApiPropertyOptional({ description: '크기/무게별 추가요금 배열', type: [SizeRangeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeRangeDto)
  sizeRanges?: SizeRangeDto[];

  // 택배용
  @ApiPropertyOptional({ description: '도서산간 추가요금' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  islandFee?: number;

  @ApiPropertyOptional({ description: '무료배송 기준금액' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  freeThreshold?: number;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성화 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDeliveryPricingDto extends PartialType(CreateDeliveryPricingDto) {}

// ==================== 배송비 계산 요청 DTO ====================

export class CalculateDeliveryFeeDto {
  @ApiProperty({ description: '배송방법', enum: DELIVERY_METHODS })
  @IsIn(DELIVERY_METHODS)
  deliveryMethod: DeliveryMethod;

  @ApiPropertyOptional({ description: '거리 (km) - 오토바이/다마스용' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  distance?: number;

  @ApiPropertyOptional({ description: '무게 (kg) - 화물용' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: '부피 (m³) - 화물용' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  volume?: number;

  @ApiPropertyOptional({ description: '주문금액 - 택배 무료배송 판단용' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  orderAmount?: number;

  @ApiPropertyOptional({ description: '도서산간 여부 - 택배용' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isIsland?: boolean;

  @ApiPropertyOptional({ description: '야간 여부' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isNight?: boolean;

  @ApiPropertyOptional({ description: '주말/공휴일 여부' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isWeekend?: boolean;
}

// ==================== 배송비 계산 결과 DTO ====================

export class DeliveryFeeResultDto {
  @ApiProperty({ description: '기본요금' })
  baseFee: number;

  @ApiProperty({ description: '거리별 요금' })
  distanceFee: number;

  @ApiProperty({ description: '할증요금 (야간/주말)' })
  surchargeFee: number;

  @ApiProperty({ description: '추가요금 (도서산간/크기)' })
  extraFee: number;

  @ApiProperty({ description: '총 배송비' })
  totalFee: number;

  @ApiProperty({ description: '무료배송 여부' })
  isFree: boolean;

  @ApiPropertyOptional({ description: '계산 상세 내역' })
  breakdown?: {
    distanceRange?: string;
    surchargeRate?: number;
    surchargeType?: string;
  };
}

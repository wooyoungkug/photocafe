import { IsString, IsOptional, IsInt, Min, IsBoolean, IsIn, IsArray, IsNumber, ValidateNested, IsObject, Allow } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

// ==================== 인디고/잉크젯 가격 DTO ====================

// 인디고 Up별 가격 (기본 단면/양면 + 4도칼라/6도칼라)
export class IndigoUpPriceDto {
  @ApiProperty({ description: 'Up 수 (1~8)' })
  @IsInt()
  @Min(1)
  up: number;

  @ApiPropertyOptional({ description: '가중치' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  // 기본 가격 (프론트엔드 호환용)
  @ApiPropertyOptional({ description: '단면 단가' })
  @IsOptional()
  @IsNumber()
  singleSidedPrice?: number;

  @ApiPropertyOptional({ description: '양면 단가' })
  @IsOptional()
  @IsNumber()
  doubleSidedPrice?: number;

  // 4도칼라 가격
  @ApiPropertyOptional({ description: '4도칼라 단면 단가' })
  @IsOptional()
  @IsNumber()
  fourColorSinglePrice?: number;

  @ApiPropertyOptional({ description: '4도칼라 양면 단가' })
  @IsOptional()
  @IsNumber()
  fourColorDoublePrice?: number;

  // 6도칼라 가격
  @ApiPropertyOptional({ description: '6도칼라 단면 단가' })
  @IsOptional()
  @IsNumber()
  sixColorSinglePrice?: number;

  @ApiPropertyOptional({ description: '6도칼라 양면 단가' })
  @IsOptional()
  @IsNumber()
  sixColorDoublePrice?: number;
}

// 단가 그룹 Up별 가격
export class PriceGroupUpPriceDto {
  @ApiProperty({ description: 'Up 수' })
  @IsInt()
  up: number;

  @ApiPropertyOptional({ description: '가중치' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: '4도칼라 단면 단가' })
  @IsOptional()
  @IsNumber()
  fourColorSinglePrice?: number;

  @ApiPropertyOptional({ description: '4도칼라 양면 단가' })
  @IsOptional()
  @IsNumber()
  fourColorDoublePrice?: number;

  @ApiPropertyOptional({ description: '6도칼라 단면 단가' })
  @IsOptional()
  @IsNumber()
  sixColorSinglePrice?: number;

  @ApiPropertyOptional({ description: '6도칼라 양면 단가' })
  @IsOptional()
  @IsNumber()
  sixColorDoublePrice?: number;
}

// 단가 그룹 내 규격별 가격 (잉크젯용)
export class PriceGroupSpecPriceDto {
  @ApiProperty({ description: '규격 ID' })
  @IsString()
  specificationId: string;

  @ApiProperty({ description: '단면 단가' })
  @IsNumber()
  singleSidedPrice: number;

  @ApiPropertyOptional({ description: '가중치' })
  @IsOptional()
  @IsNumber()
  weight?: number;
}

// 길이별 구간 단가 DTO (finishing_length용)
export class LengthPriceRangeDto {
  @ApiProperty({ description: '시작 길이' })
  @IsNumber()
  minLength: number;

  @ApiProperty({ description: '끝 길이' })
  @IsNumber()
  maxLength: number;

  @ApiProperty({ description: '단가' })
  @IsNumber()
  price: number;
}

// 면적별 구간 단가 DTO (finishing_area용 - 가로×세로)
export class AreaPriceRangeDto {
  @ApiProperty({ description: '최대 가로' })
  @IsNumber()
  maxWidth: number;

  @ApiProperty({ description: '최대 세로' })
  @IsNumber()
  maxHeight: number;

  @ApiPropertyOptional({ description: '면적 (가로×세로, 자동계산)' })
  @IsOptional()
  @IsNumber()
  area?: number;

  @ApiProperty({ description: '단가' })
  @IsNumber()
  price: number;
}

// 거리별 구간 단가 DTO (배송비용)
export class DistancePriceRangeDto {
  @ApiProperty({ description: '시작 거리 (km)' })
  @IsNumber()
  minDistance: number;

  @ApiProperty({ description: '끝 거리 (km)' })
  @IsNumber()
  maxDistance: number;

  @ApiProperty({ description: '단가' })
  @IsNumber()
  price: number;
}

// 단가 그룹
export class PriceGroupDto {
  @ApiProperty({ description: '그룹 ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: '그룹 컬러' })
  @IsString()
  color: string;

  @ApiPropertyOptional({ description: 'Up별 가격 (인디고용)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceGroupUpPriceDto)
  upPrices?: PriceGroupUpPriceDto[];

  @ApiPropertyOptional({ description: '규격별 가격 (잉크젯용)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceGroupSpecPriceDto)
  specPrices?: PriceGroupSpecPriceDto[];

  @ApiPropertyOptional({ description: '잉크젯 기준규격 ID' })
  @IsOptional()
  @IsString()
  inkjetBaseSpecId?: string;

  @ApiPropertyOptional({ description: '잉크젯 sq inch당 기준가격' })
  @IsOptional()
  @IsNumber()
  inkjetBasePrice?: number;

  @ApiPropertyOptional({ description: '단가 입력 방식 (spec: 기준규격, sqinch: sq" 단가)' })
  @IsOptional()
  @IsString()
  pricingMode?: string;
}

// 잉크젯 규격별 가격
export class InkjetSpecPriceDto {
  @ApiProperty({ description: '규격 ID' })
  @IsString()
  specificationId: string;

  @ApiProperty({ description: '단면 단가' })
  @IsNumber()
  singleSidedPrice: number;

  @ApiPropertyOptional({ description: '가중치 (기본값: 1)', default: 1 })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: '기준규격 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isBaseSpec?: boolean;
}

// 구간별 Nup/1p가격 (nup_page_range용)
export class NupPageRangeDto {
  @ApiProperty({ description: '규격 ID (Nup 정보 연동)' })
  @IsString()
  specificationId: string;

  @ApiProperty({ description: '기본 페이지 수 (예: 30)' })
  @IsNumber()
  basePages: number;

  @ApiProperty({ description: '기본 가격 (예: 10000)' })
  @IsNumber()
  basePrice: number;

  @ApiProperty({ description: '1p당 추가 가격 (예: 200)' })
  @IsNumber()
  pricePerPage: number;

  @ApiPropertyOptional({ description: '구간별 가격 (예: { "30": 20000, "40": 23000 })' })
  @IsOptional()
  @IsObject()
  @Allow()
  rangePrices?: Record<string, number>;
}

// 가격 계산 방식
export const PRICING_TYPES = [
  'paper_output_spec', // [출력전용] 용지별출력단가/1p가격 (인쇄방식+규격)
  'nup_page_range',    // [제본전용] 구간별 Nup/1p가격
  'finishing_spec_nup', // [후가공전용] 규격별 Nup/1p단가
  'finishing_length',   // [후가공전용] 길이별단가
  'finishing_area',     // [후가공전용] 면적별단가
  // 배송비 전용
  'delivery_parcel',     // [배송] 택배
  'delivery_motorcycle', // [배송] 오토바이퀵배달
  'delivery_damas',      // [배송] 다마스
  'delivery_freight',    // [배송] 화물배송
  'delivery_pickup',     // [배송] 방문수령
] as const;
export type PricingType = typeof PRICING_TYPES[number];

// 가격 계산 방식 라벨
export const PRICING_TYPE_LABELS: Record<PricingType, string> = {
  paper_output_spec: '[출력전용] 용지별출력단가/1p가격',
  nup_page_range: '[제본전용] 구간별 Nup/1p가격',
  finishing_spec_nup: '[후가공전용] 규격별 Nup/1p단가',
  finishing_length: '[후가공전용] 길이별단가',
  finishing_area: '[후가공전용] 면적별단가',
  // 배송비 전용
  delivery_parcel: '[배송] 택배',
  delivery_motorcycle: '[배송] 오토바이퀵배달',
  delivery_damas: '[배송] 다마스',
  delivery_freight: '[배송] 화물배송',
  delivery_pickup: '[배송] 방문수령',
};

// 배송방법 타입
export const DELIVERY_PRICING_TYPES = [
  'delivery_parcel',
  'delivery_motorcycle',
  'delivery_damas',
  'delivery_freight',
  'delivery_pickup',
] as const;
export type DeliveryPricingType = typeof DELIVERY_PRICING_TYPES[number];

// 배송방법 라벨
export const DELIVERY_METHOD_LABELS: Record<DeliveryPricingType, string> = {
  delivery_parcel: '택배',
  delivery_motorcycle: '오토바이퀵배달',
  delivery_damas: '다마스',
  delivery_freight: '화물배송',
  delivery_pickup: '방문수령',
};

// 할증조건 타입
export const SURCHARGE_TYPES = [
  'night30_weekend20',  // 야간 30%, 주말 20%
  'night20_weekend10',  // 야간 20%, 주말 10%
  'free_condition',     // 무료배송 조건
  'none',               // 할증 없음
] as const;
export type SurchargeType = typeof SURCHARGE_TYPES[number];

// 할증조건 라벨
export const SURCHARGE_TYPE_LABELS: Record<SurchargeType, string> = {
  night30_weekend20: '야간 30% / 주말 20%',
  night20_weekend10: '야간 20% / 주말 10%',
  free_condition: '무료배송 조건',
  none: '할증 없음',
};

// 업체 타입
export const VENDOR_TYPES = ['in_house', 'outsourced'] as const;
export type VendorType = typeof VENDOR_TYPES[number];

// ==================== 생산그룹 DTO ====================

export class CreateProductionGroupDto {
  @ApiPropertyOptional({ description: '그룹 코드 (비워두면 자동 생성)' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: '그룹명' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '상위 그룹 ID (소분류인 경우)' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성화 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProductionGroupDto extends PartialType(CreateProductionGroupDto) { }

export class ProductionGroupQueryDto {
  @ApiPropertyOptional({ description: '상위 그룹 ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'depth (1: 대분류, 2: 소분류)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  depth?: number;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '검색어' })
  @IsOptional()
  @IsString()
  search?: string;
}

// ==================== 생산설정 DTO ====================

export class CreateProductionSettingDto {
  @ApiProperty({ description: '생산그룹 ID' })
  @IsString()
  groupId: string;

  @ApiPropertyOptional({ description: '코드명' })
  @IsOptional()
  @IsString()
  codeName?: string;

  @ApiPropertyOptional({ description: '업체 타입', enum: VENDOR_TYPES, default: 'in_house' })
  @IsOptional()
  @IsIn(VENDOR_TYPES)
  vendorType?: VendorType;

  @ApiProperty({ description: '가격 계산 방식', enum: PRICING_TYPES })
  @IsIn(PRICING_TYPES)
  pricingType: PricingType;

  @ApiPropertyOptional({ description: '세팅명 (예: 박Color)' })
  @IsOptional()
  @IsString()
  settingName?: string;

  @ApiPropertyOptional({ description: 'S코드' })
  @IsOptional()
  @IsString()
  sCode?: string;

  @ApiPropertyOptional({ description: '잡세팅비', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  settingFee?: number;

  @ApiPropertyOptional({ description: '기본단가', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  basePrice?: number;

  @ApiPropertyOptional({ description: '작업시간 (일 단위)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  workDays?: number;

  @ApiPropertyOptional({ description: '가중치 구분 정보' })
  @IsOptional()
  @IsString()
  weightInfo?: string;

  @ApiPropertyOptional({ description: '선택된 규격 ID 배열' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificationIds?: string[];

  @ApiPropertyOptional({ description: '인쇄 방식 (indigo, inkjet)', default: 'indigo' })
  @IsOptional()
  @IsString()
  printMethod?: string;

  @ApiPropertyOptional({ description: '선택된 용지 ID 배열' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paperIds?: string[];

  @ApiPropertyOptional({ description: '규격 용도 선택 (all, indigo, inkjet, album, frame, booklet)', default: 'all' })
  @IsOptional()
  @IsString()
  specUsageType?: string;

  @ApiPropertyOptional({ description: '단면 단가' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  singleSidedPrice?: number;

  @ApiPropertyOptional({ description: '양면 단가' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  doubleSidedPrice?: number;

  @ApiPropertyOptional({ description: '인디고 Up별 가격 (paper_output_spec 인디고용)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IndigoUpPriceDto)
  indigoUpPrices?: IndigoUpPriceDto[];

  @ApiPropertyOptional({ description: '잉크젯 규격별 가격 (paper_output_spec 잉크젯용)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InkjetSpecPriceDto)
  inkjetSpecPrices?: InkjetSpecPriceDto[];

  @ApiPropertyOptional({ description: '구간별 Nup/1p가격 (nup_page_range용)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NupPageRangeDto)
  nupPageRanges?: NupPageRangeDto[];

  @ApiPropertyOptional({ description: '페이지 구간 배열 (예: [30, 40, 50, 60])' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  pageRanges?: number[];

  @ApiPropertyOptional({ description: '잉크젯 기준규격 ID (sq inch 가격 계산 기준)' })
  @IsOptional()
  @IsString()
  baseSpecificationId?: string;

  @ApiPropertyOptional({ description: '단가 그룹 배열 (인디고용, 최대 5개)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceGroupDto)
  priceGroups?: PriceGroupDto[];

  @ApiPropertyOptional({ description: '용지별 그룹 할당 맵 (paperId → priceGroupId | null)' })
  @IsOptional()
  @IsObject()
  @Allow()
  paperPriceGroupMap?: Record<string, string | null>;

  @ApiPropertyOptional({ description: '길이 단위 (cm, mm)', default: 'cm' })
  @IsOptional()
  @IsString()
  lengthUnit?: string;

  @ApiPropertyOptional({ description: '길이별 구간 단가 배열', type: [LengthPriceRangeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LengthPriceRangeDto)
  lengthPriceRanges?: LengthPriceRangeDto[];

  @ApiPropertyOptional({ description: '길이 단위 (mm, cm, m) - 가로×세로 규격용', default: 'mm' })
  @IsOptional()
  @IsString()
  areaUnit?: string;

  @ApiPropertyOptional({ description: '가로×세로 규격별 구간 단가 배열', type: [AreaPriceRangeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AreaPriceRangeDto)
  areaPriceRanges?: AreaPriceRangeDto[];

  // ==================== 배송비 관련 필드 ====================

  @ApiPropertyOptional({ description: '할증조건 타입', enum: SURCHARGE_TYPES })
  @IsOptional()
  @IsIn(SURCHARGE_TYPES)
  surchargeType?: SurchargeType;

  @ApiPropertyOptional({ description: '거리별 구간 단가 배열 (배송비용)', type: [DistancePriceRangeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DistancePriceRangeDto)
  distancePriceRanges?: DistancePriceRangeDto[];

  @ApiPropertyOptional({ description: 'km당 추가단가 (거리비례 계산시)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  extraPricePerKm?: number;

  @ApiPropertyOptional({ description: '기본거리 (km, 이 거리까지 기본요금)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxBaseDistance?: number;

  @ApiPropertyOptional({ description: '무료배송 기준금액' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  freeThreshold?: number;

  @ApiPropertyOptional({ description: '도서산간 추가비용' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  islandFee?: number;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성화 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProductionSettingDto extends PartialType(CreateProductionSettingDto) { }

export class ProductionSettingQueryDto {
  @ApiPropertyOptional({ description: '생산그룹 ID' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ description: '가격 계산 방식', enum: PRICING_TYPES })
  @IsOptional()
  @IsIn(PRICING_TYPES)
  pricingType?: PricingType;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}

// ==================== 규격 연결 DTO ====================

export class UpdateSpecificationsDto {
  @ApiProperty({ description: '규격 ID 배열' })
  @IsArray()
  @IsString({ each: true })
  specificationIds: string[];
}

// ==================== 가격 설정 DTO ====================

export class ProductionSettingPriceDto {
  @ApiPropertyOptional({ description: '규격 ID (규격별 가격인 경우)' })
  @IsOptional()
  @IsString()
  specificationId?: string;

  @ApiPropertyOptional({ description: '최소 수량' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minQuantity?: number;

  @ApiPropertyOptional({ description: '최대 수량' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxQuantity?: number;

  @ApiProperty({ description: '가격' })
  @Type(() => Number)
  @IsNumber()
  price: number;
}

export class UpdatePricesDto {
  @ApiProperty({ description: '가격 목록' })
  @IsArray()
  @Type(() => ProductionSettingPriceDto)
  prices: ProductionSettingPriceDto[];
}

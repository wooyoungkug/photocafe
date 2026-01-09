import { IsString, IsOptional, IsInt, Min, IsBoolean, IsIn, IsArray, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

// 가격 계산 방식
export const PRICING_TYPES = [
  'paper_output',   // [1.출력전용] 용지별 출력단가
  'binding_page',   // [2.제본전용] 기본단가+page단가
  'finishing_qty',  // [3.후가공] 규격별(수량)
  'finishing_page', // [3.후가공] 규격별(페이지당)
  'per_sheet',      // 장당가격 (규격입력안함)
] as const;
export type PricingType = typeof PRICING_TYPES[number];

// 가격 계산 방식 라벨
export const PRICING_TYPE_LABELS: Record<PricingType, string> = {
  paper_output: '[1.출력전용] 용지별 출력단가',
  binding_page: '[2.제본전용] 기본단가+page단가',
  finishing_qty: '[3.후가공] 규격별(수량)',
  finishing_page: '[3.후가공] 규격별(페이지당)',
  per_sheet: '장당가격 (규격입력안함)',
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

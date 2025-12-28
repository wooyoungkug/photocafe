import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsIn,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ==================== 규격 DTO ====================
export class HalfProductSpecificationDto {
  @ApiProperty({ description: '규격명' })
  @IsString()
  name: string;

  @ApiProperty({ description: '가로 (mm)' })
  @IsNumber()
  @Min(0)
  widthMm: number;

  @ApiProperty({ description: '세로 (mm)' })
  @IsNumber()
  @Min(0)
  heightMm: number;

  @ApiPropertyOptional({ description: '추가 가격' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '기본값 여부' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

// ==================== 가격 단계 DTO ====================
export class HalfProductPriceTierDto {
  @ApiProperty({ description: '최소 수량' })
  @IsNumber()
  @Min(1)
  minQuantity: number;

  @ApiPropertyOptional({ description: '최대 수량 (null이면 무제한)' })
  @IsOptional()
  @IsNumber()
  maxQuantity?: number;

  @ApiProperty({ description: '할인율 (1.0 = 정가, 0.9 = 10% 할인)' })
  @IsNumber()
  @Min(0)
  @Max(2)
  discountRate: number;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

// ==================== 옵션 DTO ====================
export class HalfProductOptionValueDto {
  @ApiProperty({ description: '옵션값 이름' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '추가 가격' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '기본값 여부' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class HalfProductOptionDto {
  @ApiProperty({ description: '옵션명' })
  @IsString()
  name: string;

  @ApiProperty({ description: '옵션 타입', enum: ['select', 'checkbox'] })
  @IsIn(['select', 'checkbox'])
  type: string;

  @ApiProperty({ description: '옵션값 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HalfProductOptionValueDto)
  values: HalfProductOptionValueDto[];

  @ApiPropertyOptional({ description: '수량 타입', enum: ['auto', 'manual'] })
  @IsOptional()
  @IsIn(['auto', 'manual'])
  quantityType?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

// ==================== 반제품 생성 DTO ====================
export class CreateHalfProductDto {
  @ApiProperty({ description: '반제품 코드' })
  @IsString()
  code: string;

  @ApiProperty({ description: '반제품명' })
  @IsString()
  name: string;

  @ApiProperty({ description: '대분류 카테고리 ID' })
  @IsString()
  categoryLargeId: string;

  @ApiProperty({ description: '기본 가격' })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ description: '가격 가산 방식 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isPriceAdditive?: boolean;

  @ApiPropertyOptional({ description: '회원 유형', enum: ['all', 'member_only', 'specific_groups'] })
  @IsOptional()
  @IsIn(['all', 'member_only', 'specific_groups'])
  memberType?: string;

  @ApiPropertyOptional({ description: '필수 파일 수', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  requiredFileCount?: number;

  @ApiPropertyOptional({ description: '썸네일 URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: '상세 이미지 URL 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  detailImages?: string[];

  @ApiPropertyOptional({ description: '상태', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '규격 옵션' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HalfProductSpecificationDto)
  specifications?: HalfProductSpecificationDto[];

  @ApiPropertyOptional({ description: '가격 단계' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HalfProductPriceTierDto)
  priceTiers?: HalfProductPriceTierDto[];

  @ApiPropertyOptional({ description: '옵션' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HalfProductOptionDto)
  options?: HalfProductOptionDto[];
}

export class UpdateHalfProductDto extends PartialType(CreateHalfProductDto) {}

export class HalfProductQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 항목 수', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: '검색어 (반제품명, 코드)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '카테고리 ID' })
  @IsOptional()
  @IsString()
  categoryLargeId?: string;

  @ApiPropertyOptional({ description: '상태' })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}

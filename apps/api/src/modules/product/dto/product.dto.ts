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
export class ProductSpecificationDto {
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

// ==================== 제본 DTO ====================
export class ProductBindingDto {
  @ApiProperty({ description: '제본방법명' })
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

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '연결된 단가설정 ID' })
  @IsOptional()
  @IsString()
  productionSettingId?: string;

  @ApiPropertyOptional({ description: '단가 계산 방식' })
  @IsOptional()
  @IsString()
  pricingType?: string;
}

// ==================== 용지 DTO ====================
export class ProductPaperDto {
  @ApiProperty({ description: '용지명' })
  @IsString()
  name: string;

  @ApiProperty({ description: '용지 타입', enum: ['normal', 'premium', 'imported', 'sheet', 'roll'] })
  @IsIn(['normal', 'premium', 'imported', 'sheet', 'roll'])
  type: string;

  @ApiPropertyOptional({ description: '출력방식', enum: ['indigo', 'inkjet', 'offset'] })
  @IsOptional()
  @IsString()
  printMethod?: string;

  @ApiPropertyOptional({ description: '평량 (g/m²)' })
  @IsOptional()
  @IsNumber()
  grammage?: number;

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

// ==================== 커버 DTO ====================
export class ProductCoverDto {
  @ApiProperty({ description: '커버명' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '소재 코드' })
  @IsOptional()
  @IsString()
  materialCode?: string;

  @ApiPropertyOptional({ description: '추가 가격' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '이미지 URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: '기본값 여부' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

// ==================== 박 DTO ====================
export class ProductFoilDto {
  @ApiProperty({ description: '박명' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '박색상' })
  @IsOptional()
  @IsString()
  color?: string;

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

// ==================== 후가공 DTO ====================
export class ProductFinishingDto {
  @ApiProperty({ description: '후가공명' })
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

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

// ==================== 상품 생성 DTO ====================
export class CreateProductDto {
  @ApiProperty({ description: '상품 코드' })
  @IsString()
  productCode: string;

  @ApiProperty({ description: '상품명' })
  @IsString()
  productName: string;

  @ApiProperty({ description: '카테고리 ID' })
  @IsString()
  categoryId: string;

  @ApiProperty({ description: '기본 가격' })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ description: '활성화 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '신상품 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isNew?: boolean;

  @ApiPropertyOptional({ description: '베스트 상품 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isBest?: boolean;

  @ApiPropertyOptional({ description: '회원 유형', enum: ['all', 'member_only', 'specific_groups'] })
  @IsOptional()
  @IsIn(['all', 'member_only', 'specific_groups'])
  memberType?: string;

  @ApiPropertyOptional({ description: '썸네일 URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: '상세 이미지 URL 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  detailImages?: string[];

  @ApiPropertyOptional({ description: '상품 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '제본 방향', enum: ['left', 'right', 'customer'] })
  @IsOptional()
  @IsIn(['left', 'right', 'customer'])
  bindingDirection?: string;

  @ApiPropertyOptional({ description: '출력 타입', enum: ['single', 'double', 'customer'] })
  @IsOptional()
  @IsIn(['single', 'double', 'customer'])
  printType?: string;

  @ApiPropertyOptional({ description: '규격 옵션' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecificationDto)
  specifications?: ProductSpecificationDto[];

  @ApiPropertyOptional({ description: '제본 옵션' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductBindingDto)
  bindings?: ProductBindingDto[];

  @ApiPropertyOptional({ description: '용지 옵션' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPaperDto)
  papers?: ProductPaperDto[];

  @ApiPropertyOptional({ description: '커버 옵션' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductCoverDto)
  covers?: ProductCoverDto[];

  @ApiPropertyOptional({ description: '박 옵션' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductFoilDto)
  foils?: ProductFoilDto[];

  @ApiPropertyOptional({ description: '후가공 옵션' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductFinishingDto)
  finishings?: ProductFinishingDto[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ProductQueryDto {
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

  @ApiPropertyOptional({ description: '검색어 (상품명, 코드)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '카테고리 ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '신상품 여부' })
  @IsOptional()
  @IsBoolean()
  isNew?: boolean;

  @ApiPropertyOptional({ description: '베스트 상품 여부' })
  @IsOptional()
  @IsBoolean()
  isBest?: boolean;
}

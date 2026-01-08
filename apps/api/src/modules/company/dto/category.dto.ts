import { IsString, IsOptional, IsInt, Min, IsBoolean, IsIn, Length, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

// 카테고리 타입
export const CATEGORY_TYPES = ['HTML', 'POD', 'EDITOR', 'HALF'] as const;
export type CategoryType = typeof CATEGORY_TYPES[number];

// 로그인 노출 설정
export const LOGIN_VISIBILITY_OPTIONS = ['always', 'logged_in', 'logged_out'] as const;
export type LoginVisibility = typeof LOGIN_VISIBILITY_OPTIONS[number];

// 생산폼 옵션
export const PRODUCTION_FORM_OPTIONS = [
  'digital_print',    // 디지털출력
  'compressed_album', // 압축앨범
  'photobook',        // 화보
  'frame',            // 액자
  'business_card',    // 명함
  'booklet',          // 책자
  'poster',           // 포스터
  'menu',             // 메뉴판
] as const;
export type ProductionFormType = typeof PRODUCTION_FORM_OPTIONS[number];

// 가격단위 옵션
export const PRICING_UNIT_OPTIONS = ['paper_based', 'size_based', 'per_item'] as const;
export type PricingUnit = typeof PRICING_UNIT_OPTIONS[number];

// 매출 통계용 분류
export const SALES_CATEGORY_OPTIONS = ['album', 'print', 'frame', 'goods', 'canvas', 'calendar', 'etc'] as const;
export type SalesCategory = typeof SALES_CATEGORY_OPTIONS[number];

export class CreateCategoryDto {
  @ApiPropertyOptional({ description: '카테고리 코드 (8자리)', example: '65000000' })
  @IsOptional()
  @IsString()
  @Length(8, 8)
  code?: string;

  @ApiProperty({ description: '카테고리명' })
  @IsString()
  name: string;

  @ApiProperty({ description: '분류 레벨', enum: ['large', 'medium', 'small'] })
  @IsIn(['large', 'medium', 'small'])
  level: string;

  @ApiPropertyOptional({ description: '상위 카테고리 ID' })
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

  @ApiPropertyOptional({ description: '노출 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: '상단메뉴 노출 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isTopMenu?: boolean;

  @ApiPropertyOptional({
    description: '로그인 메뉴 노출 설정',
    enum: LOGIN_VISIBILITY_OPTIONS,
    default: 'always',
  })
  @IsOptional()
  @IsIn(LOGIN_VISIBILITY_OPTIONS)
  loginVisibility?: LoginVisibility;

  @ApiPropertyOptional({
    description: '카테고리 타입',
    enum: CATEGORY_TYPES,
    default: 'HTML',
  })
  @IsOptional()
  @IsIn(CATEGORY_TYPES)
  categoryType?: CategoryType;

  @ApiPropertyOptional({
    description: '생산폼 옵션',
    enum: PRODUCTION_FORM_OPTIONS,
  })
  @IsOptional()
  @IsIn(PRODUCTION_FORM_OPTIONS)
  productionForm?: ProductionFormType;

  @ApiPropertyOptional({ description: '외주생산 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isOutsourced?: boolean;

  @ApiPropertyOptional({
    description: '가격단위',
    enum: PRICING_UNIT_OPTIONS,
  })
  @IsOptional()
  @IsIn(PRICING_UNIT_OPTIONS)
  pricingUnit?: PricingUnit;

  @ApiPropertyOptional({ description: '카테고리 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '이동경로 (링크 URL)' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ description: 'HTML 콘텐츠' })
  @IsOptional()
  @IsString()
  htmlContent?: string;

  @ApiPropertyOptional({ description: '매출품목분류 ID' })
  @IsOptional()
  @IsString()
  salesCategoryId?: string;

  @ApiPropertyOptional({ description: '카테고리 아이콘 URL' })
  @IsOptional()
  @IsString()
  iconUrl?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) { }

export class MoveCategoryDto {
  @ApiPropertyOptional({ description: '새 부모 카테고리 ID (null이면 최상위로 이동)' })
  @IsOptional()
  @IsString()
  newParentId?: string | null;

  @ApiPropertyOptional({ description: '새 정렬 순서' })
  @IsOptional()
  @IsInt()
  @Min(0)
  newSortOrder?: number;
}

export class CategoryQueryDto {
  @ApiPropertyOptional({ description: '분류 레벨 필터', enum: ['large', 'medium', 'small'] })
  @IsOptional()
  @IsIn(['large', 'medium', 'small'])
  level?: string;

  @ApiPropertyOptional({ description: '상위 카테고리 ID 필터' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: '활성화 여부 필터' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '노출 여부 필터' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: '상단메뉴 여부 필터' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isTopMenu?: boolean;

  @ApiPropertyOptional({ description: '카테고리 타입 필터', enum: CATEGORY_TYPES })
  @IsOptional()
  @IsIn(CATEGORY_TYPES)
  categoryType?: CategoryType;

  @ApiPropertyOptional({ description: '검색어 (카테고리명)' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class VisibilityDto {
  @ApiPropertyOptional({ description: '노출 여부' })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: '상단메뉴 노출 여부' })
  @IsOptional()
  @IsBoolean()
  isTopMenu?: boolean;

  @ApiPropertyOptional({
    description: '로그인 메뉴 노출 설정',
    enum: LOGIN_VISIBILITY_OPTIONS,
  })
  @IsOptional()
  @IsIn(LOGIN_VISIBILITY_OPTIONS)
  loginVisibility?: LoginVisibility;
}

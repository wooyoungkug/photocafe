import { IsString, IsNumber, IsOptional, IsArray, IsIn, ValidateNested, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ==================== 앨범 페이지 단가 조회 DTO ====================
export class GetAlbumPagePriceDto {
  @ApiProperty({ description: '출력 생산설정 ID' })
  @IsString()
  productionSettingId: string;

  @ApiPropertyOptional({ description: '제본 생산설정 ID (없으면 productionSettingId 사용)' })
  @IsOptional()
  @IsString()
  bindingProductionSettingId?: string;

  @ApiProperty({ description: '규격 ID' })
  @IsString()
  specificationId: string;

  @ApiProperty({ description: '색상 모드', enum: ['4c', '6c'] })
  @IsString()
  @IsIn(['4c', '6c'])
  colorMode: '4c' | '6c';

  @ApiProperty({ description: '페이지 레이아웃', enum: ['single', 'spread'] })
  @IsString()
  @IsIn(['single', 'spread'])
  pageLayout: 'single' | 'spread';

  @ApiPropertyOptional({ description: '용지 ID (용지그룹별 단가 조회용)' })
  @IsOptional()
  @IsString()
  paperId?: string;
}

// ==================== 그룹 가격 설정 DTO ====================
export class SetGroupProductPriceDto {
  @ApiProperty({ description: '그룹 ID' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: '상품 ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: '그룹 특별 가격' })
  @IsNumber()
  @Min(0)
  price: number;
}

export class SetGroupHalfProductPriceDto {
  @ApiProperty({ description: '그룹 ID' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: '반제품 ID' })
  @IsString()
  halfProductId: string;

  @ApiProperty({ description: '그룹 특별 가격' })
  @IsNumber()
  @Min(0)
  price: number;
}

// ==================== 그룹 생산설정 단가 DTO ====================
export class GroupProductionSettingPriceDto {
  @ApiPropertyOptional({ description: '규격 ID (규격별 가격인 경우)' })
  @IsOptional()
  @IsString()
  specificationId?: string;

  @ApiPropertyOptional({ description: '단가 그룹 ID (인디고 priceGroups용)' })
  @IsOptional()
  @IsString()
  priceGroupId?: string;

  @ApiPropertyOptional({ description: '최소 수량 / Up값' })
  @IsOptional()
  @IsNumber()
  minQuantity?: number;

  @ApiPropertyOptional({ description: '최대 수량' })
  @IsOptional()
  @IsNumber()
  maxQuantity?: number;

  @ApiPropertyOptional({ description: '가중치' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: '기본 가격' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '단면 단가' })
  @IsOptional()
  @IsNumber()
  singleSidedPrice?: number;

  @ApiPropertyOptional({ description: '양면 단가' })
  @IsOptional()
  @IsNumber()
  doubleSidedPrice?: number;

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

  @ApiPropertyOptional({ description: '기본 페이지 수' })
  @IsOptional()
  @IsNumber()
  basePages?: number;

  @ApiPropertyOptional({ description: '기본 가격 (구간별)' })
  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @ApiPropertyOptional({ description: '페이지당 가격' })
  @IsOptional()
  @IsNumber()
  pricePerPage?: number;

  @ApiPropertyOptional({ description: '표지가격' })
  @IsOptional()
  @IsNumber()
  coverPrice?: number;

  @ApiPropertyOptional({ description: '구간별 가격 (JSON)' })
  @IsOptional()
  rangePrices?: Record<string, number>;
}

export class SetGroupProductionSettingPricesDto {
  @ApiProperty({ description: '거래처 그룹 ID' })
  @IsString()
  clientGroupId: string;

  @ApiProperty({ description: '생산설정 ID' })
  @IsString()
  productionSettingId: string;

  @ApiProperty({ description: '가격 목록', type: [GroupProductionSettingPriceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupProductionSettingPriceDto)
  prices: GroupProductionSettingPriceDto[];
}

// ==================== 거래처 개별 생산설정 단가 DTO ====================
export class ClientProductionSettingPriceDto {
  @ApiPropertyOptional({ description: '규격 ID (규격별 가격인 경우)' })
  @IsOptional()
  @IsString()
  specificationId?: string;

  @ApiPropertyOptional({ description: '단가 그룹 ID (인디고 priceGroups용)' })
  @IsOptional()
  @IsString()
  priceGroupId?: string;

  @ApiPropertyOptional({ description: '최소 수량 / Up값' })
  @IsOptional()
  @IsNumber()
  minQuantity?: number;

  @ApiPropertyOptional({ description: '최대 수량' })
  @IsOptional()
  @IsNumber()
  maxQuantity?: number;

  @ApiPropertyOptional({ description: '가중치' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: '기본 가격' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '단면 단가' })
  @IsOptional()
  @IsNumber()
  singleSidedPrice?: number;

  @ApiPropertyOptional({ description: '양면 단가' })
  @IsOptional()
  @IsNumber()
  doubleSidedPrice?: number;

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

  @ApiPropertyOptional({ description: '기본 페이지 수' })
  @IsOptional()
  @IsNumber()
  basePages?: number;

  @ApiPropertyOptional({ description: '기본 가격 (구간별)' })
  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @ApiPropertyOptional({ description: '페이지당 가격' })
  @IsOptional()
  @IsNumber()
  pricePerPage?: number;

  @ApiPropertyOptional({ description: '표지가격' })
  @IsOptional()
  @IsNumber()
  coverPrice?: number;

  @ApiPropertyOptional({ description: '구간별 가격 (JSON)' })
  @IsOptional()
  rangePrices?: Record<string, number>;
}

export class SetClientProductionSettingPricesDto {
  @ApiProperty({ description: '거래처 ID' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: '생산설정 ID' })
  @IsString()
  productionSettingId: string;

  @ApiProperty({ description: '가격 목록', type: [ClientProductionSettingPriceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientProductionSettingPriceDto)
  prices: ClientProductionSettingPriceDto[];
}

// ==================== 앨범 주문 가격 계산 DTO ====================

export class CalculateAlbumOrderPriceDto {
  @ApiProperty({ description: '상품 ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: '앨범 가로(inch)', example: 12 })
  @IsNumber()
  @Min(0)
  widthInch: number;

  @ApiProperty({ description: '앨범 세로(inch)', example: 15 })
  @IsNumber()
  @Min(0)
  heightInch: number;

  @ApiProperty({ description: '페이지 수', example: 30 })
  @IsNumber()
  @Min(1)
  pageCount: number;

  @ApiProperty({ description: '색상 모드 (4도/6도)', enum: ['4c', '6c'] })
  @IsString()
  @IsIn(['4c', '6c'])
  colorMode: '4c' | '6c';

  @ApiProperty({ description: '페이지 레이아웃 (단면/양면)', enum: ['single', 'spread'] })
  @IsString()
  @IsIn(['single', 'spread'])
  pageLayout: 'single' | 'spread';

  @ApiPropertyOptional({ description: '용지 규격 ID (용지 추가금)' })
  @IsOptional()
  @IsString()
  paperId?: string;

  @ApiPropertyOptional({ description: '거래처 ID (그룹/개별 단가 적용)' })
  @IsOptional()
  @IsString()
  clientId?: string;
}

export class AlbumOrderPriceResultDto {
  @ApiProperty({ description: '제본비 (순수 제본 + 표지비 포함)' })
  bindingPrice: number;

  @ApiProperty({ description: '1p당 출력단가' })
  pricePerPage: number;

  @ApiProperty({ description: '출력비 (pricePerPage * pageCount)' })
  printPrice: number;

  @ApiProperty({ description: '용지 추가금 (0 if 없음)' })
  paperPrice: number;

  @ApiProperty({ description: '후가공비 (코팅, 라미네이션 등)' })
  postProcessingPrice: number;

  @ApiProperty({ description: '총 단가 (출력비 + 제본비 + 후가공비, VAT 포함)' })
  unitPrice: number;

  @ApiProperty({ description: '매칭된 규격 ID' })
  specificationId: string;

  @ApiProperty({ description: 'nup 값 (예: 1+up)' })
  nup: string;

  @ApiPropertyOptional({ description: '적용된 가격 정책' })
  appliedPolicy?: string;

  @ApiPropertyOptional({ description: '단가 출처 (client/group/standard)' })
  priceSource?: string;

  @ApiPropertyOptional({ description: '그룹 단가인 경우 그룹명' })
  groupName?: string | null;

  @ApiPropertyOptional({ description: '표지비 (제본비에서 분리)' })
  coverPrice?: number;

  @ApiPropertyOptional({ description: '순수 제본비 (표지비 제외)' })
  bindingOnlyPrice?: number;

  @ApiPropertyOptional({ description: '제본 구간단가 맵' })
  bindingRangePrices?: Record<string, number> | null;

  @ApiPropertyOptional({ description: '제본 기본가 (보간 계산용)' })
  bindingBasePrice?: number;

  @ApiPropertyOptional({ description: '제본 페이지당 단가 (보간 계산용)' })
  bindingPricePerPage?: number;

  @ApiPropertyOptional({ description: '추가 청구 페이지 수' })
  billingExtraPages?: number;
}

// ==================== 가격 계산 요청 DTO ====================
export class OptionSelectionDto {
  @ApiProperty({ description: '옵션 타입 (specification, binding, paper, cover, foil, finishing)' })
  @IsString()
  type: string;

  @ApiProperty({ description: '옵션 ID' })
  @IsString()
  optionId: string;
}

export class CalculateProductPriceDto {
  @ApiProperty({ description: '상품 ID' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: '거래처 ID (가격 정책 적용용)' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({ description: '수량' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: '선택된 옵션들' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionSelectionDto)
  options?: OptionSelectionDto[];
}

export class CalculateHalfProductPriceDto {
  @ApiProperty({ description: '반제품 ID' })
  @IsString()
  halfProductId: string;

  @ApiPropertyOptional({ description: '거래처 ID (가격 정책 적용용)' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({ description: '수량' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: '규격 ID' })
  @IsOptional()
  @IsString()
  specificationId?: string;

  @ApiPropertyOptional({ description: '옵션 선택' })
  @IsOptional()
  @IsArray()
  optionSelections?: { optionId: string; value: string }[];
}

// ==================== 가격 계산 결과 DTO ====================
export class PriceCalculationResultDto {
  @ApiProperty({ description: '기본 가격' })
  basePrice: number;

  @ApiProperty({ description: '옵션 추가 가격' })
  optionPrice: number;

  @ApiProperty({ description: '단가' })
  unitPrice: number;

  @ApiProperty({ description: '수량' })
  quantity: number;

  @ApiProperty({ description: '할인율 (1.0 = 정가)' })
  discountRate: number;

  @ApiProperty({ description: '할인 금액' })
  discountAmount: number;

  @ApiProperty({ description: '최종 단가 (할인 적용)' })
  finalUnitPrice: number;

  @ApiProperty({ description: '총 가격' })
  totalPrice: number;

  @ApiPropertyOptional({ description: '적용된 가격 정책' })
  appliedPolicy?: string;
}

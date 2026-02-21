import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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

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

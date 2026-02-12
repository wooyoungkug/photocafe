import { IsString, IsOptional, IsNumber, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface MyProductOptions {
  specificationId?: string;
  specificationName?: string;
  bindingId?: string;
  bindingName?: string;
  paperId?: string;
  paperName?: string;
  coverId?: string;
  coverName?: string;
  printSide?: 'single' | 'double';
  copperPlateType?: 'none' | 'public' | 'owned';
  copperPlateId?: string;
  copperPlateName?: string;
  foilColor?: string;
  foilColorName?: string;
  foilPosition?: string;
  foilPositionName?: string;
  finishingIds?: string[];
  finishingNames?: string[];
  // 원단 (앨범 표지)
  coverSourceType?: 'fabric' | 'design';
  fabricId?: string;
  fabricName?: string;
  fabricThumbnail?: string;
}

export class CreateMyProductDto {
  @ApiProperty({ description: '고객 ID' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: '상품 ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: '마이상품 이름' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '썸네일 URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({ description: '저장된 옵션' })
  @IsObject()
  options: MyProductOptions;

  @ApiPropertyOptional({ description: '기본 수량' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  defaultQuantity?: number;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  memo?: string;
}

export class UpdateMyProductDto {
  @ApiPropertyOptional({ description: '마이상품 이름' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '썸네일 URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: '저장된 옵션' })
  @IsOptional()
  @IsObject()
  options?: MyProductOptions;

  @ApiPropertyOptional({ description: '기본 수량' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  defaultQuantity?: number;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class MyProductResponseDto {
  id: string;
  clientId: string;
  productId: string;
  name: string;
  thumbnailUrl?: string;
  options: MyProductOptions;
  defaultQuantity: number;
  memo?: string;
  sortOrder: number;
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  product?: {
    id: string;
    productCode: string;
    productName: string;
    thumbnailUrl?: string;
    basePrice: number;
  };
}

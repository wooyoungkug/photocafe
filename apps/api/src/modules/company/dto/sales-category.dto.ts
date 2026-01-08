import { IsString, IsOptional, IsInt, Min, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateSalesCategoryDto {
  @ApiProperty({ description: '분류 코드', example: 'album' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: '분류명', example: '앨범' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: '상위 분류 ID (대분류일 경우 null)' })
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

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSalesCategoryDto extends PartialType(CreateSalesCategoryDto) {}

export class SalesCategoryQueryDto {
  @ApiPropertyOptional({ description: '상위 분류 ID 필터' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: '활성화 여부 필터' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '검색어 (분류명)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '계층 깊이 필터 (1: 대분류, 2: 소분류)' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  depth?: number;
}

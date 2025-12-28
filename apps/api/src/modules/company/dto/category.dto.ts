import { IsString, IsOptional, IsInt, Min, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateCategoryDto {
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
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

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
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '검색어 (카테고리명)' })
  @IsOptional()
  @IsString()
  search?: string;
}

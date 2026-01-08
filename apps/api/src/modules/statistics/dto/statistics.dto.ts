import { IsOptional, IsDate, IsString, IsIn, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class StatisticsQueryDto {
  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ description: '그룹화 기준', enum: ['day', 'week', 'month', 'year'] })
  @IsOptional()
  @IsIn(['day', 'week', 'month', 'year'])
  groupBy?: 'day' | 'week' | 'month' | 'year';
}

export class ClientStatisticsQueryDto extends StatisticsQueryDto {
  @ApiPropertyOptional({ description: '거래처 ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: '그룹 ID' })
  @IsOptional()
  @IsString()
  groupId?: string;
}

export class ProductStatisticsQueryDto extends StatisticsQueryDto {
  @ApiPropertyOptional({ description: '카테고리 ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class SalesCategoryStatisticsQueryDto {
  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ description: '매출품목분류 ID' })
  @IsOptional()
  @IsString()
  salesCategoryId?: string;

  @ApiPropertyOptional({ description: '계층 깊이 (1: 대분류, 2: 소분류)' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  depth?: number;
}

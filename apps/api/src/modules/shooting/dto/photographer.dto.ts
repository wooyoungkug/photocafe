import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPhotographerDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 항목 수', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: '등급 필터',
    enum: ['NEW', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'],
  })
  @IsOptional()
  @IsIn(['NEW', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'])
  grade?: string;

  @ApiPropertyOptional({ description: '검색어 (작가명)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '정렬 기준',
    enum: ['reliabilityIndex', 'totalShootings', 'avgOverallScore', 'grade'],
  })
  @IsOptional()
  @IsIn(['reliabilityIndex', 'totalShootings', 'avgOverallScore', 'grade'])
  sortBy?: string;

  @ApiPropertyOptional({ description: '정렬 방향', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class UpdatePhotographerDto {
  @ApiPropertyOptional({
    description: '등급 수동 설정',
    enum: ['NEW', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'],
  })
  @IsOptional()
  @IsIn(['NEW', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'])
  grade?: string;
}

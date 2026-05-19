import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class StatsQueryDto {
  @ApiPropertyOptional({
    description: '시작일 (YYYY-MM-DD). 기본: 최근 7일',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ description: '종료일 (YYYY-MM-DD). 기본: 오늘' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

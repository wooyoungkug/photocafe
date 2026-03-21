import { IsString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryLeaveBalanceDto {
  @ApiPropertyOptional({ description: '직원 ID' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional({ description: '연도', example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
}

export class GenerateLeaveBalanceDto {
  @ApiProperty({ description: '대상 연도', example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year: number;
}

export class AdjustLeaveBalanceDto {
  @ApiProperty({ description: '조정일수 (양수: 추가, 음수: 차감)', example: 2 })
  @Type(() => Number)
  @IsNumber()
  adjustedDays: number;

  @ApiPropertyOptional({ description: '조정 사유' })
  @IsOptional()
  @IsString()
  memo?: string;
}

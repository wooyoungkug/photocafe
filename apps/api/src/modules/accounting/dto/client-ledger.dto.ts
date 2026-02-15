import { IsString, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ClientLedgerType {
  SALES = 'SALES',       // 매출거래처
  PURCHASE = 'PURCHASE', // 매입거래처
  ALL = 'ALL',           // 전체
}

export enum PeriodUnit {
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

// ===== 거래처원장 목록 조회 DTO =====

export class ClientLedgerQueryDto {
  @ApiPropertyOptional({ description: '거래처 유형 (SALES/PURCHASE/ALL)', enum: ClientLedgerType })
  @IsOptional()
  @IsEnum(ClientLedgerType)
  clientType?: ClientLedgerType;

  @ApiPropertyOptional({ description: '검색어 (거래처명, 거래처코드)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '페이지', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

// ===== 거래처별 상세 원장 조회 DTO =====

export class ClientLedgerDetailQueryDto {
  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '기간 단위 (DAILY/MONTHLY/QUARTERLY/YEARLY)', enum: PeriodUnit })
  @IsOptional()
  @IsEnum(PeriodUnit)
  periodUnit?: PeriodUnit;

  @ApiPropertyOptional({ description: '페이지', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

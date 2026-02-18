import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsEnum,
  IsEmail,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ClientTypeEnum {
  SALES = 'sales',
  PURCHASE = 'purchase',
  ALL = 'all',
}

export enum PeriodTypeEnum {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

// ===== 거래처원장 목록 조회 DTO =====
export class ClientLedgerListQueryDto {
  @ApiPropertyOptional({ description: '거래처 유형 (sales/purchase/all)', enum: ClientTypeEnum })
  @IsOptional()
  @IsEnum(ClientTypeEnum)
  clientType?: ClientTypeEnum;

  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '검색어 (거래처명, 거래처코드)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '페이지' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

// ===== 거래처원장 상세 조회 DTO =====
export class ClientLedgerDetailQueryDto {
  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '조회 기간 유형', enum: PeriodTypeEnum })
  @IsOptional()
  @IsEnum(PeriodTypeEnum)
  periodType?: PeriodTypeEnum;
}

// ===== 거래내역서 이메일 발송 DTO =====
export class SendStatementEmailDto {
  @ApiProperty({ description: '수신 이메일 주소' })
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @ApiPropertyOptional({ description: '이메일 제목 (미입력 시 자동 생성)' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: '추가 메시지' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ description: '거래내역서 유형 (detail/daily/monthly/period)' })
  @IsString()
  @IsNotEmpty()
  statementType: string;

  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

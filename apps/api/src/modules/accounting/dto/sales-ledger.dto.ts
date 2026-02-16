import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 매출유형
export enum SalesTypeEnum {
  ALBUM = 'ALBUM',
  PRINT = 'PRINT',
  FRAME = 'FRAME',
  GOODS = 'GOODS',
  BINDING = 'BINDING',
  DESIGN = 'DESIGN',
  SHIPPING = 'SHIPPING',
  OTHER = 'OTHER',
}

// 과세유형
export enum TaxTypeEnum {
  TAXABLE = 'TAXABLE',
  ZERO_RATED = 'ZERO_RATED',
  EXEMPT = 'EXEMPT',
}

// 매출 인식 상태
export enum SalesStatusEnum {
  REGISTERED = 'REGISTERED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

// ===== 매출원장 조회 DTO =====

export class SalesLedgerQueryDto {
  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '거래처 ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: '매출유형', enum: SalesTypeEnum })
  @IsOptional()
  @IsEnum(SalesTypeEnum)
  salesType?: SalesTypeEnum;

  @ApiPropertyOptional({ description: '결제상태 (unpaid/partial/paid/overdue)' })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({ description: '매출상태', enum: SalesStatusEnum })
  @IsOptional()
  @IsEnum(SalesStatusEnum)
  salesStatus?: SalesStatusEnum;

  @ApiPropertyOptional({ description: '검색어 (주문번호, 거래처명)' })
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

// ===== 입금 등록 DTO =====

export class CreateSalesReceiptDto {
  @ApiProperty({ description: '입금일자' })
  @IsDateString()
  receiptDate: string;

  @ApiProperty({ description: '입금금액' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: '결제수단 (cash/card/bank_transfer/check)' })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ description: '입금은행' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: '입금자명' })
  @IsOptional()
  @IsString()
  depositorName?: string;

  @ApiPropertyOptional({ description: '비고' })
  @IsOptional()
  @IsString()
  note?: string;
}

// ===== 매출원장 요약 응답 =====

export class SalesLedgerSummaryDto {
  totalSales: number;         // 당월 총 매출
  totalReceived: number;      // 당월 총 입금
  totalOutstanding: number;   // 총 미수금 잔액
  totalOverdue: number;       // 연체 미수금
  ledgerCount: number;        // 전표 건수
  clientCount: number;        // 거래처 수
}

// ===== 거래처별 매출 집계 =====

export class ClientSalesSummaryDto {
  clientId: string;
  clientName: string;
  clientCode: string;
  totalSales: number;
  totalReceived: number;
  outstanding: number;
  orderCount: number;
  lastOrderDate: string;
}

// ===== 입금내역 조회 DTO =====

export class GetReceiptsQueryDto {
  @ApiPropertyOptional({ description: '시작일 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '거래처 ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: '결제방법 (cash/bank_transfer/card/check)' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
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

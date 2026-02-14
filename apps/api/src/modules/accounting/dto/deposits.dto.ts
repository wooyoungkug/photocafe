import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethodEnum {
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card',
  CASH = 'cash',
  OTHER = 'other',
}

export class DepositQueryDto {
  @ApiPropertyOptional({
    description: '고객 ID (특정 거래처만 조회, 미입력 시 전체 조회)',
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({
    description: '시작일 (YYYY-MM-DD)',
    required: true,
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: '종료일 (YYYY-MM-DD)',
    required: true,
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: '결제방법 필터',
    required: false,
    enum: PaymentMethodEnum,
  })
  @IsOptional()
  @IsEnum(PaymentMethodEnum)
  paymentMethod?: PaymentMethodEnum;
}

export class DepositResponseDto {
  @ApiProperty({ description: '입금 ID' })
  id: string;

  @ApiProperty({ description: '수금번호' })
  receiptNumber: string;

  @ApiProperty({ description: '입금일자' })
  receiptDate: string;

  @ApiProperty({ description: '주문번호' })
  orderNumber: string;

  @ApiProperty({ description: '주문 ID' })
  orderId: string;

  @ApiProperty({ description: '거래처 ID' })
  clientId: string;

  @ApiProperty({ description: '거래처명' })
  clientName: string;

  @ApiProperty({ description: '주문금액' })
  orderAmount: number;

  @ApiProperty({ description: '입금금액' })
  depositAmount: number;

  @ApiProperty({ description: '결제방법', enum: PaymentMethodEnum })
  paymentMethod: string;

  @ApiPropertyOptional({ description: '입금은행' })
  bankName?: string;

  @ApiPropertyOptional({ description: '입금자명' })
  depositorName?: string;

  @ApiPropertyOptional({ description: '메모' })
  note?: string;

  @ApiPropertyOptional({ description: '생성일시' })
  createdAt?: string;

  @ApiPropertyOptional({ description: '생성자' })
  createdBy?: string;
}

export class DepositSummaryDto {
  @ApiProperty({ description: '총 입금 건수' })
  totalCount: number;

  @ApiProperty({ description: '총 입금액' })
  totalAmount: number;

  @ApiProperty({ description: '총 주문액' })
  totalOrderAmount: number;
}

export class DepositsListResponseDto {
  @ApiProperty({ description: '입금내역 목록', type: [DepositResponseDto] })
  data: DepositResponseDto[];

  @ApiProperty({ description: '요약 정보', type: DepositSummaryDto })
  summary: DepositSummaryDto;
}

export class CreateDepositDto {
  @ApiProperty({ description: '매출원장 ID' })
  @IsString()
  salesLedgerId: string;

  @ApiProperty({ description: '입금일자 (YYYY-MM-DD)' })
  @IsDateString()
  receiptDate: string;

  @ApiProperty({ description: '입금액', minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: '입금방법', enum: PaymentMethodEnum })
  @IsEnum(PaymentMethodEnum)
  paymentMethod: PaymentMethodEnum;

  @ApiPropertyOptional({ description: '입금은행' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: '입금자명' })
  @IsOptional()
  @IsString()
  depositorName?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateDepositDto {
  @ApiPropertyOptional({ description: '입금일자 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  receiptDate?: string;

  @ApiPropertyOptional({ description: '입금액', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({ description: '입금방법', enum: PaymentMethodEnum })
  @IsOptional()
  @IsEnum(PaymentMethodEnum)
  paymentMethod?: PaymentMethodEnum;

  @ApiPropertyOptional({ description: '입금은행' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: '입금자명' })
  @IsOptional()
  @IsString()
  depositorName?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  note?: string;
}

// ===== 일자별 합계 조회 DTO =====

export class DailySummaryQueryDto {
  @ApiProperty({ description: '시작일 (YYYY-MM-DD)', required: true })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: '종료일 (YYYY-MM-DD)', required: true })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: '거래처 ID (특정 거래처만 조회)' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: '결제방법 필터',
    enum: PaymentMethodEnum,
  })
  @IsOptional()
  @IsEnum(PaymentMethodEnum)
  paymentMethod?: PaymentMethodEnum;
}

export class DailyDepositSummaryDto {
  @ApiProperty({ description: '입금일자 (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ description: '거래처 ID' })
  clientId: string;

  @ApiProperty({ description: '거래처명' })
  clientName: string;

  @ApiProperty({ description: '입금 건수' })
  count: number;

  @ApiProperty({ description: '입금액 합계' })
  totalDepositAmount: number;

  @ApiProperty({ description: '주문액 합계' })
  totalOrderAmount: number;
}

export class DailySummaryResponseDto {
  @ApiProperty({ description: '일자별 합계 데이터', type: [DailyDepositSummaryDto] })
  data: DailyDepositSummaryDto[];

  @ApiProperty({
    description: '전체 요약',
    type: 'object',
    properties: {
      totalClients: { type: 'number', description: '거래처 수' },
      totalDays: { type: 'number', description: '입금 일수' },
      totalCount: { type: 'number', description: '총 건수' },
      totalDepositAmount: { type: 'number', description: '총 입금액' },
      totalOrderAmount: { type: 'number', description: '총 주문액' },
      averagePerDay: { type: 'number', description: '일평균 입금액' },
    },
  })
  summary: {
    totalClients: number;
    totalDays: number;
    totalCount: number;
    totalDepositAmount: number;
    totalOrderAmount: number;
    averagePerDay: number;
  };
}

// ===== 월별 합계 조회 DTO =====

export class MonthlySummaryQueryDto {
  @ApiProperty({ description: '년도 (YYYY)', required: true })
  @IsString()
  year: string;

  @ApiPropertyOptional({ description: '거래처 ID (특정 거래처만 조회)' })
  @IsOptional()
  @IsString()
  clientId?: string;
}

export class MonthlyDepositSummaryDto {
  @ApiProperty({ description: '년월 (YYYY-MM)' })
  month: string;

  @ApiProperty({ description: '거래처 ID' })
  clientId: string;

  @ApiProperty({ description: '거래처명' })
  clientName: string;

  @ApiProperty({ description: '입금 건수' })
  count: number;

  @ApiProperty({ description: '입금액 합계' })
  totalDepositAmount: number;

  @ApiProperty({ description: '주문액 합계' })
  totalOrderAmount: number;
}

export class MonthlySummaryResponseDto {
  @ApiProperty({ description: '월별 합계 데이터', type: [MonthlyDepositSummaryDto] })
  data: MonthlyDepositSummaryDto[];

  @ApiProperty({
    description: '전체 요약',
    type: 'object',
    properties: {
      totalClients: { type: 'number', description: '거래처 수' },
      totalMonths: { type: 'number', description: '입금 월수' },
      totalCount: { type: 'number', description: '총 건수' },
      totalDepositAmount: { type: 'number', description: '총 입금액' },
      totalOrderAmount: { type: 'number', description: '총 주문액' },
    },
  })
  summary: {
    totalClients: number;
    totalMonths: number;
    totalCount: number;
    totalDepositAmount: number;
    totalOrderAmount: number;
  };
}

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
  @ApiProperty({
    description: '고객 ID',
    required: true,
  })
  @IsString()
  clientId: string;

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

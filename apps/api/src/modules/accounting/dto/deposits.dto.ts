import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

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

  @ApiProperty({ description: '입금일자' })
  depositDate: string;

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

  @ApiProperty({ description: '메모', required: false })
  memo?: string;

  @ApiProperty({ description: '확인일시', required: false })
  confirmedAt?: string;

  @ApiProperty({ description: '확인자', required: false })
  confirmedBy?: string;
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

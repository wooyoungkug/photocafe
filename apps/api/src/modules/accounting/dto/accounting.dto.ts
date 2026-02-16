import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 계정과목 유형
export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

// 전표 유형
export enum VoucherType {
  RECEIPT = 'RECEIPT',
  PAYMENT = 'PAYMENT',
  TRANSFER = 'TRANSFER',
}

// 거래 유형
export enum TransactionType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

// ===== 계정과목 DTO =====

export class CreateAccountDto {
  @ApiProperty({ description: '계정코드' })
  @IsString()
  code: string;

  @ApiProperty({ description: '계정명' })
  @IsString()
  name: string;

  @ApiProperty({ enum: AccountType, description: '계정 유형' })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiPropertyOptional({ description: '상위 계정 ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateAccountDto {
  @ApiPropertyOptional({ description: '계정명' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '활성 상태' })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

// ===== 전표 (Journal) DTO =====

export class JournalEntryDto {
  @ApiProperty({ description: '계정과목 ID' })
  @IsString()
  accountId: string;

  @ApiProperty({ enum: TransactionType, description: '차변/대변' })
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @ApiProperty({ description: '금액' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: '적요' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateJournalDto {
  @ApiProperty({ enum: VoucherType, description: '전표 유형' })
  @IsEnum(VoucherType)
  voucherType: VoucherType;

  @ApiProperty({ description: '전표 일자' })
  @IsDateString()
  journalDate: string;

  @ApiPropertyOptional({ description: '거래처 ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: '거래처명' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ description: '적요' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '총액' })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ description: '주문 ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: '주문번호' })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiProperty({ type: [JournalEntryDto], description: '분개 상세' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryDto)
  entries: JournalEntryDto[];
}

export class JournalQueryDto {
  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: VoucherType, description: '전표 유형' })
  @IsOptional()
  @IsEnum(VoucherType)
  voucherType?: VoucherType;

  @ApiPropertyOptional({ description: '거래처 ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: '검색어' })
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

// ===== 미수금 (Receivable) DTO =====

export class CreateReceivableDto {
  @ApiProperty({ description: '거래처 ID' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: '거래처명' })
  @IsString()
  clientName: string;

  @ApiPropertyOptional({ description: '거래처코드' })
  @IsOptional()
  @IsString()
  clientCode?: string;

  @ApiPropertyOptional({ description: '주문 ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: '주문번호' })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiProperty({ description: '원금' })
  @IsNumber()
  @Min(0)
  originalAmount: number;

  @ApiProperty({ description: '발생일' })
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional({ description: '입금예정일' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateReceivablePaymentDto {
  @ApiProperty({ description: '입금액' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: '입금일' })
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional({ description: '결제방법' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ReceivableQueryDto {
  @ApiPropertyOptional({ description: '상태 (outstanding, partial, paid, overdue)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '거래처 ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: '연체 여부' })
  @IsOptional()
  overdue?: boolean;

  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// ===== 미지급금 (Payable) DTO =====

export class CreatePayableDto {
  @ApiPropertyOptional({ description: '매입처 ID' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({ description: '매입처명' })
  @IsString()
  supplierName: string;

  @ApiPropertyOptional({ description: '매입처코드' })
  @IsOptional()
  @IsString()
  supplierCode?: string;

  @ApiProperty({ description: '원금' })
  @IsNumber()
  @Min(0)
  originalAmount: number;

  @ApiProperty({ description: '발생일' })
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional({ description: '지급예정일' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreatePayablePaymentDto {
  @ApiProperty({ description: '지급액' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: '지급일' })
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional({ description: '결제방법' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class PayableQueryDto {
  @ApiPropertyOptional({ description: '상태 (outstanding, partial, paid, overdue)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '매입처 ID' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: '연체 여부' })
  @IsOptional()
  overdue?: boolean;

  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// ===== 은행계좌 DTO =====

export class CreateBankAccountDto {
  @ApiProperty({ description: '계좌별칭' })
  @IsString()
  accountName: string;

  @ApiProperty({ description: '은행명' })
  @IsString()
  bankName: string;

  @ApiProperty({ description: '계좌번호' })
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({ description: '예금주' })
  @IsOptional()
  @IsString()
  accountHolder?: string;

  @ApiPropertyOptional({ description: '초기 잔액' })
  @IsOptional()
  @IsNumber()
  balance?: number;

  @ApiPropertyOptional({ description: '기본 계좌 여부' })
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateBankAccountDto {
  @ApiPropertyOptional({ description: '계좌별칭' })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiPropertyOptional({ description: '은행명' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: '예금주' })
  @IsOptional()
  @IsString()
  accountHolder?: string;

  @ApiPropertyOptional({ description: '기본 계좌 여부' })
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '활성 상태' })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;
}

// ===== 정산 DTO =====

export class CreateSettlementDto {
  @ApiProperty({ description: '정산 기간 타입 (daily, weekly, monthly)' })
  @IsString()
  periodType: string;

  @ApiProperty({ description: '정산 시작일' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: '정산 종료일' })
  @IsDateString()
  periodEnd: string;
}

export class SettlementQueryDto {
  @ApiPropertyOptional({ description: '정산 기간 타입' })
  @IsOptional()
  @IsString()
  periodType?: string;

  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '상태 (draft, confirmed, closed)' })
  @IsOptional()
  @IsString()
  status?: string;
}

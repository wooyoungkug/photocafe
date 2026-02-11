import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 매입유형
export enum PurchaseTypeEnum {
  RAW_MATERIAL = 'RAW_MATERIAL',
  MERCHANDISE = 'MERCHANDISE',
  SUPPLIES = 'SUPPLIES',
  OUTSOURCING = 'OUTSOURCING',
  EQUIPMENT = 'EQUIPMENT',
  SERVICE = 'SERVICE',
  OTHER = 'OTHER',
}

// 과세유형
export enum TaxTypeEnum {
  TAXABLE = 'TAXABLE',
  ZERO_RATED = 'ZERO_RATED',
  EXEMPT = 'EXEMPT',
}

// 매입 인식 상태
export enum PurchaseStatusEnum {
  REGISTERED = 'REGISTERED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

// ===== 매입원장 조회 DTO =====

export class PurchaseLedgerQueryDto {
  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '공급업체 ID' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: '매입유형', enum: PurchaseTypeEnum })
  @IsOptional()
  @IsEnum(PurchaseTypeEnum)
  purchaseType?: PurchaseTypeEnum;

  @ApiPropertyOptional({ description: '결제상태 (unpaid/partial/paid/overdue)' })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({ description: '매입상태', enum: PurchaseStatusEnum })
  @IsOptional()
  @IsEnum(PurchaseStatusEnum)
  purchaseStatus?: PurchaseStatusEnum;

  @ApiPropertyOptional({ description: '검색어 (전표번호, 공급업체명)' })
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

// ===== 매입원장 항목 DTO =====

export class CreatePurchaseLedgerItemDto {
  @ApiProperty({ description: '품목명' })
  @IsString()
  itemName: string;

  @ApiPropertyOptional({ description: '규격' })
  @IsOptional()
  @IsString()
  specification?: string;

  @ApiProperty({ description: '수량', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: '단위' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ description: '단가', minimum: 0 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: '공급가액' })
  @IsNumber()
  supplyAmount: number;

  @ApiProperty({ description: '부가세액' })
  @IsNumber()
  vatAmount: number;

  @ApiProperty({ description: '합계금액' })
  @IsNumber()
  totalAmount: number;

  @ApiPropertyOptional({ description: '매입유형', enum: PurchaseTypeEnum })
  @IsOptional()
  @IsEnum(PurchaseTypeEnum)
  purchaseType?: PurchaseTypeEnum;

  @ApiPropertyOptional({ description: '계정코드' })
  @IsOptional()
  @IsString()
  accountCode?: string;

  @ApiPropertyOptional({ description: '정렬순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '비고' })
  @IsOptional()
  @IsString()
  remark?: string;
}

// ===== 매입원장 생성 DTO =====

export class CreatePurchaseLedgerDto {
  @ApiProperty({ description: '공급업체 ID' })
  @IsString()
  supplierId: string;

  @ApiPropertyOptional({ description: '매입유형', enum: PurchaseTypeEnum, default: PurchaseTypeEnum.RAW_MATERIAL })
  @IsOptional()
  @IsEnum(PurchaseTypeEnum)
  purchaseType?: PurchaseTypeEnum = PurchaseTypeEnum.RAW_MATERIAL;

  @ApiPropertyOptional({ description: '과세유형', enum: TaxTypeEnum, default: TaxTypeEnum.TAXABLE })
  @IsOptional()
  @IsEnum(TaxTypeEnum)
  taxType?: TaxTypeEnum = TaxTypeEnum.TAXABLE;

  @ApiPropertyOptional({ description: '계정코드' })
  @IsOptional()
  @IsString()
  accountCode?: string;

  @ApiProperty({ description: '공급가액' })
  @IsNumber()
  supplyAmount: number;

  @ApiProperty({ description: '부가세액' })
  @IsNumber()
  vatAmount: number;

  @ApiProperty({ description: '합계금액' })
  @IsNumber()
  totalAmount: number;

  @ApiPropertyOptional({ description: '결제방법 (cash/card/bank_transfer/postpaid)', default: 'postpaid' })
  @IsOptional()
  @IsString()
  paymentMethod?: string = 'postpaid';

  @ApiPropertyOptional({ description: '결제예정일' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: '적요' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '매입 항목 목록', type: [CreatePurchaseLedgerItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseLedgerItemDto)
  items: CreatePurchaseLedgerItemDto[];
}

// ===== 매입 지급 등록 DTO =====

export class CreatePurchasePaymentDto {
  @ApiProperty({ description: '지급일자' })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({ description: '지급금액', minimum: 1 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: '결제수단 (cash/card/bank_transfer/check)' })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ description: '은행명' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: '계좌번호' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ description: '비고' })
  @IsOptional()
  @IsString()
  note?: string;
}

// ===== 매입원장 요약 응답 =====

export class PurchaseLedgerSummaryDto {
  totalPurchases: number;       // 당월 총 매입
  totalPaid: number;            // 당월 총 지급
  totalOutstanding: number;     // 총 미지급 잔액
  totalOverdue: number;         // 연체 미지급
  ledgerCount: number;          // 전표 건수
  supplierCount: number;        // 공급업체 수
}

// ===== 공급업체별 매입 집계 =====

export class SupplierPurchaseSummaryDto {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  totalPurchases: number;
  totalPaid: number;
  outstanding: number;
  purchaseCount: number;
  lastPurchaseDate: string;
}

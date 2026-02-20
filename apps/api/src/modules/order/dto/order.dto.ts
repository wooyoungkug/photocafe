import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsIn,
  IsDate,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ==================== 주문 상태 ====================
export const ORDER_STATUS = {
  PENDING_RECEIPT: 'pending_receipt',       // 접수대기
  RECEIPT_COMPLETED: 'receipt_completed',   // 접수완료
  IN_PRODUCTION: 'in_production',           // 생산진행
  READY_FOR_SHIPPING: 'ready_for_shipping', // 배송준비
  SHIPPED: 'shipped',                       // 배송완료
  CANCELLED: 'cancelled',                   // 취소
} as const;

export const PROCESS_STATUS = {
  RECEIPT_PENDING: 'receipt_pending',       // 접수대기
  POST_PROCESSING: 'post_processing',       // 후가공대기
  BINDING: 'binding',                       // 제본대기
  INSPECTION: 'inspection',                 // 검수대기
  COMPLETED: 'completed',                   // 완료
} as const;

export const INSPECTION_PROCESS_TYPES = {
  FILE_INSPECTION_STARTED: 'file_inspection_started',
  FILE_INSPECTION_COMPLETED: 'file_inspection_completed',
  FILE_APPROVED: 'file_approved',
  FILE_REJECTED: 'file_rejected',
  INSPECTION_HOLD: 'inspection_hold',
  INSPECTION_SMS_SENT: 'inspection_sms_sent',
} as const;

// ==================== 주문 파일 DTO ====================
export class OrderFileDto {
  @ApiProperty({ description: '파일명' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: '파일 URL' })
  @IsString()
  fileUrl: string;

  @ApiPropertyOptional({ description: '썸네일 URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({ description: '페이지 범위' })
  @IsString()
  pageRange: string;

  @ApiProperty({ description: '시작 페이지' })
  @IsNumber()
  pageStart: number;

  @ApiProperty({ description: '종료 페이지' })
  @IsNumber()
  pageEnd: number;

  @ApiProperty({ description: '너비 (px)' })
  @IsNumber()
  width: number;

  @ApiProperty({ description: '높이 (px)' })
  @IsNumber()
  height: number;

  @ApiProperty({ description: '너비 (inch)' })
  @IsNumber()
  widthInch: number;

  @ApiProperty({ description: '높이 (inch)' })
  @IsNumber()
  heightInch: number;

  @ApiProperty({ description: 'DPI' })
  @IsNumber()
  dpi: number;

  @ApiProperty({ description: '파일 크기 (bytes)' })
  @IsNumber()
  fileSize: number;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

// ==================== 주문 항목별 배송 정보 DTO ====================
export class OrderItemShippingDto {
  @ApiProperty({ description: '발송지 유형', enum: ['company', 'orderer'] })
  @IsString()
  senderType: string;

  @ApiProperty({ description: '발송인명' })
  @IsString()
  senderName: string;

  @ApiProperty({ description: '발송인 연락처' })
  @IsString()
  senderPhone: string;

  @ApiPropertyOptional({ description: '발송지 우편번호' })
  @IsOptional()
  @IsString()
  senderPostalCode?: string;

  @ApiPropertyOptional({ description: '발송지 주소' })
  @IsOptional()
  @IsString()
  senderAddress?: string;

  @ApiPropertyOptional({ description: '발송지 상세주소' })
  @IsOptional()
  @IsString()
  senderAddressDetail?: string;

  @ApiProperty({ description: '배송지 유형', enum: ['orderer', 'direct_customer'] })
  @IsString()
  receiverType: string;

  @ApiProperty({ description: '수령인명' })
  @IsString()
  recipientName: string;

  @ApiProperty({ description: '수령인 연락처' })
  @IsString()
  phone: string;

  @ApiProperty({ description: '배송지 우편번호' })
  @IsString()
  postalCode: string;

  @ApiProperty({ description: '배송지 주소' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: '배송지 상세주소' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiProperty({ description: '배송 방법', enum: ['parcel', 'motorcycle', 'freight', 'pickup'] })
  @IsString()
  deliveryMethod: string;

  @ApiProperty({ description: '배송비' })
  @IsNumber()
  deliveryFee: number;

  @ApiPropertyOptional({ description: '배송비 유형', enum: ['free', 'conditional', 'standard'] })
  @IsOptional()
  @IsString()
  deliveryFeeType?: string;
}

// ==================== 주문 항목 DTO ====================
export class CreateOrderItemDto {
  @ApiProperty({ description: '상품 ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: '상품명' })
  @IsString()
  productName: string;

  @ApiProperty({ description: '규격' })
  @IsString()
  size: string;

  @ApiProperty({ description: '페이지 수' })
  @IsNumber()
  @Min(1)
  pages: number;

  @ApiProperty({ description: '인쇄 방식' })
  @IsString()
  printMethod: string;

  @ApiProperty({ description: '용지' })
  @IsString()
  paper: string;

  @ApiProperty({ description: '제본 방식' })
  @IsString()
  bindingType: string;

  @ApiPropertyOptional({ description: '커버 재질' })
  @IsOptional()
  @IsString()
  coverMaterial?: string;

  @ApiPropertyOptional({ description: '박명' })
  @IsOptional()
  @IsString()
  foilName?: string;

  @ApiPropertyOptional({ description: '박색상' })
  @IsOptional()
  @IsString()
  foilColor?: string;

  @ApiPropertyOptional({ description: '박 위치' })
  @IsOptional()
  @IsString()
  foilPosition?: string;

  @ApiPropertyOptional({ description: '후가공 옵션' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  finishingOptions?: string[];

  @ApiPropertyOptional({ description: '대표 썸네일 URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: '총 파일 용량 (bytes)' })
  @IsOptional()
  @IsNumber()
  totalFileSize?: number;

  @ApiProperty({ description: '수량' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: '단가' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: '파일 목록' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderFileDto)
  files?: OrderFileDto[];

  @ApiPropertyOptional({ description: '원단명' })
  @IsOptional()
  @IsString()
  fabricName?: string;

  @ApiPropertyOptional({ description: '원단 스냅샷 (주문 시점 정보 보존)' })
  @IsOptional()
  fabricSnapshot?: {
    id: string;
    code?: string;
    name: string;
    category?: string;
    material?: string;
    colorCode?: string;
    colorName?: string;
    basePrice?: number;
    thumbnailUrl?: string;
  };

  @ApiPropertyOptional({ description: '앨범 주문 폴더명' })
  @IsOptional()
  @IsString()
  folderName?: string;

  @ApiPropertyOptional({ description: '편집스타일 (single/spread)' })
  @IsOptional()
  @IsString()
  pageLayout?: string;

  @ApiPropertyOptional({ description: '제본순서' })
  @IsOptional()
  @IsString()
  bindingDirection?: string;

  @ApiPropertyOptional({ description: '항목별 배송 정보' })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderItemShippingDto)
  shipping?: OrderItemShippingDto;
}

// ==================== 중복 주문 체크 DTO ====================
export class CheckDuplicateOrderDto {
  @ApiProperty({ description: '거래처 ID' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: '폴더명 목록' })
  @IsArray()
  @IsString({ each: true })
  folderNames: string[];
}

// ==================== 배송 정보 DTO ====================
export class OrderShippingDto {
  @ApiProperty({ description: '수령인명' })
  @IsString()
  recipientName: string;

  @ApiProperty({ description: '연락처' })
  @IsString()
  phone: string;

  @ApiProperty({ description: '우편번호' })
  @IsString()
  postalCode: string;

  @ApiProperty({ description: '주소' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: '상세 주소' })
  @IsOptional()
  @IsString()
  addressDetail?: string;
}

// ==================== 주문 생성 DTO ====================
export class CreateOrderDto {
  @ApiProperty({ description: '거래처 ID' })
  @IsString()
  clientId: string;

  @ApiPropertyOptional({ description: '결제 방식', enum: ['prepaid', 'postpaid', 'card', 'transfer'] })
  @IsOptional()
  @IsIn(['prepaid', 'postpaid', 'card', 'transfer', 'mobile'])
  paymentMethod?: string;

  @ApiPropertyOptional({ description: '긴급 여부' })
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @ApiPropertyOptional({ description: '요청 배송일' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  requestedDeliveryDate?: Date;

  @ApiPropertyOptional({ description: '고객 메모' })
  @IsOptional()
  @IsString()
  customerMemo?: string;

  @ApiPropertyOptional({ description: '상품 메모' })
  @IsOptional()
  @IsString()
  productMemo?: string;

  @ApiPropertyOptional({ description: '배송비 (항목별 배송비가 없는 경우)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFee?: number;

  @ApiPropertyOptional({ description: '조정금액 (합배송 배송비 환급 등, 음수=차감)' })
  @IsOptional()
  @IsNumber()
  adjustmentAmount?: number;

  @ApiProperty({ description: '주문 항목' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ description: '중복 경고 무시 여부' })
  @IsOptional()
  @IsBoolean()
  isDuplicateOverride?: boolean;

  @ApiProperty({ description: '배송 정보' })
  @ValidateNested()
  @Type(() => OrderShippingDto)
  shipping: OrderShippingDto;
}

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @ApiPropertyOptional({ description: '관리자 메모' })
  @IsOptional()
  @IsString()
  adminMemo?: string;
}

// ==================== 주문 상태 변경 DTO ====================
export class UpdateOrderStatusDto {
  @ApiProperty({ description: '새 상태' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ description: '현재 공정' })
  @IsOptional()
  @IsString()
  currentProcess?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  note?: string;
}

// ==================== 배송 정보 업데이트 DTO ====================
export class UpdateShippingDto {
  @ApiPropertyOptional({ description: '택배사 코드' })
  @IsOptional()
  @IsString()
  courierCode?: string;

  @ApiPropertyOptional({ description: '송장 번호' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

// ==================== 주문 조회 DTO ====================
export class OrderQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 항목 수', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: '검색어 (주문번호, 거래처명)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '거래처 ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: '주문 상태' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ description: '긴급 여부' })
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;
}

// ==================== 벌크 작업 DTO ====================
export class BulkOrderIdsDto {
  @ApiProperty({ description: '주문 ID 배열' })
  @IsArray()
  @IsString({ each: true })
  orderIds: string[];
}

export class BulkUpdateStatusDto extends BulkOrderIdsDto {
  @ApiProperty({ description: '변경할 상태' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkUpdateReceiptDateDto extends BulkOrderIdsDto {
  @ApiProperty({ description: '변경할 접수일' })
  @Type(() => Date)
  @IsDate()
  receiptDate: Date;
}

export class BulkCancelDto extends BulkOrderIdsDto {
  @ApiPropertyOptional({ description: '취소 사유' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ==================== 관리자 금액 조정 DTO ====================
export class AdjustOrderItemDto {
  @ApiProperty({ description: '주문항목 ID' })
  @IsString()
  itemId: string;

  @ApiPropertyOptional({ description: '변경할 수량' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: '변경할 단가' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ description: '편집스타일 (single/spread)' })
  @IsOptional()
  @IsString()
  pageLayout?: string;

  @ApiPropertyOptional({ description: '제본순서' })
  @IsOptional()
  @IsString()
  bindingDirection?: string;

  @ApiPropertyOptional({ description: '원단명' })
  @IsOptional()
  @IsString()
  fabricName?: string;

  @ApiPropertyOptional({ description: '원단 스냅샷 (주문 시점 정보 보존)' })
  @IsOptional()
  fabricSnapshot?: {
    id: string;
    code?: string;
    name: string;
    category?: string;
    material?: string;
    colorCode?: string;
    colorName?: string;
    basePrice?: number;
    thumbnailUrl?: string;
  };

  @ApiPropertyOptional({ description: '박 동판명' })
  @IsOptional()
  @IsString()
  foilName?: string;

  @ApiPropertyOptional({ description: '박 색상' })
  @IsOptional()
  @IsString()
  foilColor?: string;

  @ApiPropertyOptional({ description: '박 위치' })
  @IsOptional()
  @IsString()
  foilPosition?: string;
}

export class AdjustOrderDto {
  @ApiPropertyOptional({ description: '할인금액' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  adjustmentAmount?: number;

  @ApiPropertyOptional({ description: '할인/조정 사유' })
  @IsOptional()
  @IsString()
  adjustmentReason?: string;

  @ApiPropertyOptional({ description: '항목별 수정 내역' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjustOrderItemDto)
  itemUpdates?: AdjustOrderItemDto[];
}

export class BulkDataCleanupDto {
  @ApiProperty({ description: '시작일' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({ description: '종료일' })
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @ApiPropertyOptional({ description: '썸네일도 삭제 여부' })
  @IsOptional()
  @IsBoolean()
  deleteThumbnails?: boolean;
}

// ==================== 월거래집계 조회 DTO ====================
export class MonthlySummaryQueryDto {
  @ApiProperty({ description: '거래처 ID' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: '시작일 (YYYY-MM-DD)' })
  @IsString()
  startDate: string;

  @ApiProperty({ description: '종료일 (YYYY-MM-DD)' })
  @IsString()
  endDate: string;
}

// ==================== 일자별 집계 조회 DTO ====================
export class DailySummaryQueryDto {
  @ApiProperty({ description: '거래처 ID' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: '시작일 (YYYY-MM-DD)' })
  @IsString()
  startDate: string;

  @ApiProperty({ description: '종료일 (YYYY-MM-DD)' })
  @IsString()
  endDate: string;
}

// ==================== 파일검수 관련 DTO ====================
export class InspectFileDto {
  @ApiProperty({
    description: '검수 상태',
    enum: ['approved', 'rejected'],
  })
  @IsIn(['approved', 'rejected'])
  inspectionStatus: string;

  @ApiPropertyOptional({ description: '검수 메모' })
  @IsOptional()
  @IsString()
  inspectionNote?: string;
}

export class HoldInspectionDto {
  @ApiProperty({ description: '보류 사유' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'SMS 발송 여부', default: true })
  @IsOptional()
  @IsBoolean()
  sendSms?: boolean;
}

export class CompleteInspectionDto {
  @ApiPropertyOptional({ description: '완료 메모' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class SameDayShippingQueryDto {
  @ApiProperty({ description: '거래처 ID' })
  @IsString()
  clientId: string;
}

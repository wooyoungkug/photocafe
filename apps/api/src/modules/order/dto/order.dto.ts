import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsIn,
  IsDate,
  IsNotEmpty,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ==================== 주문 상태 ====================
export const ORDER_STATUS = {
  PENDING_RECEIPT: 'pending_receipt',             // 접수대기
  RECEIPT_COMPLETED: 'receipt_completed',         // 접수완료
  IN_PRODUCTION: 'in_production',                 // 생산진행
  PRINTED: 'printed',                             // 출력완료 (배송준비 직전, 재출력 분기 기준점)
  READY_FOR_SHIPPING: 'ready_for_shipping',       // 배송준비
  SHIPPED: 'shipped',                             // 배송완료
  CANCELLED: 'cancelled',                         // 취소
  REPRINT_REQUESTED: 'reprint_requested',         // 재출력요청 (출력완료 후 사양 수정)
  REPRINT_IN_PRODUCTION: 'reprint_in_production', // 재출력진행
} as const;

// 편집 차단 상태 (이 두 상태에서는 사양/금액 수정 불가)
export const ORDER_EDIT_BLOCKED_STATUSES = [
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.CANCELLED,
] as const;

// 출력완료 이후 상태 — 사양 변경 시 ReprintJob 분기로 진입
export const ORDER_REPRINT_REQUIRED_STATUSES = [
  ORDER_STATUS.PRINTED,
  ORDER_STATUS.READY_FOR_SHIPPING,
  ORDER_STATUS.REPRINT_REQUESTED,
  ORDER_STATUS.REPRINT_IN_PRODUCTION,
] as const;

export const PROCESS_STATUS = {
  RECEIPT_PENDING: 'receipt_pending',       // 접수대기 (신규 주문)
  INSPECTION_HOLD: 'inspection_hold',       // 검수 보류 (파일 재업로드 대기)
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

// ==================== 출력대기 큐 상태 (status/currentProcess와 독립된 영속 플래그) ====================
// 주문이 status/currentProcess 변경으로 인해 출력대기 목록에서 실수로 사라지는 것을 방지하기 위해
// 별도의 플래그를 두고 명시적 전환(생산진행→배송준비/취소)에만 빠지도록 한다.
export const PRINT_QUEUE_STATUS = {
  PENDING: 'pending',  // 출력대기 (목록에 표시)
  PRINTED: 'printed',  // 인쇄 완료 후 제외
  SKIPPED: 'skipped',  // 취소/수동 제외
} as const;

export const PRINT_QUEUE_PROCESS_TYPES = {
  ENTERED: 'print_queue_entered',
  EXITED_PRINTED: 'print_queue_exited_printed',
  EXITED_SKIPPED: 'print_queue_exited_skipped',
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

  @ApiPropertyOptional({ description: '운임구분', enum: ['prepaid', 'cod'] })
  @IsOptional()
  @IsString()
  fareType?: string;

  @ApiPropertyOptional({ description: '배송메모 (배송 시 요청사항)' })
  @IsOptional()
  @IsString()
  deliveryMemo?: string;
}

// ==================== 주문 항목 DTO ====================
export class CreateOrderItemDto {
  @ApiProperty({ description: '상품 ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: '상품명' })
  @IsString()
  @IsNotEmpty({ message: '상품명이 비어있습니다.' })
  productName: string;

  @ApiProperty({ description: '규격' })
  @IsString()
  @IsNotEmpty({ message: '규격이 설정되지 않았습니다.' })
  size: string;

  @ApiProperty({ description: '페이지 수' })
  @IsNumber()
  @Min(1)
  pages: number;

  @ApiProperty({ description: '인쇄 방식' })
  @IsString()
  @IsNotEmpty({ message: '출력기종(인쇄방식)이 설정되지 않았습니다.' })
  printMethod: string;

  @ApiProperty({ description: '용지' })
  @IsString()
  @IsNotEmpty({ message: '용지가 설정되지 않았습니다.' })
  paper: string;

  @ApiProperty({ description: '제본 방식' })
  @IsString()
  @IsNotEmpty({ message: '제본방식이 설정되지 않았습니다.' })
  bindingType: string;

  @ApiPropertyOptional({ description: '도수 코드 (예: CI-6C-2S → 6도 양면). printMethod에서 자동 도출 가능' })
  @IsOptional()
  @IsString()
  colorIntentCode?: string;

  @ApiPropertyOptional({ description: '인쇄면 (single/double). 단면/양면 출력 구분' })
  @IsOptional()
  @IsString()
  printSide?: string;

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

  @ApiPropertyOptional({ description: '규격 ID (Specification.id) — 주문 생성 시 가격 산출 규격 연결용' })
  @IsOptional()
  @IsString()
  fileSpecId?: string;

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
  @ApiPropertyOptional({ description: '발송지 유형', enum: ['company', 'orderer'] })
  @IsOptional()
  @IsString()
  senderType?: string;

  @ApiPropertyOptional({ description: '발송인명' })
  @IsOptional()
  @IsString()
  senderName?: string;

  @ApiPropertyOptional({ description: '발송인 연락처' })
  @IsOptional()
  @IsString()
  senderPhone?: string;

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

  @ApiPropertyOptional({ description: '배송지 유형', enum: ['orderer', 'direct_customer'] })
  @IsOptional()
  @IsString()
  receiverType?: string;

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

  @ApiPropertyOptional({ description: '배송 방법', enum: ['parcel', 'motorcycle', 'freight', 'pickup'] })
  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  @ApiPropertyOptional({ description: '배송비' })
  @IsOptional()
  @IsNumber()
  deliveryFee?: number;

  @ApiPropertyOptional({ description: '배송비 유형', enum: ['free', 'conditional', 'standard'] })
  @IsOptional()
  @IsString()
  deliveryFeeType?: string;

  @ApiPropertyOptional({ description: '운임구분', enum: ['prepaid', 'cod'] })
  @IsOptional()
  @IsString()
  fareType?: string;

  @ApiPropertyOptional({ description: '배송메모 (배송 시 요청사항)' })
  @IsOptional()
  @IsString()
  deliveryMemo?: string;
}

// ==================== 주문 생성 DTO ====================
export class CreateOrderDto {
  @ApiProperty({ description: '거래처 ID' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: '결제 방식', enum: ['prepaid', 'postpaid', 'card', 'transfer', 'mobile'] })
  @IsString()
  @IsIn(['prepaid', 'postpaid', 'card', 'transfer', 'mobile'], {
    message: 'paymentMethod는 prepaid, postpaid, card, transfer, mobile 중 하나여야 합니다.',
  })
  paymentMethod: string;

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

  @ApiPropertyOptional({ description: '조정금액 (음수: 할인, 양수: 추가)' })
  @IsOptional()
  @IsNumber()
  adjustmentAmount?: number;

  @ApiProperty({ description: '주문 항목' })
  @IsArray()
  @ArrayMinSize(1)
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
  // 발송인 정보
  @ApiPropertyOptional({ description: '발송인 유형 (company/studio)' })
  @IsOptional()
  @IsString()
  senderType?: string;

  @ApiPropertyOptional({ description: '발송인 이름' })
  @IsOptional()
  @IsString()
  senderName?: string;

  @ApiPropertyOptional({ description: '발송인 전화번호' })
  @IsOptional()
  @IsString()
  senderPhone?: string;

  @ApiPropertyOptional({ description: '발송인 우편번호' })
  @IsOptional()
  @IsString()
  senderPostalCode?: string;

  @ApiPropertyOptional({ description: '발송인 주소' })
  @IsOptional()
  @IsString()
  senderAddress?: string;

  @ApiPropertyOptional({ description: '발송인 상세주소' })
  @IsOptional()
  @IsString()
  senderAddressDetail?: string;

  // 수령인 정보
  @ApiPropertyOptional({ description: '수령인 유형 (direct_customer/studio)' })
  @IsOptional()
  @IsString()
  receiverType?: string;

  @ApiPropertyOptional({ description: '수령인 이름' })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiPropertyOptional({ description: '수령인 전화번호' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '수령인 우편번호' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: '수령인 주소' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: '수령인 상세주소' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  // 배송 정보
  @ApiPropertyOptional({ description: '배송방법 (parcel/motorcycle/freight/pickup)' })
  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  @ApiPropertyOptional({ description: '배송비' })
  @IsOptional()
  @IsNumber()
  deliveryFee?: number;

  @ApiPropertyOptional({ description: '배송비 유형 (free/conditional/standard)' })
  @IsOptional()
  @IsString()
  deliveryFeeType?: string;

  @ApiPropertyOptional({ description: '운임구분 (prepaid/cod)' })
  @IsOptional()
  @IsString()
  fareType?: string;

  @ApiPropertyOptional({ description: '배송메모' })
  @IsOptional()
  @IsString()
  deliveryMemo?: string;

  // 택배사 / 송장
  @ApiPropertyOptional({ description: '택배사 코드' })
  @IsOptional()
  @IsString()
  courierCode?: string;

  @ApiPropertyOptional({ description: '송장 번호' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

// ==================== 배송정보 수정 + 배송비 정산 DTO ====================
export class UpdateShippingWithFeeDto {
  @ApiPropertyOptional({ description: '수령인 유형 (direct_customer/studio)' })
  @IsOptional()
  @IsString()
  receiverType?: string;

  @ApiProperty({ description: '수령인 이름' })
  @IsString()
  recipientName: string;

  @ApiProperty({ description: '수령인 전화번호' })
  @IsString()
  phone: string;

  @ApiProperty({ description: '우편번호' })
  @IsString()
  postalCode: string;

  @ApiProperty({ description: '주소' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: '상세주소' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiPropertyOptional({ description: '배송메모' })
  @IsOptional()
  @IsString()
  deliveryMemo?: string;

  @ApiPropertyOptional({ description: '추가요금 결제방식 (bank_transfer/credit)' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export interface UpdateShippingWithFeeResult {
  feeDifference: number;
  newShippingFee: number;
  creditAdded: number;
  paymentRequired: boolean;
  bankAccount?: string;
}

// ==================== 주문 조회 DTO ====================
export class OrderQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호 (cursor 미사용 시)', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 항목 수', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(2000)
  limit?: number;

  @ApiPropertyOptional({ description: '커서 기반 페이지네이션 커서 (이전 응답의 meta.nextCursor 값)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: '검색어 (주문번호, 거래처명)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '검색 유형', enum: ['orderNumber', 'productName', 'orderTitle', 'spec'] })
  @IsOptional()
  @IsString()
  searchType?: string;

  @ApiPropertyOptional({ description: '거래처 ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: '주문 상태' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description:
      '세부 공정 탭 (지정 시 status 쿼리보다 우선). reception_hold=접수보류, reception_pending=접수대기, reception_done=접수완료, print_queue=출력대기, data_inspection=데이타검수중, finishing_wait=후가공대기, finishing_progress=후가공진행중, outbound_qc=출고검수중, shipping_progress=배송중, shipping_done=배송완료',
    enum: [
      'reception_hold',
      'reception_pending',
      'reception_done',
      'print_queue',
      'data_inspection',
      'finishing_wait',
      'finishing_progress',
      'outbound_qc',
      'shipping_progress',
      'shipping_done',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'reception_hold',
    'reception_pending',
    'reception_done',
    'print_queue',
    'data_inspection',
    'finishing_wait',
    'finishing_progress',
    'outbound_qc',
    'shipping_progress',
    'shipping_done',
  ])
  productionStage?: string;

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
  @ApiProperty({ description: '주문 ID 배열 (최대 200건)' })
  @IsArray()
  @ArrayMaxSize(200)
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

  // ===== 관리자 사양 편집 (2026-05-01 출시) =====
  @ApiPropertyOptional({ description: '용지명 (예: 스노우300g)' })
  @IsOptional()
  @IsString()
  paper?: string;

  @ApiPropertyOptional({ description: '출력방법 (indigo/inkjet)' })
  @IsOptional()
  @IsString()
  printMethod?: string;

  @ApiPropertyOptional({ description: 'ColorIntent FK (4도/6도 등)' })
  @IsOptional()
  @IsString()
  colorIntentId?: string;

  @ApiPropertyOptional({ description: '단/양면 (single/double/spread)' })
  @IsOptional()
  @IsString()
  printSide?: string;

  @ApiPropertyOptional({ description: '규격 Specification FK' })
  @IsOptional()
  @IsString()
  fileSpecId?: string;

  @ApiPropertyOptional({ description: '제본' })
  @IsOptional()
  @IsString()
  bindingType?: string;

  @ApiPropertyOptional({ description: '후가공 옵션', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  finishingOptions?: string[];

  @ApiPropertyOptional({ description: '폴더명 (주문항목 제목)' })
  @IsOptional()
  @IsString()
  folderName?: string;
}

export class AdjustOrderDto {
  @ApiPropertyOptional({ description: '조정금액 (음수: 할인, 양수: 추가)' })
  @IsOptional()
  @IsNumber()
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

import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ArrayMinSize,
  IsIn,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// 반품 상태
export const RETURN_STATUS = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  COLLECTING: 'collecting',
  COLLECTED: 'collected',
  INSPECTING: 'inspecting',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

export const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: '반품신청',
  approved: '반품승인',
  collecting: '수거중',
  collected: '수거완료',
  inspecting: '검수중',
  completed: '반품완료',
  rejected: '반품거절',
};

// 반품 사유
export const RETURN_REASONS = {
  DEFECT: 'defect',
  WRONG_ITEM: 'wrong_item',
  DAMAGED: 'damaged',
  CUSTOMER_CHANGE: 'customer_change',
  OTHER: 'other',
} as const;

export const RETURN_REASON_LABELS: Record<string, string> = {
  defect: '제품 불량',
  wrong_item: '오배송',
  damaged: '배송중 파손',
  customer_change: '고객 변심',
  other: '기타',
};

// 사유별 배송비 부담자 기본값
export const REASON_DEFAULT_FEE_CHARGED_TO: Record<string, string> = {
  defect: 'company',
  wrong_item: 'company',
  damaged: 'company',
  customer_change: 'customer',
  other: 'company',
};

// 반품 타입
export const RETURN_TYPES = {
  RETURN: 'return',
  EXCHANGE: 'exchange',
} as const;

// ===== DTO =====

export class ReturnRequestItemDto {
  @ApiProperty({ description: '주문 아이템 ID' })
  @IsString()
  orderItemId: string;

  @ApiProperty({ description: '반품 수량' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: '아이템별 사유' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '상태', enum: ['good', 'damaged', 'defective'] })
  @IsOptional()
  @IsIn(['good', 'damaged', 'defective'])
  condition?: string;
}

export class CreateReturnRequestDto {
  @ApiProperty({ description: '반품 타입', enum: ['return', 'exchange'] })
  @IsIn(['return', 'exchange'])
  type: string;

  @ApiProperty({ description: '반품 사유', enum: ['defect', 'wrong_item', 'damaged', 'customer_change', 'other'] })
  @IsIn(['defect', 'wrong_item', 'damaged', 'customer_change', 'other'])
  reason: string;

  @ApiPropertyOptional({ description: '상세 사유' })
  @IsOptional()
  @IsString()
  reasonDetail?: string;

  @ApiProperty({ description: '반품 아이템 목록', type: [ReturnRequestItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnRequestItemDto)
  items: ReturnRequestItemDto[];
}

export class ApproveReturnDto {
  @ApiPropertyOptional({ description: '배송비 부담자', enum: ['company', 'customer'] })
  @IsOptional()
  @IsIn(['company', 'customer'])
  shippingFeeChargedTo?: string;

  @ApiPropertyOptional({ description: '반품 배송비' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  returnShippingFee?: number;

  @ApiPropertyOptional({ description: '관리자 메모' })
  @IsOptional()
  @IsString()
  adminMemo?: string;
}

export class RejectReturnDto {
  @ApiProperty({ description: '거절 사유' })
  @IsString()
  rejectedReason: string;
}

export class UpdateReturnTrackingDto {
  @ApiProperty({ description: '택배사 코드' })
  @IsString()
  courierCode: string;

  @ApiProperty({ description: '운송장 번호' })
  @IsString()
  trackingNumber: string;
}

export class ExchangeShipDto {
  @ApiProperty({ description: '택배사 코드' })
  @IsString()
  courierCode: string;

  @ApiProperty({ description: '운송장 번호' })
  @IsString()
  trackingNumber: string;
}

export class ReturnQueryDto {
  @ApiPropertyOptional({ description: '고객 ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: '주문 ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: '상태' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @IsString()
  endDate?: string;

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

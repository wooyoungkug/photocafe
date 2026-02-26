import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ArrayMinSize,
  IsIn,
  Min,
  ValidateNested,
  IsJSON,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// 수리 상태
export const RETURN_STATUS = {
  REQUESTED: 'requested',
  COLLECTING: 'collecting',
  COLLECTED: 'collected',
  INSPECTING: 'inspecting',
  COMPLETED: 'completed',
} as const;

export const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: '수리신청',
  collecting: '수거중',
  collected: '수거완료',
  inspecting: '검수중',
  completed: '수리완료',
};

// 앨범수리 사유
export const REPAIR_REASONS = {
  PAGE_REPLACE: 'page_replace',
  COVER_REPAIR: 'cover_repair',
  INNER_REPAIR: 'inner_repair',
  SHIPPING_DAMAGE: 'shipping_damage',
} as const;

export const REPAIR_REASON_LABELS: Record<string, string> = {
  page_replace: '페이지교체 (유상)',
  cover_repair: '표지수리 (무상)',
  inner_repair: '내지수리 (무상)',
  shipping_damage: '배송중파손 (무상)',
};

// 사유별 배송비 부담자 기본값
export const REASON_DEFAULT_FEE_CHARGED_TO: Record<string, string> = {
  page_replace: 'customer',
  cover_repair: 'company',
  inner_repair: 'company',
  shipping_damage: 'company',
};

// 유상/무상 여부
export const REPAIR_REASON_PAID: Record<string, boolean> = {
  page_replace: true,
  cover_repair: false,
  inner_repair: false,
  shipping_damage: false,
};

// 반품 타입
export const RETURN_TYPES = {
  ALBUM_REPAIR: 'album_repair',
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
  @ApiProperty({ description: '반품 타입', enum: ['album_repair'] })
  @IsIn(['album_repair'])
  type: string;

  @ApiProperty({
    description: '수리 사유',
    enum: ['page_replace', 'cover_repair', 'inner_repair', 'shipping_damage'],
  })
  @IsIn(['page_replace', 'cover_repair', 'inner_repair', 'shipping_damage'])
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

  @ApiPropertyOptional({ description: '교체페이지 정보 (페이지교체 시)' })
  @IsOptional()
  repairPages?: { pageNumber: number; fileName: string; fileUrl: string; thumbnailUrl?: string; isCompanion?: boolean }[];
}

export class UpdateReturnTrackingDto {
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

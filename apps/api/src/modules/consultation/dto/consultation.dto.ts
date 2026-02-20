import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDateString,
  IsEnum,
  IsArray,
  Min,
} from 'class-validator';

export enum ConsultationStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum ConsultationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum FollowUpActionType {
  PHONE = 'phone',
  VISIT = 'visit',
  EMAIL = 'email',
  KAKAO = 'kakao',
  OTHER = 'other',
}

export class CreateConsultationDto {
  @ApiPropertyOptional({ description: '고객 ID (비회원인 경우 생략)' })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiProperty({ description: '상담 분류 ID' })
  @IsString()
  categoryId: string;

  @ApiProperty({ description: '상담 제목', example: '인쇄물 색상 오류 문의' })
  @IsString()
  title: string;

  @ApiProperty({ description: '상담 내용' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '관련 주문 ID' })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({ description: '관련 주문번호' })
  @IsString()
  @IsOptional()
  orderNumber?: string;

  @ApiProperty({ description: '상담자 ID' })
  @IsString()
  counselorId: string;

  @ApiProperty({ description: '상담자명' })
  @IsString()
  counselorName: string;

  @ApiPropertyOptional({ description: '상담 시간' })
  @IsDateString()
  @IsOptional()
  consultedAt?: string;

  @ApiPropertyOptional({
    description: '상태',
    enum: ConsultationStatus,
    default: ConsultationStatus.OPEN,
  })
  @IsEnum(ConsultationStatus)
  @IsOptional()
  status?: ConsultationStatus;

  @ApiPropertyOptional({
    description: '우선순위',
    enum: ConsultationPriority,
    default: ConsultationPriority.NORMAL,
  })
  @IsEnum(ConsultationPriority)
  @IsOptional()
  priority?: ConsultationPriority;

  @ApiPropertyOptional({ description: '후속 조치 예정일' })
  @IsDateString()
  @IsOptional()
  followUpDate?: string;

  @ApiPropertyOptional({ description: '후속 조치 메모' })
  @IsString()
  @IsOptional()
  followUpNote?: string;

  @ApiPropertyOptional({ description: '카카오톡 예약 전송 여부' })
  @IsBoolean()
  @IsOptional()
  kakaoScheduled?: boolean;

  @ApiPropertyOptional({ description: '카카오톡 전송 예약 시간' })
  @IsDateString()
  @IsOptional()
  kakaoSendAt?: string;

  @ApiPropertyOptional({ description: '카카오톡 메시지 내용' })
  @IsString()
  @IsOptional()
  kakaoMessage?: string;

  @ApiPropertyOptional({ description: '첨부파일 URL 배열' })
  @IsArray()
  @IsOptional()
  attachments?: string[];

  @ApiPropertyOptional({ description: '내부 메모' })
  @IsString()
  @IsOptional()
  internalMemo?: string;
}

export class UpdateConsultationDto {
  @ApiPropertyOptional({ description: '상담 분류 ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: '상담 제목' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: '상담 내용' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: '관련 주문 ID' })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({ description: '관련 주문번호' })
  @IsString()
  @IsOptional()
  orderNumber?: string;

  @ApiPropertyOptional({
    description: '상태',
    enum: ConsultationStatus,
  })
  @IsEnum(ConsultationStatus)
  @IsOptional()
  status?: ConsultationStatus;

  @ApiPropertyOptional({
    description: '우선순위',
    enum: ConsultationPriority,
  })
  @IsEnum(ConsultationPriority)
  @IsOptional()
  priority?: ConsultationPriority;

  @ApiPropertyOptional({ description: '처리 내용' })
  @IsString()
  @IsOptional()
  resolution?: string;

  @ApiPropertyOptional({ description: '후속 조치 예정일' })
  @IsDateString()
  @IsOptional()
  followUpDate?: string;

  @ApiPropertyOptional({ description: '후속 조치 메모' })
  @IsString()
  @IsOptional()
  followUpNote?: string;

  @ApiPropertyOptional({ description: '카카오톡 예약 전송 여부' })
  @IsBoolean()
  @IsOptional()
  kakaoScheduled?: boolean;

  @ApiPropertyOptional({ description: '카카오톡 전송 예약 시간' })
  @IsDateString()
  @IsOptional()
  kakaoSendAt?: string;

  @ApiPropertyOptional({ description: '카카오톡 메시지 내용' })
  @IsString()
  @IsOptional()
  kakaoMessage?: string;

  @ApiPropertyOptional({ description: '첨부파일 URL 배열' })
  @IsArray()
  @IsOptional()
  attachments?: string[];

  @ApiPropertyOptional({ description: '내부 메모' })
  @IsString()
  @IsOptional()
  internalMemo?: string;
}

export class UpdateConsultationStatusDto {
  @ApiProperty({
    description: '상태',
    enum: ConsultationStatus,
  })
  @IsEnum(ConsultationStatus)
  status: ConsultationStatus;

  @ApiPropertyOptional({ description: '상태 변경자 (담당자명)' })
  @IsOptional()
  @IsString()
  updatedBy?: string;
}

export class ResolveConsultationDto {
  @ApiProperty({ description: '처리 내용' })
  @IsString()
  resolution: string;

  @ApiProperty({ description: '해결 담당자 ID' })
  @IsString()
  resolvedBy: string;
}

export class CreateFollowUpDto {
  @ApiProperty({ description: '후속 조치 내용' })
  @IsString()
  content: string;

  @ApiProperty({
    description: '조치 유형',
    enum: FollowUpActionType,
  })
  @IsEnum(FollowUpActionType)
  actionType: FollowUpActionType;

  @ApiProperty({ description: '담당자 ID' })
  @IsString()
  staffId: string;

  @ApiProperty({ description: '담당자명' })
  @IsString()
  staffName: string;
}

export class ConsultationQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 항목 수', default: 20 })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: '검색어 (상담번호, 제목, 고객명)' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: '고객 ID' })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ description: '상담 분류 ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: '상태',
    enum: ConsultationStatus,
  })
  @IsEnum(ConsultationStatus)
  @IsOptional()
  status?: ConsultationStatus;

  @ApiPropertyOptional({
    description: '우선순위',
    enum: ConsultationPriority,
  })
  @IsEnum(ConsultationPriority)
  @IsOptional()
  priority?: ConsultationPriority;

  @ApiPropertyOptional({ description: '상담자 ID' })
  @IsString()
  @IsOptional()
  counselorId?: string;

  @ApiPropertyOptional({ description: '시작일' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

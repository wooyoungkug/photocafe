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
  Max,
  IsNumber,
} from 'class-validator';

// ==================== 태그 관련 DTO ====================

export class CreateConsultationTagDto {
  @ApiProperty({ description: '태그 코드', example: 'print_quality' })
  @IsString()
  code: string;

  @ApiProperty({ description: '태그명', example: '인쇄 화질' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '태그 색상', example: '#FF5722' })
  @IsString()
  @IsOptional()
  colorCode?: string;

  @ApiPropertyOptional({ description: '태그 카테고리', enum: ['claim', 'inquiry', 'sales'], default: 'claim' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'AI 자동 태깅 대상', default: false })
  @IsBoolean()
  @IsOptional()
  isAutoTag?: boolean;

  @ApiPropertyOptional({ description: '자동 태깅용 키워드', example: ['화질', '선명도', '흐림'] })
  @IsArray()
  @IsOptional()
  keywords?: string[];
}

export class UpdateConsultationTagDto {
  @ApiPropertyOptional({ description: '태그명' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '태그 색상' })
  @IsString()
  @IsOptional()
  colorCode?: string;

  @ApiPropertyOptional({ description: '태그 카테고리' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'AI 자동 태깅 대상' })
  @IsBoolean()
  @IsOptional()
  isAutoTag?: boolean;

  @ApiPropertyOptional({ description: '자동 태깅용 키워드' })
  @IsArray()
  @IsOptional()
  keywords?: string[];
}

export class AddTagsToConsultationDto {
  @ApiProperty({ description: '태그 ID 목록' })
  @IsArray()
  @IsString({ each: true })
  tagIds: string[];
}

// ==================== 알림 관련 DTO ====================

export enum AlertType {
  REPEAT_CLAIM = 'repeat_claim',
  URGENT = 'urgent',
  SLA_BREACH = 'sla_breach',
  AT_RISK = 'at_risk',
  FOLLOW_UP_DUE = 'follow_up_due',
}

export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export class CreateAlertDto {
  @ApiPropertyOptional({ description: '고객 ID' })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ description: '상담 ID' })
  @IsString()
  @IsOptional()
  consultationId?: string;

  @ApiProperty({ description: '알림 유형', enum: AlertType })
  @IsEnum(AlertType)
  alertType: AlertType;

  @ApiPropertyOptional({ description: '알림 레벨', enum: AlertLevel, default: AlertLevel.WARNING })
  @IsEnum(AlertLevel)
  @IsOptional()
  alertLevel?: AlertLevel;

  @ApiProperty({ description: '알림 제목' })
  @IsString()
  title: string;

  @ApiProperty({ description: '알림 메시지' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: '트리거 조건 (JSON)' })
  @IsOptional()
  triggerCondition?: Record<string, any>;

  @ApiPropertyOptional({ description: '만료 시간' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class ResolveAlertDto {
  @ApiProperty({ description: '해결 담당자 ID' })
  @IsString()
  resolvedBy: string;

  @ApiPropertyOptional({ description: '해결 내용' })
  @IsString()
  @IsOptional()
  resolution?: string;
}

export class AlertQueryDto {
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

  @ApiPropertyOptional({ description: '알림 유형', enum: AlertType })
  @IsEnum(AlertType)
  @IsOptional()
  alertType?: AlertType;

  @ApiPropertyOptional({ description: '알림 레벨', enum: AlertLevel })
  @IsEnum(AlertLevel)
  @IsOptional()
  alertLevel?: AlertLevel;

  @ApiPropertyOptional({ description: '읽음 여부' })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiPropertyOptional({ description: '해결 여부' })
  @IsBoolean()
  @IsOptional()
  isResolved?: boolean;

  @ApiPropertyOptional({ description: '고객 ID' })
  @IsString()
  @IsOptional()
  clientId?: string;
}

// ==================== SLA 관련 DTO ====================

export class CreateSLADto {
  @ApiProperty({ description: 'SLA 규칙 이름' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '적용 카테고리 ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: '적용 우선순위' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ description: '최초 응답 목표 시간 (분)', default: 60 })
  @IsInt()
  @Min(1)
  @IsOptional()
  firstResponseTarget?: number;

  @ApiPropertyOptional({ description: '해결 목표 시간 (분)', default: 1440 })
  @IsInt()
  @Min(1)
  @IsOptional()
  resolutionTarget?: number;

  @ApiPropertyOptional({ description: '에스컬레이션 시간 (분)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  escalationTime?: number;

  @ApiPropertyOptional({ description: '에스컬레이션 대상 (직원 ID)' })
  @IsString()
  @IsOptional()
  escalateTo?: string;

  @ApiPropertyOptional({ description: '경고 임계값 (%)', default: 80 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  warningThreshold?: number;

  @ApiPropertyOptional({ description: '위험 임계값 (%)', default: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  criticalThreshold?: number;
}

export class UpdateSLADto {
  @ApiPropertyOptional({ description: 'SLA 규칙 이름' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '적용 카테고리 ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: '적용 우선순위' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ description: '최초 응답 목표 시간 (분)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  firstResponseTarget?: number;

  @ApiPropertyOptional({ description: '해결 목표 시간 (분)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  resolutionTarget?: number;

  @ApiPropertyOptional({ description: '에스컬레이션 시간 (분)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  escalationTime?: number;

  @ApiPropertyOptional({ description: '에스컬레이션 대상 (직원 ID)' })
  @IsString()
  @IsOptional()
  escalateTo?: string;

  @ApiPropertyOptional({ description: '경고 임계값 (%)' })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  warningThreshold?: number;

  @ApiPropertyOptional({ description: '위험 임계값 (%)' })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  criticalThreshold?: number;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ==================== 고객 건강 점수 DTO ====================

export class CustomerHealthScoreDto {
  @ApiProperty({ description: '고객 ID' })
  @IsString()
  clientId: string;

  @ApiPropertyOptional({ description: '클레임 점수 (0-100)', default: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  claimScore?: number;

  @ApiPropertyOptional({ description: '만족도 점수 (0-100)', default: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  satisfactionScore?: number;

  @ApiPropertyOptional({ description: '충성도 점수 (0-100)', default: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  loyaltyScore?: number;

  @ApiPropertyOptional({ description: '소통 점수 (0-100)', default: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  communicationScore?: number;
}

// ==================== 만족도 조사 DTO ====================

export class CreateSurveyDto {
  @ApiProperty({ description: '상담 ID' })
  @IsString()
  consultationId: string;

  @ApiProperty({ description: '전체 만족도 (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  satisfactionScore: number;

  @ApiPropertyOptional({ description: '응답 속도 (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  responseSpeedScore?: number;

  @ApiPropertyOptional({ description: '문제 해결 (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  resolutionScore?: number;

  @ApiPropertyOptional({ description: '친절도 (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  friendlinessScore?: number;

  @ApiPropertyOptional({ description: '추가 피드백' })
  @IsString()
  @IsOptional()
  feedback?: string;

  @ApiPropertyOptional({ description: '추천 의향' })
  @IsBoolean()
  @IsOptional()
  wouldRecommend?: boolean;

  @ApiPropertyOptional({ description: '설문 방법', enum: ['email', 'kakao', 'web', 'phone'], default: 'email' })
  @IsString()
  @IsOptional()
  surveyMethod?: string;
}

// ==================== 상담 가이드 DTO ====================

export class CreateGuideDto {
  @ApiPropertyOptional({ description: '관련 상담 분류 ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: '관련 태그 코드들' })
  @IsArray()
  @IsOptional()
  tagCodes?: string[];

  @ApiProperty({ description: '가이드 제목' })
  @IsString()
  title: string;

  @ApiProperty({ description: '문제 상황 설명' })
  @IsString()
  problem: string;

  @ApiProperty({ description: '해결 방법' })
  @IsString()
  solution: string;

  @ApiPropertyOptional({ description: '상담 스크립트 배열' })
  @IsArray()
  @IsOptional()
  scripts?: { step: number; text: string }[];

  @ApiPropertyOptional({ description: '관련 가이드 ID들' })
  @IsArray()
  @IsOptional()
  relatedGuideIds?: string[];

  @ApiPropertyOptional({ description: '첨부파일 URL 배열' })
  @IsArray()
  @IsOptional()
  attachments?: string[];
}

export class UpdateGuideDto {
  @ApiPropertyOptional({ description: '관련 상담 분류 ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: '관련 태그 코드들' })
  @IsArray()
  @IsOptional()
  tagCodes?: string[];

  @ApiPropertyOptional({ description: '가이드 제목' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: '문제 상황 설명' })
  @IsString()
  @IsOptional()
  problem?: string;

  @ApiPropertyOptional({ description: '해결 방법' })
  @IsString()
  @IsOptional()
  solution?: string;

  @ApiPropertyOptional({ description: '상담 스크립트 배열' })
  @IsArray()
  @IsOptional()
  scripts?: { step: number; text: string }[];

  @ApiPropertyOptional({ description: '관련 가이드 ID들' })
  @IsArray()
  @IsOptional()
  relatedGuideIds?: string[];

  @ApiPropertyOptional({ description: '첨부파일 URL 배열' })
  @IsArray()
  @IsOptional()
  attachments?: string[];

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ==================== 대시보드/통계 DTO ====================

export class DashboardQueryDto {
  @ApiPropertyOptional({ description: '시작일' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: '상담자 ID' })
  @IsString()
  @IsOptional()
  counselorId?: string;
}

export class ClientTimelineQueryDto {
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

  @ApiPropertyOptional({ description: '이벤트 타입 필터', example: ['consultation', 'order', 'claim'] })
  @IsArray()
  @IsOptional()
  eventTypes?: string[];
}

// ==================== 채널 기록 DTO ====================

export class CreateChannelLogDto {
  @ApiProperty({ description: '상담 ID' })
  @IsString()
  consultationId: string;

  @ApiProperty({ description: '채널', enum: ['phone', 'kakao', 'web', 'email', 'visit', 'other'] })
  @IsString()
  channel: string;

  @ApiPropertyOptional({ description: '세부 채널 정보' })
  @IsString()
  @IsOptional()
  channelDetail?: string;

  @ApiPropertyOptional({ description: '방향', enum: ['inbound', 'outbound'], default: 'inbound' })
  @IsString()
  @IsOptional()
  direction?: string;

  @ApiPropertyOptional({ description: '통화 시간 (초)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  callDuration?: number;

  @ApiPropertyOptional({ description: '통화 녹음 URL' })
  @IsString()
  @IsOptional()
  callRecordUrl?: string;

  @ApiPropertyOptional({ description: '채널별 메타데이터' })
  @IsOptional()
  metadata?: Record<string, any>;
}

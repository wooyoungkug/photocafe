import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 알림 타입 — KAKAO 템플릿 ENV 매핑 키와 1:1 대응.
 * - order_edit                : 사양/금액 수정 알림 (출력담당자에게)
 * - reprint_request           : 재출력 요청 알림 (출력담당자에게)
 * - print_operator_assigned   : 출력담당자 배정 알림
 * - print_operator_unassigned : 출력담당자 해제 알림
 * - order_status_changed      : 주문 상태 변경 일반 알림
 */
export const NOTIFICATION_TYPES = {
  ORDER_EDIT: 'order_edit',
  REPRINT_REQUEST: 'reprint_request',
  PRINT_OPERATOR_ASSIGNED: 'print_operator_assigned',
  PRINT_OPERATOR_UNASSIGNED: 'print_operator_unassigned',
  ORDER_STATUS_CHANGED: 'order_status_changed',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

/** Notification 생성 요청 DTO — 서비스 내부에서 사용 (HTTP 노출 안 함) */
export class CreateNotificationDto {
  @ApiProperty({ description: '수신 직원 ID' })
  @IsString()
  recipientStaffId!: string;

  @ApiProperty({ description: '알림 타입', enum: Object.values(NOTIFICATION_TYPES) })
  @IsString()
  type!: string;

  @ApiProperty({ description: '제목' })
  @IsString()
  title!: string;

  @ApiProperty({ description: '본문' })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ description: '추가 페이로드 (orderId, orderNumber 등)' })
  @IsOptional()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '클릭 시 이동 경로 (예: /orders/{id})' })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({ description: '발송 채널', enum: ['inapp', 'kakao'], default: 'inapp' })
  @IsOptional()
  @IsIn(['inapp', 'kakao'])
  channel?: 'inapp' | 'kakao';
}

/** GET /notifications/me 쿼리 */
export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ description: '미확인만 조회', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ description: '페이지 크기 (1~100)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: '커서 (createdAt ISO + id, base64)' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

/** Web Push 구독 등록 요청 DTO — 브라우저 PushManager.subscribe() 결과를 그대로 받는다. */
export class PushSubscribeDto {
  @ApiProperty({ description: 'Push Service endpoint URL' })
  @IsString()
  endpoint!: string;

  @ApiProperty({ description: 'P-256 공개키 (base64url)' })
  @IsString()
  p256dh!: string;

  @ApiProperty({ description: 'Auth secret (base64url)' })
  @IsString()
  auth!: string;

  @ApiPropertyOptional({ description: 'User-Agent (디바이스 식별용)' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

/** Web Push 구독 해제 요청 DTO */
export class PushUnsubscribeDto {
  @ApiProperty({ description: '해제할 endpoint URL' })
  @IsString()
  endpoint!: string;
}

/** Swagger 응답 스키마 */
export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  recipientStaffId!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiPropertyOptional({ type: Object })
  payload?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  link?: string | null;

  @ApiPropertyOptional()
  readAt?: Date | null;

  @ApiProperty()
  channel!: string;

  @ApiPropertyOptional()
  kakaoSentAt?: Date | null;

  @ApiPropertyOptional()
  kakaoStatus?: string | null;

  @ApiProperty()
  createdAt!: Date;
}

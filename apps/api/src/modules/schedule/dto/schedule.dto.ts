import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// 반복 설정 타입 (네이버 캘린더 스타일)
export type RecurringType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export class RecurringConfigDto {
  @ApiProperty({ description: '반복 타입', enum: ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'] })
  @IsIn(['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'])
  type: RecurringType;

  @ApiPropertyOptional({ description: '반복 간격 (1 = 매일/매주/매월/매년)' })
  @IsOptional()
  @IsNumber()
  interval?: number;

  @ApiPropertyOptional({ description: '매주 반복 시 요일 선택 (0=일, 1=월, ..., 6=토)' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  weekdays?: number[];

  @ApiPropertyOptional({ description: '매월 반복 시 일자 (1-31)' })
  @IsOptional()
  @IsNumber()
  monthDay?: number;

  @ApiPropertyOptional({ description: '매월 반복 시 주차 (1=첫째주, 2=둘째주, -1=마지막주)' })
  @IsOptional()
  @IsNumber()
  monthWeek?: number;

  @ApiPropertyOptional({ description: '매월 반복 시 요일 (monthWeek와 함께 사용)' })
  @IsOptional()
  @IsNumber()
  monthWeekday?: number;

  @ApiPropertyOptional({ description: '종료 조건', enum: ['never', 'date', 'count'] })
  @IsOptional()
  @IsIn(['never', 'date', 'count'])
  endType?: 'never' | 'date' | 'count';

  @ApiPropertyOptional({ description: '종료일 (endType이 date인 경우)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: '반복 횟수 (endType이 count인 경우)' })
  @IsOptional()
  @IsNumber()
  endCount?: number;
}

export class CreateScheduleDto {
  @ApiProperty({ description: '일정 제목' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '상세 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '장소' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: '시작 일시' })
  @IsDateString()
  startAt: string;

  @ApiProperty({ description: '종료 일시' })
  @IsDateString()
  endAt: string;

  @ApiPropertyOptional({ description: '종일 일정 여부' })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional({ description: '개인일정 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isPersonal?: boolean;

  @ApiPropertyOptional({ description: '부서일정 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isDepartment?: boolean;

  @ApiPropertyOptional({ description: '전체일정 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isCompany?: boolean;

  @ApiPropertyOptional({ description: '공유 부서 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sharedDeptIds?: string[];

  @ApiPropertyOptional({ description: '일정 타입', enum: ['meeting', 'event', 'task', 'reminder', 'holiday'] })
  @IsOptional()
  @IsIn(['meeting', 'event', 'task', 'reminder', 'holiday'])
  scheduleType?: string;

  @ApiPropertyOptional({ description: '알림 설정' })
  @IsOptional()
  reminders?: Array<{ type: string; minutes: number }>;

  @ApiPropertyOptional({ description: '반복 여부' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: '반복 규칙 (RRULE 형식)' })
  @IsOptional()
  @IsString()
  recurringRule?: string;

  @ApiPropertyOptional({ description: '반복 설정 (UI용)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringConfigDto)
  recurringConfig?: RecurringConfigDto;

  @ApiPropertyOptional({ description: '반복 종료일' })
  @IsOptional()
  @IsDateString()
  recurringEnd?: string;

  @ApiPropertyOptional({ description: '참석자' })
  @IsOptional()
  attendees?: Array<{ staffId: string; name: string; status?: string }>;

  @ApiPropertyOptional({ description: '일정 색상' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '태그 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '관련 엔티티 타입' })
  @IsOptional()
  @IsString()
  relatedType?: string;

  @ApiPropertyOptional({ description: '관련 엔티티 ID' })
  @IsOptional()
  @IsString()
  relatedId?: string;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional({ description: '일정 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '상세 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '장소' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: '시작 일시' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ description: '종료 일시' })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ description: '종일 일정 여부' })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional({ description: '개인일정 여부' })
  @IsOptional()
  @IsBoolean()
  isPersonal?: boolean;

  @ApiPropertyOptional({ description: '부서일정 여부' })
  @IsOptional()
  @IsBoolean()
  isDepartment?: boolean;

  @ApiPropertyOptional({ description: '전체일정 여부' })
  @IsOptional()
  @IsBoolean()
  isCompany?: boolean;

  @ApiPropertyOptional({ description: '공유 부서 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sharedDeptIds?: string[];

  @ApiPropertyOptional({ description: '일정 타입' })
  @IsOptional()
  @IsIn(['meeting', 'event', 'task', 'reminder', 'holiday'])
  scheduleType?: string;

  @ApiPropertyOptional({ description: '알림 설정' })
  @IsOptional()
  reminders?: Array<{ type: string; minutes: number }>;

  @ApiPropertyOptional({ description: '반복 여부' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: '반복 규칙' })
  @IsOptional()
  @IsString()
  recurringRule?: string;

  @ApiPropertyOptional({ description: '반복 설정 (UI용)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringConfigDto)
  recurringConfig?: RecurringConfigDto;

  @ApiPropertyOptional({ description: '반복 종료일' })
  @IsOptional()
  @IsDateString()
  recurringEnd?: string;

  @ApiPropertyOptional({ description: '참석자' })
  @IsOptional()
  attendees?: Array<{ staffId: string; name: string; status?: string }>;

  @ApiPropertyOptional({ description: '일정 색상' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '태그 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '상태', enum: ['confirmed', 'tentative', 'cancelled'] })
  @IsOptional()
  @IsIn(['confirmed', 'tentative', 'cancelled'])
  status?: string;
}

export class QueryScheduleDto {
  @ApiPropertyOptional({ description: '시작일 필터 (필수)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: '종료일 필터 (필수)' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: '범위 필터', enum: ['personal', 'department', 'company', 'all'] })
  @IsOptional()
  @IsIn(['personal', 'department', 'company', 'all'])
  scope?: string;

  @ApiPropertyOptional({ description: '일정 타입 필터' })
  @IsOptional()
  @IsIn(['meeting', 'event', 'task', 'reminder', 'holiday'])
  scheduleType?: string;

  @ApiPropertyOptional({ description: '검색어' })
  @IsOptional()
  @IsString()
  search?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateTodoDto {
  @ApiProperty({ description: '할일 제목' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '상세 내용' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '우선순위', enum: ['low', 'normal', 'high', 'urgent'] })
  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({ description: '시작일시' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '마감일시' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

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

  @ApiPropertyOptional({ description: '알림 시간' })
  @IsOptional()
  @IsDateString()
  reminderAt?: string;

  @ApiPropertyOptional({ description: '반복 여부' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: '반복 타입', enum: ['daily', 'weekly', 'monthly', 'yearly'] })
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'])
  recurringType?: string;

  @ApiPropertyOptional({ description: '반복 종료일' })
  @IsOptional()
  @IsDateString()
  recurringEnd?: string;

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

export class UpdateTodoDto {
  @ApiPropertyOptional({ description: '할일 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '상세 내용' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '우선순위', enum: ['low', 'normal', 'high', 'urgent'] })
  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({ description: '시작일시' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '마감일시' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: '종일 일정 여부' })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional({ description: '상태', enum: ['pending', 'in_progress', 'completed', 'cancelled'] })
  @IsOptional()
  @IsIn(['pending', 'in_progress', 'completed', 'cancelled'])
  status?: string;

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

  @ApiPropertyOptional({ description: '알림 시간' })
  @IsOptional()
  @IsDateString()
  reminderAt?: string;

  @ApiPropertyOptional({ description: '반복 여부' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: '반복 타입' })
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'])
  recurringType?: string;

  @ApiPropertyOptional({ description: '반복 종료일' })
  @IsOptional()
  @IsDateString()
  recurringEnd?: string;

  @ApiPropertyOptional({ description: '일정 색상' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '태그 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class QueryTodoDto {
  @ApiPropertyOptional({ description: '상태 필터' })
  @IsOptional()
  @IsIn(['pending', 'in_progress', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: '우선순위 필터' })
  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({ description: '범위 필터', enum: ['personal', 'department', 'company', 'all'] })
  @IsOptional()
  @IsIn(['personal', 'department', 'company', 'all'])
  scope?: string;

  @ApiPropertyOptional({ description: '시작일 필터' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일 필터' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '검색어' })
  @IsOptional()
  @IsString()
  search?: string;
}

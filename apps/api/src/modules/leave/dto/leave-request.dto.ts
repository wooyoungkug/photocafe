import { IsString, IsOptional, IsDateString, IsNumber, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLeaveRequestDto {
  @ApiProperty({ description: '휴가 유형 코드', example: 'annual' })
  @IsString()
  leaveTypeCode: string;

  @ApiProperty({ description: '시작일', example: '2026-04-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: '종료일', example: '2026-04-03' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: '시작시간 (반반차용)', example: '09:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: '종료시간 (반반차용)', example: '11:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({ description: '차감일수', example: 3 })
  @Type(() => Number)
  @IsNumber()
  days: number;

  @ApiPropertyOptional({ description: '사유' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryLeaveRequestDto {
  @ApiPropertyOptional({ description: '직원 ID' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional({ description: '상태', enum: ['PENDING', 'TEAM_APPROVED', 'APPROVED', 'REJECTED', 'CANCELLED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '시작일 (from)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일 (to)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '페이지', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class ApproveLeaveRequestDto {
  @ApiProperty({ description: '승인/반려', enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @ApiProperty({ description: '결재 단계 (1=팀장, 2=부서장)', example: 1 })
  @Type(() => Number)
  @IsInt()
  step: number;

  @ApiPropertyOptional({ description: '코멘트' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class QueryLeaveCalendarDto {
  @ApiProperty({ description: '연도', example: 2026 })
  @Type(() => Number)
  @IsInt()
  year: number;

  @ApiProperty({ description: '월 (1-12)', example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  month: number;

  @ApiPropertyOptional({ description: '부서 ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: '팀 ID' })
  @IsOptional()
  @IsString()
  teamId?: string;
}

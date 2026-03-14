import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  IsNumber,
  IsInt,
  IsBoolean,
  Min,
  Max,
  IsEmail,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateShootingDto {
  @ApiProperty({ description: '고객명 (예: 신랑/신부)' })
  @IsString()
  clientName: string;

  @ApiProperty({
    description: '촬영 유형',
    enum: ['wedding_main', 'wedding_rehearsal', 'baby_dol', 'baby_growth', 'profile', 'other'],
  })
  @IsIn(['wedding_main', 'wedding_rehearsal', 'baby_dol', 'baby_growth', 'profile', 'other'])
  shootingType: string;

  @ApiProperty({ description: '장소명' })
  @IsString()
  venueName: string;

  @ApiProperty({ description: '주소' })
  @IsString()
  venueAddress: string;

  @ApiPropertyOptional({ description: '층' })
  @IsOptional()
  @IsString()
  venueFloor?: string;

  @ApiPropertyOptional({ description: '홀' })
  @IsOptional()
  @IsString()
  venueHall?: string;

  @ApiPropertyOptional({ description: '위도' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ description: '경도' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiProperty({ description: '촬영 일시' })
  @IsDateString()
  shootingDate: string;

  @ApiPropertyOptional({ description: '예상 소요시간(분)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  duration?: number;

  @ApiPropertyOptional({ description: '최대 응찰자 수', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  maxBidders?: number;

  @ApiPropertyOptional({ description: '고객 연락처' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ description: '고객 이메일' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  notes?: string;

  // ==================== 구인 연동 옵션 ====================

  @ApiPropertyOptional({ description: '구인방 동시 등록 여부' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  enableRecruitment?: boolean;

  @ApiPropertyOptional({ description: '구인 등록할 스튜디오(거래처) ID' })
  @IsOptional()
  @IsString()
  recruitmentClientId?: string;

  @ApiPropertyOptional({ description: '구인 제목' })
  @IsOptional()
  @IsString()
  recruitmentTitle?: string;

  @ApiPropertyOptional({ description: '보수 (원)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  recruitmentBudget?: number;

  @ApiPropertyOptional({ description: '구인 상세설명' })
  @IsOptional()
  @IsString()
  recruitmentDescription?: string;

  @ApiPropertyOptional({ description: '구인 요구사항' })
  @IsOptional()
  @IsString()
  recruitmentRequirements?: string;

  @ApiPropertyOptional({ description: '전속 모집 마감 시간 (시간 단위)', default: 24 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  recruitmentPrivateDeadlineHours?: number;
}

export class UpdateShootingDto {
  @ApiPropertyOptional({ description: '고객명' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({
    description: '촬영 유형',
    enum: ['wedding_main', 'wedding_rehearsal', 'baby_dol', 'baby_growth', 'profile', 'other'],
  })
  @IsOptional()
  @IsIn(['wedding_main', 'wedding_rehearsal', 'baby_dol', 'baby_growth', 'profile', 'other'])
  shootingType?: string;

  @ApiPropertyOptional({ description: '장소명' })
  @IsOptional()
  @IsString()
  venueName?: string;

  @ApiPropertyOptional({ description: '주소' })
  @IsOptional()
  @IsString()
  venueAddress?: string;

  @ApiPropertyOptional({ description: '층' })
  @IsOptional()
  @IsString()
  venueFloor?: string;

  @ApiPropertyOptional({ description: '홀' })
  @IsOptional()
  @IsString()
  venueHall?: string;

  @ApiPropertyOptional({ description: '위도' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ description: '경도' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ description: '촬영 일시' })
  @IsOptional()
  @IsDateString()
  shootingDate?: string;

  @ApiPropertyOptional({ description: '예상 소요시간(분)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  duration?: number;

  @ApiPropertyOptional({ description: '최대 응찰자 수' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  maxBidders?: number;

  @ApiPropertyOptional({ description: '고객 연락처' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ description: '고객 이메일' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  notes?: string;

  // ==================== 구인 연동 옵션 ====================

  @ApiPropertyOptional({ description: '구인방 동시 등록 여부' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  enableRecruitment?: boolean;

  @ApiPropertyOptional({ description: '구인 등록할 스튜디오(거래처) ID' })
  @IsOptional()
  @IsString()
  recruitmentClientId?: string;

  @ApiPropertyOptional({ description: '구인 제목' })
  @IsOptional()
  @IsString()
  recruitmentTitle?: string;

  @ApiPropertyOptional({ description: '보수 (원)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  recruitmentBudget?: number;

  @ApiPropertyOptional({ description: '구인 상세설명' })
  @IsOptional()
  @IsString()
  recruitmentDescription?: string;

  @ApiPropertyOptional({ description: '구인 요구사항' })
  @IsOptional()
  @IsString()
  recruitmentRequirements?: string;

  @ApiPropertyOptional({ description: '전속 모집 마감 시간 (시간 단위)', default: 24 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  recruitmentPrivateDeadlineHours?: number;
}

export class QueryShootingDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 항목 수', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: '시작일 필터' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일 필터' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: '촬영 유형 필터',
    enum: ['wedding_main', 'wedding_rehearsal', 'baby_dol', 'baby_growth', 'profile', 'other'],
  })
  @IsOptional()
  @IsIn(['wedding_main', 'wedding_rehearsal', 'baby_dol', 'baby_growth', 'profile', 'other'])
  shootingType?: string;

  @ApiPropertyOptional({
    description: '상태 필터',
    enum: ['draft', 'recruiting', 'bidding', 'confirmed', 'in_progress', 'completed', 'cancelled'],
  })
  @IsOptional()
  @IsIn(['draft', 'recruiting', 'bidding', 'confirmed', 'in_progress', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: '검색어 (고객명, 장소명)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '담당 작가 ID' })
  @IsOptional()
  @IsString()
  assignedStaffId?: string;

  @ApiPropertyOptional({ description: '생성자 ID 필터' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class UpdateShootingStatusDto {
  @ApiProperty({
    description: '변경할 상태',
    enum: ['draft', 'recruiting', 'bidding', 'confirmed', 'in_progress', 'completed', 'cancelled'],
  })
  @IsIn(['draft', 'recruiting', 'bidding', 'confirmed', 'in_progress', 'completed', 'cancelled'])
  status: string;

  @ApiPropertyOptional({ description: '상태 변경 사유' })
  @IsOptional()
  @IsString()
  reason?: string;
}

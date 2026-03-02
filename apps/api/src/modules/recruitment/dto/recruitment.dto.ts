import {
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsIn,
} from 'class-validator';

const SHOOTING_TYPES = [
  'wedding_main',
  'wedding_rehearsal',
  'baby_dol',
  'baby_growth',
  'profile',
  'other',
];

export class CreateRecruitmentDto {
  @IsString()
  title: string;

  @IsIn(SHOOTING_TYPES)
  shootingType: string;

  @IsDateString()
  shootingDate: string;

  @IsOptional()
  @IsString()
  shootingTime?: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(1440)
  duration?: number;

  @IsString()
  venueName: string;

  @IsOptional()
  @IsString()
  venueAddress?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxBidders?: number;

  /** 전속 모집 마감 시간 (시간 단위, 기본 24시간, 0=즉시 공개) */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  privateDeadlineHours?: number;
}

export class UpdateRecruitmentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn(SHOOTING_TYPES)
  shootingType?: string;

  @IsOptional()
  @IsDateString()
  shootingDate?: string;

  @IsOptional()
  @IsString()
  shootingTime?: string;

  @IsOptional()
  @IsInt()
  duration?: number;

  @IsOptional()
  @IsString()
  venueName?: string;

  @IsOptional()
  @IsString()
  venueAddress?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsInt()
  budget?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsString()
  customerName?: string;
}

export class QueryRecruitmentDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsIn(['draft', 'private_recruiting', 'public_recruiting', 'filled', 'expired', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsIn(SHOOTING_TYPES)
  shootingType?: string;

  @IsOptional()
  @IsIn(['private', 'public'])
  phase?: string;

  @IsOptional()
  @IsIn(['normal', 'urgent', 'emergency'])
  urgencyLevel?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  /** 공개 구인방 전용: public_recruiting 상태만 조회 */
  @IsOptional()
  @IsString()
  publicOnly?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn(['latest', 'deadline', 'budget_high', 'budget_low'])
  sort?: string;
}

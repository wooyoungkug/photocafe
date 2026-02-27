import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitReviewDto {
  @ApiProperty({ description: '신뢰도 점수 (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  trustScore: number;

  @ApiProperty({ description: '친절도 점수 (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  kindnessScore: number;

  @ApiPropertyOptional({ description: '기술력 점수 (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  skillScore?: number;

  @ApiPropertyOptional({ description: '코멘트' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: '리뷰어 이름' })
  @IsOptional()
  @IsString()
  reviewerName?: string;

  @ApiPropertyOptional({
    description: '리뷰어 유형',
    enum: ['bride', 'groom', 'parent'],
  })
  @IsOptional()
  @IsIn(['bride', 'groom', 'parent'])
  reviewerType?: string;
}

export class QueryReviewDto {
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

  @ApiPropertyOptional({ description: '작가 ID' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional({ description: '시작일 필터' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일 필터' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '완료 여부 필터' })
  @IsOptional()
  @Type(() => Boolean)
  isCompleted?: boolean;
}

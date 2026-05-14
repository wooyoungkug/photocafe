import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SubmitBidReviewDto {
  @ApiPropertyOptional({ description: '리뷰어 이름 (예: 홍길동 신랑)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  reviewerName?: string;

  @ApiPropertyOptional({ description: '좋아요 여부', default: true })
  @IsOptional()
  @IsBoolean()
  liked?: boolean;

  @ApiPropertyOptional({ description: '별점 1~5 (선택)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: '코멘트 (최대 500자)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

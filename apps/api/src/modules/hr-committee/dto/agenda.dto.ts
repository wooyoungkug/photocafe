import { IsString, IsOptional, IsEnum, IsInt, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateAgendaDto {
  @ApiProperty({ description: '위원회 ID' })
  @IsString()
  committeeId: string;

  @ApiProperty({ description: '안건 유형', enum: ['REWARD', 'PENALTY', 'PROMOTION', 'TRANSFER', 'DISMISSAL', 'OTHER'] })
  @IsEnum(['REWARD', 'PENALTY', 'PROMOTION', 'TRANSFER', 'DISMISSAL', 'OTHER'])
  type: 'REWARD' | 'PENALTY' | 'PROMOTION' | 'TRANSFER' | 'DISMISSAL' | 'OTHER';

  @ApiProperty({ description: '안건 제목' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '안건 내용' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '대상 직원 ID' })
  @IsOptional()
  @IsString()
  targetStaffId?: string;

  @ApiPropertyOptional({ description: '증빙/첨부' })
  @IsOptional()
  @IsString()
  evidence?: string;
}

export class AgendaQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ description: '위원회 ID' })
  @IsOptional()
  @IsString()
  committeeId?: string;

  @ApiPropertyOptional({ description: '안건 상태', enum: ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'VOTED', 'CLOSED'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'VOTED', 'CLOSED'])
  status?: 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'VOTED' | 'CLOSED';

  @ApiPropertyOptional({ description: '안건 유형', enum: ['REWARD', 'PENALTY', 'PROMOTION', 'TRANSFER', 'DISMISSAL', 'OTHER'] })
  @IsOptional()
  @IsEnum(['REWARD', 'PENALTY', 'PROMOTION', 'TRANSFER', 'DISMISSAL', 'OTHER'])
  type?: 'REWARD' | 'PENALTY' | 'PROMOTION' | 'TRANSFER' | 'DISMISSAL' | 'OTHER';
}

export class UpdateAgendaStatusDto {
  @ApiProperty({ description: '변경할 상태', enum: ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'VOTED', 'CLOSED'] })
  @IsEnum(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'VOTED', 'CLOSED'])
  status: 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'VOTED' | 'CLOSED';
}

export class CastVoteDto {
  @ApiProperty({ description: '투표', enum: ['APPROVE', 'REJECT', 'ABSTAIN'] })
  @IsEnum(['APPROVE', 'REJECT', 'ABSTAIN'])
  vote: 'APPROVE' | 'REJECT' | 'ABSTAIN';

  @ApiPropertyOptional({ description: '투표 의견' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class MakeDecisionDto {
  @ApiProperty({ description: '결정', enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: '결정 요약' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: '효력 발생일' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}

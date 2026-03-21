import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCommitteeDto {
  @ApiProperty({ description: '위원회명' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCommitteeDto {
  @ApiPropertyOptional({ description: '위원회명' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '상태', enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

export class AddMemberDto {
  @ApiProperty({ description: '직원 ID' })
  @IsString()
  staffId: string;

  @ApiPropertyOptional({ description: '역할', enum: ['CHAIRMAN', 'MEMBER'], default: 'MEMBER' })
  @IsOptional()
  @IsEnum(['CHAIRMAN', 'MEMBER'])
  role?: 'CHAIRMAN' | 'MEMBER';
}

export class CommitteeQueryDto {
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

  @ApiPropertyOptional({ description: '검색어' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '상태', enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

import { IsString, IsOptional, IsEnum, IsInt, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDisciplineRecordDto {
  @ApiProperty({ description: '대상 직원 ID' })
  @IsString()
  staffId: string;

  @ApiPropertyOptional({ description: '연관 안건 ID' })
  @IsOptional()
  @IsString()
  agendaId?: string;

  @ApiProperty({ description: '유형', enum: ['REWARD', 'PENALTY'] })
  @IsEnum(['REWARD', 'PENALTY'])
  type: 'REWARD' | 'PENALTY';

  @ApiProperty({ description: '세부분류 (표창, 경고, 감봉 등)' })
  @IsString()
  category: string;

  @ApiProperty({ description: '제목' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '상세내용' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '효력일' })
  @IsDateString()
  effectiveDate: string;
}

export class DisciplineQueryDto {
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

  @ApiPropertyOptional({ description: '직원 ID' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional({ description: '유형', enum: ['REWARD', 'PENALTY'] })
  @IsOptional()
  @IsEnum(['REWARD', 'PENALTY'])
  type?: 'REWARD' | 'PENALTY';
}

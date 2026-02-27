import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: '엔티티 유형 (staff, department, team)' })
  @IsString()
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({ description: '액션 (create, update, delete, status_change, password_reset, bulk_import)' })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ description: '수행자 Staff ID' })
  @IsString()
  @IsOptional()
  performedBy?: string;

  @ApiPropertyOptional({ description: '시작일' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

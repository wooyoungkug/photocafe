import { IsString, IsOptional, IsIn, IsBoolean, IsInt, Min, IsIP, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSuspiciousIpDto {
  @ApiProperty({ description: 'IP 주소 (IPv4 또는 IPv6)' })
  @IsIP()
  ip: string;

  @ApiPropertyOptional({ description: '등록 사유' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '조치 (block | monitor)', default: 'monitor' })
  @IsOptional()
  @IsIn(['block', 'monitor'])
  action?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({ description: '등록 당시 방문 수' })
  @IsOptional()
  @IsInt()
  @Min(0)
  visitCount?: number;
}

export class UpdateSuspiciousIpDto {
  @ApiPropertyOptional({ description: '조치 (block | monitor)' })
  @IsOptional()
  @IsIn(['block', 'monitor'])
  action?: string;

  @ApiPropertyOptional({ description: '등록 사유' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SuspiciousIpQueryDto {
  @ApiPropertyOptional({ description: '조치 필터 (block | monitor)' })
  @IsOptional()
  @IsIn(['block', 'monitor'])
  action?: string;

  @ApiPropertyOptional({ description: 'IP 검색어' })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  search?: string;
}

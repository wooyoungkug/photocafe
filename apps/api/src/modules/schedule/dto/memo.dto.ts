import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateMemoDto {
  @ApiPropertyOptional({ description: '메모 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '메모 내용' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '메모 색상' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '개인 메모 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isPersonal?: boolean;

  @ApiPropertyOptional({ description: '부서 메모 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isDepartment?: boolean;

  @ApiPropertyOptional({ description: '전체 메모 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isCompany?: boolean;
}

export class UpdateMemoDto {
  @ApiPropertyOptional({ description: '메모 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '메모 내용' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '메모 색상' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '개인 메모 여부' })
  @IsOptional()
  @IsBoolean()
  isPersonal?: boolean;

  @ApiPropertyOptional({ description: '부서 메모 여부' })
  @IsOptional()
  @IsBoolean()
  isDepartment?: boolean;

  @ApiPropertyOptional({ description: '전체 메모 여부' })
  @IsOptional()
  @IsBoolean()
  isCompany?: boolean;

  @ApiPropertyOptional({ description: '고정 여부' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

export class QueryMemoDto {
  @ApiPropertyOptional({ description: '범위 필터', enum: ['personal', 'department', 'company', 'all'] })
  @IsOptional()
  @IsIn(['personal', 'department', 'company', 'all'])
  scope?: string;

  @ApiPropertyOptional({ description: '검색어' })
  @IsOptional()
  @IsString()
  search?: string;
}

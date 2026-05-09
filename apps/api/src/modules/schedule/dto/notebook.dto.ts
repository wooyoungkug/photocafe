import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsInt } from 'class-validator';

export class CreateNotebookDto {
  @ApiProperty({ description: '노트북 이름' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: '색상 (hex)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '아이콘 (이모지/lucide 이름)' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: '상위 노트북 ID' })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({ description: '공개 범위', enum: ['personal', 'department', 'all'] })
  @IsOptional()
  @IsIn(['personal', 'department', 'all'])
  scope?: 'personal' | 'department' | 'all';

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateNotebookDto {
  @ApiPropertyOptional({ description: '노트북 이름' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '색상 (hex)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '아이콘' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: '상위 노트북 ID (null 입력 시 최상위로 이동)' })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({ description: '공개 범위' })
  @IsOptional()
  @IsIn(['personal', 'department', 'all'])
  scope?: 'personal' | 'department' | 'all';

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

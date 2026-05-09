import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsIn, IsArray } from 'class-validator';

export class CreateNoteDto {
  @ApiPropertyOptional({ description: '노트 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '노트 내용' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: "본문 형식 ('text' | 'html')", enum: ['text', 'html'] })
  @IsOptional()
  @IsIn(['text', 'html'])
  contentFormat?: 'text' | 'html';

  @ApiPropertyOptional({ description: '소속 노트북 ID' })
  @IsOptional()
  @IsString()
  notebookId?: string | null;

  @ApiPropertyOptional({ description: '노트 색상' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '개인 노트 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isPersonal?: boolean;

  @ApiPropertyOptional({ description: '부서 노트 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isDepartment?: boolean;

  @ApiPropertyOptional({ description: '전체 노트 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isCompany?: boolean;

  @ApiPropertyOptional({ description: '태그 ID 목록', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}

export class UpdateNoteDto {
  @ApiPropertyOptional({ description: '노트 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '노트 내용' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: "본문 형식 ('text' | 'html')", enum: ['text', 'html'] })
  @IsOptional()
  @IsIn(['text', 'html'])
  contentFormat?: 'text' | 'html';

  @ApiPropertyOptional({ description: '소속 노트북 ID (null 입력 시 분류 해제)' })
  @IsOptional()
  @IsString()
  notebookId?: string | null;

  @ApiPropertyOptional({ description: 'AI 요약(캐시)' })
  @IsOptional()
  @IsString()
  summary?: string | null;

  @ApiPropertyOptional({ description: '노트 색상' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '개인 노트 여부' })
  @IsOptional()
  @IsBoolean()
  isPersonal?: boolean;

  @ApiPropertyOptional({ description: '부서 노트 여부' })
  @IsOptional()
  @IsBoolean()
  isDepartment?: boolean;

  @ApiPropertyOptional({ description: '전체 노트 여부' })
  @IsOptional()
  @IsBoolean()
  isCompany?: boolean;

  @ApiPropertyOptional({ description: '고정 여부' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: '태그 ID 목록 (전체 교체)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}

export class QueryNoteDto {
  @ApiPropertyOptional({ description: '범위 필터', enum: ['personal', 'department', 'company', 'all'] })
  @IsOptional()
  @IsIn(['personal', 'department', 'company', 'all'])
  scope?: string;

  @ApiPropertyOptional({ description: '검색어' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '노트북 ID 필터 (uncategorized: 미분류만)' })
  @IsOptional()
  @IsString()
  notebookId?: string;

  @ApiPropertyOptional({ description: '태그 ID 필터' })
  @IsOptional()
  @IsString()
  tagId?: string;
}

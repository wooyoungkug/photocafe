import { IsString, IsOptional, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QueryDatabaseDto {
  @ApiProperty({ description: 'Notion 데이터베이스 ID' })
  @IsString()
  databaseId: string;

  @ApiPropertyOptional({ description: '필터 조건' })
  @IsOptional()
  @IsObject()
  filter?: Record<string, any>;

  @ApiPropertyOptional({ description: '정렬 조건' })
  @IsOptional()
  @IsArray()
  sorts?: Array<{
    property: string;
    direction: 'ascending' | 'descending';
  }>;

  @ApiPropertyOptional({ description: '페이지 크기' })
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ description: '시작 커서' })
  @IsOptional()
  @IsString()
  startCursor?: string;
}

export class CreatePageDto {
  @ApiProperty({ description: '부모 데이터베이스 ID' })
  @IsString()
  databaseId: string;

  @ApiProperty({ description: '페이지 속성' })
  @IsObject()
  properties: Record<string, any>;

  @ApiPropertyOptional({ description: '페이지 본문 블록' })
  @IsOptional()
  @IsArray()
  children?: any[];
}

export class UpdatePageDto {
  @ApiProperty({ description: '페이지 ID' })
  @IsString()
  pageId: string;

  @ApiProperty({ description: '업데이트할 속성' })
  @IsObject()
  properties: Record<string, any>;
}

export class GetPageDto {
  @ApiProperty({ description: '페이지 ID' })
  @IsString()
  pageId: string;
}

export class NotionDatabaseResponseDto {
  @ApiProperty()
  results: any[];

  @ApiProperty()
  hasMore: boolean;

  @ApiPropertyOptional()
  nextCursor?: string;
}

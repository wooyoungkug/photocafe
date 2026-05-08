import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseQuotationFileDto {
  @ApiProperty({ description: '파일명' })
  @IsString()
  name: string;

  @ApiProperty({ description: '파일 URL (서버 상대 경로)' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: 'MIME 타입' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: '파일 크기 (bytes)' })
  @IsOptional()
  @IsInt()
  size?: number;
}

export class CreatePurchaseQuotationDto {
  @ApiProperty({ description: '매입처명', example: '서울지업사' })
  @IsString()
  vendorName: string;

  @ApiProperty({ description: '받은날짜 (ISO 8601)', example: '2026-05-08' })
  @IsDateString()
  receivedAt: string;

  @ApiPropertyOptional({ description: '담당자' })
  @IsOptional()
  @IsString()
  manager?: string;

  @ApiPropertyOptional({ description: '관련부서' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: '제목/내용' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: '첨부파일 목록',
    type: [PurchaseQuotationFileDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseQuotationFileDto)
  files?: PurchaseQuotationFileDto[];
}

export class UpdatePurchaseQuotationDto extends PartialType(
  CreatePurchaseQuotationDto,
) {}

export class PurchaseQuotationQueryDto {
  @ApiPropertyOptional({ description: '페이지 (1부터)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지당 개수', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: '검색어 (매입처명/담당자/부서/제목)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '시작일 (받은날짜 기준)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일 (받은날짜 기준)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreatePublicCopperPlateDto {
  @ApiProperty({ description: '동판명' })
  @IsString()
  plateName: string;

  @ApiPropertyOptional({ description: '동판 코드' })
  @IsOptional()
  @IsString()
  plateCode?: string;

  @ApiPropertyOptional({ description: '동판 타입', enum: ['copper', 'soft'] })
  @IsOptional()
  @IsIn(['copper', 'soft'])
  plateType?: string;

  @ApiPropertyOptional({ description: '가로 (mm)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  widthMm?: number;

  @ApiPropertyOptional({ description: '세로 (mm)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  heightMm?: number;

  @ApiPropertyOptional({ description: '보관 위치' })
  @IsOptional()
  @IsString()
  storageLocation?: string;

  @ApiPropertyOptional({ description: '동판 이미지 URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'AI 파일 URL' })
  @IsOptional()
  @IsString()
  aiFileUrl?: string;

  @ApiPropertyOptional({ description: '디자인 파일 URL' })
  @IsOptional()
  @IsString()
  designFileUrl?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '기본 각인문구' })
  @IsOptional()
  @IsString()
  defaultEngravingText?: string;

  @ApiPropertyOptional({ description: '상태', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdatePublicCopperPlateDto extends PartialType(CreatePublicCopperPlateDto) {}

export class PublicCopperPlateQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 항목 수', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: '검색어' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '상태' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '동판 타입' })
  @IsOptional()
  @IsString()
  plateType?: string;
}

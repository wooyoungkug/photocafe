import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreatePaperManufacturerDto {
  @ApiPropertyOptional({ description: '제지사 코드 (자동생성)', example: 'SHINHO' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: '제지사명', example: '신호제지' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '국가', example: '한국' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: '웹사이트' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: '연락처 정보' })
  @IsOptional()
  @IsString()
  contactInfo?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성화 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePaperManufacturerDto extends PartialType(CreatePaperManufacturerDto) { }

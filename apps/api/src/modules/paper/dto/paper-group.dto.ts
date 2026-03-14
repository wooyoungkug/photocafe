import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaperGroupDto {
  @ApiPropertyOptional({ description: '그룹 코드 (자동생성)', example: 'GRP001' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: '그룹명', example: '스노우지' })
  @IsString()
  name: string;

  @ApiProperty({ description: '색상 (그룹 구분용)', example: '#4A90D9' })
  @IsString()
  color: string;

  @ApiPropertyOptional({ description: '기본 단가', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  basePrice?: number;

  @ApiPropertyOptional({ description: '단가 단위', default: 'ream' })
  @IsOptional()
  @IsString()
  unitType?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성화 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePaperGroupDto extends PartialType(CreatePaperGroupDto) {}

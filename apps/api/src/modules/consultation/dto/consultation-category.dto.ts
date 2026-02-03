import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';

export class CreateConsultationCategoryDto {
  @ApiProperty({ description: '분류 코드', example: 'claim_quality' })
  @IsString()
  code: string;

  @ApiProperty({ description: '분류명', example: '품질 클레임' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '분류 설명', example: '품질 관련 클레임' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '색상 코드', example: 'red' })
  @IsString()
  @IsOptional()
  colorCode?: string;

  @ApiPropertyOptional({ description: '정렬 순서', example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 여부', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateConsultationCategoryDto {
  @ApiPropertyOptional({ description: '분류 코드', example: 'claim_quality' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: '분류명', example: '품질 클레임' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '분류 설명', example: '품질 관련 클레임' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '색상 코드', example: 'red' })
  @IsString()
  @IsOptional()
  colorCode?: string;

  @ApiPropertyOptional({ description: '정렬 순서', example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 여부', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

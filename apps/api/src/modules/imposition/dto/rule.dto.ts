import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateRuleDto {
  @ApiPropertyOptional({ description: "'A4'|'A5'|'A6'|'B5'|'210x297' 등. null=any" })
  @IsOptional()
  @IsString()
  productSize?: string | null;

  @ApiPropertyOptional({
    enum: ['compressed', 'tack', 'perfect', 'flat'],
    description: 'null=any',
  })
  @IsOptional()
  @IsIn(['compressed', 'tack', 'perfect', 'flat'])
  bindingType?: string | null;

  @ApiPropertyOptional({ description: '페이지수 최소(포함)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minPages?: number | null;

  @ApiPropertyOptional({ description: '페이지수 최대(포함)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxPages?: number | null;

  @ApiPropertyOptional({ default: 0, description: '큰 값 우선' })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiProperty({ description: '매칭 시 적용할 프리셋 ID' })
  @IsString()
  presetId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRuleDto extends PartialType(CreateRuleDto) {}

export class MatchImpositionDto {
  @ApiPropertyOptional({ description: "'A4'|'A5'|'A6'|'B5' 등" })
  @IsOptional()
  @IsString()
  productSize?: string;

  @ApiPropertyOptional({ enum: ['compressed', 'tack', 'perfect', 'flat'] })
  @IsOptional()
  @IsIn(['compressed', 'tack', 'perfect', 'flat'])
  bindingType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  pageCount?: number;
}

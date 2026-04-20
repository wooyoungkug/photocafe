import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePresetDto {
  @ApiProperty({ description: '프리셋 이름', example: '압축앨범 A4 기본' })
  @IsString()
  name!: string;

  @ApiProperty({
    description: '제본방식',
    enum: ['compressed', 'tack', 'perfect', 'flat'],
  })
  @IsIn(['compressed', 'tack', 'perfect', 'flat'])
  bindingType!: string;

  @ApiProperty({ description: '시트 너비 (mm)', example: 330 })
  @IsNumber()
  @Min(1)
  sheetWidth!: number;

  @ApiProperty({ description: '시트 높이 (mm)', example: 482 })
  @IsNumber()
  @Min(1)
  sheetHeight!: number;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsNumber()
  marginTop?: number;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsNumber()
  marginRight?: number;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsNumber()
  marginBottom?: number;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsNumber()
  marginLeft?: number;

  @ApiPropertyOptional({ description: '압축앨범 오시폭 (mm)', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  creaseWidth?: number;

  @ApiPropertyOptional({ description: '타카 여백 (mm)', example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(20)
  tackMargin?: number;

  @ApiPropertyOptional({ enum: ['left', 'right', 'top', 'bottom'] })
  @IsOptional()
  @IsIn(['left', 'right', 'top', 'bottom'])
  tackEdge?: string;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gutter?: number;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bleed?: number;

  @ApiPropertyOptional({ enum: ['short', 'long'], default: 'short' })
  @IsOptional()
  @IsIn(['short', 'long'])
  grainDirection?: string;

  @ApiPropertyOptional({ enum: ['0', '90', 'auto'], default: 'auto' })
  @IsOptional()
  @IsIn(['0', '90', 'auto'])
  rotationPolicy?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;
}

export class UpdatePresetDto extends PartialType(CreatePresetDto) {}

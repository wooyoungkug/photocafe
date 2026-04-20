import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsIn, Min, Max } from 'class-validator';

/**
 * 임포지션 계산(시뮬레이션) 요청 DTO
 * - 미저장 프리뷰 용도
 */
export class CalculateImpositionDto {
  @ApiProperty({ description: '제품 너비 (mm)', example: 210 })
  @IsNumber()
  @Min(1)
  productWidth!: number;

  @ApiProperty({ description: '제품 높이 (mm)', example: 297 })
  @IsNumber()
  @Min(1)
  productHeight!: number;

  @ApiProperty({ description: '총 페이지 수', example: 40 })
  @IsNumber()
  @Min(1)
  pageCount!: number;

  @ApiProperty({
    description: '제본방식',
    enum: ['compressed', 'tack', 'perfect', 'flat'],
    example: 'compressed',
  })
  @IsString()
  @IsIn(['compressed', 'tack', 'perfect', 'flat'])
  bindingType!: string;

  @ApiPropertyOptional({ description: '시트 너비 (mm). 기본 7900=330', example: 330 })
  @IsOptional()
  @IsNumber()
  sheetWidth?: number;

  @ApiPropertyOptional({ description: '시트 높이 (mm). 기본 7900=482', example: 482 })
  @IsOptional()
  @IsNumber()
  sheetHeight?: number;

  @ApiPropertyOptional({ description: '여백 상 (mm)', example: 5 })
  @IsOptional()
  @IsNumber()
  marginTop?: number;

  @ApiPropertyOptional({ description: '여백 우 (mm)', example: 5 })
  @IsOptional()
  @IsNumber()
  marginRight?: number;

  @ApiPropertyOptional({ description: '여백 하 (mm)', example: 5 })
  @IsOptional()
  @IsNumber()
  marginBottom?: number;

  @ApiPropertyOptional({ description: '여백 좌 (mm)', example: 5 })
  @IsOptional()
  @IsNumber()
  marginLeft?: number;

  @ApiPropertyOptional({ description: 'Bleed (재단여백) mm', example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bleed?: number;

  @ApiPropertyOptional({ description: 'Gutter (셀간격) mm', example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gutter?: number;

  @ApiPropertyOptional({ description: '압축앨범 오시 폭 mm', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  creaseWidth?: number;

  @ApiPropertyOptional({ description: '타카 여백 mm (8~20)', example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(20)
  tackMargin?: number;

  @ApiPropertyOptional({
    description: '타카 위치',
    enum: ['left', 'right', 'top', 'bottom'],
    example: 'left',
  })
  @IsOptional()
  @IsIn(['left', 'right', 'top', 'bottom'])
  tackEdge?: string;

  @ApiPropertyOptional({
    description: '회전 정책',
    enum: ['0', '90', 'auto'],
    example: 'auto',
  })
  @IsOptional()
  @IsIn(['0', '90', 'auto'])
  rotationPolicy?: string;

  @ApiPropertyOptional({
    description: 'Grain 방향',
    enum: ['short', 'long'],
    example: 'short',
  })
  @IsOptional()
  @IsIn(['short', 'long'])
  grainDirection?: string;

  @ApiPropertyOptional({ description: '수동 Nup 강제값 (0 또는 미지정시 자동)', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  manualNup?: number;
}

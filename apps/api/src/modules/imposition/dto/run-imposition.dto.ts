import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

/**
 * 주문 항목에 대해 JDF + 임포지션 PDF 산출 요청
 * - presetId 또는 inline 오버라이드 중 하나
 */
export class RunImpositionDto {
  @ApiProperty({ description: '사용할 프리셋 ID', example: 'clxxxx...' })
  @IsString()
  presetId!: string;

  @ApiPropertyOptional({ description: '수동 Nup 강제값. 0이면 auto', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  manualNup?: number;

  @ApiPropertyOptional({ description: '원본 PDF 경로 override (기본은 OrderItem.pdfPath)' })
  @IsOptional()
  @IsString()
  sourcePdfPath?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean, Min, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ImpositionMarksDto {
  @ApiPropertyOptional({ description: '재단선 표시 (default: true)' })
  @IsOptional()
  @IsBoolean()
  crop?: boolean;

  @ApiPropertyOptional({ description: '블리드 경계선 표시 (default: true)' })
  @IsOptional()
  @IsBoolean()
  bleed?: boolean;

  @ApiPropertyOptional({ description: '레지스트레이션 마크 표시 (default: true)' })
  @IsOptional()
  @IsBoolean()
  registration?: boolean;

  @ApiPropertyOptional({ description: '컬러바 표시 (default: true)' })
  @IsOptional()
  @IsBoolean()
  colorBar?: boolean;

  @ApiPropertyOptional({ description: 'JobID/스튜디오명 표시 (default: true)' })
  @IsOptional()
  @IsBoolean()
  jobMeta?: boolean;
}

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

  @ApiPropertyOptional({ description: '이미지 임포지션 PDF 생성 여부 (기본 true). OrderItem.files JPG를 배치한 인쇄용 PDF를 함께 생성한다.' })
  @IsOptional()
  @IsBoolean()
  generateImagePdf?: boolean;

  @ApiPropertyOptional({ description: '마크 표시 옵션 (crop/bleed/registration/colorBar/jobMeta)', type: ImpositionMarksDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ImpositionMarksDto)
  marks?: ImpositionMarksDto;
}

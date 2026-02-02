import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, IsNumber, IsArray, Min } from 'class-validator';

// ==================== ColorIntent ====================

export class CreateColorIntentDto {
  @ApiProperty({ description: '색상 의도 코드', example: 'CI-4C-2S' })
  @IsString()
  code: string;

  @ApiProperty({ description: '이름', example: '4도 양면' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '앞면 색상 수', default: 4 })
  @IsOptional()
  @IsInt()
  @Min(0)
  numColorsFront?: number;

  @ApiPropertyOptional({ description: '뒷면 색상 수', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  numColorsBack?: number;

  @ApiPropertyOptional({ description: '색상 유형', default: 'Process' })
  @IsOptional()
  @IsString()
  colorType?: string;

  @ApiPropertyOptional({ description: '색상 순서', default: [] })
  @IsOptional()
  @IsArray()
  colorantOrder?: string[];

  @ApiPropertyOptional({ description: '앞면 코팅' })
  @IsOptional()
  @IsString()
  coatingFront?: string;

  @ApiPropertyOptional({ description: '뒷면 코팅' })
  @IsOptional()
  @IsString()
  coatingBack?: string;

  @ApiPropertyOptional({ description: '색상 표준', default: 'FOGRA39' })
  @IsOptional()
  @IsString()
  colorStandard?: string;

  @ApiPropertyOptional({ description: '인쇄 기술', default: 'DigitalPrinting' })
  @IsOptional()
  @IsString()
  printingTechnology?: string;

  @ApiPropertyOptional({ description: '한국어 표시명' })
  @IsOptional()
  @IsString()
  displayNameKo?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 상태', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateColorIntentDto extends PartialType(CreateColorIntentDto) {}

// ==================== BindingIntent ====================

export class CreateBindingIntentDto {
  @ApiProperty({ description: '제본 의도 코드', example: 'BI-SOFT' })
  @IsString()
  code: string;

  @ApiProperty({ description: '이름', example: '무선제본' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'JDF 제본 유형', default: 'SoftCover' })
  @IsOptional()
  @IsString()
  jdfBindingType?: string;

  @ApiPropertyOptional({ description: 'JDF 제본 위치', default: 'Left' })
  @IsOptional()
  @IsString()
  jdfBindingSide?: string;

  @ApiPropertyOptional({ description: '스파인 너비(mm)' })
  @IsOptional()
  @IsNumber()
  spineWidth?: number;

  @ApiPropertyOptional({ description: '한국어 표시명' })
  @IsOptional()
  @IsString()
  displayNameKo?: string;

  @ApiPropertyOptional({ description: '기본 가격', default: 0 })
  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 상태', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBindingIntentDto extends PartialType(CreateBindingIntentDto) {}

// ==================== FoldingIntent ====================

export class CreateFoldingIntentDto {
  @ApiProperty({ description: '접지 의도 코드', example: 'FI-F2' })
  @IsString()
  code: string;

  @ApiProperty({ description: '이름', example: '2단접지' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'JDF 접지 카탈로그' })
  @IsOptional()
  @IsString()
  jdfFoldCatalog?: string;

  @ApiPropertyOptional({ description: '접지 횟수', default: 1 })
  @IsOptional()
  @IsInt()
  foldCount?: number;

  @ApiPropertyOptional({ description: '한국어 표시명' })
  @IsOptional()
  @IsString()
  displayNameKo?: string;

  @ApiPropertyOptional({ description: '기본 가격', default: 0 })
  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 상태', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFoldingIntentDto extends PartialType(CreateFoldingIntentDto) {}

// ==================== ProofingIntent ====================

export class CreateProofingIntentDto {
  @ApiProperty({ description: '교정 의도 코드', example: 'PI-DIGITAL' })
  @IsString()
  code: string;

  @ApiProperty({ description: '이름', example: '디지털 교정' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'JDF 교정 유형' })
  @IsOptional()
  @IsString()
  jdfProofType?: string;

  @ApiPropertyOptional({ description: '컬러 교정 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isColorProof?: boolean;

  @ApiPropertyOptional({ description: '계약 교정 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isContractProof?: boolean;

  @ApiPropertyOptional({ description: '한국어 표시명' })
  @IsOptional()
  @IsString()
  displayNameKo?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 상태', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProofingIntentDto extends PartialType(CreateProofingIntentDto) {}

// ==================== FileSpec ====================

export class CreateFileSpecDto {
  @ApiProperty({ description: '파일 규격 코드', example: 'FS-INDIGO' })
  @IsString()
  code: string;

  @ApiProperty({ description: '이름', example: '인디고 출력용' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'MIME 유형', default: 'application/pdf' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'X 해상도', default: 300 })
  @IsOptional()
  @IsInt()
  resolutionX?: number;

  @ApiPropertyOptional({ description: 'Y 해상도', default: 300 })
  @IsOptional()
  @IsInt()
  resolutionY?: number;

  @ApiPropertyOptional({ description: '색상 공간', default: 'CMYK' })
  @IsOptional()
  @IsString()
  colorSpace?: string;

  @ApiPropertyOptional({ description: '한국어 표시명' })
  @IsOptional()
  @IsString()
  displayNameKo?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 상태', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFileSpecDto extends PartialType(CreateFileSpecDto) {}

// ==================== QualityControl ====================

export class CreateQualityControlDto {
  @ApiProperty({ description: '품질 기준 코드', example: 'QC-STD' })
  @IsString()
  code: string;

  @ApiProperty({ description: '이름', example: '표준품질' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Delta E 허용치' })
  @IsOptional()
  @IsNumber()
  deltaE?: number;

  @ApiPropertyOptional({ description: '색상 허용 범위' })
  @IsOptional()
  @IsString()
  colorTolerance?: string;

  @ApiPropertyOptional({ description: '재단 허용치(mm)', default: 0.5 })
  @IsOptional()
  @IsNumber()
  trimTolerance?: number;

  @ApiPropertyOptional({ description: '한국어 표시명' })
  @IsOptional()
  @IsString()
  displayNameKo?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 상태', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateQualityControlDto extends PartialType(CreateQualityControlDto) {}

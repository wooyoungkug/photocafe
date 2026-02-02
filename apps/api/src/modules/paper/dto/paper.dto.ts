import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsNumber, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// 용지 타입
export const PAPER_TYPE_OPTIONS = ['roll', 'sheet'] as const;
export type PaperType = typeof PAPER_TYPE_OPTIONS[number];

// 낱장 용지 규격
export const SHEET_SIZE_OPTIONS = ['국전지', '46전지', 'A3', 'A4', 'B4', 'B5', '8절', '16절', 'custom'] as const;
export type SheetSize = typeof SHEET_SIZE_OPTIONS[number];

// 롤 용지 폭
export const ROLL_WIDTH_OPTIONS = ['17"', '24"', '32"', '36"', '44"', '48"', '60"'] as const;
export type RollWidth = typeof ROLL_WIDTH_OPTIONS[number];

// 롤 용지 길이
export const ROLL_LENGTH_OPTIONS = ['30m', '40m', '50m', '100m'] as const;
export type RollLength = typeof ROLL_LENGTH_OPTIONS[number];

// 표면 질감
export const FINISH_OPTIONS = ['glossy', 'matte', 'lustre', 'canvas', 'satin', 'silk'] as const;
export type Finish = typeof FINISH_OPTIONS[number];

// 출력 방식
export const PRINT_METHOD_OPTIONS = ['indigo', 'inkjet', 'offset', 'both'] as const;
export type PrintMethod = typeof PRINT_METHOD_OPTIONS[number];

// 단가 단위
export const UNIT_TYPE_OPTIONS = ['sheet', 'roll', 'ream', 'sqm'] as const;
export type UnitType = typeof UNIT_TYPE_OPTIONS[number];

// ==================== CIP4 JDF MediaIntent 상수 ====================

// JDF MediaType (용지 매체 유형)
export const JDF_MEDIA_TYPE_OPTIONS = ['Paper', 'Transparency', 'Film', 'Plate', 'Vinyl', 'Label', 'Envelope', 'Cardboard'] as const;
export type JdfMediaType = typeof JDF_MEDIA_TYPE_OPTIONS[number];

// JDF MediaTypeDetails (용지 세부 유형)
export const JDF_MEDIA_TYPE_DETAILS_OPTIONS = [
  'Photographic', 'Bond', 'Cardstock', 'Coated', 'Uncoated',
  'Offset', 'Newsprint', 'NCR', 'Synthetic', 'Canvas', 'Fabric'
] as const;
export type JdfMediaTypeDetails = typeof JDF_MEDIA_TYPE_DETAILS_OPTIONS[number];

// JDF Coating (코팅)
export const JDF_COATING_OPTIONS = [
  'None', 'HighGloss', 'Glossy', 'SemiGloss', 'LightSatin',
  'Satin', 'Matte', 'Dull', 'Silk', 'Velvet', 'Pearl'
] as const;
export type JdfCoating = typeof JDF_COATING_OPTIONS[number];

// JDF Opacity (불투명도)
export const JDF_OPACITY_OPTIONS = ['Opaque', 'Translucent', 'Transparent'] as const;
export type JdfOpacity = typeof JDF_OPACITY_OPTIONS[number];

// JDF Texture (질감)
export const JDF_TEXTURE_OPTIONS = ['Smooth', 'Linen', 'Laid', 'Felt', 'Canvas', 'Wove', 'Vellum', 'Embossed'] as const;
export type JdfTexture = typeof JDF_TEXTURE_OPTIONS[number];

// JDF HoleType (펀치 구멍)
export const JDF_HOLE_TYPE_OPTIONS = ['None', 'R2-generic', 'R3-generic', 'R5-US', 'R7-generic', 'W3-generic'] as const;
export type JdfHoleType = typeof JDF_HOLE_TYPE_OPTIONS[number];

export class CreatePaperDto {
  @ApiPropertyOptional({ description: '용지 코드 (자동생성)', example: 'PAPER001' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: '용지명', example: '프리미엄 광택지' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '용지 그룹 ID' })
  @IsOptional()
  @IsString()
  paperGroupId?: string;

  @ApiPropertyOptional({ description: '제지사 ID' })
  @IsOptional()
  @IsString()
  manufacturerId?: string;

  @ApiPropertyOptional({ description: '용지대리점 ID' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({ description: '용지 구분', enum: PAPER_TYPE_OPTIONS, default: 'sheet' })
  @IsEnum(PAPER_TYPE_OPTIONS)
  paperType: PaperType;

  // 시트지 규격
  @ApiPropertyOptional({ description: '낱장 규격', enum: SHEET_SIZE_OPTIONS })
  @IsOptional()
  @IsString()
  sheetSize?: string;

  @ApiPropertyOptional({ description: '낱장 가로 (mm)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sheetWidthMm?: number;

  @ApiPropertyOptional({ description: '낱장 세로 (mm)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sheetHeightMm?: number;

  @ApiPropertyOptional({ description: '별사이즈 규격명 (custom 선택시)' })
  @IsOptional()
  @IsString()
  customSheetName?: string;

  // 롤지 규격
  @ApiPropertyOptional({ description: '롤 폭', enum: ROLL_WIDTH_OPTIONS })
  @IsOptional()
  @IsString()
  rollWidth?: string;

  @ApiPropertyOptional({ description: '롤 폭 (인치)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rollWidthInch?: number;

  @ApiPropertyOptional({ description: '롤 길이', enum: ROLL_LENGTH_OPTIONS })
  @IsOptional()
  @IsString()
  rollLength?: string;

  @ApiPropertyOptional({ description: '롤 길이 (미터)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rollLengthM?: number;

  // 평량
  @ApiPropertyOptional({ description: '평량 (g/m²)', example: 210 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  grammage?: number;

  @ApiPropertyOptional({ description: '평량 표시', example: '210g/m²' })
  @IsOptional()
  @IsString()
  grammageDisplay?: string;

  // 표면 질감
  @ApiPropertyOptional({ description: '표면 질감', enum: FINISH_OPTIONS })
  @IsOptional()
  @IsEnum(FINISH_OPTIONS)
  finish?: Finish;

  @ApiPropertyOptional({ description: '표면 질감 표시', example: 'Glossy(광택)' })
  @IsOptional()
  @IsString()
  finishDisplay?: string;

  // 출력 방식 (멀티 선택 가능)
  @ApiPropertyOptional({ description: '출력 방식 목록', type: [String], enum: PRINT_METHOD_OPTIONS })
  @IsOptional()
  @IsString({ each: true })
  printMethods?: PrintMethod[];

  // 색상
  @ApiPropertyOptional({ description: '색상 타입', example: 'white' })
  @IsOptional()
  @IsString()
  colorType?: string;

  @ApiPropertyOptional({ description: '용지 컬러그룹 (그룹핑용)', example: 'green', enum: ['green', 'blue', 'yellow', 'red', 'purple'] })
  @IsOptional()
  @IsString()
  colorGroup?: string;

  // 두께
  @ApiPropertyOptional({ description: '두께 (mm)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  thickness?: number;

  // 가격 정보
  @ApiPropertyOptional({ description: '기본 단가', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  basePrice?: number;

  @ApiPropertyOptional({ description: '단가 단위', enum: UNIT_TYPE_OPTIONS, default: 'sheet' })
  @IsOptional()
  @IsEnum(UNIT_TYPE_OPTIONS)
  unitType?: UnitType;

  // 할인 정보
  @ApiPropertyOptional({ description: '할인율 (%)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discountRate?: number;

  @ApiPropertyOptional({ description: '할인가' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discountPrice?: number;

  // 재고
  @ApiPropertyOptional({ description: '재고 수량', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stockQuantity?: number;

  @ApiPropertyOptional({ description: '최소 재고 수준', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minStockLevel?: number;

  // 추가 정보
  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '관리자 메모' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성화 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // ==================== CIP4 JDF MediaIntent 필드 ====================

  @ApiPropertyOptional({ description: 'JDF MediaType (용지 매체 유형)', enum: JDF_MEDIA_TYPE_OPTIONS, default: 'Paper' })
  @IsOptional()
  @IsString()
  jdfMediaType?: string;

  @ApiPropertyOptional({ description: 'JDF MediaTypeDetails (용지 세부 유형)', enum: JDF_MEDIA_TYPE_DETAILS_OPTIONS })
  @IsOptional()
  @IsString()
  jdfMediaTypeDetails?: string;

  @ApiPropertyOptional({ description: 'JDF FrontCoating (앞면 코팅)', enum: JDF_COATING_OPTIONS })
  @IsOptional()
  @IsString()
  jdfFrontCoating?: string;

  @ApiPropertyOptional({ description: 'JDF BackCoating (뒷면 코팅)', enum: JDF_COATING_OPTIONS })
  @IsOptional()
  @IsString()
  jdfBackCoating?: string;

  @ApiPropertyOptional({ description: 'JDF Opacity (불투명도)', enum: JDF_OPACITY_OPTIONS, default: 'Opaque' })
  @IsOptional()
  @IsString()
  jdfOpacity?: string;

  @ApiPropertyOptional({ description: 'JDF Texture (질감)', enum: JDF_TEXTURE_OPTIONS })
  @IsOptional()
  @IsString()
  jdfTexture?: string;

  @ApiPropertyOptional({ description: 'JDF Grade (용지 등급 1-5)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  jdfGrade?: number;

  @ApiPropertyOptional({ description: 'JDF PrePrinted (사전 인쇄 여부)', default: false })
  @IsOptional()
  @IsBoolean()
  jdfPrePrinted?: boolean;

  @ApiPropertyOptional({ description: 'JDF HoleType (펀치 구멍)', enum: JDF_HOLE_TYPE_OPTIONS })
  @IsOptional()
  @IsString()
  jdfHoleType?: string;
}

export class UpdatePaperDto extends PartialType(CreatePaperDto) { }

export class PaperQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ description: '검색어' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '용지 타입', enum: PAPER_TYPE_OPTIONS })
  @IsOptional()
  @IsEnum(PAPER_TYPE_OPTIONS)
  paperType?: PaperType;

  @ApiPropertyOptional({ description: '출력 방식 (쉼표로 구분된 값)', type: String })
  @IsOptional()
  @IsString()
  printMethods?: string;

  @ApiPropertyOptional({ description: '제지사 ID' })
  @IsOptional()
  @IsString()
  manufacturerId?: string;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}

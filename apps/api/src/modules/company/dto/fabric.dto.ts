import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 원단 분류
export enum FabricCategory {
  LEATHER = 'leather',       // 가죽
  CLOTH = 'cloth',           // 천
  VELVET = 'velvet',         // 벨벳
  SILK = 'silk',             // 실크
  LINEN = 'linen',           // 린넨
  CANVAS = 'canvas',         // 캔버스
  SYNTHETIC = 'synthetic',   // 합성
  OTHER = 'other',           // 기타
}

// 원단 재질
export enum FabricMaterial {
  GENUINE_LEATHER = 'genuine_leather',   // 천연가죽
  PU_LEATHER = 'pu_leather',             // PU가죽
  PVC_LEATHER = 'pvc_leather',           // PVC가죽
  COTTON = 'cotton',                     // 면
  POLYESTER = 'polyester',               // 폴리에스터
  NYLON = 'nylon',                       // 나일론
  WOOL = 'wool',                         // 울
  MIXED = 'mixed',                       // 혼방
  OTHER = 'other',                       // 기타
}

// 단위 타입
export enum FabricUnitType {
  M = 'm',         // 미터당
  ROLL = 'roll',   // 롤당
  YARD = 'yard',   // 야드당
}

export const FABRIC_CATEGORY_LABELS: Record<FabricCategory, string> = {
  [FabricCategory.LEATHER]: '가죽',
  [FabricCategory.CLOTH]: '천',
  [FabricCategory.VELVET]: '벨벳',
  [FabricCategory.SILK]: '실크',
  [FabricCategory.LINEN]: '린넨',
  [FabricCategory.CANVAS]: '캔버스',
  [FabricCategory.SYNTHETIC]: '합성',
  [FabricCategory.OTHER]: '기타',
};

export const FABRIC_MATERIAL_LABELS: Record<FabricMaterial, string> = {
  [FabricMaterial.GENUINE_LEATHER]: '천연가죽',
  [FabricMaterial.PU_LEATHER]: 'PU가죽',
  [FabricMaterial.PVC_LEATHER]: 'PVC가죽',
  [FabricMaterial.COTTON]: '면',
  [FabricMaterial.POLYESTER]: '폴리에스터',
  [FabricMaterial.NYLON]: '나일론',
  [FabricMaterial.WOOL]: '울',
  [FabricMaterial.MIXED]: '혼방',
  [FabricMaterial.OTHER]: '기타',
};

export const FABRIC_UNIT_LABELS: Record<FabricUnitType, string> = {
  [FabricUnitType.M]: '미터당',
  [FabricUnitType.ROLL]: '롤당',
  [FabricUnitType.YARD]: '야드당',
};

// 원단 공급업체 생성 DTO
export class CreateFabricSupplierDto {
  @ApiProperty({ description: '공급업체 코드' })
  @IsString()
  code: string;

  @ApiProperty({ description: '공급업체명' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '전화번호' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: '휴대폰' })
  @IsString()
  @IsOptional()
  mobile?: string;

  @ApiPropertyOptional({ description: '이메일' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: '팩스' })
  @IsString()
  @IsOptional()
  fax?: string;

  @ApiPropertyOptional({ description: '우편번호' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ description: '주소' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: '상세주소' })
  @IsString()
  @IsOptional()
  addressDetail?: string;

  @ApiPropertyOptional({ description: '담당자명' })
  @IsString()
  @IsOptional()
  representative?: string;

  @ApiPropertyOptional({ description: '웹사이트' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '관리자 메모' })
  @IsString()
  @IsOptional()
  memo?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// 원단 공급업체 수정 DTO
export class UpdateFabricSupplierDto {
  @ApiPropertyOptional({ description: '공급업체 코드' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: '공급업체명' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '전화번호' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: '휴대폰' })
  @IsString()
  @IsOptional()
  mobile?: string;

  @ApiPropertyOptional({ description: '이메일' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: '팩스' })
  @IsString()
  @IsOptional()
  fax?: string;

  @ApiPropertyOptional({ description: '우편번호' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ description: '주소' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: '상세주소' })
  @IsString()
  @IsOptional()
  addressDetail?: string;

  @ApiPropertyOptional({ description: '담당자명' })
  @IsString()
  @IsOptional()
  representative?: string;

  @ApiPropertyOptional({ description: '웹사이트' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '관리자 메모' })
  @IsString()
  @IsOptional()
  memo?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// 원단 생성 DTO
export class CreateFabricDto {
  @ApiProperty({ description: '원단 코드' })
  @IsString()
  code: string;

  @ApiProperty({ description: '원단명' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '원단 분류', enum: FabricCategory, default: FabricCategory.CLOTH })
  @IsEnum(FabricCategory)
  @IsOptional()
  category?: FabricCategory;

  @ApiPropertyOptional({ description: '재질', enum: FabricMaterial, default: FabricMaterial.COTTON })
  @IsEnum(FabricMaterial)
  @IsOptional()
  material?: FabricMaterial;

  @ApiPropertyOptional({ description: '색상 코드' })
  @IsString()
  @IsOptional()
  colorCode?: string;

  @ApiPropertyOptional({ description: '색상명' })
  @IsString()
  @IsOptional()
  colorName?: string;

  @ApiPropertyOptional({ description: '폭 (cm)' })
  @IsNumber()
  @IsOptional()
  widthCm?: number;

  @ApiPropertyOptional({ description: '두께 (mm)' })
  @IsNumber()
  @IsOptional()
  thickness?: number;

  @ApiPropertyOptional({ description: '무게 (g/m²)' })
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ description: '공급업체 ID' })
  @IsString()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ description: '기본 단가' })
  @IsNumber()
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional({ description: '단위 타입', enum: FabricUnitType, default: FabricUnitType.M })
  @IsEnum(FabricUnitType)
  @IsOptional()
  unitType?: FabricUnitType;

  @ApiPropertyOptional({ description: '할인율 (%)' })
  @IsNumber()
  @IsOptional()
  discountRate?: number;

  @ApiPropertyOptional({ description: '할인가' })
  @IsNumber()
  @IsOptional()
  discountPrice?: number;

  @ApiPropertyOptional({ description: '재고 수량' })
  @IsNumber()
  @IsOptional()
  stockQuantity?: number;

  @ApiPropertyOptional({ description: '최소 재고 수준' })
  @IsNumber()
  @IsOptional()
  minStockLevel?: number;

  @ApiPropertyOptional({ description: '앨범 커버용' })
  @IsBoolean()
  @IsOptional()
  forAlbumCover?: boolean;

  @ApiPropertyOptional({ description: '박스 커버용' })
  @IsBoolean()
  @IsOptional()
  forBoxCover?: boolean;

  @ApiPropertyOptional({ description: '액자 커버용' })
  @IsBoolean()
  @IsOptional()
  forFrameCover?: boolean;

  @ApiPropertyOptional({ description: '기타 용도' })
  @IsBoolean()
  @IsOptional()
  forOther?: boolean;

  @ApiPropertyOptional({ description: '원단 이미지 URL' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: '썸네일 URL' })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '관리자 메모' })
  @IsString()
  @IsOptional()
  memo?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// 원단 수정 DTO
export class UpdateFabricDto {
  @ApiPropertyOptional({ description: '원단 코드' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: '원단명' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '원단 분류', enum: FabricCategory })
  @IsEnum(FabricCategory)
  @IsOptional()
  category?: FabricCategory;

  @ApiPropertyOptional({ description: '재질', enum: FabricMaterial })
  @IsEnum(FabricMaterial)
  @IsOptional()
  material?: FabricMaterial;

  @ApiPropertyOptional({ description: '색상 코드' })
  @IsString()
  @IsOptional()
  colorCode?: string;

  @ApiPropertyOptional({ description: '색상명' })
  @IsString()
  @IsOptional()
  colorName?: string;

  @ApiPropertyOptional({ description: '폭 (cm)' })
  @IsNumber()
  @IsOptional()
  widthCm?: number;

  @ApiPropertyOptional({ description: '두께 (mm)' })
  @IsNumber()
  @IsOptional()
  thickness?: number;

  @ApiPropertyOptional({ description: '무게 (g/m²)' })
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ description: '공급업체 ID' })
  @IsString()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ description: '기본 단가' })
  @IsNumber()
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional({ description: '단위 타입', enum: FabricUnitType })
  @IsEnum(FabricUnitType)
  @IsOptional()
  unitType?: FabricUnitType;

  @ApiPropertyOptional({ description: '할인율 (%)' })
  @IsNumber()
  @IsOptional()
  discountRate?: number;

  @ApiPropertyOptional({ description: '할인가' })
  @IsNumber()
  @IsOptional()
  discountPrice?: number;

  @ApiPropertyOptional({ description: '재고 수량' })
  @IsNumber()
  @IsOptional()
  stockQuantity?: number;

  @ApiPropertyOptional({ description: '최소 재고 수준' })
  @IsNumber()
  @IsOptional()
  minStockLevel?: number;

  @ApiPropertyOptional({ description: '앨범 커버용' })
  @IsBoolean()
  @IsOptional()
  forAlbumCover?: boolean;

  @ApiPropertyOptional({ description: '박스 커버용' })
  @IsBoolean()
  @IsOptional()
  forBoxCover?: boolean;

  @ApiPropertyOptional({ description: '액자 커버용' })
  @IsBoolean()
  @IsOptional()
  forFrameCover?: boolean;

  @ApiPropertyOptional({ description: '기타 용도' })
  @IsBoolean()
  @IsOptional()
  forOther?: boolean;

  @ApiPropertyOptional({ description: '원단 이미지 URL' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: '썸네일 URL' })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '관리자 메모' })
  @IsString()
  @IsOptional()
  memo?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

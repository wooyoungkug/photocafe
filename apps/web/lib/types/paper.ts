// 용지 타입
export type PaperType = 'roll' | 'sheet';

// 표면 질감
export type Finish = 'glossy' | 'matte' | 'lustre' | 'canvas' | 'satin' | 'silk';

// 출력 방식
export type PrintMethod = 'indigo' | 'inkjet' | 'offset' | 'both';

// 단가 단위
export type UnitType = 'sheet' | 'roll' | 'ream' | 'sqm';

// 용지대리점
export interface PaperSupplier {
  id: string;
  code: string;
  name: string;
  phone?: string;
  mobile?: string;
  email?: string;
  fax?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  representative?: string;
  website?: string;
  description?: string;
  memo?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    papers: number;
  };
}

// 제지사
export interface PaperManufacturer {
  id: string;
  code: string;
  name: string;
  country?: string;
  website?: string;
  contactInfo?: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    papers: number;
  };
}

// 용지
export interface Paper {
  id: string;
  code: string;
  name: string;
  manufacturerId?: string;
  manufacturer?: {
    id: string;
    name: string;
    code: string;
  };
  supplierId?: string;
  supplier?: {
    id: string;
    name: string;
    code: string;
  };
  paperType: PaperType;

  // 낱장지 규격
  sheetSize?: string;
  sheetWidthMm?: number;
  sheetHeightMm?: number;

  // 롤지 규격
  rollWidth?: string;
  rollWidthInch?: number;
  rollLength?: string;
  rollLengthM?: number;

  // 평량
  grammage?: number;
  grammageDisplay?: string;

  // 표면 질감
  finish?: Finish;
  finishDisplay?: string;

  // 출력 방식 (멀티 선택)
  printMethods?: PrintMethod[];

  // 색상
  colorType?: string;

  // 두께
  thickness?: number;

  // 가격 정보
  basePrice: number;
  unitType: UnitType;
  discountRate: number;
  discountPrice?: number;

  // 재고
  stockQuantity: number;
  minStockLevel: number;

  // 추가 정보
  description?: string;
  memo?: string;

  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 용지 생성 DTO
export interface CreatePaperDto {
  code?: string; // 자동 생성
  name: string;
  manufacturerId?: string;
  supplierId?: string;
  paperType: PaperType;
  sheetSize?: string;
  sheetWidthMm?: number;
  sheetHeightMm?: number;
  customSheetName?: string; // 별사이즈 규격명
  rollWidth?: string;
  rollWidthInch?: number;
  rollLength?: string;
  rollLengthM?: number;
  grammage?: number;
  grammageDisplay?: string;
  finish?: Finish;
  finishDisplay?: string;
  printMethods?: PrintMethod[];
  colorType?: string;
  thickness?: number;
  basePrice?: number;
  unitType?: UnitType;
  discountRate?: number;
  discountPrice?: number;
  stockQuantity?: number;
  minStockLevel?: number;
  description?: string;
  memo?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// 제지사 생성 DTO
export interface CreatePaperManufacturerDto {
  code?: string; // 자동 생성
  name: string;
  country?: string;
  website?: string;
  contactInfo?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// 용지대리점 생성 DTO
export interface CreatePaperSupplierDto {
  code?: string; // 자동 생성
  name: string;
  phone?: string;
  mobile?: string;
  email?: string;
  fax?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  representative?: string;
  website?: string;
  description?: string;
  memo?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// 옵션들
export const PAPER_TYPE_OPTIONS = [
  { value: 'sheet', label: '낱장지' },
  { value: 'roll', label: '롤지' },
];

export const SHEET_SIZE_OPTIONS = [
  { value: '국전지', label: '국전지 (788×1091mm)', width: 788, height: 1091 },
  { value: '46전지', label: '46전지 (788×545mm)', width: 788, height: 545 },
  { value: '인디고전용규격(국4절)', label: '인디고전용규격 국4절 (315×467mm)', width: 315, height: 467 },
  { value: 'A3', label: 'A3 (297×420mm)', width: 297, height: 420 },
  { value: 'A4', label: 'A4 (210×297mm)', width: 210, height: 297 },
  { value: 'B4', label: 'B4 (257×364mm)', width: 257, height: 364 },
  { value: 'B5', label: 'B5 (182×257mm)', width: 182, height: 257 },
  { value: '8절', label: '8절 (394×545mm)', width: 394, height: 545 },
  { value: '16절', label: '16절 (272×394mm)', width: 272, height: 394 },
  { value: 'custom', label: '별사이즈 (직접입력)', width: 0, height: 0 },
];

export const ROLL_WIDTH_OPTIONS = [
  { value: '17"', label: '17인치' },
  { value: '24"', label: '24인치' },
  { value: '32"', label: '32인치' },
  { value: '36"', label: '36인치' },
  { value: '44"', label: '44인치' },
  { value: '48"', label: '48인치' },
  { value: '60"', label: '60인치' },
];

export const ROLL_LENGTH_OPTIONS = [
  { value: '30m', label: '30m' },
  { value: '40m', label: '40m' },
  { value: '50m', label: '50m' },
  { value: '100m', label: '100m' },
];

export const FINISH_OPTIONS = [
  { value: 'glossy', label: 'Glossy (광택)' },
  { value: 'matte', label: 'Matte (무광)' },
  { value: 'lustre', label: 'Lustre (반광)' },
  { value: 'canvas', label: 'Canvas (캔버스)' },
  { value: 'satin', label: 'Satin (새틴)' },
  { value: 'silk', label: 'Silk (실크)' },
];

export const PRINT_METHOD_OPTIONS = [
  { value: 'indigo', label: '인디고출력' },
  { value: 'inkjet', label: '잉크젯출력' },
  { value: 'offset', label: '오프셋' },
  { value: 'both', label: '모두' },
];

export const UNIT_TYPE_OPTIONS = [
  { value: 'sheet', label: '장당 (per sheet)' },
  { value: 'roll', label: '롤당 (per roll)' },
  { value: 'ream', label: '연당 (per ream)' },
  { value: 'sqm', label: '㎡당 (per sqm)' },
];

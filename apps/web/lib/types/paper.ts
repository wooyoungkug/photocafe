// 용지 타입
export type PaperType = 'roll' | 'sheet';

// 표면 질감
export type Finish = 'glossy' | 'matte' | 'lustre' | 'canvas' | 'satin' | 'silk';

// 출력 방식
export type PrintMethod = 'indigo' | 'inkjet' | 'offset' | 'both';

// 단가 단위
export type UnitType = 'sheet' | 'roll' | 'ream' | 'sqm';

// 그룹 컬러
export type GroupColor = 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray';

// 용지 그룹
export interface PaperGroup {
  id: string;
  code: string;
  name: string;
  color: GroupColor;
  basePrice: number;
  unitType: UnitType;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    papers: number;
  };
}

// 용지 그룹 생성 DTO
export interface CreatePaperGroupDto {
  code?: string;
  name: string;
  color: GroupColor;
  basePrice?: number;
  unitType?: UnitType;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

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
  paperGroupId?: string;
  paperGroup?: {
    id: string;
    name: string;
    code: string;
    color: GroupColor;
    basePrice: number;
    unitType: UnitType;
  };
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

  // 시트지 규격
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
  colorGroup?: string; // 용지 그룹핑용 (green, blue, yellow, red 등)

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
  paperGroupId?: string;
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
  colorGroup?: string; // 용지 컬러그룹
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
  { value: 'sheet', label: '시트지' },
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

// 용지 컬러 그룹 옵션 (구버전 호환용)
export const COLOR_GROUP_OPTIONS = [
  { value: 'green', label: '🟢 광택지', color: 'bg-green-100 border-green-300 text-green-700' },
  { value: 'blue', label: '🔵 무광지', color: 'bg-blue-100 border-blue-300 text-blue-700' },
  { value: 'yellow', label: '🟡 특수지', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  { value: 'red', label: '🔴 프리미엄', color: 'bg-red-100 border-red-300 text-red-700' },
  { value: 'purple', label: '🟣 캔버스', color: 'bg-purple-100 border-purple-300 text-purple-700' },
];

// 그룹 컬러 옵션 (새 그룹 생성용)
export const GROUP_COLOR_OPTIONS: { value: GroupColor; label: string; color: string }[] = [
  { value: 'green', label: '녹색', color: 'bg-green-100 border-green-300 text-green-700' },
  { value: 'blue', label: '파랑', color: 'bg-blue-100 border-blue-300 text-blue-700' },
  { value: 'yellow', label: '노랑', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  { value: 'red', label: '빨강', color: 'bg-red-100 border-red-300 text-red-700' },
  { value: 'purple', label: '보라', color: 'bg-purple-100 border-purple-300 text-purple-700' },
  { value: 'orange', label: '주황', color: 'bg-orange-100 border-orange-300 text-orange-700' },
  { value: 'gray', label: '회색', color: 'bg-gray-100 border-gray-300 text-gray-700' },
];

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

// ==================== CIP4 JDF MediaIntent 타입 ====================

// JDF MediaType (용지 매체 유형)
export type JdfMediaType = 'Paper' | 'Transparency' | 'Film' | 'Plate' | 'Vinyl' | 'Label' | 'Envelope' | 'Cardboard';

// JDF MediaTypeDetails (용지 세부 유형)
export type JdfMediaTypeDetails = 'Photographic' | 'Bond' | 'Cardstock' | 'Coated' | 'Uncoated' |
  'Offset' | 'Newsprint' | 'NCR' | 'Synthetic' | 'Canvas' | 'Fabric';

// JDF Coating (코팅)
export type JdfCoating = 'None' | 'HighGloss' | 'Glossy' | 'SemiGloss' | 'LightSatin' |
  'Satin' | 'Matte' | 'Dull' | 'Silk' | 'Velvet' | 'Pearl';

// JDF Opacity (불투명도)
export type JdfOpacity = 'Opaque' | 'Translucent' | 'Transparent';

// JDF Texture (질감)
export type JdfTexture = 'Smooth' | 'Linen' | 'Laid' | 'Felt' | 'Canvas' | 'Wove' | 'Vellum' | 'Embossed';

// JDF HoleType (펀치 구멍)
export type JdfHoleType = 'None' | 'R2-generic' | 'R3-generic' | 'R5-US' | 'R7-generic' | 'W3-generic';

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

  // nUP 정보
  nUpIndigo?: number; // 인디고 nUP (자동계산)
  nUpInkjet?: number; // 잉크젯 nUP (수동입력)

  // ========== CIP4 JDF MediaIntent 필드 ==========
  jdfMediaType?: JdfMediaType;         // Paper, Transparency, Film, etc.
  jdfMediaTypeDetails?: JdfMediaTypeDetails; // Photographic, Bond, Coated, etc.
  jdfFrontCoating?: JdfCoating;        // 앞면 코팅
  jdfBackCoating?: JdfCoating;         // 뒷면 코팅
  jdfOpacity?: JdfOpacity;             // Opaque, Translucent, Transparent
  jdfTexture?: JdfTexture;             // Smooth, Linen, Laid, etc.
  jdfGrade?: number;                   // 용지 등급 (1-5)
  jdfPrePrinted?: boolean;             // 사전 인쇄 여부
  jdfHoleType?: JdfHoleType;           // 펀치 구멍

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
  nUpIndigo?: number; // 인디고 nUP (자동계산)
  nUpInkjet?: number; // 잉크젯 nUP (수동입력)
  sortOrder?: number;
  isActive?: boolean;

  // ========== CIP4 JDF MediaIntent 필드 ==========
  jdfMediaType?: JdfMediaType;
  jdfMediaTypeDetails?: JdfMediaTypeDetails;
  jdfFrontCoating?: JdfCoating;
  jdfBackCoating?: JdfCoating;
  jdfOpacity?: JdfOpacity;
  jdfTexture?: JdfTexture;
  jdfGrade?: number;
  jdfPrePrinted?: boolean;
  jdfHoleType?: JdfHoleType;
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

// ==================== CIP4 JDF MediaIntent 옵션 ====================

// JDF MediaType 옵션 (용지 매체 유형)
export const JDF_MEDIA_TYPE_OPTIONS = [
  { value: 'Paper', label: 'Paper (일반 용지)' },
  { value: 'Transparency', label: 'Transparency (투명 필름)' },
  { value: 'Film', label: 'Film (필름)' },
  { value: 'Plate', label: 'Plate (판재)' },
  { value: 'Vinyl', label: 'Vinyl (비닐)' },
  { value: 'Label', label: 'Label (라벨)' },
  { value: 'Envelope', label: 'Envelope (봉투)' },
  { value: 'Cardboard', label: 'Cardboard (골판지)' },
];

// JDF MediaTypeDetails 옵션 (용지 세부 유형)
export const JDF_MEDIA_TYPE_DETAILS_OPTIONS = [
  { value: 'Photographic', label: 'Photographic (인화지)' },
  { value: 'Bond', label: 'Bond (본드지)' },
  { value: 'Cardstock', label: 'Cardstock (카드지)' },
  { value: 'Coated', label: 'Coated (코팅지)' },
  { value: 'Uncoated', label: 'Uncoated (비코팅지)' },
  { value: 'Offset', label: 'Offset (오프셋지)' },
  { value: 'Newsprint', label: 'Newsprint (신문용지)' },
  { value: 'NCR', label: 'NCR (감압지)' },
  { value: 'Synthetic', label: 'Synthetic (합성지)' },
  { value: 'Canvas', label: 'Canvas (캔버스)' },
  { value: 'Fabric', label: 'Fabric (직물)' },
];

// JDF Coating 옵션 (코팅)
export const JDF_COATING_OPTIONS = [
  { value: 'None', label: 'None (무코팅)' },
  { value: 'HighGloss', label: 'HighGloss (고광택)' },
  { value: 'Glossy', label: 'Glossy (광택)' },
  { value: 'SemiGloss', label: 'SemiGloss (반광택)' },
  { value: 'LightSatin', label: 'LightSatin (라이트새틴)' },
  { value: 'Satin', label: 'Satin (새틴)' },
  { value: 'Matte', label: 'Matte (무광)' },
  { value: 'Dull', label: 'Dull (둔광)' },
  { value: 'Silk', label: 'Silk (실크)' },
  { value: 'Velvet', label: 'Velvet (벨벳)' },
  { value: 'Pearl', label: 'Pearl (펄)' },
];

// JDF Opacity 옵션 (불투명도)
export const JDF_OPACITY_OPTIONS = [
  { value: 'Opaque', label: 'Opaque (불투명)' },
  { value: 'Translucent', label: 'Translucent (반투명)' },
  { value: 'Transparent', label: 'Transparent (투명)' },
];

// JDF Texture 옵션 (질감)
export const JDF_TEXTURE_OPTIONS = [
  { value: 'Smooth', label: 'Smooth (매끄러움)' },
  { value: 'Linen', label: 'Linen (린넨)' },
  { value: 'Laid', label: 'Laid (줄무늬)' },
  { value: 'Felt', label: 'Felt (펠트)' },
  { value: 'Canvas', label: 'Canvas (캔버스)' },
  { value: 'Wove', label: 'Wove (우브)' },
  { value: 'Vellum', label: 'Vellum (벨럼)' },
  { value: 'Embossed', label: 'Embossed (엠보싱)' },
];

// JDF HoleType 옵션 (펀치 구멍)
export const JDF_HOLE_TYPE_OPTIONS = [
  { value: 'None', label: 'None (없음)' },
  { value: 'R2-generic', label: '2공 (일반)' },
  { value: 'R3-generic', label: '3공 (일반)' },
  { value: 'R5-US', label: '5공 (US)' },
  { value: 'R7-generic', label: '7공 (일반)' },
  { value: 'W3-generic', label: '3공 (와이드)' },
];

// JDF Grade 옵션 (용지 등급)
export const JDF_GRADE_OPTIONS = [
  { value: 1, label: '1등급 (최상)' },
  { value: 2, label: '2등급 (상)' },
  { value: 3, label: '3등급 (중)' },
  { value: 4, label: '4등급 (하)' },
  { value: 5, label: '5등급 (최하)' },
];

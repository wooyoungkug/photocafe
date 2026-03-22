// 단가 시스템 공통 상수
// 표준단가/그룹단가/개별단가 모두에서 공유

import { SPEC_PURPOSE_LABELS } from '@/lib/types/specification';

// ─── 가격 계산 방식 라벨 ───────────────────────────────────────────
export type PricingType =
  | 'paper_output_spec'
  | 'nup_page_range'
  | 'finishing_spec_nup'
  | 'finishing_length'
  | 'finishing_area'
  | 'binding_page'
  | 'finishing_qty'
  | 'finishing_page';

export const PRICING_TYPE_LABELS: Record<string, string> = {
  paper_output_spec: '[출력전용] 용지별출력단가/1p가격',
  nup_page_range: '[제본전용] 구간별 Nup/1p가격',
  finishing_spec_nup: '[후가공전용] 규격별 Nup/1p단가',
  finishing_length: '[후가공전용] 길이별단가',
  finishing_area: '[후가공전용] 면적별단가',
  binding_page: '[제본전용] 제본 페이지당',
  finishing_qty: '[후가공] 수량당',
  finishing_page: '[후가공] 페이지당',
};

// ─── 인쇄방식 라벨 ─────────────────────────────────────────────────
export const PRINT_METHOD_LABELS: Record<string, string> = SPEC_PURPOSE_LABELS;

// ─── 단가 그룹 색상 ────────────────────────────────────────────────
export const PRICE_GROUP_COLORS = ['green', 'blue', 'yellow', 'red', 'purple'] as const;
export type PriceGroupColor = (typeof PRICE_GROUP_COLORS)[number];

export const PRICE_GROUP_STYLES: Record<string, { bg: string; border: string; text: string; label: string; dot: string }> = {
  green: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', label: '그룹1', dot: '🟢' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', label: '그룹2', dot: '🔵' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', label: '그룹3', dot: '🟡' },
  red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', label: '그룹4', dot: '🔴' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', label: '그룹5', dot: '🟣' },
  none: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-400', label: '미지정', dot: '⚪' },
};

// 용지 컬러 그룹 스타일 (기존 호환용)
export const COLOR_GROUP_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: '🟢 광택지' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: '🔵 무광지' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: '🟡 특수지' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: '🔴 프리미엄' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', label: '🟣 캔버스' },
  default: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', label: '⚪ 기타' },
};

// ─── NUP 관련 ───────────────────────────────────────────────────────
export const NUP_ORDER = ['1++up', '1+up', '1up', '2up', '4up', '6up', '8up'] as const;
export type NupValue = (typeof NUP_ORDER)[number];

// NUP 키 → 실제 배수(분모) 매핑
export const NUP_TO_COUNT: Record<string, number> = {
  '1++up': 1,
  '1+up': 1,
  '1up': 1,
  '2up': 2,
  '4up': 4,
  '6up': 6,
  '8up': 8,
};

// 인디고앨범 NUP 기본 가중치
export const DEFAULT_NUP_ALBUM_WEIGHTS: Record<string, number> = {
  '1++up': 1.0,
  '1+up': 1.0,
  '1up': 1.0,
  '2up': 1.2,
  '4up': 1.3,
  '6up': 1.35,
  '8up': 1.4,
};

// ─── 인디고 Up 관련 ────────────────────────────────────────────────
export const INDIGO_UP_UNITS = [1, 2, 4, 8] as const;

export const DEFAULT_INDIGO_WEIGHTS: Record<number, number> = {
  1: 1.0, // 1up 기준
  2: 1.2,
  4: 1.3,
  8: 1.4,
};

// ─── 인디고 원가 계산 상수 ──────────────────────────────────────────
// 인디고 규격: 315x467mm (국전지 4절 기준)
// 국전지 1연 = 500매, 4절이므로 500 * 4 = 2000장
export const INDIGO_SHEETS_PER_REAM = 2000;
// 인디고 1장 면적 (sq inch): 315mm x 467mm
export const INDIGO_SPEC_SQ_INCH = (315 / 25.4) * (467 / 25.4); // ≈ 228

// ─── 할증조건 ───────────────────────────────────────────────────────
export const SURCHARGE_TYPES = ['night30_weekend20', 'night20_weekend10', 'free_condition', 'none'] as const;
export type SurchargeType = (typeof SURCHARGE_TYPES)[number];

export const SURCHARGE_TYPE_LABELS: Record<SurchargeType, string> = {
  night30_weekend20: '야간 30% / 주말 20%',
  night20_weekend10: '야간 20% / 주말 10%',
  free_condition: '무료배송 조건',
  none: '할증 없음',
};

// ─── 업체 타입 ──────────────────────────────────────────────────────
export const VENDOR_TYPE_LABELS: Record<string, string> = {
  in_house: '본사',
  outsourced: '외주',
};

// ─── Up Price 타입 ──────────────────────────────────────────────────
export interface UpPrice {
  up: number;
  nupKey?: string;
  weight: number;
  fourColorSinglePrice: number;
  fourColorDoublePrice: number;
  sixColorSinglePrice: number;
  sixColorDoublePrice: number;
}

export interface SpecPrice {
  specificationId: string;
  singleSidedPrice: number;
  doubleSidedPrice?: number;
  weight?: number;
}

export interface PriceGroup {
  id: string;
  color: PriceGroupColor | 'none';
  upPrices?: UpPrice[];
  specPrices?: SpecPrice[];
}

// ─── 단가 편집 모드 ────────────────────────────────────────────────
export type PricingMode = 'standard' | 'group' | 'individual';

// ─── 단가 맞춤 기본 범위 ───────────────────────────────────────────
export const DEFAULT_PRICE_ADJUST_RANGES = [
  { maxPrice: 500, adjustment: 10 },
  { maxPrice: 1000, adjustment: 50 },
  { maxPrice: Infinity, adjustment: 100 },
];

// ─── 보호 그룹 ──────────────────────────────────────────────────────
export const PROTECTED_GROUP_NAMES = ['기타', '배송', '출력', '인디고출력', '잉크젯출력'];

export const isProtectedGroup = (name: string): boolean => {
  return PROTECTED_GROUP_NAMES.includes(name);
};

// ─── 유틸 ────────────────────────────────────────────────────────────
export const getNextAvailableColor = (usedColors: PriceGroupColor[]): PriceGroupColor | null => {
  for (const color of PRICE_GROUP_COLORS) {
    if (!usedColors.includes(color)) return color;
  }
  return null;
};

export const generateGroupId = () => `pg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

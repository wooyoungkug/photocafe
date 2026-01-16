/**
 * 금액단위조정 (Price Rounding) 유틸리티
 * 자동 계산된 단가를 보기 좋게 반올림하는 기능
 */

// 구간 금액 옵션
export const ROUNDING_PRICE_OPTIONS = [1000, 5000, 10000, 50000, 100000];

// 단위 옵션
export const ROUNDING_UNIT_OPTIONS = [10, 50, 100, 500, 1000];

// 구간 타입
export interface PriceRoundingTier {
  maxPrice: number;  // 이 금액 미만 (마지막은 Infinity)
  unit: number;      // 반올림 단위
}

// 상품 유형별 기본 구간 설정
export type ProductPriceType = 'indigo' | 'inkjet' | 'album' | 'frame';

export const DEFAULT_ROUNDING_TIERS: Record<ProductPriceType, PriceRoundingTier[]> = {
  indigo: [
    { maxPrice: 500, unit: 10 },
    { maxPrice: 1000, unit: 50 },
    { maxPrice: Infinity, unit: 100 },
  ],
  inkjet: [
    { maxPrice: 1000, unit: 10 },
    { maxPrice: 5000, unit: 50 },
    { maxPrice: Infinity, unit: 100 },
  ],
  album: [
    { maxPrice: 1000, unit: 10 },
    { maxPrice: 5000, unit: 50 },
    { maxPrice: 10000, unit: 100 },
    { maxPrice: Infinity, unit: 500 },
  ],
  frame: [
    { maxPrice: 1000, unit: 10 },
    { maxPrice: 5000, unit: 50 },
    { maxPrice: 10000, unit: 100 },
    { maxPrice: 50000, unit: 500 },
    { maxPrice: Infinity, unit: 1000 },
  ],
};

// printMethod를 ProductPriceType으로 매핑
export const getProductPriceType = (printMethod: string): ProductPriceType => {
  switch (printMethod) {
    case 'indigo': return 'indigo';
    case 'inkjet': return 'inkjet';
    case 'album': return 'album';
    case 'frame': return 'frame';
    default: return 'inkjet'; // 기본값
  }
};

// 구간별 단위조정 함수
export const roundPriceByTier = (price: number, tiers: PriceRoundingTier[]): number => {
  if (price <= 0) return price;
  const tier = tiers.find(t => price < t.maxPrice);
  if (!tier) return price;
  return Math.round(price / tier.unit) * tier.unit;
};

// 단일 단위로 반올림 (고정 단위)
export const roundPriceByUnit = (price: number, unit: number): number => {
  if (price <= 0 || unit <= 0) return price;
  return Math.round(price / unit) * unit;
};

// 구간 설명 텍스트 생성
export const getTierDescription = (tiers: PriceRoundingTier[]): string => {
  return tiers.map((t) => {
    if (t.maxPrice === Infinity) return `그 이상: ${t.unit}원`;
    return `${t.maxPrice.toLocaleString()}원 미만: ${t.unit}원`;
  }).join(' / ');
};

// 기본 구간 가져오기
export const getDefaultTiers = (printMethod: string): PriceRoundingTier[] => {
  const priceType = getProductPriceType(printMethod);
  return [...DEFAULT_ROUNDING_TIERS[priceType]];
};

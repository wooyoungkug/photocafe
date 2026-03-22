// 단가 시스템 공통 유틸리티
// 표준단가/그룹단가/개별단가 모두에서 공유

import type { Specification } from '@/hooks/use-specifications';
import type { Paper } from '@/lib/types/paper';
import {
  NUP_ORDER,
  NUP_TO_COUNT,
  INDIGO_SHEETS_PER_REAM,
  type UpPrice,
} from './pricing-constants';

// ─── 숫자 포맷팅 ────────────────────────────────────────────────────
export const formatNumber = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null || num === '') return '';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '';
  return n.toLocaleString('ko-KR');
};

export const formatCurrency = (num: number) => {
  return new Intl.NumberFormat('ko-KR').format(num);
};

// ─── 그룹명 기반 단면/양면 고정 ─────────────────────────────────────
// 압축/레이플릿/맞장 → 단면, 화보/포토북 → 양면
export const getFixedPrintSide = (groupName: string): 'single' | 'double' | null => {
  const lower = groupName.toLowerCase();
  if (lower.includes('압축') || lower.includes('레이플릿') || lower.includes('맞장')) return 'single';
  if (lower.includes('화보') || lower.includes('포토북')) return 'double';
  return null;
};

// ─── 규격을 Nup 그룹으로 묶기 ───────────────────────────────────────
export const groupSpecificationsByNup = (specs: Specification[]): Map<string, Specification[]> => {
  const nupGroups = new Map<string, Specification[]>();

  specs.forEach((spec) => {
    if (!spec.nup) return;
    const nup = spec.nup;
    if (!nupGroups.has(nup)) {
      nupGroups.set(nup, []);
    }
    nupGroups.get(nup)!.push(spec);
  });

  // Nup 순서대로 정렬된 Map 반환
  const sortedGroups = new Map<string, Specification[]>();
  NUP_ORDER.forEach((nup) => {
    if (nupGroups.has(nup)) {
      sortedGroups.set(nup, nupGroups.get(nup)!);
    }
  });
  // NUP_ORDER에 없는 nup 값도 추가
  nupGroups.forEach((groupSpecs, nup) => {
    if (!sortedGroups.has(nup)) {
      sortedGroups.set(nup, groupSpecs);
    }
  });

  return sortedGroups;
};

// Nup 그룹의 대표 규격명 (포함된 규격들의 이름 나열)
export const getNupGroupLabel = (specs: Specification[]): string => {
  if (specs.length === 0) return '';
  if (specs.length === 1) return specs[0].name;
  const names = specs.map((s) => s.name).slice(0, 3);
  const remaining = specs.length - 3;
  return remaining > 0 ? `${names.join(', ')} 외 ${remaining}개` : names.join(', ');
};

// Nup 키 목록 추출 (인디고앨범/잉크젯앨범 공용)
export const getAlbumNupKeys = (specifications: any[] | undefined, method?: string): string[] => {
  if (!specifications) return ['1++up', '1+up', '1up', '2up', '4up', '8up'];
  const albumSpecs = specifications.filter((s: any) => {
    if (!s.nup) return false;
    if (method === 'album') return s.forAlbum;
    return s.forIndigoAlbum;
  });
  const nupSet = new Set(albumSpecs.map((s: any) => s.nup as string));
  const ordered = [...NUP_ORDER].filter((n) => nupSet.has(n));
  return ordered.length > 0 ? ordered : ['1++up', '1+up', '1up', '2up', '4up', '8up'];
};

// ─── 기준행 기반 자동 가격 계산 ──────────────────────────────────────
// 기준행(idx=0)의 가격과 각 행의 weight로 나머지 가격 자동 계산
export const calculate1upBasedPrices = (
  upPrices: UpPrice[],
  baseIndex: number,
  priceField: keyof UpPrice,
  value: number
): UpPrice[] => {
  const baseUp = upPrices[baseIndex];
  const baseNupCount = baseUp.nupKey ? NUP_TO_COUNT[baseUp.nupKey] || 1 : baseUp.up;

  return upPrices.map((up, i) => {
    if (i === baseIndex) {
      return { ...up, [priceField]: value };
    }
    const nupCount = up.nupKey ? NUP_TO_COUNT[up.nupKey] || 1 : up.up;
    return {
      ...up,
      [priceField]: Math.round(((value / nupCount) * baseNupCount) * up.weight),
    };
  });
};

// 가중치 변경 시 전체 재계산
export const recalculateByWeight = (upPrices: UpPrice[], idx: number, newWeight: number): UpPrice[] => {
  const updated = upPrices.map((up, i) => (i === idx ? { ...up, weight: newWeight } : up));
  const baseUp = updated[0];
  if (!baseUp) return updated;

  const baseNupCount = baseUp.nupKey ? NUP_TO_COUNT[baseUp.nupKey] || 1 : baseUp.up;

  return updated.map((up, i) => {
    if (i === 0) return up;
    const nupCount = up.nupKey ? NUP_TO_COUNT[up.nupKey] || 1 : up.up;
    return {
      ...up,
      fourColorSinglePrice: Math.round(((baseUp.fourColorSinglePrice / nupCount) * baseNupCount) * up.weight),
      fourColorDoublePrice: Math.round(((baseUp.fourColorDoublePrice / nupCount) * baseNupCount) * up.weight),
      sixColorSinglePrice: Math.round(((baseUp.sixColorSinglePrice / nupCount) * baseNupCount) * up.weight),
      sixColorDoublePrice: Math.round(((baseUp.sixColorDoublePrice / nupCount) * baseNupCount) * up.weight),
    };
  });
};

// ─── 구간별 가격 재계산 ──────────────────────────────────────────────
// 표지가격이 있으면: 구간가격 = 표지가격 + (제본단가 + 용지가격) × 페이지수
export const recalcRangePrices = (
  coverPrice: number,
  pricePerPage: number,
  paperPrice: number,
  pageRanges: number[]
): Record<string, string> => {
  const result: Record<string, string> = {};
  if (coverPrice > 0) {
    pageRanges.forEach((range) => {
      result[String(range)] = String(Math.round(coverPrice + (pricePerPage + paperPrice) * range));
    });
  }
  return result;
};

// ─── 인디고 원가 계산 ───────────────────────────────────────────────
export const calculateIndigoCost = (papers: Paper[], up: number, isDoubleSided: boolean = false): string | null => {
  if (!papers.length) return null;

  const costs = papers.map((p) => {
    const reamPrice = p.basePrice || 0;
    const perSheetCost = reamPrice / INDIGO_SHEETS_PER_REAM;
    if (isDoubleSided) {
      return perSheetCost / 2 / up;
    } else {
      return perSheetCost / up;
    }
  });

  const validCosts = costs.filter((c) => c > 0);
  if (!validCosts.length) return null;

  const minCost = Math.round(Math.min(...validCosts));
  const maxCost = Math.round(Math.max(...validCosts));

  if (minCost === maxCost) return formatCurrency(minCost);
  return `${formatCurrency(minCost)}~${formatCurrency(maxCost)}`;
};

// 인디고 잉크 원가 계산
export const calculateIndigoInkCost = (
  ink1ColorPrice: number,
  colorCount: 4 | 6,
  up: number,
  _isDoubleSided: boolean = false
): number => {
  if (!ink1ColorPrice || !up) return 0;
  const baseCost = ink1ColorPrice * colorCount;
  return Math.round(baseCost / up);
};

// 인디고 총 원가 계산 (용지 + 잉크)
export const calculateIndigoTotalCost = (
  papers: Paper[],
  up: number,
  isDoubleSided: boolean,
  ink1ColorPrice: number,
  colorCount: 4 | 6
): { min: number; max: number } | null => {
  if (!papers.length) return null;

  const costs = papers.map((p) => {
    const reamPrice = p.basePrice || 0;
    const perSheetCost = reamPrice / INDIGO_SHEETS_PER_REAM;
    let paperCost: number;
    if (isDoubleSided) {
      paperCost = perSheetCost / 2 / up;
    } else {
      paperCost = perSheetCost / up;
    }
    const inkCost = calculateIndigoInkCost(ink1ColorPrice, colorCount, up);
    return paperCost + inkCost;
  });

  const validCosts = costs.filter((c) => c > 0);
  if (!validCosts.length) return null;

  return {
    min: Math.round(Math.min(...validCosts)),
    max: Math.round(Math.max(...validCosts)),
  };
};

// ─── 잉크젯 원가 계산 ──────────────────────────────────────────────
export const calculateInkjetCost = (papers: Paper[], spec: Specification): string | null => {
  if (!papers.length || !spec) return null;

  const widthInch = Number(spec.widthInch) || 0;
  const heightInch = Number(spec.heightInch) || 0;
  const specAreaSqInch = widthInch * heightInch;

  const costs = papers.map((p) => {
    let costPerSqInch = 0;

    if (p.unitType === 'sqm') {
      costPerSqInch = (p.basePrice || 0) / 1550;
    } else if (p.unitType === 'roll') {
      const rollW = Number((p as any).rollWidthInch) || 0;
      const rollL = (Number((p as any).rollLengthM) || 0) * 39.37;
      const totalArea = rollW * rollL;
      if (totalArea > 0) costPerSqInch = (p.basePrice || 0) / totalArea;
    } else if (p.unitType === 'sheet') {
      const sheetWInch = (Number((p as any).sheetWidthMm) || 0) / 25.4;
      const sheetHInch = (Number((p as any).sheetHeightMm) || 0) / 25.4;
      const sheetArea = sheetWInch * sheetHInch;
      if (sheetArea > 0) costPerSqInch = (p.basePrice || 0) / sheetArea;
    } else if (p.unitType === 'ream') {
      const REAM_TOTAL_SQ_INCH = 666150;
      costPerSqInch = (p.basePrice || 0) / REAM_TOTAL_SQ_INCH;
    }

    return specAreaSqInch * costPerSqInch;
  });

  const validCosts = costs.filter((c) => c > 0);
  if (!validCosts.length) return null;

  const minCost = Math.round(Math.min(...validCosts));
  const maxCost = Math.round(Math.max(...validCosts));

  if (minCost === maxCost) return formatCurrency(minCost);
  return `${formatCurrency(minCost)}~${formatCurrency(maxCost)}`;
};

// 잉크젯 총 원가 계산
export const calculateInkjetTotalCost = (
  papers: Paper[],
  spec: Specification
): { paperMin: number; paperMax: number; inkMin: number; inkMax: number; totalMin: number; totalMax: number } | null => {
  if (!papers.length || !spec) return null;

  const widthInch = Number(spec.widthInch) || 0;
  const heightInch = Number(spec.heightInch) || 0;
  const specAreaSqInch = widthInch * heightInch;

  if (specAreaSqInch <= 0) return null;

  const costs = papers.map((p) => {
    let costPerSqInch = 0;
    const isRollPaper = (p as any).paperType === 'roll';
    const effectiveType = isRollPaper ? 'roll' : p.unitType || 'sheet';

    if (effectiveType === 'sqm') {
      costPerSqInch = (p.basePrice || 0) / 1550;
    } else if (effectiveType === 'roll') {
      let rollW = Number((p as any).rollWidthInch) || 0;
      if (rollW === 0 && (p as any).rollWidth) {
        const match = String((p as any).rollWidth).match(/(\d+(?:\.\d+)?)/);
        if (match) rollW = parseFloat(match[1]);
      }
      let rollLengthM = Number((p as any).rollLengthM) || 0;
      if (rollLengthM === 0 && (p as any).rollLength) {
        const match = String((p as any).rollLength).match(/(\d+(?:\.\d+)?)/);
        if (match) rollLengthM = parseFloat(match[1]);
      }
      const rollL = rollLengthM * 39.37;
      const totalArea = rollW * rollL;
      if (totalArea > 0) costPerSqInch = (p.basePrice || 0) / totalArea;
    } else if (effectiveType === 'sheet') {
      const sheetWInch = (Number((p as any).sheetWidthMm) || 0) / 25.4;
      const sheetHInch = (Number((p as any).sheetHeightMm) || 0) / 25.4;
      const sheetArea = sheetWInch * sheetHInch;
      if (sheetArea > 0) costPerSqInch = (p.basePrice || 0) / sheetArea;
    } else if (effectiveType === 'ream') {
      const REAM_TOTAL_SQ_INCH = 666150;
      costPerSqInch = (p.basePrice || 0) / REAM_TOTAL_SQ_INCH;
    } else {
      return { paper: 0, ink: 0, total: 0 };
    }

    const paperCost = specAreaSqInch * costPerSqInch;
    const inkCost = paperCost * 1.5;
    return { paper: paperCost, ink: inkCost, total: paperCost + inkCost };
  });

  const validCosts = costs.filter((c) => c.total > 0);
  if (!validCosts.length) return null;

  return {
    paperMin: Math.round(Math.min(...validCosts.map((c) => c.paper))),
    paperMax: Math.round(Math.max(...validCosts.map((c) => c.paper))),
    inkMin: Math.round(Math.min(...validCosts.map((c) => c.ink))),
    inkMax: Math.round(Math.max(...validCosts.map((c) => c.ink))),
    totalMin: Math.round(Math.min(...validCosts.map((c) => c.total))),
    totalMax: Math.round(Math.max(...validCosts.map((c) => c.total))),
  };
};

// ─── 단가 맞춤 (가격 반올림) ─────────────────────────────────────────
export const adjustPriceByRanges = (
  price: number,
  ranges: { maxPrice: number; adjustment: number }[]
): number => {
  if (price <= 0) return 0;
  for (const range of ranges) {
    if (price <= range.maxPrice) {
      const adj = range.adjustment;
      return Math.round(price / adj) * adj;
    }
  }
  // 모든 범위 초과 시 마지막 adjustment 사용
  const lastAdj = ranges[ranges.length - 1]?.adjustment || 100;
  return Math.round(price / lastAdj) * lastAdj;
};

// ─── 할인율 계산 ─────────────────────────────────────────────────────
export const calculateDiscount = (standardPrice: number, overridePrice: number): string => {
  if (standardPrice <= 0 || overridePrice <= 0) return '-';
  const discount = ((standardPrice - overridePrice) / standardPrice) * 100;
  if (discount > 0) return `${discount.toFixed(1)}% 할인`;
  if (discount < 0) return `${Math.abs(discount).toFixed(1)}% 인상`;
  return '동일';
};

// ─── 차이 퍼센트 계산 ────────────────────────────────────────────────
export const getDiffPercent = (
  standardPrice: number,
  overridePrice: number
): { percent: number; direction: 'up' | 'down' | 'same' } => {
  if (standardPrice <= 0 || overridePrice <= 0) return { percent: 0, direction: 'same' };
  const diff = ((overridePrice - standardPrice) / standardPrice) * 100;
  if (Math.abs(diff) < 0.5) return { percent: 0, direction: 'same' };
  return {
    percent: Math.round(Math.abs(diff)),
    direction: diff > 0 ? 'up' : 'down',
  };
};

// ─── 트리에서 그룹을 재귀적으로 찾기 ─────────────────────────────────
export const findGroupInTree = (groups: any[], id: string): any | null => {
  for (const group of groups) {
    if (group.id === id) return group;
    if (group.children && group.children.length > 0) {
      const found = findGroupInTree(group.children, id);
      if (found) return found;
    }
  }
  return null;
};

// ─── 원가 표시용 계산 (Up별) ─────────────────────────────────────────
export const getCostDisplay = (
  priceField: string,
  up: number,
  nupKey: string | undefined,
  avgPaperCostPerSide: number | null,
  indigoInk1ColorCost: number | undefined
): string | null => {
  if (avgPaperCostPerSide === null || !indigoInk1ColorCost) return null;
  const colorCount = priceField.includes('four') ? 4 : 6;
  const clickCharge = indigoInk1ColorCost * colorCount;
  const costPerSide1up = avgPaperCostPerSide + clickCharge;
  const totalCost1up = priceField.includes('Double') ? costPerSide1up * 2 : costPerSide1up;
  const nupCount = nupKey ? NUP_TO_COUNT[nupKey] || 1 : up;
  const costPerUp = totalCost1up / nupCount;
  return formatNumber(Math.round(costPerUp));
};

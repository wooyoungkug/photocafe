'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  NUP_TO_COUNT,
  type UpPrice,
  type PricingMode,
} from './pricing-constants';
import {
  formatNumber,
  getFixedPrintSide,
  getCostDisplay,
} from './pricing-utils';

interface IndigoNupPriceTableProps {
  /** 모드: standard(직접편집), group(오버라이드), individual(오버라이드) */
  mode: PricingMode;
  /** 인쇄 방식 */
  printMethod: string;
  /** 그룹명 (단면/양면 고정 판단용) */
  groupName: string;
  /** 현재 Up별 가격 */
  upPrices: UpPrice[];
  /** 표준단가 Up별 가격 (그룹/개별 모드에서 비교 참조) */
  standardUpPrices?: UpPrice[];
  /** 그룹단가 Up별 가격 (개별 모드에서 비교 참조) */
  groupUpPrices?: UpPrice[];
  /** 변경 핸들러 */
  onUpPricesChange: (prices: UpPrice[]) => void;
  /** 원가 계산용: 평균 면당 용지 원가 */
  avgPaperCostPerSide?: number | null;
  /** 원가 계산용: 인디고 1도당 잉크 비용 */
  indigoInk1ColorCost?: number;
  /** 읽기 전용 */
  readOnly?: boolean;
}

export function IndigoNupPriceTable({
  mode,
  printMethod,
  groupName,
  upPrices,
  standardUpPrices,
  groupUpPrices,
  onUpPricesChange,
  avgPaperCostPerSide,
  indigoInk1ColorCost,
  readOnly = false,
}: IndigoNupPriceTableProps) {
  const fps = getFixedPrintSide(groupName);
  const isAlbum = printMethod === 'album';

  // 기준행(idx=0) 가격 변경 시 다른 행 자동 계산
  const handlePriceChange = (idx: number, field: keyof UpPrice, value: number) => {
    if (idx === 0) {
      // 기준행: 다른 행 자동 계산
      const baseUp = upPrices[0];
      const baseNupCount = baseUp.nupKey ? NUP_TO_COUNT[baseUp.nupKey] || 1 : baseUp.up;
      const newPrices = upPrices.map((up, i) => {
        if (i === 0) return { ...up, [field]: value };
        const nupCount = up.nupKey ? NUP_TO_COUNT[up.nupKey] || 1 : up.up;
        return { ...up, [field]: Math.round(((value / nupCount) * baseNupCount) * up.weight) };
      });
      onUpPricesChange(newPrices);
    } else {
      // 비기준행: 해당 행만 직접 수정
      const newPrices = upPrices.map((up, i) => (i === idx ? { ...up, [field]: value } : up));
      onUpPricesChange(newPrices);
    }
  };

  // 가중치 변경 시 재계산
  const handleWeightChange = (idx: number, newWeight: number) => {
    const updated = upPrices.map((up, i) => (i === idx ? { ...up, weight: newWeight } : up));
    const baseUp = updated[0];
    if (!baseUp) {
      onUpPricesChange(updated);
      return;
    }
    const baseNupCount = baseUp.nupKey ? NUP_TO_COUNT[baseUp.nupKey] || 1 : baseUp.up;
    const recalculated = updated.map((up, i) => {
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
    onUpPricesChange(recalculated);
  };

  // 참조 가격 찾기 (표준가 또는 그룹가)
  const getRefPrice = (upPrice: UpPrice, field: string): number | undefined => {
    if (mode === 'standard') return undefined;

    const findInList = (list: UpPrice[] | undefined) => {
      if (!list) return undefined;
      return list.find(
        (p) => (p.nupKey && p.nupKey === upPrice.nupKey) || (!p.nupKey && p.up === upPrice.up)
      );
    };

    // 개별 모드: 그룹가 우선, 없으면 표준가
    if (mode === 'individual') {
      const groupRef = findInList(groupUpPrices);
      if (groupRef && (groupRef as any)[field] > 0) return (groupRef as any)[field];
    }

    const stdRef = findInList(standardUpPrices);
    return stdRef ? (stdRef as any)[field] : undefined;
  };

  // 가격 필드 목록 결정
  const getPriceFields = (): { field: keyof UpPrice; label: string }[] => {
    if (isAlbum) {
      return [{ field: 'fourColorSinglePrice', label: '단면' }];
    }
    const fields: { field: keyof UpPrice; label: string }[] = [];
    if (fps !== 'double') fields.push({ field: 'fourColorSinglePrice', label: '4도단면' });
    if (fps !== 'single') fields.push({ field: 'fourColorDoublePrice', label: '4도양면' });
    if (fps !== 'double') fields.push({ field: 'sixColorSinglePrice', label: '6도단면' });
    if (fps !== 'single') fields.push({ field: 'sixColorDoublePrice', label: '6도양면' });
    return fields;
  };

  const priceFields = getPriceFields();

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="text-center py-2 px-2 font-medium text-gray-600">Up</th>
            <th className="text-center py-2 px-2 font-medium text-gray-500 text-[12px]">가중치</th>
            {priceFields.map(({ label }) => (
              <th key={label} className="text-center py-2 px-2 font-medium text-gray-600">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {upPrices.map((upPrice, idx) => (
            <tr
              key={upPrice.nupKey || upPrice.up}
              className={cn('border-b border-gray-100 last:border-0', idx === 0 && 'bg-amber-50/80 border-amber-200')}
            >
              {/* Up 표시 */}
              <td className="text-center py-1.5 px-2 font-medium text-indigo-600">
                {upPrice.nupKey || `${upPrice.up}up`}
              </td>

              {/* 가중치 */}
              <td className="text-center px-2 py-1.5">
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5"
                  className="h-9 w-14 text-center text-[13px] bg-gray-50 border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={upPrice.weight || ''}
                  disabled={idx === 0 || readOnly}
                  onChange={(e) => handleWeightChange(idx, Number(e.target.value) || 1)}
                  placeholder="1"
                />
              </td>

              {/* 가격 필드들 */}
              {priceFields.map(({ field }) => {
                const currentValue = (upPrice as any)[field] || 0;
                const refPrice = getRefPrice(upPrice, field as string);
                const costDisplay =
                  mode === 'standard'
                    ? getCostDisplay(
                        field as string,
                        upPrice.up,
                        upPrice.nupKey,
                        avgPaperCostPerSide ?? null,
                        indigoInk1ColorCost
                      )
                    : null;

                return (
                  <td key={field} className="px-2 py-1.5">
                    <div className="flex flex-col items-center gap-0.5">
                      {/* 표준가 참조 (그룹/개별 모드) */}
                      {refPrice != null && refPrice > 0 && (
                        <span className="text-[11px] text-gray-500 font-medium">{formatNumber(refPrice)}</span>
                      )}
                      {/* 원가 표시 (표준 모드) */}
                      {costDisplay && (
                        <span className="text-[11px] text-orange-600 font-medium">원가 {costDisplay}</span>
                      )}
                      {readOnly ? (
                        <span className="h-9 w-20 flex items-center justify-center font-mono text-[14px] text-gray-600 bg-gray-50 rounded border">
                          {formatNumber(currentValue) || '-'}
                        </span>
                      ) : (
                        <Input
                          type="number"
                          className={cn(
                            'h-9 w-20 text-[14px] text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                            idx === 0
                              ? 'bg-amber-100 border-amber-300 font-medium focus:border-amber-400 focus:ring-1 focus:ring-amber-200'
                              : 'bg-white border-slate-200 hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'
                          )}
                          value={currentValue || ''}
                          onChange={(e) => handlePriceChange(idx, field, Number(e.target.value) || 0)}
                          placeholder="0"
                        />
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

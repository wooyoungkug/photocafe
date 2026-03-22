'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { type PricingMode } from './pricing-constants';
import { formatNumber, getDiffPercent } from './pricing-utils';

export interface InkjetSpecPriceItem {
  specificationId: string;
  specName: string;
  singleSidedPrice: number;
  doubleSidedPrice?: number;
  weight?: number;
}

interface InkjetSpecPriceTableProps {
  mode: PricingMode;
  /** 규격별 단가 목록 */
  specPrices: InkjetSpecPriceItem[];
  /** 설정 ID */
  settingId: string;
  /** 용지그룹 ID */
  priceGroupId: string;
  /** 편집 중인 가격 맵 */
  editingPrices: Record<string, string>;
  /** 편집 가격 변경 핸들러 */
  onEditingPricesChange: (prices: Record<string, string>) => void;
  /** 저장된 그룹/개별 오버라이드 가격 맵 */
  savedOverridePrices?: Map<string, any>;
  /** 읽기 전용 */
  readOnly?: boolean;
  /** 원가 표시 함수 (표준 모드용) */
  getCostForSpec?: (specId: string) => string | null;
}

export function InkjetSpecPriceTable({
  mode,
  specPrices,
  settingId,
  priceGroupId,
  editingPrices,
  onEditingPricesChange,
  savedOverridePrices,
  readOnly = false,
  getCostForSpec,
}: InkjetSpecPriceTableProps) {
  return (
    <div className="border border-gray-200 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="text-left py-1 px-2 font-medium text-gray-600">규격</th>
            <th className="text-center py-1 px-1 font-medium text-gray-600">단면가격</th>
            {mode === 'standard' && getCostForSpec && (
              <th className="text-center py-1 px-1 font-medium text-gray-400 text-[10px]">원가</th>
            )}
          </tr>
        </thead>
        <tbody>
          {specPrices.map((specPrice) => {
            const specId = specPrice.specificationId;
            const key = `${settingId}_${priceGroupId}_spec_${specId}`;
            const standardPrice = specPrice.singleSidedPrice || 0;

            // 그룹/개별 모드: 저장된 오버라이드 가격
            const savedGroupPrice = savedOverridePrices?.get(
              `${settingId}_${priceGroupId}_${specId}`
            );
            const savedValue = savedGroupPrice?.price
              ? Number(savedGroupPrice.price)
              : undefined;

            // 현재 표시값
            const editedValue = editingPrices[key];
            const currentValue =
              editedValue != null
                ? editedValue
                : savedValue != null
                  ? String(savedValue)
                  : mode === 'standard'
                    ? String(standardPrice || '')
                    : '';

            // 차이 퍼센트
            const numCurrentValue = Number(currentValue) || 0;
            const diff =
              mode !== 'standard' && standardPrice > 0 && numCurrentValue > 0
                ? getDiffPercent(standardPrice, numCurrentValue)
                : null;

            const costDisplay = getCostForSpec ? getCostForSpec(specId) : null;

            return (
              <tr
                key={specId}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
              >
                <td className="py-0.5 px-2 font-medium text-gray-700">{specPrice.specName}</td>
                <td className="px-0.5 py-0.5">
                  <div className="flex flex-col items-center">
                    {/* 표준가 참조 (그룹/개별 모드) */}
                    {mode !== 'standard' && standardPrice > 0 && (
                      <div className="flex items-center gap-0.5">
                        <span className="text-[9px] text-gray-400">
                          {formatNumber(standardPrice)}
                        </span>
                        {diff && diff.direction !== 'same' && (
                          <span
                            className={cn(
                              'text-[8px] font-medium',
                              diff.direction === 'down' ? 'text-green-600' : 'text-red-500'
                            )}
                          >
                            {diff.direction === 'down' ? '-' : '+'}
                            {diff.percent}%
                          </span>
                        )}
                      </div>
                    )}
                    {readOnly ? (
                      <span className="h-7 w-16 flex items-center justify-center font-mono text-xs text-gray-600 bg-gray-50 rounded border">
                        {formatNumber(numCurrentValue) || '-'}
                      </span>
                    ) : (
                      <Input
                        type="number"
                        className="h-7 w-20 text-xs text-center font-mono bg-white border-slate-200 hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={currentValue}
                        onChange={(e) => {
                          onEditingPricesChange({
                            ...editingPrices,
                            [key]: e.target.value,
                          });
                        }}
                        placeholder={mode === 'standard' ? '0' : standardPrice > 0 ? String(standardPrice) : '0'}
                      />
                    )}
                  </div>
                </td>
                {mode === 'standard' && costDisplay && (
                  <td className="text-center text-[10px] text-orange-500">원가 {costDisplay}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { NUP_ORDER, type PricingMode } from './pricing-constants';
import { formatNumber } from './pricing-utils';

export interface NupGroupItem {
  specId: string;
  specInfo: { name: string; nup: string };
  rangeData: {
    pricePerPage: number;
    coverPrice: number;
    paperPrice: number;
    rangePrices: Record<string | number, number>;
  };
}

interface NupPageRangeTableProps {
  mode: PricingMode;
  /** Nup별 그룹 데이터 */
  nupGroups: Map<string, NupGroupItem[]>;
  /** 페이지 구간 목록 (예: [20, 30, 40, 50, 60]) */
  pageRanges: number[];
  /** 설정 ID */
  settingId: string;
  /** 편집 중인 가격 (key → value 맵) */
  editingPrices: Record<string, string>;
  /** 편집 가격 변경 핸들러 */
  onEditingPricesChange: (prices: Record<string, string>) => void;
  /** 그룹/개별 모드: 저장된 오버라이드 가격 맵 */
  savedOverridePrices?: Map<string, any>;
  /** 읽기 전용 */
  readOnly?: boolean;
}

export function NupPageRangeTable({
  mode,
  nupGroups,
  pageRanges,
  settingId,
  editingPrices,
  onEditingPricesChange,
  savedOverridePrices,
  readOnly = false,
}: NupPageRangeTableProps) {
  // Nup 정렬
  const sortedNups = [...nupGroups.keys()].sort(
    (a, b) => NUP_ORDER.indexOf(a as any) - NUP_ORDER.indexOf(b as any)
  );

  // 구간별 가격 재계산: coverPrice + (pricePerPage + paperPrice) × range
  const recalcRangePrices = (
    coverPrice: number,
    pricePerPage: number,
    paperPrice: number,
    _firstRangePrice: number
  ): Record<string, string> => {
    const result: Record<string, string> = {};
    if (coverPrice > 0) {
      pageRanges.forEach((range) => {
        result[String(range)] = String(Math.round(coverPrice + (pricePerPage + paperPrice) * range));
      });
    }
    return result;
  };

  return (
    <div className="space-y-2">
      {/* 헤더 */}
      <div
        className="grid gap-0 text-[11px] font-medium text-gray-500 bg-slate-50 py-1.5 border-b"
        style={{
          gridTemplateColumns: `60px minmax(80px, 1fr) 70px 70px 80px ${pageRanges.map(() => '80px').join(' ')}`,
        }}
      >
        <span>Nup</span>
        <span>규격 목록</span>
        <span className="text-center text-[10px]">표지가격</span>
        <span className="text-center text-[10px]">용지가격(1p)</span>
        <span className="text-right pr-2 text-[10px]">제본단가(1p)</span>
        {pageRanges.map((range: number) => (
          <span key={range} className="text-center">
            {range}p
          </span>
        ))}
      </div>

      {/* Nup별 단가 입력 */}
      <div className="space-y-1">
        {sortedNups.map((nup) => {
          const groupItems = nupGroups.get(nup) || [];
          if (groupItems.length === 0) return null;
          const representative = groupItems[0];
          const specId = representative.specId;
          const rangeData = representative.rangeData;
          const standardPricePerPage = rangeData?.pricePerPage || 0;
          const standardCoverPrice = rangeData?.coverPrice || 0;
          const standardPaperPrice = rangeData?.paperPrice || 0;
          const standardRangePrices = rangeData?.rangePrices || {};
          const specNames = groupItems
            .map((g) => g.specInfo.name || '')
            .filter(Boolean)
            .join(', ');

          // 오버라이드 가격 (그룹/개별 모드)
          const savedRecord =
            savedOverridePrices?.get(`${settingId}__${specId}`) ||
            savedOverridePrices?.get(`${settingId}_${pageRanges[0]}_${specId}`);
          const savedRangePrices = savedRecord?.rangePrices || {};
          const savedCoverPrice =
            savedRangePrices.__coverPrice != null ? Number(savedRangePrices.__coverPrice) : undefined;
          const savedPaperPrice =
            savedRangePrices.__paperPrice != null ? Number(savedRangePrices.__paperPrice) : undefined;
          const savedPricePerPage =
            savedRecord?.pricePerPage != null ? Number(savedRecord.pricePerPage) : undefined;

          // editing keys
          const coverPriceKey = `${settingId}_nup_${specId}_coverPrice`;
          const paperPriceKey = `${settingId}_nup_${specId}_paperPrice`;
          const perPageKey = `${settingId}_nup_${specId}_perPage`;

          // 현재 표시값 (editing > saved > standard)
          const currentCoverPrice =
            editingPrices[coverPriceKey] != null
              ? Number(editingPrices[coverPriceKey])
              : savedCoverPrice ?? standardCoverPrice;
          const currentPaperPrice =
            editingPrices[paperPriceKey] != null
              ? Number(editingPrices[paperPriceKey])
              : savedPaperPrice ?? standardPaperPrice;
          const currentPricePerPage =
            editingPrices[perPageKey] != null
              ? Number(editingPrices[perPageKey])
              : savedPricePerPage ?? standardPricePerPage;

          const getCurrentRangePrice = (range: number) => {
            const rangeKey = `${settingId}_nup_${specId}_range_${range}`;
            if (editingPrices[rangeKey] != null) return Number(editingPrices[rangeKey]);
            const savedRange = savedRangePrices[String(range)];
            if (savedRange != null) return Number(savedRange);
            return standardRangePrices[range] || 0;
          };

          const handleCoverPriceChange = (value: string) => {
            const newCoverPrice = Number(value);
            const updates: Record<string, string> = { [coverPriceKey]: value };
            const calcRanges = recalcRangePrices(
              newCoverPrice,
              currentPricePerPage,
              currentPaperPrice,
              getCurrentRangePrice(pageRanges[0])
            );
            Object.entries(calcRanges).forEach(([r, v]) => {
              updates[`${settingId}_nup_${specId}_range_${r}`] = v;
            });
            onEditingPricesChange({ ...editingPrices, ...updates });
          };

          const handlePaperPriceChange = (value: string) => {
            const newPaperPrice = Number(value);
            const updates: Record<string, string> = { [paperPriceKey]: value };
            const calcRanges = recalcRangePrices(
              currentCoverPrice,
              currentPricePerPage,
              newPaperPrice,
              getCurrentRangePrice(pageRanges[0])
            );
            Object.entries(calcRanges).forEach(([r, v]) => {
              updates[`${settingId}_nup_${specId}_range_${r}`] = v;
            });
            onEditingPricesChange({ ...editingPrices, ...updates });
          };

          const handlePerPageChange = (value: string) => {
            const newPerPage = Number(value);
            const updates: Record<string, string> = { [perPageKey]: value };
            const calcRanges = recalcRangePrices(
              currentCoverPrice,
              newPerPage,
              currentPaperPrice,
              getCurrentRangePrice(pageRanges[0])
            );
            Object.entries(calcRanges).forEach(([r, v]) => {
              updates[`${settingId}_nup_${specId}_range_${r}`] = v;
            });
            onEditingPricesChange({ ...editingPrices, ...updates });
          };

          return (
            <div
              key={nup}
              className="grid gap-0 py-1 items-center bg-amber-50/50"
              style={{
                gridTemplateColumns: `60px minmax(80px, 1fr) 70px 70px 80px ${pageRanges.map(() => '80px').join(' ')}`,
              }}
            >
              <span className="text-sm font-semibold text-violet-700">{nup}</span>
              <span className="text-xs text-gray-500 break-words whitespace-normal leading-tight py-0.5" title={specNames}>
                {specNames}
              </span>

              {/* 표지가격 */}
              <div className="flex flex-col items-center">
                {mode !== 'standard' && standardCoverPrice > 0 && (
                  <span className="text-[9px] text-gray-400">{formatNumber(standardCoverPrice)}</span>
                )}
                {readOnly ? (
                  <span className="h-7 w-16 flex items-center justify-center font-mono text-xs text-gray-600 bg-gray-50 rounded border">
                    {formatNumber(currentCoverPrice) || '-'}
                  </span>
                ) : (
                  <Input
                    type="number"
                    step="1"
                    value={
                      editingPrices[coverPriceKey] ??
                      (savedCoverPrice != null
                        ? String(savedCoverPrice)
                        : String(standardCoverPrice || ''))
                    }
                    onChange={(e) => handleCoverPriceChange(e.target.value)}
                    className="h-7 text-center font-mono text-xs bg-pink-50 border-pink-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                )}
              </div>

              {/* 용지가격 */}
              <div className="flex flex-col items-center">
                {mode !== 'standard' && standardPaperPrice > 0 && (
                  <span className="text-[9px] text-gray-400">{formatNumber(standardPaperPrice)}</span>
                )}
                {readOnly ? (
                  <span className="h-7 w-16 flex items-center justify-center font-mono text-xs text-gray-600 bg-gray-50 rounded border">
                    {formatNumber(currentPaperPrice) || '-'}
                  </span>
                ) : (
                  <Input
                    type="number"
                    step="1"
                    value={
                      editingPrices[paperPriceKey] ??
                      (savedPaperPrice != null
                        ? String(savedPaperPrice)
                        : String(standardPaperPrice || ''))
                    }
                    onChange={(e) => handlePaperPriceChange(e.target.value)}
                    className="h-7 text-center font-mono text-xs bg-yellow-50 border-yellow-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                )}
              </div>

              {/* 제본단가/1p */}
              <div className="flex flex-col items-end pr-2">
                {mode !== 'standard' && (
                  <span className="text-[9px] text-gray-400">{formatNumber(standardPricePerPage)}</span>
                )}
                {readOnly ? (
                  <span className="h-7 w-16 flex items-center justify-end font-mono text-xs text-gray-600 bg-gray-50 rounded border pr-2">
                    {formatNumber(currentPricePerPage) || '-'}
                  </span>
                ) : (
                  <Input
                    type="number"
                    step="0.01"
                    value={
                      editingPrices[perPageKey] ??
                      (savedPricePerPage != null
                        ? String(savedPricePerPage)
                        : String(standardPricePerPage || ''))
                    }
                    onChange={(e) => handlePerPageChange(e.target.value)}
                    className="h-7 text-right font-mono text-xs pr-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                )}
              </div>

              {/* 구간별 가격 */}
              {pageRanges.map((range: number, idx: number) => {
                const standardPrice = standardRangePrices[range] || 0;
                const rangeKey = `${settingId}_nup_${specId}_range_${range}`;
                const currentPrice = getCurrentRangePrice(range);

                // 표지가격이 있으면 자동계산
                if (currentCoverPrice > 0) {
                  return (
                    <div key={range} className="flex flex-col items-center">
                      {mode !== 'standard' && standardPrice > 0 && (
                        <span className="text-[9px] text-gray-400">{formatNumber(standardPrice)}</span>
                      )}
                      <span className="h-7 w-16 flex items-center justify-center font-mono text-xs text-gray-600 bg-gray-50 rounded border">
                        {formatNumber(
                          editingPrices[rangeKey] != null ? Number(editingPrices[rangeKey]) : currentPrice
                        )}
                      </span>
                    </div>
                  );
                }

                // 표지가격 없으면 첫 구간 직접입력
                if (idx === 0 && !readOnly) {
                  return (
                    <div key={range} className="flex flex-col items-center">
                      {mode !== 'standard' && standardPrice > 0 && (
                        <span className="text-[9px] text-gray-400">{formatNumber(standardPrice)}</span>
                      )}
                      <Input
                        type="number"
                        className="h-7 w-16 text-xs text-center font-mono bg-blue-50 border-blue-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0"
                        value={editingPrices[rangeKey] ?? String(currentPrice || '')}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          const firstRange = pageRanges[0] || 20;
                          const updates: Record<string, string> = { [rangeKey]: e.target.value };
                          pageRanges.forEach((r: number, i: number) => {
                            if (i > 0) {
                              updates[`${settingId}_nup_${specId}_range_${r}`] = String(
                                Math.round(value + (r - firstRange) * (currentPricePerPage + currentPaperPrice))
                              );
                            }
                          });
                          onEditingPricesChange({ ...editingPrices, ...updates });
                        }}
                      />
                    </div>
                  );
                }

                return (
                  <div key={range} className="flex flex-col items-center">
                    {mode !== 'standard' && standardPrice > 0 && (
                      <span className="text-[9px] text-gray-400">{formatNumber(standardPrice)}</span>
                    )}
                    <span className="h-7 w-16 flex items-center justify-center font-mono text-xs text-gray-600 bg-gray-50 rounded border">
                      {formatNumber(
                        editingPrices[rangeKey] != null ? Number(editingPrices[rangeKey]) : currentPrice
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        * 표지가격 입력 시 구간별 가격이 자동 계산됩니다. (구간가격 = 표지가격 + (제본단가 + 용지가격) x 페이지수)
      </p>
    </div>
  );
}

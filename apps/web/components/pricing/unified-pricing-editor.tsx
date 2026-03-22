'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Save, Percent, Copy, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  NUP_TO_COUNT,
  NUP_ORDER,
  DEFAULT_NUP_ALBUM_WEIGHTS,
  DEFAULT_INDIGO_WEIGHTS,
  INDIGO_UP_UNITS,
  PRICE_GROUP_STYLES,
  DEFAULT_PRICE_ADJUST_RANGES,
  type UpPrice,
  type PriceGroup,
  type PricingMode,
  type PriceGroupColor,
} from './pricing-constants';
import { formatNumber, getFixedPrintSide, adjustPriceByRanges } from './pricing-utils';
import { PriceGroupCard } from './price-group-card';
import { IndigoNupPriceTable } from './indigo-nup-price-table';
import { NupPageRangeTable, type NupGroupItem } from './nup-page-range-table';
import { InkjetSpecPriceTable, type InkjetSpecPriceItem } from './inkjet-spec-price-table';

// ─── 타입 ──────────────────────────────────────────────────────────
interface ProductionSettingData {
  id: string;
  name: string;
  pricingType: string;
  printMethod: string;
  priceGroups: PriceGroup[];
  paperPriceGroupMap: Record<string, string>;
  pageRanges?: number[];
  specifications?: any[];
}

interface UnifiedPricingEditorProps {
  /** 모드: standard(표준단가 직접편집), group(그룹단가 오버라이드), individual(개별단가 오버라이드) */
  mode: PricingMode;
  /** 생산설정 데이터 */
  setting: ProductionSettingData;
  /** 그룹명 (단면/양면 고정 판단용) */
  groupName: string;
  /** 용지 목록 (원가 계산용, mode=standard) */
  papersForPricing?: any[];
  /** 인디고 잉크 1도당 비용 (mode=standard) */
  indigoInk1ColorCost?: number;
  /** 규격 목록 (앨범 Nup 키 추출용) */
  specifications?: any[];

  // ── 그룹/개별 모드용 ──
  /** 저장된 오버라이드 가격 맵 (settingId_groupId_upKey → price data) */
  savedOverridePrices?: Map<string, any>;
  /** Nup 구간 데이터 (nup_page_range 타입용) */
  nupGroups?: Map<string, NupGroupItem[]>;

  // ── 콜백 ──
  /** 표준 모드: priceGroups 변경 */
  onPriceGroupsChange?: (groups: PriceGroup[]) => void;
  /** 그룹/개별 모드: 저장 */
  onSave?: (settingId: string, pricesData: any[]) => Promise<void>;
  /** 표준단가 복사 */
  onCloneStandard?: (settingId: string) => Promise<void>;
  /** 가중치 적용 */
  onApplyWeight?: (settingId: string, groupId: string, upPrices: UpPrice[], weightPercent: number) => void;

  /** 읽기 전용 */
  readOnly?: boolean;
}

export function UnifiedPricingEditor({
  mode,
  setting,
  groupName,
  papersForPricing,
  indigoInk1ColorCost,
  specifications,
  savedOverridePrices,
  nupGroups,
  onPriceGroupsChange,
  onSave,
  onCloneStandard,
  onApplyWeight,
  readOnly = false,
}: UnifiedPricingEditorProps) {
  const { toast } = useToast();
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // 단가맞춤 다이얼로그
  const [isPriceAdjustDialogOpen, setIsPriceAdjustDialogOpen] = useState(false);
  const [priceAdjustRanges, setPriceAdjustRanges] = useState(DEFAULT_PRICE_ADJUST_RANGES);

  // 가중치 상태
  const [weights, setWeights] = useState<Record<string, number>>({});

  const priceGroups = setting.priceGroups || [];
  const printMethod = setting.printMethod;
  const pricingType = setting.pricingType;
  const pageRanges = setting.pageRanges || [];
  const isNupPageRange = pricingType === 'nup_page_range' || pricingType === 'binding_page';

  // 용지 ID → 용지 정보 맵
  const papersMap = useMemo(() => {
    const map = new Map<string, any>();
    papersForPricing?.forEach((p: any) => map.set(p.id, p));
    return map;
  }, [papersForPricing]);

  // 편집 중인 가격이 있는지 확인
  const hasChanges = useMemo(() => {
    return Object.keys(editingPrices).some((key) => key.startsWith(setting.id + '_'));
  }, [editingPrices, setting.id]);

  // ── 그룹/개별 모드: 저장 핸들러 ──
  const handleSave = useCallback(async () => {
    if (!onSave || mode === 'standard') return;

    const prices: any[] = [];

    priceGroups.forEach((group: PriceGroup) => {
      // 인디고/앨범: upPrices
      const upPrices = group.upPrices || [];
      upPrices.forEach((upPrice: UpPrice) => {
        const upKey = upPrice.nupKey || upPrice.up;
        const baseKey = `${setting.id}_${group.id}_${upKey}`;
        const fourColorSingle = editingPrices[`${baseKey}_fourColorSinglePrice`];
        const fourColorDouble = editingPrices[`${baseKey}_fourColorDoublePrice`];
        const sixColorSingle = editingPrices[`${baseKey}_sixColorSinglePrice`];
        const sixColorDouble = editingPrices[`${baseKey}_sixColorDoublePrice`];

        if (fourColorSingle || fourColorDouble || sixColorSingle || sixColorDouble) {
          prices.push({
            minQuantity: upPrice.up,
            nupKey: upPrice.nupKey || undefined,
            priceGroupId: group.id,
            fourColorSinglePrice: fourColorSingle ? parseFloat(fourColorSingle) : undefined,
            fourColorDoublePrice: fourColorDouble ? parseFloat(fourColorDouble) : undefined,
            sixColorSinglePrice: sixColorSingle ? parseFloat(sixColorSingle) : undefined,
            sixColorDoublePrice: sixColorDouble ? parseFloat(sixColorDouble) : undefined,
          });
        }
      });

      // 잉크젯: specPrices
      const specPrices = group.specPrices || [];
      specPrices.forEach((specPrice: any) => {
        const specId = specPrice.specificationId;
        const key = `${setting.id}_${group.id}_spec_${specId}`;
        const editedValue = editingPrices[key];
        if (editedValue !== undefined && editedValue !== '') {
          prices.push({
            priceGroupId: group.id,
            specificationId: specId,
            price: parseFloat(editedValue),
          });
        }
      });
    });

    // Nup page range prices
    const nupPriceKeys = Object.keys(editingPrices).filter((k) =>
      k.startsWith(`${setting.id}_nup_`)
    );
    if (nupPriceKeys.length > 0) {
      // 그룹별로 nup 편집 가격 수집
      const nupPricesMap = new Map<string, any>();
      nupPriceKeys.forEach((key) => {
        const parts = key.replace(`${setting.id}_nup_`, '').split('_');
        const specId = parts[0];
        const field = parts.slice(1).join('_');
        if (!nupPricesMap.has(specId)) {
          nupPricesMap.set(specId, { specificationId: specId, rangePrices: {} });
        }
        const entry = nupPricesMap.get(specId)!;
        if (field === 'coverPrice') {
          entry.rangePrices.__coverPrice = Number(editingPrices[key]);
        } else if (field === 'paperPrice') {
          entry.rangePrices.__paperPrice = Number(editingPrices[key]);
        } else if (field === 'perPage') {
          entry.pricePerPage = Number(editingPrices[key]);
        } else if (field.startsWith('range_')) {
          const range = field.replace('range_', '');
          entry.rangePrices[range] = Number(editingPrices[key]);
        }
      });
      nupPricesMap.forEach((entry) => prices.push(entry));
    }

    if (prices.length === 0) {
      toast({ title: '변경사항 없음', description: '수정된 단가가 없습니다.' });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(setting.id, prices);
      // 편집 상태 초기화
      setEditingPrices((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (key.startsWith(setting.id + '_')) delete next[key];
        });
        return next;
      });
    } finally {
      setIsSaving(false);
    }
  }, [onSave, mode, priceGroups, editingPrices, setting.id, toast]);

  // ── 그룹/개별 모드: 가중치 적용 ──
  const handleApplyWeight = (groupId: string, upPrices: UpPrice[], weightPercent: number) => {
    if (onApplyWeight) {
      onApplyWeight(setting.id, groupId, upPrices, weightPercent);
      return;
    }

    // 기본 가중치 적용 로직
    const weight = weightPercent / 100;
    const updates: Record<string, string> = {};

    upPrices.forEach((upPrice: UpPrice) => {
      (['fourColorSinglePrice', 'fourColorDoublePrice', 'sixColorSinglePrice', 'sixColorDoublePrice'] as const).forEach(
        (field) => {
          const standardPrice = upPrice[field] || 0;
          if (standardPrice > 0) {
            const groupPrice = Math.round(standardPrice * weight);
            const upKey = upPrice.nupKey || upPrice.up;
            const key = `${setting.id}_${groupId}_${upKey}_${field}`;
            updates[key] = groupPrice.toString();
          }
        }
      );
    });

    setEditingPrices((prev) => ({ ...prev, ...updates }));
    setWeights((prev) => ({ ...prev, [`${setting.id}_${groupId}`]: weightPercent }));
    toast({
      title: `가중치 ${weightPercent}% 적용`,
      description: `표준단가의 ${weightPercent}%로 계산되었습니다.`,
    });
  };

  // ── 그룹/개별 모드: 단가맞춤 적용 ──
  const handlePriceAdjust = () => {
    const updates: Record<string, string> = {};
    const ranges = priceAdjustRanges;

    priceGroups.forEach((group: PriceGroup) => {
      (group.upPrices || []).forEach((upPrice: UpPrice) => {
        const upKey = upPrice.nupKey || upPrice.up;
        (['fourColorSinglePrice', 'fourColorDoublePrice', 'sixColorSinglePrice', 'sixColorDoublePrice'] as const).forEach(
          (field) => {
            const baseKey = `${setting.id}_${group.id}_${upKey}_${field}`;
            const currentStr = editingPrices[baseKey];
            const savedRecord = savedOverridePrices?.get(`${setting.id}_${group.id}_${upKey}`);
            const price = currentStr
              ? Number(currentStr)
              : savedRecord
                ? Number(savedRecord[field]) || 0
                : upPrice[field] || 0;

            if (price > 0) {
              updates[baseKey] = String(adjustPriceByRanges(price, ranges));
            }
          }
        );
      });
    });

    setEditingPrices((prev) => ({ ...prev, ...updates }));
    setIsPriceAdjustDialogOpen(false);
    toast({ title: '단가맞춤 적용 완료' });
  };

  // ── 표준 모드: Up 가격 변경 핸들러 ──
  const handleStandardUpPricesChange = (groupId: string, newUpPrices: UpPrice[]) => {
    if (!onPriceGroupsChange) return;
    const newGroups = priceGroups.map((g) =>
      g.id === groupId ? { ...g, upPrices: newUpPrices } : g
    );
    onPriceGroupsChange(newGroups);
  };

  // ── 그룹/개별 모드: Up 가격을 editingPrices에 반영 ──
  const handleOverrideUpPricesChange = (groupId: string, newUpPrices: UpPrice[]) => {
    const updates: Record<string, string> = {};
    newUpPrices.forEach((up) => {
      const upKey = up.nupKey || up.up;
      const baseKey = `${setting.id}_${groupId}_${upKey}`;
      updates[`${baseKey}_fourColorSinglePrice`] = String(up.fourColorSinglePrice || 0);
      updates[`${baseKey}_fourColorDoublePrice`] = String(up.fourColorDoublePrice || 0);
      updates[`${baseKey}_sixColorSinglePrice`] = String(up.sixColorSinglePrice || 0);
      updates[`${baseKey}_sixColorDoublePrice`] = String(up.sixColorDoublePrice || 0);
    });
    setEditingPrices((prev) => ({ ...prev, ...updates }));
  };

  // ── 그룹/개별 모드: 현재 편집 중인 Up 가격 구성 ──
  const getOverrideUpPrices = (group: PriceGroup): UpPrice[] => {
    const standardUpPrices = group.upPrices || [];
    return standardUpPrices.map((stdUp) => {
      const upKey = stdUp.nupKey || stdUp.up;
      const baseKey = `${setting.id}_${group.id}_${upKey}`;
      const savedRecord = savedOverridePrices?.get(`${setting.id}_${group.id}_${upKey}`);

      return {
        ...stdUp,
        fourColorSinglePrice:
          editingPrices[`${baseKey}_fourColorSinglePrice`] != null
            ? Number(editingPrices[`${baseKey}_fourColorSinglePrice`])
            : savedRecord?.fourColorSinglePrice != null
              ? Number(savedRecord.fourColorSinglePrice)
              : stdUp.fourColorSinglePrice,
        fourColorDoublePrice:
          editingPrices[`${baseKey}_fourColorDoublePrice`] != null
            ? Number(editingPrices[`${baseKey}_fourColorDoublePrice`])
            : savedRecord?.fourColorDoublePrice != null
              ? Number(savedRecord.fourColorDoublePrice)
              : stdUp.fourColorDoublePrice,
        sixColorSinglePrice:
          editingPrices[`${baseKey}_sixColorSinglePrice`] != null
            ? Number(editingPrices[`${baseKey}_sixColorSinglePrice`])
            : savedRecord?.sixColorSinglePrice != null
              ? Number(savedRecord.sixColorSinglePrice)
              : stdUp.sixColorSinglePrice,
        sixColorDoublePrice:
          editingPrices[`${baseKey}_sixColorDoublePrice`] != null
            ? Number(editingPrices[`${baseKey}_sixColorDoublePrice`])
            : savedRecord?.sixColorDoublePrice != null
              ? Number(savedRecord.sixColorDoublePrice)
              : stdUp.sixColorDoublePrice,
      };
    });
  };

  // ── 평균 면당 용지 원가 계산 (표준 모드용) ──
  const getAvgPaperCostPerSide = (group: PriceGroup): number | null => {
    if (mode !== 'standard' || !papersForPricing || !indigoInk1ColorCost) return null;
    const assignedPapers = Object.entries(setting.paperPriceGroupMap)
      .filter(([, gid]) => gid === group.id)
      .map(([pid]) => papersMap.get(pid))
      .filter(Boolean);
    if (!assignedPapers.length) return null;
    const costs = assignedPapers.map((p: any) => {
      const reamPrice = p?.basePrice || 0;
      return reamPrice / 500 / 4 / 2;
    });
    return costs.reduce((a: number, b: number) => a + b, 0) / costs.length;
  };

  // ── Nup page range 모드 렌더링 ──
  if (isNupPageRange && nupGroups) {
    return (
      <div className="space-y-3">
        <NupPageRangeTable
          mode={mode}
          nupGroups={nupGroups}
          pageRanges={pageRanges}
          settingId={setting.id}
          editingPrices={editingPrices}
          onEditingPricesChange={setEditingPrices}
          savedOverridePrices={savedOverridePrices}
          readOnly={readOnly}
        />

        {/* 저장 버튼 (그룹/개별 모드) */}
        {mode !== 'standard' && hasChanges && (
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-8 bg-indigo-600 hover:bg-indigo-700"
              disabled={isSaving}
              onClick={handleSave}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── paper_output_spec / finishing 모드: 그룹별 카드 렌더링 ──
  return (
    <div className="space-y-3">
      {/* 툴바 (그룹/개별 모드) */}
      {mode !== 'standard' && !readOnly && (
        <div className="flex items-center gap-2 flex-wrap">
          {onCloneStandard && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onCloneStandard(setting.id)}
            >
              <Copy className="h-3 w-3 mr-1" />
              표준단가 복사
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setIsPriceAdjustDialogOpen(true)}
          >
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            단가맞춤
          </Button>
        </div>
      )}

      {/* 그룹 없음 안내 */}
      {priceGroups.length === 0 && (
        <div className="border p-4 text-center text-muted-foreground text-sm">
          용지그룹이 설정되지 않았습니다.
        </div>
      )}

      {/* 그룹별 카드 */}
      <div
        className={cn(
          'grid gap-3',
          printMethod === 'album' ? 'grid-cols-3' : 'grid-cols-2'
        )}
      >
        {priceGroups.map((group) => {
          const assignedPapers = Object.entries(setting.paperPriceGroupMap)
            .filter(([, gid]) => gid === group.id)
            .map(([pid]) => papersMap.get(pid))
            .filter(Boolean);
          const assignedPaperNames = assignedPapers.map(
            (p: any) => `${p?.name}${p?.grammage ? ` ${p.grammage}g` : ''}`
          );

          const standardUpPrices = group.upPrices || [];
          const hasUpPrices = standardUpPrices.length > 0;
          const hasSpecPrices = (group.specPrices || []).length > 0;
          const avgPaperCost = getAvgPaperCostPerSide(group);

          // 가중치 입력 (그룹/개별 모드)
          const weightKey = `${setting.id}_${group.id}`;
          const currentWeight = weights[weightKey] || 100;

          const headerExtra =
            mode !== 'standard' && !readOnly && hasUpPrices ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  className="h-6 w-14 text-xs text-center border-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={currentWeight || ''}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 100;
                    setWeights((prev) => ({ ...prev, [weightKey]: val }));
                  }}
                  placeholder="100"
                />
                <span className="text-xs text-gray-400">%</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => handleApplyWeight(group.id, standardUpPrices, currentWeight)}
                >
                  <Percent className="h-3 w-3" />
                </Button>
              </div>
            ) : undefined;

          return (
            <PriceGroupCard
              key={group.id}
              color={(group.color || 'none') as PriceGroupColor | 'none'}
              assignedPaperNames={assignedPaperNames}
              readOnly={readOnly || mode !== 'standard'}
              onDelete={
                mode === 'standard' && onPriceGroupsChange
                  ? () => {
                      const newGroups = priceGroups.filter((g) => g.id !== group.id);
                      onPriceGroupsChange(newGroups);
                    }
                  : undefined
              }
              headerExtra={headerExtra}
            >
              {/* 인디고/앨범 Up 가격 테이블 */}
              {hasUpPrices && (
                <IndigoNupPriceTable
                  mode={mode}
                  printMethod={printMethod}
                  groupName={groupName}
                  upPrices={
                    mode === 'standard' ? standardUpPrices : getOverrideUpPrices(group)
                  }
                  standardUpPrices={mode !== 'standard' ? standardUpPrices : undefined}
                  onUpPricesChange={(newPrices) => {
                    if (mode === 'standard') {
                      handleStandardUpPricesChange(group.id, newPrices);
                    } else {
                      handleOverrideUpPricesChange(group.id, newPrices);
                    }
                  }}
                  avgPaperCostPerSide={avgPaperCost}
                  indigoInk1ColorCost={indigoInk1ColorCost}
                  readOnly={readOnly}
                />
              )}

              {/* 잉크젯 규격별 단가 테이블 */}
              {hasSpecPrices && (
                <InkjetSpecPriceTable
                  mode={mode}
                  specPrices={(group.specPrices || []).map((sp: any) => ({
                    specificationId: sp.specificationId,
                    specName:
                      specifications?.find((s: any) => s.id === sp.specificationId)?.name ||
                      sp.specificationId,
                    singleSidedPrice: sp.singleSidedPrice || 0,
                  }))}
                  settingId={setting.id}
                  priceGroupId={group.id}
                  editingPrices={editingPrices}
                  onEditingPricesChange={setEditingPrices}
                  savedOverridePrices={savedOverridePrices}
                  readOnly={readOnly}
                />
              )}
            </PriceGroupCard>
          );
        })}
      </div>

      {/* 저장 버튼 (그룹/개별 모드) */}
      {mode !== 'standard' && hasChanges && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              setEditingPrices((prev) => {
                const next = { ...prev };
                Object.keys(next).forEach((key) => {
                  if (key.startsWith(setting.id + '_')) delete next[key];
                });
                return next;
              });
            }}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            취소
          </Button>
          <Button
            size="sm"
            className="h-8 bg-indigo-600 hover:bg-indigo-700"
            disabled={isSaving}
            onClick={handleSave}
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>
      )}

      {/* 단가맞춤 다이얼로그 */}
      <Dialog open={isPriceAdjustDialogOpen} onOpenChange={setIsPriceAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>단가맞춤</DialogTitle>
            <DialogDescription>가격 범위별 반올림 단위를 설정합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {priceAdjustRanges.map((range, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="w-20 text-right text-gray-500">
                  {idx === 0 ? '0' : priceAdjustRanges[idx - 1].maxPrice + 1}원 ~
                </span>
                <Input
                  type="number"
                  className="h-8 w-24 text-center text-xs"
                  value={range.maxPrice === Infinity ? '' : range.maxPrice}
                  onChange={(e) => {
                    const val = e.target.value === '' ? Infinity : Number(e.target.value);
                    setPriceAdjustRanges((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, maxPrice: val } : r))
                    );
                  }}
                  placeholder="무한"
                />
                <span className="text-gray-400">원 이하:</span>
                <Input
                  type="number"
                  className="h-8 w-20 text-center text-xs"
                  value={range.adjustment}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 10;
                    setPriceAdjustRanges((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, adjustment: val } : r))
                    );
                  }}
                />
                <span className="text-gray-400">원 단위</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPriceAdjustDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handlePriceAdjust}>적용</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

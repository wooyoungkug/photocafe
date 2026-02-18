'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductFinishing, FinishingSetting } from '@/lib/types';

interface OptionFinishingProps {
  finishings: ProductFinishing[];
  selectedFinishings: ProductFinishing[];
  onToggle: (finishing: ProductFinishing, checked: boolean) => void;
  selectedSpecificationId?: string;
}

/** 선택된 finishing에 적용할 규격별 단가를 반환 */
function resolveFinishingPrice(
  finishing: ProductFinishing,
  specificationId?: string,
): number {
  const settings = finishing.productionGroup?.settings;
  if (!settings || settings.length === 0) return finishing.price;

  const setting: FinishingSetting | undefined = settings.find(
    (s) => s.settingName === finishing.name,
  );
  if (!setting) return finishing.price;

  if (specificationId && setting.prices && setting.prices.length > 0) {
    const specPrice = setting.prices.find(
      (p) => p.specificationId === specificationId,
    );
    if (specPrice) return specPrice.price;
  }

  return setting.basePrice > 0 ? setting.basePrice : finishing.price;
}

export function OptionFinishing({
  finishings,
  selectedFinishings,
  onToggle,
  selectedSpecificationId,
}: OptionFinishingProps) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  if (!finishings || finishings.length === 0) return null;

  // productionGroup별로 그룹핑 (그룹 없는 항목은 각자 독립 버킷)
  const groups = new Map<
    string,
    { groupName: string; items: ProductFinishing[] }
  >();

  for (const f of finishings) {
    const groupId = f.productionGroup?.id ?? `__none__${f.id}`;
    const groupName = f.productionGroup?.name ?? '후가공';
    if (!groups.has(groupId)) {
      groups.set(groupId, { groupName, items: [] });
    }
    groups.get(groupId)!.items.push(f);
  }

  const groupEntries = Array.from(groups.entries());

  return (
    <div className="space-y-2">
      {/* 1단계: 그룹 pill 목록 */}
      <div className="flex flex-wrap gap-2">
        {groupEntries.map(([groupId, { groupName, items }]) => {
          const selectedInGroup = selectedFinishings.find((sf) =>
            items.some((i) => i.id === sf.id),
          );
          const isExpanded = expandedGroupId === groupId;

          // 소분류 1개: 바로 토글 가능한 단순 pill
          if (items.length === 1) {
            const item = items[0];
            const isSelected = !!selectedInGroup;
            const unitPrice = resolveFinishingPrice(item, selectedSpecificationId);
            return (
              <button
                key={groupId}
                type="button"
                onClick={() => onToggle(item, !isSelected)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10pt] transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
                )}
              >
                <span>{item.name}</span>
                {unitPrice > 0 && (
                  <span className={cn('text-[9pt]', isSelected ? 'text-primary/80' : 'text-gray-400')}>
                    +{unitPrice.toLocaleString()}원
                  </span>
                )}
                {isSelected && <Check className="h-3 w-3 flex-shrink-0" />}
              </button>
            );
          }

          // 소분류 2개 이상: 그룹 pill → 클릭 시 소분류 패널 펼침
          return (
            <button
              key={groupId}
              type="button"
              onClick={() => setExpandedGroupId(isExpanded ? null : groupId)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10pt] transition-colors',
                selectedInGroup
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : isExpanded
                    ? 'border-gray-400 bg-gray-50 text-gray-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
              )}
            >
              <span>{groupName}</span>
              {selectedInGroup ? (
                <span className="text-[9pt] opacity-70">· {selectedInGroup.name}</span>
              ) : (
                <span className="text-[8pt] text-gray-400">{items.length}개</span>
              )}
              {isExpanded
                ? <ChevronUp className="h-3 w-3 flex-shrink-0" />
                : <ChevronDown className="h-3 w-3 flex-shrink-0" />
              }
            </button>
          );
        })}
      </div>

      {/* 2단계: 펼쳐진 소분류 패널 */}
      {expandedGroupId && groups.has(expandedGroupId) && (() => {
        const { groupName, items } = groups.get(expandedGroupId)!;
        const selectedInGroup = selectedFinishings.find((sf) =>
          items.some((i) => i.id === sf.id),
        );
        return (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 space-y-1">
            <p className="text-[9pt] text-gray-400 px-1 pb-0.5">{groupName} 세부 옵션</p>
            {items.map((item) => {
              const isSelected = selectedFinishings.some((f) => f.id === item.id);
              const unitPrice = resolveFinishingPrice(item, selectedSpecificationId);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onToggle(item, false);
                      // 선택 해제 시 패널 유지 (다른 옵션 선택 가능)
                    } else {
                      if (selectedInGroup) onToggle(selectedInGroup, false);
                      onToggle(item, true);
                      setExpandedGroupId(null); // 선택 완료 → 패널 닫기
                    }
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-md border text-[10pt] transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-transparent bg-white text-gray-700 hover:border-gray-300 hover:bg-white',
                  )}
                >
                  <span>{item.name}</span>
                  <div className="flex items-center gap-2">
                    {unitPrice > 0 && (
                      <span className={cn('text-[9pt]', isSelected ? 'text-primary/80' : 'text-gray-400')}>
                        +{unitPrice.toLocaleString()}원
                      </span>
                    )}
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

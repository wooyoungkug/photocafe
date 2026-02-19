'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductFinishing, FinishingSetting } from '@/lib/types';

interface OptionFinishingProps {
  finishings: ProductFinishing[];
  selectedFinishings: ProductFinishing[];
  onToggle: (finishing: ProductFinishing, checked: boolean) => void;
  selectedSpecificationId?: string;
}

/** 규격별 단가 조회 (ProductFinishing 기준) */
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
    if (specPrice) return Number(specPrice.price);
  }

  return setting.basePrice > 0 ? setting.basePrice : finishing.price;
}

/** 규격별 단가 조회 (Setting 기준) */
function resolveSettingPrice(
  setting: FinishingSetting,
  specificationId?: string,
): number {
  if (specificationId && setting.prices && setting.prices.length > 0) {
    const specPrice = setting.prices.find(
      (p) => p.specificationId === specificationId,
    );
    if (specPrice) return Number(specPrice.price);
  }
  return Number(setting.basePrice);
}

// ---------- 그룹 데이터 구성 ----------
type FinishingGroup = {
  groupId: string;
  groupName: string;
  isGrouped: boolean;
  items: ProductFinishing[];
  activeSettings: FinishingSetting[];
};

function buildGroups(finishings: ProductFinishing[]): FinishingGroup[] {
  const map = new Map<string, FinishingGroup>();

  for (const f of finishings) {
    if (f.productionGroup) {
      const key = f.productionGroup.id;
      if (!map.has(key)) {
        map.set(key, {
          groupId: key,
          groupName: f.productionGroup.name,
          isGrouped: true,
          items: [],
          activeSettings: [], // 아이템 수집 후 후처리
        });
      }
      map.get(key)!.items.push(f);
    } else {
      const key = `__solo__${f.id}`;
      map.set(key, {
        groupId: key,
        groupName: f.name,
        isGrouped: false,
        items: [f],
        activeSettings: [],
      });
    }
  }

  // 후처리: 관리자가 선택한 세팅값만 표시 (매칭 없으면 전체 표시 - 하위 호환)
  for (const group of map.values()) {
    if (!group.isGrouped || group.items.length === 0) continue;
    const allGroupSettings = (group.items[0].productionGroup?.settings || []).filter(
      (s) => s.isActive !== false,
    );
    const savedNames = new Set(group.items.map((i) => i.name));
    const matchingSettings = allGroupSettings.filter((s) =>
      savedNames.has(s.settingName ?? ''),
    );
    group.activeSettings = matchingSettings.length > 0 ? matchingSettings : allGroupSettings;
  }

  return Array.from(map.values());
}

// ---------- 메인 컴포넌트 ----------
export function OptionFinishing({
  finishings,
  selectedFinishings,
  onToggle,
  selectedSpecificationId,
}: OptionFinishingProps) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  if (!finishings || finishings.length === 0) return null;

  const groups = buildGroups(finishings);

  const toggleExpand = (groupId: string) => {
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  /** Settings 없는 그룹: ProductFinishing 아이템 단위 선택 */
  const handleSelectItem = (
    item: ProductFinishing,
    currentSelected: ProductFinishing | undefined,
  ) => {
    const isSelected = currentSelected?.id === item.id;
    if (isSelected) {
      onToggle(item, false);
    } else {
      if (currentSelected) onToggle(currentSelected, false);
      onToggle(item, true);
      setExpandedGroupId(null);
    }
  };

  /**
   * Settings 있는 그룹: Setting 단위 선택
   * - Setting 선택 시, baseFinishing의 name을 setting.settingName으로 교체한
   *   virtual finishing을 생성해서 onToggle에 전달
   * - page.tsx의 totalPrice 계산 로직(finishing.name === setting.settingName)이 그대로 동작
   */
  const handleSelectSetting = (
    group: FinishingGroup,
    setting: FinishingSetting,
    currentSelected: ProductFinishing | undefined,
  ) => {
    const baseFinishing = group.items[0];
    const isSelected = currentSelected?.name === setting.settingName;

    if (isSelected) {
      onToggle(currentSelected!, false);
    } else {
      if (currentSelected) onToggle(currentSelected, false);
      const virtualFinishing: ProductFinishing = {
        ...baseFinishing,
        name: setting.settingName ?? setting.codeName ?? setting.id,
      };
      onToggle(virtualFinishing, true);
      setExpandedGroupId(null);
    }
  };

  const expandedGroup = expandedGroupId
    ? groups.find((g) => g.groupId === expandedGroupId) ?? null
    : null;

  return (
    <div className="space-y-2">
      {/* ── 1단계: 중분류 선택 버튼 목록 ── */}
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => {
          const selectedInGroup = selectedFinishings.find((sf) =>
            group.items.some((i) => i.id === sf.id),
          );
          const isExpanded = expandedGroupId === group.groupId;
          const useSettingsMode = group.activeSettings.length > 0;

          // productionGroup 없는 단독 항목 → 바로 토글
          if (!group.isGrouped) {
            const item = group.items[0];
            const isSelected = !!selectedInGroup;
            const price = resolveFinishingPrice(item, selectedSpecificationId);
            return (
              <button
                key={group.groupId}
                type="button"
                onClick={() => onToggle(item, !isSelected)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded border text-[10pt] transition-colors',
                  isSelected
                    ? 'border-primary bg-transparent text-gray-900 font-medium'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
                )}
              >
                <span>{item.name}</span>
                {price > 0 && (
                  <span className={cn('text-[9pt]', isSelected ? 'text-gray-600' : 'text-gray-400')}>
                    +{price.toLocaleString()}원
                  </span>
                )}
                {isSelected
                  ? <X className="h-3 w-3 flex-shrink-0" />
                  : <Check className="h-3 w-3 flex-shrink-0 opacity-0" />
                }
              </button>
            );
          }

          // 중분류 그룹 → 아코디언 트리거
          const count = useSettingsMode ? group.activeSettings.length : group.items.length;
          return (
            <button
              key={group.groupId}
              type="button"
              onClick={() => toggleExpand(group.groupId)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded border text-[10pt] transition-colors',
                selectedInGroup
                  ? 'border-primary bg-transparent text-gray-900 font-medium'
                  : isExpanded
                    ? 'border-gray-400 bg-gray-50 text-gray-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
              )}
            >
              {/* 중분류명 */}
              <span>{group.groupName}</span>

              {/* 선택된 값 표시 */}
              {selectedInGroup ? (
                <>
                  <span className="text-[9pt] opacity-60">·</span>
                  <span className="text-[9pt]">{selectedInGroup.name}</span>
                  <span
                    role="button"
                    aria-label="선택 해제"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(selectedInGroup, false);
                    }}
                    className="flex items-center justify-center h-4 w-4 rounded-sm hover:bg-primary/20 flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </>
              ) : (
                <span className="text-[8pt] text-gray-400">{count}종</span>
              )}

              {isExpanded
                ? <ChevronUp className="h-3 w-3 flex-shrink-0 ml-0.5" />
                : <ChevronDown className="h-3 w-3 flex-shrink-0 ml-0.5" />
              }
            </button>
          );
        })}
      </div>

      {/* ── 2단계: 아코디언 패널 ── */}
      {expandedGroup && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
          {/* 패널 헤더 */}
          <div className="px-3 py-2 border-b border-gray-200 bg-white">
            <span className="text-[9pt] text-gray-500 font-medium">
              {expandedGroup.groupName} 종류 선택
            </span>
          </div>

          {/* 옵션 목록 */}
          <div className="p-2 space-y-1">
            {(() => {
              const selectedInGroup = selectedFinishings.find((sf) =>
                expandedGroup.items.some((i) => i.id === sf.id),
              );
              const useSettingsMode = expandedGroup.activeSettings.length > 0;

              if (useSettingsMode) {
                // Settings 모드: productionGroup.settings를 라디오로 표시
                return expandedGroup.activeSettings.map((setting) => {
                  const isSelected = selectedInGroup?.name === setting.settingName;
                  const price = resolveSettingPrice(setting, selectedSpecificationId);
                  return (
                    <button
                      key={setting.id}
                      type="button"
                      onClick={() => handleSelectSetting(expandedGroup, setting, selectedInGroup)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-md border transition-colors text-left',
                        isSelected
                          ? 'border-primary bg-transparent text-gray-900'
                          : 'border-transparent bg-white text-gray-700 hover:border-gray-200 hover:bg-white',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-gray-300 bg-white',
                          )}
                        >
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                          )}
                        </span>
                        <span className={cn('text-[10pt]', isSelected && 'font-medium')}>
                          {setting.settingName ?? setting.codeName}
                        </span>
                      </div>
                      {price > 0 && (
                        <span className={cn(
                          'text-[9pt] flex-shrink-0',
                          isSelected ? 'text-gray-600' : 'text-gray-400',
                        )}>
                          +{price.toLocaleString()}원
                        </span>
                      )}
                    </button>
                  );
                });
              }

              // Items 모드: ProductFinishing 아이템을 라디오로 표시 (기존)
              return expandedGroup.items.map((item) => {
                const isSelected = selectedInGroup?.id === item.id;
                const price = resolveFinishingPrice(item, selectedSpecificationId);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item, selectedInGroup)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-md border transition-colors text-left',
                      isSelected
                        ? 'border-primary bg-transparent text-gray-900'
                        : 'border-transparent bg-white text-gray-700 hover:border-gray-200 hover:bg-white',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                          isSelected
                            ? 'border-primary bg-primary'
                            : 'border-gray-300 bg-white',
                        )}
                      >
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                        )}
                      </span>
                      <span className={cn('text-[10pt]', isSelected && 'font-medium')}>
                        {item.name}
                      </span>
                    </div>
                    {price > 0 && (
                      <span className={cn(
                        'text-[9pt] flex-shrink-0',
                        isSelected ? 'text-gray-600' : 'text-gray-400',
                      )}>
                        +{price.toLocaleString()}원
                      </span>
                    )}
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

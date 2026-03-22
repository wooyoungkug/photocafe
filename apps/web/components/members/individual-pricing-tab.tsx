'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
// Table 컴포넌트 사용 안 함 - 표준단가와 동일한 raw table 사용
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  useProductionGroupTree,
  type ProductionGroup,
} from '@/hooks/use-production';
import {
  useClientProductionSettingPrices,
  useClientProductionSettingSummary,
  useSetClientProductionSettingPrices,
  useDeleteClientProductionSettingPrices,
} from '@/hooks/use-pricing';
import { usePapersByPrintMethod } from '@/hooks/use-paper';
import {
  Loader2,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Save,
  X,
  Check,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
// SPEC_PURPOSE_LABELS → PRINT_METHOD_LABELS로 대체 (pricing-constants에서 import)

// 공통 상수/유틸리티 (중복 제거 → 공유 모듈에서 import)
import {
  PRINT_METHOD_LABELS,
  PRICE_GROUP_STYLES,
} from '@/components/pricing/pricing-constants';
import { formatNumber } from '@/components/pricing/pricing-utils';

interface IndividualPricingTabProps {
  clientId: string;
  clientName: string;
}

// 트리 노드 컴포넌트
function TreeNode({
  group,
  expandedIds,
  toggleExpand,
  selectedGroupId,
  onSelectGroup,
  configuredSettingIds,
  level = 0,
}: {
  group: ProductionGroup;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  selectedGroupId: string | null;
  onSelectGroup: (group: ProductionGroup) => void;
  configuredSettingIds: Set<string>;
  level?: number;
}) {
  const isExpanded = expandedIds.has(group.id);
  const hasChildren = group.children && group.children.length > 0;
  const isSelected = selectedGroupId === group.id;
  const depth = group.depth || 1;

  // 이 그룹 또는 하위 그룹에 설정된 개별단가가 있는지 확인
  const hasConfiguredPrice = useMemo(() => {
    const checkGroup = (g: ProductionGroup): boolean => {
      if (g.settings?.some((s: any) => configuredSettingIds.has(s.id))) return true;
      if (g.children) return g.children.some(checkGroup);
      return false;
    };
    return checkGroup(group);
  }, [group, configuredSettingIds]);

  return (
    <div className="relative">
      <div
        className={cn(
          "group flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-200 border",
          isSelected
            ? "bg-indigo-50 border-indigo-200 shadow-sm"
            : "hover:bg-gray-50 border-transparent hover:border-gray-100"
        )}
        style={{ marginLeft: `${level * 20}px` }}
        onClick={() => onSelectGroup(group)}
      >
        {/* 확장 버튼 */}
        <div
          className={cn(
            "flex items-center justify-center w-5 h-5 rounded-md transition-colors",
            hasChildren ? "hover:bg-black/5 cursor-pointer" : "pointer-events-none"
          )}
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              toggleExpand(group.id);
            }
          }}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 text-gray-500" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-400" />
            )
          )}
        </div>

        {/* 폴더 아이콘 */}
        <div className={cn(
          "flex items-center justify-center w-5 h-5 rounded-md shrink-0",
          isSelected
            ? "bg-indigo-100 text-indigo-600"
            : "bg-gray-100 text-gray-500"
        )}>
          {isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5" />
          ) : (
            <Folder className="h-3.5 w-3.5" />
          )}
        </div>

        {/* 이름 */}
        <span className={cn(
          "truncate text-sm",
          isSelected ? "text-indigo-900 font-medium" : "text-gray-700"
        )}>
          {group.name}
        </span>

        {/* 개별단가 설정됨 표시 */}
        {hasConfiguredPrice && (
          <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5 bg-orange-100 text-orange-700 border-orange-200">
            개별단가
          </Badge>
        )}
      </div>

      {/* 하위 그룹 */}
      {isExpanded && hasChildren && (
        <div className="mt-0.5">
          {group.children?.map((child) => (
            <TreeNode
              key={child.id}
              group={child}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              selectedGroupId={selectedGroupId}
              onSelectGroup={onSelectGroup}
              configuredSettingIds={configuredSettingIds}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function IndividualPricingTab({ clientId, clientName }: IndividualPricingTabProps) {
  const [selectedProductionGroupId, setSelectedProductionGroupId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(null);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data: productionTree, isLoading: treeLoading } = useProductionGroupTree();
  const { data: clientPrices, isLoading: pricesLoading } = useClientProductionSettingPrices(clientId);
  const { data: priceSummary } = useClientProductionSettingSummary(clientId);
  const setClientPricesMutation = useSetClientProductionSettingPrices();
  const deleteClientPricesMutation = useDeleteClientProductionSettingPrices();
  const { data: indigoPapers } = usePapersByPrintMethod('indigo');
  const { data: inkjetPapers } = usePapersByPrintMethod('inkjet');
  const { toast } = useToast();

  // 용지 ID -> 용지 정보 맵
  const papersMap = useMemo(() => {
    const map = new Map<string, any>();
    if (indigoPapers) {
      indigoPapers.forEach((paper: any) => map.set(paper.id, paper));
    }
    if (inkjetPapers) {
      inkjetPapers.forEach((paper: any) => map.set(paper.id, paper));
    }
    return map;
  }, [indigoPapers, inkjetPapers]);

  // 설정된 개별단가가 있는 생산설정 ID 집합
  const configuredSettingIds = useMemo(() => {
    const ids = new Set<string>();
    priceSummary?.forEach((s) => ids.add(s.productionSettingId));
    return ids;
  }, [priceSummary]);

  // 클라이언트 단가 맵
  const clientPricesMap = useMemo(() => {
    const map = new Map<string, any>();
    if (clientPrices) {
      clientPrices.forEach((cp: any) => {
        const key = cp.priceGroupId
          ? `${cp.productionSettingId}_${cp.priceGroupId}_${cp.minQuantity || ''}`
          : `${cp.productionSettingId}_${cp.minQuantity || ''}_${cp.specificationId || ''}`;
        map.set(key, cp);
      });
    }
    return map;
  }, [clientPrices]);

  // 트리 확장/축소
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 모든 노드 확장
  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (groups: ProductionGroup[]) => {
      groups.forEach(g => {
        allIds.add(g.id);
        if (g.children) collectIds(g.children);
      });
    };
    if (productionTree) collectIds(productionTree);
    setExpandedIds(allIds);
  };

  // 선택된 생산 그룹 찾기
  const findSelectedGroup = (groups: ProductionGroup[], id: string): ProductionGroup | null => {
    for (const group of groups) {
      if (group.id === id) return group;
      if (group.children) {
        const found = findSelectedGroup(group.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedProductionGroup = useMemo(() => {
    if (!selectedProductionGroupId || !productionTree) return null;
    return findSelectedGroup(productionTree, selectedProductionGroupId);
  }, [selectedProductionGroupId, productionTree]);

  // 단가 저장 핸들러
  const handleSavePrices = async (settingId: string, pricesData: any[]) => {
    if (!clientId || pricesData.length === 0) return;

    setIsSaving(true);
    try {
      await setClientPricesMutation.mutateAsync({
        clientId,
        productionSettingId: settingId,
        prices: pricesData,
      });

      toast({
        title: '저장 완료',
        description: '개별 단가가 저장되었습니다.',
      });

      // 편집 상태 초기화
      setEditingPrices(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (key.startsWith(settingId + '_')) {
            delete next[key];
          }
        });
        return next;
      });
    } catch (error) {
      toast({
        title: '저장 실패',
        description: '개별 단가 저장에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 단가 삭제 핸들러
  const handleDeletePrices = async (settingId: string) => {
    if (!clientId) return;

    try {
      await deleteClientPricesMutation.mutateAsync({
        clientId,
        productionSettingId: settingId,
      });

      toast({
        title: '삭제 완료',
        description: '개별 단가가 삭제되었습니다.',
      });
    } catch (error) {
      toast({
        title: '삭제 실패',
        description: '개별 단가 삭제에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 그룹별 가격 저장 핸들러
  const handleSaveGroupPrices = async (settingId: string, priceGroups: any[], printMethod?: string) => {
    const prices: any[] = [];

    priceGroups.forEach((group: any) => {
      const upPrices = group.upPrices || [];

      upPrices.forEach((upPrice: any) => {
        const baseKey = `${settingId}_${group.id}_${upPrice.up}_`;
        const fourColorSingle = editingPrices[`${baseKey}fourColorSinglePrice`];
        const fourColorDouble = editingPrices[`${baseKey}fourColorDoublePrice`];
        const sixColorSingle = editingPrices[`${baseKey}sixColorSinglePrice`];
        const sixColorDouble = editingPrices[`${baseKey}sixColorDoublePrice`];

        if (fourColorSingle || fourColorDouble || sixColorSingle || sixColorDouble) {
          prices.push({
            priceGroupId: group.id,
            minQuantity: upPrice.up,
            fourColorSinglePrice: fourColorSingle ? parseFloat(fourColorSingle) : undefined,
            fourColorDoublePrice: fourColorDouble ? parseFloat(fourColorDouble) : undefined,
            sixColorSinglePrice: sixColorSingle ? parseFloat(sixColorSingle) : undefined,
            sixColorDoublePrice: sixColorDouble ? parseFloat(sixColorDouble) : undefined,
          });
        }
      });

      // 잉크젯: specPrices 처리
      const specPrices = group.specPrices || [];
      specPrices.forEach((specPrice: any) => {
        const baseKey = `${settingId}_${group.id}_${specPrice.specId}_`;
        const price = editingPrices[`${baseKey}price`];
        const singlePrice = editingPrices[`${baseKey}singleSidedPrice`];
        const doublePrice = editingPrices[`${baseKey}doubleSidedPrice`];

        if (price || singlePrice || doublePrice) {
          prices.push({
            priceGroupId: group.id,
            specificationId: specPrice.specId,
            price: price ? parseFloat(price) : undefined,
            singleSidedPrice: singlePrice ? parseFloat(singlePrice) : undefined,
            doubleSidedPrice: doublePrice ? parseFloat(doublePrice) : undefined,
          });
        }
      });
    });

    if (prices.length > 0) {
      await handleSavePrices(settingId, prices);
    }
  };

  // 편집 중인지 확인
  const hasEditingPricesForSetting = (settingId: string) => {
    return Object.keys(editingPrices).some(key => key.startsWith(settingId + '_'));
  };

  if (treeLoading || pricesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50/70 to-transparent border rounded-xl">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold text-orange-700">개별 단가 설정</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            전체 펼치기
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExpandedIds(new Set())}>
            전체 접기
          </Button>
        </div>
      </div>

      {/* 개별단가 설정 현황 */}
      {priceSummary && priceSummary.length > 0 && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <h4 className="text-sm font-medium text-orange-800 mb-2">
            설정된 개별단가 ({priceSummary.length}개)
          </h4>
          <div className="flex flex-wrap gap-2">
            {priceSummary.map((s) => (
              <Badge
                key={s.productionSettingId}
                variant="outline"
                className="bg-white border-orange-300 text-orange-700"
              >
                {s.group?.name} &gt; {s.settingName || s.codeName}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 메인 영역 */}
      <div className="grid grid-cols-3 gap-4 min-h-[400px]">
        {/* 왼쪽: 생산그룹 트리 */}
        <div className="col-span-1 border rounded-lg p-3 bg-white overflow-y-auto max-h-[500px]">
          <div className="text-xs font-medium text-gray-500 mb-2 px-2">생산 카테고리</div>
          {productionTree?.map((group) => (
            <TreeNode
              key={group.id}
              group={group}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              selectedGroupId={selectedProductionGroupId}
              onSelectGroup={(g) => {
                setSelectedProductionGroupId(g.id);
                setSelectedSettingId(null);
              }}
              configuredSettingIds={configuredSettingIds}
            />
          ))}
        </div>

        {/* 오른쪽: 선택된 그룹의 설정 목록 및 단가 편집 */}
        <div className="col-span-2 border rounded-lg p-4 bg-white overflow-y-auto max-h-[500px]">
          {!selectedProductionGroup ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Folder className="h-12 w-12 mb-4 opacity-30" />
              <p>왼쪽에서 생산 카테고리를 선택하세요</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{selectedProductionGroup.name}</h4>
                {(selectedProductionGroup.settings?.length ?? 0) > 0 && (
                  <span className="text-xs text-gray-500">
                    {selectedProductionGroup.settings?.length}개 설정
                  </span>
                )}
              </div>

              {selectedProductionGroup.settings && selectedProductionGroup.settings.length > 0 ? (
                <Accordion type="multiple" className="space-y-2">
                  {selectedProductionGroup.settings.map((setting: any) => {
                    const isConfigured = configuredSettingIds.has(setting.id);
                    const hasEditing = hasEditingPricesForSetting(setting.id);
                    const priceGroups = setting.priceGroups || [];

                    return (
                      <AccordionItem
                        key={setting.id}
                        value={setting.id}
                        className={cn(
                          "border rounded-lg overflow-hidden",
                          isConfigured ? "border-orange-300 bg-orange-50/50" : "border-gray-200"
                        )}
                      >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center gap-3 w-full">
                            <div className="flex-1 text-left">
                              <span className="font-medium text-sm">{setting.settingName || setting.codeName}</span>
                              {setting.printMethod && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({PRINT_METHOD_LABELS[setting.printMethod] || setting.printMethod})
                                </span>
                              )}
                            </div>
                            {isConfigured && (
                              <Badge className="bg-orange-500 text-white text-[10px]">
                                <Check className="h-3 w-3 mr-1" />
                                설정됨
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          {priceGroups.length > 0 ? (
                            <div className="space-y-4">
                              {priceGroups.map((group: any) => {
                                const style = PRICE_GROUP_STYLES[group.colorCode] || PRICE_GROUP_STYLES.none;
                                const upPrices = group.upPrices || [];
                                const specPrices = group.specPrices || [];

                                return (
                                  <div
                                    key={group.id}
                                    className={cn("p-3 rounded-lg border", style.bg, style.border)}
                                  >
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className={cn("w-2 h-2 rounded-full", style.dot)} />
                                      <span className={cn("font-medium text-sm", style.text)}>
                                        {group.name}
                                      </span>
                                    </div>

                                    {/* 인디고 UP별 가격 (표준단가와 동일 레이아웃) */}
                                    {upPrices.length > 0 && (
                                      <div className="border border-gray-200 overflow-hidden">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="bg-gray-100 border-b border-gray-200">
                                              <th className="text-center py-1 px-1 font-medium text-gray-600">Up</th>
                                              <th className="text-center py-1 px-1 font-medium text-gray-400 text-[10px]">가중치</th>
                                              <th className="text-center py-1 px-1 font-medium text-gray-600">4도단면</th>
                                              <th className="text-center py-1 px-1 font-medium text-gray-600">4도양면</th>
                                              <th className="text-center py-1 px-1 font-medium text-gray-600">6도단면</th>
                                              <th className="text-center py-1 px-1 font-medium text-gray-600">6도양면</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {upPrices.map((up: any, idx: number) => {
                                              const isBase = idx === 0;
                                              const baseKey = `${setting.id}_${group.id}_${up.up}_`;
                                              const savedPrice = clientPricesMap.get(`${setting.id}_${group.id}_${up.up}`);

                                              return (
                                                <tr key={up.up} className={cn("border-b border-gray-100 last:border-0", isBase && "bg-amber-50/50")}>
                                                  <td className="text-center py-0.5 px-0.5 font-medium text-indigo-600">{up.nupKey || `${up.up}up`}</td>
                                                  <td className="text-center px-0.5 py-0.5">
                                                    <span className="text-[11px] text-gray-400">{up.weight || 1.0}</span>
                                                  </td>
                                                  {(['fourColorSinglePrice', 'fourColorDoublePrice', 'sixColorSinglePrice', 'sixColorDoublePrice'] as const).map((field) => {
                                                    const standardPrice = up[field] || 0;
                                                    const key = `${baseKey}${field}`;
                                                    return (
                                                      <td key={field} className="px-0.5 py-0.5">
                                                        <div className="flex flex-col items-center">
                                                          <Input
                                                            type="number"
                                                            className={cn(
                                                              "h-8 w-16 text-sm text-center rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                                              isBase
                                                                ? "bg-amber-100 border-amber-300 font-medium focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                                                                : "bg-white border-slate-200 hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                                                            )}
                                                            value={editingPrices[key] ?? (savedPrice?.[field] ? String(savedPrice[field]) : '')}
                                                            onChange={(e) => setEditingPrices(prev => ({
                                                              ...prev,
                                                              [key]: e.target.value
                                                            }))}
                                                            placeholder={standardPrice > 0 ? String(standardPrice) : "0"}
                                                          />
                                                        </div>
                                                      </td>
                                                    );
                                                  })}
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}

                                    {/* 잉크젯 규격별 가격 (표준단가와 동일 레이아웃) */}
                                    {specPrices.length > 0 && (
                                      <div className="border overflow-hidden bg-white/50">
                                        <table className="w-full text-[10px]">
                                          <thead className="bg-gray-100">
                                            <tr className="border-b">
                                              <th className="px-1 py-1 text-center">규격</th>
                                              <th className="px-1 py-1 text-center w-12">가중치</th>
                                              <th className="px-1 py-1 text-center w-14">표준</th>
                                              <th className="px-1 py-1 text-center w-16">개별단가</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {specPrices.map((spec: any) => {
                                              const baseKey = `${setting.id}_${group.id}_${spec.specId}_`;
                                              const savedPrice = clientPricesMap.get(`${setting.id}_${group.id}_${spec.specId}`);
                                              const paper = papersMap.get(spec.paperId);
                                              const standardPrice = spec.singleSidedPrice || 0;

                                              return (
                                                <tr key={spec.specId} className="border-b">
                                                  <td className="px-1 py-0.5 text-center font-mono">
                                                    {paper?.name || spec.specName || spec.specId?.slice(-6)}
                                                  </td>
                                                  <td className="px-1 py-0.5 text-center text-gray-400">
                                                    {spec.weight != null ? spec.weight : '1.0'}
                                                  </td>
                                                  <td className="px-1 py-0.5 text-center text-gray-400 font-mono">
                                                    {standardPrice > 0 ? formatNumber(standardPrice) : '-'}
                                                  </td>
                                                  <td className="px-1 py-0.5 text-center">
                                                    <Input
                                                      type="number"
                                                      className="h-5 w-14 text-[10px] text-center p-0 bg-gray-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                      value={editingPrices[`${baseKey}price`] ?? (savedPrice?.price ? String(Number(savedPrice.price)) : '')}
                                                      onChange={(e) => setEditingPrices(prev => ({
                                                        ...prev,
                                                        [`${baseKey}price`]: e.target.value
                                                      }))}
                                                      placeholder={standardPrice > 0 ? String(standardPrice) : "0"}
                                                    />
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* 저장/삭제 버튼 */}
                              <div className="flex justify-end gap-2 pt-2">
                                {isConfigured && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleDeletePrices(setting.id)}
                                    disabled={deleteClientPricesMutation.isPending}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                    삭제
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveGroupPrices(setting.id, priceGroups, setting.printMethod)}
                                  disabled={isSaving || !hasEditing}
                                >
                                  {isSaving ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                  ) : (
                                    <Save className="h-3.5 w-3.5 mr-1" />
                                  )}
                                  저장
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">단가 그룹이 없습니다</p>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">이 카테고리에 설정이 없습니다</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

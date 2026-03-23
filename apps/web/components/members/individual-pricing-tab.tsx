'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useProductionGroupTree,
  type ProductionGroup,
} from '@/hooks/use-production';
import {
  useClientProductionSettingPrices,
  useClientProductionSettingSummary,
  useSetClientProductionSettingPrices,
  useDeleteClientProductionSettingPrices,
  useCloneStandardToClientPrices,
  useCloneGroupToClientPrices,
  useCloneAllToClient,
  useApplyWeightAllToClient,
  useGroupProductionSettingPrices,
} from '@/hooks/use-pricing';
import { usePapersByPrintMethod } from '@/hooks/use-paper';
import Link from 'next/link';
import { Edit, Trash2, Copy, Percent, ExternalLink } from 'lucide-react';
import {
  Loader2,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Settings2,
  Save,
  ArrowLeft,
  SlidersHorizontal,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  PRICING_TYPE_LABELS,
  PRINT_METHOD_LABELS,
  PRICE_GROUP_STYLES,
  NUP_TO_COUNT,
  NUP_ORDER,
} from '@/components/pricing/pricing-constants';
import { formatNumber, getFixedPrintSide } from '@/components/pricing/pricing-utils';

interface IndividualPricingTabProps {
  clientId: string;
  clientName: string;
  groupId?: string;
  groupName?: string;
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
  const settingsCount = group.settings?.length || 0;

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
      {level > 0 && (
        <div
          className="absolute left-[-12px] top-0 bottom-0 w-px bg-gray-100"
          style={{ height: '100%' }}
        />
      )}
      <div
        className={cn(
          "group flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-200 border",
          isSelected
            ? "bg-indigo-50 border-indigo-200 shadow-sm"
            : "hover:bg-gray-50 border-transparent hover:border-gray-100"
        )}
        style={{ marginLeft: `${level * 24}px` }}
        onClick={() => onSelectGroup(group)}
      >
        <div
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-md transition-colors",
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
              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600" />
            )
          )}
        </div>

        <div className={cn(
          "flex items-center justify-center w-6 h-6 rounded-md shrink-0 transition-colors",
          isSelected
            ? (depth === 1 ? "bg-indigo-100 text-indigo-600" : "bg-white text-indigo-500 shadow-sm border border-indigo-100")
            : (depth === 1 ? "bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm" : "bg-transparent text-gray-400 group-hover:text-gray-500")
        )}>
          {isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className={cn(
              "truncate font-medium transition-colors",
              isSelected ? "text-indigo-900" : "text-gray-700 group-hover:text-gray-900",
              depth === 1 ? "text-sm" : "text-[13px]"
            )}>
              {group.name}
              {hasChildren && (
                <span className="ml-1.5 text-[11px] text-gray-400 font-normal">
                  {group.children?.length}
                </span>
              )}
            </span>
            {hasConfiguredPrice && (
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            )}
          </div>
        </div>

        {settingsCount > 0 && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-slate-100 text-slate-500">
            {settingsCount}개 설정
          </Badge>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="relative pl-3 mt-0.5">
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

export function IndividualPricingTab({ clientId, clientName, groupId, groupName }: IndividualPricingTabProps) {
  const [selectedProductionGroupId, setSelectedProductionGroupId] = useState<string | null>(null);
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 단가 편집 상태
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // 단가 맞춤 다이얼로그 상태
  const [isPriceAdjustDialogOpen, setIsPriceAdjustDialogOpen] = useState(false);
  const [priceAdjustRanges, setPriceAdjustRanges] = useState([
    { maxPrice: 500, adjustment: 10 },
    { maxPrice: 1000, adjustment: 50 },
    { maxPrice: Infinity, adjustment: 100 },
  ]);
  const [priceAdjustSettingId, setPriceAdjustSettingId] = useState<string | null>(null);
  const [priceAdjustPriceGroups, setPriceAdjustPriceGroups] = useState<any[]>([]);
  const [priceAdjustPrintMethod, setPriceAdjustPrintMethod] = useState<string>('indigo');

  // 가중치 상태
  const [weights, setWeights] = useState<Record<string, number>>({});

  // 전체 가중치 적용 다이얼로그
  const [isBulkWeightDialogOpen, setIsBulkWeightDialogOpen] = useState(false);
  const [bulkWeightPercent, setBulkWeightPercent] = useState<number>(85);

  // 전체 단가맞춤 다이얼로그
  const [isBulkAdjustDialogOpen, setIsBulkAdjustDialogOpen] = useState(false);
  const [bulkAdjustRanges, setBulkAdjustRanges] = useState([
    { maxPrice: 500, adjustment: 10 },
    { maxPrice: 1000, adjustment: 50 },
    { maxPrice: Infinity, adjustment: 100 },
  ]);

  // 잉크젯 단가 입력 모달
  const [isInkjetPriceDialogOpen, setIsInkjetPriceDialogOpen] = useState(false);
  const [inkjetDialogSetting, setInkjetDialogSetting] = useState<any>(null);

  // 초기화 확인 다이얼로그
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const { data: productionTree, isLoading: treeLoading } = useProductionGroupTree();
  const { data: clientPrices, isLoading: clientPricesLoading } = useClientProductionSettingPrices(clientId);
  const { data: summaryData } = useClientProductionSettingSummary(clientId);
  const setClientPricesMutation = useSetClientProductionSettingPrices();
  const deleteClientPricesMutation = useDeleteClientProductionSettingPrices();
  const cloneStandardMutation = useCloneStandardToClientPrices();
  const cloneGroupMutation = useCloneGroupToClientPrices();
  const cloneAllMutation = useCloneAllToClient();
  const applyWeightAllMutation = useApplyWeightAllToClient();
  const { data: groupPrices } = useGroupProductionSettingPrices(groupId || '');
  const { data: indigoPapers } = usePapersByPrintMethod('indigo');
  const { data: inkjetPapers } = usePapersByPrintMethod('inkjet');
  const { data: albumPapers } = usePapersByPrintMethod('album');
  const { data: indigoAlbumPapers } = usePapersByPrintMethod('indigoAlbum');
  const { toast } = useToast();

  // 설정된 settingId 목록 (트리 마킹용)
  const configuredSettingIds = useMemo(() => {
    const ids = new Set<string>();
    if (summaryData) {
      summaryData.forEach((s: any) => ids.add(s.productionSettingId));
    }
    return ids;
  }, [summaryData]);

  // 용지 맵
  const papersMap = useMemo(() => {
    const map = new Map<string, any>();
    [indigoPapers, inkjetPapers, albumPapers, indigoAlbumPapers].forEach(papers => {
      if (papers) papers.forEach((p: any) => map.set(p.id, p));
    });
    return map;
  }, [indigoPapers, inkjetPapers, albumPapers, indigoAlbumPapers]);

  // 개별단가 맵
  const clientPricesMap = useMemo(() => {
    const map = new Map<string, any>();
    if (clientPrices) {
      clientPrices.forEach((cp: any) => {
        if (cp.priceGroupId && cp.specificationId) {
          map.set(`${cp.productionSettingId}_${cp.priceGroupId}_${cp.specificationId}`, cp);
        } else if (cp.priceGroupId) {
          const upKey = cp.nupKey || cp.minQuantity || '';
          map.set(`${cp.productionSettingId}_${cp.priceGroupId}_${upKey}`, cp);
        } else {
          map.set(`${cp.productionSettingId}_${cp.minQuantity || ''}_${cp.specificationId || ''}`, cp);
        }
      });
    }
    return map;
  }, [clientPrices]);

  // 그룹단가 맵 (참고용)
  const groupPricesMap = useMemo(() => {
    const map = new Map<string, any>();
    if (groupPrices) {
      groupPrices.forEach((gp: any) => {
        if (gp.priceGroupId && gp.specificationId) {
          map.set(`${gp.productionSettingId}_${gp.priceGroupId}_${gp.specificationId}`, gp);
        } else if (gp.priceGroupId) {
          const upKey = gp.nupKey || gp.minQuantity || '';
          map.set(`${gp.productionSettingId}_${gp.priceGroupId}_${upKey}`, gp);
        } else {
          map.set(`${gp.productionSettingId}_${gp.minQuantity || ''}_${gp.specificationId || ''}`, gp);
        }
      });
    }
    return map;
  }, [groupPrices]);

  // 가중치 계산
  useEffect(() => {
    if (!productionTree || !clientId) {
      setWeights({});
      return;
    }
    const calculatedWeights: Record<string, number> = {};
    const processGroup = (group: ProductionGroup) => {
      if (group.settings) {
        group.settings.forEach((setting: any) => {
          const priceGroups = setting.priceGroups || [];
          priceGroups.forEach((priceGroup: any) => {
            const upPrices = priceGroup.upPrices || [];
            const oneUpPrice = upPrices[0];
            if (!oneUpPrice) return;
            const baseKey = oneUpPrice.nupKey || oneUpPrice.up || 1;
            const savedPrice = clientPricesMap.get(`${setting.id}_${priceGroup.id}_${baseKey}`);
            if (!savedPrice) return;
            // 그룹단가 기준으로 가중치 역산, 없으면 표준단가
            const groupRec = groupPricesMap.get(`${setting.id}_${priceGroup.id}_${baseKey}`);
            const basePrice = (groupRec?.fourColorSinglePrice != null && groupRec.fourColorSinglePrice > 0) ? groupRec.fourColorSinglePrice : oneUpPrice.fourColorSinglePrice;
            const clientPrice = savedPrice.fourColorSinglePrice;
            if (basePrice > 0 && clientPrice > 0) {
              calculatedWeights[`${setting.id}_${priceGroup.id}`] = Math.round((clientPrice / basePrice) * 100);
            }
          });
        });
      }
      if (group.children) group.children.forEach(processGroup);
    };
    productionTree.forEach(processGroup);
    setWeights(calculatedWeights);
  }, [productionTree, clientPricesMap, clientId, groupPricesMap]);

  // 트리 확장/축소
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const collapseAll = () => setExpandedIds(new Set());

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

  // 단가 저장
  const handleSavePrices = async (settingId: string, pricesData: any[]) => {
    if (!clientId || pricesData.length === 0) return;
    setIsSaving(true);
    try {
      await setClientPricesMutation.mutateAsync({
        clientId,
        productionSettingId: settingId,
        prices: pricesData,
      });
      toast({ title: '저장 완료', description: '개별단가가 저장되었습니다.' });
      setEditingPrices(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (key.startsWith(settingId + '_')) delete next[key];
        });
        return next;
      });
    } catch {
      toast({ title: '저장 실패', description: '개별단가 저장에 실패했습니다.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const hasEditingPricesForSetting = (settingId: string) => {
    return Object.keys(editingPrices).some(key => key.startsWith(settingId + '_'));
  };

  // 표준단가 복사
  const handleCloneStandard = async (productionSettingId: string) => {
    if (!confirm('표준단가를 개별단가로 복사하시겠습니까?\n기존 개별단가가 있으면 덮어씁니다.')) return;
    try {
      await cloneStandardMutation.mutateAsync({ clientId, productionSettingId });
      toast({ title: '복사 완료', description: '표준단가가 개별단가로 복사되었습니다.' });
      setEditingPrices(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (key.startsWith(productionSettingId + '_')) delete next[key];
        });
        return next;
      });
    } catch {
      toast({ title: '복사 실패', variant: 'destructive' });
    }
  };

  // 그룹단가 복사 (개별 설정)
  const handleCloneGroup = async (productionSettingId: string) => {
    if (!groupId) {
      toast({ title: '소속 그룹이 없습니다.', variant: 'destructive' });
      return;
    }
    if (!confirm('그룹단가를 개별단가로 복사하시겠습니까?\n기존 개별단가가 있으면 덮어씁니다.')) return;
    try {
      await cloneGroupMutation.mutateAsync({ clientId, clientGroupId: groupId, productionSettingId });
      toast({ title: '복사 완료', description: '그룹단가가 개별단가로 복사되었습니다.' });
      setEditingPrices(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (key.startsWith(productionSettingId + '_')) delete next[key];
        });
        return next;
      });
    } catch {
      toast({ title: '복사 실패', variant: 'destructive' });
    }
  };

  // 개별단가 전체 초기화
  const handleResetAll = async () => {
    if (!clientPrices || clientPrices.length === 0) return;
    // settingId별로 그룹핑하여 삭제
    const settingIds = new Set<string>();
    clientPrices.forEach((cp: any) => settingIds.add(cp.productionSettingId));
    try {
      for (const settingId of settingIds) {
        await deleteClientPricesMutation.mutateAsync({ clientId, productionSettingId: settingId });
      }
      toast({ title: '초기화 완료', description: '모든 개별단가가 삭제되었습니다.' });
      setEditingPrices({});
      setWeights({});
      setIsResetDialogOpen(false);
    } catch {
      toast({ title: '초기화 실패', variant: 'destructive' });
    }
  };

  // 그룹별 가격 저장 핸들러
  const handleSaveGroupPrices = async (settingId: string, priceGroups: any[]) => {
    const prices: any[] = [];
    priceGroups.forEach((group: any) => {
      (group.upPrices || []).forEach((upPrice: any) => {
        const upKey = upPrice.nupKey || upPrice.up;
        const baseKey = `${settingId}_${group.id}_${upKey}`;
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
      (group.specPrices || []).forEach((specPrice: any) => {
        const specId = specPrice.specificationId;
        const key = `${settingId}_${group.id}_spec_${specId}`;
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
    if (prices.length > 0) {
      await handleSavePrices(settingId, prices);
    } else {
      toast({ title: '변경사항 없음', description: '수정된 단가가 없습니다.' });
    }
  };

  // 단가 맞춤 다이얼로그 열기
  const openPriceAdjustDialog = (settingId: string, priceGroups: any[], printMethod: string = 'indigo') => {
    setPriceAdjustSettingId(settingId);
    setPriceAdjustPriceGroups(priceGroups);
    setPriceAdjustPrintMethod(printMethod);
    setIsPriceAdjustDialogOpen(true);
  };

  // 잉크젯 단가 입력 다이얼로그 열기
  const openInkjetPriceDialog = (setting: any) => {
    setInkjetDialogSetting(setting);
    setIsInkjetPriceDialogOpen(true);
  };

  // 가중치 적용
  const applyWeight = (settingId: string, groupId2: string, upPrices: any[], weightPercent: number) => {
    const updates: Record<string, string> = {};
    const weight = weightPercent / 100;
    upPrices.forEach((upPrice: any) => {
      const upKey = upPrice.nupKey || upPrice.up;
      const groupRec = groupPricesMap.get(`${settingId}_${groupId2}_${upKey}`);
      ['fourColorSinglePrice', 'fourColorDoublePrice', 'sixColorSinglePrice', 'sixColorDoublePrice'].forEach(field => {
        // 그룹단가 기준, 없으면 표준단가 기준
        const basePrice = (groupRec?.[field] != null && groupRec[field] > 0) ? groupRec[field] : (upPrice[field] || 0);
        if (basePrice > 0) {
          updates[`${settingId}_${groupId2}_${upKey}_${field}`] = Math.round(basePrice * weight).toString();
        }
      });
    });
    setEditingPrices(prev => ({ ...prev, ...updates }));
    setWeights(prev => ({ ...prev, [`${settingId}_${groupId2}`]: weightPercent }));
    toast({ title: `가중치 ${weightPercent}% 적용`, description: `그룹단가의 ${weightPercent}%로 계산되었습니다.` });
  };

  // 잉크젯 가중치 적용
  const applyInkjetWeight = (settingId: string, groupId2: string, specPrices: any[], specifications: any[], weightPercent: number) => {
    const updates: Record<string, string> = {};
    const weight = weightPercent / 100;
    specPrices.forEach((specPrice: any) => {
      const standardPrice = specPrice.singleSidedPrice || 0;
      if (standardPrice > 0) {
        updates[`${settingId}_${groupId2}_spec_${specPrice.specificationId}`] = Math.round(standardPrice * weight).toString();
      }
    });
    setEditingPrices(prev => ({ ...prev, ...updates }));
    setWeights(prev => ({ ...prev, [`${settingId}_${groupId2}`]: weightPercent }));
    toast({ title: `단가맞춤 ${weightPercent}% 적용` });
  };

  // 전체 가중치 적용
  const handleBulkWeightApply = async () => {
    if (!clientId || !bulkWeightPercent) return;
    try {
      const result = await applyWeightAllMutation.mutateAsync({ clientId, weightPercent: bulkWeightPercent });
      toast({
        title: '전체 가중치 적용 완료',
        description: `${result.appliedSettings}개 설정, ${result.appliedPrices}개 단가에 ${bulkWeightPercent}% 적용되었습니다.`,
      });
      setIsBulkWeightDialogOpen(false);
      setEditingPrices({});
      setWeights({});
    } catch {
      toast({ title: '전체 가중치 적용 실패', variant: 'destructive' });
    }
  };

  // 전체 단가맞춤 적용
  const handleBulkAdjust = async () => {
    if (!clientId) return;
    // 개별단가가 없으면 표준단가/그룹단가 복사 먼저
    if (!clientPrices || clientPrices.length === 0) {
      try {
        if (groupId) {
          await cloneAllMutation.mutateAsync({ clientId, sourceType: 'group', sourceId: groupId });
        } else {
          await cloneAllMutation.mutateAsync({ clientId, sourceType: 'standard' });
        }
      } catch {
        toast({ title: '단가 복사 실패', variant: 'destructive' });
        return;
      }
    }

    const currentRanges = [...bulkAdjustRanges];
    const getMinPrice = (index: number): number => index === 0 ? 0 : Number(currentRanges[index - 1].maxPrice) + 1;
    const findRange = (price: number) => {
      for (let i = 0; i < currentRanges.length; i++) {
        if (price >= getMinPrice(i) && price <= Number(currentRanges[i].maxPrice)) return currentRanges[i];
      }
      return currentRanges[currentRanges.length - 1];
    };
    const roundToUnit = (price: number, unit: number): number => unit <= 0 ? price : Math.round(price / unit) * unit;
    const adjustPrice = (price: number) => {
      const numPrice = Number(price);
      if (!numPrice || numPrice <= 0) return 0;
      const range = findRange(numPrice);
      return Math.max(0, roundToUnit(numPrice, Number(range?.adjustment) || 10));
    };

    if (!clientPrices || clientPrices.length === 0) {
      toast({ title: '적용할 개별단가가 없습니다.', variant: 'destructive' });
      setIsBulkAdjustDialogOpen(false);
      return;
    }

    const settingMap = new Map<string, any[]>();
    clientPrices.forEach((cp: any) => {
      if (!settingMap.has(cp.productionSettingId)) settingMap.set(cp.productionSettingId, []);
      settingMap.get(cp.productionSettingId)!.push(cp);
    });

    let totalAdjusted = 0;
    const priceFields = ['price', 'singleSidedPrice', 'doubleSidedPrice', 'fourColorSinglePrice', 'fourColorDoublePrice', 'sixColorSinglePrice', 'sixColorDoublePrice', 'basePrice', 'pricePerPage'];

    for (const [settingId, prices] of settingMap.entries()) {
      const adjustedPrices = prices.map((p: any) => {
        const adjusted: any = {};
        if (p.priceGroupId) adjusted.priceGroupId = p.priceGroupId;
        if (p.specificationId) adjusted.specificationId = p.specificationId;
        if (p.minQuantity != null) adjusted.minQuantity = p.minQuantity;
        if (p.nupKey) adjusted.nupKey = p.nupKey;
        if (p.weight != null) adjusted.weight = p.weight;
        if (p.basePages != null) adjusted.basePages = p.basePages;

        let changed = false;
        priceFields.forEach(field => {
          if (p[field] != null && Number(p[field]) > 0) {
            const original = Number(p[field]);
            const adjustedVal = adjustPrice(original);
            adjusted[field] = adjustedVal;
            if (adjustedVal !== original) changed = true;
          } else if (p[field] != null) {
            adjusted[field] = Number(p[field]);
          }
        });

        if (p.rangePrices && typeof p.rangePrices === 'object') {
          const adjustedRange: Record<string, number> = {};
          for (const [key, value] of Object.entries(p.rangePrices)) {
            if (key.startsWith('__')) {
              adjustedRange[key] = Number(value);
            } else if (typeof value === 'number' && value > 0) {
              const adjustedVal = adjustPrice(value);
              adjustedRange[key] = adjustedVal;
              if (adjustedVal !== value) changed = true;
            } else {
              adjustedRange[key] = Number(value);
            }
          }
          adjusted.rangePrices = adjustedRange;
        }

        if (changed) totalAdjusted++;
        return adjusted;
      });

      try {
        await setClientPricesMutation.mutateAsync({
          clientId,
          productionSettingId: settingId,
          prices: adjustedPrices,
        });
      } catch { /* ignore */ }
    }

    toast({ title: totalAdjusted > 0 ? `전체 단가맞춤 완료 (${totalAdjusted}건 조정)` : '조정된 단가가 없습니다.' });
    setIsBulkAdjustDialogOpen(false);
  };

  // 단가 맞춤 적용
  const applyPriceAdjustment = () => {
    if (!priceAdjustSettingId || priceAdjustPriceGroups.length === 0) return;
    const currentRanges = [...priceAdjustRanges];
    const getMinPrice = (index: number): number => index === 0 ? 0 : Number(currentRanges[index - 1].maxPrice) + 1;
    const findRange = (price: number) => {
      for (let i = 0; i < currentRanges.length; i++) {
        if (price >= getMinPrice(i) && price <= Number(currentRanges[i].maxPrice)) return currentRanges[i];
      }
      return currentRanges[currentRanges.length - 1];
    };
    const roundToUnit = (price: number, unit: number): number => unit <= 0 ? price : Math.round(price / unit) * unit;
    const adjustPrice = (price: number) => {
      const numPrice = Number(price);
      if (!numPrice || numPrice <= 0) return 0;
      const range = findRange(numPrice);
      return Math.max(0, roundToUnit(numPrice, Number(range?.adjustment) || 10));
    };

    let adjustedCount = 0;
    const newPrices: Record<string, string> = {};

    if (priceAdjustPrintMethod === 'inkjet') {
      priceAdjustPriceGroups.forEach((group: any) => {
        (group.specPrices || []).forEach((specPrice: any) => {
          const key = `${priceAdjustSettingId}_${group.id}_spec_${specPrice.specificationId}`;
          const savedPrice = clientPricesMap.get(`${priceAdjustSettingId}_${group.id}_${specPrice.specificationId}`);
          const currentValue = editingPrices[key] ?? (savedPrice?.price ? String(Number(savedPrice.price)) : (specPrice.singleSidedPrice ? String(specPrice.singleSidedPrice) : null));
          if (currentValue) {
            const originalPrice = parseFloat(currentValue) || 0;
            if (originalPrice > 0) {
              newPrices[key] = adjustPrice(originalPrice).toString();
              if (adjustPrice(originalPrice) !== originalPrice) adjustedCount++;
            }
          }
        });
      });
    } else {
      priceAdjustPriceGroups.forEach((group: any) => {
        (group.upPrices || []).forEach((upPrice: any) => {
          const upKey = upPrice.nupKey || upPrice.up;
          const isAlbum = priceAdjustPrintMethod === 'album';
          const fields = isAlbum
            ? ['fourColorSinglePrice']
            : ['fourColorSinglePrice', 'fourColorDoublePrice', 'sixColorSinglePrice', 'sixColorDoublePrice'];
          fields.forEach(field => {
            const key = `${priceAdjustSettingId}_${group.id}_${upKey}_${field}`;
            const savedPrice = clientPricesMap.get(`${priceAdjustSettingId}_${group.id}_${upKey}`)?.[field];
            const currentValue = editingPrices[key] ?? (savedPrice ? String(savedPrice) : null);
            if (currentValue) {
              const originalPrice = parseFloat(currentValue) || 0;
              if (originalPrice > 0) {
                const adjusted = adjustPrice(originalPrice);
                newPrices[key] = adjusted !== originalPrice ? adjusted.toString() : currentValue;
                if (adjusted !== originalPrice) adjustedCount++;
              }
            }
          });
        });
      });
    }

    if (Object.keys(newPrices).length > 0) {
      setEditingPrices(prev => ({ ...prev, ...newPrices }));
    }
    toast({ title: adjustedCount > 0 ? `단가가 조정되었습니다. (${adjustedCount}건)` : '조정된 단가가 없습니다.' });
    setIsPriceAdjustDialogOpen(false);
  };

  // 단가 조정 초기화
  const resetPriceAdjustment = () => {
    if (!priceAdjustSettingId) return;
    setEditingPrices(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (key.startsWith(priceAdjustSettingId + '_')) delete next[key];
      });
      return next;
    });
    setWeights(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (key.startsWith(priceAdjustSettingId + '_')) delete next[key];
      });
      return next;
    });
    toast({ title: '편집 내용이 초기화되었습니다.' });
    setIsPriceAdjustDialogOpen(false);
  };

  const totalPriceCount = clientPrices?.length || 0;

  // ===== ClientSettingCard 컴포넌트 =====
  const ClientSettingCard = ({ setting }: { setting: any }) => {
    const printMethod = setting.printMethod;
    const pricingType = setting.pricingType || '';
    const priceGroups = setting.priceGroups || [];
    const hasPriceGroups = (printMethod === 'indigo' || printMethod === 'inkjet' || printMethod === 'album' || printMethod === 'indigoAlbum') && priceGroups.length > 0;
    const isAlbumType = printMethod === 'album' || printMethod === 'indigoAlbum';
    const specifications = setting.specifications || [];
    const standardPrices = setting.prices || [];
    const isNupPageRange = pricingType === 'nup_page_range';
    const hasInkjetSpecs = printMethod === 'inkjet' && specifications.length > 0 && !hasPriceGroups && !isNupPageRange;

    // nupPageRanges
    const nupPageRanges = useMemo(() => {
      if (pricingType !== 'nup_page_range' && pricingType !== 'finishing_spec_nup') return [];
      return standardPrices
        .filter((p: any) => p.specificationId)
        .map((p: any) => {
          const rangePrices: Record<number, number> = {};
          let coverPrice: number | undefined;
          let paperPrice: number | undefined;
          if (p.rangePrices && typeof p.rangePrices === 'object') {
            Object.entries(p.rangePrices).forEach(([key, value]: [string, any]) => {
              if (key === '__coverPrice') coverPrice = Number(value);
              else if (key === '__paperPrice') paperPrice = Number(value);
              else rangePrices[Number(key)] = Number(value);
            });
          }
          return {
            specificationId: p.specificationId,
            specificationNup: p.specification?.nup || null,
            specificationName: p.specification?.name || null,
            pricePerPage: Number(p.pricePerPage) || 0,
            coverPrice,
            paperPrice,
            rangePrices,
          };
        });
    }, [standardPrices, pricingType]);

    // 1up 변경 시 자동 계산
    const handleOneUpChange = (grpId: string, field: string, value: string, upPricesForCalc?: any[]) => {
      const basePrice = parseFloat(value) || 0;
      const updates: Record<string, string> = {};
      if (isAlbumType && upPricesForCalc && upPricesForCalc.length > 0) {
        const baseNupCount = upPricesForCalc[0]?.nupKey ? (NUP_TO_COUNT[upPricesForCalc[0].nupKey] || 1) : upPricesForCalc[0]?.up || 1;
        upPricesForCalc.forEach((upPrice: any, idx: number) => {
          const upKey = upPrice.nupKey || upPrice.up;
          const key = `${setting.id}_${grpId}_${upKey}_${field}`;
          if (idx === 0) {
            updates[key] = value;
          } else {
            const nupCount = upPrice.nupKey ? (NUP_TO_COUNT[upPrice.nupKey] || 1) : upPrice.up;
            const w = upPrice.weight || 1;
            updates[key] = basePrice > 0 ? Math.round((basePrice / nupCount * baseNupCount) * w).toString() : '';
          }
        });
      } else {
        [1, 2, 4, 8].forEach(up => {
          const key = `${setting.id}_${grpId}_${up}_${field}`;
          updates[key] = up === 1 ? value : (basePrice > 0 ? Math.round(basePrice / up).toString() : '');
        });
      }
      setEditingPrices(prev => ({ ...prev, ...updates }));
    };

    const hasChanges = Object.keys(editingPrices).some(key =>
      key.startsWith(setting.id + '_') && !key.includes('_baseSpec') && !key.includes('_groupBase') && !key.includes('_sqinch')
    );

    const savedClientPriceCount = clientPrices?.filter((cp: any) => cp.productionSettingId === setting.id).length || 0;

    return (
      <div className="group/card border rounded-lg p-4 mb-3 bg-white hover:shadow-sm transition-shadow">
        {/* 카드 헤더 */}
        <div className="flex gap-4 items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-base font-bold text-gray-900">
                {setting.settingName || setting.codeName || "설정"}
              </span>
              <Badge variant="outline" className="text-xs font-normal text-gray-600 bg-gray-50">
                {PRICING_TYPE_LABELS[pricingType] || pricingType}
              </Badge>
              {printMethod && (
                <Badge variant="secondary" className="text-xs">
                  {PRINT_METHOD_LABELS[printMethod] || printMethod}
                </Badge>
              )}
              <div className="flex items-center text-xs text-gray-500">
                <span className="mr-1">작업시간:</span>
                <span className="font-mono font-medium text-gray-900">{Number(setting.workDays) || 1}일</span>
              </div>
              {savedClientPriceCount > 0 && (
                <Badge className="text-[10px] h-5 bg-green-100 text-green-700 hover:bg-green-100">
                  {savedClientPriceCount}개 개별단가
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
              disabled={cloneStandardMutation.isPending}
              onClick={() => handleCloneStandard(setting.id)}
            >
              {cloneStandardMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              표준복사
            </Button>
            {groupId && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs text-purple-600 border-purple-200 hover:bg-purple-50"
                disabled={cloneGroupMutation.isPending}
                onClick={() => handleCloneGroup(setting.id)}
              >
                {cloneGroupMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                그룹복사
              </Button>
            )}
            {(printMethod === 'indigo' || printMethod === 'indigoAlbum' || printMethod === 'album') && hasPriceGroups && (
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => openPriceAdjustDialog(setting.id, priceGroups, printMethod)}>
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1" /> 단가맞춤
              </Button>
            )}
            {printMethod === 'inkjet' && hasPriceGroups && (
              <>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => openPriceAdjustDialog(setting.id, priceGroups, 'inkjet')}>
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-1" /> 단가맞춤
                </Button>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={() => openInkjetPriceDialog(setting)}>
                  <Edit className="h-3.5 w-3.5 mr-1" /> 단가 입력
                </Button>
              </>
            )}
            {hasChanges && (
              <Button
                size="sm"
                className="h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-xs"
                disabled={isSaving}
                onClick={() => hasPriceGroups && handleSaveGroupPrices(setting.id, priceGroups)}
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                저장
              </Button>
            )}
          </div>
        </div>

        {/* 인디고/앨범: 가격그룹별 Up×색상 매트릭스 */}
        {hasPriceGroups && (printMethod === 'indigo' || printMethod === 'indigoAlbum' || printMethod === 'album') && (
          <div className="space-y-3">
            <div className={cn("grid gap-3", printMethod === 'album' ? "grid-cols-3" : "grid-cols-2")}>
              {priceGroups.map((group: any) => {
                const style = PRICE_GROUP_STYLES[group.color] || PRICE_GROUP_STYLES.none;
                const upPrices = (group.upPrices || []).sort((a: any, b: any) => {
                  const aIdx = NUP_ORDER.indexOf((a.nupKey || `${a.up}up`) as any);
                  const bIdx = NUP_ORDER.indexOf((b.nupKey || `${b.up}up`) as any);
                  return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
                });
                const paperPriceGroupMap = setting.paperPriceGroupMap || {};
                const linkedPaperIds = Object.entries(paperPriceGroupMap).filter(([_, gId]) => gId === group.id).map(([paperId]) => paperId);
                const linkedPapers = linkedPaperIds.map(id => papersMap.get(id)).filter((p: any) => p && (!p.printMethods || p.printMethods.includes(printMethod)));
                const fps = getFixedPrintSide(selectedProductionGroup?.name || '');

                return (
                  <div key={group.id} className={cn("border-2 p-3 space-y-2 shadow-sm", style.bg, style.border)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{style.dot}</span>
                        <span className={cn("font-bold text-base", style.text)}>{style.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {linkedPapers.length > 0 ? `${linkedPapers.length}개 용지` : `${upPrices.length}개 Up`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-500">가중치</span>
                        <Input
                          type="number"
                          className="h-6 w-14 text-xs text-center font-mono"
                          placeholder="100"
                          value={weights[`${setting.id}_${group.id}`] || ''}
                          onChange={(e) => setWeights(prev => ({ ...prev, [`${setting.id}_${group.id}`]: e.target.value ? Number(e.target.value) : 0 }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const wv = weights[`${setting.id}_${group.id}`] || 100;
                              if (wv > 0 && wv <= 200) applyWeight(setting.id, group.id, upPrices, wv);
                            }
                          }}
                        />
                        <span className="text-[10px] text-gray-500">%</span>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-indigo-600 hover:bg-indigo-50"
                          onClick={() => {
                            const wv = weights[`${setting.id}_${group.id}`] || 100;
                            if (wv > 0 && wv <= 200) applyWeight(setting.id, group.id, upPrices, wv);
                            else toast({ title: '가중치는 1~200 사이 값을 입력하세요.', variant: 'destructive' });
                          }}>
                          적용
                        </Button>
                      </div>
                    </div>
                    {linkedPapers.length > 0 && (
                      <div className="text-xs text-gray-500 truncate">
                        {linkedPapers.map((p: any) => `${p?.name}${p?.grammage ? ` ${p.grammage}g` : ''}`).join(", ")}
                      </div>
                    )}
                    <div className="border border-gray-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="text-center py-1 px-1 font-medium text-gray-600">Up</th>
                            <th className="text-center py-1 px-1 font-medium text-gray-400 text-[10px]">가중치</th>
                            {/* 그룹단가 열 제거 - 개별단가 셀 안에 표시 */}
                            {printMethod === 'album' ? (
                              <th className="text-center py-1 px-1 font-medium text-gray-600">단면</th>
                            ) : (
                              <>
                                {fps !== 'double' && <th className="text-center py-1 px-1 font-medium text-gray-600">4도단면</th>}
                                {fps !== 'single' && <th className="text-center py-1 px-1 font-medium text-gray-600">4도양면</th>}
                                {fps !== 'double' && <th className="text-center py-1 px-1 font-medium text-gray-600">6도단면</th>}
                                {fps !== 'single' && <th className="text-center py-1 px-1 font-medium text-gray-600">6도양면</th>}
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {upPrices.map((upPrice: any, idx: number) => {
                            const isBase = idx === 0;
                            const upKey = upPrice.nupKey || upPrice.up;
                            const savedPrice = clientPricesMap.get(`${setting.id}_${group.id}_${upKey}`);
                            const isAlbum = printMethod === 'album';

                            return (
                              <tr key={upKey} className={cn("border-b border-gray-100 last:border-0", isBase && "bg-amber-50/50")}>
                                <td className="text-center py-0.5 px-0.5 font-medium text-indigo-600">{upPrice.nupKey || `${upPrice.up}up`}</td>
                                <td className="text-center px-0.5 py-0.5">
                                  <Input
                                    type="number" step="0.1" min="0.1" max="5"
                                    className="h-8 w-12 text-center text-[11px] bg-gray-50 border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={upPrice.weight || ""} disabled={isBase}
                                    onChange={(e) => {
                                      const w = Number(e.target.value) || 1;
                                      const baseUpPrice = upPrices[0];
                                      if (!baseUpPrice) return;
                                      const baseNupCount = baseUpPrice.nupKey ? (NUP_TO_COUNT[baseUpPrice.nupKey] || 1) : baseUpPrice.up;
                                      const nupCount = upPrice.nupKey ? (NUP_TO_COUNT[upPrice.nupKey] || 1) : upPrice.up;
                                      const fields2 = isAlbum
                                        ? ['fourColorSinglePrice']
                                        : (['fourColorSinglePrice', 'fourColorDoublePrice', 'sixColorSinglePrice', 'sixColorDoublePrice'] as const).filter(f => {
                                            if (fps === 'single') return !f.includes('Double');
                                            if (fps === 'double') return !f.includes('Single');
                                            return true;
                                          });
                                      const updates2: Record<string, string> = {};
                                      fields2.forEach((field) => {
                                        const bKey = `${setting.id}_${group.id}_${baseUpPrice.nupKey || baseUpPrice.up}_${field}`;
                                        const savedBase = clientPricesMap.get(`${setting.id}_${group.id}_${baseUpPrice.nupKey || baseUpPrice.up}`);
                                        const baseVal = parseFloat(editingPrices[bKey] ?? '') || savedBase?.[field] || baseUpPrice[field] || 0;
                                        updates2[`${setting.id}_${group.id}_${upKey}_${field}`] = baseVal > 0 ? Math.round((baseVal / nupCount * baseNupCount) * w).toString() : '';
                                      });
                                      setEditingPrices(prev => ({ ...prev, ...updates2 }));
                                    }}
                                    placeholder="1"
                                  />
                                </td>
                                {/* 개별단가 열 (그룹단가를 위에 표시) */}
                                {(isAlbum
                                  ? (['fourColorSinglePrice'] as const)
                                  : (['fourColorSinglePrice', 'fourColorDoublePrice', 'sixColorSinglePrice', 'sixColorDoublePrice'] as const).filter(f => {
                                      if (fps === 'single') return !f.includes('Double');
                                      if (fps === 'double') return !f.includes('Single');
                                      return true;
                                    })
                                ).map((field) => {
                                  const key = `${setting.id}_${group.id}_${upKey}_${field}`;
                                  const standardPrice = upPrice[field] || 0;
                                  const sp = savedPrice?.[field];

                                  const groupPrice = groupPricesMap.get(`${setting.id}_${group.id}_${upKey}`)?.[field];

                                  return (
                                    <td key={field} className="px-0.5 py-0.5">
                                      <div className="flex flex-col items-center gap-0">
                                        {groupId && groupPrice != null && groupPrice > 0 && (
                                          <Link href={`/pricing/group?groupId=${groupId}&settingId=${setting.id}`} target="_blank" className="text-[10px] text-purple-500 font-mono hover:underline hover:text-purple-700 cursor-pointer leading-tight" title="그룹단가">
                                            {formatNumber(groupPrice)}
                                          </Link>
                                        )}
                                        <Input
                                          type="number"
                                          className={cn(
                                            "h-8 w-16 text-sm text-center rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                            isBase
                                              ? "bg-amber-100 border-amber-300 font-medium focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                                              : "bg-white border-slate-200 hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                                          )}
                                          value={editingPrices[key] ?? (sp ? String(sp) : (groupPrice != null && groupPrice > 0 ? String(groupPrice) : (standardPrice > 0 ? String(standardPrice) : '')))}
                                          onChange={(e) => {
                                            if (isBase) handleOneUpChange(group.id, field, e.target.value, upPrices);
                                            else setEditingPrices(prev => ({ ...prev, [key]: e.target.value }));
                                          }}
                                          placeholder="0"
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
                    <p className="text-xs text-gray-400 mt-1">* 1up 가격 설정 시, 선택된 Up 만큼 나눠진 가격이 자동 계산됩니다.</p>
                  </div>
                );
              })}
            </div>
            {hasChanges && (
              <div className="flex justify-end">
                <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" disabled={isSaving} onClick={() => handleSaveGroupPrices(setting.id, priceGroups)}>
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  저장
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 잉크젯 (가격그룹 없음): 규격별 단가 */}
        {hasInkjetSpecs && (
          <div className="mt-2">
            <div className="flex items-center justify-end gap-1.5 mb-2">
              <span className="text-xs text-gray-600">가중치</span>
              <Input type="number" className="h-7 w-16 text-xs text-center font-mono" placeholder="100"
                value={weights[`${setting.id}_nogroup_inkjet`] || ''}
                onChange={(e) => setWeights(prev => ({ ...prev, [`${setting.id}_nogroup_inkjet`]: e.target.value ? Number(e.target.value) : 0 }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const wv = weights[`${setting.id}_nogroup_inkjet`] || 100;
                    if (wv > 0 && wv <= 200) {
                      const updates: Record<string, string> = {};
                      specifications.forEach((spec: any) => {
                        const specId = spec.specificationId || spec.id;
                        const stdP = standardPrices.find((p: any) => p.specificationId === specId);
                        const stdPrice = stdP?.price ? Number(stdP.price) : 0;
                        if (stdPrice > 0) updates[`${setting.id}_spec_${specId}`] = String(Math.round(stdPrice * wv / 100));
                      });
                      setEditingPrices(prev => ({ ...prev, ...updates }));
                      toast({ title: `가중치 ${wv}% 적용`, description: `표준단가의 ${wv}%로 개별단가가 계산되었습니다.` });
                    } else {
                      toast({ title: '가중치는 1~200 사이 값을 입력하세요.', variant: 'destructive' });
                    }
                  }
                }}
              />
              <span className="text-xs text-gray-600">%</span>
              <Button size="sm" variant="outline" className="h-7 text-xs px-3"
                onClick={() => {
                  const wv = weights[`${setting.id}_nogroup_inkjet`] || 100;
                  if (wv > 0 && wv <= 200) {
                    const updates: Record<string, string> = {};
                    specifications.forEach((spec: any) => {
                      const specId = spec.specificationId || spec.id;
                      const stdP = standardPrices.find((p: any) => p.specificationId === specId);
                      const stdPrice = stdP?.price ? Number(stdP.price) : 0;
                      if (stdPrice > 0) updates[`${setting.id}_spec_${specId}`] = String(Math.round(stdPrice * wv / 100));
                    });
                    setEditingPrices(prev => ({ ...prev, ...updates }));
                    toast({ title: `가중치 ${wv}% 적용`, description: `표준단가의 ${wv}%로 개별단가가 계산되었습니다.` });
                  } else {
                    toast({ title: '가중치는 1~200 사이 값을 입력하세요.', variant: 'destructive' });
                  }
                }}>
                적용
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse bg-white rounded border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-500 border-b">규격</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 border-b w-24">표준단가</th>
                    {groupId && <th className="px-3 py-2 text-center font-medium text-purple-600 border-b w-24"><Link href={`/pricing/group?groupId=${groupId}&settingId=${setting.id}`} target="_blank" className="hover:underline hover:text-purple-800 inline-flex items-center gap-1">그룹단가 <ExternalLink className="h-3 w-3" /></Link></th>}
                    <th className="px-3 py-2 text-center font-medium text-gray-500 border-b w-32">개별단가</th>
                  </tr>
                </thead>
                <tbody>
                  {specifications.map((spec: any) => {
                    const specInfo = spec.specification || spec;
                    const specId = spec.specificationId || spec.id;
                    const standardPrice = standardPrices.find((p: any) => p.specificationId === specId);
                    const key = `${setting.id}_spec_${specId}`;
                    const savedPrice = clientPricesMap.get(`${setting.id}__${specId}`);
                    const groupSpecPrice = groupPricesMap.get(`${setting.id}__${specId}`);
                    return (
                      <tr key={specId} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-700">
                          {specInfo.name || specId}
                          {specInfo.widthInch && specInfo.heightInch && (
                            <span className="text-gray-400 text-[10px] ml-1">({Number(specInfo.widthInch).toFixed(1)}x{Number(specInfo.heightInch).toFixed(1)}")</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-500">{standardPrice?.price ? formatNumber(Number(standardPrice.price)) : '-'}</td>
                        {groupId && (
                          <td className="px-3 py-2 text-center text-purple-500 font-mono">
                            <Link href={`/pricing/group?groupId=${groupId}&settingId=${setting.id}`} target="_blank" className="hover:underline hover:text-purple-800" title="그룹단가 설정으로 이동">
                              {groupSpecPrice?.price ? formatNumber(Number(groupSpecPrice.price)) : '-'}
                            </Link>
                          </td>
                        )}
                        <td className="px-3 py-2 text-center">
                          <Input type="number" className="h-7 w-24 text-xs text-center font-mono mx-auto" placeholder="-"
                            value={editingPrices[key] ?? (savedPrice?.price ? String(Number(savedPrice.price)) : (groupSpecPrice?.price ? String(Number(groupSpecPrice.price)) : ''))}
                            onChange={(e) => setEditingPrices(prev => ({ ...prev, [key]: e.target.value }))} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {hasEditingPricesForSetting(setting.id) && (
              <div className="flex justify-end mt-3">
                <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" disabled={isSaving}
                  onClick={() => {
                    const prices: any[] = [];
                    specifications.forEach((spec: any) => {
                      const specId = spec.specificationId || spec.id;
                      const key = `${setting.id}_spec_${specId}`;
                      const editedValue = editingPrices[key];
                      if (editedValue) prices.push({ specificationId: specId, price: parseFloat(editedValue) });
                    });
                    if (prices.length > 0) handleSavePrices(setting.id, prices);
                  }}>
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  저장
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 잉크젯 (가격그룹 있음): 그룹별 규격 단가 */}
        {hasPriceGroups && printMethod === 'inkjet' && (
          <div className="mt-2">
            <div className="grid grid-cols-3 gap-3">
              {priceGroups.map((group: any) => {
                const style = PRICE_GROUP_STYLES[group.color] || PRICE_GROUP_STYLES.none;
                const specPrices = group.specPrices || [];
                const paperPriceGroupMap = setting.paperPriceGroupMap || {};
                const linkedPaperIds = Object.entries(paperPriceGroupMap).filter(([_, gId]) => gId === group.id).map(([paperId]) => paperId);
                const linkedPapers = linkedPaperIds.map(id => papersMap.get(id)).filter((p: any) => p && (!p.printMethods || p.printMethods.includes(printMethod)));
                const baseSpecId = group.inkjetBaseSpecId || (specPrices[0]?.specificationId || '');

                return (
                  <div key={group.id} className={cn("p-2 border-2", style.bg, style.border)}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1">
                        <span className={cn("text-xs font-semibold", style.text)}>{style.dot} {style.label}</span>
                        <span className="text-[10px] bg-gray-200 text-gray-700 px-1 py-0.5">{specPrices.length}개 규격</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500">가중치</span>
                        <Input type="number" className="h-5 w-12 text-[10px] text-center font-mono" placeholder="100"
                          value={weights[`${setting.id}_${group.id}_inkjet`] || ''}
                          onChange={(e) => setWeights(prev => ({ ...prev, [`${setting.id}_${group.id}_inkjet`]: e.target.value ? Number(e.target.value) : 0 }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const wv = weights[`${setting.id}_${group.id}_inkjet`] || 100;
                              if (wv > 0 && wv <= 200) {
                                const updates: Record<string, string> = {};
                                specPrices.forEach((sp: any) => {
                                  const stdP = sp.singleSidedPrice || 0;
                                  if (stdP > 0) updates[`${setting.id}_${group.id}_spec_${sp.specificationId}`] = String(Math.round(stdP * wv / 100));
                                });
                                setEditingPrices(prev => ({ ...prev, ...updates }));
                              }
                            }
                          }}
                        />
                        <span className="text-[10px] text-gray-500">%</span>
                      </div>
                    </div>
                    {linkedPapers.length > 0 && (
                      <div className="text-[9px] text-gray-500 mb-1 truncate">
                        {linkedPapers.map((p: any) => `${p?.name}${p?.grammage ? ` ${p.grammage}g` : ''}`).join(', ')}
                      </div>
                    )}
                    <div className="border overflow-hidden bg-white/50">
                      <table className="w-full text-[10px]">
                        <thead className="bg-gray-100">
                          <tr className="border-b">
                            <th className="px-1 py-1 text-center">규격</th>
                            <th className="px-1 py-1 text-center w-12">가중치</th>
                            <th className="px-1 py-1 text-center w-14">표준</th>
                            {groupId && <th className="px-1 py-1 text-center w-14 text-purple-600"><Link href={`/pricing/group?groupId=${groupId}&settingId=${setting.id}`} target="_blank" className="hover:underline hover:text-purple-800">그룹</Link></th>}
                            <th className="px-1 py-1 text-center w-16">개별단가</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...specPrices]
                            .map((sp: any) => {
                              const spec = specifications.find((s: any) => (s.specificationId || s.id) === sp.specificationId)?.specification;
                              return { ...sp, spec, area: spec ? Number(spec.widthInch) * Number(spec.heightInch) : 0 };
                            })
                            .sort((a, b) => a.area - b.area)
                            .map((specPrice: any) => {
                              const specId = specPrice.specificationId;
                              const spec = specPrice.spec;
                              const isBase = specId === baseSpecId;
                              const standardPrice = specPrice.singleSidedPrice || 0;
                              const savedClientPrice = clientPricesMap.get(`${setting.id}_${group.id}_${specId}`);
                              const groupSpecPrice = groupPricesMap.get(`${setting.id}_${group.id}_${specId}`);
                              const key = `${setting.id}_${group.id}_spec_${specId}`;
                              return (
                                <tr key={specId} className={cn("border-b", isBase ? "bg-green-50" : "")}>
                                  <td className={cn("px-1 py-0.5 text-center font-mono", isBase && "text-green-700 font-semibold")}>
                                    {spec?.name || specId?.slice(-6)}
                                    {isBase && <span className="text-green-600 ml-0.5 text-[8px]">(기준)</span>}
                                  </td>
                                  <td className="px-1 py-0.5 text-center text-gray-400">{specPrice.weight != null ? specPrice.weight : '1.0'}</td>
                                  <td className="px-1 py-0.5 text-center text-gray-400 font-mono">{standardPrice > 0 ? formatNumber(standardPrice) : '-'}</td>
                                  {groupId && (
                                    <td className="px-1 py-0.5 text-center text-purple-500 font-mono">
                                      <Link href={`/pricing/group?groupId=${groupId}&settingId=${setting.id}`} target="_blank" className="hover:underline hover:text-purple-800" title="그룹단가 설정으로 이동">
                                        {groupSpecPrice?.price ? formatNumber(Number(groupSpecPrice.price)) : '-'}
                                      </Link>
                                    </td>
                                  )}
                                  <td className="px-1 py-0.5 text-center">
                                    <Input type="number" className={cn("h-5 w-14 text-[10px] text-center p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", isBase ? "bg-green-100" : "bg-gray-50")}
                                      value={editingPrices[key] ?? (savedClientPrice?.price ? String(Number(savedClientPrice.price)) : (groupSpecPrice?.price ? String(Number(groupSpecPrice.price)) : ''))}
                                      onChange={(e) => setEditingPrices(prev => ({ ...prev, [key]: e.target.value }))}
                                      placeholder={standardPrice > 0 ? String(standardPrice) : "0"} />
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1">* 가중치(%) 입력 후 Enter → 표준단가 기준 일괄 적용</p>
                  </div>
                );
              })}
            </div>
            {Object.keys(editingPrices).some(key => key.startsWith(setting.id + '_') && key.includes('_spec_')) && (
              <div className="flex justify-end mt-3">
                <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" disabled={isSaving}
                  onClick={() => {
                    priceGroups.forEach((group: any) => {
                      const prices: any[] = [];
                      (group.specPrices || []).forEach((sp: any) => {
                        const key = `${setting.id}_${group.id}_spec_${sp.specificationId}`;
                        const editedValue = editingPrices[key];
                        const savedClientPrice = clientPricesMap.get(`${setting.id}_${group.id}_${sp.specificationId}`);
                        const value = editedValue ?? (savedClientPrice?.price ? String(Number(savedClientPrice.price)) : null);
                        if (value) prices.push({ specificationId: sp.specificationId, priceGroupId: group.id, price: parseFloat(value) });
                      });
                      if (prices.length > 0) {
                        setClientPricesMutation.mutate({ clientId, productionSettingId: setting.id, prices });
                      }
                    });
                    toast({ title: '잉크젯 개별단가가 저장되었습니다.' });
                  }}>
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  저장
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 구간별 Nup/1p가격 (nup_page_range) - 표준단가와 동일한 테이블 구조 */}
        {isNupPageRange && (() => {
          const pageRanges = setting.pageRanges || [20, 30, 40, 50, 60];
          if (nupPageRanges.length === 0) {
            return <div className="mt-3 text-center py-4 text-gray-400 text-sm bg-gray-50 rounded">표준단가에서 먼저 Nup 규격을 설정해주세요.</div>;
          }
          const nupOrder2 = ['1++up', '1+up', '1up', '2up', '4up', '6up', '8up'];
          const nupGroups = new Map<string, { specId: string; specInfo: any; rangeData: any }[]>();
          nupPageRanges.forEach((nupRange: any) => {
            const nup = nupRange.specificationNup || 'other';
            if (!nupGroups.has(nup)) nupGroups.set(nup, []);
            nupGroups.get(nup)!.push({ specId: nupRange.specificationId, specInfo: { name: nupRange.specificationName || '', nup }, rangeData: nupRange });
          });
          const sortedNups = nupOrder2.filter(nup => nupGroups.has(nup));
          nupGroups.forEach((_, nup) => { if (!sortedNups.includes(nup)) sortedNups.push(nup); });

          const recalcRangePrices = (cp: number, ppp: number, pp: number, existingFirst?: number) => {
            const result: Record<string, string> = {};
            if (cp > 0) {
              pageRanges.forEach((r: number) => { result[String(r)] = String(Math.round(cp + (ppp + pp) * r)); });
            } else {
              const firstRange = pageRanges[0] || 20;
              const firstPrice = existingFirst ?? 0;
              pageRanges.forEach((r: number, i: number) => { result[String(r)] = i === 0 ? String(firstPrice) : String(Math.round(firstPrice + (r - firstRange) * (ppp + pp))); });
            }
            return result;
          };

          return (
            <div className="mt-3 space-y-3">
              {/* 페이지 구간 표시 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-indigo-700">페이지 구간</span>
                <div className="flex gap-2">
                  {pageRanges.map((r: number) => (
                    <span key={r} className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gray-300 bg-white text-sm font-mono">
                      {r} <span className="text-gray-400 text-xs">p</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Nup 테이블 - 표준단가와 동일한 구조 */}
              <div className="border-2 border-indigo-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-center py-2 px-2 font-semibold text-gray-700 w-16">Nup</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">규격 목록</th>
                      <th className="text-center py-2 px-2 font-semibold text-gray-600 w-20">표지가격</th>
                      <th className="text-center py-2 px-2 font-semibold text-gray-600 w-20">용지가격(1p)</th>
                      <th className="text-center py-2 px-2 font-semibold text-gray-600 w-20">제본단가(1p)</th>
                      {pageRanges.map((range: number) => (
                        <th key={range} className="text-center py-2 px-2 font-semibold text-gray-600 w-[72px]">{range}p</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedNups.map((nup) => {
                      const groupItems = nupGroups.get(nup) || [];
                      if (groupItems.length === 0) return null;
                      const specId = groupItems[0].specId;
                      const rangeData = groupItems[0].rangeData;
                      const stdPPP = rangeData?.pricePerPage || 0;
                      const stdCP = rangeData?.coverPrice || 0;
                      const stdPP = rangeData?.paperPrice || 0;
                      const stdRP = rangeData?.rangePrices || {};
                      const specNames = groupItems.map(g => g.specInfo.name || '').filter(Boolean).join(', ');

                      const savedRec = clientPricesMap.get(`${setting.id}__${specId}`) || clientPricesMap.get(`${setting.id}_${pageRanges[0]}_${specId}`);
                      const groupRec = groupPricesMap.get(`${setting.id}__${specId}`) || groupPricesMap.get(`${setting.id}_${pageRanges[0]}_${specId}`);
                      const effectiveRec = savedRec || groupRec;
                      const savedRP = effectiveRec?.rangePrices || {};
                      const savedCP = savedRP.__coverPrice != null ? Number(savedRP.__coverPrice) : undefined;
                      const savedPP = savedRP.__paperPrice != null ? Number(savedRP.__paperPrice) : undefined;
                      const savedPPP = effectiveRec?.pricePerPage != null ? Number(effectiveRec.pricePerPage) : undefined;

                      const cpKey = `${setting.id}_nup_${specId}_coverPrice`;
                      const ppKey = `${setting.id}_nup_${specId}_paperPrice`;
                      const pppKey = `${setting.id}_nup_${specId}_perPage`;
                      const curCP = editingPrices[cpKey] != null ? Number(editingPrices[cpKey]) : (savedCP ?? stdCP);
                      const curPP = editingPrices[ppKey] != null ? Number(editingPrices[ppKey]) : (savedPP ?? stdPP);
                      const curPPP = editingPrices[pppKey] != null ? Number(editingPrices[pppKey]) : (savedPPP ?? stdPPP);

                      const getRangePrice = (range: number) => {
                        const rKey = `${setting.id}_nup_${specId}_range_${range}`;
                        if (editingPrices[rKey] != null) return Number(editingPrices[rKey]);
                        if (savedRP[String(range)] != null) return Number(savedRP[String(range)]);
                        return stdRP[range] || 0;
                      };

                      // 그룹단가 데이터
                      const grpRP = groupRec?.rangePrices || {};
                      const grpCP = grpRP.__coverPrice != null ? Number(grpRP.__coverPrice) : undefined;
                      const grpPP = grpRP.__paperPrice != null ? Number(grpRP.__paperPrice) : undefined;
                      const grpPPP = groupRec?.pricePerPage != null ? Number(groupRec.pricePerPage) : undefined;

                      return (
                        <React.Fragment key={nup}>
                          {/* 그룹단가 행 (읽기전용) */}
                          {groupId && (
                            <tr className="bg-purple-50/70 border-b border-purple-100">
                              <td className="text-center py-1 px-2">
                                <span className="font-bold text-xs text-purple-600">{nup}</span>
                              </td>
                              <td className="py-1 px-2 text-[10px] text-purple-500">
                                <Link href={`/pricing/group?groupId=${groupId}&settingId=${setting.id}`} target="_blank" className="hover:underline inline-flex items-center gap-0.5">
                                  그룹단가 <ExternalLink className="h-2.5 w-2.5" />
                                </Link>
                              </td>
                              <td className="py-1 px-1 text-center">
                                <span className="text-xs font-mono text-purple-600">{grpCP != null && grpCP > 0 ? formatNumber(grpCP) : '-'}</span>
                              </td>
                              <td className="py-1 px-1 text-center">
                                <span className="text-xs font-mono text-purple-600">{grpPP != null && grpPP > 0 ? formatNumber(grpPP) : '-'}</span>
                              </td>
                              <td className="py-1 px-1 text-center">
                                <span className="text-xs font-mono text-purple-600">{grpPPP != null && grpPPP > 0 ? formatNumber(grpPPP) : '-'}</span>
                              </td>
                              {pageRanges.map((range: number) => {
                                const grpRangeVal = grpRP[String(range)] != null ? Number(grpRP[String(range)]) : 0;
                                return (
                                  <td key={range} className="py-1 px-1 text-center">
                                    <span className="text-xs font-mono text-purple-600">{grpRangeVal > 0 ? formatNumber(grpRangeVal) : '-'}</span>
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                          {/* 개별단가 행 */}
                          <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                          {/* Nup */}
                          <td className="text-center py-1.5 px-2">
                            <span className="font-bold text-sm text-violet-700">{nup}</span>
                          </td>
                          {/* 규격 목록 */}
                          <td className="py-1.5 px-2 text-xs text-gray-500 max-w-[200px]">
                            <span className="truncate block" title={specNames}>{specNames}</span>
                          </td>
                          {/* 표지가격 */}
                          <td className="py-1 px-1 text-center">
                            <Input type="number" step="1"
                              value={editingPrices[cpKey] ?? (savedCP != null ? String(savedCP) : String(stdCP || ''))}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                const updates: Record<string, string> = { [cpKey]: e.target.value };
                                Object.entries(recalcRangePrices(v, curPPP, curPP, getRangePrice(pageRanges[0]))).forEach(([r, val]) => { updates[`${setting.id}_nup_${specId}_range_${r}`] = val; });
                                setEditingPrices(prev => ({ ...prev, ...updates }));
                              }}
                              className="h-8 w-full text-center font-mono text-xs bg-pink-50 border-pink-300 focus:border-pink-400 focus:ring-1 focus:ring-pink-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="0" />
                          </td>
                          {/* 용지가격(1p) */}
                          <td className="py-1 px-1 text-center">
                            <Input type="number" step="1"
                              value={editingPrices[ppKey] ?? (savedPP != null ? String(savedPP) : String(stdPP || ''))}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                const updates: Record<string, string> = { [ppKey]: e.target.value };
                                Object.entries(recalcRangePrices(curCP, curPPP, v, getRangePrice(pageRanges[0]))).forEach(([r, val]) => { updates[`${setting.id}_nup_${specId}_range_${r}`] = val; });
                                setEditingPrices(prev => ({ ...prev, ...updates }));
                              }}
                              className="h-8 w-full text-center font-mono text-xs bg-yellow-50 border-yellow-300 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="0" />
                          </td>
                          {/* 제본단가(1p) */}
                          <td className="py-1 px-1 text-center">
                            <Input type="number" step="0.01"
                              value={editingPrices[pppKey] ?? (savedPPP != null ? String(savedPPP) : String(stdPPP || ''))}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                const updates: Record<string, string> = { [pppKey]: e.target.value };
                                Object.entries(recalcRangePrices(curCP, v, curPP, getRangePrice(pageRanges[0]))).forEach(([r, val]) => { updates[`${setting.id}_nup_${specId}_range_${r}`] = val; });
                                setEditingPrices(prev => ({ ...prev, ...updates }));
                              }}
                              className="h-8 w-full text-center font-mono text-xs border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="0" />
                          </td>
                          {/* 구간별 가격 */}
                          {pageRanges.map((range: number, idx2: number) => {
                            const rangeKey = `${setting.id}_nup_${specId}_range_${range}`;
                            const currentPrice = getRangePrice(range);
                            // 표지가격이 있으면 자동계산 (읽기전용)
                            if (curCP > 0) {
                              return (
                                <td key={range} className="py-1 px-1 text-center">
                                  <span className="h-8 flex items-center justify-center font-mono text-xs text-gray-700 bg-gray-50 rounded border border-gray-200">
                                    {formatNumber(editingPrices[rangeKey] != null ? Number(editingPrices[rangeKey]) : currentPrice)}
                                  </span>
                                </td>
                              );
                            }
                            // 표지가격 없으면 첫 구간만 입력 가능
                            if (idx2 === 0) {
                              return (
                                <td key={range} className="py-1 px-1 text-center">
                                  <Input type="number"
                                    className="h-8 w-full text-xs text-center font-mono bg-blue-50 border-blue-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0"
                                    value={editingPrices[rangeKey] ?? String(currentPrice || '')}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      const fr = pageRanges[0] || 20;
                                      const updates: Record<string, string> = { [rangeKey]: e.target.value };
                                      pageRanges.forEach((r: number, i: number) => { if (i > 0) updates[`${setting.id}_nup_${specId}_range_${r}`] = String(Math.round(v + (r - fr) * (curPPP + curPP))); });
                                      setEditingPrices(prev => ({ ...prev, ...updates }));
                                    }} />
                                </td>
                              );
                            }
                            return (
                              <td key={range} className="py-1 px-1 text-center">
                                <span className="h-8 flex items-center justify-center font-mono text-xs text-gray-700 bg-gray-50 rounded border border-gray-200">
                                  {formatNumber(editingPrices[rangeKey] != null ? Number(editingPrices[rangeKey]) : currentPrice)}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-gray-400">선택된 Nup 그룹: {sortedNups.length}개 (같은 Nup의 모든 규격에 동일 가격 적용)</p>
              <p className="text-[11px] text-gray-400">* 표지가격 입력 시 구간별 가격이 자동 계산됩니다. (구간가격 = 표지가격 + (제본단가 + 용지가격) × 페이지수)</p>

              {Object.keys(editingPrices).some(k => k.startsWith(`${setting.id}_nup_`)) && (
                <div className="flex justify-end">
                  <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" disabled={isSaving}
                    onClick={() => {
                      const prices: any[] = [];
                      sortedNups.forEach((nup) => {
                        const gi = nupGroups.get(nup) || [];
                        if (gi.length === 0) return;
                        const sId = gi[0].specId;
                        const rd = gi[0].rangeData;
                        const sRec = clientPricesMap.get(`${setting.id}__${sId}`) || clientPricesMap.get(`${setting.id}_${pageRanges[0]}_${sId}`);
                        const sRP = sRec?.rangePrices || {};
                        const cv = editingPrices[`${setting.id}_nup_${sId}_coverPrice`] != null ? parseFloat(editingPrices[`${setting.id}_nup_${sId}_coverPrice`]) : (sRP.__coverPrice != null ? Number(sRP.__coverPrice) : (rd?.coverPrice || 0));
                        const pv = editingPrices[`${setting.id}_nup_${sId}_paperPrice`] != null ? parseFloat(editingPrices[`${setting.id}_nup_${sId}_paperPrice`]) : (sRP.__paperPrice != null ? Number(sRP.__paperPrice) : (rd?.paperPrice || 0));
                        const ppv = editingPrices[`${setting.id}_nup_${sId}_perPage`] != null ? parseFloat(editingPrices[`${setting.id}_nup_${sId}_perPage`]) : (sRec?.pricePerPage != null ? Number(sRec.pricePerPage) : (rd?.pricePerPage || 0));
                        const rpObj: Record<string, number> = {};
                        pageRanges.forEach((r: number) => {
                          const rKey = `${setting.id}_nup_${sId}_range_${r}`;
                          rpObj[String(r)] = editingPrices[rKey] != null ? Number(editingPrices[rKey]) : (sRP[String(r)] != null ? Number(sRP[String(r)]) : (rd?.rangePrices?.[r] || 0));
                        });
                        prices.push({ specificationId: sId, basePages: pageRanges[0] || 20, basePrice: rpObj[String(pageRanges[0])] || 0, pricePerPage: ppv, coverPrice: Number.isFinite(cv) ? cv : undefined, paperPrice: Number.isFinite(pv) ? pv : undefined, rangePrices: rpObj });
                      });
                      if (prices.length > 0) handleSavePrices(setting.id, prices);
                    }}>
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    저장
                  </Button>
                </div>
              )}
            </div>
          );
        })()}

        {/* 규격별 Nup/1p단가 (finishing_spec_nup) */}
        {pricingType === 'finishing_spec_nup' && (() => {
          if (nupPageRanges.length === 0) return <div className="mt-3 text-center py-4 text-gray-400 text-sm bg-gray-50 rounded">표준단가에서 먼저 Nup 규격을 설정해주세요.</div>;
          const nupGroups2 = new Map<string, any[]>();
          nupPageRanges.forEach((item: any) => {
            const nup = item.specificationNup || 'other';
            if (!nupGroups2.has(nup)) nupGroups2.set(nup, []);
            nupGroups2.get(nup)!.push({ ...item, specInfo: { name: item.specificationName || '', nup } });
          });
          const nupOrder2 = ['1++up', '1+up', '1up', '2up', '4up', '6up', '8up'];
          const sortedNups2 = nupOrder2.filter(nup => nupGroups2.has(nup));
          nupGroups2.forEach((_, nup) => { if (!sortedNups2.includes(nup)) sortedNups2.push(nup); });

          return (
            <div className="mt-3 space-y-3">
              <div className="border rounded-lg p-4 bg-white">
                <div className="space-y-0">
                  {sortedNups2.map((nup) => {
                    const items = nupGroups2.get(nup) || [];
                    if (items.length === 0) return null;
                    const stdPrice = items[0]?.pricePerPage || 0;
                    const firstSpecId = items[0]?.specificationId;
                    const nupKey = `${setting.id}_nup_${firstSpecId}_perPage`;
                    const savedPrice = clientPricesMap.get(`${setting.id}__${firstSpecId}`);
                    const groupSpecPrice2 = groupPricesMap.get(`${setting.id}__${firstSpecId}`);
                    const displayValue = editingPrices[nupKey] ?? (savedPrice?.price ? String(Number(savedPrice.price)) : (groupSpecPrice2?.price ? String(Number(groupSpecPrice2.price)) : ''));
                    const specNames = items.map((item: any) => item.specInfo.name || '').filter(Boolean).join(', ');
                    return (
                      <div key={nup} className="py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-14 shrink-0">
                            <Badge variant="secondary" className="bg-violet-100 text-violet-700 font-semibold w-full justify-center">{nup}</Badge>
                          </div>
                          <div className="w-16 shrink-0 text-right"><span className="text-xs text-gray-400 font-mono">{formatNumber(stdPrice)}</span></div>
                          <div className="w-24 shrink-0">
                            <Input type="number" placeholder="단가" className="w-full h-7 text-sm text-right font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              value={displayValue}
                              onChange={(e) => {
                                const newPrices2: Record<string, string> = {};
                                items.forEach((item: any) => { newPrices2[`${setting.id}_nup_${item.specificationId}_perPage`] = e.target.value; });
                                setEditingPrices(prev => ({ ...prev, ...newPrices2 }));
                              }} />
                          </div>
                          <div className="flex-1 text-xs text-gray-500 truncate">{specNames}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {Object.keys(editingPrices).some(k => k.startsWith(`${setting.id}_nup_`)) && (
                <div className="flex justify-end">
                  <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" disabled={isSaving}
                    onClick={() => {
                      const prices: any[] = [];
                      nupPageRanges.forEach((item: any) => {
                        const key = `${setting.id}_nup_${item.specificationId}_perPage`;
                        if (editingPrices[key]) prices.push({ specificationId: item.specificationId, price: parseFloat(editingPrices[key]) });
                      });
                      if (prices.length > 0) handleSavePrices(setting.id, prices);
                    }}>
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    저장
                  </Button>
                </div>
              )}
            </div>
          );
        })()}

        {/* 길이별/면적별/기타 단가 */}
        {pricingType === 'finishing_length' && (() => {
          const lps = setting.lengthPrices || [];
          if (lps.length === 0) return <div className="mt-3 text-center py-4 text-gray-400 text-sm bg-gray-50 rounded">표준단가에서 먼저 길이별 단가를 설정해주세요.</div>;
          return (
            <div className="mt-3 space-y-3">
              <table className="w-full text-xs border-collapse bg-white rounded border">
                <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-medium text-gray-500 border-b">길이 (cm)</th><th className="px-3 py-2 text-center font-medium text-gray-500 border-b w-24">표준단가</th><th className="px-3 py-2 text-center font-medium text-gray-500 border-b w-32">개별단가</th></tr></thead>
                <tbody>{lps.map((lp: any) => {
                  const key = `${setting.id}_length_${lp.lengthCm}`;
                  const saved = clientPricesMap.get(`${setting.id}__${lp.lengthCm}`);
                  const groupLP = groupPricesMap.get(`${setting.id}__${lp.lengthCm}`);
                  return (<tr key={lp.lengthCm} className="border-b hover:bg-gray-50"><td className="px-3 py-2 font-medium text-gray-700">{lp.lengthCm}cm</td><td className="px-3 py-2 text-center text-gray-500">{lp.price ? formatNumber(lp.price) : '-'}</td><td className="px-3 py-2 text-center"><Input type="number" className="h-7 w-24 text-xs text-center font-mono mx-auto" placeholder="-" value={editingPrices[key] ?? (saved?.price ? String(Number(saved.price)) : (groupLP?.price ? String(Number(groupLP.price)) : ''))} onChange={(e) => setEditingPrices(prev => ({ ...prev, [key]: e.target.value }))} /></td></tr>);
                })}</tbody>
              </table>
              {Object.keys(editingPrices).some(k => k.startsWith(`${setting.id}_length_`)) && (
                <div className="flex justify-end"><Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" disabled={isSaving} onClick={() => {
                  const prices: any[] = [];
                  lps.forEach((lp: any) => { const k = `${setting.id}_length_${lp.lengthCm}`; if (editingPrices[k]) prices.push({ lengthCm: lp.lengthCm, price: parseFloat(editingPrices[k]) }); });
                  if (prices.length > 0) handleSavePrices(setting.id, prices);
                }}>{isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}저장</Button></div>
              )}
            </div>
          );
        })()}

        {pricingType === 'finishing_area' && (() => {
          const aps = setting.areaPrices || [];
          if (aps.length === 0) return <div className="mt-3 text-center py-4 text-gray-400 text-sm bg-gray-50 rounded">표준단가에서 먼저 면적별 단가를 설정해주세요.</div>;
          return (
            <div className="mt-3 space-y-3">
              <table className="w-full text-xs border-collapse bg-white rounded border">
                <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-medium text-gray-500 border-b">면적 (cm2)</th><th className="px-3 py-2 text-center font-medium text-gray-500 border-b w-24">표준단가</th><th className="px-3 py-2 text-center font-medium text-gray-500 border-b w-32">개별단가</th></tr></thead>
                <tbody>{aps.map((ap: any) => {
                  const key = `${setting.id}_area_${ap.areaCm2}`;
                  const saved = clientPricesMap.get(`${setting.id}__${ap.areaCm2}`);
                  const groupAP = groupPricesMap.get(`${setting.id}__${ap.areaCm2}`);
                  return (<tr key={ap.areaCm2} className="border-b hover:bg-gray-50"><td className="px-3 py-2 font-medium text-gray-700">{formatNumber(ap.areaCm2)}cm2</td><td className="px-3 py-2 text-center text-gray-500">{ap.price ? formatNumber(ap.price) : '-'}</td><td className="px-3 py-2 text-center"><Input type="number" className="h-7 w-24 text-xs text-center font-mono mx-auto" placeholder="-" value={editingPrices[key] ?? (saved?.price ? String(Number(saved.price)) : (groupAP?.price ? String(Number(groupAP.price)) : ''))} onChange={(e) => setEditingPrices(prev => ({ ...prev, [key]: e.target.value }))} /></td></tr>);
                })}</tbody>
              </table>
              {Object.keys(editingPrices).some(k => k.startsWith(`${setting.id}_area_`)) && (
                <div className="flex justify-end"><Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" disabled={isSaving} onClick={() => {
                  const prices: any[] = [];
                  aps.forEach((ap: any) => { const k = `${setting.id}_area_${ap.areaCm2}`; if (editingPrices[k]) prices.push({ areaCm2: ap.areaCm2, price: parseFloat(editingPrices[k]) }); });
                  if (prices.length > 0) handleSavePrices(setting.id, prices);
                }}>{isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}저장</Button></div>
              )}
            </div>
          );
        })()}

        {(pricingType === 'finishing_qty' || pricingType === 'finishing_page' || pricingType === 'binding_page') && (() => {
          const stdPrice = setting.basePrice || setting.prices?.[0]?.price || 0;
          const key = `${setting.id}_base_price`;
          const saved = clientPricesMap.get(`${setting.id}__base`);
          const groupBasePrice = groupPricesMap.get(`${setting.id}__base`);
          return (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded border">
                <span className="text-sm font-medium text-gray-700">{pricingType === 'finishing_qty' ? '수량당 단가' : pricingType === 'finishing_page' ? '페이지당 단가' : '제본 페이지당 단가'}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">표준: {formatNumber(stdPrice)}원</span>
                  {groupId && groupBasePrice?.price != null && Number(groupBasePrice.price) > 0 && (
                    <Link href={`/pricing/group?groupId=${groupId}&settingId=${setting.id}`} target="_blank" className="text-xs text-purple-500 hover:underline hover:text-purple-800" title="그룹단가 설정으로 이동">
                      그룹: {formatNumber(Number(groupBasePrice.price))}원
                    </Link>
                  )}
                  <Input type="number" className="h-8 w-28 text-sm text-center font-mono" placeholder="개별단가"
                    value={editingPrices[key] ?? (saved?.price ? String(Number(saved.price)) : (groupBasePrice?.price ? String(Number(groupBasePrice.price)) : ''))}
                    onChange={(e) => setEditingPrices(prev => ({ ...prev, [key]: e.target.value }))} />
                  <span className="text-xs text-gray-500">원</span>
                </div>
              </div>
              {editingPrices[key] && (
                <div className="flex justify-end"><Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" disabled={isSaving} onClick={() => {
                  if (editingPrices[key]) handleSavePrices(setting.id, [{ price: parseFloat(editingPrices[key]) }]);
                }}>{isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}저장</Button></div>
              )}
            </div>
          );
        })()}

        {!hasPriceGroups && !hasInkjetSpecs &&
         pricingType !== 'nup_page_range' && pricingType !== 'finishing_spec_nup' &&
         pricingType !== 'finishing_length' && pricingType !== 'finishing_area' &&
         pricingType !== 'finishing_qty' && pricingType !== 'finishing_page' && pricingType !== 'binding_page' && (
          <div className="mt-3 text-center py-4 text-gray-400 text-sm bg-gray-50 rounded">
            {printMethod === 'indigo' ? "표준단가에서 먼저 단가 그룹을 설정해주세요." : printMethod === 'inkjet' ? "표준단가에서 먼저 규격을 설정해주세요." : "표준단가에서 먼저 설정을 완료해주세요."}
          </div>
        )}
      </div>
    );
  };

  // ===== 메인 렌더 =====
  return (
    <div className="space-y-4">
      {/* 상단 정보 바 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">가격 적용 우선순위</p>
                <p className="text-blue-700 mt-1">
                  <strong>개별단가</strong> → 그룹단가 → 그룹 할인율 → 표준단가
                </p>
                {groupName && (
                  <p className="text-blue-600 mt-1">소속 그룹: <strong>{groupName}</strong></p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {totalPriceCount > 0 && (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  {totalPriceCount}개 개별단가 설정됨
                </Badge>
              )}
              {/* 전체 가중치 버튼 숨김 - 설정값별/용지그룹별 가중치 사용 */}
              <Button variant="outline" size="sm" className="h-9 px-3 text-xs bg-white text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={() => setIsBulkAdjustDialogOpen(true)}>
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /> 전체 단가맞춤
              </Button>
              {totalPriceCount > 0 && (
                <Button variant="outline" size="sm" className="h-9 px-3 text-xs bg-white text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setIsResetDialogOpen(true)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> 개별단가 초기화
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 개별단가가 없을 때 안내 */}
      {!clientPricesLoading && totalPriceCount === 0 && groupId && (
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-purple-400 shrink-0" />
              <p className="text-[14px] text-black font-normal">
                개별단가가 없으므로 소속 그룹 "<strong>{groupName}</strong>"의 그룹단가가 표시됩니다. 값을 수정하면 개별단가로 저장됩니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 메인 콘텐츠: 트리 + 설정 패널 */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* 좌측: 제품 분류 트리 */}
        <Card className="flex flex-col border-0 shadow-lg bg-white/50 backdrop-blur-sm overflow-hidden h-full">
          <CardHeader className="border-b border-gray-100 bg-white/80 py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-500" />
                제품 분류
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50" onClick={expandAll}>↓ 모두 펼치기</Button>
                <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50" onClick={collapseAll}>↑ 모두 접기</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto max-h-[calc(100vh-380px)]">
            {treeLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
            ) : (
              <div className="space-y-1">
                {productionTree?.map((group) => (
                  <TreeNode key={group.id} group={group} expandedIds={expandedIds} toggleExpand={toggleExpand}
                    selectedGroupId={selectedProductionGroupId} onSelectGroup={(g) => { setSelectedProductionGroupId(g.id); setSelectedSettingId(null); }}
                    configuredSettingIds={configuredSettingIds} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 우측: 단가 설정 패널 */}
        <Card className="flex-1">
          <CardHeader className="border-b bg-gray-50/50 py-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                {selectedProductionGroup ? (
                  <>
                    <div className="flex items-center gap-2">
                      {selectedSettingId && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                          onClick={() => setSelectedSettingId(null)}>
                          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> 목록
                        </Button>
                      )}
                      <CardTitle className="text-base font-semibold">{selectedProductionGroup.name}</CardTitle>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedProductionGroup.depth === 1 ? "대분류" : selectedProductionGroup.depth === 2 ? "중분류" : "소분류"} · {selectedProductionGroup.settings?.length || 0}개 설정
                    </p>
                  </>
                ) : (
                  <CardTitle className="text-base font-semibold text-gray-400">그룹을 선택하세요</CardTitle>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 max-h-[calc(100vh-380px)] overflow-y-auto">
            {!selectedProductionGroup ? (
              <div className="text-center py-16 text-muted-foreground">
                <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>좌측에서 그룹을 선택해주세요.</p>
              </div>
            ) : selectedProductionGroup.settings?.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>등록된 설정이 없습니다.</p>
              </div>
            ) : !selectedSettingId ? (
              <div className="space-y-2">
                {selectedProductionGroup.settings?.map((setting: any) => {
                  const pricingType = setting.pricingType || '';
                  const printMethod = setting.printMethod;
                  const savedCount = clientPrices?.filter((cp: any) => cp.productionSettingId === setting.id).length || 0;
                  return (
                    <div key={setting.id} className={cn(
                        "group flex items-center justify-between gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                        savedCount > 0
                          ? "border-blue-400 bg-blue-50/50 hover:bg-blue-100/50"
                          : "hover:bg-indigo-50 hover:border-indigo-200"
                      )}
                      onClick={() => setSelectedSettingId(setting.id)}>
                      <div className="flex items-center gap-3 flex-wrap min-w-0">
                        {savedCount > 0 && <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />}
                        <span className="text-[14px] font-bold text-black">{setting.settingName || setting.codeName || "설정"}</span>
                        <Badge variant="outline" className="text-xs font-normal text-gray-600 bg-gray-50 shrink-0">{PRICING_TYPE_LABELS[pricingType] || pricingType}</Badge>
                        {printMethod && <Badge variant="secondary" className="text-xs shrink-0">{PRINT_METHOD_LABELS[printMethod] || printMethod}</Badge>}
                        <span className="text-xs text-gray-500 shrink-0">작업시간: <span className="font-mono font-medium text-gray-900">{Number(setting.workDays) || 1}일</span></span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {savedCount > 0 && <Badge className="text-[10px] h-5 bg-green-100 text-green-700 hover:bg-green-100">{savedCount}개 개별단가</Badge>}
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                {selectedProductionGroup.settings?.filter((s: any) => s.id === selectedSettingId).map((setting: any) => (
                  <ClientSettingCard key={setting.id} setting={setting} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 단가 맞춤 다이얼로그 */}
      <Dialog open={isPriceAdjustDialogOpen} onOpenChange={setIsPriceAdjustDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>개별 단가맞춤</DialogTitle>
            <DialogDescription>가격 구간별로 반올림 단위를 설정합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPriceAdjustRanges([{ maxPrice: 500, adjustment: 10 }, { maxPrice: 1000, adjustment: 50 }, { maxPrice: Infinity, adjustment: 100 }])}>초기화</Button>
              <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={() => {
                const lastMax = priceAdjustRanges.length > 0 ? (priceAdjustRanges[priceAdjustRanges.length - 1].maxPrice === Infinity ? (priceAdjustRanges[priceAdjustRanges.length - 2]?.maxPrice || 1000) + 1000 : priceAdjustRanges[priceAdjustRanges.length - 1].maxPrice + 1000) : 1000;
                setPriceAdjustRanges(prev => {
                  const hasInf = prev.some(r => r.maxPrice === Infinity);
                  if (hasInf) { const wo = prev.filter(r => r.maxPrice !== Infinity); const inf = prev.find(r => r.maxPrice === Infinity)!; return [...wo, { maxPrice: lastMax, adjustment: 100 }, inf]; }
                  return [...prev, { maxPrice: lastMax, adjustment: 100 }];
                });
              }}>+ 구간 추가</Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr><th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 w-12">#</th><th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">기준 금액</th><th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">반올림 단위</th><th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 w-16">삭제</th></tr></thead>
                <tbody className="divide-y">
                  {priceAdjustRanges.map((range, index) => {
                    const isLast = range.maxPrice === Infinity;
                    return (
                      <tr key={index} className="bg-white hover:bg-gray-50">
                        <td className="px-3 py-3 text-center"><span className="text-gray-600 font-medium">{index + 1}</span></td>
                        <td className="px-3 py-3">{isLast ? <span className="text-sm text-gray-700">그 이상 모두</span> : (
                          <Select value={String(range.maxPrice)} onValueChange={(val) => setPriceAdjustRanges(prev => prev.map((r, i) => i === index ? { ...r, maxPrice: Number(val) } : r))}>
                            <SelectTrigger className="h-9 w-40 text-sm"><span>{formatNumber(range.maxPrice)}원</span></SelectTrigger>
                            <SelectContent>{[500, 1000, 2000, 3000, 5000, 10000, 20000, 50000, 100000].map(v => <SelectItem key={v} value={String(v)}>{formatNumber(v)}원</SelectItem>)}</SelectContent>
                          </Select>
                        )}</td>
                        <td className="px-3 py-3">
                          <Select value={String(range.adjustment)} onValueChange={(val) => setPriceAdjustRanges(prev => prev.map((r, i) => i === index ? { ...r, adjustment: Number(val) } : r))}>
                            <SelectTrigger className="h-9 w-36 text-sm"><span>{formatNumber(range.adjustment)}원 단위</span></SelectTrigger>
                            <SelectContent>{[10, 50, 100, 500, 1000, 10000].map(unit => <SelectItem key={unit} value={String(unit)}>{formatNumber(unit)}원 단위</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-3 text-center">{!isLast && priceAdjustRanges.length > 1 && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setPriceAdjustRanges(prev => prev.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
                        )}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-10 px-4 text-amber-600 border-amber-300 hover:bg-amber-50" onClick={resetPriceAdjustment}>원래 금액으로</Button>
            <Button variant="outline" className="h-10 px-4" onClick={() => setIsPriceAdjustDialogOpen(false)}>취소</Button>
            <Button className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 shadow-sm" onClick={applyPriceAdjustment}>적용</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 전체 가중치 다이얼로그 */}
      <Dialog open={isBulkWeightDialogOpen} onOpenChange={setIsBulkWeightDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>전체 가중치 적용</DialogTitle>
            <DialogDescription>모든 생산설정의 표준단가에 가중치(%)를 적용하여 개별단가를 일괄 설정합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 justify-center">
              <span className="text-sm text-gray-600">표준단가 ×</span>
              <div className="flex items-center gap-2">
                <Input type="number" className="h-12 w-24 text-xl text-center font-mono font-bold" min={1} max={200} value={bulkWeightPercent} onChange={(e) => setBulkWeightPercent(Number(e.target.value) || 0)} />
                <span className="text-xl font-bold text-gray-600">%</span>
              </div>
              <span className="text-sm text-gray-600">= 개별단가</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[70, 80, 85, 90, 95].map(pct => (
                <Button key={pct} variant={bulkWeightPercent === pct ? "default" : "outline"} size="sm"
                  className={`h-8 text-xs ${bulkWeightPercent === pct ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                  onClick={() => setBulkWeightPercent(pct)}>{pct}%</Button>
              ))}
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
              <p className="text-sm text-indigo-700">
                <span className="font-medium">적용 결과 예시:</span><br />
                표준단가 10,000원 → 개별단가 <span className="font-bold">{formatNumber(Math.round(10000 * bulkWeightPercent / 100))}원</span>
                <span className="text-indigo-500 ml-2">({bulkWeightPercent < 100 ? `${100 - bulkWeightPercent}% 할인` : bulkWeightPercent > 100 ? `${bulkWeightPercent - 100}% 인상` : '동일'})</span>
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700">기존 개별단가가 있으면 모두 덮어씁니다.</div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsBulkWeightDialogOpen(false)}>취소</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={applyWeightAllMutation.isPending || bulkWeightPercent < 1 || bulkWeightPercent > 200} onClick={handleBulkWeightApply}>
              {applyWeightAllMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Percent className="h-4 w-4 mr-2" />}
              전체 적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 전체 단가맞춤 다이얼로그 */}
      <Dialog open={isBulkAdjustDialogOpen} onOpenChange={setIsBulkAdjustDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>전체 단가맞춤</DialogTitle>
            <DialogDescription>
              모든 생산설정의 개별단가를 구간별 반올림 단위로 일괄 조정합니다.
              {(!clientPrices || clientPrices.length === 0) && (
                <span className="block mt-1 text-amber-600">
                  개별단가가 없으므로 {groupId ? '그룹단가' : '표준단가'}를 먼저 복사한 후 단가맞춤을 적용합니다.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setBulkAdjustRanges([{ maxPrice: 500, adjustment: 10 }, { maxPrice: 1000, adjustment: 50 }, { maxPrice: Infinity, adjustment: 100 }])}>초기화</Button>
              <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={() => {
                const lastMax = bulkAdjustRanges.length > 0 ? (bulkAdjustRanges[bulkAdjustRanges.length - 1].maxPrice === Infinity ? (bulkAdjustRanges[bulkAdjustRanges.length - 2]?.maxPrice || 1000) + 1000 : bulkAdjustRanges[bulkAdjustRanges.length - 1].maxPrice + 1000) : 1000;
                setBulkAdjustRanges(prev => {
                  const hasInf = prev.some(r => r.maxPrice === Infinity);
                  if (hasInf) { const wo = prev.filter(r => r.maxPrice !== Infinity); const inf = prev.find(r => r.maxPrice === Infinity)!; return [...wo, { maxPrice: lastMax, adjustment: 100 }, inf]; }
                  return [...prev, { maxPrice: lastMax, adjustment: 100 }];
                });
              }}>+ 구간 추가</Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr><th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 w-12">#</th><th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">기준 금액</th><th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">반올림 단위</th><th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 w-16">삭제</th></tr></thead>
                <tbody className="divide-y">
                  {bulkAdjustRanges.map((range, index) => {
                    const isLast = range.maxPrice === Infinity;
                    return (
                      <tr key={index} className="bg-white hover:bg-gray-50">
                        <td className="px-3 py-3 text-center"><span className="text-gray-600 font-medium">{index + 1}</span></td>
                        <td className="px-3 py-3">{isLast ? <span className="text-sm text-gray-700">그 이상 모두</span> : (
                          <Select value={String(range.maxPrice)} onValueChange={(val) => setBulkAdjustRanges(prev => prev.map((r, i) => i === index ? { ...r, maxPrice: Number(val) } : r))}>
                            <SelectTrigger className="h-9 w-40 text-sm"><span>{formatNumber(range.maxPrice)}원</span></SelectTrigger>
                            <SelectContent>{[500, 1000, 2000, 3000, 5000, 10000, 20000, 50000, 100000].map(v => <SelectItem key={v} value={String(v)}>{formatNumber(v)}원</SelectItem>)}</SelectContent>
                          </Select>
                        )}</td>
                        <td className="px-3 py-3">
                          <Select value={String(range.adjustment)} onValueChange={(val) => setBulkAdjustRanges(prev => prev.map((r, i) => i === index ? { ...r, adjustment: Number(val) } : r))}>
                            <SelectTrigger className="h-9 w-36 text-sm"><span>{formatNumber(range.adjustment)}원 단위</span></SelectTrigger>
                            <SelectContent>{[10, 50, 100, 500, 1000, 10000].map(unit => <SelectItem key={unit} value={String(unit)}>{formatNumber(unit)}원 단위</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-3 text-center">{!isLast && bulkAdjustRanges.length > 1 && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setBulkAdjustRanges(prev => prev.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
                        )}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700">모든 생산설정의 개별단가가 반올림 조정됩니다. 서버에 직접 저장됩니다.</div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsBulkAdjustDialogOpen(false)}>취소</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" disabled={setClientPricesMutation.isPending || cloneAllMutation.isPending} onClick={handleBulkAdjust}>
              {(setClientPricesMutation.isPending || cloneAllMutation.isPending) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <SlidersHorizontal className="h-4 w-4 mr-2" />}
              전체 적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 개별단가 초기화 확인 다이얼로그 */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>개별단가 초기화</DialogTitle>
            <DialogDescription>
              {clientName}의 모든 개별단가({totalPriceCount}개)를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>취소</Button>
            <Button variant="destructive" disabled={deleteClientPricesMutation.isPending} onClick={handleResetAll}>
              {deleteClientPricesMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              전체 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

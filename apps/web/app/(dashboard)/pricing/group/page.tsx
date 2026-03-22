'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientGroups } from '@/hooks/use-clients';
import {
  useProductionGroupTree,
  type ProductionGroup,
  type ProductionSetting,
} from '@/hooks/use-production';
import {
  useGroupProductionSettingPrices,
  useSetGroupProductionSettingPrices,
  useCloneStandardToGroupPrices,
  useCloneAllToGroup,
  useApplyWeightAllToGroup,
} from '@/hooks/use-pricing';
import { usePapersByPrintMethod } from '@/hooks/use-paper';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Edit, Trash2, Copy, Percent } from 'lucide-react';
import {
  Loader2,
  DollarSign,
  Users,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Settings2,
  Save,
  X,
  ArrowLeft,
  SlidersHorizontal,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
// SPEC_PURPOSE_LABELS → PRINT_METHOD_LABELS로 대체 (pricing-constants에서 import)

// 공통 상수/유틸리티 (중복 제거 → 공유 모듈에서 import)
import {
  PRICING_TYPE_LABELS,
  PRINT_METHOD_LABELS,
  PRICE_GROUP_STYLES,
  NUP_TO_COUNT,
  NUP_ORDER,
} from '@/components/pricing/pricing-constants';
import { formatNumber, getFixedPrintSide } from '@/components/pricing/pricing-utils';

// NUP_TO_COUNT, NUP_ORDER → pricing-constants에서 import 완료

// 트리 노드 컴포넌트
function TreeNode({
  group,
  expandedIds,
  toggleExpand,
  selectedGroupId,
  onSelectGroup,
  level = 0,
}: {
  group: ProductionGroup;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  selectedGroupId: string | null;
  onSelectGroup: (group: ProductionGroup) => void;
  level?: number;
}) {
  const isExpanded = expandedIds.has(group.id);
  const hasChildren = group.children && group.children.length > 0;
  const isSelected = selectedGroupId === group.id;
  const depth = group.depth || 1;
  const settingsCount = group.settings?.length || 0;

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
        {/* 확장 버튼 */}
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

        {/* 폴더 아이콘 */}
        <div className={cn(
          "flex items-center justify-center w-6 h-6 rounded-md shrink-0 transition-colors",
          isSelected
            ? (depth === 1 ? "bg-indigo-100 text-indigo-600" : "bg-white text-indigo-500 shadow-sm border border-indigo-100")
            : (depth === 1 ? "bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm" : "bg-transparent text-gray-400 group-hover:text-gray-500")
        )}>
          {isExpanded ? (
            <FolderOpen className="h-4 w-4" />
          ) : (
            <Folder className="h-4 w-4" />
          )}
        </div>

        {/* 이름 및 정보 */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className={cn(
              "truncate font-medium transition-colors",
              isSelected
                ? "text-indigo-900"
                : "text-gray-700 group-hover:text-gray-900",
              depth === 1 ? "text-sm" : "text-[13px]"
            )}>
              {group.name}
              {hasChildren && (
                <span className="ml-1.5 text-[11px] text-gray-400 font-normal">
                  {group.children?.length}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* 설정 개수 뱃지 */}
        {settingsCount > 0 && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-slate-100 text-slate-500">
            {settingsCount}개 설정
          </Badge>
        )}
      </div>

      {/* 하위 그룹 */}
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
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GroupPricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupIdFromUrl = searchParams.get('groupId');

  const [selectedClientGroupId, setSelectedClientGroupId] = useState<string>('');

  // 드롭다운 변경 시 URL도 업데이트
  const handleClientGroupChange = (groupId: string) => {
    setSelectedClientGroupId(groupId);
    router.push(`/pricing/group?groupId=${groupId}`, { scroll: false });
  };
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

  // 가중치 상태 (그룹별 weight 퍼센트, 100 = 동일가격, 85 = 15% 할인)
  const [weights, setWeights] = useState<Record<string, number>>({});

  // 전체 가중치 적용 다이얼로그 상태
  const [isBulkWeightDialogOpen, setIsBulkWeightDialogOpen] = useState(false);
  const [bulkWeightPercent, setBulkWeightPercent] = useState<number>(85);

  // 전체 단가맞춤 다이얼로그 상태
  const [isBulkAdjustDialogOpen, setIsBulkAdjustDialogOpen] = useState(false);
  const [bulkAdjustRanges, setBulkAdjustRanges] = useState([
    { maxPrice: 500, adjustment: 10 },
    { maxPrice: 1000, adjustment: 50 },
    { maxPrice: Infinity, adjustment: 100 },
  ]);

  // 잉크젯 그룹단가 입력 모달 상태
  const [isInkjetPriceDialogOpen, setIsInkjetPriceDialogOpen] = useState(false);
  const [inkjetDialogSetting, setInkjetDialogSetting] = useState<any>(null);

  const { data: clientGroupsData, isLoading: clientGroupsLoading } = useClientGroups({ limit: 100 });

  // URL에서 groupId가 전달된 경우 자동 선택 (표준단가그룹 제외)
  useEffect(() => {
    if (groupIdFromUrl && clientGroupsData?.data) {
      const group = clientGroupsData.data.find(g => g.id === groupIdFromUrl);
      if (group && group.groupName !== '표준단가그룹' && selectedClientGroupId !== groupIdFromUrl) {
        setSelectedClientGroupId(groupIdFromUrl);
      }
    }
  }, [groupIdFromUrl, clientGroupsData, selectedClientGroupId]);
  const { data: productionTree, isLoading: treeLoading } = useProductionGroupTree();
  const { data: groupPrices, isLoading: groupPricesLoading } = useGroupProductionSettingPrices(selectedClientGroupId);
  const setGroupPricesMutation = useSetGroupProductionSettingPrices();
  const cloneStandardMutation = useCloneStandardToGroupPrices();
  const cloneAllMutation = useCloneAllToGroup();
  const applyWeightAllMutation = useApplyWeightAllToGroup();
  const { data: indigoPapers } = usePapersByPrintMethod('indigo');
  const { data: inkjetPapers } = usePapersByPrintMethod('inkjet');
  const { data: albumPapers } = usePapersByPrintMethod('album');
  const { data: indigoAlbumPapers } = usePapersByPrintMethod('indigoAlbum');
  const { toast } = useToast();

  // 용지 ID -> 용지 정보 맵 (인디고 + 잉크젯)
  const papersMap = useMemo(() => {
    const map = new Map<string, any>();
    if (indigoPapers) {
      indigoPapers.forEach((paper: any) => {
        map.set(paper.id, paper);
      });
    }
    if (inkjetPapers) {
      inkjetPapers.forEach((paper: any) => {
        map.set(paper.id, paper);
      });
    }
    if (albumPapers) {
      albumPapers.forEach((paper: any) => {
        map.set(paper.id, paper);
      });
    }
    if (indigoAlbumPapers) {
      indigoAlbumPapers.forEach((paper: any) => {
        map.set(paper.id, paper);
      });
    }
    return map;
  }, [indigoPapers, inkjetPapers, albumPapers, indigoAlbumPapers]);

  const selectedClientGroup = clientGroupsData?.data?.find(g => g.id === selectedClientGroupId);

  // 그룹 단가 맵 (settingId_priceGroupId_minQuantity -> price data)
  const groupPricesMap = useMemo(() => {
    const map = new Map<string, any>();
    if (groupPrices) {
      groupPrices.forEach((gp: any) => {
        // priceGroupId와 specificationId가 모두 있으면 (잉크젯 그룹별 규격단가)
        if (gp.priceGroupId && gp.specificationId) {
          const key = `${gp.productionSettingId}_${gp.priceGroupId}_${gp.specificationId}`;
          map.set(key, gp);
        }
        // priceGroupId만 있으면 (인디고/앨범 그룹별 Up단가)
        else if (gp.priceGroupId) {
          // nupKey가 있으면 nupKey로, 없으면 minQuantity로 키 구성
          const upKey = gp.nupKey || gp.minQuantity || '';
          const key = `${gp.productionSettingId}_${gp.priceGroupId}_${upKey}`;
          map.set(key, gp);
        }
        // 둘 다 없으면 규격 기반 키
        else {
          const key = `${gp.productionSettingId}_${gp.minQuantity || ''}_${gp.specificationId || ''}`;
          map.set(key, gp);
        }
      });
    }
    return map;
  }, [groupPrices]);

  // 저장된 그룹 가격에서 가중치 계산
  useEffect(() => {
    if (!productionTree || !selectedClientGroupId) {
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
            // 기준행: 첫 번째 항목 (인디고: up=1, 앨범: idx=0)
            const oneUpPrice = upPrices[0];
            if (!oneUpPrice) return;
            const baseKey = oneUpPrice.nupKey || oneUpPrice.up || 1;
            const savedGroupPrice = groupPricesMap.get(`${setting.id}_${priceGroup.id}_${baseKey}`);
            if (!savedGroupPrice) return;
            const standardPrice = oneUpPrice.fourColorSinglePrice;
            const groupPrice = savedGroupPrice.fourColorSinglePrice;
            if (standardPrice > 0 && groupPrice > 0) {
              const weight = Math.round((groupPrice / standardPrice) * 100);
              calculatedWeights[`${setting.id}_${priceGroup.id}`] = weight;
            }
          });
        });
      }
      if (group.children) {
        group.children.forEach(processGroup);
      }
    };

    productionTree.forEach(processGroup);
    setWeights(calculatedWeights);
  }, [productionTree, groupPricesMap, selectedClientGroupId]);

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

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

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

  // 단가 변경 핸들러
  const handlePriceChange = (settingId: string, value: string) => {
    setEditingPrices(prev => ({
      ...prev,
      [settingId]: value,
    }));
  };

  // 단가 저장 핸들러
  const handleSavePrices = async (settingId: string, pricesData: any[]) => {
    if (!selectedClientGroupId || pricesData.length === 0) return;

    setIsSaving(true);
    try {
      await setGroupPricesMutation.mutateAsync({
        clientGroupId: selectedClientGroupId,
        productionSettingId: settingId,
        prices: pricesData,
      });

      toast({
        title: '저장 완료',
        description: '그룹 단가가 저장되었습니다.',
      });

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
        description: '그룹 단가 저장에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 특정 설정에 편집 중인 가격이 있는지 확인
  const hasEditingPricesForSetting = (settingId: string) => {
    return Object.keys(editingPrices).some(key => key.startsWith(settingId + '_'));
  };

  // 표준단가를 그룹단가로 복사
  const handleCloneStandard = async (productionSettingId: string) => {
    if (!selectedClientGroupId) return;
    if (!confirm('표준단가를 그룹단가로 복사하시겠습니까?\n기존 그룹단가가 있으면 덮어씁니다.')) return;

    try {
      await cloneStandardMutation.mutateAsync({
        clientGroupId: selectedClientGroupId,
        productionSettingId,
      });
      toast({ title: '복사 완료', description: '표준단가가 그룹단가로 복사되었습니다.' });
      // 편집 상태 초기화
      setEditingPrices(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (key.startsWith(productionSettingId + '_')) delete next[key];
        });
        return next;
      });
    } catch {
      toast({ title: '복사 실패', description: '표준단가 복사에 실패했습니다.', variant: 'destructive' });
    }
  };

  // 그룹별 가격 저장 핸들러 (인디고 upPrices + 잉크젯 specPrices 모두 지원)
  const handleSaveGroupPrices = async (settingId: string, priceGroups: any[], printMethod?: string) => {
    const prices: any[] = [];

    priceGroups.forEach((group: any) => {
      // 인디고/앨범: upPrices 처리
      const upPrices = group.upPrices || [];
      upPrices.forEach((upPrice: any) => {
        // nupKey가 있으면 nupKey를 키로 사용 (앨범/인디고앨범)
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

      // 잉크젯: specPrices 처리
      const specPrices = group.specPrices || [];
      specPrices.forEach((specPrice: any) => {
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
      toast({
        title: '변경사항 없음',
        description: '수정된 단가가 없습니다. 단가를 입력 후 저장해주세요.',
        variant: 'default',
      });
    }
  };

  // 할인율 계산
  const calculateDiscount = (standardPrice: number, groupPrice: number): string => {
    if (standardPrice <= 0 || groupPrice <= 0) return '-';
    const discount = ((standardPrice - groupPrice) / standardPrice * 100);
    if (discount > 0) return `${discount.toFixed(1)}% 할인`;
    if (discount < 0) return `${Math.abs(discount).toFixed(1)}% 인상`;
    return '동일';
  };

  // 단가 맞춤 다이얼로그 열기
  const openPriceAdjustDialog = (settingId: string, priceGroups: any[], printMethod: string = 'indigo') => {
    setPriceAdjustSettingId(settingId);
    setPriceAdjustPriceGroups(priceGroups);
    setPriceAdjustPrintMethod(printMethod);
    setIsPriceAdjustDialogOpen(true);
  };

  // 잉크젯 그룹단가 입력 다이얼로그 열기
  const openInkjetPriceDialog = (setting: any) => {
    setInkjetDialogSetting(setting);
    setIsInkjetPriceDialogOpen(true);
  };

  // 가중치 적용 함수 (표준단가 * 가중치% = 그룹단가)
  const applyWeight = (settingId: string, groupId: string, upPrices: any[], weightPercent: number) => {
    const updates: Record<string, string> = {};
    const weight = weightPercent / 100;

    upPrices.forEach((upPrice: any) => {
      ['fourColorSinglePrice', 'fourColorDoublePrice', 'sixColorSinglePrice', 'sixColorDoublePrice'].forEach(field => {
        const standardPrice = upPrice[field] || 0;
        if (standardPrice > 0) {
          const groupPrice = Math.round(standardPrice * weight);
          const upKey = upPrice.nupKey || upPrice.up;
          const key = `${settingId}_${groupId}_${upKey}_${field}`;
          updates[key] = groupPrice.toString();
        }
      });
    });

    setEditingPrices(prev => ({ ...prev, ...updates }));
    setWeights(prev => ({ ...prev, [`${settingId}_${groupId}`]: weightPercent }));

    toast({
      title: `가중치 ${weightPercent}% 적용`,
      description: `표준단가의 ${weightPercent}%로 그룹단가가 계산되었습니다.`,
    });
  };

  // 잉크젯 가중치 적용 함수
  const applyInkjetWeight = (settingId: string, groupId: string, specPrices: any[], specifications: any[], weightPercent: number) => {
    const updates: Record<string, string> = {};
    const weight = weightPercent / 100;

    specPrices.forEach((specPrice: any) => {
      const standardPrice = specPrice.singleSidedPrice || 0;
      if (standardPrice > 0) {
        const groupPrice = Math.round(standardPrice * weight);
        const key = `${settingId}_${groupId}_spec_${specPrice.specificationId}`;
        updates[key] = groupPrice.toString();
      }
    });

    setEditingPrices(prev => ({ ...prev, ...updates }));
    setWeights(prev => ({ ...prev, [`${settingId}_${groupId}`]: weightPercent }));

    toast({
      title: `단가맞춤 ${weightPercent}% 적용`,
      description: `표준단가의 ${weightPercent}%로 그룹단가가 계산되었습니다.`,
    });
  };

  // 전체 가중치 적용 (서버 API 호출)
  const handleBulkWeightApply = async () => {
    if (!selectedClientGroupId || !bulkWeightPercent) return;
    try {
      const result = await applyWeightAllMutation.mutateAsync({
        clientGroupId: selectedClientGroupId,
        weightPercent: bulkWeightPercent,
      });
      toast({
        title: '전체 가중치 적용 완료',
        description: `${result.appliedSettings}개 설정, ${result.appliedPrices}개 단가에 ${bulkWeightPercent}% 적용되었습니다.`,
      });
      setIsBulkWeightDialogOpen(false);
      // 편집 상태 초기화
      setEditingPrices({});
      setWeights({});
    } catch {
      toast({ title: '전체 가중치 적용 실패', variant: 'destructive' });
    }
  };

  // 전체 단가맞춤 적용 (표준단가 복사 후 단가맞춤)
  const handleBulkAdjust = async () => {
    if (!selectedClientGroupId) return;

    // 먼저 그룹단가가 없으면 표준단가 복사
    if (!groupPrices || groupPrices.length === 0) {
      try {
        await cloneAllMutation.mutateAsync({
          targetGroupId: selectedClientGroupId,
          sourceType: 'standard',
        });
      } catch {
        toast({ title: '표준단가 복사 실패', variant: 'destructive' });
        return;
      }
    }

    // 서버에서 모든 그룹단가를 다시 불러온 후 단가맞춤 적용 필요
    // 현재 로드된 groupPrices를 기반으로 단가맞춤 적용
    const currentRanges = [...bulkAdjustRanges];

    const getMinPrice = (index: number): number => {
      if (index === 0) return 0;
      return Number(currentRanges[index - 1].maxPrice) + 1;
    };

    const findRange = (price: number) => {
      for (let i = 0; i < currentRanges.length; i++) {
        const range = currentRanges[i];
        const minPrice = getMinPrice(i);
        const maxPrice = Number(range.maxPrice);
        if (price >= minPrice && price <= maxPrice) {
          return range;
        }
      }
      return currentRanges[currentRanges.length - 1];
    };

    const roundToUnit = (price: number, unit: number): number => {
      if (unit <= 0) return price;
      return Math.round(price / unit) * unit;
    };

    const adjustPrice = (price: number) => {
      const numPrice = Number(price);
      if (!numPrice || numPrice <= 0) return 0;
      const range = findRange(numPrice);
      if (!range) return numPrice;
      const roundingUnit = Number(range.adjustment) || 10;
      return Math.max(0, roundToUnit(numPrice, roundingUnit));
    };

    // 모든 그룹단가에 단가맞춤 적용
    if (!groupPrices || groupPrices.length === 0) {
      toast({ title: '적용할 그룹단가가 없습니다.', variant: 'destructive' });
      setIsBulkAdjustDialogOpen(false);
      return;
    }

    // productionSettingId별로 그룹화하여 일괄 저장
    const settingMap = new Map<string, any[]>();
    groupPrices.forEach((gp: any) => {
      if (!settingMap.has(gp.productionSettingId)) {
        settingMap.set(gp.productionSettingId, []);
      }
      settingMap.get(gp.productionSettingId)!.push(gp);
    });

    let totalAdjusted = 0;
    const priceFields = ['price', 'singleSidedPrice', 'doubleSidedPrice', 'fourColorSinglePrice', 'fourColorDoublePrice', 'sixColorSinglePrice', 'sixColorDoublePrice', 'basePrice', 'pricePerPage'];

    for (const [settingId, prices] of settingMap.entries()) {
      const adjustedPrices = prices.map((p: any) => {
        const adjusted: any = {};
        // 키 필드 복사
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

        // rangePrices 처리
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
        await setGroupPricesMutation.mutateAsync({
          clientGroupId: selectedClientGroupId,
          productionSettingId: settingId,
          prices: adjustedPrices,
        });
      } catch {
        // 개별 설정 실패는 무시
      }
    }

    toast({
      title: totalAdjusted > 0 ? `전체 단가맞춤 완료 (${totalAdjusted}건 조정)` : '조정된 단가가 없습니다.',
    });
    setIsBulkAdjustDialogOpen(false);
  };

  // 단가 맞춤 적용 함수
  const applyPriceAdjustment = () => {
    if (!priceAdjustSettingId || priceAdjustPriceGroups.length === 0) return;

    const currentRanges = [...priceAdjustRanges];

    const getMinPrice = (index: number): number => {
      if (index === 0) return 0;
      return Number(currentRanges[index - 1].maxPrice) + 1;
    };

    const findRange = (price: number) => {
      for (let i = 0; i < currentRanges.length; i++) {
        const range = currentRanges[i];
        const minPrice = getMinPrice(i);
        const maxPrice = Number(range.maxPrice);
        if (price >= minPrice && price <= maxPrice) {
          return range;
        }
      }
      return currentRanges[currentRanges.length - 1];
    };

    const roundToUnit = (price: number, unit: number): number => {
      if (unit <= 0) return price;
      return Math.round(price / unit) * unit;
    };

    const adjustPrice = (price: number) => {
      const numPrice = Number(price);
      if (!numPrice || numPrice <= 0) return 0;
      const range = findRange(numPrice);
      if (!range) return numPrice;
      const roundingUnit = Number(range.adjustment) || 10;
      return Math.max(0, roundToUnit(numPrice, roundingUnit));
    };

    let adjustedCount = 0;
    const newPrices: Record<string, string> = {};

    if (priceAdjustPrintMethod === 'inkjet') {
      // 잉크젯: specPrices 처리
      priceAdjustPriceGroups.forEach((group: any) => {
        const specPrices = group.specPrices || [];
        specPrices.forEach((specPrice: any) => {
          const key = `${priceAdjustSettingId}_${group.id}_spec_${specPrice.specificationId}`;
          const editedValue = editingPrices[key];
          const savedGroupPrice = groupPricesMap.get(`${priceAdjustSettingId}_${group.id}_${specPrice.specificationId}`);
          const currentValue = editedValue ?? (savedGroupPrice?.price ? String(Number(savedGroupPrice.price)) : (specPrice.singleSidedPrice ? String(specPrice.singleSidedPrice) : null));
          if (currentValue) {
            const originalPrice = parseFloat(currentValue) || 0;
            if (originalPrice > 0) {
              const adjustedPrice = adjustPrice(originalPrice);
              newPrices[key] = adjustedPrice.toString();
              if (adjustedPrice !== originalPrice) adjustedCount++;
            }
          }
        });
      });
    } else {
      // 인디고/앨범: upPrices 처리
      priceAdjustPriceGroups.forEach((group: any) => {
        const upPrices = group.upPrices || [];

        upPrices.forEach((upPrice: any) => {
          const upKey = upPrice.nupKey || upPrice.up;
          // 앨범: fourColorSinglePrice만, 인디고: 4가지 색상+면 조합
          const fields = (priceAdjustPrintMethod === 'album')
            ? ['fourColorSinglePrice']
            : ['fourColorSinglePrice', 'fourColorDoublePrice', 'sixColorSinglePrice', 'sixColorDoublePrice'];
          fields.forEach(field => {
            const key = `${priceAdjustSettingId}_${group.id}_${upKey}_${field}`;
            const editedValue = editingPrices[key];
            const savedGroupPrice = groupPricesMap.get(`${priceAdjustSettingId}_${group.id}_${upKey}`)?.[field];
            const currentValue = editedValue ?? (savedGroupPrice ? String(savedGroupPrice) : null);

            if (currentValue) {
              const originalPrice = parseFloat(currentValue) || 0;
              if (originalPrice > 0) {
                const adjustedPrice = adjustPrice(originalPrice);
                if (adjustedPrice !== originalPrice) {
                  newPrices[key] = adjustedPrice.toString();
                  adjustedCount++;
                } else {
                  newPrices[key] = currentValue;
                }
              }
            }
          });
        });
      });
    }

    if (Object.keys(newPrices).length > 0) {
      setEditingPrices(prev => ({ ...prev, ...newPrices }));
    }

    toast({
      title: adjustedCount > 0 ? `단가가 조정되었습니다. (${adjustedCount}건)` : '조정된 단가가 없습니다.',
    });

    setIsPriceAdjustDialogOpen(false);
  };

  // 단가 조정 초기화 (원래 금액으로)
  const resetPriceAdjustment = () => {
    if (!priceAdjustSettingId) return;

    setEditingPrices(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (key.startsWith(priceAdjustSettingId + '_')) {
          delete next[key];
        }
      });
      return next;
    });

    setWeights(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (key.startsWith(priceAdjustSettingId + '_')) {
          delete next[key];
        }
      });
      return next;
    });

    toast({ title: '편집 내용이 초기화되었습니다.' });
    setIsPriceAdjustDialogOpen(false);
  };

  // ===== GroupSettingCard 컴포넌트 (production SettingCard 구조 동일) =====
  const GroupSettingCard = ({ setting }: { setting: any }) => {
    const printMethod = setting.printMethod;
    const pricingType = setting.pricingType || '';
    const priceGroups = setting.priceGroups || [];
    const hasPriceGroups = (printMethod === 'indigo' || printMethod === 'inkjet' || printMethod === 'album' || printMethod === 'indigoAlbum') && priceGroups.length > 0;
    const isAlbumType = printMethod === 'album' || printMethod === 'indigoAlbum';
    const specifications = setting.specifications || [];
    const standardPrices = setting.prices || [];
    const hasInkjetSpecs = printMethod === 'inkjet' && specifications.length > 0 && !hasPriceGroups;

    // prices 배열에서 nupPageRanges 변환 (nup_page_range, finishing_spec_nup용)
    const nupPageRanges = useMemo(() => {
      if (pricingType !== 'nup_page_range' && pricingType !== 'finishing_spec_nup') return [];
      return standardPrices
        .filter((p: any) => p.specificationId)
        .map((p: any) => {
          const rangePrices: Record<number, number> = {};
          let coverPrice: number | undefined = undefined;
          let paperPrice: number | undefined = undefined;
          if (p.rangePrices && typeof p.rangePrices === 'object') {
            Object.entries(p.rangePrices).forEach(([key, value]: [string, any]) => {
              if (key === '__coverPrice') {
                coverPrice = Number(value);
              } else if (key === '__paperPrice') {
                paperPrice = Number(value);
              } else {
                rangePrices[Number(key)] = Number(value);
              }
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

    // 1up(기준행) 변경 시 다른 nup 자동 계산 (그룹별)
    const handleOneUpChange = (groupId: string, field: string, value: string, upPricesForCalc?: any[]) => {
      const basePrice = parseFloat(value) || 0;
      const updates: Record<string, string> = {};

      if (isAlbumType && upPricesForCalc && upPricesForCalc.length > 0) {
        // 앨범: nupKey 기반 자동 계산 (기준행 nupCount 기준)
        const baseNupCount = upPricesForCalc[0]?.nupKey ? (NUP_TO_COUNT[upPricesForCalc[0].nupKey] || 1) : upPricesForCalc[0]?.up || 1;
        upPricesForCalc.forEach((upPrice: any, idx: number) => {
          const upKey = upPrice.nupKey || upPrice.up;
          const key = `${setting.id}_${groupId}_${upKey}_${field}`;
          if (idx === 0) {
            updates[key] = value;
          } else {
            const nupCount = upPrice.nupKey ? (NUP_TO_COUNT[upPrice.nupKey] || 1) : upPrice.up;
            const weight = upPrice.weight || 1;
            updates[key] = basePrice > 0 ? Math.round((basePrice / nupCount * baseNupCount) * weight).toString() : '';
          }
        });
      } else {
        // 인디고: up 숫자 기반 자동 계산
        [1, 2, 4, 8].forEach(up => {
          const key = `${setting.id}_${groupId}_${up}_${field}`;
          if (up === 1) {
            updates[key] = value;
          } else {
            updates[key] = basePrice > 0 ? Math.round(basePrice / up).toString() : '';
          }
        });
      }

      setEditingPrices(prev => ({ ...prev, ...updates }));
    };

    // 해당 설정에 변경된 가격이 있는지
    const hasChanges = Object.keys(editingPrices).some(key =>
      key.startsWith(setting.id + '_') && !key.includes('_baseSpec') && !key.includes('_groupBase') && !key.includes('_sqinch')
    );

    // 저장된 그룹단가 개수 계산
    const savedGroupPriceCount = groupPrices?.filter((gp: any) => gp.productionSettingId === setting.id).length || 0;

    return (
      <div className="group/card border rounded-lg p-4 mb-3 bg-white hover:shadow-sm transition-shadow">
        {/* 카드 헤더 - production SettingCard와 동일 */}
        <div className="flex gap-4 items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              {/* 세팅명 */}
              <span className="text-base font-bold text-gray-900">
                {setting.settingName || setting.codeName || "설정"}
              </span>

              {/* 적용단위 */}
              <Badge variant="outline" className="text-xs font-normal text-gray-600 bg-gray-50">
                {PRICING_TYPE_LABELS[pricingType] || pricingType}
              </Badge>

              {/* 인쇄방식 */}
              {printMethod && (
                <Badge variant="secondary" className="text-xs">
                  {PRINT_METHOD_LABELS[printMethod] || printMethod}
                </Badge>
              )}

              {/* 작업시간 */}
              <div className="flex items-center text-xs text-gray-500">
                <span className="mr-1">작업시간:</span>
                <span className="font-mono font-medium text-gray-900">{Number(setting.workDays) || 1}일</span>
              </div>

              {/* 그룹단가 설정 상태 */}
              {savedGroupPriceCount > 0 && (
                <Badge className="text-[10px] h-5 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                  {savedGroupPriceCount}개 그룹단가
                </Badge>
              )}
            </div>
          </div>

          {/* 우측: 액션 버튼 */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 표준단가 복사 버튼 */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
              disabled={cloneStandardMutation.isPending}
              onClick={() => handleCloneStandard(setting.id)}
            >
              {cloneStandardMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1" />
              )}
              표준단가 복사
            </Button>
            {/* 단가맞춤 버튼 - 인디고/앨범 그룹이 있을 때만 */}
            {(printMethod === 'indigo' || printMethod === 'indigoAlbum' || printMethod === 'album') && hasPriceGroups && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => openPriceAdjustDialog(setting.id, priceGroups, printMethod)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
                단가맞춤
              </Button>
            )}
            {/* 잉크젯: 모달로 단가 입력 + 단가맞춤 */}
            {printMethod === 'inkjet' && hasPriceGroups && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => openPriceAdjustDialog(setting.id, priceGroups, 'inkjet')}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
                  단가맞춤
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  onClick={() => openInkjetPriceDialog(setting)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  단가 입력
                </Button>
              </>
            )}
            {/* 저장 버튼 */}
            {hasChanges && (
              <Button
                size="sm"
                className="h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-xs"
                disabled={isSaving}
                onClick={() => {
                  if (hasPriceGroups) {
                    handleSaveGroupPrices(setting.id, priceGroups);
                  }
                }}
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1" />
                )}
                저장
              </Button>
            )}
          </div>
        </div>

        {/* DEBUG removed */}

        {/* ====== 인디고/인디고앨범/앨범: 가격그룹별 Up×색상 매트릭스 (표준단가와 동일 레이아웃) ====== */}
        {hasPriceGroups && (printMethod === 'indigo' || printMethod === 'indigoAlbum' || printMethod === 'album') && (
          <div className="space-y-3">
            <div className={cn("grid gap-3", printMethod === 'album' ? "grid-cols-3" : "grid-cols-2")}>
              {priceGroups.map((group: any) => {
                const style = PRICE_GROUP_STYLES[group.color] || PRICE_GROUP_STYLES.none;
                const upPrices = (group.upPrices || []).sort((a: any, b: any) => {
                  const aKey = a.nupKey || `${a.up}up`;
                  const bKey = b.nupKey || `${b.up}up`;
                  const aIdx = NUP_ORDER.indexOf(aKey as any);
                  const bIdx = NUP_ORDER.indexOf(bKey as any);
                  return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
                });

                // 연결된 용지 정보
                const paperPriceGroupMap = setting.paperPriceGroupMap || {};
                const linkedPaperIds = Object.entries(paperPriceGroupMap)
                  .filter(([_, gId]) => gId === group.id)
                  .map(([paperId]) => paperId);
                const linkedPapers = linkedPaperIds
                  .map(id => papersMap.get(id))
                  .filter((p: any) => p && (!p.printMethods || p.printMethods.includes(printMethod)));

                // 그룹명 기반 단면/양면 고정
                const fps = getFixedPrintSide(selectedProductionGroup?.name || '');

                return (
                  <div
                    key={group.id}
                    className={cn(
                      "border-2 p-3 space-y-2 shadow-sm",
                      style.bg, style.border
                    )}
                  >
                    {/* 그룹 헤더 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{style.dot}</span>
                        <span className={cn("font-bold text-base", style.text)}>{style.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {linkedPapers.length > 0 ? `${linkedPapers.length}개 용지` : `${upPrices.length}개 Up`}
                        </Badge>
                      </div>
                      {/* 전체 가중치 입력 */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-500">가중치</span>
                        <Input
                          type="number"
                          className="h-6 w-14 text-xs text-center font-mono"
                          placeholder="100"
                          value={weights[`${setting.id}_${group.id}`] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setWeights(prev => ({ ...prev, [`${setting.id}_${group.id}`]: val ? Number(val) : 0 }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const weightVal = weights[`${setting.id}_${group.id}`] || 100;
                              if (weightVal > 0 && weightVal <= 200) {
                                applyWeight(setting.id, group.id, upPrices, weightVal);
                              }
                            }
                          }}
                        />
                        <span className="text-[10px] text-gray-500">%</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-indigo-600 hover:bg-indigo-50"
                          onClick={() => {
                            const weightVal = weights[`${setting.id}_${group.id}`] || 100;
                            if (weightVal > 0 && weightVal <= 200) {
                              applyWeight(setting.id, group.id, upPrices, weightVal);
                            } else {
                              toast({ title: '가중치는 1~200 사이 값을 입력하세요.', variant: 'destructive' });
                            }
                          }}
                        >
                          적용
                        </Button>
                      </div>
                    </div>

                    {/* 할당된 용지 미리보기 */}
                    {linkedPapers.length > 0 && (
                      <div className="text-xs text-gray-500 truncate">
                        {linkedPapers.map((p: any) => `${p?.name}${p?.grammage ? ` ${p.grammage}g` : ''}`).join(", ")}
                      </div>
                    )}

                    {/* Up별 가격 입력 테이블 (표준단가와 동일 구조) */}
                    <div className="border border-gray-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          {(() => {
                            const isAlbum = printMethod === 'album';
                            return (
                              <tr className="bg-gray-100 border-b border-gray-200">
                                <th className="text-center py-1 px-1 font-medium text-gray-600">Up</th>
                                <th className="text-center py-1 px-1 font-medium text-gray-400 text-[10px]">가중치</th>
                                {isAlbum ? (
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
                            );
                          })()}
                        </thead>
                        <tbody>
                          {upPrices.map((upPrice: any, idx: number) => {
                            const isBase = idx === 0;
                            const upKey = upPrice.nupKey || upPrice.up;
                            const savedGroupPrice = groupPricesMap.get(`${setting.id}_${group.id}_${upKey}`);
                            const isAlbum = printMethod === 'album';

                            return (
                              <tr key={upKey} className={cn("border-b border-gray-100 last:border-0", isBase && "bg-amber-50/50")}>
                                <td className="text-center py-0.5 px-0.5 font-medium text-indigo-600">{upPrice.nupKey || `${upPrice.up}up`}</td>
                                <td className="text-center px-0.5 py-0.5">
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="0.1"
                                      min="0.1"
                                      max="5"
                                      className="h-8 w-12 text-center text-[11px] bg-gray-50 border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      value={upPrice.weight || ""}
                                      disabled={isBase}
                                      onChange={(e) => {
                                        const weight = Number(e.target.value) || 1;
                                        // 가중치 변경 시: editingPrices 내에서 기준행 기준으로 재계산
                                        const baseUpPrice = upPrices[0];
                                        if (!baseUpPrice) return;
                                        const baseNupCount = baseUpPrice.nupKey ? (NUP_TO_COUNT[baseUpPrice.nupKey] || 1) : baseUpPrice.up;
                                        const nupCount = upPrice.nupKey ? (NUP_TO_COUNT[upPrice.nupKey] || 1) : upPrice.up;
                                        const fields = isAlbum
                                          ? ['fourColorSinglePrice']
                                          : (['fourColorSinglePrice', 'fourColorDoublePrice', 'sixColorSinglePrice', 'sixColorDoublePrice'] as const).filter(f => {
                                              if (fps === 'single') return !f.includes('Double');
                                              if (fps === 'double') return !f.includes('Single');
                                              return true;
                                            });
                                        const updates: Record<string, string> = {};
                                        fields.forEach((field) => {
                                          const baseKey = `${setting.id}_${group.id}_${baseUpPrice.nupKey || baseUpPrice.up}_${field}`;
                                          const savedBasePrice = groupPricesMap.get(`${setting.id}_${group.id}_${baseUpPrice.nupKey || baseUpPrice.up}`);
                                          const baseVal = parseFloat(editingPrices[baseKey] ?? '') || savedBasePrice?.[field] || baseUpPrice[field] || 0;
                                          const key = `${setting.id}_${group.id}_${upKey}_${field}`;
                                          updates[key] = baseVal > 0 ? Math.round((baseVal / nupCount * baseNupCount) * weight).toString() : '';
                                        });
                                        setEditingPrices(prev => ({ ...prev, ...updates }));
                                      }}
                                      placeholder="1"
                                    />
                                  </div>
                                </td>
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
                                  const savedPrice = savedGroupPrice?.[field];

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
                                          value={editingPrices[key] ?? (savedPrice ? String(savedPrice) : (standardPrice > 0 ? String(standardPrice) : ''))}
                                          onChange={(e) => {
                                            if (isBase) {
                                              handleOneUpChange(group.id, field, e.target.value, upPrices);
                                            } else {
                                              setEditingPrices(prev => ({ ...prev, [key]: e.target.value }));
                                            }
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
                    <p className="text-xs text-gray-400 mt-1">
                      * 1up 가격 설정 시, 선택된 Up 만큼 나눠진 가격이 자동 계산됩니다.
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 저장 버튼 */}
            {hasChanges && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-8 bg-indigo-600 hover:bg-indigo-700"
                  disabled={isSaving}
                  onClick={() => handleSaveGroupPrices(setting.id, priceGroups)}
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  저장
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ====== 잉크젯 (가격그룹 없음): 규격별 단가 테이블 ====== */}
        {hasInkjetSpecs && (
          <div className="mt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse bg-white rounded border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-500 border-b">규격</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 border-b w-24">표준단가</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 border-b w-32">그룹단가</th>
                  </tr>
                </thead>
                <tbody>
                  {specifications.map((spec: any) => {
                    const specInfo = spec.specification || spec;
                    const specId = spec.specificationId || spec.id;
                    const standardPrice = standardPrices.find((p: any) => p.specificationId === specId);
                    const key = `${setting.id}_spec_${specId}`;
                    const savedGroupPrice = groupPricesMap.get(`${setting.id}__${specId}`);

                    return (
                      <tr key={specId} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-700">
                          {specInfo.name || specId}
                          {specInfo.widthInch && specInfo.heightInch && (
                            <span className="text-gray-400 text-[10px] ml-1">
                              ({Number(specInfo.widthInch).toFixed(1)}x{Number(specInfo.heightInch).toFixed(1)}")
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-500">
                          {standardPrice?.price ? formatNumber(Number(standardPrice.price)) : '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Input
                            type="number"
                            className="h-7 w-24 text-xs text-center font-mono mx-auto"
                            placeholder="-"
                            value={editingPrices[key] ?? (savedGroupPrice?.price ? String(Number(savedGroupPrice.price)) : '')}
                            onChange={(e) => {
                              setEditingPrices(prev => ({ ...prev, [key]: e.target.value }));
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 저장 버튼 */}
            {hasEditingPricesForSetting(setting.id) && (
              <div className="flex justify-end mt-3">
                <Button
                  size="sm"
                  className="h-8 bg-indigo-600 hover:bg-indigo-700"
                  disabled={isSaving}
                  onClick={() => {
                    const prices: any[] = [];
                    specifications.forEach((spec: any) => {
                      const specId = spec.specificationId || spec.id;
                      const key = `${setting.id}_spec_${specId}`;
                      const editedValue = editingPrices[key];
                      if (editedValue) {
                        prices.push({
                          specificationId: specId,
                          price: parseFloat(editedValue),
                        });
                      }
                    });
                    if (prices.length > 0) {
                      handleSavePrices(setting.id, prices);
                    }
                  }}
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  저장
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ====== 잉크젯 (가격그룹 있음): 그룹별 규격 단가 편집 (표준단가와 동일 레이아웃) ====== */}
        {hasPriceGroups && printMethod === 'inkjet' && (
          <div className="mt-2">
            <div className="grid grid-cols-3 gap-3">
              {priceGroups.map((group: any) => {
                const style = PRICE_GROUP_STYLES[group.color] || PRICE_GROUP_STYLES.none;
                const specPrices = group.specPrices || [];
                const paperPriceGroupMap = setting.paperPriceGroupMap || {};
                const linkedPaperIds = Object.entries(paperPriceGroupMap)
                  .filter(([_, gId]) => gId === group.id)
                  .map(([paperId]) => paperId);
                const linkedPapers = linkedPaperIds
                  .map(id => papersMap.get(id))
                  .filter((p: any) => p && (!p.printMethods || p.printMethods.includes(printMethod)));

                // 기준규격 결정 (표준단가와 동일)
                const baseSpecId = group.inkjetBaseSpecId || (specPrices[0]?.specificationId || '');

                return (
                  <div key={group.id} className={cn("p-2 border-2", style.bg, style.border)}>
                    {/* 그룹 헤더 (표준단가와 동일 구조) */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1">
                        <span className={cn("text-xs font-semibold", style.text)}>
                          {style.dot} {style.label}
                        </span>
                        <span className="text-[10px] bg-gray-200 text-gray-700 px-1 py-0.5">
                          {specPrices.length}개 규격
                        </span>
                      </div>
                      {/* 전체 가중치 적용 */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500">가중치</span>
                        <Input
                          type="number"
                          className="h-5 w-12 text-[10px] text-center font-mono"
                          placeholder="100"
                          value={weights[`${setting.id}_${group.id}_inkjet`] || ''}
                          onChange={(e) => {
                            setWeights(prev => ({ ...prev, [`${setting.id}_${group.id}_inkjet`]: e.target.value ? Number(e.target.value) : 0 }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const weightVal = weights[`${setting.id}_${group.id}_inkjet`] || 100;
                              if (weightVal > 0 && weightVal <= 200) {
                                // 표준가 기준으로 가중치 적용
                                const updates: Record<string, string> = {};
                                specPrices.forEach((sp: any) => {
                                  const stdPrice = sp.singleSidedPrice || 0;
                                  if (stdPrice > 0) {
                                    const key = `${setting.id}_${group.id}_spec_${sp.specificationId}`;
                                    updates[key] = String(Math.round(stdPrice * weightVal / 100));
                                  }
                                });
                                setEditingPrices(prev => ({ ...prev, ...updates }));
                              }
                            }
                          }}
                        />
                        <span className="text-[10px] text-gray-500">%</span>
                      </div>
                    </div>

                    {/* 할당된 용지 미리보기 */}
                    {linkedPapers.length > 0 && (
                      <div className="text-[9px] text-gray-500 mb-1 truncate">
                        {linkedPapers.map((p: any) => `${p?.name}${p?.grammage ? ` ${p.grammage}g` : ''}`).join(', ')}
                      </div>
                    )}

                    {/* 규격별 단가 테이블 (표준단가와 동일 구조) */}
                    <div className="border overflow-hidden bg-white/50">
                      <table className="w-full text-[10px]">
                        <thead className="bg-gray-100">
                          <tr className="border-b">
                            <th className="px-1 py-1 text-center">규격</th>
                            <th className="px-1 py-1 text-center w-12">가중치</th>
                            <th className="px-1 py-1 text-center w-14">표준</th>
                            <th className="px-1 py-1 text-center w-16">그룹단가</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...specPrices]
                            .map((sp: any) => {
                              const spec = specifications.find((s: any) => (s.specificationId || s.id) === sp.specificationId)?.specification;
                              const area = spec ? Number(spec.widthInch) * Number(spec.heightInch) : 0;
                              return { ...sp, spec, area };
                            })
                            .sort((a, b) => a.area - b.area)
                            .map((specPrice: any) => {
                              const specId = specPrice.specificationId;
                              const spec = specPrice.spec;
                              const isBase = specId === baseSpecId;
                              const standardPrice = specPrice.singleSidedPrice || 0;
                              const savedGroupPrice = groupPricesMap.get(`${setting.id}_${group.id}_${specId}`);
                              const key = `${setting.id}_${group.id}_spec_${specId}`;

                              return (
                                <tr key={specId} className={cn("border-b", isBase ? "bg-green-50" : "")}>
                                  <td className={cn("px-1 py-0.5 text-center font-mono", isBase && "text-green-700 font-semibold")}>
                                    {spec?.name || specId?.slice(-6)}
                                    {isBase && <span className="text-green-600 ml-0.5 text-[8px]">(기준)</span>}
                                  </td>
                                  <td className="px-1 py-0.5 text-center text-gray-400">
                                    {specPrice.weight != null ? specPrice.weight : '1.0'}
                                  </td>
                                  <td className="px-1 py-0.5 text-center text-gray-400 font-mono">
                                    {standardPrice > 0 ? formatNumber(standardPrice) : '-'}
                                  </td>
                                  <td className="px-1 py-0.5 text-center">
                                    <Input
                                      type="number"
                                      className={cn(
                                        "h-5 w-14 text-[10px] text-center p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                        isBase ? "bg-green-100" : "bg-gray-50"
                                      )}
                                      value={editingPrices[key] ?? (savedGroupPrice?.price ? String(Number(savedGroupPrice.price)) : '')}
                                      onChange={(e) => {
                                        setEditingPrices(prev => ({ ...prev, [key]: e.target.value }));
                                      }}
                                      placeholder={standardPrice > 0 ? String(standardPrice) : "0"}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1">
                      * 가중치(%) 입력 후 Enter → 표준단가 기준 일괄 적용
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 잉크젯 그룹 저장 버튼 */}
            {Object.keys(editingPrices).some(key => key.startsWith(setting.id + '_') && key.includes('_spec_')) && (
              <div className="flex justify-end mt-3">
                <Button
                  size="sm"
                  className="h-8 bg-indigo-600 hover:bg-indigo-700"
                  disabled={isSaving}
                  onClick={() => {
                    // 잉크젯 그룹별로 저장
                    priceGroups.forEach((group: any) => {
                      const prices: any[] = [];
                      (group.specPrices || []).forEach((sp: any) => {
                        const key = `${setting.id}_${group.id}_spec_${sp.specificationId}`;
                        const editedValue = editingPrices[key];
                        const savedGroupPrice = groupPricesMap.get(`${setting.id}_${group.id}_${sp.specificationId}`);
                        const value = editedValue ?? (savedGroupPrice?.price ? String(Number(savedGroupPrice.price)) : null);
                        if (value) {
                          prices.push({
                            specificationId: sp.specificationId,
                            priceGroupId: group.id,
                            price: parseFloat(value),
                          });
                        }
                      });
                      if (prices.length > 0) {
                        setGroupPricesMutation.mutate({
                          clientGroupId: selectedClientGroupId,
                          productionSettingId: setting.id,
                          prices,
                        });
                      }
                    });
                    toast({ title: '잉크젯 그룹단가가 저장되었습니다.' });
                  }}
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  저장
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ====== 구간별 Nup/1p가격 (nup_page_range) - 표준단가와 동일한 레이아웃 ====== */}
        {pricingType === 'nup_page_range' && (() => {
          const pageRanges = setting.pageRanges || [20, 30, 40, 50, 60];
          const settingSpecs = setting.specifications || [];

          if (nupPageRanges.length === 0) {
            return (
              <div className="mt-3 text-center py-4 text-gray-400 text-sm bg-gray-50 rounded">
                표준단가에서 먼저 Nup 규격을 설정해주세요.
              </div>
            );
          }

          // Nup별로 그룹화 (prices에 포함된 specification.nup 사용)
          const nupOrder = ['1++up', '1+up', '1up', '2up', '4up', '6up', '8up'];
          const nupGroups = new Map<string, { specId: string; specInfo: any; rangeData: any }[]>();
          nupPageRanges.forEach((nupRange: any) => {
            // prices.specification에서 nup 가져오기 (settingSpecs가 없을 수 있음)
            const nup = nupRange.specificationNup || 'other';
            const specInfo = { name: nupRange.specificationName || '', nup };
            if (!nupGroups.has(nup)) {
              nupGroups.set(nup, []);
            }
            nupGroups.get(nup)!.push({ specId: nupRange.specificationId, specInfo, rangeData: nupRange });
          });
          const sortedNups = nupOrder.filter(nup => nupGroups.has(nup));
          // 나머지 nup도 포함
          nupGroups.forEach((_, nup) => {
            if (!sortedNups.includes(nup)) sortedNups.push(nup);
          });

          // 자동계산 함수 (표준단가와 동일)
          const recalcGroupRangePrices = (cp: number, ppp: number, pp: number, existingFirst?: number) => {
            const result: Record<string, string> = {};
            if (cp > 0) {
              pageRanges.forEach((r: number) => {
                result[String(r)] = String(Math.round(cp + (ppp + pp) * r));
              });
            } else {
              const firstRange = pageRanges[0] || 20;
              const firstPrice = existingFirst ?? 0;
              pageRanges.forEach((r: number, i: number) => {
                result[String(r)] = i === 0 ? String(firstPrice) : String(Math.round(firstPrice + (r - firstRange) * (ppp + pp)));
              });
            }
            return result;
          };

          return (
            <div className="mt-3 space-y-3">
              {/* 테이블 헤더 (표준단가와 동일 레이아웃, 체크박스 제외) */}
              <div
                className="grid gap-0 pb-2 border-b text-xs font-medium text-gray-600 items-center sticky top-0 bg-white z-10"
                style={{
                  gridTemplateColumns: `60px minmax(80px, 1fr) 70px 70px 80px ${pageRanges.map(() => '80px').join(' ')}`
                }}
              >
                <span>Nup</span>
                <span>규격 목록</span>
                <span className="text-center text-[10px]">표지가격</span>
                <span className="text-center text-[10px]">용지가격(1p)</span>
                <span className="text-right pr-2 text-[10px]">제본단가(1p)</span>
                {pageRanges.map((range: number) => (
                  <span key={range} className="text-center">{range}p</span>
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

                  // 규격 목록 (예: 5x7, 7x5, 6x8)
                  const specNames = groupItems.map(g => g.specInfo.name || '').filter(Boolean).join(', ');

                  // 그룹단가 로드: groupPricesMap에서 해당 specId로 저장된 레코드 찾기
                  // key: settingId_minQuantity_specId (minQuantity 없는 경우도 확인)
                  const savedGroupRecord = groupPricesMap.get(`${setting.id}__${specId}`)
                    || groupPricesMap.get(`${setting.id}_${pageRanges[0]}_${specId}`);
                  const savedRangePrices = savedGroupRecord?.rangePrices || {};
                  const savedGroupCoverPrice = savedRangePrices.__coverPrice != null ? Number(savedRangePrices.__coverPrice) : undefined;
                  const savedGroupPaperPrice = savedRangePrices.__paperPrice != null ? Number(savedRangePrices.__paperPrice) : undefined;
                  const savedGroupPricePerPage = savedGroupRecord?.pricePerPage != null ? Number(savedGroupRecord.pricePerPage) : undefined;

                  // editing keys
                  const coverPriceKey = `${setting.id}_nup_${specId}_coverPrice`;
                  const paperPriceKey = `${setting.id}_nup_${specId}_paperPrice`;
                  const perPageKey = `${setting.id}_nup_${specId}_perPage`;

                  // 현재 표시값 (editing > saved > standard)
                  const currentCoverPrice = editingPrices[coverPriceKey] != null
                    ? Number(editingPrices[coverPriceKey])
                    : (savedGroupCoverPrice ?? standardCoverPrice);
                  const currentPaperPrice = editingPrices[paperPriceKey] != null
                    ? Number(editingPrices[paperPriceKey])
                    : (savedGroupPaperPrice ?? standardPaperPrice);
                  const currentPricePerPage = editingPrices[perPageKey] != null
                    ? Number(editingPrices[perPageKey])
                    : (savedGroupPricePerPage ?? standardPricePerPage);

                  // 현재 구간별 가격 계산
                  const getCurrentRangePrice = (range: number, idx: number) => {
                    const rangeKey = `${setting.id}_nup_${specId}_range_${range}`;
                    if (editingPrices[rangeKey] != null) return Number(editingPrices[rangeKey]);
                    // 저장된 그룹단가에서 숫자 키로 조회
                    const savedRange = savedRangePrices[String(range)];
                    if (savedRange != null) return Number(savedRange);
                    // 표준단가에서
                    return standardRangePrices[range] || 0;
                  };

                  return (
                    <div
                      key={nup}
                      className="grid gap-0 py-1 items-center bg-amber-50/50"
                      style={{
                        gridTemplateColumns: `60px minmax(80px, 1fr) 70px 70px 80px ${pageRanges.map(() => '80px').join(' ')}`
                      }}
                    >
                      <span className="text-sm font-semibold text-violet-700">{nup}</span>
                      <span className="text-xs text-gray-500 truncate" title={specNames}>{specNames}</span>

                      {/* 표지가격 입력 */}
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-gray-400">{standardCoverPrice > 0 ? formatNumber(standardCoverPrice) : '-'}</span>
                        <Input
                          type="number"
                          step="1"
                          value={editingPrices[coverPriceKey] ?? (savedGroupCoverPrice != null ? String(savedGroupCoverPrice) : String(standardCoverPrice || ''))}
                          onChange={(e) => {
                            const newCoverPrice = Number(e.target.value);
                            const updates: Record<string, string> = { [coverPriceKey]: e.target.value };
                            // 자동계산
                            const calcRanges = recalcGroupRangePrices(newCoverPrice, currentPricePerPage, currentPaperPrice, getCurrentRangePrice(pageRanges[0], 0));
                            Object.entries(calcRanges).forEach(([r, v]) => {
                              updates[`${setting.id}_nup_${specId}_range_${r}`] = v;
                            });
                            setEditingPrices(prev => ({ ...prev, ...updates }));
                          }}
                          className="h-7 text-center font-mono text-xs bg-pink-50 border-pink-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </div>

                      {/* 용지가격 입력 */}
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-gray-400">{standardPaperPrice > 0 ? formatNumber(standardPaperPrice) : '-'}</span>
                        <Input
                          type="number"
                          step="1"
                          value={editingPrices[paperPriceKey] ?? (savedGroupPaperPrice != null ? String(savedGroupPaperPrice) : String(standardPaperPrice || ''))}
                          onChange={(e) => {
                            const newPaperPrice = Number(e.target.value);
                            const updates: Record<string, string> = { [paperPriceKey]: e.target.value };
                            const calcRanges = recalcGroupRangePrices(currentCoverPrice, currentPricePerPage, newPaperPrice, getCurrentRangePrice(pageRanges[0], 0));
                            Object.entries(calcRanges).forEach(([r, v]) => {
                              updates[`${setting.id}_nup_${specId}_range_${r}`] = v;
                            });
                            setEditingPrices(prev => ({ ...prev, ...updates }));
                          }}
                          className="h-7 text-center font-mono text-xs bg-yellow-50 border-yellow-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </div>

                      {/* 제본단가/1p 입력 */}
                      <div className="flex flex-col items-end pr-2">
                        <span className="text-[9px] text-gray-400">{formatNumber(standardPricePerPage)}</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingPrices[perPageKey] ?? (savedGroupPricePerPage != null ? String(savedGroupPricePerPage) : String(standardPricePerPage || ''))}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            const updates: Record<string, string> = { [perPageKey]: e.target.value };
                            const calcRanges = recalcGroupRangePrices(currentCoverPrice, value, currentPaperPrice, getCurrentRangePrice(pageRanges[0], 0));
                            Object.entries(calcRanges).forEach(([r, v]) => {
                              updates[`${setting.id}_nup_${specId}_range_${r}`] = v;
                            });
                            setEditingPrices(prev => ({ ...prev, ...updates }));
                          }}
                          className="h-7 text-right font-mono text-xs pr-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </div>

                      {/* 구간별 가격: coverPrice > 0이면 자동계산 표시, 아니면 첫 구간 직접입력 */}
                      {pageRanges.map((range: number, idx: number) => {
                        const standardPrice = standardRangePrices[range] || 0;
                        const rangeKey = `${setting.id}_nup_${specId}_range_${range}`;
                        const currentPrice = getCurrentRangePrice(range, idx);

                        return currentCoverPrice > 0 ? (
                          <div key={range} className="flex flex-col items-center">
                            <span className="text-[9px] text-gray-400">{formatNumber(standardPrice)}</span>
                            <span className="h-7 w-16 flex items-center justify-center font-mono text-xs text-gray-600 bg-gray-50 rounded border">
                              {formatNumber(editingPrices[rangeKey] != null ? Number(editingPrices[rangeKey]) : currentPrice)}
                            </span>
                          </div>
                        ) : idx === 0 ? (
                          <div key={range} className="flex flex-col items-center">
                            <span className="text-[9px] text-gray-400">{formatNumber(standardPrice)}</span>
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
                                    updates[`${setting.id}_nup_${specId}_range_${r}`] = String(Math.round(value + (r - firstRange) * (currentPricePerPage + currentPaperPrice)));
                                  }
                                });
                                setEditingPrices(prev => ({ ...prev, ...updates }));
                              }}
                            />
                          </div>
                        ) : (
                          <div key={range} className="flex flex-col items-center">
                            <span className="text-[9px] text-gray-400">{formatNumber(standardPrice)}</span>
                            <span className="h-7 w-16 flex items-center justify-center font-mono text-xs text-gray-600 bg-gray-50 rounded border">
                              {formatNumber(editingPrices[rangeKey] != null ? Number(editingPrices[rangeKey]) : currentPrice)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400">
                * 표지가격 입력 시 구간별 가격이 자동 계산됩니다. (구간가격 = 표지가격 + (제본단가 + 용지가격) × 페이지수)
              </p>

              {/* 저장 버튼 */}
              {Object.keys(editingPrices).some(k => k.startsWith(`${setting.id}_nup_`)) && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 bg-indigo-600 hover:bg-indigo-700"
                    disabled={isSaving}
                    onClick={() => {
                      const prices: any[] = [];
                      sortedNups.forEach((nup) => {
                        const groupItems = nupGroups.get(nup) || [];
                        if (groupItems.length === 0) return;
                        const specId = groupItems[0].specId;

                        const coverKey = `${setting.id}_nup_${specId}_coverPrice`;
                        const paperKey = `${setting.id}_nup_${specId}_paperPrice`;
                        const perPageKey2 = `${setting.id}_nup_${specId}_perPage`;

                        // 현재 표시된 값을 저장 (editing > saved > standard)
                        const rangeData2 = groupItems[0].rangeData;
                        const savedRec = groupPricesMap.get(`${setting.id}__${specId}`)
                          || groupPricesMap.get(`${setting.id}_${pageRanges[0]}_${specId}`);
                        const savedRP = savedRec?.rangePrices || {};

                        const coverVal = editingPrices[coverKey] != null ? parseFloat(editingPrices[coverKey]) : (savedRP.__coverPrice != null ? Number(savedRP.__coverPrice) : (rangeData2?.coverPrice || 0));
                        const paperVal = editingPrices[paperKey] != null ? parseFloat(editingPrices[paperKey]) : (savedRP.__paperPrice != null ? Number(savedRP.__paperPrice) : (rangeData2?.paperPrice || 0));
                        const perPageVal = editingPrices[perPageKey2] != null ? parseFloat(editingPrices[perPageKey2]) : (savedRec?.pricePerPage != null ? Number(savedRec.pricePerPage) : (rangeData2?.pricePerPage || 0));

                        const rangePricesObj: Record<string, number> = {};
                        pageRanges.forEach((range: number) => {
                          const rangeKey = `${setting.id}_nup_${specId}_range_${range}`;
                          const val = editingPrices[rangeKey] != null
                            ? Number(editingPrices[rangeKey])
                            : (savedRP[String(range)] != null ? Number(savedRP[String(range)]) : (rangeData2?.rangePrices?.[range] || 0));
                          rangePricesObj[String(range)] = val;
                        });

                        prices.push({
                          specificationId: specId,
                          basePages: pageRanges[0] || 20,
                          basePrice: rangePricesObj[String(pageRanges[0])] || 0,
                          pricePerPage: perPageVal,
                          coverPrice: Number.isFinite(coverVal) ? coverVal : undefined,
                          paperPrice: Number.isFinite(paperVal) ? paperVal : undefined,
                          rangePrices: rangePricesObj,
                        });
                      });
                      if (prices.length > 0) {
                        handleSavePrices(setting.id, prices);
                      }
                    }}
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    저장
                  </Button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ====== 규격별 Nup/1p단가 (finishing_spec_nup) ====== */}
        {pricingType === 'finishing_spec_nup' && (() => {
          if (nupPageRanges.length === 0) {
            return (
              <div className="mt-3 text-center py-4 text-gray-400 text-sm bg-gray-50 rounded">
                표준단가에서 먼저 Nup 규격을 설정해주세요.
              </div>
            );
          }

          // Nup별로 그룹핑 (prices에 포함된 specification.nup 사용)
          const nupGroups = new Map<string, any[]>();
          nupPageRanges.forEach((item: any) => {
            const nup = item.specificationNup || 'other';
            const specInfo = { name: item.specificationName || '', nup };
            if (!nupGroups.has(nup)) {
              nupGroups.set(nup, []);
            }
            nupGroups.get(nup)!.push({ ...item, specInfo });
          });

          // Nup 정렬
          const nupOrder = ['1++up', '1+up', '1up', '2up', '4up', '6up', '8up'];
          const sortedNups = nupOrder.filter(nup => nupGroups.has(nup));
          nupGroups.forEach((_, nup) => {
            if (!sortedNups.includes(nup)) sortedNups.push(nup);
          });

          return (
            <div className="mt-3 space-y-3">
              <div className="border rounded-lg p-4 bg-white">
                <div className="space-y-0">
                  {sortedNups.map((nup) => {
                    const items = nupGroups.get(nup) || [];
                    if (items.length === 0) return null;
                    const standardPrice = items[0]?.pricePerPage || 0;
                    // 그룹단가: Nup 그룹 단위로 하나의 가격 (첫 번째 spec 기준)
                    const firstSpecId = items[0]?.specificationId;
                    const nupKey = `${setting.id}_nup_${firstSpecId}_perPage`;
                    const savedGroupPrice = groupPricesMap.get(`${setting.id}__${firstSpecId}`);
                    const displayValue = editingPrices[nupKey] ?? (savedGroupPrice?.price ? String(Number(savedGroupPrice.price)) : '');
                    const specNames = items.map((item: any) => item.specInfo.name || '').filter(Boolean).join(', ');

                    return (
                      <div key={nup} className="py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          {/* Nup 뱃지 */}
                          <div className="w-14 shrink-0">
                            <Badge variant="secondary" className="bg-violet-100 text-violet-700 font-semibold w-full justify-center">
                              {nup}
                            </Badge>
                          </div>
                          {/* 표준단가 */}
                          <div className="w-16 shrink-0 text-right">
                            <span className="text-xs text-gray-400 font-mono">{formatNumber(standardPrice)}</span>
                          </div>
                          {/* 그룹단가 입력 */}
                          <div className="w-24 shrink-0">
                            <Input
                              type="number"
                              placeholder="단가"
                              className="w-full h-7 text-sm text-right font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              value={displayValue}
                              onChange={(e) => {
                                const newPrices: Record<string, string> = {};
                                // 같은 Nup 그룹의 모든 규격에 동일한 가격 적용
                                items.forEach((item: any) => {
                                  newPrices[`${setting.id}_nup_${item.specificationId}_perPage`] = e.target.value;
                                });
                                setEditingPrices(prev => ({ ...prev, ...newPrices }));
                              }}
                            />
                          </div>
                          {/* 규격 목록 */}
                          <div className="flex-1 text-xs text-gray-500 truncate">
                            {specNames}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 저장 버튼 */}
              {Object.keys(editingPrices).some(k => k.startsWith(`${setting.id}_nup_`)) && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 bg-indigo-600 hover:bg-indigo-700"
                    disabled={isSaving}
                    onClick={() => {
                      const prices: any[] = [];
                      nupPageRanges.forEach((item: any) => {
                        const key = `${setting.id}_nup_${item.specificationId}_perPage`;
                        const editedValue = editingPrices[key];
                        if (editedValue) {
                          prices.push({
                            specificationId: item.specificationId,
                            price: parseFloat(editedValue),
                          });
                        }
                      });
                      if (prices.length > 0) {
                        handleSavePrices(setting.id, prices);
                      }
                    }}
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    저장
                  </Button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ====== 길이별단가 (finishing_length) ====== */}
        {pricingType === 'finishing_length' && (() => {
          const lengthPrices = setting.lengthPrices || [];

          if (lengthPrices.length === 0) {
            return (
              <div className="mt-3 text-center py-4 text-gray-400 text-sm bg-gray-50 rounded">
                표준단가에서 먼저 길이별 단가를 설정해주세요.
              </div>
            );
          }

          return (
            <div className="mt-3 space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse bg-white rounded border">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left font-medium text-gray-500 border-b">길이 (cm)</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500 border-b w-24">표준단가</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500 border-b w-32">그룹단가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lengthPrices.map((lp: any) => {
                      const key = `${setting.id}_length_${lp.lengthCm}`;
                      const savedGroupPrice = groupPricesMap.get(`${setting.id}__${lp.lengthCm}`);

                      return (
                        <tr key={lp.lengthCm} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-700">{lp.lengthCm}cm</td>
                          <td className="px-3 py-2 text-center text-gray-500">
                            {lp.price ? formatNumber(lp.price) : '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Input
                              type="number"
                              className="h-7 w-24 text-xs text-center font-mono mx-auto"
                              placeholder="-"
                              value={editingPrices[key] ?? (savedGroupPrice?.price ? String(Number(savedGroupPrice.price)) : '')}
                              onChange={(e) => {
                                setEditingPrices(prev => ({ ...prev, [key]: e.target.value }));
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {Object.keys(editingPrices).some(k => k.startsWith(`${setting.id}_length_`)) && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 bg-indigo-600 hover:bg-indigo-700"
                    disabled={isSaving}
                    onClick={() => {
                      const prices: any[] = [];
                      lengthPrices.forEach((lp: any) => {
                        const key = `${setting.id}_length_${lp.lengthCm}`;
                        const editedValue = editingPrices[key];
                        if (editedValue) {
                          prices.push({
                            lengthCm: lp.lengthCm,
                            price: parseFloat(editedValue),
                          });
                        }
                      });
                      if (prices.length > 0) {
                        handleSavePrices(setting.id, prices);
                      }
                    }}
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    저장
                  </Button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ====== 면적별단가 (finishing_area) ====== */}
        {pricingType === 'finishing_area' && (() => {
          const areaPrices = setting.areaPrices || [];

          if (areaPrices.length === 0) {
            return (
              <div className="mt-3 text-center py-4 text-gray-400 text-sm bg-gray-50 rounded">
                표준단가에서 먼저 면적별 단가를 설정해주세요.
              </div>
            );
          }

          return (
            <div className="mt-3 space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse bg-white rounded border">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left font-medium text-gray-500 border-b">면적 (cm2)</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500 border-b w-24">표준단가</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500 border-b w-32">그룹단가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areaPrices.map((ap: any) => {
                      const key = `${setting.id}_area_${ap.areaCm2}`;
                      const savedGroupPrice = groupPricesMap.get(`${setting.id}__${ap.areaCm2}`);

                      return (
                        <tr key={ap.areaCm2} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-700">{formatNumber(ap.areaCm2)}cm2</td>
                          <td className="px-3 py-2 text-center text-gray-500">
                            {ap.price ? formatNumber(ap.price) : '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Input
                              type="number"
                              className="h-7 w-24 text-xs text-center font-mono mx-auto"
                              placeholder="-"
                              value={editingPrices[key] ?? (savedGroupPrice?.price ? String(Number(savedGroupPrice.price)) : '')}
                              onChange={(e) => {
                                setEditingPrices(prev => ({ ...prev, [key]: e.target.value }));
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {Object.keys(editingPrices).some(k => k.startsWith(`${setting.id}_area_`)) && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 bg-indigo-600 hover:bg-indigo-700"
                    disabled={isSaving}
                    onClick={() => {
                      const prices: any[] = [];
                      areaPrices.forEach((ap: any) => {
                        const key = `${setting.id}_area_${ap.areaCm2}`;
                        const editedValue = editingPrices[key];
                        if (editedValue) {
                          prices.push({
                            areaCm2: ap.areaCm2,
                            price: parseFloat(editedValue),
                          });
                        }
                      });
                      if (prices.length > 0) {
                        handleSavePrices(setting.id, prices);
                      }
                    }}
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    저장
                  </Button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ====== 기타 타입 (수량당, 페이지당, 제본 페이지당) ====== */}
        {(pricingType === 'finishing_qty' || pricingType === 'finishing_page' || pricingType === 'binding_page') && (() => {
          const standardPrice = setting.basePrice || setting.prices?.[0]?.price || 0;
          const key = `${setting.id}_base_price`;
          const savedGroupPrice = groupPricesMap.get(`${setting.id}__base`);

          return (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded border">
                <span className="text-sm font-medium text-gray-700">
                  {pricingType === 'finishing_qty' ? '수량당 단가' :
                   pricingType === 'finishing_page' ? '페이지당 단가' :
                   '제본 페이지당 단가'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">표준: {formatNumber(standardPrice)}원</span>
                  <Input
                    type="number"
                    className="h-8 w-28 text-sm text-center font-mono"
                    placeholder="그룹단가"
                    value={editingPrices[key] ?? (savedGroupPrice?.price ? String(Number(savedGroupPrice.price)) : '')}
                    onChange={(e) => {
                      setEditingPrices(prev => ({ ...prev, [key]: e.target.value }));
                    }}
                  />
                  <span className="text-xs text-gray-500">원</span>
                </div>
              </div>

              {editingPrices[key] && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 bg-indigo-600 hover:bg-indigo-700"
                    disabled={isSaving}
                    onClick={() => {
                      const editedValue = editingPrices[key];
                      if (editedValue) {
                        handleSavePrices(setting.id, [{
                          price: parseFloat(editedValue),
                        }]);
                      }
                    }}
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    저장
                  </Button>
                </div>
              )}
            </div>
          );
        })()}

        {/* 가격 데이터 없는 경우 안내 */}
        {!hasPriceGroups && !hasInkjetSpecs &&
         pricingType !== 'nup_page_range' &&
         pricingType !== 'finishing_spec_nup' &&
         pricingType !== 'finishing_length' &&
         pricingType !== 'finishing_area' &&
         pricingType !== 'finishing_qty' &&
         pricingType !== 'finishing_page' &&
         pricingType !== 'binding_page' && (
          <div className="mt-3 text-center py-4 text-gray-400 text-sm bg-gray-50 rounded">
            {printMethod === 'indigo'
              ? "표준단가에서 먼저 단가 그룹을 설정해주세요."
              : printMethod === 'inkjet'
              ? "표준단가에서 먼저 규격을 설정해주세요."
              : "표준단가에서 먼저 설정을 완료해주세요."}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>그룹단가 관리</span>
            {selectedClientGroup && (
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-lg font-semibold">
                {selectedClientGroup.groupName}
              </span>
            )}
          </div>
        }
        description="거래처 그룹별 특별 가격을 설정합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '가격관리', href: '/pricing' },
          { label: '그룹단가' },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/pricing/production">
              <ArrowLeft className="h-4 w-4 mr-2" />
              표준단가
            </Link>
          </Button>
        }
      />

      {/* 가격 우선순위 안내 + 그룹 선택 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">가격 적용 우선순위</p>
                <p className="text-blue-700 mt-1">
                  거래처 개별단가 → <strong>그룹단가</strong> → 그룹 할인율 → 표준단가
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {selectedClientGroup && (
                <div className="text-sm text-blue-700">
                  소속 거래처: <span className="font-semibold">{selectedClientGroup._count?.clients || 0}개</span>
                </div>
              )}
              {clientGroupsLoading ? (
                <Skeleton className="h-9 w-48" />
              ) : (
                <Select value={selectedClientGroupId} onValueChange={handleClientGroupChange}>
                  <SelectTrigger className="w-48 bg-white">
                    <SelectValue placeholder="그룹 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientGroupsData?.data?.filter(g => g.groupName !== '표준단가그룹').map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.groupName}
                        {group.generalDiscount !== 100 && (
                          <span className="text-muted-foreground ml-2">
                            ({100 - group.generalDiscount}% 할인)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedClientGroupId && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    onClick={() => setIsBulkWeightDialogOpen(true)}
                  >
                    <Percent className="h-3.5 w-3.5 mr-1.5" />
                    전체 가중치 적용
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs bg-white text-amber-600 border-amber-200 hover:bg-amber-50"
                    onClick={() => setIsBulkAdjustDialogOpen(true)}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                    전체 단가맞춤
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메인 콘텐츠: 트리 + 설정 패널 */}
      {selectedClientGroupId && (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    onClick={expandAll}
                  >
                    ↓ 모두 펼치기
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    onClick={collapseAll}
                  >
                    ↑ 모두 접기
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto max-h-[calc(100vh-380px)]">
              {treeLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {productionTree?.map((group) => (
                    <TreeNode
                      key={group.id}
                      group={group}
                      expandedIds={expandedIds}
                      toggleExpand={toggleExpand}
                      selectedGroupId={selectedProductionGroupId}
                      onSelectGroup={(g) => { setSelectedProductionGroupId(g.id); setSelectedSettingId(null); }}
                    />
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                            onClick={() => setSelectedSettingId(null)}
                          >
                            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                            목록
                          </Button>
                        )}
                        <CardTitle className="text-base font-semibold">
                          {selectedProductionGroup.name}
                        </CardTitle>
                        {(selectedProductionGroup as any).code && (
                          <span className="text-sm text-gray-500 font-mono">
                            ({(selectedProductionGroup as any).code})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {selectedProductionGroup.depth === 1 ? "대분류" : selectedProductionGroup.depth === 2 ? "중분류" : "소분류"} · {selectedProductionGroup.settings?.length || 0}개 설정
                      </p>
                    </>
                  ) : (
                    <CardTitle className="text-base font-semibold text-gray-400">
                      그룹을 선택하세요
                    </CardTitle>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 max-h-[calc(100vh-380px)] overflow-y-auto">
              {!selectedProductionGroup ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>좌측에서 그룹을 선택해주세요.</p>
                  <p className="text-sm mt-2">좌측에서 분류를 선택하면 단가를 설정할 수 있습니다.</p>
                </div>
              ) : selectedProductionGroup.settings?.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>등록된 설정이 없습니다.</p>
                  <p className="text-sm mt-2">표준단가 페이지에서 먼저 설정을 추가해주세요.</p>
                </div>
              ) : !selectedSettingId ? (
                /* 세팅 목록 (표준단가처럼 컴팩트하게) */
                <div className="space-y-2">
                  {selectedProductionGroup.settings?.map((setting: any) => {
                    const pricingType = setting.pricingType || '';
                    const printMethod = setting.printMethod;
                    const savedGroupPriceCount = groupPrices?.filter((gp: any) => gp.productionSettingId === setting.id).length || 0;

                    return (
                      <div
                        key={setting.id}
                        className="group flex items-center justify-between gap-3 p-3 border rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                        onClick={() => setSelectedSettingId(setting.id)}
                      >
                        <div className="flex items-center gap-3 flex-wrap min-w-0">
                          <span className="text-[14px] font-bold text-black">
                            {setting.settingName || setting.codeName || "설정"}
                          </span>
                          <Badge variant="outline" className="text-xs font-normal text-gray-600 bg-gray-50 shrink-0">
                            {PRICING_TYPE_LABELS[pricingType] || pricingType}
                          </Badge>
                          {printMethod && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {PRINT_METHOD_LABELS[printMethod] || printMethod}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500 shrink-0">
                            작업시간: <span className="font-mono font-medium text-gray-900">{Number(setting.workDays) || 1}일</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {savedGroupPriceCount > 0 && (
                            <Badge className="text-[10px] h-5 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                              {savedGroupPriceCount}개 그룹단가
                            </Badge>
                          )}
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-500" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 선택된 세팅의 단가 편집 */
                <div>
                  {selectedProductionGroup.settings
                    ?.filter((setting: any) => setting.id === selectedSettingId)
                    .map((setting: any) => (
                      <GroupSettingCard key={setting.id} setting={setting} />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 단가 맞춤 다이얼로그 */}
      <Dialog open={isPriceAdjustDialogOpen} onOpenChange={setIsPriceAdjustDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>그룹 단가맞춤</DialogTitle>
            <DialogDescription>
              가격 구간별로 반올림 단위를 설정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setPriceAdjustRanges([
                    { maxPrice: 500, adjustment: 10 },
                    { maxPrice: 1000, adjustment: 50 },
                    { maxPrice: Infinity, adjustment: 100 },
                  ]);
                }}
              >
                초기화
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  const lastMax = priceAdjustRanges.length > 0
                    ? (priceAdjustRanges[priceAdjustRanges.length - 1].maxPrice === Infinity
                      ? (priceAdjustRanges[priceAdjustRanges.length - 2]?.maxPrice || 1000) + 1000
                      : priceAdjustRanges[priceAdjustRanges.length - 1].maxPrice + 1000)
                    : 1000;
                  setPriceAdjustRanges(prev => {
                    const hasInfinity = prev.some(r => r.maxPrice === Infinity);
                    if (hasInfinity) {
                      const withoutInfinity = prev.filter(r => r.maxPrice !== Infinity);
                      const infinityItem = prev.find(r => r.maxPrice === Infinity)!;
                      return [...withoutInfinity, { maxPrice: lastMax, adjustment: 100 }, infinityItem];
                    }
                    return [...prev, { maxPrice: lastMax, adjustment: 100 }];
                  });
                }}
              >
                + 구간 추가
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 w-12">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">기준 금액 (미만)</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">반올림 단위</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 w-16">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {priceAdjustRanges.map((range, index) => {
                    const isLast = range.maxPrice === Infinity;
                    return (
                      <tr key={index} className="bg-white hover:bg-gray-50">
                        <td className="px-3 py-3 text-center">
                          <span className="text-gray-600 font-medium">{index + 1}</span>
                        </td>
                        <td className="px-3 py-3">
                          {isLast ? (
                            <div className="inline-flex items-center px-3 py-1.5 bg-gray-100 rounded-md">
                              <span className="text-sm text-gray-700">그 이상 모두</span>
                            </div>
                          ) : (
                            <Select
                              value={String(range.maxPrice)}
                              onValueChange={(val) => {
                                setPriceAdjustRanges(prev => prev.map((r, i) => i === index ? { ...r, maxPrice: Number(val) } : r));
                              }}
                            >
                              <SelectTrigger className="h-9 w-40 text-sm">
                                <span>{formatNumber(range.maxPrice)}원</span>
                              </SelectTrigger>
                              <SelectContent>
                                {[500, 1000, 2000, 3000, 5000, 10000, 20000, 50000, 100000].map((v) => (
                                  <SelectItem key={v} value={String(v)}>
                                    {formatNumber(v)}원
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <Select
                            value={String(range.adjustment)}
                            onValueChange={(val) => {
                              setPriceAdjustRanges(prev => prev.map((r, i) => i === index ? { ...r, adjustment: Number(val) } : r));
                            }}
                          >
                            <SelectTrigger className="h-9 w-36 text-sm">
                              <span>{formatNumber(range.adjustment)}원 단위</span>
                            </SelectTrigger>
                            <SelectContent>
                              {[10, 50, 100, 500, 1000, 10000].map((unit) => (
                                <SelectItem key={unit} value={String(unit)}>
                                  {formatNumber(unit)}원 단위
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {!isLast && priceAdjustRanges.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setPriceAdjustRanges(prev => prev.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5">
              <span className="text-sm text-indigo-700 font-medium">현재 설정: </span>
              <span className="text-sm text-indigo-600">
                {priceAdjustRanges.map((range, idx) => {
                  if (range.maxPrice === Infinity) {
                    return `그 이상: ${formatNumber(range.adjustment)}원`;
                  }
                  return `${formatNumber(range.maxPrice)}원 미만: ${formatNumber(range.adjustment)}원`;
                }).join(' / ')}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-10 px-4 text-amber-600 border-amber-300 hover:bg-amber-50"
              onClick={resetPriceAdjustment}
            >
              원래 금액으로
            </Button>
            <Button variant="outline" className="h-10 px-4" onClick={() => setIsPriceAdjustDialogOpen(false)}>
              취소
            </Button>
            <Button className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 shadow-sm" onClick={applyPriceAdjustment}>
              적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 전체 가중치 적용 다이얼로그 */}
      <Dialog open={isBulkWeightDialogOpen} onOpenChange={setIsBulkWeightDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>전체 가중치 적용</DialogTitle>
            <DialogDescription>
              모든 생산설정의 표준단가에 가중치(%)를 적용하여 그룹단가를 일괄 설정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 justify-center">
              <span className="text-sm text-gray-600">표준단가 ×</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="h-12 w-24 text-xl text-center font-mono font-bold"
                  min={1}
                  max={200}
                  value={bulkWeightPercent}
                  onChange={(e) => setBulkWeightPercent(Number(e.target.value) || 0)}
                />
                <span className="text-xl font-bold text-gray-600">%</span>
              </div>
              <span className="text-sm text-gray-600">= 그룹단가</span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[70, 80, 85, 90, 95].map(pct => (
                <Button
                  key={pct}
                  variant={bulkWeightPercent === pct ? "default" : "outline"}
                  size="sm"
                  className={`h-8 text-xs ${bulkWeightPercent === pct ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                  onClick={() => setBulkWeightPercent(pct)}
                >
                  {pct}%
                </Button>
              ))}
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
              <p className="text-sm text-indigo-700">
                <span className="font-medium">적용 결과 예시:</span>
                <br />
                표준단가 10,000원 → 그룹단가 <span className="font-bold">{formatNumber(Math.round(10000 * bulkWeightPercent / 100))}원</span>
                <span className="text-indigo-500 ml-2">
                  ({bulkWeightPercent < 100 ? `${100 - bulkWeightPercent}% 할인` : bulkWeightPercent > 100 ? `${bulkWeightPercent - 100}% 인상` : '동일'})
                </span>
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700">
              기존 그룹단가가 있으면 모두 덮어씁니다.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsBulkWeightDialogOpen(false)}>
              취소
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={applyWeightAllMutation.isPending || bulkWeightPercent < 1 || bulkWeightPercent > 200}
              onClick={handleBulkWeightApply}
            >
              {applyWeightAllMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Percent className="h-4 w-4 mr-2" />
              )}
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
              모든 생산설정의 그룹단가를 구간별 반올림 단위로 일괄 조정합니다.
              {(!groupPrices || groupPrices.length === 0) && (
                <span className="block mt-1 text-amber-600">
                  그룹단가가 없으므로 표준단가를 먼저 복사한 후 단가맞춤을 적용합니다.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setBulkAdjustRanges([
                    { maxPrice: 500, adjustment: 10 },
                    { maxPrice: 1000, adjustment: 50 },
                    { maxPrice: Infinity, adjustment: 100 },
                  ]);
                }}
              >
                초기화
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  const lastMax = bulkAdjustRanges.length > 0
                    ? (bulkAdjustRanges[bulkAdjustRanges.length - 1].maxPrice === Infinity
                      ? (bulkAdjustRanges[bulkAdjustRanges.length - 2]?.maxPrice || 1000) + 1000
                      : bulkAdjustRanges[bulkAdjustRanges.length - 1].maxPrice + 1000)
                    : 1000;
                  setBulkAdjustRanges(prev => {
                    const hasInfinity = prev.some(r => r.maxPrice === Infinity);
                    if (hasInfinity) {
                      const withoutInfinity = prev.filter(r => r.maxPrice !== Infinity);
                      const infinityItem = prev.find(r => r.maxPrice === Infinity)!;
                      return [...withoutInfinity, { maxPrice: lastMax, adjustment: 100 }, infinityItem];
                    }
                    return [...prev, { maxPrice: lastMax, adjustment: 100 }];
                  });
                }}
              >
                + 구간 추가
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 w-12">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">기준 금액 (미만)</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">반올림 단위</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 w-16">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bulkAdjustRanges.map((range, index) => {
                    const isLast = range.maxPrice === Infinity;
                    return (
                      <tr key={index} className="bg-white hover:bg-gray-50">
                        <td className="px-3 py-3 text-center">
                          <span className="text-gray-600 font-medium">{index + 1}</span>
                        </td>
                        <td className="px-3 py-3">
                          {isLast ? (
                            <div className="inline-flex items-center px-3 py-1.5 bg-gray-100 rounded-md">
                              <span className="text-sm text-gray-700">그 이상 모두</span>
                            </div>
                          ) : (
                            <Select
                              value={String(range.maxPrice)}
                              onValueChange={(val) => {
                                setBulkAdjustRanges(prev => prev.map((r, i) => i === index ? { ...r, maxPrice: Number(val) } : r));
                              }}
                            >
                              <SelectTrigger className="h-9 w-40 text-sm">
                                <span>{formatNumber(range.maxPrice)}원</span>
                              </SelectTrigger>
                              <SelectContent>
                                {[500, 1000, 2000, 3000, 5000, 10000, 20000, 50000, 100000].map((v) => (
                                  <SelectItem key={v} value={String(v)}>
                                    {formatNumber(v)}원
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <Select
                            value={String(range.adjustment)}
                            onValueChange={(val) => {
                              setBulkAdjustRanges(prev => prev.map((r, i) => i === index ? { ...r, adjustment: Number(val) } : r));
                            }}
                          >
                            <SelectTrigger className="h-9 w-36 text-sm">
                              <span>{formatNumber(range.adjustment)}원 단위</span>
                            </SelectTrigger>
                            <SelectContent>
                              {[10, 50, 100, 500, 1000, 10000].map((unit) => (
                                <SelectItem key={unit} value={String(unit)}>
                                  {formatNumber(unit)}원 단위
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {!isLast && bulkAdjustRanges.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setBulkAdjustRanges(prev => prev.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5">
              <span className="text-sm text-indigo-700 font-medium">현재 설정: </span>
              <span className="text-sm text-indigo-600">
                {bulkAdjustRanges.map((range) => {
                  if (range.maxPrice === Infinity) {
                    return `그 이상: ${formatNumber(range.adjustment)}원`;
                  }
                  return `${formatNumber(range.maxPrice)}원 미만: ${formatNumber(range.adjustment)}원`;
                }).join(' / ')}
              </span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700">
              모든 생산설정의 그룹단가가 반올림 조정됩니다. 서버에 직접 저장됩니다.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsBulkAdjustDialogOpen(false)}>
              취소
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              disabled={setGroupPricesMutation.isPending || cloneAllMutation.isPending}
              onClick={handleBulkAdjust}
            >
              {(setGroupPricesMutation.isPending || cloneAllMutation.isPending) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <SlidersHorizontal className="h-4 w-4 mr-2" />
              )}
              전체 적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 잉크젯 그룹단가 입력 다이얼로그 */}
      <Dialog open={isInkjetPriceDialogOpen} onOpenChange={setIsInkjetPriceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>단가 설정 수정</span>
              {inkjetDialogSetting && (
                <Badge variant="secondary" className="text-xs">
                  {(inkjetDialogSetting as any).settingName || '잉크젯'}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedClientGroup?.groupName || '그룹'} - 그룹별 규격 단가를 설정합니다.
            </DialogDescription>
          </DialogHeader>

          {inkjetDialogSetting && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {((inkjetDialogSetting as any).priceGroups || []).map((group: any) => {
                  const style = PRICE_GROUP_STYLES[group.color] || PRICE_GROUP_STYLES.none;
                  const specifications = (inkjetDialogSetting as any).specifications || [];
                  const paperPriceGroupMap = (inkjetDialogSetting as any).paperPriceGroupMap || {};
                  const linkedPaperIds = Object.entries(paperPriceGroupMap)
                    .filter(([_, gId]) => gId === group.id)
                    .map(([paperId]) => paperId);
                  const linkedPapers = linkedPaperIds
                    .map(id => papersMap.get(id))
                    .filter((p: any) => p && (!p.printMethods || p.printMethods.includes((inkjetDialogSetting as any)?.printMethod)));

                  return (
                    <div key={group.id} className={cn("p-3 border-2 rounded-lg", style.bg, style.border)}>
                      {/* 그룹 헤더 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-3 h-3 rounded-full", style.dot)} />
                          <span className={cn("text-sm font-semibold", style.text)}>
                            {style.label}
                          </span>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {(group.specPrices || []).length}개 규격
                          </Badge>
                        </div>
                        {/* 단가맞춤 */}
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="h-5 w-12 text-[10px] text-center font-mono px-1"
                            placeholder="100"
                            value={weights[`${inkjetDialogSetting?.id}_${group.id}`] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setWeights(prev => ({ ...prev, [`${inkjetDialogSetting?.id}_${group.id}`]: val ? Number(val) : 0 }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const weightVal = weights[`${inkjetDialogSetting?.id}_${group.id}`] || 100;
                                if (weightVal > 0 && weightVal <= 200) {
                                  applyInkjetWeight(inkjetDialogSetting?.id, group.id, group.specPrices || [], specifications, weightVal);
                                }
                              }
                            }}
                          />
                          <span className="text-[9px] text-gray-400">%</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[9px] text-indigo-600 hover:bg-indigo-50"
                            onClick={() => {
                              const weightVal = weights[`${inkjetDialogSetting?.id}_${group.id}`] || 100;
                              if (weightVal > 0 && weightVal <= 200) {
                                applyInkjetWeight(inkjetDialogSetting?.id, group.id, group.specPrices || [], specifications, weightVal);
                              } else {
                                toast({ title: '1~200 사이 값을 입력하세요.', variant: 'destructive' });
                              }
                            }}
                          >
                            적용
                          </Button>
                        </div>
                      </div>

                      {/* 연결된 용지 */}
                      {linkedPapers.length > 0 && (
                        <div className="text-[10px] text-gray-500 mb-2 truncate">
                          {linkedPapers.slice(0, 3).map((p: any) => `${p.name}${p.grammage ? ` ${p.grammage}g` : ''}`).join(', ')}
                          {linkedPapers.length > 3 && ` 외 ${linkedPapers.length - 3}개`}
                        </div>
                      )}

                      {/* 표준단가 + 그룹단가 입력 */}
                      <div className="mb-2 p-2 bg-gray-100 border rounded text-xs">
                        <div className="flex items-center gap-2 flex-wrap mb-2 pb-2 border-b border-gray-200">
                          <span className="text-gray-500 text-[10px] font-medium">표준단가</span>
                          <span className="h-6 px-2 flex items-center bg-gray-200 border rounded text-[10px] text-gray-600">
                            {group.pricingMode === 'sqinch' ? 'sq"' : '기준규격'}
                          </span>
                          {group.pricingMode !== 'sqinch' && (
                            <>
                              <span className="h-6 px-2 flex items-center bg-gray-200 border rounded text-[10px] text-gray-600">
                                {(() => {
                                  const baseSpecId = group.inkjetBaseSpecId || (group.specPrices?.[0]?.specificationId || '');
                                  const specInfo = specifications.find((s: any) =>
                                    (s.specificationId || s.id) === baseSpecId
                                  )?.specification || {};
                                  return specInfo.name || baseSpecId?.slice(-6) || '-';
                                })()}
                              </span>
                              <span className="text-[11px] text-gray-700 font-semibold">
                                {(() => {
                                  const baseSpecId = group.inkjetBaseSpecId || (group.specPrices?.[0]?.specificationId || '');
                                  const baseSpecPrice = (group.specPrices || []).find((sp: any) => sp.specificationId === baseSpecId);
                                  return baseSpecPrice?.singleSidedPrice ? formatNumber(baseSpecPrice.singleSidedPrice) + '원' : '-';
                                })()}
                              </span>
                            </>
                          )}
                          {group.pricingMode === 'sqinch' && (
                            <span className="text-[11px] text-gray-700 font-semibold">
                              {group.inkjetBasePrice ? formatNumber(Math.round(group.inkjetBasePrice * 100) / 100) + '원/sq"' : '-'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-indigo-600 text-[10px] font-medium">그룹단가</span>
                          {group.pricingMode !== 'sqinch' ? (
                            <>
                              <span className="h-6 px-2 flex items-center bg-white border rounded text-[10px] text-gray-600">
                                {(() => {
                                  const baseSpecId = group.inkjetBaseSpecId || (group.specPrices?.[0]?.specificationId || '');
                                  const specInfo = specifications.find((s: any) =>
                                    (s.specificationId || s.id) === baseSpecId
                                  )?.specification || {};
                                  return specInfo.name || baseSpecId?.slice(-6) || '-';
                                })()}
                              </span>
                              <Input
                                type="number"
                                className="h-6 w-20 text-[11px] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="그룹단가"
                                value={editingPrices[`${inkjetDialogSetting.id}_${group.id}_groupBase`] ?? ''}
                                onChange={(e) => {
                                  const baseSpecId = group.inkjetBaseSpecId || (group.specPrices?.[0]?.specificationId || '');
                                  const basePrice = parseFloat(e.target.value) || 0;
                                  const baseSpecInfo = specifications.find((s: any) =>
                                    (s.specificationId || s.id) === baseSpecId
                                  )?.specification || {};
                                  const baseArea = (Number(baseSpecInfo.widthInch) || 0) * (Number(baseSpecInfo.heightInch) || 0);
                                  const pricePerSqInch = baseArea > 0 ? basePrice / baseArea : 0;

                                  const updates: Record<string, string> = {
                                    [`${inkjetDialogSetting.id}_${group.id}_groupBase`]: e.target.value,
                                    [`${inkjetDialogSetting.id}_${group.id}_spec_${baseSpecId}`]: e.target.value
                                  };

                                  if (pricePerSqInch > 0) {
                                    (group.specPrices || []).forEach((sp: any) => {
                                      if (sp.specificationId !== baseSpecId) {
                                        const specInfo = specifications.find((s: any) =>
                                          (s.specificationId || s.id) === sp.specificationId
                                        )?.specification || {};
                                        const area = (Number(specInfo.widthInch) || 0) * (Number(specInfo.heightInch) || 0);
                                        const weight = sp.weight || 1;
                                        const calcPrice = Math.round(pricePerSqInch * area * weight);
                                        updates[`${inkjetDialogSetting.id}_${group.id}_spec_${sp.specificationId}`] = String(calcPrice);
                                      }
                                    });
                                  }

                                  setEditingPrices(prev => ({ ...prev, ...updates }));
                                }}
                              />
                              <span className="text-gray-500 text-[10px]">원</span>
                            </>
                          ) : (
                            <>
                              <Input
                                type="number"
                                step="0.01"
                                className="h-6 w-20 text-[11px] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="sq 단가"
                                value={editingPrices[`${inkjetDialogSetting.id}_${group.id}_sqinch`] ?? ''}
                                onChange={(e) => {
                                  const pricePerSqInch = parseFloat(e.target.value) || 0;

                                  const updates: Record<string, string> = {
                                    [`${inkjetDialogSetting.id}_${group.id}_sqinch`]: e.target.value
                                  };

                                  (group.specPrices || []).forEach((sp: any) => {
                                    const specInfo = specifications.find((s: any) =>
                                      (s.specificationId || s.id) === sp.specificationId
                                    )?.specification || {};
                                    const area = (Number(specInfo.widthInch) || 0) * (Number(specInfo.heightInch) || 0);
                                    const weight = sp.weight || 1;
                                    const calcPrice = Math.round(pricePerSqInch * area * weight);
                                    updates[`${inkjetDialogSetting.id}_${group.id}_spec_${sp.specificationId}`] = String(calcPrice);
                                  });

                                  setEditingPrices(prev => ({ ...prev, ...updates }));
                                }}
                              />
                              <span className="text-gray-500 text-[10px]">원/sq"</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 규격별 단가 테이블 */}
                      <div className="max-h-48 overflow-y-auto border rounded bg-white">
                        <table className="w-full text-[11px]">
                          <thead className="sticky top-0 bg-gray-50">
                            <tr className="border-b">
                              <th className="text-left px-2 py-1 font-medium text-gray-500">규격</th>
                              <th className="text-right px-2 py-1 font-medium text-gray-500 w-16">표준</th>
                              <th className="text-right px-2 py-1 font-medium text-gray-500 w-20">그룹</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(group.specPrices || []).map((specPrice: any) => {
                              const specId = specPrice.specificationId;
                              const specInfo = specifications.find((s: any) =>
                                (s.specificationId || s.id) === specId
                              )?.specification || {};
                              const key = `${inkjetDialogSetting.id}_${group.id}_spec_${specId}`;
                              const savedGroupPrice = groupPricesMap.get(`${inkjetDialogSetting.id}_${group.id}_${specId}`);
                              const baseSpecId = group.inkjetBaseSpecId || (group.specPrices?.[0]?.specificationId || '');
                              const isBase = specId === baseSpecId;

                              return (
                                <tr key={specId} className={cn("border-b border-gray-100", isBase && "bg-indigo-50")}>
                                  <td className="px-2 py-1 text-gray-600">
                                    {specInfo.name || specId?.slice(-6)}
                                    {isBase && <span className="text-indigo-500 ml-0.5 text-[9px]">기준</span>}
                                  </td>
                                  <td className="px-2 py-1 text-right text-gray-400">
                                    {specPrice.singleSidedPrice ? formatNumber(specPrice.singleSidedPrice) : '-'}
                                  </td>
                                  <td className="px-1 py-0.5 text-right">
                                    <Input
                                      type="number"
                                      className="h-6 w-16 text-[10px] text-right font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      placeholder="-"
                                      value={editingPrices[key] ?? (savedGroupPrice?.price ? String(Number(savedGroupPrice.price)) : (specPrice.singleSidedPrice ? String(specPrice.singleSidedPrice) : ''))}
                                      onChange={(e) => {
                                        setEditingPrices(prev => ({ ...prev, [key]: e.target.value }));
                                      }}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              className="h-10 px-4 text-xs mr-auto"
              onClick={() => {
                if (inkjetDialogSetting) {
                  openPriceAdjustDialog(inkjetDialogSetting.id, (inkjetDialogSetting as any).priceGroups || [], 'inkjet');
                }
              }}
            >
              <SlidersHorizontal className="h-4 w-4 mr-1.5" />
              단가맞춤
            </Button>
            <Button variant="outline" onClick={() => setIsInkjetPriceDialogOpen(false)}>
              취소
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isSaving}
              onClick={async () => {
                if (inkjetDialogSetting) {
                  await handleSaveGroupPrices(inkjetDialogSetting.id, (inkjetDialogSetting as any).priceGroups || []);
                  setIsInkjetPriceDialogOpen(false);
                }
              }}
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

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
import { Edit, Trash2 } from 'lucide-react';
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

// 숫자 포맷팅 (3자리 콤마)
const formatNumber = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null || num === '') return '';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '';
  return n.toLocaleString('ko-KR');
};

// 가격 계산 방식 한글 라벨
const PRICING_TYPE_LABELS: Record<string, string> = {
  paper_output_spec: "[출력전용] 용지별출력단가/1p가격",
  nup_page_range: "[제본전용] 구간별 Nup/1p가격",
  finishing_spec_nup: "[후가공전용] 규격별 Nup/1p단가",
  finishing_length: "[후가공전용] 길이별단가",
  finishing_area: "[후가공전용] 면적별단가",
  binding_page: "[제본전용] 제본 페이지당",
  finishing_qty: "[후가공] 수량당",
  finishing_page: "[후가공] 페이지당",
<<<<<<< Updated upstream
=======
  delivery_parcel: "[배송] 택배",
  delivery_motorcycle: "[배송] 오토바이퀵배달",
  delivery_damas: "[배송] 다마스",
  delivery_freight: "[배송] 화물배송",
  delivery_pickup: "[배송] 방문수령",
};

// 배송방법 타입 목록
const DELIVERY_PRICING_TYPES = [
  'delivery_parcel',
  'delivery_motorcycle',
  'delivery_damas',
  'delivery_freight',
  'delivery_pickup',
] as const;

// 배송방법 라벨 (심플한 이름)
const DELIVERY_METHOD_LABELS: Record<string, string> = {
  delivery_parcel: '택배',
  delivery_motorcycle: '오토바이퀵배달',
  delivery_damas: '다마스',
  delivery_freight: '화물배송',
  delivery_pickup: '방문수령',
};

// 배송방법인지 확인하는 헬퍼 함수
const isDeliveryPricingType = (type: string): boolean => {
  return DELIVERY_PRICING_TYPES.includes(type as any);
>>>>>>> Stashed changes
};

// 인쇄방식 라벨
const PRINT_METHOD_LABELS: Record<string, string> = {
  indigo: "인디고",
  inkjet: "잉크젯",
  album: "앨범",
  frame: "액자",
  booklet: "책자",
};

// 단가 그룹 색상 스타일
const PRICE_GROUP_STYLES: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
  green: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', dot: 'bg-green-500', label: '그룹1' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', dot: 'bg-blue-500', label: '그룹2' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', dot: 'bg-yellow-500', label: '그룹3' },
  red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', dot: 'bg-red-500', label: '그룹4' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', dot: 'bg-purple-500', label: '그룹5' },
  none: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', dot: 'bg-gray-400', label: '기타' },
};

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
    // URL 업데이트 (브라우저 히스토리에 추가)
    router.push(`/pricing/group?groupId=${groupId}`, { scroll: false });
  };
  const [selectedProductionGroupId, setSelectedProductionGroupId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(null);

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

  // 가중치 상태 (그룹별 weight 퍼센트, 100 = 동일가격, 85 = 15% 할인)
  const [weights, setWeights] = useState<Record<string, number>>({});

  // 잉크젯 그룹단가 입력 모달 상태
  const [isInkjetPriceDialogOpen, setIsInkjetPriceDialogOpen] = useState(false);
  const [inkjetDialogSetting, setInkjetDialogSetting] = useState<any>(null);

  const { data: clientGroupsData, isLoading: clientGroupsLoading } = useClientGroups({ limit: 100 });

  // URL에서 groupId가 전달된 경우 자동 선택
  useEffect(() => {
    if (groupIdFromUrl && clientGroupsData?.data) {
      const group = clientGroupsData.data.find(g => g.id === groupIdFromUrl);
      if (group && selectedClientGroupId !== groupIdFromUrl) {
        setSelectedClientGroupId(groupIdFromUrl);
      }
    }
  }, [groupIdFromUrl, clientGroupsData, selectedClientGroupId]);
  const { data: productionTree, isLoading: treeLoading } = useProductionGroupTree();
  const { data: groupPrices, isLoading: groupPricesLoading } = useGroupProductionSettingPrices(selectedClientGroupId);
  const setGroupPricesMutation = useSetGroupProductionSettingPrices();
  const { data: indigoPapers } = usePapersByPrintMethod('indigo');
  const { data: inkjetPapers } = usePapersByPrintMethod('inkjet');
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
    return map;
  }, [indigoPapers, inkjetPapers]);

  const selectedClientGroup = clientGroupsData?.data?.find(g => g.id === selectedClientGroupId);

  // 그룹 단가 맵 (settingId_priceGroupId_minQuantity -> price data)
  const groupPricesMap = useMemo(() => {
    const map = new Map<string, any>();
    if (groupPrices) {
      groupPrices.forEach((gp: any) => {
<<<<<<< Updated upstream
        // priceGroupId와 specificationId가 모두 있으면 (잉크젯 그룹별 규격단가)
        if (gp.priceGroupId && gp.specificationId) {
          const key = `${gp.productionSettingId}_${gp.priceGroupId}_${gp.specificationId}`;
          map.set(key, gp);
        }
        // priceGroupId만 있으면 (인디고 그룹별 Up단가)
        else if (gp.priceGroupId) {
          const key = `${gp.productionSettingId}_${gp.priceGroupId}_${gp.minQuantity || ''}`;
          map.set(key, gp);
        }
        // 둘 다 없으면 규격 기반 키
        else {
          const key = `${gp.productionSettingId}_${gp.minQuantity || ''}_${gp.specificationId || ''}`;
          map.set(key, gp);
        }
=======
        // priceGroupId가 있으면 그룹 기반 키, 없으면 규격 기반 키
        const key = gp.priceGroupId
          ? `${gp.productionSettingId}_${gp.priceGroupId}_${gp.minQuantity || ''}`
          : `${gp.productionSettingId}_${gp.minQuantity || ''}_${gp.specificationId || ''}`;
        map.set(key, gp);
>>>>>>> Stashed changes
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

    // 모든 생산 그룹을 순회하며 가중치 계산
    const processGroup = (group: ProductionGroup) => {
      if (group.settings) {
        group.settings.forEach((setting: any) => {
          const priceGroups = setting.priceGroups || [];

          priceGroups.forEach((priceGroup: any) => {
            const upPrices = priceGroup.upPrices || [];
            // 1up 가격을 기준으로 가중치 계산
            const oneUpPrice = upPrices.find((up: any) => up.up === 1);
            if (!oneUpPrice) return;

            // 저장된 그룹 가격 조회
            const savedGroupPrice = groupPricesMap.get(`${setting.id}_${priceGroup.id}_1`);
            if (!savedGroupPrice) return;

            // 4도단면 기준으로 가중치 계산 (가장 일반적인 가격)
            const standardPrice = oneUpPrice.fourColorSinglePrice;
            const groupPrice = savedGroupPrice.fourColorSinglePrice;

            if (standardPrice > 0 && groupPrice > 0) {
              const weight = Math.round((groupPrice / standardPrice) * 100);
              calculatedWeights[`${setting.id}_${priceGroup.id}`] = weight;
            }
          });
        });
      }

      // 자식 그룹도 처리
      if (group.children) {
        group.children.forEach(processGroup);
      }
    };

    productionTree.forEach(processGroup);

    // 계산된 가중치를 상태에 적용
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

  // 모든 노드 확장/축소
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

      // 해당 설정의 편집 상태 초기화
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

  // 인디고 그룹 가격 저장 핸들러 (기존 - 하위 호환용)
  const handleSaveIndigoPrices = async (settingId: string) => {
    const prices: any[] = [];

    // 편집된 가격들을 수집
    [1, 2, 4, 8].forEach(up => {
      const baseKey = `${settingId}_${up}_`;
      const fourColorSingle = editingPrices[`${baseKey}fourColorSinglePrice`];
      const fourColorDouble = editingPrices[`${baseKey}fourColorDoublePrice`];
      const sixColorSingle = editingPrices[`${baseKey}sixColorSinglePrice`];
      const sixColorDouble = editingPrices[`${baseKey}sixColorDoublePrice`];

      if (fourColorSingle || fourColorDouble || sixColorSingle || sixColorDouble) {
        prices.push({
          minQuantity: up,
          fourColorSinglePrice: fourColorSingle ? parseFloat(fourColorSingle) : undefined,
          fourColorDoublePrice: fourColorDouble ? parseFloat(fourColorDouble) : undefined,
          sixColorSinglePrice: sixColorSingle ? parseFloat(sixColorSingle) : undefined,
          sixColorDoublePrice: sixColorDouble ? parseFloat(sixColorDouble) : undefined,
        });
      }
    });

    if (prices.length > 0) {
      await handleSavePrices(settingId, prices);
    }
  };

  // 그룹별 가격 저장 핸들러 (인디고 upPrices + 잉크젯 specPrices 모두 지원)
  const handleSaveGroupPrices = async (settingId: string, priceGroups: any[], printMethod?: string) => {
    const prices: any[] = [];

    // 그룹별로 편집된 가격들을 수집
    priceGroups.forEach((group: any) => {
      // 인디고: upPrices 처리
      const upPrices = group.upPrices || [];
      upPrices.forEach((upPrice: any) => {
        const baseKey = `${settingId}_${group.id}_${upPrice.up}`;
        const fourColorSingle = editingPrices[`${baseKey}_fourColorSinglePrice`];
        const fourColorDouble = editingPrices[`${baseKey}_fourColorDoublePrice`];
        const sixColorSingle = editingPrices[`${baseKey}_sixColorSinglePrice`];
        const sixColorDouble = editingPrices[`${baseKey}_sixColorDoublePrice`];

        if (fourColorSingle || fourColorDouble || sixColorSingle || sixColorDouble) {
          prices.push({
            minQuantity: upPrice.up,
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

<<<<<<< Updated upstream
        if (editedValue !== undefined && editedValue !== '') {
=======
        if (editedValue) {
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    } else {
      toast({
        title: '변경사항 없음',
        description: '수정된 단가가 없습니다. 단가를 입력 후 저장해주세요.',
        variant: 'default',
      });
=======
>>>>>>> Stashed changes
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
  const openPriceAdjustDialog = (settingId: string, priceGroups: any[]) => {
    setPriceAdjustSettingId(settingId);
    setPriceAdjustPriceGroups(priceGroups);
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
          const key = `${settingId}_${groupId}_${upPrice.up}_${field}`;
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

<<<<<<< Updated upstream
  // 잉크젯 가중치 적용 함수 (표준단가 * 가중치% = 그룹단가)
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

=======
>>>>>>> Stashed changes
  // 단가 맞춤 적용 함수
  const applyPriceAdjustment = () => {
    if (!priceAdjustSettingId || priceAdjustPriceGroups.length === 0) return;

    const currentRanges = [...priceAdjustRanges];

    // 범위 시작 가격 계산 함수
    const getMinPrice = (index: number): number => {
      if (index === 0) return 0;
      return Number(currentRanges[index - 1].maxPrice) + 1;
    };

    // 가격에 해당하는 범위 찾기
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

    // 단위로 반올림하는 함수
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

    // 그룹별로 편집 중인 가격들에 대해 조정 적용
    priceAdjustPriceGroups.forEach((group: any) => {
      const upPrices = group.upPrices || [];

      upPrices.forEach((upPrice: any) => {
        ['fourColorSinglePrice', 'fourColorDoublePrice', 'sixColorSinglePrice', 'sixColorDoublePrice'].forEach(field => {
          const key = `${priceAdjustSettingId}_${group.id}_${upPrice.up}_${field}`;
          // editingPrices에서 먼저 확인, 없으면 groupPricesMap에서 가져옴
          const editedValue = editingPrices[key];
          const savedGroupPrice = groupPricesMap.get(`${priceAdjustSettingId}_${group.id}_${upPrice.up}`)?.[field];
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

    // 해당 설정의 편집 상태 초기화
    setEditingPrices(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (key.startsWith(priceAdjustSettingId + '_')) {
          delete next[key];
        }
      });
      return next;
    });

    // 해당 설정의 가중치 초기화
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
            <div className="flex items-center gap-4">
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
                    {clientGroupsData?.data?.map((group) => (
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
                      onSelectGroup={(g) => setSelectedProductionGroupId(g.id)}
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
                      분류를 선택하세요
                    </CardTitle>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* 단가맞춤 버튼 - 선택된 설정이 있고 그룹이 있을 때만 표시 */}
                  {selectedSettingId && selectedProductionGroup?.settings?.find(s => s.id === selectedSettingId) && (
                    (() => {
                      const setting = selectedProductionGroup.settings.find(s => s.id === selectedSettingId);
                      const priceGroups = (setting as any)?.priceGroups || [];
                      const printMethod = (setting as any)?.printMethod;
                      const hasPriceGroups = (printMethod === 'indigo' || printMethod === 'inkjet') && priceGroups.length > 0;
                      if (!hasPriceGroups) return null;
                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPriceAdjustDialog(selectedSettingId, priceGroups)}
                        >
                          <SlidersHorizontal className="h-4 w-4 mr-1" />
                          단가맞춤
                        </Button>
                      );
                    })()
                  )}
                  {Object.keys(editingPrices).length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPrices({})}
                      >
                        <X className="h-4 w-4 mr-1" />
                        모든 변경 취소
                      </Button>
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                        disabled={isSaving}
                        onClick={() => {
                          if (selectedSettingId) {
                            const setting = selectedProductionGroup?.settings?.find(s => s.id === selectedSettingId);
                            const priceGroups = (setting as any)?.priceGroups || [];
                            handleSaveGroupPrices(selectedSettingId, priceGroups);
                          }
                        }}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        저장
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 max-h-[calc(100vh-380px)] overflow-y-auto">
              {!selectedProductionGroup ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>등록된 설정이 없습니다.</p>
                  <p className="text-sm mt-2">좌측에서 분류를 선택하면 단가를 설정할 수 있습니다.</p>
                </div>
              ) : selectedProductionGroup.settings?.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>등록된 설정이 없습니다.</p>
                  <p className="text-sm mt-2">표준단가 페이지에서 먼저 설정을 추가해주세요.</p>
                </div>
              ) : (
                <div>
                  {selectedProductionGroup.settings?.map((setting) => {
                    const printMethod = (setting as any).printMethod;
                    const pricingType = (setting as any).pricingType || '';
<<<<<<< Updated upstream
=======
                    const isDelivery = isDeliveryPricingType(pricingType);
>>>>>>> Stashed changes
                    const isSelected = selectedSettingId === setting.id;

                    // 표준 단가 그룹 가져오기 (인디고/잉크젯 모두 지원)
                    const priceGroups = (setting as any).priceGroups || [];
                    const hasPriceGroups = (printMethod === 'indigo' || printMethod === 'inkjet') && priceGroups.length > 0;

                    // 잉크젯 규격별 가격 가져오기 (그룹이 없는 경우에만 사용)
                    const specifications = (setting as any).specifications || [];
                    const standardPrices = (setting as any).prices || [];
                    const hasInkjetSpecs = printMethod === 'inkjet' && specifications.length > 0 && !hasPriceGroups;

                    // 1up 변경 시 다른 nup 자동 계산 (그룹별)
                    const handleOneUpChange = (groupId: string, field: string, value: string) => {
                      const oneUpPrice = parseFloat(value) || 0;
                      const updates: Record<string, string> = {};

                      [1, 2, 4, 8].forEach(up => {
                        const key = `${setting.id}_${groupId}_${up}_${field}`;
                        if (up === 1) {
                          updates[key] = value;
                        } else {
                          updates[key] = oneUpPrice > 0 ? Math.round(oneUpPrice / up).toString() : '';
                        }
                      });

                      setEditingPrices(prev => ({ ...prev, ...updates }));
                    };

                    return (
                      <div key={setting.id} className={cn(
                        "border rounded-lg mb-3 bg-white transition-all",
                        isSelected ? "border-indigo-300 shadow-md" : "hover:shadow-sm"
                      )}>
                        {/* 설정 헤더 */}
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer"
                          onClick={() => setSelectedSettingId(isSelected ? null : setting.id)}
                        >
                          <div className="flex items-center gap-3">
                            {/* 세팅명 */}
                            <span className="text-base font-bold text-gray-900">
                              {(setting as any).settingName || (setting as any).codeName || setting.name || "설정"}
                            </span>

                            {/* 적용단위 */}
                            <Badge variant="outline" className="text-xs font-normal text-gray-600 bg-gray-50">
<<<<<<< Updated upstream
                              {PRICING_TYPE_LABELS[pricingType] || pricingType}
                            </Badge>

                            {/* 인쇄방식 */}
                            {printMethod && (
=======
                              {isDelivery
                                ? DELIVERY_METHOD_LABELS[pricingType] || pricingType
                                : PRICING_TYPE_LABELS[pricingType] || pricingType}
                            </Badge>

                            {/* 인쇄방식 */}
                            {!isDelivery && printMethod && (
>>>>>>> Stashed changes
                              <Badge variant="secondary" className="text-xs">
                                {PRINT_METHOD_LABELS[printMethod] || printMethod}
                              </Badge>
                            )}

                            {/* 작업시간 */}
                            <div className="flex items-center text-xs text-gray-500">
                              <span className="mr-1">작업시간:</span>
                              <span className="font-mono font-medium text-gray-900">{Number((setting as any).workDays) || 1}일</span>
                            </div>
                          </div>

                          {/* 단가 입력/접기 버튼 + 저장 버튼 */}
                          <div className="flex items-center gap-2">
                            {/* 해당 설정에 변경된 가격이 있는 경우 저장 버튼 표시 (_baseSpec 제외) */}
                            {isSelected && Object.keys(editingPrices).some(key =>
                              key.startsWith(setting.id + '_') && !key.includes('_baseSpec')
                            ) && (
                              <Button
                                size="sm"
                                className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white"
                                disabled={isSaving}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveGroupPrices(setting.id, priceGroups);
                                }}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                저장
                              </Button>
                            )}
                            {/* 잉크젯: 모달로 단가 입력 */}
                            {printMethod === 'inkjet' && hasPriceGroups && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-4 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openInkjetPriceDialog(setting);
                                }}
                              >
                                <Edit className="h-3.5 w-3.5 mr-1.5" />
                                단가 입력
                              </Button>
                            )}
                            {/* 인디고: 인라인 패널로 단가 입력 */}
                            {printMethod === 'indigo' && hasPriceGroups && (
                              <Button
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                  "h-8 px-4",
                                  isSelected
                                    ? "bg-gray-600 hover:bg-gray-700 text-white"
                                    : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSettingId(isSelected ? null : setting.id);
                                }}
                              >
                                <Edit className="h-3.5 w-3.5 mr-1.5" />
                                {isSelected ? "접기" : "단가 입력"}
                              </Button>
                            )}
                          </div>
                        </div>

<<<<<<< Updated upstream
                        {/* 단가 입력 패널 - 인디고만 인라인 (2열 레이아웃) */}
                        {isSelected && hasPriceGroups && printMethod === 'indigo' && (
                          <div className="border-t px-4 py-4 bg-gray-50/50">
                            {/* 그룹별 단가 입력 - 2열 그리드 */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
=======
                        {/* 단가 입력 패널 - 인디고만 인라인 (3열 레이아웃) */}
                        {isSelected && hasPriceGroups && printMethod === 'indigo' && (
                          <div className="border-t px-4 py-4 bg-gray-50/50">
                            {/* 그룹별 단가 입력 - 3열 그리드 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
>>>>>>> Stashed changes
                              {priceGroups.map((group: any) => {
                                const style = PRICE_GROUP_STYLES[group.color] || PRICE_GROUP_STYLES.none;
                                const upPrices = (group.upPrices || []).sort((a: any, b: any) => a.up - b.up);

                                // 그룹에 연결된 용지 정보 가져오기
                                const paperPriceGroupMap = (setting as any).paperPriceGroupMap || {};
                                const linkedPaperIds = Object.entries(paperPriceGroupMap)
                                  .filter(([_, gId]) => gId === group.id)
                                  .map(([paperId]) => paperId);
                                // papersMap에서 용지 정보 조회
                                const linkedPapers = linkedPaperIds
                                  .map(id => papersMap.get(id))
                                  .filter(Boolean);
                                const linkedPaperNames = linkedPapers.map((p: any) => p.name).slice(0, 3);

                                return (
                                  <div
                                    key={group.id}
                                    className={cn("border rounded-lg p-3", style.border, style.bg)}
                                  >
                                    {/* 그룹 헤더 */}
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className={cn("w-3 h-3 rounded-full", style.dot)} />
                                        <span className={cn("font-semibold text-sm", style.text)}>
                                          {group.name || `그룹 ${group.id.slice(-4)}`}
                                        </span>
                                        <Badge variant="outline" className="text-[10px] h-5">
                                          {linkedPapers.length > 0 ? `${linkedPapers.length}개 용지` : `${upPrices.length}개 Up`}
                                        </Badge>
                                      </div>
                                      {/* 가중치 입력 */}
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
                                    {/* 연결된 용지명 표시 */}
                                    {linkedPaperNames.length > 0 && (
                                      <div className="text-[11px] text-gray-500 mb-3 pl-5">
                                        {linkedPaperNames.join(', ')}
                                        {linkedPapers.length > 3 && ` 외 ${linkedPapers.length - 3}개`}
                                      </div>
                                    )}

                                    {/* 인디고: Up별 가격 테이블 */}
                                    {printMethod === 'indigo' && (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs border-collapse bg-white rounded">
                                          <thead>
                                            <tr className="bg-gray-50">
                                              <th className="px-2 py-1.5 text-left font-medium text-gray-500 w-12">Up</th>
                                              <th className="px-2 py-1.5 text-center font-medium text-gray-500">4도단면</th>
                                              <th className="px-2 py-1.5 text-center font-medium text-gray-500">4도양면</th>
                                              <th className="px-2 py-1.5 text-center font-medium text-gray-500">6도단면</th>
                                              <th className="px-2 py-1.5 text-center font-medium text-gray-500">6도양면</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {upPrices.map((upPrice: any) => {
                                              const isOneUp = upPrice.up === 1;
                                              const baseKey = `${setting.id}_${group.id}_${upPrice.up}`;

                                              // 그룹단가 맵에서 가져오기 (settingId_priceGroupId_minQuantity 형식)
                                              const savedGroupPrice = groupPricesMap.get(`${setting.id}_${group.id}_${upPrice.up}`);

                                              return (
                                                <tr key={upPrice.up} className="border-t">
                                                  <td className="px-2 py-1.5 font-medium text-gray-600">
                                                    {upPrice.up}up
                                                    {isOneUp && <span className="text-indigo-500 text-[10px] ml-1">(기준)</span>}
                                                  </td>
                                                  {['fourColorSinglePrice', 'fourColorDoublePrice', 'sixColorSinglePrice', 'sixColorDoublePrice'].map((field) => {
                                                    const key = `${baseKey}_${field}`;
                                                    const standardPrice = upPrice[field] || 0;
                                                    const savedPrice = savedGroupPrice?.[field];

                                                    return (
                                                      <td key={field} className="px-1 py-1.5 text-center">
                                                        <div className="flex flex-col items-center gap-0.5">
                                                          <span className="text-gray-400 text-[9px]">
                                                            {standardPrice > 0 ? formatNumber(standardPrice) : "-"}
                                                          </span>
                                                          <Input
                                                            type="number"
                                                            className={cn(
                                                              "h-6 w-16 text-xs text-center font-mono",
                                                              !isOneUp && "bg-gray-50"
                                                            )}
                                                            placeholder="-"
                                                            value={editingPrices[key] ?? (savedPrice ? String(savedPrice) : '')}
                                                            onChange={(e) => {
                                                              if (isOneUp) {
                                                                handleOneUpChange(group.id, field, e.target.value);
                                                              } else {
                                                                setEditingPrices(prev => ({ ...prev, [key]: e.target.value }));
                                                              }
                                                            }}
                                                            readOnly={!isOneUp && !!editingPrices[`${setting.id}_${group.id}_1_${field}`]}
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

                                    {/* 잉크젯: 그룹별 규격 단가 - 표준단가와 동일한 구조 */}
                                    {printMethod === 'inkjet' && (
                                      <>
                                        {/* 단가 입력 방식: 기준규격 선택 + 단가 입력 */}
                                        <div className="mb-1.5 p-1.5 bg-white/50 border text-[10px]">
                                          <div className="flex items-center gap-1 flex-wrap">
                                            <select
                                              className="h-6 px-1 border rounded text-[10px] bg-white"
                                              value={editingPrices[`${setting.id}_${group.id}_baseSpec`] || (group.specPrices?.[0]?.specificationId || '')}
                                              onChange={(e) => {
                                                setEditingPrices(prev => ({
                                                  ...prev,
                                                  [`${setting.id}_${group.id}_baseSpec`]: e.target.value
                                                }));
                                              }}
                                            >
                                              {(group.specPrices || []).map((sp: any) => {
                                                const specInfo = specifications.find((s: any) =>
                                                  (s.specificationId || s.id) === sp.specificationId
                                                )?.specification || {};
                                                return (
                                                  <option key={sp.specificationId} value={sp.specificationId}>
                                                    {specInfo.name || sp.specificationId?.slice(-6)}
                                                  </option>
                                                );
                                              })}
                                            </select>
                                            <Input
                                              type="number"
                                              className="h-6 w-16 text-[10px] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                              placeholder="단가"
                                              value={(() => {
                                                const baseSpecId = editingPrices[`${setting.id}_${group.id}_baseSpec`] || (group.specPrices?.[0]?.specificationId || '');
                                                const key = `${setting.id}_${group.id}_spec_${baseSpecId}`;
                                                const savedGroupPrice = groupPricesMap.get(`${setting.id}_${group.id}_${baseSpecId}`);
                                                return editingPrices[key] ?? (savedGroupPrice?.price ? String(Number(savedGroupPrice.price)) : '');
                                              })()}
                                              onChange={(e) => {
                                                const baseSpecId = editingPrices[`${setting.id}_${group.id}_baseSpec`] || (group.specPrices?.[0]?.specificationId || '');
                                                const basePrice = parseFloat(e.target.value) || 0;
                                                const baseSpecInfo = specifications.find((s: any) =>
                                                  (s.specificationId || s.id) === baseSpecId
                                                )?.specification || {};
                                                const baseArea = (Number(baseSpecInfo.widthInch) || 0) * (Number(baseSpecInfo.heightInch) || 0);
                                                const pricePerSqInch = baseArea > 0 ? basePrice / baseArea : 0;

                                                // 기준규격 단가 저장
                                                const updates: Record<string, string> = {
                                                  [`${setting.id}_${group.id}_spec_${baseSpecId}`]: e.target.value
                                                };

                                                // 다른 규격들 자동 계산
                                                if (pricePerSqInch > 0) {
                                                  (group.specPrices || []).forEach((sp: any) => {
                                                    if (sp.specificationId !== baseSpecId) {
                                                      const specInfo = specifications.find((s: any) =>
                                                        (s.specificationId || s.id) === sp.specificationId
                                                      )?.specification || {};
                                                      const area = (Number(specInfo.widthInch) || 0) * (Number(specInfo.heightInch) || 0);
                                                      const weight = sp.weight || 1;
                                                      const calcPrice = Math.round(pricePerSqInch * area * weight);
                                                      updates[`${setting.id}_${group.id}_spec_${sp.specificationId}`] = String(calcPrice);
                                                    }
                                                  });
                                                }

                                                setEditingPrices(prev => ({ ...prev, ...updates }));
                                              }}
                                            />
                                            {/* 표준단가 표시 */}
                                            {(() => {
                                              const baseSpecId = editingPrices[`${setting.id}_${group.id}_baseSpec`] || (group.specPrices?.[0]?.specificationId || '');
                                              const baseSpecPrice = (group.specPrices || []).find((sp: any) => sp.specificationId === baseSpecId);
                                              return baseSpecPrice?.singleSidedPrice ? (
                                                <span className="text-gray-400 text-[9px]">
                                                  표준: {formatNumber(baseSpecPrice.singleSidedPrice)}
                                                </span>
                                              ) : null;
                                            })()}
                                          </div>
                                        </div>

                                        {/* 규격별 단가 테이블 */}
                                        <div className="max-h-40 overflow-y-auto">
                                          <table className="w-full text-[10px]">
                                            <thead className="sticky top-0 bg-white">
                                              <tr className="border-b">
                                                <th className="text-left py-0.5 font-medium text-gray-500">규격</th>
                                                <th className="text-right py-0.5 font-medium text-gray-500 w-14">표준</th>
                                                <th className="text-right py-0.5 font-medium text-gray-500 w-14">그룹</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {(group.specPrices || []).map((specPrice: any) => {
                                                const specId = specPrice.specificationId;
                                                const specInfo = specifications.find((s: any) =>
                                                  (s.specificationId || s.id) === specId
                                                )?.specification || {};
                                                const key = `${setting.id}_${group.id}_spec_${specId}`;
                                                const savedGroupPrice = groupPricesMap.get(`${setting.id}_${group.id}_${specId}`);
                                                const displayPrice = editingPrices[key] ?? (savedGroupPrice?.price ? String(Number(savedGroupPrice.price)) : '');
                                                const baseSpecId = editingPrices[`${setting.id}_${group.id}_baseSpec`] || (group.specPrices?.[0]?.specificationId || '');
                                                const isBase = specId === baseSpecId;

                                                return (
                                                  <tr key={specId} className={cn("border-b border-gray-100", isBase && "bg-indigo-50/50")}>
                                                    <td className="py-0.5 text-gray-600">
                                                      {specInfo.name || specId?.slice(-6)}
                                                      {isBase && <span className="text-indigo-500 ml-0.5">*</span>}
                                                    </td>
                                                    <td className="py-0.5 text-right text-gray-400">
                                                      {specPrice.singleSidedPrice ? formatNumber(specPrice.singleSidedPrice) : '-'}
                                                    </td>
                                                    <td className={cn(
                                                      "py-0.5 text-right font-mono",
                                                      displayPrice ? "text-indigo-600 font-medium" : "text-gray-400"
                                                    )}>
                                                      {displayPrice ? formatNumber(Number(displayPrice)) : '-'}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 잉크젯 규격별 단가 입력 패널 */}
                        {isSelected && hasInkjetSpecs && (
                          <div className="border-t px-4 py-4 bg-gray-50/50">
                            <div className="mb-3">
                              <span className="text-sm font-medium text-gray-700">규격별 단가</span>
                              <span className="text-xs text-gray-400 ml-2">표준단가 대비 그룹 특별가를 입력하세요</span>
                            </div>

                            {/* 규격별 가격 테이블 */}
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
                                              ({Number(specInfo.widthInch).toFixed(1)}×{Number(specInfo.heightInch).toFixed(1)}")
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
                            <div className="flex justify-end mt-4">
                              <Button
                                size="sm"
                                className="h-8 bg-indigo-600 hover:bg-indigo-700"
                                disabled={isSaving || !hasEditingPricesForSetting(setting.id)}
                                onClick={() => {
                                  // 잉크젯 규격별 가격 저장
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
                                {isSaving ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                저장
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* [제본전용] 구간별 Nup/1p가격 그룹단가 입력 */}
                        {isSelected && pricingType === 'nup_page_range' && (
                          <div className="border-t px-4 py-4 bg-gray-50/50">
                            {(() => {
                              const nupPageRanges = (setting as any).nupPageRanges || [];
                              const pageRanges = (setting as any).pageRanges || [20, 30, 40, 50, 60];
                              const settingSpecs = (setting as any).specifications || [];

                              if (nupPageRanges.length === 0) {
                                return (
                                  <div className="text-center py-6 text-gray-500 text-sm">
                                    표준단가에서 먼저 Nup 규격을 설정해주세요.
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-3">
                                  {/* 테이블 헤더 */}
                                  <div
                                    className="grid gap-0 pb-2 border-b text-xs font-medium text-gray-600 items-center"
                                    style={{
                                      gridTemplateColumns: `80px 80px ${pageRanges.map(() => '80px').join(' ')}`
                                    }}
                                  >
                                    <span>Nup</span>
                                    <span className="text-right pr-2">1p당</span>
                                    {pageRanges.map((range: number) => (
                                      <span key={range} className="text-center">{range}p</span>
                                    ))}
                                  </div>

                                  {/* Nup별 단가 입력 */}
                                  <div className="space-y-1">
                                    {nupPageRanges.map((nupRange: any) => {
                                      const specInfo = settingSpecs.find((s: any) =>
                                        (s.specificationId || s.id) === nupRange.specificationId
                                      )?.specification || {};
                                      const nupLabel = specInfo.nup || '?';
                                      const standardPricePerPage = nupRange.pricePerPage || 0;
                                      const standardRangePrices = nupRange.rangePrices || {};

                                      return (
                                        <div
                                          key={nupRange.specificationId}
                                          className="grid gap-0 py-1 items-center bg-white rounded"
                                          style={{
                                            gridTemplateColumns: `80px 80px ${pageRanges.map(() => '80px').join(' ')}`
                                          }}
                                        >
                                          <span className="text-sm font-semibold text-violet-700">{nupLabel}</span>
                                          {/* 1p당 그룹단가 입력 */}
                                          <div className="flex flex-col items-end pr-2">
                                            <span className="text-[9px] text-gray-400">{formatNumber(standardPricePerPage)}</span>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              className="h-7 w-16 text-xs text-right font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                              placeholder="-"
                                              value={editingPrices[`${setting.id}_nup_${nupRange.specificationId}_perPage`] ?? ''}
                                              onChange={(e) => {
                                                const value = Number(e.target.value);
                                                const firstRange = pageRanges[0] || 20;
                                                const firstKey = `${setting.id}_nup_${nupRange.specificationId}_range_${firstRange}`;
                                                const currentFirstPrice = editingPrices[firstKey] ? Number(editingPrices[firstKey]) : (standardRangePrices[firstRange] || 0);

                                                const updates: Record<string, string> = {
                                                  [`${setting.id}_nup_${nupRange.specificationId}_perPage`]: e.target.value
                                                };

                                                // 구간별 가격 자동 계산
                                                pageRanges.forEach((range: number, idx: number) => {
                                                  if (idx === 0) {
                                                    // 첫 구간은 유지 또는 표준단가 사용
                                                    if (!editingPrices[firstKey]) {
                                                      updates[`${setting.id}_nup_${nupRange.specificationId}_range_${range}`] = String(standardRangePrices[range] || 0);
                                                    }
                                                  } else {
                                                    const calcPrice = Math.round((currentFirstPrice + ((range - firstRange) * value)) * 100) / 100;
                                                    updates[`${setting.id}_nup_${nupRange.specificationId}_range_${range}`] = String(calcPrice);
                                                  }
                                                });

                                                setEditingPrices(prev => ({ ...prev, ...updates }));
                                              }}
                                            />
                                          </div>
                                          {/* 구간별 그룹단가 입력 */}
                                          {pageRanges.map((range: number, idx: number) => {
                                            const standardPrice = standardRangePrices[range] || 0;
                                            const key = `${setting.id}_nup_${nupRange.specificationId}_range_${range}`;
                                            const savedGroupPrice = groupPricesMap.get(`${setting.id}_${nupRange.specificationId}_${range}`);
                                            const displayValue = editingPrices[key] ?? (savedGroupPrice?.price ? String(Number(savedGroupPrice.price)) : '');
                                            const isFirstRange = idx === 0;

                                            return (
                                              <div key={range} className="flex flex-col items-center">
                                                <span className="text-[9px] text-gray-400">{formatNumber(standardPrice)}</span>
                                                {isFirstRange ? (
                                                  <Input
                                                    type="number"
                                                    className="h-7 w-16 text-xs text-center font-mono bg-blue-50 border-blue-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    placeholder="-"
                                                    value={displayValue}
                                                    onChange={(e) => {
                                                      const value = Number(e.target.value);
                                                      const firstRange = pageRanges[0] || 20;
                                                      const perPageKey = `${setting.id}_nup_${nupRange.specificationId}_perPage`;
                                                      const currentPerPage = editingPrices[perPageKey] ? Number(editingPrices[perPageKey]) : standardPricePerPage;

                                                      const updates: Record<string, string> = {
                                                        [key]: e.target.value
                                                      };

                                                      // 나머지 구간 자동 계산
                                                      pageRanges.forEach((r: number, i: number) => {
                                                        if (i > 0) {
                                                          const calcPrice = Math.round((value + ((r - firstRange) * currentPerPage)) * 100) / 100;
                                                          updates[`${setting.id}_nup_${nupRange.specificationId}_range_${r}`] = String(calcPrice);
                                                        }
                                                      });

                                                      setEditingPrices(prev => ({ ...prev, ...updates }));
                                                    }}
                                                  />
                                                ) : (
                                                  <span className="h-7 flex items-center justify-center w-16 font-mono text-xs text-gray-600 bg-gray-50 rounded border">
                                                    {displayValue ? formatNumber(Number(displayValue)) : '-'}
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* 저장 버튼 */}
                                  <div className="flex justify-end mt-4">
                                    <Button
                                      size="sm"
                                      className="h-8 bg-indigo-600 hover:bg-indigo-700"
                                      disabled={isSaving || !Object.keys(editingPrices).some(k => k.startsWith(`${setting.id}_nup_`))}
                                      onClick={() => {
                                        const prices: any[] = [];
                                        nupPageRanges.forEach((nupRange: any) => {
                                          pageRanges.forEach((range: number) => {
                                            const key = `${setting.id}_nup_${nupRange.specificationId}_range_${range}`;
                                            const editedValue = editingPrices[key];
                                            if (editedValue) {
                                              prices.push({
                                                specificationId: nupRange.specificationId,
                                                minQuantity: range,
                                                price: parseFloat(editedValue),
                                              });
                                            }
                                          });
                                        });
                                        if (prices.length > 0) {
                                          handleSavePrices(setting.id, prices);
                                        }
                                      }}
                                    >
                                      {isSaving ? (
                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                      ) : (
                                        <Save className="h-3.5 w-3.5 mr-1.5" />
                                      )}
                                      저장
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* [후가공전용] 규격별 Nup/1p단가 그룹단가 입력 */}
                        {isSelected && pricingType === 'finishing_spec_nup' && (
                          <div className="border-t px-4 py-4 bg-gray-50/50">
                            {(() => {
                              const nupPageRanges = (setting as any).nupPageRanges || [];
                              const settingSpecs = (setting as any).specifications || [];

                              if (nupPageRanges.length === 0) {
                                return (
                                  <div className="text-center py-6 text-gray-500 text-sm">
                                    표준단가에서 먼저 Nup 규격을 설정해주세요.
                                  </div>
                                );
                              }

                              // Nup별로 그룹핑
                              const nupGroups = new Map<string, any[]>();
                              nupPageRanges.forEach((item: any) => {
                                const specInfo = settingSpecs.find((s: any) =>
                                  (s.specificationId || s.id) === item.specificationId
                                )?.specification || {};
                                const nup = specInfo.nup || 'other';
                                if (!nupGroups.has(nup)) {
                                  nupGroups.set(nup, []);
                                }
                                nupGroups.get(nup)!.push({ ...item, specInfo });
                              });

                              return (
                                <div className="space-y-3">
                                  {Array.from(nupGroups.entries()).map(([nup, items]) => (
                                    <div key={nup} className="border rounded-lg p-3 bg-white">
                                      <div className="flex items-center gap-3 mb-2">
                                        <Badge variant="secondary" className="bg-violet-100 text-violet-700 font-semibold">
                                          {nup}
                                        </Badge>
                                        <span className="text-xs text-gray-500">{items.length}개 규격</span>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                        {items.map((item: any) => {
                                          const standardPrice = item.pricePerPage || 0;
                                          const key = `${setting.id}_nup_${item.specificationId}_perPage`;
                                          const savedGroupPrice = groupPricesMap.get(`${setting.id}_${item.specificationId}_perPage`);
                                          const displayValue = editingPrices[key] ?? (savedGroupPrice?.price ? String(Number(savedGroupPrice.price)) : '');

                                          return (
                                            <div key={item.specificationId} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                              <span className="text-xs text-gray-600 truncate flex-1">
                                                {item.specInfo.name || item.specificationId?.slice(-6)}
                                              </span>
                                              <div className="flex flex-col items-end">
                                                <span className="text-[9px] text-gray-400">{formatNumber(standardPrice)}</span>
                                                <Input
                                                  type="number"
                                                  className="h-6 w-16 text-xs text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                  placeholder="-"
                                                  value={displayValue}
                                                  onChange={(e) => {
                                                    setEditingPrices(prev => ({ ...prev, [key]: e.target.value }));
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}

                                  {/* 저장 버튼 */}
                                  <div className="flex justify-end mt-4">
                                    <Button
                                      size="sm"
                                      className="h-8 bg-indigo-600 hover:bg-indigo-700"
                                      disabled={isSaving || !Object.keys(editingPrices).some(k => k.startsWith(`${setting.id}_nup_`))}
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
                                      {isSaving ? (
                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                      ) : (
                                        <Save className="h-3.5 w-3.5 mr-1.5" />
                                      )}
                                      저장
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* [후가공전용] 길이별단가 그룹단가 입력 */}
                        {isSelected && pricingType === 'finishing_length' && (
                          <div className="border-t px-4 py-4 bg-gray-50/50">
                            {(() => {
                              const lengthPrices = (setting as any).lengthPrices || [];

                              if (lengthPrices.length === 0) {
                                return (
                                  <div className="text-center py-6 text-gray-500 text-sm">
                                    표준단가에서 먼저 길이별 단가를 설정해주세요.
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-3">
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

                                  {/* 저장 버튼 */}
                                  <div className="flex justify-end mt-4">
                                    <Button
                                      size="sm"
                                      className="h-8 bg-indigo-600 hover:bg-indigo-700"
                                      disabled={isSaving || !Object.keys(editingPrices).some(k => k.startsWith(`${setting.id}_length_`))}
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
                                      {isSaving ? (
                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                      ) : (
                                        <Save className="h-3.5 w-3.5 mr-1.5" />
                                      )}
                                      저장
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* [후가공전용] 면적별단가 그룹단가 입력 */}
                        {isSelected && pricingType === 'finishing_area' && (
                          <div className="border-t px-4 py-4 bg-gray-50/50">
                            {(() => {
                              const areaPrices = (setting as any).areaPrices || [];

                              if (areaPrices.length === 0) {
                                return (
                                  <div className="text-center py-6 text-gray-500 text-sm">
                                    표준단가에서 먼저 면적별 단가를 설정해주세요.
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-3">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs border-collapse bg-white rounded border">
                                      <thead>
                                        <tr className="bg-gray-50">
                                          <th className="px-3 py-2 text-left font-medium text-gray-500 border-b">면적 (cm²)</th>
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
                                              <td className="px-3 py-2 font-medium text-gray-700">{formatNumber(ap.areaCm2)}cm²</td>
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

                                  {/* 저장 버튼 */}
                                  <div className="flex justify-end mt-4">
                                    <Button
                                      size="sm"
                                      className="h-8 bg-indigo-600 hover:bg-indigo-700"
                                      disabled={isSaving || !Object.keys(editingPrices).some(k => k.startsWith(`${setting.id}_area_`))}
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
                                      {isSaving ? (
                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                      ) : (
                                        <Save className="h-3.5 w-3.5 mr-1.5" />
                                      )}
                                      저장
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* 기타 타입 (수량당, 페이지당, 제본 페이지당) 그룹단가 입력 */}
                        {isSelected && (pricingType === 'finishing_qty' || pricingType === 'finishing_page' || pricingType === 'binding_page') && (
                          <div className="border-t px-4 py-4 bg-gray-50/50">
                            {(() => {
                              const standardPrice = (setting as any).basePrice || (setting as any).prices?.[0]?.price || 0;
                              const key = `${setting.id}_base_price`;
                              const savedGroupPrice = groupPricesMap.get(`${setting.id}__base`);

                              return (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-4 p-4 bg-white rounded border">
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

                                  {/* 저장 버튼 */}
                                  <div className="flex justify-end">
                                    <Button
                                      size="sm"
                                      className="h-8 bg-indigo-600 hover:bg-indigo-700"
                                      disabled={isSaving || !editingPrices[key]}
                                      onClick={() => {
                                        const editedValue = editingPrices[key];
                                        if (editedValue) {
                                          handleSavePrices(setting.id, [{
                                            price: parseFloat(editedValue),
                                          }]);
                                        }
                                      }}
                                    >
                                      {isSaving ? (
                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                      ) : (
                                        <Save className="h-3.5 w-3.5 mr-1.5" />
                                      )}
                                      저장
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

<<<<<<< Updated upstream
=======
                        {/* 배송방법 그룹단가 입력 */}
                        {isSelected && isDelivery && (
                          <div className="border-t px-4 py-4 bg-gray-50/50">
                            {(() => {
                              const standardPrice = (setting as any).basePrice || (setting as any).prices?.[0]?.price || 0;
                              const key = `${setting.id}_delivery_price`;
                              const savedGroupPrice = groupPricesMap.get(`${setting.id}__delivery`);

                              return (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-4 p-4 bg-white rounded border">
                                    <span className="text-sm font-medium text-gray-700">
                                      {DELIVERY_METHOD_LABELS[pricingType] || '배송'} 단가
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

                                  {/* 저장 버튼 */}
                                  <div className="flex justify-end">
                                    <Button
                                      size="sm"
                                      className="h-8 bg-indigo-600 hover:bg-indigo-700"
                                      disabled={isSaving || !editingPrices[key]}
                                      onClick={() => {
                                        const editedValue = editingPrices[key];
                                        if (editedValue) {
                                          handleSavePrices(setting.id, [{
                                            price: parseFloat(editedValue),
                                          }]);
                                        }
                                      }}
                                    >
                                      {isSaving ? (
                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                      ) : (
                                        <Save className="h-3.5 w-3.5 mr-1.5" />
                                      )}
                                      저장
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

>>>>>>> Stashed changes
                        {/* 지원하지 않는 경우 메시지 */}
                        {isSelected && !hasPriceGroups && !hasInkjetSpecs &&
                         pricingType !== 'nup_page_range' &&
                         pricingType !== 'finishing_spec_nup' &&
                         pricingType !== 'finishing_length' &&
                         pricingType !== 'finishing_area' &&
                         pricingType !== 'finishing_qty' &&
                         pricingType !== 'finishing_page' &&
<<<<<<< Updated upstream
                         pricingType !== 'binding_page' && (
=======
                         pricingType !== 'binding_page' &&
                         !isDelivery && (
>>>>>>> Stashed changes
                          <div className="border-t px-4 py-6 bg-gray-50/50 text-center text-gray-500 text-sm">
                            {printMethod === 'indigo'
                              ? "표준단가에서 먼저 단가 그룹을 설정해주세요."
                              : printMethod === 'inkjet'
                              ? "표준단가에서 먼저 규격을 설정해주세요."
                              : "표준단가에서 먼저 설정을 완료해주세요."}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
            {/* 상단 버튼 영역 */}
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

            {/* 구간별 설정 테이블 */}
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

            {/* 현재 설정 요약 */}
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
              {/* 그룹별 단가 입력 - 3열 그리드 */}
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
                    .filter(Boolean);

                  return (
                    <div key={group.id} className={cn("p-3 border-2 rounded-lg", style.bg, style.border)}>
                      {/* 그룹 헤더 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-3 h-3 rounded-full", style.dot)} />
                          <span className={cn("text-sm font-semibold", style.text)}>
                            {group.name || style.label}
                          </span>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {(group.specPrices || []).length}개 규격
                          </Badge>
                        </div>
<<<<<<< Updated upstream
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
=======
>>>>>>> Stashed changes
                      </div>

                      {/* 연결된 용지 */}
                      {linkedPapers.length > 0 && (
                        <div className="text-[10px] text-gray-500 mb-2 truncate">
                          {linkedPapers.map((p: any) => p.name).slice(0, 3).join(', ')}
                          {linkedPapers.length > 3 && ` 외 ${linkedPapers.length - 3}개`}
                        </div>
                      )}

                      {/* 표준단가 + 그룹단가 입력 */}
                      <div className="mb-2 p-2 bg-gray-100 border rounded text-xs">
                        {/* 표준단가 정보 (읽기전용) */}
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

                        {/* 그룹단가 입력 */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-indigo-600 text-[10px] font-medium">그룹단가</span>
                          {group.pricingMode !== 'sqinch' ? (
                            <>
                              {/* 기준규격 모드 */}
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

                                  // 모든 규격 자동 계산
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
                              {/* sq" 모드 */}
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

                                  // 모든 규격의 가격 자동 계산
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
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
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

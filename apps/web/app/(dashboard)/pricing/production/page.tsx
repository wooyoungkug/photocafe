"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Folder,
  FolderOpen,
  Settings2,
  ArrowUp,
  ArrowDown,
  Edit,
  Trash2,
  Ruler,
  Users,
  FolderInput,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/layout/page-header";
import {
  useProductionGroupTree,
  useCreateProductionGroup,
  useUpdateProductionGroup,
  useDeleteProductionGroup,
  useMoveProductionGroup,
  useCreateProductionSetting,
  useUpdateProductionSetting,
  useDeleteProductionSetting,
  useMoveProductionSetting,
  useMoveProductionGroupTo,
  useMoveProductionSettingTo,
  usePricingTypes,
  type ProductionGroup,
  type ProductionSetting,
  type PricingType,
} from "@/hooks/use-production";
import { useSpecifications, type Specification } from "@/hooks/use-specifications";
import { useClientGroups } from "@/hooks/use-clients";
import { usePapersByPrintMethod } from "@/hooks/use-paper";
import { Paper } from "@/lib/types/paper";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useSystemSettings, settingsToMap, getNumericValue } from "@/hooks/use-system-settings";

// 보호되는 그룹 이름 (삭제/수정 불가)
const PROTECTED_GROUP_NAMES = ['기타', '배송'];

// 보호되는 그룹인지 확인
const isProtectedGroup = (name: string): boolean => {
  return PROTECTED_GROUP_NAMES.includes(name);
};

// 숫자 포맷팅 (3자리 콤마)
const formatNumber = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null || num === '') return '';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '';
  return n.toLocaleString('ko-KR');
};

// 가격 계산 방식 한글 라벨 (배송 타입 제외)
const PRICING_TYPE_LABELS: Partial<Record<PricingType, string>> = {
  paper_output_spec: "[출력전용] 용지별출력단가/1p가격",
  nup_page_range: "[제본전용] 구간별 Nup/1p가격",
  finishing_spec_nup: "[후가공전용] 규격별 Nup/1p단가",
  finishing_length: "[후가공전용] 길이별단가",
  finishing_area: "[후가공전용] 면적별단가",
  binding_page: "[제본전용] 제본 페이지당",
  finishing_qty: "[후가공] 수량당",
  finishing_page: "[후가공] 페이지당",
};

// 할증조건 타입
const SURCHARGE_TYPES = [
  'night30_weekend20',
  'night20_weekend10',
  'free_condition',
  'none',
] as const;
type SurchargeType = typeof SURCHARGE_TYPES[number];

// 할증조건 라벨
const SURCHARGE_TYPE_LABELS: Record<SurchargeType, string> = {
  night30_weekend20: '야간 30% / 주말 20%',
  night20_weekend10: '야간 20% / 주말 10%',
  free_condition: '무료배송 조건',
  none: '할증 없음',
};

// 인디고 원가 계산 상수
// 인디고 규격: 315x467mm (국전지 4절 기준)
// 국전지 1연 = 500매, 4절이므로 500 * 4 = 2000장
const INDIGO_SHEETS_PER_REAM = 2000;
// 인디고 1장 면적 (sq inch): 315mm x 467mm ≈ 12.4" x 18.4" ≈ 228 sq inch
const INDIGO_SPEC_SQ_INCH = (315 / 25.4) * (467 / 25.4); // ≈ 228

// 업체 타입 라벨
const VENDOR_TYPE_LABELS: Record<string, string> = {
  in_house: "본사",
  outsourced: "외주",
};

// 인쇄방식(용도) 라벨
const PRINT_METHOD_LABELS: Record<string, string> = {
  indigoAlbum: "인디고앨범",
  indigo: "인디고출력",
  inkjet: "잉크젯출력",
  album: "잉크젯앨범",
  frame: "액자",
  booklet: "책자",
};

// 단가 그룹 컬러 순서 (자동 배정용)
const PRICE_GROUP_COLORS = ['green', 'blue', 'yellow', 'red', 'purple'] as const;
type PriceGroupColor = typeof PRICE_GROUP_COLORS[number];

// 단가 그룹 컬러 스타일
const PRICE_GROUP_STYLES: Record<PriceGroupColor | 'none', { bg: string; border: string; text: string; label: string; dot: string }> = {
  green: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', label: '그룹1', dot: '🟢' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', label: '그룹2', dot: '🔵' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', label: '그룹3', dot: '🟡' },
  red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', label: '그룹4', dot: '🔴' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', label: '그룹5', dot: '🟣' },
  none: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-400', label: '미지정', dot: '⚪' },
};

// 용지 컬러 그룹 스타일 (기존 호환용)
const COLOR_GROUP_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: '🟢 광택지' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: '🔵 무광지' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: '🟡 특수지' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: '🔴 프리미엄' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', label: '🟣 캔버스' },
  default: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', label: '⚪ 기타' },
};

// 다음 사용 가능한 그룹 컬러 가져오기
const getNextAvailableColor = (usedColors: PriceGroupColor[]): PriceGroupColor | null => {
  for (const color of PRICE_GROUP_COLORS) {
    if (!usedColors.includes(color)) return color;
  }
  return null;
};

// 고유 ID 생성
const generateGroupId = () => `pg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Nup 값 목록 및 정렬 순서 (큰 면적 순: 1++up > 1+up > 1up > 2up > 4up > 8up)
const NUP_ORDER = ['1++up', '1+up', '1up', '2up', '4up', '8up'] as const;
type NupValue = typeof NUP_ORDER[number];

// 규격을 Nup 그룹으로 묶어서 반환하는 헬퍼 함수
// 각 그룹의 대표 규격 1개만 UI에 표시하고, 선택 시 같은 Nup의 모든 규격이 함께 선택됨
const groupSpecificationsByNup = (specs: Specification[]): Map<string, Specification[]> => {
  const nupGroups = new Map<string, Specification[]>();

  specs.forEach(spec => {
    if (!spec.nup) return;
    const nup = spec.nup;
    if (!nupGroups.has(nup)) {
      nupGroups.set(nup, []);
    }
    nupGroups.get(nup)!.push(spec);
  });

  // Nup 순서대로 정렬된 Map 반환
  const sortedGroups = new Map<string, Specification[]>();
  NUP_ORDER.forEach(nup => {
    if (nupGroups.has(nup)) {
      sortedGroups.set(nup, nupGroups.get(nup)!);
    }
  });
  // NUP_ORDER에 없는 nup 값도 추가
  nupGroups.forEach((specs, nup) => {
    if (!sortedGroups.has(nup)) {
      sortedGroups.set(nup, specs);
    }
  });

  return sortedGroups;
};

// Nup 그룹의 대표 규격명 (포함된 규격들의 이름 나열)
const getNupGroupLabel = (specs: Specification[]): string => {
  if (specs.length === 0) return '';
  if (specs.length === 1) return specs[0].name;
  // 규격명 최대 3개까지 표시, 나머지는 +N개로 표시
  const names = specs.map(s => s.name).slice(0, 3);
  const remaining = specs.length - 3;
  return remaining > 0 ? `${names.join(', ')} 외 ${remaining}개` : names.join(', ');
};

// 숫자 포맷
const formatCurrency = (num: number) => {
  return new Intl.NumberFormat("ko-KR").format(num);
};

// 인디고 원가 계산 헬퍼 함수
// 인디고 규격: 315x467mm (국전지 4절 기준)
// 국전지 basePrice / 2000장 = 장당 원가
// 단면: 장당원가 / up
// 양면: 장당원가 / 2 / up (양면이므로 2로 나눔)
const calculateIndigoCost = (papers: Paper[], up: number, isDoubleSided: boolean = false) => {
  if (!papers.length) return null;

  // 선택된 용지들의 국전가격 (basePrice는 국전지 1연 가격)
  const costs = papers.map(p => {
    const reamPrice = p.basePrice || 0;
    // 장당 원가 = 국전가격 / 2000
    const perSheetCost = reamPrice / INDIGO_SHEETS_PER_REAM;
    // Up당 원가 계산
    if (isDoubleSided) {
      // 양면: 장당원가 / 2 / up (한 장에 양면 인쇄하므로 2로 나눔)
      return perSheetCost / 2 / up;
    } else {
      // 단면: 장당원가 / up
      return perSheetCost / up;
    }
  });

  const validCosts = costs.filter(c => c > 0);
  if (!validCosts.length) return null;

  const minCost = Math.round(Math.min(...validCosts));
  const maxCost = Math.round(Math.max(...validCosts));

  if (minCost === maxCost) return formatCurrency(minCost);
  return `${formatCurrency(minCost)}~${formatCurrency(maxCost)}`;
};

const calculateInkjetCost = (papers: Paper[], spec: Specification) => {
  if (!papers.length || !spec) return null;

  const widthInch = Number(spec.widthInch) || 0;
  const heightInch = Number(spec.heightInch) || 0;
  // 규격 면적 (sq inch)
  const specAreaSqInch = widthInch * heightInch;

  // 각 용지별 규격 원가 계산
  const costs = papers.map(p => {
    let costPerSqInch = 0;

    if (p.unitType === 'sqm') {
      // 1 sqm = 1550 sq inch (약)
      const costPerSqm = p.basePrice || 0;
      costPerSqInch = costPerSqm / 1550;
    } else if (p.unitType === 'roll') {
      // 롤 전체 가격 / 롤 전체 면적
      const rollW = Number(p.rollWidthInch) || 0;
      const rollL = (Number(p.rollLengthM) || 0) * 39.37;
      const totalArea = rollW * rollL;
      if (totalArea > 0) {
        costPerSqInch = (p.basePrice || 0) / totalArea;
      }
    } else if (p.unitType === 'sheet') {
      // 시트지: 장당 가격 / 시트 면적
      const sheetWInch = (Number(p.sheetWidthMm) || 0) / 25.4;
      const sheetHInch = (Number(p.sheetHeightMm) || 0) / 25.4;
      const sheetArea = sheetWInch * sheetHInch;
      if (sheetArea > 0) {
        costPerSqInch = (p.basePrice || 0) / sheetArea;
      }
    } else if (p.unitType === 'ream') {
      // 연당 가격: 국전지 1연 = 500장
      const REAM_TOTAL_SQ_INCH = 666150;
      costPerSqInch = (p.basePrice || 0) / REAM_TOTAL_SQ_INCH;
    } else {
      return 0;
    }

    return specAreaSqInch * costPerSqInch;
  });

  const validCosts = costs.filter(c => c > 0);
  if (!validCosts.length) return null;

  const minCost = Math.round(Math.min(...validCosts));
  const maxCost = Math.round(Math.max(...validCosts));

  if (minCost === maxCost) return formatCurrency(minCost);
  return `${formatCurrency(minCost)}~${formatCurrency(maxCost)}`;
};

// 인디고 잉크 원가 계산
// 공식: 1컬러가격 × 컬러수(4도/6도) / nup
// 양면도 잉크비는 동일 (용지만 절반, 잉크는 1면 기준)
const calculateIndigoInkCost = (ink1ColorPrice: number, colorCount: 4 | 6, up: number, isDoubleSided: boolean = false) => {
  if (!ink1ColorPrice || !up) return 0;
  // 단면/양면 모두: 잉크 원가 / up (양면은 용지가 절반이지만 잉크비는 동일)
  const baseCost = ink1ColorPrice * colorCount;
  return Math.round(baseCost / up);
};

// 인디고 총 원가 계산 (용지 + 잉크)
const calculateIndigoTotalCost = (
  papers: Paper[],
  up: number,
  isDoubleSided: boolean,
  ink1ColorPrice: number,
  colorCount: 4 | 6
) => {
  if (!papers.length) return null;

  const costs = papers.map(p => {
    const reamPrice = p.basePrice || 0;
    // 장당 원가 = 연당가격 / 2000
    const perSheetCost = reamPrice / INDIGO_SHEETS_PER_REAM;
    // 용지 원가
    let paperCost: number;
    if (isDoubleSided) {
      paperCost = perSheetCost / 2 / up;
    } else {
      paperCost = perSheetCost / up;
    }
    // 잉크 원가
    const inkCost = calculateIndigoInkCost(ink1ColorPrice, colorCount, up, isDoubleSided);
    return paperCost + inkCost;
  });

  const validCosts = costs.filter(c => c > 0);
  if (!validCosts.length) return null;

  const minCost = Math.round(Math.min(...validCosts));
  const maxCost = Math.round(Math.max(...validCosts));

  return { min: minCost, max: maxCost };
};

// 잉크젯 총 원가 계산 (용지 + 잉크)
// 잉크 원가 = 용지 원가 × 1.5
const calculateInkjetTotalCost = (papers: Paper[], spec: Specification): { paperMin: number; paperMax: number; inkMin: number; inkMax: number; totalMin: number; totalMax: number; debug?: string } | null => {
  if (!papers.length || !spec) return null;

  const widthInch = Number(spec.widthInch) || 0;
  const heightInch = Number(spec.heightInch) || 0;
  const specAreaSqInch = widthInch * heightInch;

  if (specAreaSqInch <= 0) {
    return null;
  }

  const costs = papers.map(p => {
    let costPerSqInch = 0;
    let debugInfo = '';

    // paperType이 roll이면 롤지로 판단 (unitType보다 우선)
    const isRollPaper = p.paperType === 'roll';
    const effectiveType = isRollPaper ? 'roll' : (p.unitType || 'sheet');

    if (effectiveType === 'sqm') {
      // ㎡당 가격 -> sq inch당 가격
      // 1 sqm = 1550.0031 sq inch
      const costPerSqm = p.basePrice || 0;
      costPerSqInch = costPerSqm / 1550;
      debugInfo = `sqm: ${costPerSqm}/1550=${costPerSqInch.toFixed(4)}`;
    } else if (effectiveType === 'roll') {
      // 롤 전체 가격 / 롤 전체 면적
      // rollWidthInch가 null이면 rollWidth 문자열에서 파싱 (예: "24\"" -> 24)
      let rollW = Number(p.rollWidthInch) || 0;
      if (rollW === 0 && p.rollWidth) {
        const match = String(p.rollWidth).match(/(\d+(?:\.\d+)?)/);
        if (match) rollW = parseFloat(match[1]);
      }
      // rollLengthM이 null이면 rollLength 문자열에서 파싱 (예: "30m" -> 30)
      let rollLengthM = Number(p.rollLengthM) || 0;
      if (rollLengthM === 0 && p.rollLength) {
        const match = String(p.rollLength).match(/(\d+(?:\.\d+)?)/);
        if (match) rollLengthM = parseFloat(match[1]);
      }
      // rollLengthM -> inch 변환
      const rollL = rollLengthM * 39.37;
      const totalArea = rollW * rollL;
      if (totalArea > 0) {
        costPerSqInch = (p.basePrice || 0) / totalArea;
        debugInfo = `roll: ${p.basePrice}/(${rollW}"*${rollLengthM}m=${rollL.toFixed(0)}")=${costPerSqInch.toFixed(4)}`;
      } else {
        debugInfo = `roll: 면적0 (rollW=${rollW}", rollL=${rollLengthM}m, raw: ${p.rollWidth}/${p.rollLength})`;
      }
    } else if (effectiveType === 'sheet') {
      // 시트지: 장당 가격 / 시트 면적
      // sheetWidthMm, sheetHeightMm -> inch 변환 (1 inch = 25.4mm)
      const sheetWInch = (Number(p.sheetWidthMm) || 0) / 25.4;
      const sheetHInch = (Number(p.sheetHeightMm) || 0) / 25.4;
      const sheetArea = sheetWInch * sheetHInch;
      if (sheetArea > 0) {
        costPerSqInch = (p.basePrice || 0) / sheetArea;
        debugInfo = `sheet: ${p.basePrice}/(${sheetWInch.toFixed(1)}*${sheetHInch.toFixed(1)})=${costPerSqInch.toFixed(4)}`;
      } else {
        debugInfo = `sheet: 면적0 (sheetW=${p.sheetWidthMm}mm, sheetH=${p.sheetHeightMm}mm)`;
      }
    } else if (effectiveType === 'ream') {
      // 연당 가격: 국전지 1연 = 500장, 국전지 규격 788x1091mm
      // 국전지 면적 in sq inch: (788/25.4) * (1091/25.4) = 31.02 * 42.95 = 1332.3 sq inch
      // 1연 총 면적 = 1332.3 * 500 = 666,150 sq inch
      const REAM_TOTAL_SQ_INCH = 666150;
      costPerSqInch = (p.basePrice || 0) / REAM_TOTAL_SQ_INCH;
      debugInfo = `ream: ${p.basePrice}/666150=${costPerSqInch.toFixed(6)}`;
    } else {
      debugInfo = `unknown type: ${effectiveType}`;
      return { paper: 0, ink: 0, total: 0, debug: debugInfo };
    }

    const paperCost = specAreaSqInch * costPerSqInch;
    const inkCost = paperCost * 1.5; // 잉크 원가 = 용지 원가 × 1.5

    return { paper: paperCost, ink: inkCost, total: paperCost + inkCost, debug: debugInfo };
  });

  const validCosts = costs.filter(c => c.total > 0);
  if (!validCosts.length) {
    return null;
  }

  const paperMin = Math.round(Math.min(...validCosts.map(c => c.paper)));
  const paperMax = Math.round(Math.max(...validCosts.map(c => c.paper)));
  const inkMin = Math.round(Math.min(...validCosts.map(c => c.ink)));
  const inkMax = Math.round(Math.max(...validCosts.map(c => c.ink)));
  const totalMin = Math.round(Math.min(...validCosts.map(c => c.total)));
  const totalMax = Math.round(Math.max(...validCosts.map(c => c.total)));

  return { paperMin, paperMax, inkMin, inkMax, totalMin, totalMax };
};

// 트리에서 그룹을 재귀적으로 찾는 헬퍼 함수
function findGroupInTree(groups: ProductionGroup[], id: string): ProductionGroup | null {
  for (const group of groups) {
    if (group.id === id) return group;
    if (group.children && group.children.length > 0) {
      const found = findGroupInTree(group.children, id);
      if (found) return found;
    }
  }
  return null;
}

// 트리 노드 컴포넌트
function TreeNode({
  group,
  expandedIds,
  toggleExpand,
  selectedGroupId,
  onSelectGroup,
  onMoveGroup,
  onMoveGroupTo,
  level = 0,
}: {
  group: ProductionGroup;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  selectedGroupId: string | null;
  onSelectGroup: (group: ProductionGroup) => void;
  onMoveGroup: (id: string, direction: "up" | "down") => void;
  onMoveGroupTo?: (group: ProductionGroup) => void;
  level?: number;
}) {
  const isExpanded = expandedIds.has(group.id);
  const hasChildren = group.children && group.children.length > 0;
  const hasSettings = group.settings && group.settings.length > 0;
  const isSelected = selectedGroupId === group.id;
  const depth = group.depth || 1;
  const isLeaf = depth === 3; // 소분류 (설정 가능한 최하위)
  const settingsCount = group.settings?.length || 0;

  // 뱃지 스타일 및 라벨
  const getDepthLabel = () => {
    if (depth === 1) return "대분류";
    if (depth === 2) return "중분류";
    return "소분류";
  };

  const getBadgeStyle = () => {
    if (depth === 1) return "bg-indigo-600 text-white shadow-sm";
    if (depth === 2) return "bg-violet-100 text-violet-600 border border-violet-200";
    return "bg-slate-100 text-slate-500 border border-slate-200";
  };

  return (
    <div className="relative">
      {/* 계층 구조 연결선 (소분류일 경우) */}
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
        style={{ marginLeft: `${level * 24}px` }} // 들여쓰기 증가
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

            {/* 뱃지 */}
            {/* 뱃지 제거됨 */}
          </div>

          {/* 하단 메타 정보 (설정 개수 등 - 소분류만) */}
          {isLeaf && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Settings2 className="w-2.5 h-2.5" />
                {settingsCount}개 설정
              </span>
            </div>
          )}
        </div>

        {/* 순서 이동 버튼 (대분류는 항상 표시, 나머지는 호버 시 표시) */}
        <div className={cn(
          "flex flex-col gap-0.5 transition-opacity ml-2",
          depth === 1 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <button
            className={cn(
              "p-1 rounded-sm transition-colors",
              depth === 1
                ? "hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600"
                : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onMoveGroup(group.id, "up");
            }}
            title="위로 이동"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            className={cn(
              "p-1 rounded-sm transition-colors",
              depth === 1
                ? "hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600"
                : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onMoveGroup(group.id, "down");
            }}
            title="아래로 이동"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          {onMoveGroupTo && !isProtectedGroup(group.name) && (
            <button
              className={cn(
                "p-1 rounded-sm transition-colors",
                depth === 1
                  ? "hover:bg-orange-100 text-orange-400 hover:text-orange-600"
                  : "hover:bg-orange-50 text-gray-400 hover:text-orange-500"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onMoveGroupTo(group);
              }}
              title="다른 그룹으로 이동"
            >
              <FolderInput className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 하위 그룹 */}
      {isExpanded && hasChildren && (
        <div className="mt-0.5 relative">

          {group.children?.map((child) => (
            <TreeNode
              key={child.id}
              group={child}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              selectedGroupId={selectedGroupId}
              onSelectGroup={onSelectGroup}
              onMoveGroup={onMoveGroup}
              onMoveGroupTo={onMoveGroupTo}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 이동 대상 트리 컴포넌트
function MoveTargetTree({
  groups,
  moveType,
  movingItemId,
  movingGroupDepth,
  selectedTargetId,
  onSelectTarget,
}: {
  groups: ProductionGroup[];
  moveType: "group" | "setting";
  movingItemId: string;
  movingGroupDepth?: number;
  selectedTargetId: string | null;
  onSelectTarget: (id: string) => void;
}) {
  // 이동 중인 그룹의 모든 하위 ID 수집 (순환참조 방지)
  const getDescendantIds = (group: ProductionGroup): Set<string> => {
    const ids = new Set<string>();
    ids.add(group.id);
    group.children?.forEach((child) => {
      getDescendantIds(child).forEach((id) => ids.add(id));
    });
    return ids;
  };

  // 이동 중인 그룹 찾기
  const findGroup = (groups: ProductionGroup[], id: string): ProductionGroup | null => {
    for (const g of groups) {
      if (g.id === id) return g;
      if (g.children) {
        const found = findGroup(g.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const movingGroup = moveType === "group" ? findGroup(groups, movingItemId) : null;
  const excludeIds = movingGroup ? getDescendantIds(movingGroup) : new Set<string>();

  const renderNode = (group: ProductionGroup, level: number = 0) => {
    const isSelf = excludeIds.has(group.id);
    const isCurrentParent = moveType === "setting" && group.id === movingItemId;
    const isProtected = PROTECTED_GROUP_NAMES.includes(group.name);
    const hasChildren = group.children && group.children.length > 0;

    let isValidTarget = false;
    if (moveType === "setting") {
      // 설정: leaf 그룹(하위 없음)만 가능, 현재 소속 그룹 제외
      isValidTarget = !hasChildren && !isCurrentParent && !isProtected;
    } else {
      // 그룹: 새 부모의 depth가 movingGroupDepth - 1 이어야 함
      if (movingGroupDepth !== undefined) {
        isValidTarget = group.depth === movingGroupDepth - 1 && !isSelf && !isProtected;
      }
    }

    const isSelected = group.id === selectedTargetId;

    return (
      <div key={group.id}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            isSelf && "opacity-40 cursor-not-allowed",
            isCurrentParent && "opacity-40 cursor-not-allowed",
            isSelected && "bg-indigo-100 border border-indigo-300 font-medium",
            isValidTarget && !isSelected && "hover:bg-gray-100 cursor-pointer",
            !isValidTarget && !isSelf && !isCurrentParent && "opacity-50 cursor-not-allowed",
          )}
          style={{ paddingLeft: level * 20 + 12 }}
          onClick={() => {
            if (isValidTarget) onSelectTarget(group.id);
          }}
        >
          {hasChildren ? (
            <FolderOpen className="w-4 h-4 text-gray-400 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-gray-400 shrink-0" />
          )}
          <span className="truncate">{group.name}</span>
          {group.code && (
            <span className="text-xs text-gray-400 shrink-0">({group.code})</span>
          )}
          {isCurrentParent && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">현재</Badge>
          )}
          {isSelf && moveType === "group" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">이동 대상</Badge>
          )}
        </div>
        {group.children?.map((child) => renderNode(child, level + 1))}
      </div>
    );
  };

  return <div className="space-y-0.5">{groups.map((g) => renderNode(g, 0))}</div>;
}

// 설정 카드 컴포넌트
const SettingCard = ({
  setting,
  onEdit,
  onDelete,
  onMove,
  onMoveTo,
}: {
  setting: ProductionSetting;
  onEdit: (setting: ProductionSetting) => void;
  onDelete: (setting: ProductionSetting) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onMoveTo?: (setting: ProductionSetting) => void;
}) => {
  // prices 배열에서 가격 정보 추출
  const prices = (setting as any).prices || [];
  const printMethod = (setting as any).printMethod;

  // 인디고 Up별 가격 (minQuantity로 구분) - 4도/6도 칼라 구분
  const indigoUpPrices = [1, 2, 4, 8].map(up => {
    const priceRecord = prices.find((p: any) => p.minQuantity === up);
    return {
      up,
      fourColorSinglePrice: priceRecord?.fourColorSinglePrice ? Number(priceRecord.fourColorSinglePrice) : 0,
      fourColorDoublePrice: priceRecord?.fourColorDoublePrice ? Number(priceRecord.fourColorDoublePrice) : 0,
      sixColorSinglePrice: priceRecord?.sixColorSinglePrice ? Number(priceRecord.sixColorSinglePrice) : 0,
      sixColorDoublePrice: priceRecord?.sixColorDoublePrice ? Number(priceRecord.sixColorDoublePrice) : 0,
    };
  });

  // 잉크젯 규격별 가격 (specificationId로 구분)
  const inkjetSpecPrices = prices
    .filter((p: any) => p.specificationId)
    .map((p: any) => ({
      specificationId: p.specificationId,
      price: Number(p.price) || 0,
    }));

  // 가격 표시 여부 확인
  const hasIndigoPrices = setting.pricingType === "paper_output_spec" && printMethod === "indigo" && indigoUpPrices.some(p => p.fourColorSinglePrice > 0 || p.sixColorSinglePrice > 0);
  const hasInkjetPrices = setting.pricingType === "paper_output_spec" && printMethod === "inkjet" && inkjetSpecPrices.length > 0;

  return (
    <div className="group border rounded-lg p-4 mb-3 bg-white hover:shadow-sm transition-shadow">
      <div className="flex gap-4 items-start justify-between">
        {/* 좌측: 메인 콘텐츠 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            {/* 세팅명 (가장 강조) */}
            <span className="text-base font-bold text-gray-900">
              {setting.settingName || setting.codeName || "설정"}
            </span>

            {/* 적용단위 */}
            <Badge variant="outline" className="text-xs font-normal text-gray-600 bg-gray-50">
              {PRICING_TYPE_LABELS[setting.pricingType] || setting.pricingType}
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
              <span className="font-mono font-medium text-gray-900">{Number(setting.workDays)}일</span>
            </div>
          </div>

          {/* 인디고 Up별 가격 테이블 (4도칼라/6도칼라 구분) */}
          {hasIndigoPrices && (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-xs text-right whitespace-nowrap">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100">
                    <th className="px-2 py-1.5 text-left font-medium w-24">구분</th>
                    {indigoUpPrices.map((p) => (
                      <th key={p.up} className="px-2 py-1.5 font-medium">{p.up}up</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {/* 4도칼라 */}
                  <tr className="group/row hover:bg-gray-50">
                    <td className="px-2 py-1.5 text-left">
                      <span className="font-semibold text-blue-600 mr-1.5">4도</span>
                      <span className="text-gray-600">단면</span>
                    </td>
                    {indigoUpPrices.map((p) => (
                      <td key={p.up} className="px-2 py-1.5 font-mono text-gray-900">
                        {p.fourColorSinglePrice > 0 ? p.fourColorSinglePrice.toLocaleString() : "-"}
                      </td>
                    ))}
                  </tr>
                  <tr className="group/row hover:bg-gray-50">
                    <td className="px-2 py-1.5 text-left">
                      <span className="font-semibold text-blue-600 mr-1.5">4도</span>
                      <span className="text-gray-600">양면</span>
                    </td>
                    {indigoUpPrices.map((p) => (
                      <td key={p.up} className="px-2 py-1.5 font-mono text-gray-900">
                        {p.fourColorDoublePrice > 0 ? p.fourColorDoublePrice.toLocaleString() : "-"}
                      </td>
                    ))}
                  </tr>
                  {/* 6도칼라 */}
                  <tr className="group/row hover:bg-gray-50">
                    <td className="px-2 py-1.5 text-left">
                      <span className="font-semibold text-purple-600 mr-1.5">6도</span>
                      <span className="text-gray-600">단면</span>
                    </td>
                    {indigoUpPrices.map((p) => (
                      <td key={p.up} className="px-2 py-1.5 font-mono text-gray-900">
                        {p.sixColorSinglePrice > 0 ? p.sixColorSinglePrice.toLocaleString() : "-"}
                      </td>
                    ))}
                  </tr>
                  <tr className="group/row hover:bg-gray-50">
                    <td className="px-2 py-1.5 text-left">
                      <span className="font-semibold text-purple-600 mr-1.5">6도</span>
                      <span className="text-gray-600">양면</span>
                    </td>
                    {indigoUpPrices.map((p) => (
                      <td key={p.up} className="px-2 py-1.5 font-mono text-gray-900">
                        {p.sixColorDoublePrice > 0 ? p.sixColorDoublePrice.toLocaleString() : "-"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 잉크젯 규격별 가격 */}
          {hasInkjetPrices && setting.specifications && (
            <div className="mt-2 overflow-x-auto">
              <table className="text-xs border-collapse">
                <thead>
                  <tr className="text-gray-500">
                    <th className="px-2 py-1 text-center font-medium">규격</th>
                    {setting.specifications.slice(0, 8).map(spec => (
                      <th key={spec.id} className="px-2 py-1 text-center font-medium font-mono">
                        {spec.specification?.name}
                      </th>
                    ))}
                    {setting.specifications.length > 8 && (
                      <th className="px-2 py-1 text-center text-gray-400">+{setting.specifications.length - 8}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-1 text-gray-500">단가</td>
                    {setting.specifications.slice(0, 8).map(spec => {
                      const priceData = inkjetSpecPrices.find((p: any) => p.specificationId === spec.specificationId);
                      return (
                        <td key={spec.id} className="px-2 py-1 text-center font-mono text-gray-900">
                          {priceData?.price > 0 ? priceData.price.toLocaleString() : "-"}
                        </td>
                      );
                    })}
                    {setting.specifications.length > 8 && <td className="px-2 py-1"></td>}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 규격 목록 (가격 정보가 없는 경우에만 표시) */}
          {!hasIndigoPrices && !hasInkjetPrices && setting.specifications && setting.specifications.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {setting.specifications.slice(0, 8).map((spec) => (
                <span
                  key={spec.id}
                  className="inline-flex px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-700 rounded"
                >
                  {spec.specification?.name}
                </span>
              ))}
              {setting.specifications.length > 8 && (
                <span className="inline-flex px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                  +{setting.specifications.length - 8}개
                </span>
              )}
            </div>
          )}
        </div>

        {/* 우측: 액션 버튼 */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-gray-600"
            onClick={() => onMove(setting.id, "up")}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-gray-600"
            onClick={() => onMove(setting.id, "down")}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          {onMoveTo && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-orange-600"
              onClick={() => onMoveTo(setting)}
              title="다른 그룹으로 이동"
            >
              <FolderInput className="h-4 w-4" />
            </Button>
          )}
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-indigo-600"
            onClick={() => onEdit(setting)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-red-600"
            onClick={() => onDelete(setting)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProductionSettingPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<ProductionGroup | null>(null);

  // 클라이언트 마운트 체크 (hydration 오류 방지)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 다이얼로그 상태
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isSettingDialogOpen, setIsSettingDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProductionGroup | null>(null);
  const [editingSetting, setEditingSetting] = useState<ProductionSetting | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: "group" | "setting"; item: any } | null>(null);
  const [parentGroupId, setParentGroupId] = useState<string | null>(null);

  // 이동 다이얼로그 상태
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{
    type: "group" | "setting";
    item: ProductionGroup | ProductionSetting;
  } | null>(null);
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState<string | null>(null);

  // 규격선택 펼치기 상태
  const [isSpecSelectorExpanded, setIsSpecSelectorExpanded] = useState(false);

  // 단가 조정 다이얼로그 상태
  const [isPriceAdjustDialogOpen, setIsPriceAdjustDialogOpen] = useState(false);
  const [priceAdjustTarget, setPriceAdjustTarget] = useState<"single" | "double">("single"); // 단면/양면
  const [priceAdjustRanges, setPriceAdjustRanges] = useState([
    { maxPrice: 500, adjustment: 10 },
    { maxPrice: 1000, adjustment: 50 },
    { maxPrice: Infinity, adjustment: 100 },
  ]);

  // 폼 상태
  const [groupForm, setGroupForm] = useState({
    code: "",
    name: "",
  });
  // 인디고 Up 단위 (1up만 사용)
  const INDIGO_UP_UNITS = [1] as const;

  // 인디고 기본 가중치 (기본값 1)
  const DEFAULT_INDIGO_WEIGHTS: Record<number, number> = {
    1: 1.0,    // 1up 기준
  };

  const [settingForm, setSettingForm] = useState({
    codeName: "",
    vendorType: "in_house" as string,
    pricingType: "paper_output_spec" as PricingType,
    settingName: "",
    sCode: "",
    settingFee: 0,
    basePrice: 0,
    workDays: 0,
    weightInfo: "",
    specificationIds: [] as string[],
    specUsageType: "all" as "indigo" | "inkjet" | "album" | "frame" | "booklet" | "all",
    // 용지별출력단가 전용 필드
    printMethod: "indigo" as "indigo" | "inkjet" | "album" | "frame" | "booklet",
    paperIds: [] as string[],
    singleSidedPrice: 0,
    doubleSidedPrice: 0,
    // 인디고 Up별 가격 (paper_output_spec용) - 1,2,4,8up, 4도칼라/6도칼라 구분
    indigoUpPrices: INDIGO_UP_UNITS.map((up) => ({
      up,
      weight: DEFAULT_INDIGO_WEIGHTS[up],
      // 4도칼라
      fourColorSinglePrice: 0,
      fourColorDoublePrice: 0,
      // 6도칼라
      sixColorSinglePrice: 0,
      sixColorDoublePrice: 0,
    })),
    // 잉크젯 기본 설정 (paper_output_spec용)
    inkjetBaseSpecId: "", // 기준규격 ID (사용안함, 호환용)
    inkjetBasePrice: 0, // sq inch당 기준가격
    inkjetWeightPerSqm: 0, // 사용안함 (호환용)
    // 잉크젯 규격별 가격 (자동 계산됨)
    inkjetSpecPrices: [] as { specificationId: string; singleSidedPrice: number; weight: number }[],
    // 용지 단가 그룹 (사용자 정의 그룹, 최대 5개)
    priceGroups: [] as Array<{
      id: string;
      color: 'green' | 'blue' | 'yellow' | 'red' | 'purple';
      // 인디고용: Up별 가격 (1up 기준가 입력 시 가중치로 자동 계산)
      upPrices: Array<{
        up: number;
        weight: number;
        fourColorSinglePrice: number;
        fourColorDoublePrice: number;
        sixColorSinglePrice: number;
        sixColorDoublePrice: number;
      }>;
      // 잉크젯용: 규격별 가격
      specPrices?: Array<{
        specificationId: string;
        singleSidedPrice: number;
        weight: number;
      }>;
      // 잉크젯 기준규격 ID (그룹별)
      inkjetBaseSpecId?: string;
      // sq inch당 기준가격
      inkjetBasePrice?: number;
      // 단가 입력 방식 (spec: 기준규격단가, sqinch: sq" 단가)
      pricingMode?: 'spec' | 'sqinch';
    }>,
    // 용지별 단가그룹 할당 (paperId -> priceGroupId, null이면 미지정)
    paperPriceGroupMap: {} as Record<string, string | null>,
    // [제본전용] 구간별 Nup/1p가격 필드
    nupPageRanges: [] as Array<{
      specificationId: string;  // 규격 ID (Nup 정보 연동)
      pricePerPage: number;     // 1p당 추가 가격 (예: 500원)
      rangePrices: Record<number, number>;  // 구간별 가격 {20: 35000, 30: 40000, ...}
    }>,
    // 페이지 구간 설정 (전역)
    pageRanges: [20, 30, 40, 50, 60] as number[],
    // [후가공전용] 길이별단가 필드
    lengthUnit: 'cm' as 'cm' | 'mm',  // 길이 단위
    lengthPriceRanges: [] as Array<{
      minLength: number;  // 시작 길이
      maxLength: number;  // 끝 길이
      price: number;      // 해당 구간 단가
    }>,
    // [후가공전용] 면적별단가 필드
    areaUnit: 'mm' as 'mm' | 'cm' | 'm',  // 길이 단위 (가로×세로)
    areaPriceRanges: [] as Array<{
      maxWidth: number;   // 최대 가로
      maxHeight: number;  // 최대 세로
      area: number;       // 면적 (가로×세로, 자동계산)
      price: number;      // 해당 구간 단가
    }>,
    // [배송비 전용] 필드
    surchargeType: 'none' as SurchargeType,  // 할증조건
    distancePriceRanges: [] as Array<{
      minDistance: number;  // 시작 거리 (km)
      maxDistance: number;  // 종료 거리 (km)
      price: number;        // 단가
    }>,
    extraPricePerKm: 0,     // km당 추가요금
    maxBaseDistance: 20,    // 기본요금 적용 최대거리 (km)
    freeThreshold: 50000,   // 무료배송 기준금액 (택배용)
    islandFee: 3000,        // 도서산간 추가요금 (택배용)
    // 배송비 시뮬레이션용
    simDistance: 10,        // 시뮬레이션 거리
    simIsNight: false,      // 야간 여부
    simIsWeekend: false,    // 주말 여부
    simOrderAmount: 30000,  // 주문금액 (택배용)
    simIsIsland: false,     // 도서산간 여부
  });

  // 시스템 설정 (인디고 잉크 원가용)
  const { data: systemSettings } = useSystemSettings("printing");
  const settingsMap = useMemo(() => systemSettings ? settingsToMap(systemSettings) : {}, [systemSettings]);
  const indigoInk1ColorCost = useMemo(() => getNumericValue(settingsMap, "printing_indigo_1color_cost", 0), [settingsMap]);

  // 용지별출력단가용 용지 목록
  const { data: papersForPricing } = usePapersByPrintMethod(
    settingForm.pricingType === "paper_output_spec"
      ? settingForm.printMethod
      : ""
  );

  // API 호출
  const router = useRouter();
  const { data: groupTree, isLoading: isLoadingGroups } = useProductionGroupTree();
  const { data: specifications } = useSpecifications();
  const { data: pricingTypes } = usePricingTypes();
  const { data: clientGroupsData } = useClientGroups({ limit: 100 });

  const createGroupMutation = useCreateProductionGroup();
  const updateGroupMutation = useUpdateProductionGroup();
  const deleteGroupMutation = useDeleteProductionGroup();
  const moveGroupMutation = useMoveProductionGroup();

  const createSettingMutation = useCreateProductionSetting();
  const updateSettingMutation = useUpdateProductionSetting();
  const deleteSettingMutation = useDeleteProductionSetting();
  const moveSettingMutation = useMoveProductionSetting();
  const moveGroupToMutation = useMoveProductionGroupTo();
  const moveSettingToMutation = useMoveProductionSettingTo();

  // groupTree가 변경될 때 selectedGroup을 동기화 (삭제 후 최신 데이터 반영)
  useEffect(() => {
    if (selectedGroup && groupTree) {
      const updatedGroup = findGroupInTree(groupTree, selectedGroup.id);
      if (updatedGroup) {
        // 설정 목록이 변경된 경우에만 업데이트
        if (JSON.stringify(updatedGroup.settings) !== JSON.stringify(selectedGroup.settings)) {
          setSelectedGroup(updatedGroup);
        }
      } else {
        // 그룹이 삭제된 경우
        setSelectedGroup(null);
      }
    }
  }, [groupTree]);

  // 그룹 다이얼로그 제목/설명용 부모 그룹 depth 캐싱
  const parentGroupDepth = useMemo(() => {
    if (!parentGroupId || !groupTree) return null;
    const parentGroup = findGroupInTree(groupTree, parentGroupId);
    return parentGroup?.depth ?? null;
  }, [parentGroupId, groupTree]);

  // 선택된 그룹의 설정 목록
  const selectedSettings = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.settings || [];
  }, [selectedGroup]);

  // 범위의 시작 가격 계산 (첫 번째는 0, 나머지는 이전 maxPrice + 1)
  const getRangeMinPrice = (index: number): number => {
    if (index === 0) return 0;
    return priceAdjustRanges[index - 1].maxPrice + 1;
  };

  // 단가 조정 적용 함수
  const applyPriceAdjustment = () => {
    // 현재 ranges 스냅샷 저장
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
      return currentRanges[currentRanges.length - 1]; // 마지막 범위 반환
    };

    // 단위로 반올림하는 함수
    const roundToUnit = (price: number, unit: number): number => {
      if (unit <= 0) return price;
      return Math.round(price / unit) * unit;
    };

    setSettingForm((prev) => {
      let adjustedCount = 0;

      const adjustPrice = (price: number) => {
        const numPrice = Number(price);
        if (!numPrice || numPrice <= 0) return 0; // 0원 이하는 0원으로

        const range = findRange(numPrice);
        // 범위가 없으면 그대로 반환
        if (!range) return numPrice;

        // 반올림 단위로 반올림
        const roundingUnit = Number(range.adjustment) || 10;
        const finalPrice = roundToUnit(numPrice, roundingUnit);

        if (finalPrice !== numPrice) {
        }

        return Math.max(0, finalPrice);
      };

      // 인디고 Up별 가격 조정 (단면/양면 모두)
      const newIndigoUpPrices = prev.indigoUpPrices.map((upPrice, idx) => {
        const newUpPrice = { ...upPrice };
        let hasChange = false;

        // 4도칼라 단면 조정
        const original4Single = Number(upPrice.fourColorSinglePrice) || 0;
        const adjusted4Single = adjustPrice(original4Single);
        if (adjusted4Single !== original4Single) {
          newUpPrice.fourColorSinglePrice = adjusted4Single;
          hasChange = true;
        }

        // 4도칼라 양면 조정
        const original4Double = Number(upPrice.fourColorDoublePrice) || 0;
        const adjusted4Double = adjustPrice(original4Double);
        if (adjusted4Double !== original4Double) {
          newUpPrice.fourColorDoublePrice = adjusted4Double;
          hasChange = true;
        }

        // 6도칼라 단면 조정
        const original6Single = Number(upPrice.sixColorSinglePrice) || 0;
        const adjusted6Single = adjustPrice(original6Single);
        if (adjusted6Single !== original6Single) {
          newUpPrice.sixColorSinglePrice = adjusted6Single;
          hasChange = true;
        }

        // 6도칼라 양면 조정
        const original6Double = Number(upPrice.sixColorDoublePrice) || 0;
        const adjusted6Double = adjustPrice(original6Double);
        if (adjusted6Double !== original6Double) {
          newUpPrice.sixColorDoublePrice = adjusted6Double;
          hasChange = true;
        }

        if (hasChange) adjustedCount++;
        return newUpPrice;
      });

      // 잉크젯 규격별 가격 조정
      const newInkjetSpecPrices = prev.inkjetSpecPrices.map((specPrice) => {
        const price = specPrice.singleSidedPrice;
        const newPrice = adjustPrice(price);

        if (newPrice !== price) adjustedCount++;

        return { ...specPrice, singleSidedPrice: newPrice };
      });

      // 인디고 단가 그룹(priceGroups) 가격 조정
      const newPriceGroups = prev.priceGroups.map((group) => {
        // 인디고 Up별 가격 조정
        const newUpPrices = (group.upPrices || []).map((upPrice) => {
          const newUpPrice = { ...upPrice };

          // 4도 단면 조정
          const orig4S = Number(upPrice.fourColorSinglePrice) || 0;
          const adj4S = adjustPrice(orig4S);
          if (adj4S !== orig4S) {
            newUpPrice.fourColorSinglePrice = adj4S;
            adjustedCount++;
          }

          // 4도 양면 조정
          const orig4D = Number(upPrice.fourColorDoublePrice) || 0;
          const adj4D = adjustPrice(orig4D);
          if (adj4D !== orig4D) {
            newUpPrice.fourColorDoublePrice = adj4D;
            adjustedCount++;
          }

          // 6도 단면 조정
          const orig6S = Number(upPrice.sixColorSinglePrice) || 0;
          const adj6S = adjustPrice(orig6S);
          if (adj6S !== orig6S) {
            newUpPrice.sixColorSinglePrice = adj6S;
            adjustedCount++;
          }

          // 6도 양면 조정
          const orig6D = Number(upPrice.sixColorDoublePrice) || 0;
          const adj6D = adjustPrice(orig6D);
          if (adj6D !== orig6D) {
            newUpPrice.sixColorDoublePrice = adj6D;
            adjustedCount++;
          }

          return newUpPrice;
        });

        // 잉크젯 규격별 가격 조정 (specPrices)
        const newSpecPrices = (group.specPrices || []).map((specPrice) => {
          const origPrice = Number(specPrice.singleSidedPrice) || 0;
          const adjPrice = adjustPrice(origPrice);
          if (adjPrice !== origPrice) {
            adjustedCount++;
            return { ...specPrice, singleSidedPrice: adjPrice };
          }
          return specPrice;
        });

        return { ...group, upPrices: newUpPrices, specPrices: newSpecPrices };
      });

      // toast를 setState 외부에서 호출하기 위해 setTimeout 사용
      setTimeout(() => {
        if (adjustedCount > 0) {
          toast({ title: `단가가 조정되었습니다. (${adjustedCount}건)` });
        } else {
          toast({ title: "조정된 단가가 없습니다." });
        }
      }, 0);

      return {
        ...prev,
        indigoUpPrices: newIndigoUpPrices,
        inkjetSpecPrices: newInkjetSpecPrices,
        priceGroups: newPriceGroups,
      };
    });

    setIsPriceAdjustDialogOpen(false);
  };

  // 단가 조정 초기화
  const resetPriceAdjustment = () => {
    setPriceAdjustRanges([
      { maxPrice: 10000, adjustment: 10 },
    ]);
  };

  // 구간 추가
  const addPriceAdjustRange = () => {
    const lastRange = priceAdjustRanges[priceAdjustRanges.length - 1];
    const newMaxPrice = lastRange.maxPrice + 10000;
    // 이전 구간의 반올림 단위를 10배로 증가 (10 -> 100 -> 1000)
    const newAdjustment = Math.min((lastRange.adjustment || 10) * 10, 1000);
    setPriceAdjustRanges([
      ...priceAdjustRanges,
      { maxPrice: newMaxPrice, adjustment: newAdjustment }
    ]);
  };

  // 구간 삭제
  const removePriceAdjustRange = (index: number) => {
    if (priceAdjustRanges.length <= 1) return; // 최소 1개는 유지
    setPriceAdjustRanges(priceAdjustRanges.filter((_, i) => i !== index));
  };

  // 인디고 Up별 가격 재계산 (1up 기준가 / nup × 가중치) - 4도/6도 모두 계산
  const recalculateIndigoPrices = () => {
    setSettingForm((prev) => {
      const basePrice = prev.indigoUpPrices[0]; // 1up 기준가
      const newPrices = prev.indigoUpPrices.map((upPrice) => {
        // 계산식: (1up 기준가 / nup) × 가중치
        const nup = upPrice.up;
        return {
          ...upPrice,
          // 4도칼라
          fourColorSinglePrice: Math.round((basePrice.fourColorSinglePrice / nup) * upPrice.weight),
          fourColorDoublePrice: Math.round((basePrice.fourColorDoublePrice / nup) * upPrice.weight),
          // 6도칼라
          sixColorSinglePrice: Math.round((basePrice.sixColorSinglePrice / nup) * upPrice.weight),
          sixColorDoublePrice: Math.round((basePrice.sixColorDoublePrice / nup) * upPrice.weight),
        };
      });
      return { ...prev, indigoUpPrices: newPrices };
    });
    toast({ title: "가격이 재계산되었습니다." });
  };

  // 핸들러 함수들
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // 아코디언 효과: 최상위 그룹을 펼칠 때 다른 최상위 그룹은 접음
        const isTopLevel = groupTree?.some(g => g.id === id);
        if (isTopLevel) {
          groupTree?.forEach(g => {
            if (g.id !== id && next.has(g.id)) {
              next.delete(g.id);
            }
          });
        }
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (groupTree) {
      const allIds = groupTree.map((g) => g.id);
      setExpandedIds(new Set(allIds));
    }
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleSelectGroup = (group: ProductionGroup) => {
    setSelectedGroup(group);
  };

  // 그룹 관련 핸들러
  const handleOpenGroupDialog = (parentId: string | null = null, group?: ProductionGroup) => {
    setParentGroupId(parentId);
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        code: group.code,
        name: group.name,
      });
    } else {
      setEditingGroup(null);
      setGroupForm({
        code: "",
        name: "",
      });
    }
    setIsGroupDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    try {
      if (editingGroup) {
        await updateGroupMutation.mutateAsync({
          id: editingGroup.id,
          ...groupForm,
        });
        toast({ title: "그룹이 수정되었습니다." });
      } else {
        await createGroupMutation.mutateAsync({
          ...groupForm,
          parentId: parentGroupId || undefined,
        });
        toast({ title: "그룹이 생성되었습니다." });
      }
      setIsGroupDialogOpen(false);
    } catch (error: any) {
      toast({ title: "오류 발생", description: error.message || "오류가 발생했습니다.", variant: "destructive" });
    }
  };

  // 설정 관련 핸들러
  const handleOpenSettingDialog = (setting?: ProductionSetting) => {
    if (!selectedGroup) {
      toast({ title: "그룹을 먼저 선택해주세요.", variant: "destructive" });
      return;
    }

    if (setting) {
      setEditingSetting(setting);

      // prices 배열에서 인디고 Up별 가격 변환 (4도칼라/6도칼라 구분)
      const prices = (setting as any).prices || [];
      const indigoUpPricesFromDB = INDIGO_UP_UNITS.map((up) => {
        const priceRecord = prices.find((p: any) => p.minQuantity === up);
        return {
          up,
          weight: priceRecord?.weight ? Number(priceRecord.weight) : DEFAULT_INDIGO_WEIGHTS[up],
          // 4도칼라 가격
          fourColorSinglePrice: priceRecord?.fourColorSinglePrice ? Number(priceRecord.fourColorSinglePrice) : 0,
          fourColorDoublePrice: priceRecord?.fourColorDoublePrice ? Number(priceRecord.fourColorDoublePrice) : 0,
          // 6도칼라 가격
          sixColorSinglePrice: priceRecord?.sixColorSinglePrice ? Number(priceRecord.sixColorSinglePrice) : 0,
          sixColorDoublePrice: priceRecord?.sixColorDoublePrice ? Number(priceRecord.sixColorDoublePrice) : 0,
        };
      });

      // prices 배열에서 잉크젯 규격별 가격 변환
      const inkjetSpecPricesFromDB = prices
        .filter((p: any) => p.specificationId)
        .map((p: any) => ({
          specificationId: p.specificationId,
          singleSidedPrice: Number(p.singleSidedPrice) || Number(p.price) || 0,
          weight: p.weight ? Number(p.weight) : 1,
        }));

      // prices 배열에서 구간별 Nup/1p가격 변환 (nup_page_range, finishing_spec_nup용)
      const nupPageRangesFromDB = (setting.pricingType === "nup_page_range" || setting.pricingType === "finishing_spec_nup")
        ? prices
          .filter((p: any) => p.specificationId)
          .map((p: any) => {
            // DB에서 string 키로 저장된 rangePrices를 number 키로 변환
            const rangePrices: Record<number, number> = {};
            if (p.rangePrices && typeof p.rangePrices === 'object') {
              Object.entries(p.rangePrices).forEach(([key, value]) => {
                rangePrices[Number(key)] = Number(value);
              });
            }
            return {
              specificationId: p.specificationId,
              pricePerPage: Number(p.pricePerPage) || 0,
              rangePrices,
            };
          })
        : [];

      // 페이지 구간 설정 로드
      const pageRangesFromDB = (setting as any).pageRanges || [20, 30, 40, 50, 60];

      // priceGroups에서 규격 ID 추출 (잉크젯용)
      const priceGroupsFromDB = (setting as any).priceGroups || [];
      const specIdsFromPriceGroups = new Set<string>();
      priceGroupsFromDB.forEach((group: any) => {
        if (group.specPrices && Array.isArray(group.specPrices)) {
          group.specPrices.forEach((sp: any) => {
            if (sp.specificationId) {
              specIdsFromPriceGroups.add(sp.specificationId);
            }
          });
        }
      });

      // 규격 ID: 기존 specifications 또는 priceGroups에서 추출
      const specIdsFromDB = setting.specifications?.map((s) => s.specificationId) || [];
      const allSpecIds = specIdsFromDB.length > 0 ? specIdsFromDB : Array.from(specIdsFromPriceGroups);

      setSettingForm({
        codeName: setting.codeName || "",
        vendorType: setting.vendorType,
        pricingType: setting.pricingType,
        settingName: setting.settingName || "",
        sCode: setting.sCode || "",
        settingFee: Number(setting.settingFee),
        basePrice: Number(setting.basePrice),
        workDays: Number(setting.workDays),
        weightInfo: setting.weightInfo || "",
        specificationIds: allSpecIds,
        specUsageType: (setting as any).specUsageType || "all",
        printMethod: (setting as any).printMethod || "indigo",
        paperIds: (setting as any).paperIds || [],
        singleSidedPrice: Number(setting.singleSidedPrice) || 0,
        doubleSidedPrice: Number(setting.doubleSidedPrice) || 0,
        indigoUpPrices: indigoUpPricesFromDB,
        inkjetBaseSpecId: (setting as any).baseSpecificationId || (setting as any).inkjetBaseSpecId || "",
        inkjetBasePrice: Number((setting as any).basePricePerSqInch) || (setting as any).inkjetBasePrice || 0,
        inkjetWeightPerSqm: (setting as any).inkjetWeightPerSqm || 0,
        inkjetSpecPrices: inkjetSpecPricesFromDB.length > 0 ? inkjetSpecPricesFromDB : [],
        priceGroups: ((setting as any).priceGroups || []).map((g: any) => ({
          ...g,
          pricingMode: g.pricingMode || 'spec',
        })),
        paperPriceGroupMap: (setting as any).paperPriceGroupMap || {},
        nupPageRanges: nupPageRangesFromDB,
        pageRanges: pageRangesFromDB,
        lengthUnit: (setting as any).lengthUnit || 'cm',
        lengthPriceRanges: (setting as any).lengthPriceRanges || [],
        areaUnit: (setting as any).areaUnit || 'mm',
        areaPriceRanges: (setting as any).areaPriceRanges || [],
        // 배송비 관련 필드
        surchargeType: (setting as any).surchargeType || 'none',
        distancePriceRanges: (setting as any).distancePriceRanges || [],
        extraPricePerKm: Number((setting as any).extraPricePerKm) || 0,
        maxBaseDistance: Number((setting as any).maxBaseDistance) || 0,
        freeThreshold: Number((setting as any).freeThreshold) || 50000,
        islandFee: Number((setting as any).islandFee) || 3000,
        // 배송비 시뮬레이션용
        simDistance: 10,
        simIsNight: false,
        simIsWeekend: false,
        simOrderAmount: 30000,
        simIsIsland: false,
      });
    } else {
      setEditingSetting(null);
      // 코드명 자동 생성: 그룹코드_순번
      const nextNumber = (selectedGroup?.settings?.length || 0) + 1;
      const autoCodeName = `${selectedGroup?.code || 'SET'}_${String(nextNumber).padStart(3, '0')}`;
      setSettingForm({
        codeName: autoCodeName,
        vendorType: "in_house",
        pricingType: "paper_output_spec",
        settingName: "",
        sCode: "",
        settingFee: 0,
        basePrice: 0,
        workDays: 0,
        weightInfo: "",
        specificationIds: [],
        specUsageType: "all",
        printMethod: "indigo",
        paperIds: [],
        singleSidedPrice: 0,
        doubleSidedPrice: 0,
        indigoUpPrices: INDIGO_UP_UNITS.map((up) => ({
          up,
          weight: DEFAULT_INDIGO_WEIGHTS[up],
          fourColorSinglePrice: 0,
          fourColorDoublePrice: 0,
          sixColorSinglePrice: 0,
          sixColorDoublePrice: 0,
        })),
        inkjetBaseSpecId: "",
        inkjetBasePrice: 0,
        inkjetWeightPerSqm: 0,
        inkjetSpecPrices: [],
        priceGroups: [],
        paperPriceGroupMap: {},
        nupPageRanges: [],
        pageRanges: [20, 30, 40, 50, 60],
        lengthUnit: 'cm',
        lengthPriceRanges: [],
        areaUnit: 'mm',
        areaPriceRanges: [],
        // 배송비 관련 필드
        surchargeType: 'none' as SurchargeType,
        distancePriceRanges: [],
        extraPricePerKm: 0,
        maxBaseDistance: 20,
        freeThreshold: 50000,
        islandFee: 3000,
        // 배송비 시뮬레이션용
        simDistance: 10,
        simIsNight: false,
        simIsWeekend: false,
        simOrderAmount: 30000,
        simIsIsland: false,
      });
    }
    setIsSettingDialogOpen(true);
  };

  const handleSaveSetting = async () => {
    try {
      const formData = settingForm;

      // 필수값 검증: 용지별그룹명 (settingName)
      if (!formData.settingName || formData.settingName.trim() === "") {
        toast({
          title: "필수 입력 누락",
          description: "용지별그룹명을 입력해주세요.",
          variant: "destructive"
        });
        return;
      }

      // pricingType에 따라 필요한 필드만 포함
      const apiData: any = {
        codeName: formData.codeName,
        vendorType: formData.vendorType,
        pricingType: formData.pricingType,
        settingName: formData.settingName,
        sCode: formData.sCode,
        settingFee: formData.settingFee,
        basePrice: formData.basePrice,
        workDays: formData.workDays,
        weightInfo: formData.weightInfo,
        specUsageType: formData.specUsageType, // 규격 용도 선택
      };

      // paper_output_spec: 인쇄방식에 따라 다른 데이터 구조
      if (formData.pricingType === "paper_output_spec") {
        apiData.printMethod = formData.printMethod;
        apiData.paperIds = formData.paperIds; // 인디고, 잉크젯 모두 용지선택 필요
        // 그룹 단가 저장 (pricingMode 포함하여 저장)
        apiData.priceGroups = formData.priceGroups;
        apiData.paperPriceGroupMap = formData.paperPriceGroupMap;

        if (formData.printMethod === "indigo") {
          // 인디고: 용지 + Up별 양면/단면 가격 (규격선택 불필요)
          apiData.indigoUpPrices = formData.indigoUpPrices;
        } else {
          // 잉크젯: 용지 + 규격 + 규격별 단면 가격 + 기준규격 ID
          // priceGroups에서 규격 ID 추출 (specificationIds가 비어있을 경우)
          const specIdsFromGroups = new Set<string>();
          formData.priceGroups.forEach((group: any) => {
            if (group.specPrices && Array.isArray(group.specPrices)) {
              group.specPrices.forEach((sp: any) => {
                if (sp.specificationId) {
                  specIdsFromGroups.add(sp.specificationId);
                }
              });
            }
          });
          const allSpecIds = formData.specificationIds.length > 0
            ? formData.specificationIds
            : Array.from(specIdsFromGroups);

          apiData.specificationIds = allSpecIds;
          apiData.baseSpecificationId = formData.inkjetBaseSpecId;
          // isBaseSpec 플래그 추가
          apiData.inkjetSpecPrices = formData.inkjetSpecPrices.map((sp) => ({
            ...sp,
            isBaseSpec: sp.specificationId === formData.inkjetBaseSpecId,
          }));
        }
      }
      // nup_page_range: 구간별 Nup/1p가격
      else if (formData.pricingType === "nup_page_range") {
        apiData.printMethod = formData.printMethod;

        // 같은 Nup의 모든 규격에 동일한 가격 적용
        const method = formData.printMethod;
        const filteredSpecs = specifications?.filter((s: any) => {
          if (!s.nup) return false;
          if (method === 'indigo') return s.forIndigo && s.nup;
          if (method === 'inkjet') return s.forInkjet;
          if (method === 'album') return s.forAlbum;
          if (method === 'frame') return s.forFrame;
          if (method === 'booklet') return s.forBooklet;
          return true;
        }) || [];

        // 선택된 대표 규격의 Nup 값들을 가져옴
        const selectedNups = new Set<string>();
        formData.specificationIds.forEach(specId => {
          const spec = filteredSpecs.find((s: any) => s.id === specId);
          if (spec?.nup) selectedNups.add(spec.nup);
        });

        // 같은 Nup을 가진 모든 규격 ID를 수집
        const allSpecIds: string[] = [];
        const expandedNupPageRanges: typeof formData.nupPageRanges = [];

        formData.nupPageRanges.forEach(item => {
          const representativeSpec = filteredSpecs.find((s: any) => s.id === item.specificationId);
          if (!representativeSpec?.nup) return;

          // 같은 Nup을 가진 모든 규격 찾기
          const sameNupSpecs = filteredSpecs.filter((s: any) => s.nup === representativeSpec.nup);

          sameNupSpecs.forEach((spec: any) => {
            if (!allSpecIds.includes(spec.id)) {
              allSpecIds.push(spec.id);
              // 동일한 가격 데이터를 각 규격에 복사
              expandedNupPageRanges.push({
                ...item,
                specificationId: spec.id,
              });
            }
          });
        });

        apiData.specificationIds = allSpecIds;

        // rangePrices를 string 키로 변환하여 API에 전송
        const firstRange = formData.pageRanges[0] || 20;
        apiData.nupPageRanges = expandedNupPageRanges.map(item => {
          // number 키를 string 키로 변환
          const stringRangePrices: Record<string, number> = {};
          if (item.rangePrices) {
            Object.entries(item.rangePrices).forEach(([key, value]) => {
              stringRangePrices[String(key)] = value;
            });
          }
          return {
            specificationId: item.specificationId,
            basePages: firstRange,
            basePrice: item.rangePrices?.[firstRange] || 0,
            pricePerPage: item.pricePerPage || 0,
            rangePrices: stringRangePrices,
          };
        });
        // 페이지 구간 설정도 저장 (설정값에 포함)
        apiData.pageRanges = formData.pageRanges;
      }
      // finishing_spec_nup: 규격별 Nup/1p단가 (모든 Nup 규격 사용)
      else if (formData.pricingType === "finishing_spec_nup") {
        // 모든 Nup 규격 ID를 자동으로 포함
        const allNupSpecs = specifications
          ?.filter((s: any) => {
            if (!s.nup) return false;
            if (formData.specUsageType === "all") return true;
            return s.usage === formData.specUsageType;
          })
          .map((s: any) => s.id) || [];
        apiData.specificationIds = allNupSpecs;
        apiData.specUsageType = formData.specUsageType;
        // nupPageRanges에서 pricePerPage 저장
        if (formData.nupPageRanges && formData.nupPageRanges.length > 0) {
          apiData.nupPageRanges = formData.nupPageRanges.map(item => ({
            specificationId: item.specificationId,
            basePages: 1,
            basePrice: 0,
            pricePerPage: item.pricePerPage || 0,
            rangePrices: {},
          }));
        }
      }
      // finishing_length: 길이별단가
      else if (formData.pricingType === "finishing_length") {
        apiData.lengthUnit = formData.lengthUnit;
        apiData.lengthPriceRanges = formData.lengthPriceRanges;
      }
      // finishing_area: 면적별단가
      else if (formData.pricingType === "finishing_area") {
        apiData.areaUnit = formData.areaUnit;
        // 면적 자동 계산 후 저장
        apiData.areaPriceRanges = formData.areaPriceRanges.map(range => ({
          ...range,
          area: (range.maxWidth || 0) * (range.maxHeight || 0)
        }));
      }
      // 나머지: 규격 선택
      else {
        apiData.specificationIds = formData.specificationIds;
      }

      // 디버깅: API로 전송되는 데이터 확인
      if (editingSetting) {
        await updateSettingMutation.mutateAsync({
          id: editingSetting.id,
          ...apiData,
        });
        toast({ title: "설정이 수정되었습니다." });
      } else {
        await createSettingMutation.mutateAsync({
          groupId: selectedGroup!.id,
          ...apiData,
        });
        toast({ title: "설정이 생성되었습니다." });
      }
      setIsSettingDialogOpen(false);
    } catch (error: any) {
      toast({ title: "오류 발생", description: error.message || "오류가 발생했습니다.", variant: "destructive" });
    }
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      if (deletingItem.type === "group") {
        await deleteGroupMutation.mutateAsync(deletingItem.item.id);
        toast({ title: "그룹이 삭제되었습니다." });
        if (selectedGroup?.id === deletingItem.item.id) {
          setSelectedGroup(null);
        }
      } else {
        await deleteSettingMutation.mutateAsync(deletingItem.item.id);
        toast({ title: "설정이 삭제되었습니다." });
      }
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch (error: any) {
      toast({ title: "오류 발생", description: error.message || "오류가 발생했습니다.", variant: "destructive" });
    }
  };



  const handleMoveGroup = (id: string, direction: "up" | "down") => {
    moveGroupMutation.mutate({ id, direction });
  };

  const handleMoveSetting = (id: string, direction: "up" | "down") => {
    moveSettingMutation.mutate({ id, direction });
  };

  // 이동 다이얼로그 열기 (그룹)
  const handleOpenMoveGroupDialog = (group: ProductionGroup) => {
    if (isProtectedGroup(group.name)) {
      toast({ title: `'${group.name}' 그룹은 이동할 수 없습니다.`, variant: "destructive" });
      return;
    }
    setMoveTarget({ type: "group", item: group });
    setSelectedTargetGroupId(null);
    setIsMoveDialogOpen(true);
  };

  // 이동 다이얼로그 열기 (설정)
  const handleOpenMoveSettingDialog = (setting: ProductionSetting) => {
    setMoveTarget({ type: "setting", item: setting });
    setSelectedTargetGroupId(null);
    setIsMoveDialogOpen(true);
  };

  // 이동 실행
  const handleMoveToGroup = async () => {
    if (!moveTarget || !selectedTargetGroupId) return;
    try {
      if (moveTarget.type === "group") {
        await moveGroupToMutation.mutateAsync({
          id: (moveTarget.item as ProductionGroup).id,
          newParentId: selectedTargetGroupId,
        });
        toast({ title: "그룹이 이동되었습니다." });
      } else {
        await moveSettingToMutation.mutateAsync({
          id: (moveTarget.item as ProductionSetting).id,
          targetGroupId: selectedTargetGroupId,
        });
        toast({ title: "설정이 이동되었습니다." });
      }
      setIsMoveDialogOpen(false);
      setMoveTarget(null);
    } catch (error: any) {
      toast({
        title: "이동 실패",
        description: error?.response?.data?.message || error?.message || "오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 규격 선택 핸들러
  const handleToggleSpecification = (specId: string) => {
    setSettingForm((prev) => ({
      ...prev,
      specificationIds: prev.specificationIds.includes(specId)
        ? prev.specificationIds.filter((id) => id !== specId)
        : [...prev.specificationIds, specId],
    }));
  };

  // 규격 필터링 함수
  const getFilteredSpecifications = () => {
    if (!specifications) return [];
    if (settingForm.pricingType === "paper_output_spec") {
      // 용지별출력단가/규격별은 인쇄방식에 따라 필터링
      const method = settingForm.printMethod;
      if (method === "indigo") return specifications.filter((spec) => spec.forIndigo);
      if (method === "inkjet") return specifications.filter((spec) => spec.forInkjet);
      if (method === "album") return specifications.filter((spec) => spec.forAlbum);
      if (method === "frame") return specifications.filter((spec) => spec.forFrame);
      if (method === "booklet") return specifications.filter((spec) => spec.forBooklet);
      return specifications;
    }
    // 나머지는 선택된 용도에 따라 필터링
    const usageType = settingForm.specUsageType;
    if (usageType === "all") return specifications;
    return specifications.filter((spec) => {
      if (usageType === "indigo") return spec.forIndigo;
      if (usageType === "inkjet") return spec.forInkjet;
      if (usageType === "album") return spec.forAlbum;
      if (usageType === "frame") return spec.forFrame;
      if (usageType === "booklet") return spec.forBooklet;
      return true;
    });
  };

  const handleSelectAllSpecifications = () => {
    const filteredSpecs = getFilteredSpecifications();
    setSettingForm((prev) => ({
      ...prev,
      specificationIds: filteredSpecs.map((s) => s.id),
    }));
  };

  const handleDeselectAllSpecifications = () => {
    setSettingForm((prev) => ({
      ...prev,
      specificationIds: [],
    }));
  };

  // 마운트 전 로딩 상태 표시 (hydration 오류 방지)
  if (!isMounted) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="표준단가 설정"
          description="제품별 표준단가, 가격 계산 방식, 규격, 작업시간을 설정합니다."
          breadcrumbs={[
            { label: "홈", href: "/" },
            { label: "가격관리", href: "/pricing" },
            { label: "표준단가" },
          ]}
        />
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <Card className="flex flex-col">
            <CardHeader className="border-b bg-gray-50/50 py-3 px-4">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardHeader className="border-b bg-gray-50/50 py-4 px-5">
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="p-4">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* 좌측: 그룹 트리 */}
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
                  <ArrowDown className="w-3.5 h-3.5 mr-1" />
                  모두 펼치기
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  onClick={collapseAll}
                >
                  <ArrowUp className="w-3.5 h-3.5 mr-1" />
                  모두 접기
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
            {isLoadingGroups ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : !groupTree || groupTree.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>등록된 그룹이 없습니다.</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => handleOpenGroupDialog(null)}
                >
                  대분류 추가하기
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {groupTree.map((group) => (
                  <TreeNode
                    key={group.id}
                    group={group}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    selectedGroupId={selectedGroup?.id || null}
                    onSelectGroup={handleSelectGroup}
                    onMoveGroup={handleMoveGroup}
                    onMoveGroupTo={handleOpenMoveGroupDialog}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 우측: 표준단가 설정 */}
        <div className="flex flex-col gap-4">
          <PageHeader
            title="표준단가 설정"
            description="제품별 표준단가, 가격 계산 방식, 규격, 작업시간을 설정합니다."
            breadcrumbs={[
              { label: "홈", href: "/" },
              { label: "가격관리", href: "/pricing" },
              { label: "표준단가" },
            ]}
            actions={
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      그룹단가
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>거래처 그룹 선택</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {clientGroupsData?.data?.length === 0 ? (
                      <DropdownMenuItem disabled>
                        등록된 그룹이 없습니다
                      </DropdownMenuItem>
                    ) : (
                      clientGroupsData?.data?.map((group) => (
                        <DropdownMenuItem
                          key={group.id}
                          onClick={() => router.push(`/pricing/group?groupId=${group.id}`)}
                          className="cursor-pointer"
                        >
                          <span className="flex-1">{group.groupName}</span>
                          {group.generalDiscount !== 100 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {100 - group.generalDiscount}% 할인
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      ))
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => router.push('/pricing/group')}
                      className="cursor-pointer text-muted-foreground"
                    >
                      전체 그룹단가 관리
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={() => handleOpenGroupDialog(null)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  대분류 추가
                </Button>
              </div>
            }
          />
          <Card className="flex flex-col">
            <CardHeader className="border-b bg-gray-50/50 py-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  {selectedGroup ? (
                    <>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold">
                          {selectedGroup.name}
                        </CardTitle>
                        <span className="text-sm text-gray-500 font-mono">
                          ({selectedGroup.code})
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {selectedGroup.depth === 1 ? "대분류" : selectedGroup.depth === 2 ? "중분류" : "소분류"} · {selectedSettings.length}개 설정
                      </p>
                    </>
                  ) : (
                    <CardTitle className="text-base font-semibold text-gray-400">
                      그룹을 선택하세요
                    </CardTitle>
                  )}
                </div>

                {selectedGroup && (
                  <div className="flex items-center gap-2">
                    {!isProtectedGroup(selectedGroup.name) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-gray-600"
                          onClick={() => handleOpenGroupDialog(selectedGroup.parentId, selectedGroup)}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          그룹 수정
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={() => {
                            setDeletingItem({ type: "group", item: selectedGroup });
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          그룹 삭제
                        </Button>
                      </>
                    )}
                    {selectedGroup.depth === 1 ? (
                      <Button
                        size="sm"
                        className="h-8 bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => handleOpenGroupDialog(selectedGroup.id)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        중분류 추가
                      </Button>
                    ) : selectedGroup.depth === 2 ? (
                      <>
                        <Button
                          size="sm"
                          className="h-8 bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => handleOpenGroupDialog(selectedGroup.id)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          소분류 추가
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => handleOpenSettingDialog()}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          설정 추가
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => handleOpenSettingDialog()}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        설정 추가
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 max-h-[calc(100vh-280px)] overflow-y-auto">
              {!selectedGroup ? (
                <div className="text-center text-muted-foreground py-12">
                  <Settings2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>좌측에서 그룹을 선택해주세요.</p>
                </div>
              ) : selectedSettings.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Settings2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>등록된 설정이 없습니다.</p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => handleOpenSettingDialog()}
                  >
                    설정 추가하기
                  </Button>
                </div>
              ) : (
                <div>
                  {selectedSettings.map((setting) => (
                    <SettingCard
                      key={setting.id}
                      setting={setting}
                      onEdit={handleOpenSettingDialog}
                      onDelete={(s) => {
                        setDeletingItem({ type: "setting", item: s });
                        setIsDeleteDialogOpen(true);
                      }}
                      onMove={handleMoveSetting}
                      onMoveTo={handleOpenMoveSettingDialog}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 그룹 다이얼로그 */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "그룹 수정" :
                !parentGroupId ? "대분류 추가" :
                parentGroupDepth === 1 ? "중분류 추가" :
                parentGroupDepth === 2 ? "소분류 추가" :
                "하위 그룹 추가"}
            </DialogTitle>
            <DialogDescription>
              {!parentGroupId ? "대분류" :
                parentGroupDepth === 1 ? "중분류" :
                parentGroupDepth === 2 ? "소분류" :
                "하위 그룹"} 그룹 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">그룹명</Label>
              <Input
                id="groupName"
                placeholder="예: 출력전용, 포토북"
                value={groupForm.name}
                onChange={(e) =>
                  setGroupForm((prev) => ({ ...prev, name: e.target.value }))
                }
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSaveGroup}
              disabled={!groupForm.name}
            >
              {editingGroup ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 설정 다이얼로그 */}
      <Dialog open={isSettingDialogOpen} onOpenChange={setIsSettingDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-6">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl">
              {editingSetting ? "단가 설정 수정" : "단가 설정 추가"}
            </DialogTitle>
            <DialogDescription>
              {selectedGroup?.name} - 설정값 수정
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            <div className="flex flex-col gap-6">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <div className="bg-gray-50/50 p-4 rounded-xl border space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> 기본 정보
                  </h3>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {/* 1행: 용지별그룹명, 작업시간 */}
                    <div className="flex items-center gap-3">
                      <Label className="text-xs font-medium text-gray-500 w-24 shrink-0">
                        용지별그룹명 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="예: 박Color"
                        value={settingForm.settingName}
                        onChange={(e) =>
                          setSettingForm((prev) => ({
                            ...prev,
                            settingName: e.target.value,
                          }))
                        }
                        className="bg-white h-8"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Label className="text-xs font-medium text-gray-500 w-16 shrink-0">작업시간</Label>
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={settingForm.workDays}
                          onChange={(e) =>
                            setSettingForm((prev) => ({
                              ...prev,
                              workDays: Number(e.target.value),
                            }))
                          }
                          className="bg-white h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-muted-foreground text-xs whitespace-nowrap">일</span>
                      </div>
                    </div>

                    {/* 2행: 적용단위 */}
                    <div className="flex items-center gap-3">
                      <Label className="text-xs font-medium text-gray-500 w-24 shrink-0">
                        적용단위
                      </Label>
                      <Select
                        value={settingForm.pricingType}
                        onValueChange={(value) =>
                          setSettingForm((prev) => ({
                            ...prev,
                            pricingType: value as PricingType,
                          }))
                        }
                      >
                        <SelectTrigger className="bg-white h-8 w-auto min-w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {pricingTypes?.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          )) || Object.entries(PRICING_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 규격 용도 선택 (finishing_spec_nup일 때) */}
                    {settingForm.pricingType === "finishing_spec_nup" && (
                      <div className="flex items-center gap-3">
                        <Label className="text-xs font-medium text-gray-500 w-24 shrink-0">규격용도</Label>
                        <Select
                          value={settingForm.specUsageType}
                          onValueChange={(value) =>
                            setSettingForm((prev) => ({
                              ...prev,
                              specUsageType: value as typeof prev.specUsageType,
                              specificationIds: [],
                            }))
                          }
                        >
                          <SelectTrigger className="bg-white h-8 w-auto min-w-[100px]">
                            <SelectValue placeholder="규격 용도 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체 규격</SelectItem>
                            <SelectItem value="indigo">인디고출력</SelectItem>
                            <SelectItem value="inkjet">잉크젯출력</SelectItem>
                            <SelectItem value="album">앨범전용</SelectItem>
                            <SelectItem value="frame">액자전용</SelectItem>
                            <SelectItem value="booklet">인쇄책자전용</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* 인쇄방식 (paper_output_spec 또는 nup_page_range일 때) */}
                    {(settingForm.pricingType === "paper_output_spec" || settingForm.pricingType === "nup_page_range") && (
                      <div className="flex items-center gap-3">
                        <Label className="text-xs font-medium text-gray-500 w-16 shrink-0">인쇄방식</Label>
                        <Select
                          value={settingForm.printMethod}
                          onValueChange={(value) =>
                            setSettingForm((prev) => {
                              const newMethod = value as "indigo" | "inkjet" | "album" | "frame" | "booklet";
                              // 인쇄방식 변경 시 용지/규격 초기화
                              return {
                                ...prev,
                                printMethod: newMethod,
                                paperIds: [], // 용지 초기화 (인쇄방식별로 다름)
                                specificationIds: [], // 규격 초기화
                                nupPageRanges: [], // nup 페이지 범위 초기화
                              };
                            })
                          }
                        >
                          <SelectTrigger className="bg-white h-8 w-32">
                            <SelectValue placeholder="인쇄방식 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PRINT_METHOD_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                  </div>
                </div>
              </div>

              {/* 상세 설정 */}
              <div className="space-y-6">
                {settingForm.pricingType === "paper_output_spec" ? (
                  <>
                    {/* 용지별출력단가/규격별: 인쇄방식에 따라 다른 UI */}


                    {/* 인디고출력: 단가그룹 설정 + 용지별 그룹 할당 */}
                    {settingForm.printMethod === "indigo" ? (
                      <>
                        {/* 용지별그룹 */}
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">용지별그룹</Label>
                          <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto">
                            {!papersForPricing || papersForPricing.length === 0 ? (
                              <p className="text-center text-muted-foreground py-2 text-sm">
                                인디고용 용지가 없습니다.
                              </p>
                            ) : (
                              <div className="grid grid-cols-3 gap-1.5">
                                {papersForPricing
                                  .slice()
                                  .sort((a, b) => {
                                    // 면당 가격 계산 (4절 기준)
                                    const getPricePerSide = (paper: any) => {
                                      if (paper.unitType === 'ream') {
                                        return paper.basePrice / 4000;
                                      } else if (paper.unitType === 'sheet') {
                                        return (paper.basePrice * 500) / 4000;
                                      }
                                      return paper.basePrice;
                                    };
                                    return getPricePerSide(b) - getPricePerSide(a); // 내림차순
                                  })
                                  .map((paper) => {
                                  const assignedGroupId = settingForm.paperPriceGroupMap[paper.id];
                                  const assignedGroup = settingForm.priceGroups.find(g => g.id === assignedGroupId);
                                  const style = assignedGroup
                                    ? (PRICE_GROUP_STYLES[assignedGroup.color] || PRICE_GROUP_STYLES.none)
                                    : PRICE_GROUP_STYLES.none;

                                  return (
                                    <div
                                      key={paper.id}
                                      className={cn(
                                        "flex items-center justify-between p-2 rounded-lg border",
                                        assignedGroup ? style.bg : "bg-white",
                                        assignedGroup ? style.border : "border-gray-200"
                                      )}
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Checkbox
                                          checked={settingForm.paperIds.includes(paper.id)}
                                          onCheckedChange={(checked) => {
                                            setSettingForm((prev) => ({
                                              ...prev,
                                              paperIds: checked
                                                ? [...prev.paperIds, paper.id]
                                                : prev.paperIds.filter(id => id !== paper.id),
                                            }));
                                          }}
                                        />
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                          <span className={cn("text-sm truncate", assignedGroup ? style.text : "text-gray-500")}>
                                            {paper.name}
                                            {paper.grammage && (
                                              <span className="text-xs text-gray-400 ml-1">({paper.grammage}g)</span>
                                            )}
                                          </span>
                                          {paper.basePrice > 0 && (
                                            <span className="text-[10px] text-gray-400 truncate">
                                              {paper.unitType === 'ream'
                                                ? `₩${formatNumber(Math.round(paper.basePrice / 4000))}/면 (4절)`
                                                : paper.unitType === 'sheet'
                                                ? `₩${formatNumber(Math.round(paper.basePrice * 500 / 4000))}/면 (4절)`
                                                : `₩${formatNumber(paper.basePrice)}/${paper.unitType === 'roll' ? '롤' : '㎡'}`
                                              }
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <Select
                                        value={assignedGroupId || "none"}
                                        onValueChange={(value) => {
                                          setSettingForm((prev) => ({
                                            ...prev,
                                            paperPriceGroupMap: {
                                              ...prev.paperPriceGroupMap,
                                              [paper.id]: value === "none" ? null : value,
                                            },
                                            // 그룹 지정 시 자동으로 선택 상태로 만들기
                                            paperIds: value !== "none" && !prev.paperIds.includes(paper.id)
                                              ? [...prev.paperIds, paper.id]
                                              : prev.paperIds,
                                          }));
                                        }}
                                      >
                                        <SelectTrigger className="w-28 h-7 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">
                                            <span className="text-gray-400">⚪ 미지정</span>
                                          </SelectItem>
                                          {settingForm.priceGroups.map((g) => {
                                            const gs = PRICE_GROUP_STYLES[g.color] || PRICE_GROUP_STYLES.none;
                                            return (
                                              <SelectItem key={g.id} value={g.id}>
                                                <span className={gs.text}>{gs.dot} {gs.label}</span>
                                              </SelectItem>
                                            );
                                          })}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            선택된 용지: {settingForm.paperIds.length}개 |
                            그룹 지정됨: {Object.values(settingForm.paperPriceGroupMap).filter(v => v !== null).length}개
                          </p>
                        </div>

                        {/* 단가 그룹 관리 */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">단가 그룹 설정</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm border-0"
                                onClick={() => setIsPriceAdjustDialogOpen(true)}
                                disabled={settingForm.priceGroups.length === 0}
                              >
                                단가맞춤
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={settingForm.priceGroups.length >= 10}
                                onClick={() => {
                                  const usedColors = settingForm.priceGroups.map(g => g.color);
                                  const nextColor = getNextAvailableColor(usedColors);
                                  if (!nextColor) return;

                                  setSettingForm((prev) => ({
                                    ...prev,
                                    priceGroups: [
                                      ...prev.priceGroups,
                                      {
                                        id: generateGroupId(),
                                        color: nextColor,
                                        upPrices: INDIGO_UP_UNITS.map((up) => ({
                                          up,
                                          weight: DEFAULT_INDIGO_WEIGHTS[up],
                                          fourColorSinglePrice: 0,
                                          fourColorDoublePrice: 0,
                                          sixColorSinglePrice: 0,
                                          sixColorDoublePrice: 0,
                                        })),
                                      },
                                    ],
                                  }));
                                }}
                              >
                                + 용지그룹 추가
                              </Button>
                            </div>
                          </div>

                          {/* 그룹별 단가 입력 */}
                          {settingForm.priceGroups.length === 0 ? (
                            <div className="border p-4 text-center text-muted-foreground text-sm">
                              용지그룹을 추가하여 용지별 가격을 설정하세요.
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              {settingForm.priceGroups.map((group) => {
                                const style = PRICE_GROUP_STYLES[group.color] || PRICE_GROUP_STYLES.none;
                                const assignedPapers = Object.entries(settingForm.paperPriceGroupMap)
                                  .filter(([, gid]) => gid === group.id)
                                  .map(([pid]) => papersForPricing?.find(p => p.id === pid))
                                  .filter(Boolean);
                                const upPrices = group.upPrices || INDIGO_UP_UNITS.map((up) => ({
                                  up,
                                  weight: DEFAULT_INDIGO_WEIGHTS[up],
                                  fourColorSinglePrice: 0,
                                  fourColorDoublePrice: 0,
                                  sixColorSinglePrice: 0,
                                  sixColorDoublePrice: 0,
                                }));

                                // 1up 기준가로 다른 up 가격 자동 계산
                                const calculate1upBasedPrices = (baseUp: typeof upPrices[0], priceField: keyof typeof baseUp, value: number) => {
                                  const basePrice = value;
                                  return upPrices.map(up => {
                                    if (up.up === 1) {
                                      return { ...up, [priceField]: value };
                                    }
                                    return { ...up, [priceField]: Math.round((basePrice / up.up) * up.weight) };
                                  });
                                };

                                // 그룹에 할당된 용지들의 평균 면당 용지 원가 계산
                                // 공식: 국전지가격 / 500 / 4 / 2 (1연 500장, 4절, 양면)
                                const getAvgPaperCostPerSide = () => {
                                  if (!assignedPapers.length || !indigoInk1ColorCost) return null;
                                  const costs = assignedPapers.map((p: any) => {
                                    // 국전지 1연 가격 (basePrice를 연 가격으로 가정)
                                    const reamPrice = p?.basePrice || 0;
                                    // 면당 용지 원가 = 연가격 / 500장 / 4절 / 2면
                                    const paperCostPerSide = reamPrice / 500 / 4 / 2;
                                    return paperCostPerSide;
                                  });
                                  return costs.reduce((a, b) => a + b, 0) / costs.length;
                                };

                                const avgPaperCostPerSide = getAvgPaperCostPerSide();

                                // Up별 원가 표시용 계산
                                // 1up 원가 = (국전지가격/500/4/2) + 클릭차지
                                // nup 원가 = 1up 원가 / n
                                // 클릭차지 = 1도당 잉크비용 × 도수 (4도 또는 6도)
                                const getCostDisplay = (priceField: string, up: number) => {
                                  if (avgPaperCostPerSide === null || !indigoInk1ColorCost) return null;
                                  const colorCount = priceField.includes('four') ? 4 : 6;
                                  const clickCharge = indigoInk1ColorCost * colorCount;
                                  // 1up 면당 원가
                                  const costPerSide1up = avgPaperCostPerSide + clickCharge;
                                  // 단면: 1면, 양면: 2면
                                  const totalCost1up = priceField.includes('Double') ? costPerSide1up * 2 : costPerSide1up;
                                  // Up별 원가 = 1up 원가 / up
                                  const costPerUp = totalCost1up / up;
                                  return formatNumber(Math.round(costPerUp));
                                };

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
                                          {assignedPapers.length}개 용지
                                        </Badge>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                                        onClick={() => {
                                          setSettingForm((prev) => ({
                                            ...prev,
                                            priceGroups: prev.priceGroups.filter(g => g.id !== group.id),
                                            paperPriceGroupMap: Object.fromEntries(
                                              Object.entries(prev.paperPriceGroupMap).map(([k, v]) =>
                                                v === group.id ? [k, null] : [k, v]
                                              )
                                            ),
                                          }));
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>

                                    {/* 할당된 용지 미리보기 */}
                                    {assignedPapers.length > 0 && (
                                      <div className="text-xs text-gray-500 truncate">
                                        {assignedPapers.map((p: any) => `${p?.name}${p?.grammage ? ` ${p.grammage}g` : ''}`).join(", ")}
                                      </div>
                                    )}

                                    {/* Up별 가격 입력 테이블 (간소화) */}
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
                                          {upPrices.map((upPrice, idx) => {
                                            return (
                                              <tr key={upPrice.up} className={cn("border-b border-gray-100 last:border-0", idx === 0 && "bg-amber-50/50")}>
                                                <td className="text-center py-0.5 px-0.5 font-medium text-indigo-600">{upPrice.up}up</td>
                                                <td className="text-center px-0.5 py-0.5">
                                                  <div className="relative">
                                                    <Input
                                                      type="number"
                                                      step="0.1"
                                                      min="0.1"
                                                      max="5"
                                                      className="h-8 w-12 text-center text-[11px] bg-gray-50 border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                      value={upPrice.weight || ""}
                                                      disabled={upPrice.up === 1}
                                                      onChange={(e) => {
                                                        const weight = Number(e.target.value) || 1;
                                                        setSettingForm((prev) => ({
                                                          ...prev,
                                                          priceGroups: prev.priceGroups.map(g => {
                                                            if (g.id !== group.id) return g;
                                                            const newUpPrices = (g.upPrices || upPrices).map(up => {
                                                              if (up.up !== upPrice.up) return up;
                                                              return { ...up, weight };
                                                            });
                                                            // 가중치 변경 시 1up 기준으로 가격 재계산
                                                            const oneUpPrice = newUpPrices.find(up => up.up === 1);
                                                            if (oneUpPrice) {
                                                              const recalculated = newUpPrices.map(up => {
                                                                if (up.up === 1) return up;
                                                                return {
                                                                  ...up,
                                                                  fourColorSinglePrice: Math.round((oneUpPrice.fourColorSinglePrice / up.up) * up.weight),
                                                                  fourColorDoublePrice: Math.round((oneUpPrice.fourColorDoublePrice / up.up) * up.weight),
                                                                  sixColorSinglePrice: Math.round((oneUpPrice.sixColorSinglePrice / up.up) * up.weight),
                                                                  sixColorDoublePrice: Math.round((oneUpPrice.sixColorDoublePrice / up.up) * up.weight),
                                                                };
                                                              });
                                                              return { ...g, upPrices: recalculated };
                                                            }
                                                            return { ...g, upPrices: newUpPrices };
                                                          }),
                                                        }));
                                                      }}
                                                      placeholder="1"
                                                    />
                                                  </div>
                                                </td>
                                                {['fourColorSinglePrice', 'fourColorDoublePrice', 'sixColorSinglePrice', 'sixColorDoublePrice'].map((field) => {
                                                  const costDisplay = getCostDisplay(field, upPrice.up);
                                                  return (
                                                    <td key={field} className="px-0.5 py-0.5">
                                                      <div className="flex flex-col items-center">
                                                        <Input
                                                          type="number"
                                                          className={cn(
                                                            "h-8 w-16 text-sm text-center rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                                            idx === 0
                                                              ? "bg-amber-100 border-amber-300 font-medium focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                                                              : "bg-white border-slate-200 hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                                                          )}
                                                          value={(upPrice as any)[field] || ""}
                                                          onChange={(e) => {
                                                            const value = Number(e.target.value) || 0;
                                                            setSettingForm((prev) => ({
                                                              ...prev,
                                                              priceGroups: prev.priceGroups.map(g => {
                                                                if (g.id !== group.id) return g;
                                                                if (upPrice.up === 1) {
                                                                  // 1up 가격 변경 시: nup = 1up가격 / nup * 가중치
                                                                  const newUpPrices = (g.upPrices || upPrices).map(up => {
                                                                    if (up.up === 1) {
                                                                      return { ...up, [field]: value };
                                                                    }
                                                                    return { ...up, [field]: Math.round((value / up.up) * up.weight) };
                                                                  });
                                                                  return { ...g, upPrices: newUpPrices };
                                                                }
                                                                const newUpPrices = (g.upPrices || upPrices).map(up =>
                                                                  up.up === upPrice.up ? { ...up, [field]: value } : up
                                                                );
                                                                return { ...g, upPrices: newUpPrices };
                                                              }),
                                                            }));
                                                          }}
                                                          placeholder="0"
                                                        />
                                                        {costDisplay && (
                                                          <span className="text-[8px] text-amber-600 leading-none">({costDisplay})</span>
                                                        )}
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
                                      {indigoInk1ColorCost > 0 && assignedPapers.length > 0 && (
                                        <span className="text-amber-600 ml-2">
                                          (원가 = 용지+잉크, 잉크 {indigoInk1ColorCost}원×컬러수/up)
                                        </span>
                                      )}
                                    </p>
                                    {assignedPapers.length > 0 && indigoInk1ColorCost === 0 && (
                                      <p className="mt-1 text-xs text-amber-600">
                                        💡 원가 표시: 설정 &gt; 기초정보 &gt; 인쇄비에서 인디고 1도 인쇄비 설정 필요
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                      </>
                    ) : (
                      <>
                        {/* 잉크젯/앨범/액자/책자: 그룹별 규격 단가 설정 */}

                        {/* 용지 목록 + 그룹 할당 드롭다운 */}
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">용지별그룹명</Label>
                          <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto">
                            {!papersForPricing || papersForPricing.length === 0 ? (
                              <p className="text-center text-muted-foreground py-2 text-sm">
                                {PRINT_METHOD_LABELS[settingForm.printMethod]}용 용지가 없습니다.
                              </p>
                            ) : (
                              <div className="grid grid-cols-3 gap-1.5">
                                {papersForPricing
                                  .slice()
                                  .sort((a, b) => {
                                    // 면당 가격 계산 (4절 기준)
                                    const getPricePerSide = (paper: any) => {
                                      if (paper.unitType === 'ream') {
                                        return paper.basePrice / 4000;
                                      } else if (paper.unitType === 'sheet') {
                                        return (paper.basePrice * 500) / 4000;
                                      }
                                      return paper.basePrice;
                                    };
                                    return getPricePerSide(b) - getPricePerSide(a); // 내림차순
                                  })
                                  .map((paper) => {
                                  const assignedGroupId = settingForm.paperPriceGroupMap[paper.id];
                                  const assignedGroup = settingForm.priceGroups.find(g => g.id === assignedGroupId);
                                  const style = assignedGroup
                                    ? (PRICE_GROUP_STYLES[assignedGroup.color] || PRICE_GROUP_STYLES.none)
                                    : PRICE_GROUP_STYLES.none;

                                  return (
                                    <div
                                      key={paper.id}
                                      className={cn(
                                        "flex items-center justify-between p-2 rounded-lg border",
                                        assignedGroup ? style.bg : "bg-white",
                                        assignedGroup ? style.border : "border-gray-200"
                                      )}
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Checkbox
                                          checked={settingForm.paperIds.includes(paper.id)}
                                          onCheckedChange={(checked) => {
                                            setSettingForm((prev) => ({
                                              ...prev,
                                              paperIds: checked
                                                ? [...prev.paperIds, paper.id]
                                                : prev.paperIds.filter(id => id !== paper.id),
                                            }));
                                          }}
                                        />
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                          <span className={cn("text-sm truncate", assignedGroup ? style.text : "text-gray-500")}>
                                            {paper.name}
                                            {paper.grammage && (
                                              <span className="text-xs text-gray-400 ml-1">({paper.grammage}g)</span>
                                            )}
                                          </span>
                                          {paper.basePrice > 0 && (
                                            <span className="text-[10px] text-gray-400 truncate">
                                              {paper.unitType === 'ream'
                                                ? `₩${formatNumber(Math.round(paper.basePrice / 4000))}/면 (4절)`
                                                : paper.unitType === 'sheet'
                                                ? `₩${formatNumber(Math.round(paper.basePrice * 500 / 4000))}/면 (4절)`
                                                : `₩${formatNumber(paper.basePrice)}/${paper.unitType === 'roll' ? '롤' : '㎡'}`
                                              }
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <Select
                                        value={assignedGroupId || "none"}
                                        onValueChange={(value) => {
                                          setSettingForm((prev) => ({
                                            ...prev,
                                            paperPriceGroupMap: {
                                              ...prev.paperPriceGroupMap,
                                              [paper.id]: value === "none" ? null : value,
                                            },
                                            paperIds: value !== "none" && !prev.paperIds.includes(paper.id)
                                              ? [...prev.paperIds, paper.id]
                                              : prev.paperIds,
                                          }));
                                        }}
                                      >
                                        <SelectTrigger className="w-28 h-7 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">
                                            <span className="text-gray-400">⚪ 미지정</span>
                                          </SelectItem>
                                          {settingForm.priceGroups.map((g) => {
                                            const gs = PRICE_GROUP_STYLES[g.color] || PRICE_GROUP_STYLES.none;
                                            return (
                                              <SelectItem key={g.id} value={g.id}>
                                                <span className={gs.text}>{gs.dot} {gs.label}</span>
                                              </SelectItem>
                                            );
                                          })}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            선택된 용지: {settingForm.paperIds.length}개 |
                            그룹 지정됨: {Object.values(settingForm.paperPriceGroupMap).filter(v => v !== null).length}개
                          </p>
                        </div>

                        {/* 규격 선택 (그룹보다 먼저) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-semibold">규격선택 ({PRINT_METHOD_LABELS[settingForm.printMethod]}용)</Label>
                              <span className="text-xs text-muted-foreground">선택: {settingForm.specificationIds.length}개</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-gray-600"
                                onClick={() => setIsSpecSelectorExpanded(!isSpecSelectorExpanded)}
                              >
                                {isSpecSelectorExpanded ? (
                                  <>
                                    <ChevronUp className="h-3.5 w-3.5 mr-1" />
                                    접기
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3.5 w-3.5 mr-1" />
                                    펼치기
                                  </>
                                )}
                              </Button>
                              {isSpecSelectorExpanded && (
                                <>
                                  <Button variant="outline" size="sm" className="h-7" onClick={() => {
                                    const filteredSpecs = getFilteredSpecifications();
                                    setSettingForm((prev) => ({
                                      ...prev,
                                      specificationIds: filteredSpecs.map((s) => s.id),
                                    }));
                                  }}>
                                    전체선택
                                  </Button>
                                  <Button variant="outline" size="sm" className="h-7" onClick={() => {
                                    setSettingForm((prev) => ({
                                      ...prev,
                                      specificationIds: [],
                                    }));
                                  }}>
                                    전체해제
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          {isSpecSelectorExpanded && (
                            <div className="border rounded-lg bg-gray-50">
                              <div className="grid grid-cols-4 gap-px bg-gray-200 border-b">
                                {getFilteredSpecifications().map((spec) => (
                                  <div key={spec.id} className="flex items-center gap-2 bg-white p-2 text-sm">
                                    <Checkbox
                                      id={`spec-inkjet-${spec.id}`}
                                      className="h-4 w-4"
                                      checked={settingForm.specificationIds.includes(spec.id)}
                                      onCheckedChange={() => {
                                        const isSelected = settingForm.specificationIds.includes(spec.id);
                                        setSettingForm((prev) => ({
                                          ...prev,
                                          specificationIds: isSelected
                                            ? prev.specificationIds.filter((id) => id !== spec.id)
                                            : [...prev.specificationIds, spec.id],
                                        }));
                                      }}
                                    />
                                    <Label htmlFor={`spec-inkjet-${spec.id}`} className="font-mono cursor-pointer flex-1">
                                      {spec.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                              {getFilteredSpecifications().length === 0 && (
                                <p className="text-center text-muted-foreground py-2 text-sm">
                                  {PRINT_METHOD_LABELS[settingForm.printMethod]}용 규격이 없습니다.
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 단가 그룹 관리 */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">단가 그룹 설정</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm border-0"
                                onClick={() => setIsPriceAdjustDialogOpen(true)}
                                disabled={settingForm.priceGroups.length === 0}
                              >
                                단가맞춤
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={settingForm.priceGroups.length >= 10}
                                onClick={() => {
                                  const usedColors = settingForm.priceGroups.map(g => g.color);
                                  const nextColor = getNextAvailableColor(usedColors);
                                  if (!nextColor) return;

                                  // 선택된 규격들로 specPrices 초기화
                                  const initialSpecPrices = settingForm.specificationIds.map(specId => ({
                                    specificationId: specId,
                                    singleSidedPrice: 0,
                                    weight: 1.0,
                                  }));

                                  setSettingForm((prev) => ({
                                    ...prev,
                                    priceGroups: [
                                      ...prev.priceGroups,
                                      {
                                        id: generateGroupId(),
                                        color: nextColor,
                                        upPrices: INDIGO_UP_UNITS.map((up) => ({
                                          up,
                                          weight: DEFAULT_INDIGO_WEIGHTS[up],
                                          fourColorSinglePrice: 0,
                                          fourColorDoublePrice: 0,
                                          sixColorSinglePrice: 0,
                                          sixColorDoublePrice: 0,
                                        })),
                                        specPrices: initialSpecPrices,
                                        inkjetBaseSpecId: "",
                                        inkjetBasePrice: 0,
                                        pricingMode: 'spec' as const,
                                      },
                                    ],
                                  }));
                                }}
                              >
                                + 용지그룹 추가
                              </Button>
                            </div>
                          </div>

                          {settingForm.specificationIds.length === 0 && (
                            <div className="border p-4 text-center text-muted-foreground text-sm">
                              먼저 규격을 선택하세요.
                            </div>
                          )}

                          {/* 그룹별 규격 단가 입력 - 3열 레이아웃 */}
                          {settingForm.priceGroups.length === 0 && settingForm.specificationIds.length > 0 ? (
                            <div className="border p-4 text-center text-muted-foreground text-sm">
                              단가 그룹을 추가하여 용지별 규격 가격을 설정하세요.
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-3">
                              {settingForm.priceGroups.map((group) => {
                                const style = PRICE_GROUP_STYLES[group.color] || PRICE_GROUP_STYLES.none;
                                const assignedPapers = Object.entries(settingForm.paperPriceGroupMap)
                                  .filter(([, gid]) => gid === group.id)
                                  .map(([pid]) => papersForPricing?.find(p => p.id === pid))
                                  .filter(Boolean);
                                const specPrices = group.specPrices || [];

                                return (
                                  <div key={group.id} className={cn("p-2 border-2", style.bg, style.border)}>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <div className="flex items-center gap-1">
                                        <span className={cn("text-xs font-semibold", style.text)}>
                                          {style.dot} {style.label}
                                        </span>
                                        <span className="text-[10px] bg-gray-200 text-gray-700 px-1 py-0.5">
                                          {specPrices.length}/{settingForm.specificationIds.length}개
                                        </span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                          setSettingForm((prev) => {
                                            const newMap = { ...prev.paperPriceGroupMap };
                                            Object.keys(newMap).forEach(pid => {
                                              if (newMap[pid] === group.id) {
                                                newMap[pid] = null;
                                              }
                                            });
                                            return {
                                              ...prev,
                                              priceGroups: prev.priceGroups.filter(g => g.id !== group.id),
                                              paperPriceGroupMap: newMap,
                                            };
                                          });
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>

                                    {assignedPapers.length > 0 && (
                                      <div className="text-[9px] text-gray-500 mb-1 truncate">
                                        {assignedPapers.map(p => `${p?.name}${p?.grammage ? ` ${p.grammage}g` : ''}`).join(', ')}
                                      </div>
                                    )}

                                    {/* 단가 입력 방식 선택 */}
                                    <div className="mb-1.5 p-1.5 bg-white/50 border text-[10px]">
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <Select
                                          value={group.pricingMode === 'sqinch' ? 'sqinch' : 'spec'}
                                          onValueChange={(value) => {
                                            setSettingForm((prev) => ({
                                              ...prev,
                                              priceGroups: prev.priceGroups.map(g => {
                                                if (g.id !== group.id) return g;
                                                return { ...g, pricingMode: value as 'spec' | 'sqinch' };
                                              }),
                                            }));
                                          }}
                                        >
                                          <SelectTrigger className="h-6 w-20 text-[10px] bg-white">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="spec">기준규격</SelectItem>
                                            <SelectItem value="sqinch">sq"</SelectItem>
                                          </SelectContent>
                                        </Select>

                                        {group.pricingMode !== 'sqinch' && (
                                          <>
                                            <Select
                                              value={group.inkjetBaseSpecId || ""}
                                              onValueChange={(specId) => {
                                                setSettingForm((prev) => ({
                                                  ...prev,
                                                  priceGroups: prev.priceGroups.map(g => {
                                                    if (g.id !== group.id) return g;
                                                    return { ...g, inkjetBaseSpecId: specId };
                                                  }),
                                                }));
                                              }}
                                            >
                                              <SelectTrigger className="h-6 w-16 text-[10px] bg-white">
                                                <SelectValue placeholder="규격" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {specPrices.map((sp) => {
                                                  const spec = specifications?.find((s) => s.id === sp.specificationId);
                                                  return (
                                                    <SelectItem key={sp.specificationId} value={sp.specificationId}>
                                                      {spec?.name}
                                                    </SelectItem>
                                                  );
                                                })}
                                              </SelectContent>
                                            </Select>
                                            <Input
                                              type="number"
                                              className="h-6 w-16 text-[10px] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                              placeholder="단가"
                                              disabled={!group.inkjetBaseSpecId}
                                              value={group.inkjetBaseSpecId ? (specPrices.find(p => p.specificationId === group.inkjetBaseSpecId)?.singleSidedPrice || "") : ""}
                                              onChange={(e) => {
                                                const basePrice = Number(e.target.value);
                                                const baseSpec = specifications?.find((s) => s.id === group.inkjetBaseSpecId);
                                                if (!baseSpec) return;
                                                const baseArea = Number(baseSpec.widthInch) * Number(baseSpec.heightInch);
                                                const pricePerSqInch = baseArea > 0 ? basePrice / baseArea : 0;

                                                setSettingForm((prev) => ({
                                                  ...prev,
                                                  priceGroups: prev.priceGroups.map(g => {
                                                    if (g.id !== group.id) return g;
                                                    const newSpecPrices = (g.specPrices || specPrices).map((sp) => {
                                                      if (sp.specificationId === group.inkjetBaseSpecId) {
                                                        return { ...sp, singleSidedPrice: basePrice };
                                                      }
                                                      const targetSpec = specifications?.find((s) => s.id === sp.specificationId);
                                                      if (!targetSpec) return sp;
                                                      const targetArea = Number(targetSpec.widthInch) * Number(targetSpec.heightInch);
                                                      const calculatedPrice = targetArea * pricePerSqInch * (sp.weight || 1.0);
                                                      return { ...sp, singleSidedPrice: Math.max(0, Math.round(calculatedPrice)) };
                                                    });
                                                    return { ...g, inkjetBasePrice: pricePerSqInch, specPrices: newSpecPrices };
                                                  }),
                                                }));
                                              }}
                                            />
                                            {/* 원가 표시 + 원가 적용 버튼 */}
                                            {(() => {
                                              // 기준규격 찾기: inkjetBaseSpecId > specPrices[0] > specificationIds[0]
                                              let baseSpec: Specification | null | undefined = null;
                                              if (group.inkjetBaseSpecId) {
                                                baseSpec = specifications?.find((s) => s.id === group.inkjetBaseSpecId);
                                              }
                                              if (!baseSpec && specPrices.length > 0 && specPrices[0]?.specificationId) {
                                                baseSpec = specifications?.find((s) => s.id === specPrices[0].specificationId);
                                              }
                                              if (!baseSpec && settingForm.specificationIds.length > 0) {
                                                baseSpec = specifications?.find((s) => s.id === settingForm.specificationIds[0]);
                                              }

                                              // 원가 계산에 사용할 용지 결정:
                                              // 1. 그룹에 할당된 용지가 있으면 사용
                                              // 2. 없으면 settingForm.paperIds로 선택된 용지 사용
                                              // 3. 그것도 없으면 전체 papersForPricing 사용
                                              let papersToUse: Paper[] = [];
                                              if (assignedPapers.length > 0) {
                                                papersToUse = assignedPapers as Paper[];
                                              } else if (settingForm.paperIds.length > 0) {
                                                papersToUse = settingForm.paperIds
                                                  .map(pid => papersForPricing?.find(p => p.id === pid))
                                                  .filter(Boolean) as Paper[];
                                              } else if (papersForPricing && papersForPricing.length > 0) {
                                                papersToUse = papersForPricing;
                                              }

                                              // 조건 불충족 시 메시지 표시
                                              if (!baseSpec) {
                                                return <span className="text-[10px] text-gray-400">(규격선택)</span>;
                                              }
                                              if (papersToUse.length === 0) {
                                                return <span className="text-[10px] text-gray-400">(용지선택)</span>;
                                              }

                                              const costInfo = calculateInkjetTotalCost(papersToUse, baseSpec);
                                              if (!costInfo) {
                                                return <span className="text-[10px] text-gray-400">(용지정보부족)</span>;
                                              }
                                              const costValue = costInfo.totalMax; // 최대값 사용 (안전마진)
                                              const costDisplay = costInfo.totalMin === costInfo.totalMax
                                                ? formatNumber(costInfo.totalMin)
                                                : `${formatNumber(costInfo.totalMin)}~${formatNumber(costInfo.totalMax)}`;

                                              // 원가 적용 함수
                                              const applyCost = () => {
                                                if (!group.inkjetBaseSpecId) return;
                                                const baseArea = Number(baseSpec.widthInch) * Number(baseSpec.heightInch);
                                                const pricePerSqInch = baseArea > 0 ? costValue / baseArea : 0;

                                                setSettingForm((prev) => ({
                                                  ...prev,
                                                  priceGroups: prev.priceGroups.map(g => {
                                                    if (g.id !== group.id) return g;
                                                    const newSpecPrices = (g.specPrices || specPrices).map((sp) => {
                                                      if (sp.specificationId === group.inkjetBaseSpecId) {
                                                        return { ...sp, singleSidedPrice: costValue };
                                                      }
                                                      const targetSpec = specifications?.find((s) => s.id === sp.specificationId);
                                                      if (!targetSpec) return sp;
                                                      const targetArea = Number(targetSpec.widthInch) * Number(targetSpec.heightInch);
                                                      const calculatedPrice = targetArea * pricePerSqInch * (sp.weight || 1.0);
                                                      return { ...sp, singleSidedPrice: Math.max(0, Math.round(calculatedPrice)) };
                                                    });
                                                    return { ...g, inkjetBasePrice: pricePerSqInch, specPrices: newSpecPrices };
                                                  }),
                                                }));
                                              };

                                              return (
                                                <button
                                                  type="button"
                                                  onClick={applyCost}
                                                  disabled={!group.inkjetBaseSpecId}
                                                  className="text-[13px] text-rose-600 font-semibold whitespace-nowrap hover:bg-rose-100 px-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                  title="클릭하면 원가가 자동 적용됩니다"
                                                >
                                                  {costDisplay}
                                                </button>
                                              );
                                            })()}
                                          </>
                                        )}

                                        {group.pricingMode === 'sqinch' && (
                                          <>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              className="h-6 w-20 text-[10px] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                              placeholder={'sq" 단가'}
                                              value={group.inkjetBasePrice || ""}
                                              onChange={(e) => {
                                                const pricePerSqInch = Number(e.target.value);
                                                setSettingForm((prev) => ({
                                                  ...prev,
                                                  priceGroups: prev.priceGroups.map(g => {
                                                    if (g.id !== group.id) return g;
                                                    const newSpecPrices = (g.specPrices || specPrices).map((sp) => {
                                                      const targetSpec = specifications?.find((s) => s.id === sp.specificationId);
                                                      if (!targetSpec) return sp;
                                                      const targetArea = Number(targetSpec.widthInch) * Number(targetSpec.heightInch);
                                                      const calculatedPrice = targetArea * pricePerSqInch * (sp.weight || 1.0);
                                                      return { ...sp, singleSidedPrice: Math.max(0, Math.round(calculatedPrice)) };
                                                    });
                                                    return { ...g, inkjetBasePrice: pricePerSqInch, specPrices: newSpecPrices };
                                                  }),
                                                }));
                                              }}
                                            />
                                            {/* 원가 표시 (sq" 모드) + 원가 적용 버튼 */}
                                            {(() => {
                                              // 첫 번째 규격을 기준으로 원가 계산: specPrices[0] > specificationIds[0]
                                              let firstSpec: Specification | null | undefined = null;
                                              if (specPrices.length > 0 && specPrices[0]?.specificationId) {
                                                firstSpec = specifications?.find((s) => s.id === specPrices[0].specificationId);
                                              }
                                              if (!firstSpec && settingForm.specificationIds.length > 0) {
                                                firstSpec = specifications?.find((s) => s.id === settingForm.specificationIds[0]);
                                              }

                                              // 원가 계산에 사용할 용지 결정
                                              let papersToUse: Paper[] = [];
                                              if (assignedPapers.length > 0) {
                                                papersToUse = assignedPapers as Paper[];
                                              } else if (settingForm.paperIds.length > 0) {
                                                papersToUse = settingForm.paperIds
                                                  .map(pid => papersForPricing?.find(p => p.id === pid))
                                                  .filter(Boolean) as Paper[];
                                              } else if (papersForPricing && papersForPricing.length > 0) {
                                                papersToUse = papersForPricing;
                                              }

                                              // 조건 불충족 시 메시지 표시
                                              if (!firstSpec) {
                                                return <span className="text-[10px] text-gray-400">(규격선택)</span>;
                                              }
                                              if (papersToUse.length === 0) {
                                                return <span className="text-[10px] text-gray-400">(용지선택)</span>;
                                              }

                                              const costInfo = calculateInkjetTotalCost(papersToUse, firstSpec);
                                              if (!costInfo) {
                                                return <span className="text-[10px] text-gray-400">(용지정보부족)</span>;
                                              }
                                              // sq" 당 원가 계산
                                              const specArea = Number(firstSpec.widthInch) * Number(firstSpec.heightInch);
                                              if (specArea <= 0) return null;
                                              const costPerSqInchMin = costInfo.totalMin / specArea;
                                              const costPerSqInchMax = costInfo.totalMax / specArea;
                                              const costPerSqInchValue = costPerSqInchMax; // 최대값 사용 (안전마진)
                                              const costDisplay = costPerSqInchMin === costPerSqInchMax
                                                ? costPerSqInchMin.toFixed(2)
                                                : `${costPerSqInchMin.toFixed(2)}~${costPerSqInchMax.toFixed(2)}`;

                                              // sq" 원가 적용 함수
                                              const applySqInchCost = () => {
                                                const pricePerSqInch = costPerSqInchValue;
                                                setSettingForm((prev) => ({
                                                  ...prev,
                                                  priceGroups: prev.priceGroups.map(g => {
                                                    if (g.id !== group.id) return g;
                                                    const newSpecPrices = (g.specPrices || specPrices).map((sp) => {
                                                      const targetSpec = specifications?.find((s) => s.id === sp.specificationId);
                                                      if (!targetSpec) return sp;
                                                      const targetArea = Number(targetSpec.widthInch) * Number(targetSpec.heightInch);
                                                      const calculatedPrice = targetArea * pricePerSqInch * (sp.weight || 1.0);
                                                      return { ...sp, singleSidedPrice: Math.max(0, Math.round(calculatedPrice)) };
                                                    });
                                                    return { ...g, inkjetBasePrice: Math.round(pricePerSqInch * 100) / 100, specPrices: newSpecPrices };
                                                  }),
                                                }));
                                              };

                                              return (
                                                <button
                                                  type="button"
                                                  onClick={applySqInchCost}
                                                  className="text-[13px] text-rose-600 font-semibold whitespace-nowrap hover:bg-rose-100 px-1"
                                                  title="클릭하면 원가가 자동 적용됩니다"
                                                >
                                                  {costDisplay}
                                                </button>
                                              );
                                            })()}
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {/* 규격별 단가 테이블 - 1열 (세로 목록) */}
                                    <div className="border overflow-hidden bg-white/50">
                                      <table className="w-full text-[10px]">
                                        <thead className="bg-gray-100">
                                          <tr className="border-b">
                                            <th className="px-1 py-1 text-center w-6">
                                              <input
                                                type="checkbox"
                                                className="h-3 w-3"
                                                checked={specPrices.length === settingForm.specificationIds.length}
                                                onChange={(e) => {
                                                  const checked = e.target.checked;
                                                  setSettingForm((prev) => ({
                                                    ...prev,
                                                    priceGroups: prev.priceGroups.map(g => {
                                                      if (g.id !== group.id) return g;
                                                      if (checked) {
                                                        const allSpecPrices = settingForm.specificationIds.map((specId) => {
                                                          const existing = (g.specPrices || []).find(sp => sp.specificationId === specId);
                                                          return existing || { specificationId: specId, singleSidedPrice: 0, weight: 1.0 };
                                                        });
                                                        return { ...g, specPrices: allSpecPrices };
                                                      } else {
                                                        return { ...g, specPrices: [], inkjetBaseSpecId: "" };
                                                      }
                                                    }),
                                                  }));
                                                }}
                                              />
                                            </th>
                                            <th className="px-1 py-1 text-center">규격</th>
                                            <th className="px-1 py-1 text-center w-12">가중치</th>
                                            <th className="px-1 py-1 text-center w-16">단가</th>
                                          </tr>
                                        </thead>
                                        <tbody className="max-h-[200px] overflow-y-auto">
                                          {[...settingForm.specificationIds]
                                            .map(specId => {
                                              const spec = specifications?.find((s) => s.id === specId);
                                              const area = spec ? Number(spec.widthInch) * Number(spec.heightInch) : 0;
                                              return { specId, area };
                                            })
                                            .sort((a, b) => a.area - b.area)
                                            .map(({ specId }) => {
                                              const spec = specifications?.find((s) => s.id === specId);
                                              const priceData = specPrices.find(p => p.specificationId === specId);
                                              const isIncluded = !!priceData;
                                              const isBase = specId === group.inkjetBaseSpecId;

                                              return (
                                                <tr key={specId} className={cn("border-b", isBase ? "bg-green-50" : "", !isIncluded && "opacity-50")}>
                                                  <td className="px-1 py-0.5 text-center">
                                                    <input
                                                      type="checkbox"
                                                      className="h-3 w-3"
                                                      checked={isIncluded}
                                                      onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setSettingForm((prev) => ({
                                                          ...prev,
                                                          priceGroups: prev.priceGroups.map(g => {
                                                            if (g.id !== group.id) return g;
                                                            if (checked) {
                                                              const newSpecPrices = [...(g.specPrices || []), { specificationId: specId, singleSidedPrice: 0, weight: 1.0 }];
                                                              return { ...g, specPrices: newSpecPrices };
                                                            } else {
                                                              const newSpecPrices = (g.specPrices || []).filter(sp => sp.specificationId !== specId);
                                                              const newBaseSpecId = specId === g.inkjetBaseSpecId ? "" : g.inkjetBaseSpecId;
                                                              return { ...g, specPrices: newSpecPrices, inkjetBaseSpecId: newBaseSpecId };
                                                            }
                                                          }),
                                                        }));
                                                      }}
                                                    />
                                                  </td>
                                                  <td className={cn("px-1 py-0.5 text-center font-mono", isBase && "text-green-700 font-semibold")}>
                                                    {spec?.name}
                                                    {isBase && <span className="text-green-600 ml-0.5 text-[8px]">(기준)</span>}
                                                  </td>
                                                  <td className="px-1 py-0.5 text-center">
                                                    <Input
                                                      type="number"
                                                      step="0.1"
                                                      className="h-5 w-10 text-[10px] text-center p-0 bg-gray-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                      value={isIncluded ? (priceData?.weight ?? 1.0) : ""}
                                                      disabled={!isIncluded}
                                                      onChange={(e) => {
                                                        const newWeight = Number(e.target.value) || 1.0;
                                                        const sqInchPrice = group.inkjetBasePrice || 0;
                                                        setSettingForm((prev) => ({
                                                          ...prev,
                                                          priceGroups: prev.priceGroups.map(g => {
                                                            if (g.id !== group.id) return g;
                                                            const newSpecPrices = (g.specPrices || specPrices).map(sp => {
                                                              if (sp.specificationId !== specId) return sp;
                                                              const targetSpec = specifications?.find((s) => s.id === specId);
                                                              if (!targetSpec || !sqInchPrice) {
                                                                return { ...sp, weight: newWeight };
                                                              }
                                                              const targetArea = Number(targetSpec.widthInch) * Number(targetSpec.heightInch);
                                                              const calculatedPrice = targetArea * sqInchPrice * newWeight;
                                                              return { ...sp, weight: newWeight, singleSidedPrice: Math.max(0, Math.round(calculatedPrice)) };
                                                            });
                                                            return { ...g, specPrices: newSpecPrices };
                                                          }),
                                                        }));
                                                      }}
                                                    />
                                                  </td>
                                                  <td className="px-1 py-0.5 text-center">
                                                    <Input
                                                      type="number"
                                                      className={cn("h-5 w-14 text-[10px] text-center p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", isBase ? "bg-green-100" : "bg-gray-50")}
                                                      value={isIncluded ? (priceData?.singleSidedPrice || "") : ""}
                                                      disabled={!isIncluded}
                                                      onChange={(e) => {
                                                        const value = Number(e.target.value) || 0;
                                                        setSettingForm((prev) => ({
                                                          ...prev,
                                                          priceGroups: prev.priceGroups.map(g => {
                                                            if (g.id !== group.id) return g;
                                                            const newSpecPrices = (g.specPrices || specPrices).map(sp =>
                                                              sp.specificationId === specId ? { ...sp, singleSidedPrice: value } : sp
                                                            );
                                                            return { ...g, specPrices: newSpecPrices };
                                                          }),
                                                        }));
                                                      }}
                                                      placeholder="0"
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
                          )}
                        </div>
                      </>
                    )}
                  </>
                ) : settingForm.pricingType === "nup_page_range" ? (
                  <>
                    {/* [제본전용] 구간별 Nup/1p가격 */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-end">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const method = settingForm.printMethod;
                              const nupSpecs = specifications?.filter(s => {
                                if (!s.nup) return false;
                                if (method === 'indigo') return s.forIndigo;
                                if (method === 'inkjet') return s.forInkjet;
                                if (method === 'album') return s.forAlbum;
                                if (method === 'frame') return s.forFrame;
                                if (method === 'booklet') return s.forBooklet;
                                return true;
                              }) || [];
                              const defaultRangePrices: Record<number, number> = {};
                              settingForm.pageRanges.forEach(p => { defaultRangePrices[p] = 0; });
                              setSettingForm(prev => ({
                                ...prev,
                                specificationIds: nupSpecs.map(s => s.id),
                                nupPageRanges: nupSpecs.map(s => {
                                  const existing = prev.nupPageRanges.find(p => p.specificationId === s.id);
                                  return existing || { specificationId: s.id, pricePerPage: 0, rangePrices: { ...defaultRangePrices } };
                                }),
                              }));
                            }}
                          >
                            전체선택
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSettingForm(prev => ({
                                ...prev,
                                specificationIds: [],
                                nupPageRanges: [],
                              }));
                            }}
                          >
                            전체해제
                          </Button>
                        </div>
                      </div>

                      {/* 페이지 구간 설정 */}
                      <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium text-blue-700">페이지 구간 설정</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-blue-600"
                            onClick={() => {
                              const newRange = Math.max(...settingForm.pageRanges) + 10;
                              setSettingForm(prev => ({
                                ...prev,
                                pageRanges: [...prev.pageRanges, newRange].sort((a, b) => a - b),
                              }));
                            }}
                          >
                            + 구간 추가
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {settingForm.pageRanges.map((range, idx) => (
                            <div key={`range-${idx}`} className="flex items-center gap-1 bg-white rounded px-2 py-1 border border-blue-200">
                              <Input
                                type="number"
                                value={range}
                                onChange={(e) => {
                                  const newValue = Number(e.target.value);
                                  setSettingForm(prev => ({
                                    ...prev,
                                    pageRanges: prev.pageRanges.map((r, i) => i === idx ? newValue : r),
                                  }));
                                }}
                                onBlur={() => {
                                  // 입력 완료 시 정렬
                                  setSettingForm(prev => ({
                                    ...prev,
                                    pageRanges: [...prev.pageRanges].sort((a, b) => a - b),
                                  }));
                                }}
                                className="h-6 w-14 text-center text-sm font-mono border-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="text-xs text-blue-600">p</span>
                              {settingForm.pageRanges.length > 2 && (
                                <button
                                  type="button"
                                  className="text-red-400 hover:text-red-600 ml-1"
                                  onClick={() => {
                                    setSettingForm(prev => ({
                                      ...prev,
                                      pageRanges: prev.pageRanges.filter((_, i) => i !== idx),
                                    }));
                                  }}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Nup 그룹별 단가 설정 */}
                      <div className="border rounded-lg p-4 max-h-[500px] overflow-y-auto">

                        {/* 테이블 헤더 - Nup 그룹 기반 */}
                        <div
                          className="grid gap-0 pb-2 border-b mb-2 text-xs font-medium text-gray-600 sticky top-0 bg-white items-center"
                          style={{
                            gridTemplateColumns: `28px 60px minmax(120px, 1fr) 80px ${settingForm.pageRanges.map(() => '80px').join(' ')}`
                          }}
                        >
                          <Checkbox
                            checked={(() => {
                              const method = settingForm.printMethod;
                              const filtered = specifications?.filter(s => {
                                if (!s.nup) return false;
                                if (method === 'indigo') return s.forIndigo && s.nup;
                                if (method === 'inkjet') return s.forInkjet;
                                if (method === 'album') return s.forAlbum;
                                if (method === 'frame') return s.forFrame;
                                if (method === 'booklet') return s.forBooklet;
                                return true;
                              }) || [];
                              // Nup 그룹별로 대표 1개씩
                              const nupOrder = ['1++up', '1+up', '1up', '2up', '4up', '8up'];
                              const nupMap = new Map<string, typeof filtered[0]>();
                              filtered.forEach(s => {
                                if (s.nup && !nupMap.has(s.nup)) nupMap.set(s.nup, s);
                              });
                              const displaySpecs = nupOrder.filter(nup => nupMap.has(nup)).map(nup => nupMap.get(nup)!);
                              return displaySpecs.length > 0 && displaySpecs.every(s => settingForm.specificationIds.includes(s.id));
                            })()}
                            onCheckedChange={(checked) => {
                              const method = settingForm.printMethod;
                              const filtered = specifications?.filter(s => {
                                if (!s.nup) return false;
                                if (method === 'indigo') return s.forIndigo && s.nup;
                                if (method === 'inkjet') return s.forInkjet;
                                if (method === 'album') return s.forAlbum;
                                if (method === 'frame') return s.forFrame;
                                if (method === 'booklet') return s.forBooklet;
                                return true;
                              }) || [];
                              // Nup 그룹별로 대표 1개씩
                              const nupOrder = ['1++up', '1+up', '1up', '2up', '4up', '8up'];
                              const nupMap = new Map<string, typeof filtered[0]>();
                              filtered.forEach(s => {
                                if (s.nup && !nupMap.has(s.nup)) nupMap.set(s.nup, s);
                              });
                              const displaySpecs = nupOrder.filter(nup => nupMap.has(nup)).map(nup => nupMap.get(nup)!);
                              const defaultRangePrices: Record<number, number> = {};
                              settingForm.pageRanges.forEach(p => { defaultRangePrices[p] = 0; });
                              if (checked) {
                                setSettingForm(prev => ({
                                  ...prev,
                                  specificationIds: displaySpecs.map(s => s.id),
                                  nupPageRanges: displaySpecs.map(s => {
                                    const existing = prev.nupPageRanges.find(p => p.specificationId === s.id);
                                    return existing || { specificationId: s.id, pricePerPage: 0, rangePrices: { ...defaultRangePrices } };
                                  }),
                                }));
                              } else {
                                setSettingForm(prev => ({
                                  ...prev,
                                  specificationIds: [],
                                  nupPageRanges: [],
                                }));
                              }
                            }}
                          />
                          <span>Nup</span>
                          <span>규격 목록</span>
                          <span className="text-right pr-2">1p당</span>
                          {settingForm.pageRanges.map(range => (
                            <span key={range} className="text-center">{range}p</span>
                          ))}
                        </div>

                        <div className="space-y-1">
                          {(() => {
                            const method = settingForm.printMethod;
                            const filtered = specifications?.filter(s => {
                              if (!s.nup) return false;
                              if (method === 'indigo') return s.forIndigo && s.nup;
                              if (method === 'inkjet') return s.forInkjet;
                              if (method === 'album') return s.forAlbum;
                              if (method === 'frame') return s.forFrame;
                              if (method === 'booklet') return s.forBooklet;
                              return true;
                            }) || [];

                            // Nup별로 그룹화
                            const nupOrder = ['1++up', '1+up', '1up', '2up', '4up', '8up'];
                            const nupGroups = new Map<string, typeof filtered>();
                            filtered.forEach(s => {
                              if (s.nup) {
                                const group = nupGroups.get(s.nup) || [];
                                group.push(s);
                                nupGroups.set(s.nup, group);
                              }
                            });

                            // Nup 순서대로 정렬
                            const sortedNups = nupOrder.filter(nup => nupGroups.has(nup));

                            return sortedNups.map((nup) => {
                              const specsInGroup = nupGroups.get(nup) || [];
                              const representativeSpec = specsInGroup[0];
                              if (!representativeSpec) return null;

                              const isSelected = settingForm.specificationIds.includes(representativeSpec.id);
                              const rangeData = settingForm.nupPageRanges.find(p => p.specificationId === representativeSpec.id);
                              const pricePerPage = rangeData?.pricePerPage || 0;
                              const rangePrices = rangeData?.rangePrices || {};

                              // 규격 목록 문자열 (예: 5x7, 7x5, 6x8, 8x6)
                              const specNames = specsInGroup.map(s => s.name).join(', ');

                              return (
                                <div
                                  key={nup}
                                  className={cn(
                                    "grid gap-0 py-1 items-center",
                                    isSelected && "bg-amber-50/50"
                                  )}
                                  style={{
                                    gridTemplateColumns: `28px 60px minmax(120px, 1fr) 80px ${settingForm.pageRanges.map(() => '80px').join(' ')}`
                                  }}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      setSettingForm(prev => {
                                        const defaultRangePrices: Record<number, number> = {};
                                        prev.pageRanges.forEach(p => { defaultRangePrices[p] = 0; });
                                        if (checked) {
                                          return {
                                            ...prev,
                                            specificationIds: [...prev.specificationIds, representativeSpec.id],
                                            nupPageRanges: [...prev.nupPageRanges, {
                                              specificationId: representativeSpec.id,
                                              pricePerPage: 0,
                                              rangePrices: defaultRangePrices
                                            }],
                                          };
                                        } else {
                                          return {
                                            ...prev,
                                            specificationIds: prev.specificationIds.filter(id => id !== representativeSpec.id),
                                            nupPageRanges: prev.nupPageRanges.filter(p => p.specificationId !== representativeSpec.id),
                                          };
                                        }
                                      });
                                    }}
                                  />
                                  <span className="text-sm font-semibold text-violet-700">{nup}</span>
                                  <span className="text-xs text-gray-500 truncate" title={specNames}>{specNames}</span>

                                  {isSelected ? (
                                    <>
                                      {/* 1p당 가격 입력 - 변경시 나머지 구간 자동 계산 */}
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={pricePerPage || ''}
                                        onChange={(e) => {
                                          const value = Number(e.target.value);
                                          const firstRange = settingForm.pageRanges[0] || 20;
                                          setSettingForm(prev => {
                                            const currentData = prev.nupPageRanges.find(p => p.specificationId === representativeSpec.id);
                                            const firstPrice = currentData?.rangePrices?.[firstRange] || 0;
                                            const newRangePrices: Record<number, number> = {};
                                            prev.pageRanges.forEach((range, idx) => {
                                              if (idx === 0) {
                                                newRangePrices[range] = firstPrice;
                                              } else {
                                                newRangePrices[range] = Math.round((firstPrice + ((range - firstRange) * value)) * 100) / 100;
                                              }
                                            });
                                            return {
                                              ...prev,
                                              nupPageRanges: prev.nupPageRanges.map(p =>
                                                p.specificationId === representativeSpec.id
                                                  ? { ...p, pricePerPage: value, rangePrices: newRangePrices }
                                                  : p
                                              ),
                                            };
                                          });
                                        }}
                                        className="h-7 text-right font-mono text-sm pr-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="0"
                                      />
                                      {/* 첫 구간 가격 입력 - 변경시 나머지 구간 자동 계산 */}
                                      {settingForm.pageRanges.map((range, idx) => (
                                        idx === 0 ? (
                                          <Input
                                            key={range}
                                            type="number"
                                            step="0.01"
                                            value={rangePrices[range] || ''}
                                            onChange={(e) => {
                                              const value = Number(e.target.value);
                                              const firstRange = settingForm.pageRanges[0] || 20;
                                              setSettingForm(prev => {
                                                const currentData = prev.nupPageRanges.find(p => p.specificationId === representativeSpec.id);
                                                const currentPricePerPage = currentData?.pricePerPage || 0;
                                                const newRangePrices: Record<number, number> = {};
                                                prev.pageRanges.forEach((r, i) => {
                                                  if (i === 0) {
                                                    newRangePrices[r] = value;
                                                  } else {
                                                    newRangePrices[r] = Math.round((value + ((r - firstRange) * currentPricePerPage)) * 100) / 100;
                                                  }
                                                });
                                                return {
                                                  ...prev,
                                                  nupPageRanges: prev.nupPageRanges.map(p =>
                                                    p.specificationId === representativeSpec.id
                                                      ? { ...p, rangePrices: newRangePrices }
                                                      : p
                                                  ),
                                                };
                                              });
                                            }}
                                            className="h-7 text-center font-mono text-sm bg-blue-50 border-blue-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            placeholder="0"
                                          />
                                        ) : (
                                          <span
                                            key={range}
                                            className="h-7 flex items-center justify-center font-mono text-sm text-gray-600 bg-gray-50 rounded border"
                                          >
                                            {formatNumber(rangePrices[range])}
                                          </span>
                                        )
                                      ))}
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-right text-gray-400 text-sm pr-2">-</span>
                                      {settingForm.pageRanges.map(range => (
                                        <span key={range} className="text-center text-gray-400 text-sm">-</span>
                                      ))}
                                    </>
                                  )}
                                </div>
                              );
                            });
                          })()}
                          {(!specifications || specifications.filter(s => {
                            if (!s.nup) return false;
                            const method = settingForm.printMethod;
                            if (method === 'indigo') return s.forIndigo;
                            if (method === 'inkjet') return s.forInkjet;
                            if (method === 'album') return s.forAlbum;
                            if (method === 'frame') return s.forFrame;
                            if (method === 'booklet') return s.forBooklet;
                            return true;
                          }).length === 0) && (
                              <p className="text-center text-muted-foreground py-4">
                                {PRINT_METHOD_LABELS[settingForm.printMethod]} 인쇄방식에 해당하는 Nup 규격이 없습니다.
                                규격 관리에서 해당 인쇄방식과 Nup 값을 설정해주세요.
                              </p>
                            )}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        선택된 Nup 그룹: {settingForm.specificationIds.length}개 (같은 Nup의 모든 규격에 동일 가격 적용)
                      </p>
                    </div>
                  </>
                ) : settingForm.pricingType === "finishing_spec_nup" ? (
                  <>
                    {/* [후가공전용] 규격별 Nup/1p단가 - Nup 그룹별로 표시 (모든 Nup 사용) */}
                    <div className="border rounded-lg p-4 max-h-[350px] overflow-y-auto">
                      {/* Nup 그룹별 표시 */}
                      <div className="space-y-0">
                        {(() => {
                          const filteredSpecs = getFilteredSpecifications().filter(s => s.nup);
                          const nupGroups = groupSpecificationsByNup(filteredSpecs);

                          if (nupGroups.size === 0) {
                            return (
                              <p className="text-center text-muted-foreground py-4">
                                해당 용도의 Nup 규격이 없습니다.
                              </p>
                            );
                          }

                          return Array.from(nupGroups.entries()).map(([nup, specs]) => {
                            return (
                              <div key={nup} className="py-2 border-b last:border-0">
                                <div className="flex items-center gap-3">
                                  {/* Nup 뱃지 - 고정 너비 */}
                                  <div className="w-14 shrink-0">
                                    <Badge variant="secondary" className="bg-violet-100 text-violet-700 font-semibold w-full justify-center">
                                      {nup}
                                    </Badge>
                                  </div>
                                  {/* 단가 입력 필드 - 고정 너비 */}
                                  <div className="w-24 shrink-0 flex items-center gap-1">
                                    <Input
                                      type="number"
                                      placeholder="단가"
                                      className="w-full h-7 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      value={settingForm.nupPageRanges?.find(r => r.specificationId === specs[0]?.id)?.pricePerPage || ""}
                                      onChange={(e) => {
                                        const price = Number(e.target.value) || 0;
                                        setSettingForm(prev => {
                                          const existing = prev.nupPageRanges || [];
                                          // 해당 Nup 그룹의 모든 규격에 동일한 가격 적용
                                          const updatedRanges = [...existing];
                                          specs.forEach(spec => {
                                            const idx = updatedRanges.findIndex(r => r.specificationId === spec.id);
                                            if (idx >= 0) {
                                              updatedRanges[idx] = { ...updatedRanges[idx], pricePerPage: price };
                                            } else {
                                              updatedRanges.push({
                                                specificationId: spec.id,
                                                pricePerPage: price,
                                                rangePrices: {},
                                              });
                                            }
                                          });
                                          return { ...prev, nupPageRanges: updatedRanges };
                                        });
                                      }}
                                    />
                                  </div>
                                  {/* 규격 목록 - 나머지 공간 */}
                                  <div className="flex-1 text-xs text-gray-500 truncate">
                                    {specs.map(s => s.name).join(", ")}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </>
                ) : settingForm.pricingType === "finishing_length" ? (
                  <>
                    {/* [후가공전용] 길이별단가 */}
                    <div className="space-y-4">
                      {/* 길이 단위 선택 */}
                      <div className="flex items-center gap-4">
                        <Label className="w-20">길이 단위</Label>
                        <Select
                          value={settingForm.lengthUnit}
                          onValueChange={(value: 'cm' | 'mm') =>
                            setSettingForm(prev => ({ ...prev, lengthUnit: value }))
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cm">cm (센티미터)</SelectItem>
                            <SelectItem value="mm">mm (밀리미터)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 구간별 단가 설정 */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-sm font-medium">구간별 단가</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSettingForm(prev => {
                                const ranges = prev.lengthPriceRanges || [];
                                const lastMax = ranges.length > 0 ? ranges[ranges.length - 1].maxLength : 0;
                                return {
                                  ...prev,
                                  lengthPriceRanges: [
                                    ...ranges,
                                    { minLength: lastMax, maxLength: lastMax + 100, price: 0 }
                                  ]
                                };
                              });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            구간 추가
                          </Button>
                        </div>

                        {settingForm.lengthPriceRanges.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4 text-sm">
                            구간을 추가하여 길이별 단가를 설정하세요.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {settingForm.lengthPriceRanges.map((range, idx) => (
                              <div key={idx} className="flex items-center gap-2 py-2 border-b last:border-0">
                                <Input
                                  type="number"
                                  placeholder="시작"
                                  className="w-20 h-8 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={range.minLength || ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setSettingForm(prev => ({
                                      ...prev,
                                      lengthPriceRanges: prev.lengthPriceRanges.map((r, i) =>
                                        i === idx ? { ...r, minLength: val } : r
                                      )
                                    }));
                                  }}
                                />
                                <span className="text-sm text-gray-500">~</span>
                                <Input
                                  type="number"
                                  placeholder="끝"
                                  className="w-20 h-8 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={range.maxLength || ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setSettingForm(prev => ({
                                      ...prev,
                                      lengthPriceRanges: prev.lengthPriceRanges.map((r, i) =>
                                        i === idx ? { ...r, maxLength: val } : r
                                      )
                                    }));
                                  }}
                                />
                                <span className="text-sm text-gray-500 w-8">{settingForm.lengthUnit}</span>
                                <span className="text-sm text-gray-500">:</span>
                                <Input
                                  type="number"
                                  placeholder="단가"
                                  className="w-24 h-8 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={range.price || ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setSettingForm(prev => ({
                                      ...prev,
                                      lengthPriceRanges: prev.lengthPriceRanges.map((r, i) =>
                                        i === idx ? { ...r, price: val } : r
                                      )
                                    }));
                                  }}
                                />
                                <span className="text-sm text-gray-500">원</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    setSettingForm(prev => ({
                                      ...prev,
                                      lengthPriceRanges: prev.lengthPriceRanges.filter((_, i) => i !== idx)
                                    }));
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : settingForm.pricingType === "finishing_area" ? (
                  <>
                    {/* [후가공전용] 면적별단가 */}
                    <div className="space-y-4">
                      {/* 길이 단위 선택 */}
                      <div className="flex items-center gap-4">
                        <Label className="w-20">길이 단위</Label>
                        <Select
                          value={settingForm.areaUnit}
                          onValueChange={(value: 'mm' | 'cm' | 'm') =>
                            setSettingForm(prev => ({ ...prev, areaUnit: value }))
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mm">mm (밀리미터)</SelectItem>
                            <SelectItem value="cm">cm (센티미터)</SelectItem>
                            <SelectItem value="m">m (미터)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 구간별 단가 설정 */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-sm font-medium">구간별 단가 (가로×세로 기준)</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSettingForm(prev => {
                                const ranges = prev.areaPriceRanges || [];
                                return {
                                  ...prev,
                                  areaPriceRanges: [
                                    ...ranges,
                                    { maxWidth: 0, maxHeight: 0, area: 0, price: 0 }
                                  ]
                                };
                              });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            구간 추가
                          </Button>
                        </div>

                        {settingForm.areaPriceRanges.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4 text-sm">
                            구간을 추가하여 가로×세로 규격별 단가를 설정하세요.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {/* 헤더 */}
                            <div className="flex items-center gap-2 py-1 text-xs text-gray-500 font-medium border-b">
                              <span className="w-20 text-center">최대 가로</span>
                              <span className="w-4"></span>
                              <span className="w-20 text-center">최대 세로</span>
                              <span className="w-10"></span>
                              <span className="w-24 text-center">면적</span>
                              <span className="w-4"></span>
                              <span className="w-24 text-center">단가</span>
                              <span className="w-8"></span>
                            </div>
                            {settingForm.areaPriceRanges.map((range, idx) => (
                              <div key={idx} className="flex items-center gap-2 py-2 border-b last:border-0">
                                <Input
                                  type="number"
                                  placeholder="가로"
                                  className="w-20 h-8 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={range.maxWidth || ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setSettingForm(prev => ({
                                      ...prev,
                                      areaPriceRanges: prev.areaPriceRanges.map((r, i) =>
                                        i === idx ? { ...r, maxWidth: val, area: val * r.maxHeight } : r
                                      )
                                    }));
                                  }}
                                />
                                <span className="text-sm text-gray-500">×</span>
                                <Input
                                  type="number"
                                  placeholder="세로"
                                  className="w-20 h-8 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={range.maxHeight || ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setSettingForm(prev => ({
                                      ...prev,
                                      areaPriceRanges: prev.areaPriceRanges.map((r, i) =>
                                        i === idx ? { ...r, maxHeight: val, area: r.maxWidth * val } : r
                                      )
                                    }));
                                  }}
                                />
                                <span className="text-sm text-gray-500 w-10">{settingForm.areaUnit}</span>
                                <span className="text-sm text-gray-500">=</span>
                                <span className="w-24 h-8 flex items-center justify-end text-sm text-blue-600 font-medium bg-blue-50 rounded px-2">
                                  {((range.maxWidth || 0) * (range.maxHeight || 0)).toLocaleString()}{settingForm.areaUnit}²
                                </span>
                                <span className="text-sm text-gray-500">:</span>
                                <Input
                                  type="number"
                                  placeholder="단가"
                                  className="w-24 h-8 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={range.price || ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setSettingForm(prev => ({
                                      ...prev,
                                      areaPriceRanges: prev.areaPriceRanges.map((r, i) =>
                                        i === idx ? { ...r, price: val } : r
                                      )
                                    }));
                                  }}
                                />
                                <span className="text-sm text-gray-500">원</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    setSettingForm(prev => ({
                                      ...prev,
                                      areaPriceRanges: prev.areaPriceRanges.filter((_, i) => i !== idx)
                                    }));
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 나머지: 규격 선택 */}
                    <div className="flex items-center justify-between">
                      <Label>규격선택</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAllSpecifications}
                        >
                          전체선택
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeselectAllSpecifications}
                        >
                          전체해제
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>규격 용도 선택</Label>
                      <Select
                        value={settingForm.specUsageType}
                        onValueChange={(value) =>
                          setSettingForm((prev) => ({
                            ...prev,
                            specUsageType: value as typeof prev.specUsageType,
                            specificationIds: [],
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="규격 용도 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체 규격</SelectItem>
                          <SelectItem value="indigo">인디고출력</SelectItem>
                          <SelectItem value="inkjet">잉크젯출력</SelectItem>
                          <SelectItem value="album">앨범전용</SelectItem>
                          <SelectItem value="frame">액자전용</SelectItem>
                          <SelectItem value="booklet">인쇄책자전용</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border rounded-lg p-4 max-h-[350px] overflow-y-auto">
                      {/* 전체 선택 헤더 */}
                      <div className="flex items-center gap-2 pb-2 mb-2 border-b">
                        <Checkbox
                          checked={getFilteredSpecifications().length > 0 && getFilteredSpecifications().every(s => settingForm.specificationIds.includes(s.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleSelectAllSpecifications();
                            } else {
                              handleDeselectAllSpecifications();
                            }
                          }}
                        />
                        <Label className="text-sm font-medium cursor-pointer">전체 선택</Label>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {getFilteredSpecifications().map((spec) => (
                          <div key={spec.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`spec-${spec.id}`}
                              checked={settingForm.specificationIds.includes(spec.id)}
                              onCheckedChange={() => handleToggleSpecification(spec.id)}
                            />
                            <Label
                              htmlFor={`spec-${spec.id}`}
                              className="text-sm font-mono cursor-pointer"
                            >
                              {spec.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {getFilteredSpecifications().length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          해당 용도의 규격이 없습니다.
                        </p>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      선택된 규격: {settingForm.specificationIds.length}개
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsSettingDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveSetting}>
              {editingSetting ? "수정" : "추가"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>삭제 확인</DialogTitle>
            <DialogDescription>
              {deletingItem?.type === "group"
                ? `"${deletingItem.item.name}" 그룹을 삭제하시겠습니까?`
                : `이 설정을 삭제하시겠습니까?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 이동 다이얼로그 */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {moveTarget?.type === "group" ? "그룹 이동" : "설정 이동"}
            </DialogTitle>
            <DialogDescription>
              &quot;{moveTarget?.type === "group"
                ? (moveTarget?.item as ProductionGroup)?.name
                : (moveTarget?.item as ProductionSetting)?.settingName || (moveTarget?.item as ProductionSetting)?.codeName || "설정"
              }&quot; 항목을 이동할 대상을 선택하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto border rounded-lg p-3 bg-gray-50/50 max-h-[50vh]">
            {groupTree && (
              <MoveTargetTree
                groups={groupTree}
                moveType={moveTarget?.type || "setting"}
                movingItemId={
                  moveTarget?.type === "group"
                    ? (moveTarget.item as ProductionGroup).id
                    : (moveTarget?.item as ProductionSetting)?.groupId || ""
                }
                movingGroupDepth={
                  moveTarget?.type === "group"
                    ? (moveTarget.item as ProductionGroup).depth
                    : undefined
                }
                selectedTargetId={selectedTargetGroupId}
                onSelectTarget={setSelectedTargetGroupId}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleMoveToGroup}
              disabled={!selectedTargetGroupId || moveGroupToMutation.isPending || moveSettingToMutation.isPending}
            >
              {(moveGroupToMutation.isPending || moveSettingToMutation.isPending) ? "이동 중..." : "이동"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 단가 조정 다이얼로그 */}
      <Dialog open={isPriceAdjustDialogOpen} onOpenChange={setIsPriceAdjustDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>인디고 단가조정 구간</DialogTitle>
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
                  // 마지막 무한 구간 앞에 새 구간 삽입
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
                  const prevMax = idx === 0 ? 0 : priceAdjustRanges[idx - 1].maxPrice;
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
    </div>
  );
}

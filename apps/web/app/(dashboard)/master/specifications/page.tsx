"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, ChevronUp, ChevronDown, RectangleHorizontal, RectangleVertical, Square, Ruler } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

// ==================== CIP4 JDF LayoutIntent 타입 ====================
type JdfPageOrder = 'Booklet' | 'Sequential' | 'Spread';
type JdfSides = 'OneSided' | 'TwoSidedHeadToHead' | 'TwoSidedHeadToFoot';
type JdfSpreadType = 'Single' | 'Spread';

interface Specification {
  id: string;
  code: string;
  name: string;
  widthInch: number;
  heightInch: number;
  widthMm: number;
  heightMm: number;
  orientation: "landscape" | "portrait" | "square";
  pairId?: string;
  usageIndigo: boolean;
  usageInkjet: boolean;
  usageAlbum: boolean;
  usageIndigoAlbum: boolean;
  usageFrame: boolean;
  usageBooklet: boolean;
  squareMeters?: number;
  description?: string;
  nup?: string;  // 인디고 Nup (별칭: "1up", "1+up", "1++up", "2up", "4up" 등)
  sortOrder: number;
  isActive: boolean;

  // ========== CIP4 JDF LayoutIntent 필드 ==========
  jdfFinishedWidth?: number;     // 완성 가로 (mm)
  jdfFinishedHeight?: number;    // 완성 세로 (mm)
  jdfBleedTop?: number;          // 도련 상단 (mm)
  jdfBleedBottom?: number;       // 도련 하단 (mm)
  jdfBleedLeft?: number;         // 도련 좌측 (mm)
  jdfBleedRight?: number;        // 도련 우측 (mm)
  jdfTrimWidth?: number;         // 재단 가로 (mm)
  jdfTrimHeight?: number;        // 재단 세로 (mm)
  jdfPageOrder?: JdfPageOrder;   // 페이지 순서
  jdfSides?: JdfSides;           // 인쇄 면
  jdfNumberUpX?: number;         // 임포지션 가로 배치 수
  jdfNumberUpY?: number;         // 임포지션 세로 배치 수
  jdfSpreadType?: JdfSpreadType; // 스프레드 유형
}

// 인디고 인쇄 면적 (mm)
const INDIGO_PRINT_WIDTH = 310;  // 인쇄 가능 폭 (mm)
const INDIGO_PRINT_HEIGHT = 450; // 인쇄 가능 높이 (mm)

// Nup 계산 함수 - 인디고 인쇄면적(310x450mm)에 몇 장 들어가는지 계산
function calculateNup(widthMm: number, heightMm: number): number {
  if (widthMm <= 0 || heightMm <= 0) return 0;

  // 방향1: 원본 방향 그대로
  const cols1 = Math.floor(INDIGO_PRINT_WIDTH / widthMm);
  const rows1 = Math.floor(INDIGO_PRINT_HEIGHT / heightMm);
  const count1 = cols1 * rows1;

  // 방향2: 90도 회전 (가로/세로 바꿈)
  const cols2 = Math.floor(INDIGO_PRINT_WIDTH / heightMm);
  const rows2 = Math.floor(INDIGO_PRINT_HEIGHT / widthMm);
  const count2 = cols2 * rows2;

  // 더 많이 들어가는 방향 선택
  return Math.max(count1, count2);
}

// Nup 숫자를 문자열 별칭으로 변환 (예: 1 -> "1up")
function nupToString(nup: number): string {
  return `${nup}up`;
}

// Nup 별칭에서 숫자 추출 (예: "1+up" -> 1, "2up" -> 2)
function parseNupNumber(nup: string): number {
  const match = nup.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

interface SpecificationForm {
  name: string;
  widthInch: number;
  heightInch: number;
  widthMm: number;
  heightMm: number;
  orientation: "landscape" | "portrait" | "square";
  usageIndigo: boolean;
  usageInkjet: boolean;
  usageAlbum: boolean;
  usageIndigoAlbum: boolean;
  usageFrame: boolean;
  usageBooklet: boolean;
  squareMeters?: number;
  description: string;
  nup?: string;  // 인디고 Nup 별칭 ("1up", "1+up", "1++up", "2up", "4up" 등)
  createPair: boolean;
  // CIP4 JDF LayoutIntent 필드
  jdfFinishedWidth?: number;
  jdfFinishedHeight?: number;
  jdfBleedTop?: number;
  jdfBleedBottom?: number;
  jdfBleedLeft?: number;
  jdfBleedRight?: number;
  jdfTrimWidth?: number;
  jdfTrimHeight?: number;
  jdfPageOrder?: string;
  jdfSides?: string;
  jdfNumberUpX?: number;
  jdfNumberUpY?: number;
  jdfSpreadType?: string;
}

const defaultForm: SpecificationForm = {
  name: "",
  widthInch: 0,
  heightInch: 0,
  widthMm: 0,
  heightMm: 0,
  orientation: "landscape",
  usageIndigo: false,
  usageInkjet: false,
  usageAlbum: false,
  usageIndigoAlbum: false,
  usageFrame: false,
  usageBooklet: false,
  description: "",
  nup: undefined,
  createPair: true,
  // JDF LayoutIntent 기본값
  jdfBleedTop: 3,
  jdfBleedBottom: 3,
  jdfBleedLeft: 3,
  jdfBleedRight: 3,
  jdfPageOrder: "Booklet",
  jdfSides: "TwoSidedHeadToHead",
  jdfNumberUpX: 1,
  jdfNumberUpY: 1,
  jdfSpreadType: "Single",
};

const INCH_TO_MM = 25.4;

// ==================== CIP4 JDF LayoutIntent 옵션 ====================
const JDF_PAGE_ORDER_OPTIONS = [
  { value: 'Booklet', label: 'Booklet (책자)' },
  { value: 'Sequential', label: 'Sequential (순차)' },
  { value: 'Spread', label: 'Spread (펼침)' },
];

const JDF_SIDES_OPTIONS = [
  { value: 'OneSided', label: 'OneSided (단면)' },
  { value: 'TwoSidedHeadToHead', label: 'TwoSidedHeadToHead (양면-상하동일)' },
  { value: 'TwoSidedHeadToFoot', label: 'TwoSidedHeadToFoot (양면-상하반전)' },
];

const JDF_SPREAD_TYPE_OPTIONS = [
  { value: 'Single', label: 'Single (단일)' },
  { value: 'Spread', label: 'Spread (펼침)' },
];

export default function SpecificationsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specification | null>(null);
  const [form, setForm] = useState<SpecificationForm>(defaultForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [usageFilters, setUsageFilters] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string>("");

  // 백엔드 응답을 프론트엔드 필드명으로 변환
  const transformApiToForm = (data: any): Specification => ({
    ...data,
    usageIndigo: data.forIndigo,
    usageInkjet: data.forInkjet,
    usageAlbum: data.forAlbum,
    usageIndigoAlbum: data.forIndigoAlbum,
    usageFrame: data.forFrame,
    usageBooklet: data.forBooklet,
  });

  // 규격 목록 조회
  const { data: specifications = [], isLoading } = useQuery({
    queryKey: ["specifications"],
    queryFn: async () => {
      const response = await api.get<any[]>("/specifications");
      return response.map(transformApiToForm);
    },
  });

  // 프론트엔드 필드명을 백엔드 필드명으로 변환
  const transformFormToApi = (data: SpecificationForm) => ({
    name: data.name,
    widthInch: data.widthInch,
    heightInch: data.heightInch,
    widthMm: data.widthMm,
    heightMm: data.heightMm,
    orientation: data.orientation,
    forIndigo: data.usageIndigo,
    forInkjet: data.usageInkjet,
    forAlbum: data.usageAlbum,
    forIndigoAlbum: data.usageIndigoAlbum,
    forFrame: data.usageFrame,
    forBooklet: data.usageBooklet,
    squareMeters: data.squareMeters,
    description: data.description,
    nup: (data.usageIndigo || data.usageInkjet) ? data.nup : undefined,  // 인디고 또는 잉크젯 선택시 Nup 저장 (텍스트 별칭)
    createPair: data.createPair,
    // JDF LayoutIntent 필드
    jdfFinishedWidth: data.jdfFinishedWidth,
    jdfFinishedHeight: data.jdfFinishedHeight,
    jdfBleedTop: data.jdfBleedTop,
    jdfBleedBottom: data.jdfBleedBottom,
    jdfBleedLeft: data.jdfBleedLeft,
    jdfBleedRight: data.jdfBleedRight,
    jdfTrimWidth: data.jdfTrimWidth,
    jdfTrimHeight: data.jdfTrimHeight,
    jdfPageOrder: data.jdfPageOrder,
    jdfSides: data.jdfSides,
    jdfNumberUpX: data.jdfNumberUpX,
    jdfNumberUpY: data.jdfNumberUpY,
    jdfSpreadType: data.jdfSpreadType,
  });

  // 규격 생성
  const createMutation = useMutation({
    mutationFn: async (data: SpecificationForm) => {
      return api.post("/specifications", transformFormToApi(data));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specifications"] });
      toast({ title: "규격이 등록되었습니다." });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "등록 실패", description: error.message });
    },
  });

  // 규격 수정
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SpecificationForm> }) => {
      return api.put(`/specifications/${id}`, transformFormToApi(data as SpecificationForm));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specifications"] });
      toast({ title: "규격이 수정되었습니다." });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "수정 실패", description: error.message });
    },
  });

  // 규격 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/specifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specifications"] });
      toast({ title: "규격이 삭제되었습니다." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "삭제 실패", description: error.message });
    },
  });

  // 규격 순서 변경
  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; sortOrder: number }[]) => {
      return api.post("/specifications/reorder", items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specifications"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "순서 변경 실패", description: error.message });
    },
  });

  const openCreateDialog = () => {
    setEditingSpec(null);
    setForm(defaultForm);
    setValidationError("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (spec: Specification) => {
    setEditingSpec(spec);
    setForm({
      name: spec.name,
      widthInch: Number(spec.widthInch),
      heightInch: Number(spec.heightInch),
      widthMm: Number(spec.widthMm),
      heightMm: Number(spec.heightMm),
      orientation: spec.orientation,
      usageIndigo: spec.usageIndigo,
      usageInkjet: spec.usageInkjet,
      usageAlbum: spec.usageAlbum,
      usageIndigoAlbum: spec.usageIndigoAlbum,
      usageFrame: spec.usageFrame,
      usageBooklet: spec.usageBooklet,
      squareMeters: spec.squareMeters ? Number(spec.squareMeters) : undefined,
      description: spec.description || "",
      nup: spec.nup || undefined,  // 문자열 그대로 사용
      createPair: false,
      // JDF LayoutIntent 필드
      jdfFinishedWidth: spec.jdfFinishedWidth,
      jdfFinishedHeight: spec.jdfFinishedHeight,
      jdfBleedTop: spec.jdfBleedTop ?? 3,
      jdfBleedBottom: spec.jdfBleedBottom ?? 3,
      jdfBleedLeft: spec.jdfBleedLeft ?? 3,
      jdfBleedRight: spec.jdfBleedRight ?? 3,
      jdfTrimWidth: spec.jdfTrimWidth,
      jdfTrimHeight: spec.jdfTrimHeight,
      jdfPageOrder: spec.jdfPageOrder || "Booklet",
      jdfSides: spec.jdfSides || "TwoSidedHeadToHead",
      jdfNumberUpX: spec.jdfNumberUpX ?? 1,
      jdfNumberUpY: spec.jdfNumberUpY ?? 1,
      jdfSpreadType: spec.jdfSpreadType || "Single",
    });
    setValidationError("");
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingSpec(null);
    setForm(defaultForm);
    setValidationError("");
  };

  const handleSubmit = () => {
    setValidationError("");  // 에러 초기화

    if (!form.name) {
      setValidationError("규격명을 입력하세요.");
      return;
    }

    // 중복 규격명 체크
    const duplicateSpec = specifications.find(
      (spec) =>
        spec.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
        spec.id !== editingSpec?.id  // 수정 시 자기 자신은 제외
    );

    if (duplicateSpec) {
      setValidationError(`"${form.name}" 규격명이 이미 존재합니다. 다른 이름을 입력해주세요.`);
      return;
    }

    if (editingSpec) {
      updateMutation.mutate({ id: editingSpec.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  // 방향 자동 계산
  const getOrientation = (width: number, height: number): "landscape" | "portrait" | "square" => {
    if (width > height) return "landscape";
    if (height > width) return "portrait";
    return "square";
  };

  // 인치 -> mm 자동 변환 + 방향 자동 계산 + 인디고시 Nup 자동 계산
  const handleInchChange = (field: "widthInch" | "heightInch", value: number) => {
    const mmField = field === "widthInch" ? "widthMm" : "heightMm";
    const newWidthInch = field === "widthInch" ? value : form.widthInch;
    const newHeightInch = field === "heightInch" ? value : form.heightInch;
    const newWidthMm = field === "widthInch" ? Math.round(value * INCH_TO_MM * 100) / 100 : form.widthMm;
    const newHeightMm = field === "heightInch" ? Math.round(value * INCH_TO_MM * 100) / 100 : form.heightMm;

    setForm({
      ...form,
      [field]: value,
      [mmField]: Math.round(value * INCH_TO_MM * 100) / 100,
      orientation: getOrientation(newWidthInch, newHeightInch),
      // 인디고 체크시 Nup 자동 계산 (mm 기준) - 별칭이 없으면 자동 계산
      nup: form.usageIndigo && newWidthMm > 0 && newHeightMm > 0 && !form.nup
        ? nupToString(calculateNup(newWidthMm, newHeightMm))
        : form.nup,
    });
  };

  // mm -> 인치 자동 변환 + 방향 자동 계산 + 인디고시 Nup 자동 계산
  const handleMmChange = (field: "widthMm" | "heightMm", value: number) => {
    const inchField = field === "widthMm" ? "widthInch" : "heightInch";
    const inchValue = Math.round((value / INCH_TO_MM) * 10000) / 10000;
    const newWidthInch = field === "widthMm" ? inchValue : form.widthInch;
    const newHeightInch = field === "heightMm" ? inchValue : form.heightInch;
    const newWidthMm = field === "widthMm" ? value : form.widthMm;
    const newHeightMm = field === "heightMm" ? value : form.heightMm;

    setForm({
      ...form,
      [field]: value,
      [inchField]: inchValue,
      orientation: getOrientation(newWidthInch, newHeightInch),
      // 인디고 체크시 Nup 자동 계산 (mm 기준) - 별칭이 없으면 자동 계산
      nup: form.usageIndigo && newWidthMm > 0 && newHeightMm > 0 && !form.nup
        ? nupToString(calculateNup(newWidthMm, newHeightMm))
        : form.nup,
    });
  };

  // 인디고 체크박스 변경 핸들러 (Nup 자동 계산)
  const handleIndigoChange = (checked: boolean) => {
    if (checked) {
      // 인디고 체크시 Nup 자동 계산 (mm 기준) - 기존 값이 없으면 자동 계산
      const calculatedNup = form.widthMm > 0 && form.heightMm > 0
        ? nupToString(calculateNup(form.widthMm, form.heightMm))
        : undefined;
      setForm({
        ...form,
        usageIndigo: true,
        nup: form.nup || calculatedNup,
      });
    } else {
      // 인디고 체크 해제시 - 잉크젯이 체크되어 있으면 Nup 유지, 아니면 초기화
      setForm({
        ...form,
        usageIndigo: false,
        nup: form.usageInkjet ? form.nup : undefined,
      });
    }
  };

  // 잉크젯 체크박스 변경 핸들러
  const handleInkjetChange = (checked: boolean) => {
    if (checked) {
      setForm({
        ...form,
        usageInkjet: true,
      });
    } else {
      // 잉크젯 체크 해제시 - 인디고가 체크되어 있으면 Nup 유지, 아니면 초기화
      setForm({
        ...form,
        usageInkjet: false,
        nup: form.usageIndigo ? form.nup : undefined,
      });
    }
  };

  // 앨범 체크박스 변경 핸들러
  const handleAlbumChange = (checked: boolean) => {
    setForm({
      ...form,
      usageAlbum: checked,
    });
  };

  // 용도 필터 토글 (배타적: 하나만 선택 가능, 같은 것 클릭 시 해제)
  const toggleUsageFilter = (usage: string) => {
    setUsageFilters((prev) =>
      prev.includes(usage) ? [] : [usage]
    );
  };

  // 필터링된 목록 (sortOrder 기준 정렬)
  const filteredSpecs = specifications
    .filter((spec) => {
      // 검색 필터
      const matchesSearch =
        !searchQuery ||
        spec.name.toLowerCase().includes(searchQuery.toLowerCase());

      // 용도 필터 (멀티셀렉트: 선택한 용도 중 하나라도 매칭되면 표시)
      const matchesUsage =
        usageFilters.length === 0 ||
        (usageFilters.includes("indigo") && spec.usageIndigo) ||
        (usageFilters.includes("inkjet") && spec.usageInkjet) ||
        (usageFilters.includes("album") && spec.usageAlbum) ||
        (usageFilters.includes("indigoAlbum") && spec.usageIndigoAlbum) ||
        (usageFilters.includes("frame") && spec.usageFrame) ||
        (usageFilters.includes("booklet") && spec.usageBooklet);

      return matchesSearch && matchesUsage;
    })
    .sort((a, b) => {
      // 크기(면적) 기준 오름차순 정렬
      const areaA = Number(a.widthInch) * Number(a.heightInch);
      const areaB = Number(b.widthInch) * Number(b.heightInch);
      return areaA - areaB;
    });

  const getOrientationLabel = (orientation: string) => {
    switch (orientation) {
      case "landscape":
        return "가로";
      case "portrait":
        return "세로";
      case "square":
        return "정방";
      default:
        return orientation;
    }
  };

  // 상하 이동 (필터링된 목록 기준, 이미 정렬됨)
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const currentSpec = filteredSpecs[index];
    const prevSpec = filteredSpecs[index - 1];

    reorderMutation.mutate([
      { id: currentSpec.id, sortOrder: prevSpec.sortOrder },
      { id: prevSpec.id, sortOrder: currentSpec.sortOrder },
    ]);
  };

  const handleMoveDown = (index: number) => {
    if (index >= filteredSpecs.length - 1) return;
    const currentSpec = filteredSpecs[index];
    const nextSpec = filteredSpecs[index + 1];

    reorderMutation.mutate([
      { id: currentSpec.id, sortOrder: nextSpec.sortOrder },
      { id: nextSpec.id, sortOrder: currentSpec.sortOrder },
    ]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">규격 관리</h1>
          <p className="text-muted-foreground">제품 및 출력물의 규격 정보를 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            규격 추가
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="규격명 검색... (예: 3x5)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.replace(/[^0-9x.]/gi, "").replace(/x+/gi, "x"))}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { key: "indigo", label: "인디고출력" },
                { key: "inkjet", label: "잉크젯출력" },
                { key: "indigoAlbum", label: "인디고앨범" },
                { key: "album", label: "잉크젯앨범" },
                { key: "frame", label: "액자" },
                { key: "booklet", label: "책자" },
              ].map((usage) => (
                <Button
                  key={usage.key}
                  variant={usageFilters.includes(usage.key) ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => toggleUsageFilter(usage.key)}
                  className="h-9 px-3 border-dashed border transition-all"
                >
                  {usage.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 규격 목록 (리스트 레이아웃) */}
      <div className="flex flex-col gap-1">
        {filteredSpecs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-muted/10 text-muted-foreground">
            <Ruler className="h-10 w-10 mb-4 opacity-20" />
            <p>등록된 규격이 없습니다.</p>
          </div>
        ) : (
          filteredSpecs.map((spec, index) => (
            <Card key={spec.id} className="group hover:shadow-md transition-all border-muted hover:border-primary/50 bg-card/50 hover:bg-card">
              <CardContent className="py-1 px-3 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                {/* 1. 순서 및 이름 */}
                <div className="flex items-center gap-3 min-w-[180px]">
                  <div className="flex flex-col items-center gap-0.5 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => handleMoveUp(index)} disabled={index === 0 || reorderMutation.isPending} className="hover:text-primary" aria-label="Move up"><ChevronUp className="h-3 w-3" /></button>
                    <span className="text-sm font-bold text-primary leading-none">{filteredSpecs.length - index}</span>
                    <button type="button" onClick={() => handleMoveDown(index)} disabled={index === filteredSpecs.length - 1 || reorderMutation.isPending} className="hover:text-primary" aria-label="Move down"><ChevronDown className="h-3 w-3" /></button>
                  </div>
                  <div>
                    <span className="font-bold text-base">{spec.name}</span>
                    {spec.description && <p className="text-xs text-muted-foreground truncate max-w-[150px]">{spec.description}</p>}
                  </div>
                </div>

                {/* 2. 크기 정보 */}
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-4 items-center">
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-light tabular-nums">{parseFloat(Number(spec.widthInch).toFixed(2))}</span>
                      <span className="text-xs text-muted-foreground">x</span>
                      <span className="text-lg font-light tabular-nums">{parseFloat(Number(spec.heightInch).toFixed(2))}</span>
                      <span className="text-xs text-muted-foreground ml-0.5">in</span>
                    </div>
                  </div>
                  <div className="hidden lg:flex flex-col">
                    <div className="text-sm text-muted-foreground tabular-nums">
                      {parseFloat(Number(spec.widthMm).toFixed(1))} x {parseFloat(Number(spec.heightMm).toFixed(1))} mm
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {spec.orientation === "landscape" && <RectangleHorizontal className="h-4 w-4" />}
                    {spec.orientation === "portrait" && <RectangleVertical className="h-4 w-4" />}
                    {spec.orientation === "square" && <Square className="h-4 w-4" />}
                    <span className="text-xs">{getOrientationLabel(spec.orientation)}</span>
                    {spec.usageIndigo && (
                      <Badge variant="secondary" className="font-mono text-[10px] h-5 px-1.5 ml-2 bg-indigo-100 text-indigo-700">
                        {spec.nup || nupToString(calculateNup(Number(spec.widthMm), Number(spec.heightMm)))}
                      </Badge>
                    )}
                    {spec.usageInkjet && !spec.usageIndigo && spec.nup && (
                      <Badge variant="secondary" className="font-mono text-[10px] h-5 px-1.5 ml-2 bg-orange-100 text-orange-700">
                        {spec.nup}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 3. 용도 및 액션 */}
                <div className="flex items-center gap-4 ml-auto">
                  <div className="flex flex-wrap gap-1 justify-end min-w-[120px]">
                    {spec.usageIndigo && <Badge variant="outline" className="text-[10px] px-1.5 bg-indigo-50/50 text-indigo-700 border-indigo-200">인디고출력</Badge>}
                    {spec.usageInkjet && <Badge variant="outline" className="text-[10px] px-1.5 bg-orange-50/50 text-orange-700 border-orange-200">잉크젯출력</Badge>}
                    {spec.usageIndigoAlbum && <Badge variant="outline" className="text-[10px] px-1.5 bg-violet-50/50 text-violet-700 border-violet-200">인디고앨범</Badge>}
                    {spec.usageAlbum && <Badge variant="outline" className="text-[10px] px-1.5 bg-pink-50/50 text-pink-700 border-pink-200">잉크젯앨범</Badge>}
                    {spec.usageFrame && <Badge variant="outline" className="text-[10px] px-1.5 bg-stone-50/50 text-stone-700 border-stone-200">액자</Badge>}
                    {spec.usageBooklet && <Badge variant="outline" className="text-[10px] px-1.5 bg-blue-50/50 text-blue-700 border-blue-200">책자</Badge>}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDialog(spec)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm("정말 삭제하시겠습니까?")) {
                          deleteMutation.mutate(spec.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSpec ? "규격 수정" : "규격 등록"}</DialogTitle>
            <DialogDescription>
              출력물 또는 제품의 규격 정보를 {editingSpec ? "수정" : "등록"}합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">규격명 *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => {
                  // 에러 초기화
                  setValidationError("");
                  // 숫자, x, 점 외의 문자를 제거하고, 연속된 x는 하나로 합침
                  const value = e.target.value.replace(/[^0-9x.]/gi, "").replace(/x+/gi, "x");
                  setForm({ ...form, name: value });

                  // "x"로 구분된 숫자 패턴 감지 (예: "3x5", "8x10")
                  const match = value.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
                  if (match) {
                    const width = parseFloat(match[1]);
                    const height = parseFloat(match[2]);
                    if (width > 0 && height > 0) {
                      const widthMm = Math.round(width * INCH_TO_MM * 100) / 100;
                      const heightMm = Math.round(height * INCH_TO_MM * 100) / 100;
                      setForm(prev => ({
                        ...prev,
                        name: value,
                        widthInch: width,
                        heightInch: height,
                        widthMm,
                        heightMm,
                        orientation: width > height ? "landscape" : height > width ? "portrait" : "square",
                        nup: prev.usageIndigo && !prev.nup ? nupToString(calculateNup(widthMm, heightMm)) : prev.nup,
                      }));
                    }
                  }
                }}
                placeholder="예: 3x5, 8x10"
              />
              {validationError && (
                <p className="text-sm text-red-600 font-medium mt-1 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {validationError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>크기 (인치)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={form.widthInch}
                    onChange={(e) => handleInchChange("widthInch", Number(e.target.value))}
                    placeholder="가로"
                  />
                  <span>x</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.heightInch}
                    onChange={(e) => handleInchChange("heightInch", Number(e.target.value))}
                    placeholder="세로"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>크기 (mm)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={form.widthMm}
                    onChange={(e) => handleMmChange("widthMm", Number(e.target.value))}
                    placeholder="가로"
                  />
                  <span>x</span>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.heightMm}
                    onChange={(e) => handleMmChange("heightMm", Number(e.target.value))}
                    placeholder="세로"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>용도별규격</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="usageIndigo"
                    checked={form.usageIndigo}
                    onCheckedChange={(checked) => handleIndigoChange(!!checked)}
                  />
                  <Label htmlFor="usageIndigo" className="cursor-pointer">인디고출력</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="usageInkjet"
                    checked={form.usageInkjet}
                    onCheckedChange={(checked) => handleInkjetChange(!!checked)}
                  />
                  <Label htmlFor="usageInkjet" className="cursor-pointer">잉크젯출력</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="usageIndigoAlbum"
                    checked={form.usageIndigoAlbum}
                    onCheckedChange={(checked) => setForm({ ...form, usageIndigoAlbum: !!checked })}
                  />
                  <Label htmlFor="usageIndigoAlbum" className="cursor-pointer">인디고앨범</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="usageAlbum"
                    checked={form.usageAlbum}
                    onCheckedChange={(checked) => handleAlbumChange(!!checked)}
                  />
                  <Label htmlFor="usageAlbum" className="cursor-pointer">잉크젯앨범</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="usageFrame"
                    checked={form.usageFrame}
                    onCheckedChange={(checked) => setForm({ ...form, usageFrame: !!checked })}
                  />
                  <Label htmlFor="usageFrame" className="cursor-pointer">액자</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="usageBooklet"
                    checked={form.usageBooklet}
                    onCheckedChange={(checked) => setForm({ ...form, usageBooklet: !!checked })}
                  />
                  <Label htmlFor="usageBooklet" className="cursor-pointer">인쇄책자</Label>
                </div>
              </div>
            </div>

            {/* Nup 입력 (인디고 선택시) */}
            {form.usageIndigo && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-indigo-700">인디고 Nup</Label>
                  <div className="text-xs text-indigo-500">
                    인쇄면적 310×450mm 기준
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="text"
                    value={form.nup || ''}
                    onChange={(e) => setForm({ ...form, nup: e.target.value || undefined })}
                    placeholder="예: 1up, 1+up, 2up"
                    className="w-32 h-11 border-indigo-300 bg-white text-center text-lg font-bold"
                  />
                  <span className="text-sm text-indigo-500">장/1출력</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-auto text-indigo-600 border-indigo-300 hover:bg-indigo-100"
                    onClick={() => {
                      const calculated = calculateNup(form.widthMm, form.heightMm);
                      setForm({ ...form, nup: nupToString(calculated) });
                    }}
                  >
                    자동계산
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs text-indigo-500">별칭 예시:</span>
                  {['1++up', '1+up', '1up', '2up', '4up', '6up', '8up'].map((alias) => (
                    <button
                      key={alias}
                      type="button"
                      onClick={() => setForm({ ...form, nup: alias })}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                        form.nup === alias
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-100'
                      }`}
                    >
                      {alias}
                    </button>
                  ))}
                </div>
                {form.nup && parseNupNumber(form.nup) > 0 && (
                  <p className="text-xs text-indigo-600 mt-2">
                    * 1출력 비용 1,000원 기준 → 장당 {Math.round(1000 / parseNupNumber(form.nup))}원
                  </p>
                )}
              </div>
            )}

            {/* Nup 수동입력 (잉크젯 선택시) */}
            {form.usageInkjet && !form.usageIndigo && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <Label className="text-sm font-medium text-orange-700 mb-2 block">
                  잉크젯 Nup (수동입력)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="text"
                    value={form.nup || ''}
                    onChange={(e) => setForm({ ...form, nup: e.target.value || undefined })}
                    placeholder="예: 1up, 1+up, 4up"
                    className="w-32 h-11 border-orange-300 bg-white"
                  />
                  <span className="text-sm text-orange-700">장/1출력</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs text-orange-500">별칭 예시:</span>
                  {['1++up', '1+up', '1up', '2up', '4up'].map((alias) => (
                    <button
                      key={alias}
                      type="button"
                      onClick={() => setForm({ ...form, nup: alias })}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                        form.nup === alias
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-white text-orange-600 border-orange-300 hover:bg-orange-100'
                      }`}
                    >
                      {alias}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-orange-600 mt-2">
                  잉크젯 인쇄기 규격에 맞는 Nup 값을 직접 입력하세요.
                </p>
                {form.nup && parseNupNumber(form.nup) > 0 && (
                  <p className="text-xs text-orange-600 mt-2">
                    * 1출력 비용 1,000원 기준 → 장당 {Math.round(1000 / parseNupNumber(form.nup))}원
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="규격에 대한 추가 설명"
              />
            </div>

            {/* CIP4 JDF LayoutIntent 섹션 */}
            <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block w-2 h-2 bg-amber-500 rounded-full"></span>
                <h4 className="font-semibold text-amber-800">CIP4 JDF LayoutIntent</h4>
              </div>

              {/* 완성 치수 & 재단 크기 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-amber-700">완성 치수 (FinishedDimensions)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={form.jdfFinishedWidth || form.widthMm || ""}
                      onChange={(e) => setForm({ ...form, jdfFinishedWidth: Number(e.target.value) || undefined })}
                      placeholder="가로 mm"
                      className="h-9 bg-white border-amber-200"
                    />
                    <span className="text-xs text-amber-600">x</span>
                    <Input
                      type="number"
                      step="0.1"
                      value={form.jdfFinishedHeight || form.heightMm || ""}
                      onChange={(e) => setForm({ ...form, jdfFinishedHeight: Number(e.target.value) || undefined })}
                      placeholder="세로 mm"
                      className="h-9 bg-white border-amber-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-amber-700">재단 크기 (TrimSize)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={form.jdfTrimWidth || ""}
                      onChange={(e) => setForm({ ...form, jdfTrimWidth: Number(e.target.value) || undefined })}
                      placeholder="가로 mm"
                      className="h-9 bg-white border-amber-200"
                    />
                    <span className="text-xs text-amber-600">x</span>
                    <Input
                      type="number"
                      step="0.1"
                      value={form.jdfTrimHeight || ""}
                      onChange={(e) => setForm({ ...form, jdfTrimHeight: Number(e.target.value) || undefined })}
                      placeholder="세로 mm"
                      className="h-9 bg-white border-amber-200"
                    />
                  </div>
                </div>
              </div>

              {/* 도련 (Bleed) */}
              <div className="space-y-2">
                <Label className="text-sm text-amber-700">도련 (Bleed) mm</Label>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-amber-600 mb-1">상</span>
                    <Input
                      type="number"
                      step="0.5"
                      value={form.jdfBleedTop ?? 3}
                      onChange={(e) => setForm({ ...form, jdfBleedTop: Number(e.target.value) })}
                      className="w-16 h-9 text-center bg-white border-amber-200"
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-amber-600 mb-1">하</span>
                    <Input
                      type="number"
                      step="0.5"
                      value={form.jdfBleedBottom ?? 3}
                      onChange={(e) => setForm({ ...form, jdfBleedBottom: Number(e.target.value) })}
                      className="w-16 h-9 text-center bg-white border-amber-200"
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-amber-600 mb-1">좌</span>
                    <Input
                      type="number"
                      step="0.5"
                      value={form.jdfBleedLeft ?? 3}
                      onChange={(e) => setForm({ ...form, jdfBleedLeft: Number(e.target.value) })}
                      className="w-16 h-9 text-center bg-white border-amber-200"
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-amber-600 mb-1">우</span>
                    <Input
                      type="number"
                      step="0.5"
                      value={form.jdfBleedRight ?? 3}
                      onChange={(e) => setForm({ ...form, jdfBleedRight: Number(e.target.value) })}
                      className="w-16 h-9 text-center bg-white border-amber-200"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-2 text-amber-700 border-amber-300 hover:bg-amber-100"
                    onClick={() => setForm({ ...form, jdfBleedTop: 3, jdfBleedBottom: 3, jdfBleedLeft: 3, jdfBleedRight: 3 })}
                  >
                    기본값 (3mm)
                  </Button>
                </div>
              </div>

              {/* 페이지 순서, 인쇄면, 스프레드 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-amber-700">페이지 순서 (PageOrder)</Label>
                  <Select
                    value={form.jdfPageOrder || "Booklet"}
                    onValueChange={(v) => setForm({ ...form, jdfPageOrder: v })}
                  >
                    <SelectTrigger className="h-9 bg-white border-amber-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JDF_PAGE_ORDER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-amber-700">인쇄 면 (Sides)</Label>
                  <Select
                    value={form.jdfSides || "TwoSidedHeadToHead"}
                    onValueChange={(v) => setForm({ ...form, jdfSides: v })}
                  >
                    <SelectTrigger className="h-9 bg-white border-amber-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JDF_SIDES_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-amber-700">스프레드 (SpreadType)</Label>
                  <Select
                    value={form.jdfSpreadType || "Single"}
                    onValueChange={(v) => setForm({ ...form, jdfSpreadType: v })}
                  >
                    <SelectTrigger className="h-9 bg-white border-amber-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JDF_SPREAD_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 임포지션 (NumberUp) */}
              <div className="space-y-2">
                <Label className="text-sm text-amber-700">임포지션 (NumberUp)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={form.jdfNumberUpX ?? 1}
                    onChange={(e) => setForm({ ...form, jdfNumberUpX: parseInt(e.target.value) || 1 })}
                    className="w-20 h-9 text-center bg-white border-amber-200"
                  />
                  <span className="text-xs text-amber-600">x</span>
                  <Input
                    type="number"
                    min={1}
                    value={form.jdfNumberUpY ?? 1}
                    onChange={(e) => setForm({ ...form, jdfNumberUpY: parseInt(e.target.value) || 1 })}
                    className="w-20 h-9 text-center bg-white border-amber-200"
                  />
                  <span className="text-sm text-amber-600 ml-2">
                    = {(form.jdfNumberUpX ?? 1) * (form.jdfNumberUpY ?? 1)}up
                  </span>
                </div>
              </div>
            </div>

            {!editingSpec && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createPair"
                  checked={form.createPair}
                  onCheckedChange={(checked) => setForm({ ...form, createPair: !!checked })}
                />
                <Label htmlFor="createPair" className="cursor-pointer">
                  쌍(가로/세로) 자동 생성
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingSpec ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

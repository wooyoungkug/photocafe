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
  usageFrame: boolean;
  usageBooklet: boolean;
  squareMeters?: number;
  description?: string;
  nup?: number;  // 인디고 Nup (숫자)
  sortOrder: number;
  isActive: boolean;
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
  usageFrame: boolean;
  usageBooklet: boolean;
  squareMeters?: number;
  description: string;
  nup?: number;  // 인디고 Nup (숫자)
  createPair: boolean;
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
  usageFrame: false,
  usageBooklet: false,
  description: "",
  nup: undefined,
  createPair: true,
};

const INCH_TO_MM = 25.4;

export default function SpecificationsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specification | null>(null);
  const [form, setForm] = useState<SpecificationForm>(defaultForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [usageFilters, setUsageFilters] = useState<string[]>([]);

  // 백엔드 응답을 프론트엔드 필드명으로 변환
  const transformApiToForm = (data: any): Specification => ({
    ...data,
    usageIndigo: data.forIndigo,
    usageInkjet: data.forInkjet,
    usageAlbum: data.forAlbum,
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
    forFrame: data.usageFrame,
    forBooklet: data.usageBooklet,
    squareMeters: data.squareMeters,
    description: data.description,
    nup: data.usageIndigo ? String(data.nup || 0) : undefined,  // 인디고 선택시에만 Nup 저장
    createPair: data.createPair,
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
      usageFrame: spec.usageFrame,
      usageBooklet: spec.usageBooklet,
      squareMeters: spec.squareMeters ? Number(spec.squareMeters) : undefined,
      description: spec.description || "",
      nup: spec.nup ? Number(spec.nup) : undefined,
      createPair: false,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingSpec(null);
    setForm(defaultForm);
  };

  const handleSubmit = () => {
    if (!form.name) {
      toast({ variant: "destructive", title: "규격명을 입력하세요." });
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
      // 인디고 체크시 Nup 자동 계산 (mm 기준)
      nup: form.usageIndigo && newWidthMm > 0 && newHeightMm > 0
        ? calculateNup(newWidthMm, newHeightMm)
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
      // 인디고 체크시 Nup 자동 계산 (mm 기준)
      nup: form.usageIndigo && newWidthMm > 0 && newHeightMm > 0
        ? calculateNup(newWidthMm, newHeightMm)
        : form.nup,
    });
  };

  // 인디고 체크박스 변경 핸들러 (Nup 자동 계산)
  const handleIndigoChange = (checked: boolean) => {
    if (checked) {
      // 인디고 체크시 Nup 자동 계산 (mm 기준)
      const calculatedNup = form.widthMm > 0 && form.heightMm > 0
        ? calculateNup(form.widthMm, form.heightMm)
        : 0;
      setForm({
        ...form,
        usageIndigo: true,
        nup: calculatedNup,
      });
    } else {
      // 인디고 체크 해제시 Nup 초기화
      setForm({
        ...form,
        usageIndigo: false,
        nup: undefined,
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
                onChange={(e) => setSearchQuery(e.target.value.replace(/[^0-9]/g, "x").replace(/x+/g, "x"))}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { key: "indigo", label: "인디고" },
                { key: "inkjet", label: "잉크젯" },
                { key: "album", label: "앨범" },
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
                        {spec.nup || calculateNup(Number(spec.widthMm), Number(spec.heightMm))}up
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 3. 용도 및 액션 */}
                <div className="flex items-center gap-4 ml-auto">
                  <div className="flex flex-wrap gap-1 justify-end min-w-[120px]">
                    {spec.usageIndigo && <Badge variant="outline" className="text-[10px] px-1.5 bg-indigo-50/50 text-indigo-700 border-indigo-200">인디고</Badge>}
                    {spec.usageInkjet && <Badge variant="outline" className="text-[10px] px-1.5 bg-orange-50/50 text-orange-700 border-orange-200">잉크젯</Badge>}
                    {spec.usageAlbum && <Badge variant="outline" className="text-[10px] px-1.5 bg-pink-50/50 text-pink-700 border-pink-200">앨범</Badge>}
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
                  // 숫자가 아닌 모든 문자를 x로 변환하고, 연속된 x는 하나로 합침
                  const value = e.target.value.replace(/[^0-9]/g, "x").replace(/x+/g, "x");
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
                        nup: prev.usageIndigo ? calculateNup(widthMm, heightMm) : prev.nup,
                      }));
                    }
                  }
                }}
                placeholder="예: 3x5, 8x10"
              />
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
                    onCheckedChange={(checked) => setForm({ ...form, usageInkjet: !!checked })}
                  />
                  <Label htmlFor="usageInkjet" className="cursor-pointer">잉크젯출력</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="usageAlbum"
                    checked={form.usageAlbum}
                    onCheckedChange={(checked) => handleAlbumChange(!!checked)}
                  />
                  <Label htmlFor="usageAlbum" className="cursor-pointer">앨범</Label>
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

            {/* Nup 표시 (인디고 선택시) */}
            {form.usageIndigo && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-indigo-700">인디고 Nup:</span>
                    <span className="text-2xl font-bold text-indigo-600">{form.nup || 0}</span>
                    <span className="text-sm text-indigo-500">장/1출력</span>
                  </div>
                  <div className="text-xs text-indigo-500">
                    인쇄면적 310×450mm 기준
                  </div>
                </div>
                {form.nup && form.nup > 0 && (
                  <p className="text-xs text-indigo-600 mt-2">
                    * 1출력 비용 1,000원 기준 → 장당 {Math.round(1000 / form.nup)}원
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

    </div>
  );
}

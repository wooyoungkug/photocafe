"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSystemSettings, useBulkUpdateSettings, settingsToMap, getNumericValue } from "@/hooks/use-system-settings";
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
import { Plus, Pencil, Trash2, Search, Ruler, ChevronUp, ChevronDown, Settings, RectangleHorizontal, RectangleVertical, Square } from "lucide-react";
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
  nup?: string;
  nupSqInch?: number;
  sortOrder: number;
  isActive: boolean;
}

// Nup 설정 인터페이스
interface NupSettings {
  "1++up": number; // 초대형 기준 면적
  "1+up": number;  // 대형 기준 면적
  "1up": number;   // 표준 기준 면적
  "2up": number;   // 소형 기준 면적
  "4up": number;   // 초소형 기준 면적
}

// Nup 기본 설정값
const DEFAULT_NUP_SETTINGS: NupSettings = {
  "1++up": 204.1,
  "1+up": 154.1,
  "1up": 102.1,
  "2up": 48.1,
  "4up": 0,
};

// Nup 레이블
const NUP_LABELS: Record<string, string> = {
  "1++up": "초대형",
  "1+up": "대형",
  "1up": "표준",
  "2up": "소형",
  "4up": "초소형",
  "8up": "극소형",
};

// Nup 계산 함수 (면적 기준, 설정값 사용)
function calculateNup(widthInch: number, heightInch: number, settings: NupSettings = DEFAULT_NUP_SETTINGS): string {
  const sqInch = widthInch * heightInch;
  if (sqInch >= settings["1++up"]) return "1++up";
  if (sqInch >= settings["1+up"]) return "1+up";
  if (sqInch >= settings["1up"]) return "1up";
  if (sqInch >= settings["2up"]) return "2up";
  if (sqInch >= settings["4up"]) return "4up";
  return "8up";
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
  nup?: string;
  nupSqInch?: number;
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
  nupSqInch: undefined,
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

  // Nup 설정 상태
  const [isNupSettingsOpen, setIsNupSettingsOpen] = useState(false);
  const [nupSettings, setNupSettings] = useState<NupSettings>(DEFAULT_NUP_SETTINGS);
  const [nupSettingsForm, setNupSettingsForm] = useState<NupSettings>(DEFAULT_NUP_SETTINGS);

  // Nup 설정 DB 조회
  const { data: systemSettings = [] } = useSystemSettings("nup");
  const bulkUpdateSettings = useBulkUpdateSettings();

  // DB에서 Nup 설정 로드
  useEffect(() => {
    if (systemSettings.length > 0) {
      const settingsMap = settingsToMap(systemSettings);
      setNupSettings({
        "1++up": getNumericValue(settingsMap, "nup_1ppup", DEFAULT_NUP_SETTINGS["1++up"]),
        "1+up": getNumericValue(settingsMap, "nup_1pup", DEFAULT_NUP_SETTINGS["1+up"]),
        "1up": getNumericValue(settingsMap, "nup_1up", DEFAULT_NUP_SETTINGS["1up"]),
        "2up": getNumericValue(settingsMap, "nup_2up", DEFAULT_NUP_SETTINGS["2up"]),
        "4up": getNumericValue(settingsMap, "nup_4up", DEFAULT_NUP_SETTINGS["4up"]),
      });
    }
  }, [systemSettings]);

  // 규격 목록 조회
  const { data: specifications = [], isLoading } = useQuery({
    queryKey: ["specifications"],
    queryFn: async () => {
      const response = await api.get<Specification[]>("/specifications");
      return response;
    },
  });

  // 규격 생성
  const createMutation = useMutation({
    mutationFn: async (data: SpecificationForm) => {
      return api.post("/specifications", data);
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
      return api.put(`/specifications/${id}`, data);
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
      nup: spec.nup,
      nupSqInch: spec.nupSqInch ? Number(spec.nupSqInch) : undefined,
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

  // 인치 -> mm 자동 변환 + 방향 자동 계산 + Nup 자동 계산
  const handleInchChange = (field: "widthInch" | "heightInch", value: number) => {
    const mmField = field === "widthInch" ? "widthMm" : "heightMm";
    const newWidth = field === "widthInch" ? value : form.widthInch;
    const newHeight = field === "heightInch" ? value : form.heightInch;
    const sqInch = newWidth * newHeight;
    setForm({
      ...form,
      [field]: value,
      [mmField]: Math.round(value * INCH_TO_MM * 100) / 100,
      orientation: getOrientation(newWidth, newHeight),
      // 앨범 체크시 Nup 자동 계산
      nup: form.usageAlbum && newWidth > 0 && newHeight > 0 ? calculateNup(newWidth, newHeight, nupSettings) : form.nup,
      nupSqInch: form.usageAlbum && newWidth > 0 && newHeight > 0 ? sqInch : form.nupSqInch,
    });
  };

  // mm -> 인치 자동 변환 + 방향 자동 계산 + Nup 자동 계산
  const handleMmChange = (field: "widthMm" | "heightMm", value: number) => {
    const inchField = field === "widthMm" ? "widthInch" : "heightInch";
    const inchValue = Math.round((value / INCH_TO_MM) * 10000) / 10000;
    const newWidth = field === "widthMm" ? inchValue : form.widthInch;
    const newHeight = field === "heightMm" ? inchValue : form.heightInch;
    const sqInch = newWidth * newHeight;
    setForm({
      ...form,
      [field]: value,
      [inchField]: inchValue,
      orientation: getOrientation(newWidth, newHeight),
      // 앨범 체크시 Nup 자동 계산
      nup: form.usageAlbum && newWidth > 0 && newHeight > 0 ? calculateNup(newWidth, newHeight, nupSettings) : form.nup,
      nupSqInch: form.usageAlbum && newWidth > 0 && newHeight > 0 ? sqInch : form.nupSqInch,
    });
  };

  // 앨범 체크박스 변경 핸들러 (Nup 자동 계산)
  const handleAlbumChange = (checked: boolean) => {
    const sqInch = form.widthInch * form.heightInch;
    if (checked) {
      // 앨범 체크시 Nup 자동 계산 (이미 값이 있으면 유지)
      setForm({
        ...form,
        usageAlbum: true,
        nup: form.nup || (form.widthInch > 0 && form.heightInch > 0 ? calculateNup(form.widthInch, form.heightInch, nupSettings) : undefined),
        nupSqInch: sqInch > 0 ? sqInch : undefined,
      });
    } else {
      // 앨범 체크 해제시 Nup 값 유지 (DB에 저장된 값 보존)
      setForm({
        ...form,
        usageAlbum: false,
      });
    }
  };

  // Nup 설정 다이얼로그 열기
  const openNupSettings = () => {
    setNupSettingsForm({ ...nupSettings });
    setIsNupSettingsOpen(true);
  };

  // Nup 설정 저장
  const saveNupSettings = () => {
    // 유효성 검사: 값이 내림차순이어야 함
    if (nupSettingsForm["1++up"] <= nupSettingsForm["1+up"]) {
      toast({ variant: "destructive", title: "1++up 값은 1+up보다 커야 합니다." });
      return;
    }
    if (nupSettingsForm["1+up"] <= nupSettingsForm["1up"]) {
      toast({ variant: "destructive", title: "1+up 값은 1up보다 커야 합니다." });
      return;
    }
    if (nupSettingsForm["1up"] <= nupSettingsForm["2up"]) {
      toast({ variant: "destructive", title: "1up 값은 2up보다 커야 합니다." });
      return;
    }
    if (nupSettingsForm["2up"] <= nupSettingsForm["4up"]) {
      toast({ variant: "destructive", title: "2up 값은 4up보다 커야 합니다." });
      return;
    }
    if (nupSettingsForm["4up"] < 0) {
      toast({ variant: "destructive", title: "4up 값은 0 이상이어야 합니다." });
      return;
    }

    // DB에 저장
    bulkUpdateSettings.mutate([
      { key: "nup_1ppup", value: String(nupSettingsForm["1++up"]), category: "nup", label: "Nup 1++up 기준값" },
      { key: "nup_1pup", value: String(nupSettingsForm["1+up"]), category: "nup", label: "Nup 1+up 기준값" },
      { key: "nup_1up", value: String(nupSettingsForm["1up"]), category: "nup", label: "Nup 1up 기준값" },
      { key: "nup_2up", value: String(nupSettingsForm["2up"]), category: "nup", label: "Nup 2up 기준값" },
      { key: "nup_4up", value: String(nupSettingsForm["4up"]), category: "nup", label: "Nup 4up 기준값" },
    ], {
      onSuccess: () => {
        setNupSettings({ ...nupSettingsForm });
        setIsNupSettingsOpen(false);
      }
    });
  };

  // 용도 필터 토글
  const toggleUsageFilter = (usage: string) => {
    setUsageFilters((prev) =>
      prev.includes(usage)
        ? prev.filter((u) => u !== usage)
        : [...prev, usage]
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
          <Button variant="outline" size="sm" onClick={openNupSettings}>
            <Settings className="h-4 w-4 mr-2" />
            Nup 설정
          </Button>
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
                placeholder="규격명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              {usageFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUsageFilters([])}
                  className="h-9 px-3 text-muted-foreground"
                >
                  초기화
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 규격 목록 (리스트 레이아웃) */}
      <div className="flex flex-col gap-2">
        {filteredSpecs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-muted/10 text-muted-foreground">
            <Ruler className="h-10 w-10 mb-4 opacity-20" />
            <p>등록된 규격이 없습니다.</p>
          </div>
        ) : (
          filteredSpecs.map((spec, index) => (
            <Card key={spec.id} className="group hover:shadow-md transition-all border-muted hover:border-primary/50 bg-card/50 hover:bg-card">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* 1. 순서 및 이름 */}
                <div className="flex items-center gap-3 min-w-[180px]">
                  <div className="flex flex-col items-center gap-0.5 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => handleMoveUp(index)} disabled={index === 0 || reorderMutation.isPending} className="hover:text-primary" aria-label="Move up"><ChevronUp className="h-3 w-3" /></button>
                    <span className="text-[10px] font-mono leading-none">{index + 1}</span>
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
                    {spec.nup && (
                      <Badge variant="secondary" className="font-mono text-[10px] h-5 px-1 ml-2">
                        {spec.nup}
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
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="예: 8x10"
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
                    onCheckedChange={(checked) => setForm({ ...form, usageIndigo: !!checked })}
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

            {/* Nup 설정 (앨범 선택시) */}
            {form.usageAlbum && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-blue-700">Nup:</span>
                    <Select
                      value={form.nup || ""}
                      onValueChange={(value) => {
                        const sqInch = form.widthInch * form.heightInch;
                        setForm({ ...form, nup: value, nupSqInch: sqInch > 0 ? sqInch : undefined });
                      }}
                    >
                      <SelectTrigger className="w-[140px] h-8 bg-white">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1++up">1++up (초대형)</SelectItem>
                        <SelectItem value="1+up">1+up (대형)</SelectItem>
                        <SelectItem value="1up">1up (표준)</SelectItem>
                        <SelectItem value="2up">2up (소형)</SelectItem>
                        <SelectItem value="4up">4up (초소형)</SelectItem>
                        <SelectItem value="8up">8up (극소형)</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.nup && (
                      <Badge variant="secondary" className="text-blue-700">
                        {NUP_LABELS[form.nup]}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-blue-600">
                    면적: {(form.widthInch * form.heightInch).toFixed(2)} sq inch
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-blue-500">
                    * 면적 기준 권장값: <strong>{form.widthInch > 0 && form.heightInch > 0 ? calculateNup(form.widthInch, form.heightInch, nupSettings) : "-"}</strong>
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-blue-600 hover:text-blue-800"
                    onClick={() => {
                      if (form.widthInch > 0 && form.heightInch > 0) {
                        const sqInch = form.widthInch * form.heightInch;
                        setForm({
                          ...form,
                          nup: calculateNup(form.widthInch, form.heightInch, nupSettings),
                          nupSqInch: sqInch,
                        });
                      }
                    }}
                    disabled={form.widthInch <= 0 || form.heightInch <= 0}
                  >
                    자동 계산 적용
                  </Button>
                </div>
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

      {/* Nup 설정 다이얼로그 */}
      <Dialog open={isNupSettingsOpen} onOpenChange={setIsNupSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nup 설정</DialogTitle>
            <DialogDescription>
              면적(sq inch) 기준으로 Nup 등급을 결정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              각 등급의 최소 면적(가로×세로 인치)을 설정하세요.
              해당 면적 이상이면 해당 등급으로 분류됩니다.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-20">
                  <Badge variant="outline" className="w-full justify-center">1++up</Badge>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    type="number"
                    value={nupSettingsForm["1++up"]}
                    onChange={(e) => setNupSettingsForm({ ...nupSettingsForm, "1++up": Number(e.target.value) })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">~</span>
                  <span className="text-sm text-muted-foreground w-16">무제한</span>
                  <span className="text-xs text-muted-foreground">({NUP_LABELS["1++up"]})</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20">
                  <Badge variant="outline" className="w-full justify-center">1+up</Badge>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    type="number"
                    value={nupSettingsForm["1+up"]}
                    onChange={(e) => setNupSettingsForm({ ...nupSettingsForm, "1+up": Number(e.target.value) })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">~</span>
                  <span className="text-sm w-16">{nupSettingsForm["1++up"]}</span>
                  <span className="text-xs text-muted-foreground">({NUP_LABELS["1+up"]})</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20">
                  <Badge variant="outline" className="w-full justify-center">1up</Badge>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    type="number"
                    value={nupSettingsForm["1up"]}
                    onChange={(e) => setNupSettingsForm({ ...nupSettingsForm, "1up": Number(e.target.value) })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">~</span>
                  <span className="text-sm w-16">{nupSettingsForm["1+up"]}</span>
                  <span className="text-xs text-muted-foreground">({NUP_LABELS["1up"]})</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20">
                  <Badge variant="outline" className="w-full justify-center">2up</Badge>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    type="number"
                    value={nupSettingsForm["2up"]}
                    onChange={(e) => setNupSettingsForm({ ...nupSettingsForm, "2up": Number(e.target.value) })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">~</span>
                  <span className="text-sm w-16">{nupSettingsForm["1up"]}</span>
                  <span className="text-xs text-muted-foreground">({NUP_LABELS["2up"]})</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20">
                  <Badge variant="outline" className="w-full justify-center">4up</Badge>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    type="number"
                    value={nupSettingsForm["4up"]}
                    onChange={(e) => setNupSettingsForm({ ...nupSettingsForm, "4up": Number(e.target.value) })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">~</span>
                  <span className="text-sm w-16">{nupSettingsForm["2up"]}</span>
                  <span className="text-xs text-muted-foreground">({NUP_LABELS["4up"]})</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20">
                  <Badge variant="secondary" className="w-full justify-center">8up</Badge>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-sm w-20 text-center">0</span>
                  <span className="text-sm text-muted-foreground">~</span>
                  <span className="text-sm w-16">{nupSettingsForm["4up"]}</span>
                  <span className="text-xs text-muted-foreground">({NUP_LABELS["8up"]})</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                예시: 8×10인치 = 80 sq inch → {calculateNup(8, 10, nupSettingsForm)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNupSettingsOpen(false)}>
              취소
            </Button>
            <Button onClick={saveNupSettings}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

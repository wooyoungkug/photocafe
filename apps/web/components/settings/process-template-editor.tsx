"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  GripVertical,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  ChevronRight,
  Clock,
  Shield,
  ArrowRight,
  Copy,
  Pencil,
  Settings2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  useProcessTemplates,
  PRODUCT_TYPES,
  DEFAULT_PRODUCT_TYPES,
  PROCESS_STEP_OPTIONS,
  DEPARTMENTS,
  type ProductType,
  type ProcessStep,
} from "@/hooks/use-process-templates";
import { cn } from "@/lib/utils";

// 한글 이름에서 영문 코드 자동 생성 헬퍼
function autoCode(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[가-힣]+/g, (match) => {
      // 간단한 한글→영문 매핑 (공정 이름용)
      const map: Record<string, string> = {
        "접수": "receipt", "완료": "complete", "대기": "waiting", "보류": "hold",
        "검수": "inspection", "파일": "file", "출력": "print", "인디고": "indigo",
        "잉크젯": "inkjet", "후가공": "finishing", "진행": "progress", "배송": "shipping",
        "택배": "parcel", "직배송": "direct", "공장": "factory", "출고": "release",
        "거래": "transaction", "코팅": "coating", "재단": "cutting", "제본": "binding",
        "압축": "compressed", "양장": "hardcover", "무선": "softcover", "커버": "cover",
        "제작": "making", "조립": "assembly", "포장": "packaging", "외주": "outsource",
        "특수": "special", "가공": "processing",
      };
      return map[match] || match;
    })
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// ---------------------------------------------------------------------------
// Sortable Step Card
// ---------------------------------------------------------------------------

interface SortableStepProps {
  step: ProcessStep;
  allStepOptions: Record<string, { name: string; department: string }>;
  onUpdate: (step: ProcessStep) => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function SortableStepCard({ step, allStepOptions, onUpdate, onRemove, isFirst, isLast }: SortableStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.stepCode + "-" + step.stepOrder });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dept = DEPARTMENTS[step.department as keyof typeof DEPARTMENTS];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-white transition-shadow",
        isDragging && "shadow-lg ring-2 ring-primary/20 z-50"
      )}
    >
      {/* 드래그 핸들 */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* 순서 번호 */}
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-[13px] font-bold text-gray-600 shrink-0">
        {step.stepOrder}
      </div>

      {/* 공정 선택 (드롭다운) */}
      <div className="flex-1 min-w-0">
        <Select
          value={step.stepCode}
          onValueChange={(code: string) => {
            const opt = allStepOptions[code];
            if (opt) {
              onUpdate({
                ...step,
                stepCode: code,
                stepName: opt.name,
                department: opt.department,
              });
            }
          }}
        >
          <SelectTrigger className="h-9 text-[14px] text-black font-normal border-gray-200 hover:border-gray-400">
            <div className="flex items-center gap-2">
              <SelectValue />
              {step.isCheckpoint && (
                <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )}
            </div>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(allStepOptions).map(
              ([code, opt]) => (
                <SelectItem key={code} value={code}>
                  <div className="flex items-center gap-2">
                    <span>{opt.name}</span>
                    <span className="text-[11px] text-gray-400">{code}</span>
                  </div>
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      {/* 부서 선택 (드롭다운) */}
      <Select
        value={step.department}
        onValueChange={(dept: string) => onUpdate({ ...step, department: dept })}
      >
        <SelectTrigger className={cn(
          "w-[90px] h-8 text-[12px] font-medium border-0 shrink-0",
          dept ? dept.color : "bg-gray-100 text-gray-600"
        )}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(DEPARTMENTS) as [string, { name: string; color: string }][]).map(
            ([code, d]) => (
              <SelectItem key={code} value={code}>
                <Badge variant="secondary" className={cn("text-[11px]", d.color)}>
                  {d.name}
                </Badge>
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>

      {/* 예상 시간 */}
      <div className="flex items-center gap-1 shrink-0">
        <Clock className="h-3.5 w-3.5 text-gray-400" />
        <Input
          type="number"
          min={0}
          step={0.5}
          value={step.estimatedHours ?? ""}
          onChange={(e) =>
            onUpdate({
              ...step,
              estimatedHours: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="h"
          className="w-14 h-7 text-[12px] text-center px-1"
        />
      </div>

      {/* 체크포인트 */}
      <div className="flex items-center gap-1 shrink-0" title="체크포인트 (바코드 스캔 필수)">
        <Checkbox
          checked={step.isCheckpoint ?? false}
          onCheckedChange={(checked) =>
            onUpdate({ ...step, isCheckpoint: !!checked })
          }
          className="h-4 w-4"
        />
        <span className="text-[11px] text-gray-400 hidden lg:inline">CP</span>
      </div>

      {/* 삭제 (첫/마지막 공정은 삭제 불가) */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 shrink-0"
        onClick={onRemove}
        disabled={isFirst || isLast}
        title={isFirst || isLast ? "수주/출하 공정은 삭제할 수 없습니다" : "공정 삭제"}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Process Flow Preview
// ---------------------------------------------------------------------------

function ProcessFlowPreview({ steps }: { steps: ProcessStep[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap py-2">
      {steps.map((step, i) => {
        const dept = DEPARTMENTS[step.department as keyof typeof DEPARTMENTS];
        return (
          <div key={step.stepCode + "-" + i} className="flex items-center gap-1">
            <div
              className={cn(
                "px-2 py-1 rounded text-[11px] font-medium border",
                step.isCheckpoint
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : dept
                    ? dept.color + " border-transparent"
                    : "bg-gray-100 text-gray-600 border-transparent"
              )}
            >
              {step.stepName}
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="h-3 w-3 text-gray-300 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ProcessTemplateEditor() {
  const {
    templates,
    allProductTypes,
    allStepOptions,
    isLoading,
    isSaving,
    hasChanges,
    updateTemplate,
    addCustomStep,
    updateStepOption,
    moveStepOption,
    removeCustomStep,
    orderedStepKeys,
    addProductType,
    renameProductType,
    removeProductType,
    saveTemplates,
    resetTemplate,
  } = useProcessTemplates();

  const [selectedType, setSelectedType] = useState<ProductType>("compressed_album");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addStepCode, setAddStepCode] = useState<string>("");
  // 새 공정 직접 입력 상태
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newStepCode, setNewStepCode] = useState("");
  const [newStepName, setNewStepName] = useState("");
  const [newStepDept, setNewStepDept] = useState("PROD");
  // 기존공정 가져오기 상태
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importSource, setImportSource] = useState<ProductType | "">("");
  // 상품유형 관리 상태
  const [productMgmtOpen, setProductMgmtOpen] = useState(false);
  const [newProductCode, setNewProductCode] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [editingProduct, setEditingProduct] = useState<{ code: string; name: string } | null>(null);
  // 공정용어 관리 상태
  const [stepMgmtOpen, setStepMgmtOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<{ code: string; name: string; department: string } | null>(null);
  const [mgmtNewCode, setMgmtNewCode] = useState("");
  const [mgmtNewName, setMgmtNewName] = useState("");
  const [mgmtNewDept, setMgmtNewDept] = useState("PROD");

  const currentSteps = templates[selectedType] || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 드래그 종료
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = currentSteps.findIndex(
        (s) => s.stepCode + "-" + s.stepOrder === active.id
      );
      const newIndex = currentSteps.findIndex(
        (s) => s.stepCode + "-" + s.stepOrder === over.id
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(currentSteps, oldIndex, newIndex);
        updateTemplate(selectedType, reordered);
      }
    },
    [currentSteps, selectedType, updateTemplate]
  );

  // 공정 단계 업데이트
  const handleUpdateStep = useCallback(
    (index: number, updatedStep: ProcessStep) => {
      const newSteps = [...currentSteps];
      newSteps[index] = updatedStep;
      updateTemplate(selectedType, newSteps);
    },
    [currentSteps, selectedType, updateTemplate]
  );

  // 공정 단계 삭제
  const handleRemoveStep = useCallback(
    (index: number) => {
      const newSteps = currentSteps.filter((_, i) => i !== index);
      updateTemplate(selectedType, newSteps);
    },
    [currentSteps, selectedType, updateTemplate]
  );

  // 기존 공정 추가
  const handleAddStep = useCallback(() => {
    if (!addStepCode) return;
    const option = allStepOptions[addStepCode];
    if (!option) return;
    const newStep: ProcessStep = {
      stepOrder: currentSteps.length + 1,
      stepCode: addStepCode,
      stepName: option.name,
      department: option.department,
      isCheckpoint: false,
    };
    const completeIndex = currentSteps.findIndex((s) => s.stepCode === "transaction_complete");
    const insertIndex = completeIndex !== -1 ? completeIndex : currentSteps.length - 1;
    const newSteps = [...currentSteps];
    newSteps.splice(insertIndex, 0, newStep);
    updateTemplate(selectedType, newSteps);
    setAddDialogOpen(false);
    setAddStepCode("");
    toast.success(`"${option.name}" 공정이 추가되었습니다.`);
  }, [addStepCode, allStepOptions, currentSteps, selectedType, updateTemplate]);

  // 새 공정 직접 생성 후 추가
  const handleCreateAndAddStep = useCallback(() => {
    const code = newStepCode.trim();
    const name = newStepName.trim();
    if (!code || !name) return;
    if (allStepOptions[code]) {
      toast.error("이미 존재하는 코드입니다.");
      return;
    }
    // 커스텀 공정 등록
    addCustomStep(code, name, newStepDept);
    // 바로 현재 상품 템플릿에 추가
    const newStep: ProcessStep = {
      stepOrder: currentSteps.length + 1,
      stepCode: code,
      stepName: name,
      department: newStepDept,
      isCheckpoint: false,
    };
    const completeIndex = currentSteps.findIndex((s) => s.stepCode === "transaction_complete");
    const insertIndex = completeIndex !== -1 ? completeIndex : currentSteps.length - 1;
    const newSteps = [...currentSteps];
    newSteps.splice(insertIndex, 0, newStep);
    updateTemplate(selectedType, newSteps);
    // 초기화
    setAddDialogOpen(false);
    setIsCreatingNew(false);
    setNewStepCode("");
    setNewStepName("");
    setNewStepDept("PROD");
    toast.success(`"${name}" 공정이 새로 생성되어 추가되었습니다.`);
  }, [newStepCode, newStepName, newStepDept, allStepOptions, addCustomStep, currentSteps, selectedType, updateTemplate]);

  // 기존공정 가져오기
  const handleImport = useCallback(() => {
    if (!importSource || importSource === selectedType) return;
    const sourceSteps = templates[importSource];
    if (!sourceSteps?.length) return;
    updateTemplate(selectedType, sourceSteps.map((s) => ({ ...s })));
    setImportDialogOpen(false);
    setImportSource("");
    toast.success(`${allProductTypes[importSource]}의 공정을 가져왔습니다.`);
  }, [importSource, selectedType, templates, updateTemplate]);

  // 이미 사용 중인 공정 코드
  const usedCodes = new Set(currentSteps.map((s) => s.stepCode));

  // 추가 가능한 공정 목록 (기본 + 커스텀 중 미사용)
  const availableSteps = Object.entries(allStepOptions).filter(
    ([code]) => !usedCodes.has(code)
  );

  // 저장
  const handleSave = async () => {
    try {
      await saveTemplates(selectedType);
      toast.success(`${allProductTypes[selectedType]} 공정이 저장되었습니다.`);
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  };

  // 기본 복원
  const handleReset = () => {
    resetTemplate(selectedType);
    toast.info(`${allProductTypes[selectedType]} 공정이 기본값으로 복원되었습니다.`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">상품별 공정 프로세스 설정</CardTitle>
          <CardDescription className="text-[14px]">
            각 상품 유형별로 생산 공정 흐름을 설정합니다. 드래그하여 순서를 변경하고, 공정을 추가/삭제할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 상품 유형 선택 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[13px] text-gray-500">상품 유형</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[12px] text-gray-500"
                onClick={() => setProductMgmtOpen(true)}
              >
                <Settings2 className="h-3.5 w-3.5 mr-1" />
                상품유형 관리
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(allProductTypes).map(
                ([code, label]) => (
                  <Button
                    key={code}
                    variant={selectedType === code ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "text-[13px] h-9 justify-start",
                      selectedType === code && "font-bold"
                    )}
                    onClick={() => setSelectedType(code)}
                  >
                    {label}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "ml-auto text-[10px] h-5",
                        selectedType === code
                          ? "bg-white/20 text-white"
                          : "bg-gray-100"
                      )}
                    >
                      {templates[code]?.length ?? 0}
                    </Badge>
                  </Button>
                )
              )}
            </div>
          </div>

          <Separator />

          {/* 공정 흐름 미리보기 */}
          <div>
            <Label className="text-[13px] text-gray-500 mb-1">공정 흐름</Label>
            <ProcessFlowPreview steps={currentSteps} />
          </div>

          <Separator />

          {/* 공정 목록 (드래그앤드롭) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[14px] text-black font-bold">
                공정 단계 ({currentSteps.length}개)
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[13px]"
                  onClick={() => { setStepMgmtOpen(true); setEditingStep(null); setMgmtNewCode(""); setMgmtNewName(""); setMgmtNewDept("PROD"); }}
                >
                  <Settings2 className="h-3.5 w-3.5 mr-1" />
                  공정용어 관리
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[13px]"
                  onClick={() => { setImportDialogOpen(true); setImportSource(""); }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  기존공정 가져오기
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[13px]"
                  onClick={() => { setAddDialogOpen(true); setIsCreatingNew(false); setAddStepCode(""); }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  공정 추가
                </Button>
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={currentSteps.map((s) => s.stepCode + "-" + s.stepOrder)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {currentSteps.map((step, index) => (
                    <SortableStepCard
                      key={step.stepCode + "-" + step.stepOrder}
                      step={step}
                      allStepOptions={allStepOptions}
                      onUpdate={(updated) => handleUpdateStep(index, updated)}
                      onRemove={() => handleRemoveStep(index)}
                      isFirst={index === 0}
                      isLast={index === currentSteps.length - 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* 범례 */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg text-[12px] text-gray-500">
            <div className="flex items-center gap-1">
              <GripVertical className="h-3.5 w-3.5" />
              드래그로 순서 변경
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              예상 소요시간(h)
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-amber-500" />
              체크포인트 (바코드 스캔 필수)
            </div>
            <div className="flex items-center gap-1">
              CP = 체크포인트
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 저장/초기화 버튼 */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          기본값 복원
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "저장 중..." : "저장"}
        </Button>
      </div>

      {/* 기존공정 가져오기 다이얼로그 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">기존공정 가져오기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-[14px] text-gray-500">
              다른 상품의 공정 흐름을 <span className="font-bold text-black">{allProductTypes[selectedType]}</span>에 복사합니다.
              현재 설정된 공정은 덮어쓰기됩니다.
            </p>
            <div className="space-y-2">
              <Label className="text-[14px]">가져올 상품 선택</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(allProductTypes)
                  .filter(([code]) => code !== selectedType)
                  .map(([code, label]) => (
                    <Button
                      key={code}
                      variant={importSource === code ? "default" : "outline"}
                      size="sm"
                      className="h-10 text-[13px] justify-between"
                      onClick={() => setImportSource(code)}
                    >
                      {label}
                      <Badge variant="secondary" className={cn("text-[10px] ml-1", importSource === code ? "bg-white/20 text-white" : "bg-gray-100")}>
                        {templates[code]?.length ?? 0}
                      </Badge>
                    </Button>
                  ))}
              </div>
            </div>
            {/* 미리보기 */}
            {importSource && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <Label className="text-[12px] text-gray-500">공정 흐름 미리보기</Label>
                <ProcessFlowPreview steps={templates[importSource] || []} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleImport} disabled={!importSource}>
              <Copy className="h-4 w-4 mr-1" />
              가져오기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 공정 추가 다이얼로그 */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) { setIsCreatingNew(false); setAddStepCode(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">공정 단계 추가</DialogTitle>
          </DialogHeader>

          {!isCreatingNew ? (
            /* 기존 공정 선택 모드 */
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-[14px]">추가할 공정 선택</Label>
                <Select
                  value={addStepCode}
                  onValueChange={(v) => setAddStepCode(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="공정을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSteps.map(([code, opt]) => {
                      const d = DEPARTMENTS[opt.department as keyof typeof DEPARTMENTS];
                      return (
                        <SelectItem key={code} value={code}>
                          <div className="flex items-center gap-2">
                            <span>{opt.name}</span>
                            {d && (
                              <Badge variant="secondary" className={cn("text-[10px]", d.color)}>
                                {d.name}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* 구분선 + 새 공정 만들기 버튼 */}
              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[12px] text-gray-400">
                  또는
                </span>
              </div>

              <Button
                variant="outline"
                className="w-full text-[13px]"
                onClick={() => setIsCreatingNew(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                새 공정 용어 직접 추가
              </Button>
            </div>
          ) : (
            /* 새 공정 직접 입력 모드 */
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-[14px]">공정 이름 <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="예: 코팅검수, 외주가공, 특수재단..."
                  value={newStepName}
                  onChange={(e) => {
                    setNewStepName(e.target.value);
                    // 코드 자동 생성 (한글 → 영문 코드)
                    if (!newStepCode || newStepCode === autoCode(newStepName)) {
                      setNewStepCode(autoCode(e.target.value));
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[14px]">코드 (영문) <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="예: coating_inspection"
                  value={newStepCode}
                  onChange={(e) => setNewStepCode(e.target.value.replace(/[^a-z0-9_]/g, ""))}
                  className="font-mono"
                />
                <p className="text-[11px] text-gray-400">영문 소문자, 숫자, 언더스코어(_)만 사용</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[14px]">담당 부서</Label>
                <Select value={newStepDept} onValueChange={setNewStepDept}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(DEPARTMENTS) as [string, { name: string; color: string }][]).map(
                      ([code, d]) => (
                        <SelectItem key={code} value={code}>
                          <Badge variant="secondary" className={cn("text-[11px]", d.color)}>
                            {d.name}
                          </Badge>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {allStepOptions[newStepCode] && (
                <p className="text-[12px] text-red-500">이미 존재하는 코드입니다. 다른 코드를 입력하세요.</p>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="text-[12px] text-gray-500"
                onClick={() => setIsCreatingNew(false)}
              >
                ← 기존 공정에서 선택하기
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              취소
            </Button>
            {!isCreatingNew ? (
              <Button onClick={handleAddStep} disabled={!addStepCode}>
                <Plus className="h-4 w-4 mr-1" />
                추가
              </Button>
            ) : (
              <Button
                onClick={handleCreateAndAddStep}
                disabled={!newStepCode.trim() || !newStepName.trim() || !!allStepOptions[newStepCode]}
              >
                <Plus className="h-4 w-4 mr-1" />
                생성 및 추가
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 공정용어 관리 다이얼로그 */}
      <Dialog open={stepMgmtOpen} onOpenChange={(open) => { setStepMgmtOpen(open); if (!open) { setEditingStep(null); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">공정용어 관리</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto flex-1">
            {/* 기존 공정 용어 목록 */}
            <div className="space-y-1 max-h-[350px] overflow-y-auto">
              {orderedStepKeys.map((code, idx) => {
                const opt = allStepOptions[code];
                if (!opt) return null;
                const isEditing = editingStep?.code === code;
                const dept = DEPARTMENTS[opt.department as keyof typeof DEPARTMENTS];
                const isDefault = !!(PROCESS_STEP_OPTIONS as Record<string, unknown>)[code];
                const isFirst = idx === 0;
                const isLast = idx === orderedStepKeys.length - 1;
                return (
                  <div key={code} className="flex items-center gap-1.5 p-2 rounded-lg border bg-white">
                    {isEditing ? (
                      <>
                        <Input
                          value={editingStep.name}
                          onChange={(e) => setEditingStep({ ...editingStep, name: e.target.value })}
                          className="h-8 text-[13px] flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateStepOption(code, editingStep.name, editingStep.department);
                              setEditingStep(null);
                              toast.success("공정 용어가 수정되었습니다.");
                            }
                            if (e.key === "Escape") setEditingStep(null);
                          }}
                        />
                        <Select value={editingStep.department} onValueChange={(v) => setEditingStep({ ...editingStep, department: v })}>
                          <SelectTrigger className="w-[80px] h-8 text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.entries(DEPARTMENTS) as [string, { name: string; color: string }][]).map(([c, d]) => (
                              <SelectItem key={c} value={c}><Badge variant="secondary" className={cn("text-[10px]", d.color)}>{d.name}</Badge></SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-8 text-[12px]" onClick={() => {
                          updateStepOption(code, editingStep.name, editingStep.department);
                          setEditingStep(null);
                          toast.success("공정 용어가 수정되었습니다.");
                        }}>확인</Button>
                        <Button variant="ghost" size="sm" className="h-8 text-[12px]" onClick={() => setEditingStep(null)}>취소</Button>
                      </>
                    ) : (
                      <>
                        {/* 상하 이동 버튼 */}
                        <div className="flex flex-col shrink-0">
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-300 hover:text-gray-600"
                            disabled={isFirst} onClick={() => moveStepOption(code, "up")} title="위로">
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-300 hover:text-gray-600"
                            disabled={isLast} onClick={() => moveStepOption(code, "down")} title="아래로">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <span className="text-[14px] text-black flex-1 truncate">{opt.name}</span>
                        <span className="text-[11px] text-gray-400 font-mono shrink-0">{code}</span>
                        {dept && <Badge variant="secondary" className={cn("text-[10px] shrink-0", dept.color)}>{dept.name}</Badge>}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-500 shrink-0"
                          onClick={() => setEditingStep({ code, name: opt.name, department: opt.department })} title="수정">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!isDefault && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 shrink-0"
                            onClick={() => { removeCustomStep(code); toast.success(`"${opt.name}" 공정이 삭제되었습니다.`); }} title="삭제">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 새 공정용어 추가 */}
            <Separator />
            <div className="space-y-2">
              <Label className="text-[14px] font-bold">새 공정용어 추가</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="공정명 (예: 코팅검수)"
                  value={mgmtNewName}
                  onChange={(e) => {
                    setMgmtNewName(e.target.value);
                    if (!mgmtNewCode || mgmtNewCode === autoCode(mgmtNewName)) {
                      setMgmtNewCode(autoCode(e.target.value));
                    }
                  }}
                  className="flex-1 h-9 text-[13px]"
                />
                <Input
                  placeholder="코드"
                  value={mgmtNewCode}
                  onChange={(e) => setMgmtNewCode(e.target.value.replace(/[^a-z0-9_]/g, ""))}
                  className="w-32 h-9 text-[13px] font-mono"
                />
                <Select value={mgmtNewDept} onValueChange={setMgmtNewDept}>
                  <SelectTrigger className="w-[80px] h-9 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(DEPARTMENTS) as [string, { name: string; color: string }][]).map(([c, d]) => (
                      <SelectItem key={c} value={c}><Badge variant="secondary" className={cn("text-[10px]", d.color)}>{d.name}</Badge></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-9"
                  disabled={!mgmtNewName.trim() || !mgmtNewCode.trim() || !!allStepOptions[mgmtNewCode]}
                  onClick={() => {
                    addCustomStep(mgmtNewCode, mgmtNewName.trim(), mgmtNewDept);
                    toast.success(`"${mgmtNewName.trim()}" 공정이 추가되었습니다.`);
                    setMgmtNewCode(""); setMgmtNewName(""); setMgmtNewDept("PROD");
                  }}>
                  <Plus className="h-4 w-4 mr-1" />추가
                </Button>
              </div>
              {mgmtNewCode && allStepOptions[mgmtNewCode] && (
                <p className="text-[12px] text-red-500">이미 존재하는 코드입니다.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setStepMgmtOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 상품유형 관리 다이얼로그 */}
      <Dialog open={productMgmtOpen} onOpenChange={(open) => { setProductMgmtOpen(open); if (!open) { setEditingProduct(null); setNewProductCode(""); setNewProductName(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">상품유형 관리</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 기존 상품 목록 */}
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {Object.entries(allProductTypes).map(([code, label]) => {
                const isDefault = !!DEFAULT_PRODUCT_TYPES[code];
                const isEditing = editingProduct?.code === code;
                return (
                  <div key={code} className="flex items-center gap-2 p-2 rounded-lg border bg-white">
                    {isEditing ? (
                      <>
                        <Input
                          value={editingProduct.name}
                          onChange={(e) => setEditingProduct({ code, name: e.target.value })}
                          className="h-8 text-[13px] flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              renameProductType(code, editingProduct.name);
                              setEditingProduct(null);
                              toast.success("상품명이 수정되었습니다.");
                            }
                            if (e.key === "Escape") setEditingProduct(null);
                          }}
                        />
                        <Button
                          size="sm"
                          className="h-8 text-[12px]"
                          onClick={() => {
                            renameProductType(code, editingProduct.name);
                            setEditingProduct(null);
                            toast.success("상품명이 수정되었습니다.");
                          }}
                        >
                          확인
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[12px]"
                          onClick={() => setEditingProduct(null)}
                        >
                          취소
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-[14px] text-black flex-1">{label}</span>
                        <span className="text-[11px] text-gray-400 font-mono">{code}</span>
                        {isDefault && (
                          <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-500">기본</Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px]">
                          {templates[code]?.length ?? 0}공정
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-blue-500"
                          onClick={() => setEditingProduct({ code, name: label })}
                          title="이름 수정"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                            onClick={() => {
                              removeProductType(code);
                              if (selectedType === code) setSelectedType("compressed_album");
                              toast.success(`"${label}" 상품유형이 삭제되었습니다.`);
                            }}
                            title="삭제"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 새 상품유형 추가 */}
            <Separator />
            <div className="space-y-3">
              <Label className="text-[14px] font-bold">새 상품유형 추가</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="상품명 (예: 캔버스액자)"
                  value={newProductName}
                  onChange={(e) => {
                    setNewProductName(e.target.value);
                    if (!newProductCode || newProductCode === autoCode(newProductName)) {
                      setNewProductCode(autoCode(e.target.value));
                    }
                  }}
                  className="flex-1 h-9 text-[13px]"
                />
                <Input
                  placeholder="코드 (영문)"
                  value={newProductCode}
                  onChange={(e) => setNewProductCode(e.target.value.replace(/[^a-z0-9_]/g, ""))}
                  className="w-40 h-9 text-[13px] font-mono"
                />
                <Button
                  size="sm"
                  className="h-9"
                  disabled={!newProductName.trim() || !newProductCode.trim() || !!allProductTypes[newProductCode]}
                  onClick={() => {
                    addProductType(newProductCode, newProductName.trim());
                    toast.success(`"${newProductName.trim()}" 상품유형이 추가되었습니다.`);
                    setNewProductCode("");
                    setNewProductName("");
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  추가
                </Button>
              </div>
              {allProductTypes[newProductCode] && (
                <p className="text-[12px] text-red-500">이미 존재하는 코드입니다.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setProductMgmtOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

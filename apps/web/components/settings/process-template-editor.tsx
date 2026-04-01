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
} from "lucide-react";
import { toast } from "sonner";
import {
  useProcessTemplates,
  PRODUCT_TYPES,
  PROCESS_STEP_OPTIONS,
  DEPARTMENTS,
  type ProductType,
  type ProcessStepCode,
  type ProcessStep,
} from "@/hooks/use-process-templates";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Sortable Step Card
// ---------------------------------------------------------------------------

interface SortableStepProps {
  step: ProcessStep;
  onUpdate: (step: ProcessStep) => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function SortableStepCard({ step, onUpdate, onRemove, isFirst, isLast }: SortableStepProps) {
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

      {/* 공정명 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-black font-normal truncate">
            {step.stepName}
          </span>
          {step.isCheckpoint && (
            <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          )}
        </div>
        <span className="text-[12px] text-gray-400">{step.stepCode}</span>
      </div>

      {/* 부서 배지 */}
      {dept && (
        <Badge variant="secondary" className={cn("text-[11px] shrink-0", dept.color)}>
          {dept.name}
        </Badge>
      )}

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
    isLoading,
    isSaving,
    hasChanges,
    updateTemplate,
    saveTemplates,
    resetTemplate,
  } = useProcessTemplates();

  const [selectedType, setSelectedType] = useState<ProductType>("compressed_album");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addStepCode, setAddStepCode] = useState<ProcessStepCode | "">("");

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

  // 공정 단계 추가
  const handleAddStep = useCallback(() => {
    if (!addStepCode) return;
    const option = PROCESS_STEP_OPTIONS[addStepCode];
    const newStep: ProcessStep = {
      stepOrder: currentSteps.length + 1,
      stepCode: addStepCode,
      stepName: option.name,
      department: option.department,
      isCheckpoint: false,
    };
    // QC 앞에 삽입 (마지막 QC 전)
    const qcIndex = currentSteps.findIndex((s) => s.stepCode === "qc");
    const insertIndex = qcIndex !== -1 ? qcIndex : currentSteps.length - 1;
    const newSteps = [...currentSteps];
    newSteps.splice(insertIndex, 0, newStep);
    updateTemplate(selectedType, newSteps);
    setAddDialogOpen(false);
    setAddStepCode("");
    toast.success(`"${option.name}" 공정이 추가되었습니다.`);
  }, [addStepCode, currentSteps, selectedType, updateTemplate]);

  // 이미 사용 중인 공정 코드
  const usedCodes = new Set(currentSteps.map((s) => s.stepCode));

  // 추가 가능한 공정 목록
  const availableSteps = (
    Object.entries(PROCESS_STEP_OPTIONS) as [ProcessStepCode, { name: string; department: string }][]
  ).filter(([code]) => !usedCodes.has(code));

  // 저장
  const handleSave = async () => {
    try {
      await saveTemplates(selectedType);
      toast.success(`${PRODUCT_TYPES[selectedType]} 공정이 저장되었습니다.`);
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  };

  // 기본 복원
  const handleReset = () => {
    resetTemplate(selectedType);
    toast.info(`${PRODUCT_TYPES[selectedType]} 공정이 기본값으로 복원되었습니다.`);
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.entries(PRODUCT_TYPES) as [ProductType, string][]).map(
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
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[13px]"
                onClick={() => setAddDialogOpen(true)}
                disabled={availableSteps.length === 0}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                공정 추가
              </Button>
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

      {/* 공정 추가 다이얼로그 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">공정 단계 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[14px]">추가할 공정 선택</Label>
              <Select
                value={addStepCode}
                onValueChange={(v) => setAddStepCode(v as ProcessStepCode)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="공정을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {availableSteps.map(([code, opt]) => {
                    const dept = DEPARTMENTS[opt.department as keyof typeof DEPARTMENTS];
                    return (
                      <SelectItem key={code} value={code}>
                        <div className="flex items-center gap-2">
                          <span>{opt.name}</span>
                          {dept && (
                            <Badge variant="secondary" className={cn("text-[10px]", dept.color)}>
                              {dept.name}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {availableSteps.length === 0 && (
                <p className="text-[13px] text-gray-500">
                  모든 공정이 이미 추가되어 있습니다.
                </p>
              )}
            </div>
            {addStepCode && (
              <div className="p-3 bg-gray-50 rounded-lg text-[13px]">
                <p>
                  <span className="text-gray-500">공정:</span>{" "}
                  <span className="font-bold">
                    {PROCESS_STEP_OPTIONS[addStepCode as ProcessStepCode]?.name}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">부서:</span>{" "}
                  {DEPARTMENTS[
                    PROCESS_STEP_OPTIONS[addStepCode as ProcessStepCode]
                      ?.department as keyof typeof DEPARTMENTS
                  ]?.name}
                </p>
                <p className="text-gray-400 mt-1">
                  QC 공정 앞에 자동 삽입됩니다.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddStep} disabled={!addStepCode}>
              <Plus className="h-4 w-4 mr-1" />
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

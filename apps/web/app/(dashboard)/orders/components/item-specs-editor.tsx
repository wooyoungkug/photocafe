'use client';

/**
 * 관리자 주문 사양 편집기 (2026-05-01 출시)
 *
 * OrderQuickEditDialog 내부에서 OrderItem 의 6가지 핵심 사양을 편집한다:
 *   1) 출력방법(printMethod) — 인디고/잉크젯
 *   2) 도수(colorIntentId) — 인디고일 때만 노출 (4도/6도 등)
 *   3) 용지(paper) — printMethod 에 따라 동적 필터
 *   4) 단/양면(printSide) — single/double/spread
 *   5) 원단(fabricName) — FabricPickerDialog 재사용
 *   6) 규격(fileSpecId) — Specification FK
 *
 * 가격은 부모(OrderQuickEditDialog) 의 calcPriceDelta 헬퍼가 별도 계산.
 */

import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { usePapersByPrintMethod } from '@/hooks/use-paper';
import { useColorIntents } from '@/hooks/use-jdf';
import { useSpecifications } from '@/hooks/use-specifications';
import { FabricPickerDialog } from '@/components/album-upload/fabric-picker-dialog';
import type { OrderItem } from '@/hooks/use-orders';

export interface ItemSpecsValue {
  printMethod?: string;
  colorIntentId?: string;
  paper?: string;
  printSide?: string;
  fabricName?: string;
  fileSpecId?: string;
}

interface ItemSpecsEditorProps {
  item: OrderItem;
  value: ItemSpecsValue;
  onChange: (next: ItemSpecsValue) => void;
  readonly?: boolean;
}

const PRINT_METHOD_OPTIONS = [
  { value: 'indigo', label: '인디고' },
  { value: 'inkjet', label: '잉크젯' },
] as const;

const PRINT_SIDE_OPTIONS = [
  { value: 'single', label: '단면' },
  { value: 'double', label: '양면' },
  { value: 'spread', label: '펼침면' },
] as const;

export function ItemSpecsEditor({
  item,
  value,
  onChange,
  readonly = false,
}: ItemSpecsEditorProps) {
  const [fabricPickerOpen, setFabricPickerOpen] = useState(false);

  // 현재 적용된 출력방법 — 변경 중이면 신규값, 아니면 기존값
  const effectivePrintMethod = (value.printMethod ?? item.printMethod ?? '').toLowerCase();

  // 용지: printMethod 에 맞는 호환 용지만 노출
  const papersQuery = usePapersByPrintMethod(effectivePrintMethod);
  const papers = papersQuery.data ?? [];

  // 도수: 인디고에서만 의미 있음
  const colorIntentsQuery = useColorIntents();
  const colorIntents = colorIntentsQuery.data ?? [];

  // 규격: 출력방법별 호환만 필터
  const specsQuery = useSpecifications({
    forIndigo: effectivePrintMethod === 'indigo' || undefined,
    forInkjet: effectivePrintMethod === 'inkjet' || undefined,
    isActive: true,
  });
  const specs = useMemo(() => specsQuery.data ?? [], [specsQuery.data]);

  const isIndigo = effectivePrintMethod === 'indigo';

  // 변경 헬퍼 — printMethod 변경 시 의존 필드(paper/colorIntent) 자동 리셋
  const update = (patch: Partial<ItemSpecsValue>) => {
    let next = { ...value, ...patch };
    if (patch.printMethod !== undefined && patch.printMethod !== effectivePrintMethod) {
      // 출력방법 전환 시 paper, colorIntentId 리셋 (호환 안 될 가능성 높음)
      next = { ...next, paper: undefined, colorIntentId: undefined };
    }
    onChange(next);
  };

  const currentPaper = value.paper ?? item.paper ?? '';
  const currentColorIntentId = value.colorIntentId ?? item.colorIntentId ?? '';
  const currentPrintSide = value.printSide ?? item.printSide ?? '';
  const currentFabricName = value.fabricName ?? item.fabricName ?? '';
  const currentFileSpecId = value.fileSpecId ?? item.fileSpecId ?? '';

  return (
    <div className="grid grid-cols-2 gap-3 p-3 rounded-md border bg-slate-50/40">
      {/* 1. 출력방법 */}
      <div className="space-y-1">
        <Label className="text-[12px] text-slate-600">출력방법</Label>
        <Select
          value={effectivePrintMethod || undefined}
          onValueChange={(v) => update({ printMethod: v })}
          disabled={readonly}
        >
          <SelectTrigger className="h-8 text-[13px]">
            <SelectValue placeholder="선택" />
          </SelectTrigger>
          <SelectContent>
            {PRINT_METHOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 2. 도수 (인디고일 때만) */}
      <div className="space-y-1">
        <Label className="text-[12px] text-slate-600">
          도수 {!isIndigo && <span className="text-slate-400">(인디고만)</span>}
        </Label>
        <Select
          value={currentColorIntentId || undefined}
          onValueChange={(v) => update({ colorIntentId: v })}
          disabled={readonly || !isIndigo}
        >
          <SelectTrigger className="h-8 text-[13px]">
            <SelectValue placeholder={isIndigo ? '4도/6도 선택' : '—'} />
          </SelectTrigger>
          <SelectContent>
            {colorIntents
              .filter((ci) => ci.isActive)
              .map((ci) => (
                <SelectItem key={ci.id} value={ci.id}>
                  {ci.displayNameKo || ci.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* 3. 용지 */}
      <div className="space-y-1 col-span-2">
        <Label className="text-[12px] text-slate-600">
          용지 {effectivePrintMethod && (
            <span className="text-slate-400">({effectivePrintMethod === 'indigo' ? '인디고' : '잉크젯'} 호환)</span>
          )}
        </Label>
        <Select
          value={currentPaper || undefined}
          onValueChange={(v) => update({ paper: v })}
          disabled={readonly || !effectivePrintMethod}
        >
          <SelectTrigger className="h-8 text-[13px]">
            <SelectValue placeholder={effectivePrintMethod ? '용지 선택' : '출력방법 먼저 선택'} />
          </SelectTrigger>
          <SelectContent>
            {/* 현재값이 호환 목록에 없으면(과거 데이터) 그대로 노출 */}
            {currentPaper && !papers.some((p) => p.name === currentPaper) && (
              <SelectItem value={currentPaper}>{currentPaper} (현재값)</SelectItem>
            )}
            {papers.map((p) => (
              <SelectItem key={p.id} value={p.name}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 4. 단/양면 */}
      <div className="space-y-1">
        <Label className="text-[12px] text-slate-600">단/양면</Label>
        <Select
          value={currentPrintSide || undefined}
          onValueChange={(v) => update({ printSide: v })}
          disabled={readonly}
        >
          <SelectTrigger className="h-8 text-[13px]">
            <SelectValue placeholder="선택" />
          </SelectTrigger>
          <SelectContent>
            {PRINT_SIDE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 5. 규격 */}
      <div className="space-y-1">
        <Label className="text-[12px] text-slate-600">규격</Label>
        <Select
          value={currentFileSpecId || undefined}
          onValueChange={(v) => update({ fileSpecId: v })}
          disabled={readonly}
        >
          <SelectTrigger className="h-8 text-[13px]">
            <SelectValue placeholder={item.size || '규격 선택'} />
          </SelectTrigger>
          <SelectContent>
            {/* 현재값이 호환 목록에 없으면 그대로 노출 */}
            {currentFileSpecId && !specs.some((s) => s.id === currentFileSpecId) && (
              <SelectItem value={currentFileSpecId}>{item.size} (현재값)</SelectItem>
            )}
            {specs.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} ({s.widthInch}×{s.heightInch}″)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 6. 원단 — FabricPickerDialog 재사용 */}
      <div className="space-y-1 col-span-2">
        <Label className="text-[12px] text-slate-600">원단</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-8 px-3 rounded-md border bg-white text-[13px] flex items-center text-slate-700">
            {currentFabricName || <span className="text-slate-400">선택 안 됨</span>}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={readonly}
            onClick={() => setFabricPickerOpen(true)}
            className="h-8"
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            변경
          </Button>
          {currentFabricName && !readonly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => update({ fabricName: '' })}
              className="h-8 text-slate-500"
            >
              제거
            </Button>
          )}
        </div>
        <FabricPickerDialog
          open={fabricPickerOpen}
          onOpenChange={setFabricPickerOpen}
          selectedFabricId={null}
          onSelect={(f) => {
            update({ fabricName: f.name });
            setFabricPickerOpen(false);
          }}
        />
      </div>
    </div>
  );
}

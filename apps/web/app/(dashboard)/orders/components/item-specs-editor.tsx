'use client';

/**
 * 관리자 주문 사양 편집기 (2026-05-01 출시, 2026-04-29 상품옵션 한정)
 *
 * OrderQuickEditDialog 내부에서 OrderItem 의 핵심 사양을 편집한다.
 * 옵션 범위는 OrderItem.productId 가 가진 상품옵션(Product.{specifications,papers,...}) 으로 제한.
 * 도수만 시스템 단일 마스터(useColorIntents)를 사용한다.
 *
 * 편집 가능 항목:
 *   1) 출력방법(printMethod) — product.papers 의 printMethod 유니크값
 *   2) 도수(colorIntentId) — 인디고일 때만 노출 (전역 마스터)
 *   3) 용지(paper) — product.papers (printMethod 및 4/6도 활성여부 필터)
 *   4) 단/양면(printSide) — product.printType 이 single/double 이면 잠금
 *   5) 규격(fileSpecId) — product.specifications
 *   6) 원단(fabricName) — product.fabrics, 비어있으면 FabricPickerDialog 폴백
 *   7) 제본(bindingType) — product.bindings (옵션 있을 때만)
 *   8) 후가공(finishingOptions) — product.finishings (다중선택)
 *   9) 박/동판(foilName) — product.foils
 */

import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil } from 'lucide-react';
import { useColorIntents } from '@/hooks/use-jdf';
import { useProduct } from '@/hooks/use-products';
import { useCopperPlateLabels, useCopperPlatesByClient } from '@/hooks/use-copper-plates';
import { usePublicCopperPlates } from '@/hooks/use-public-copper-plates';
import { FabricPickerDialog } from '@/components/album-upload/fabric-picker-dialog';
import type { OrderItem } from '@/hooks/use-orders';

export interface ItemSpecsValue {
  printMethod?: string;
  colorIntentId?: string;
  paper?: string;
  printSide?: string;
  fabricName?: string;
  fileSpecId?: string;
  bindingType?: string;
  finishingOptions?: string[];
  foilName?: string;
  foilColor?: string;
  foilPosition?: string;
}

// 동일 이름 용지가 그램수만 다른 경우 Select value 가 충돌하므로 그램수 포함 라벨로 통일
function buildPaperLabel(name: string, grammage?: number | null): string {
  if (!name) return '';
  return grammage ? `${name} (${grammage}g)` : name;
}

interface ItemSpecsEditorProps {
  item: OrderItem;
  value: ItemSpecsValue;
  onChange: (next: ItemSpecsValue) => void;
  readonly?: boolean;
  clientId?: string;
}

const PRINT_SIDE_OPTIONS = [
  { value: 'single', label: '단면' },
  { value: 'double', label: '양면' },
  { value: 'spread', label: '펼침면' },
] as const;

const PRINT_METHOD_LABELS: Record<string, string> = {
  indigo: '인디고',
  inkjet: '잉크젯',
  offset: '옵셋',
};

/**
 * 레거시 한글 printMethod ("인디고", "인디고6도", "잉크젯", "옵셋", "인디고앨범" 등) 를
 * 표준 토큰("indigo" / "inkjet" / "offset") 으로 정규화한다.
 * 정규화에 실패하면 lowercase 원문을 그대로 반환한다.
 */
function normalizePrintMethod(raw: string | null | undefined): string {
  if (!raw) return '';
  const v = raw.toLowerCase();
  if (v.includes('indigo') || v.includes('인디고')) return 'indigo';
  if (v.includes('inkjet') || v.includes('잉크젯')) return 'inkjet';
  if (v.includes('offset') || v.includes('옵셋') || v.includes('오프셋')) return 'offset';
  return v;
}

export function ItemSpecsEditor({
  item,
  value,
  onChange,
  readonly = false,
  clientId,
}: ItemSpecsEditorProps) {
  const [fabricPickerOpen, setFabricPickerOpen] = useState(false);

  const productQuery = useProduct(item.productId);
  const product = productQuery.data;
  const isProductLoading = productQuery.isLoading;

  const colorIntentsQuery = useColorIntents();
  const colorIntents = colorIntentsQuery.data ?? [];

  const copperLabelsQuery = useCopperPlateLabels();
  const foilColors = copperLabelsQuery.data?.foilColors?.filter((c) => c.isActive) ?? [];
  const platePositions = copperLabelsQuery.data?.platePositions?.filter((p) => p.isActive) ?? [];

  const ownedPlatesQuery = useCopperPlatesByClient(clientId);
  const storedOwnedPlates = (ownedPlatesQuery.data ?? []).filter((p) => p.status === 'stored');
  const publicPlatesQuery = usePublicCopperPlates();
  const activePublicPlates = publicPlatesQuery.data?.data ?? [];

  // 사용자가 select 등으로 명시적으로 고친 값(원형). 표시 라벨에 사용.
  const rawPrintMethod = value.printMethod ?? item.printMethod ?? '';
  // 비교/필터링용 정규화 값(표준 토큰: indigo/inkjet/offset)
  const effectivePrintMethod = normalizePrintMethod(rawPrintMethod);

  // 현재 도수가 6도인지 판별 (용지 4/6도 활성 필터 용도)
  const currentColorIntentId = value.colorIntentId ?? item.colorIntentId ?? '';
  const isSixColor = useMemo(() => {
    const ci = colorIntents.find((c) => c.id === currentColorIntentId);
    return (ci?.numColorsFront ?? 0) >= 6;
  }, [colorIntents, currentColorIntentId]);

  // 용지: printMethod + 4/6도 활성 필터
  const paperOptions = useMemo(() => {
    if (!product?.papers || !effectivePrintMethod) return [];
    return product.papers.filter((p) => {
      if ((p.printMethod ?? '').toLowerCase() !== effectivePrintMethod) return false;
      if (effectivePrintMethod === 'indigo') {
        return isSixColor ? p.isActive6 !== false : p.isActive4 !== false;
      }
      return p.isActive !== false;
    });
  }, [product?.papers, effectivePrintMethod, isSixColor]);

  // 규격 - 업로드 파일 비율과 일치하는 규격만 표시
  const specOptions = useMemo(() => {
    const allSpecs = product?.specifications ?? [];
    if (allSpecs.length === 0) return allSpecs;

    // 파일 치수로 비율 파악 (primary)
    let targetRatio: number | null = null;
    const firstFile = item.files.find(f => f.widthInch > 0 && f.heightInch > 0);
    if (firstFile) {
      const isSpread = item.pageLayout === 'spread';
      targetRatio = (isSpread ? firstFile.widthInch / 2 : firstFile.widthInch) / firstFile.heightInch;
    }

    // 현재 규격으로 비율 파악 (fallback)
    if (targetRatio === null) {
      const fileSpecId = value.fileSpecId ?? item.fileSpecId ?? '';
      if (fileSpecId) {
        const cur = allSpecs.find(s => (s.specificationId ?? s.id) === fileSpecId);
        if (cur?.widthMm && cur?.heightMm) {
          targetRatio = cur.widthMm / cur.heightMm;
        }
      }
    }

    if (targetRatio === null) return allSpecs;

    const RATIO_TOLERANCE = 0.015; // 1.5% 오차 허용
    const matched = allSpecs.filter(s => {
      if (!s.widthMm || !s.heightMm) return false;
      return Math.abs(s.widthMm / s.heightMm - targetRatio!) / targetRatio! <= RATIO_TOLERANCE;
    });

    return matched.length > 0 ? matched : allSpecs;
  }, [product?.specifications, value.fileSpecId, item.fileSpecId, item.files, item.pageLayout]);

  // 원단
  const fabricOptions = useMemo(() => product?.fabrics ?? [], [product?.fabrics]);

  // 제본
  const bindingOptions = useMemo(() => product?.bindings ?? [], [product?.bindings]);

  // 후가공
  const finishingOptions = useMemo(() => product?.finishings ?? [], [product?.finishings]);

  // 박/동판
  const foilOptions = useMemo(() => product?.foils ?? [], [product?.foils]);

  const isIndigo = effectivePrintMethod === 'indigo';

  // printType 잠금: customer 가 아니면 그 값 강제
  const printTypeLock: 'single' | 'double' | null =
    product?.printType === 'single' || product?.printType === 'double'
      ? product.printType
      : null;

  const update = (patch: Partial<ItemSpecsValue>) => {
    let next = { ...value, ...patch };
    if (patch.printMethod !== undefined && patch.printMethod !== effectivePrintMethod) {
      // 출력방법 전환 시 paper, colorIntentId 리셋 (호환 안 될 가능성 높음)
      next = { ...next, paper: undefined, colorIntentId: undefined };
    }
    onChange(next);
  };

  // ==================== 출력방법+도수 합본 (고객 화면 동일) ====================
  // value: 'indigo_4c' | 'indigo_6c' | 'inkjet'
  type CombinedMethod = 'indigo_4c' | 'indigo_6c' | 'inkjet';

  const has4doPapers = useMemo(
    () => (product?.papers ?? []).some((p) => p.printMethod === 'indigo' && p.isActive4 !== false),
    [product?.papers],
  );
  const has6doPapers = useMemo(
    () => (product?.papers ?? []).some((p) => p.printMethod === 'indigo' && p.isActive6 !== false),
    [product?.papers],
  );
  const hasInkjetPapers = useMemo(
    () => (product?.papers ?? []).some((p) => p.printMethod === 'inkjet' && p.isActive !== false),
    [product?.papers],
  );

  const combinedMethodValue: CombinedMethod | undefined = effectivePrintMethod === 'inkjet'
    ? 'inkjet'
    : effectivePrintMethod === 'indigo'
      ? (isSixColor ? 'indigo_6c' : 'indigo_4c')
      : undefined;

  /**
   * 합본 출력방법 선택 시 처리:
   *   - printMethod 표준화 (indigo / inkjet)
   *   - colorIntentId 를 '현재 단/양면' 과 매칭하여 자동 설정
   *   - paper 는 호환되지 않을 수 있으므로 리셋
   */
  const handleCombinedMethodChange = (next: CombinedMethod) => {
    const sideToken = (printTypeLock ?? currentPrintSide ?? 'single').toString();
    const wantDouble = sideToken === 'double' || sideToken === 'spread';
    if (next === 'inkjet') {
      onChange({
        ...value,
        printMethod: 'inkjet',
        colorIntentId: undefined,
        paper: undefined,
      });
      return;
    }
    const wantNumColors = next === 'indigo_6c' ? 6 : 4;
    const matchingIntent = colorIntents.find(
      (ci) => ci.isActive && (ci.numColorsFront ?? 0) === wantNumColors
        && (wantDouble
          ? /양면|double/i.test(`${ci.name} ${ci.displayNameKo ?? ''}`)
          : /단면|single/i.test(`${ci.name} ${ci.displayNameKo ?? ''}`)),
    );
    onChange({
      ...value,
      printMethod: 'indigo',
      colorIntentId: matchingIntent?.id ?? value.colorIntentId,
      paper: undefined,
    });
  };

  const currentPaper = value.paper ?? item.paper ?? '';
  const currentPrintSide = value.printSide ?? item.printSide ?? '';
  const currentFabricName = value.fabricName ?? item.fabricName ?? '';
  const currentFileSpecId = value.fileSpecId ?? item.fileSpecId ?? '';
  const currentBindingType = value.bindingType ?? item.bindingType ?? '';
  const currentFoilName = value.foilName ?? item.foilName ?? '';
  const currentFoilColor = value.foilColor ?? item.foilColor ?? '';
  const currentFoilPosition = value.foilPosition ?? item.foilPosition ?? '';
  const currentFinishingOptions = value.finishingOptions ?? item.finishingOptions ?? [];

  // 박/동판 선택 시에만 색상·위치 노출
  const foilSelected = !!currentFoilName;

  const toggleFinishing = (name: string) => {
    const set = new Set(currentFinishingOptions);
    if (set.has(name)) set.delete(name);
    else set.add(name);
    update({ finishingOptions: Array.from(set) });
  };

  // 적용된 단/양면 — printType 잠금 시 그 값 강제
  const appliedPrintSide = printTypeLock ?? currentPrintSide;

  const loadingPlaceholder = isProductLoading ? '상품 옵션 로딩 중...' : undefined;

  return (
    <div className="grid grid-cols-2 gap-3 p-3 rounded-md border bg-slate-50/40">
      {/* 1줄: 출력방법 · 용지 · 단/양면 — 고객 화면과 동일 순서 */}
      <div className="col-span-2 grid grid-cols-3 gap-2">
        {/* 출력방법 */}
        <div className="space-y-1">
          <Label className="text-[12px] text-slate-600">출력방법</Label>
          <Select
            value={combinedMethodValue}
            onValueChange={(v) => handleCombinedMethodChange(v as CombinedMethod)}
            disabled={readonly || isProductLoading}
          >
            <SelectTrigger className="h-8 text-[13px]">
              <SelectValue placeholder={loadingPlaceholder ?? '출력방법 선택'} />
            </SelectTrigger>
            <SelectContent>
              {has4doPapers && <SelectItem value="indigo_4c">인디고 4도</SelectItem>}
              {has6doPapers && <SelectItem value="indigo_6c">인디고 6도</SelectItem>}
              {hasInkjetPapers && <SelectItem value="inkjet">잉크젯</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        {/* 용지 — 출력방법에 해당하는 상품 용지만 표시 */}
        <div className="space-y-1">
          <Label className="text-[12px] text-slate-600">용지</Label>
          <Select
            value={currentPaper || undefined}
            onValueChange={(v) => update({ paper: v })}
            disabled={readonly || !effectivePrintMethod || isProductLoading}
          >
            <SelectTrigger className="h-8 text-[13px]">
              <SelectValue placeholder={
                loadingPlaceholder ??
                (effectivePrintMethod ? '용지 선택' : '출력방법 먼저 선택')
              } />
            </SelectTrigger>
            <SelectContent>
              {currentPaper &&
                !paperOptions.some(
                  (p) => buildPaperLabel(p.name, p.grammage) === currentPaper,
                ) && (
                  <SelectItem value={currentPaper}>{currentPaper} (현재값)</SelectItem>
                )}
              {paperOptions.map((p) => {
                const label = buildPaperLabel(p.name, p.grammage);
                return (
                  <SelectItem key={p.id} value={label}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* 단/양면 */}
        <div className="space-y-1">
          <Label className="text-[12px] text-slate-600">
            단/양면{printTypeLock && <span className="text-slate-400"> (고정)</span>}
          </Label>
          <Select
            value={appliedPrintSide || undefined}
            onValueChange={(v) => update({ printSide: v })}
            disabled={readonly || !!printTypeLock}
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
      </div>

      {/* 2줄: 제본 · 규격 · 원단 — 1줄 */}
      <div className="col-span-2 grid grid-cols-3 gap-2">
        {/* 제본 */}
        {bindingOptions.length > 0 ? (
          <div className="space-y-1">
            <Label className="text-[12px] text-slate-600">제본</Label>
            <Select
              value={currentBindingType || undefined}
              onValueChange={(v) => update({ bindingType: v })}
              disabled={readonly}
            >
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue placeholder="제본 선택" />
              </SelectTrigger>
              <SelectContent>
                {currentBindingType && !bindingOptions.some((b) => b.name === currentBindingType) && (
                  <SelectItem value={currentBindingType}>{currentBindingType} (현재값)</SelectItem>
                )}
                {bindingOptions.map((b) => (
                  <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : <div />}

        {/* 규격 */}
        <div className="space-y-1">
          <Label className="text-[12px] text-slate-600">규격</Label>
          <Select
            value={currentFileSpecId || undefined}
            onValueChange={(v) => update({ fileSpecId: v })}
            disabled={readonly || isProductLoading || specOptions.length === 0}
          >
            <SelectTrigger className="h-8 text-[13px]">
              <SelectValue placeholder={loadingPlaceholder ?? (item.size || '규격 선택')} />
            </SelectTrigger>
            <SelectContent>
              {currentFileSpecId &&
                !specOptions.some((s) => (s.specificationId ?? s.id) === currentFileSpecId) && (
                  <SelectItem value={currentFileSpecId}>{item.size} (현재값)</SelectItem>
                )}
              {specOptions.map((ps) => {
                const optValue = ps.specificationId ?? ps.id;
                const wIn = parseFloat((ps.widthMm / 25.4).toFixed(1));
                const hIn = parseFloat((ps.heightMm / 25.4).toFixed(1));
                return (
                  <SelectItem key={ps.id} value={optValue}>
                    {ps.name} ({wIn}×{hIn}″)
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* 원단 */}
        <div className="space-y-1">
          <Label className="text-[12px] text-slate-600">원단</Label>
          {fabricOptions.length > 0 ? (
            <Select
              value={currentFabricName || undefined}
              onValueChange={(v) => update({ fabricName: v })}
              disabled={readonly}
            >
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue placeholder="원단 선택" />
              </SelectTrigger>
              <SelectContent>
                {currentFabricName && !fabricOptions.some((f) => f.fabric.name === currentFabricName) && (
                  <SelectItem value={currentFabricName}>{currentFabricName} (현재값)</SelectItem>
                )}
                {fabricOptions.map((f) => (
                  <SelectItem key={f.fabricId} value={f.fabric.name}>
                    {f.fabric.name}
                    {f.fabric.colorName ? ` · ${f.fabric.colorName}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-1">
              <div className="h-8 px-3 rounded-md border bg-white text-[13px] flex items-center text-slate-700 truncate">
                {currentFabricName || <span className="text-slate-400">선택 안 됨</span>}
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={readonly}
                  onClick={() => setFabricPickerOpen(true)}
                  className="h-7 text-[11px] flex-1"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  변경
                </Button>
                {currentFabricName && !readonly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => update({ fabricName: '' })}
                    className="h-7 text-[11px] text-slate-500"
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
          )}
        </div>

        {/* 제본 */}
      </div>

      {/* 8. 박/동판 + 박 색상/위치 — 고객 보유동판 + 공용동판 */}
      {foilOptions.length > 0 && (
        <div className="space-y-1 col-span-2">
          <Label className="text-[12px] text-slate-600">박/동판</Label>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[12px] text-slate-600">동판명</Label>
            <Select
              value={currentFoilName || undefined}
              onValueChange={(v) => {
                if (v === '__none__') update({ foilName: '', foilColor: '', foilPosition: '' });
                else update({ foilName: v });
              }}
              disabled={readonly}
            >
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue placeholder="동판 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">동판 없음</SelectItem>
                {currentFoilName &&
                  !activePublicPlates.some((p) => p.plateName === currentFoilName) &&
                  !storedOwnedPlates.some((p) => p.plateName === currentFoilName) && (
                    <SelectItem value={currentFoilName}>{currentFoilName} (현재값)</SelectItem>
                  )}
                {storedOwnedPlates.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>보유동판 ({storedOwnedPlates.length})</SelectLabel>
                    {storedOwnedPlates.map((p) => (
                      <SelectItem key={p.id} value={p.plateName}>
                        {p.plateName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {activePublicPlates.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>공용동판</SelectLabel>
                    {activePublicPlates.map((p) => (
                      <SelectItem key={p.id} value={p.plateName}>
                        {p.plateName}
                        {p.widthMm || p.heightMm ? ` (${p.widthMm}×${p.heightMm}mm)` : ''}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[12px] text-slate-600">박컬러</Label>
              <Select
                value={currentFoilColor || undefined}
                onValueChange={(v) => update({ foilColor: v === '__none__' ? '' : v })}
                disabled={readonly || !foilSelected}
              >
                <SelectTrigger className="h-8 text-[13px]">
                  <SelectValue placeholder={foilSelected ? '선택' : '동판 선택 후'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">선택 없음</SelectItem>
                  {currentFoilColor &&
                    !foilColors.some(
                      (c) => c.name === currentFoilColor,
                    ) && (
                      <SelectItem value={currentFoilColor}>{currentFoilColor} (현재값)</SelectItem>
                    )}
                  {foilColors.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[12px] text-slate-600">박위치</Label>
              <Select
                value={currentFoilPosition || undefined}
                onValueChange={(v) => update({ foilPosition: v === '__none__' ? '' : v })}
                disabled={readonly || !foilSelected}
              >
                <SelectTrigger className="h-8 text-[13px]">
                  <SelectValue placeholder={foilSelected ? '선택' : '동판 선택 후'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">선택 없음</SelectItem>
                  {currentFoilPosition &&
                    !platePositions.some(
                      (p) => p.name === currentFoilPosition,
                    ) && (
                      <SelectItem value={currentFoilPosition}>{currentFoilPosition} (현재값)</SelectItem>
                    )}
                  {platePositions.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* 9. 후가공 (다중선택) */}
      {finishingOptions.length > 0 && (
        <div className="space-y-1 col-span-2">
          <Label className="text-[12px] text-slate-600">후가공 (복수선택)</Label>
          <div className="grid grid-cols-3 gap-1.5 p-2 rounded-md border bg-white">
            {finishingOptions.map((f) => {
              const checked = currentFinishingOptions.includes(f.name);
              return (
                <label
                  key={f.id}
                  className="flex items-center gap-1.5 text-[12px] text-slate-700 cursor-pointer select-none"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleFinishing(f.name)}
                    disabled={readonly}
                  />
                  <span>{f.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

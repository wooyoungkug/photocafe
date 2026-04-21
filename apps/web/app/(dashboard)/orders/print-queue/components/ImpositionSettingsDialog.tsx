'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import ImpositionPreviewCanvas from '@/components/imposition/ImpositionPreviewCanvas';
import PresetSelector from '@/components/imposition/PresetSelector';
import {
  useImpositionCalculate,
  useCreateImpositionPreset,
  useRunImposition,
  useDownloadImpositionJdf,
  useDownloadImpositionPdf,
  ImpositionPreset,
  CalculateImpositionRequest,
  ImpositionResult,
} from '@/hooks/use-imposition';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 기본값 힌트: 선택된 주문 항목으로부터 */
  seed?: {
    orderId: string;
    orderItemId: string;
    productWidth?: number;
    productHeight?: number;
    /** 표시 단위 힌트 (mm | inch). 앨범 주문은 보통 inch. 미지정 시 mm */
    productUnit?: 'mm' | 'inch';
    pageCount?: number;
    bindingType?: 'compressed' | 'tack' | 'perfect' | 'flat';
  };
}

const SHEET_PRESETS = [
  { key: '7900', label: '7900 (330×482)', w: 330, h: 482 },
  { key: '7900S', label: '7900 (315×467)', w: 315, h: 467 },
  { key: 'custom', label: '커스텀', w: 0, h: 0 },
] as const;

type SheetKey = typeof SHEET_PRESETS[number]['key'];

// 제품(앨범) 규격 프리셋 — inch 값은 UI 편의용, 내부는 mm 저장
type ProductPreset = { key: string; label: string; w: number; h: number; unit: 'mm' | 'inch'; group: string };
const IN = 25.4;
const mkInch = (w: number, h: number, group: string): ProductPreset => ({
  key: `${group}-${w}x${h}`,
  label: `${w}×${h}"`,
  w: w * IN,
  h: h * IN,
  unit: 'inch',
  group,
});
// 인디고 7900 (330×482) / 7900S (315×467) 기준 실제 제작되는 한국 웨딩·포토 앨범 규격만 포함
const PRODUCT_PRESETS: ProductPreset[] = [
  // 정사각 — 인디고 시트에 앉는 범위
  mkInch(6, 6, '정사각'),
  mkInch(8, 8, '정사각'),
  mkInch(10, 10, '정사각'),
  mkInch(11, 11, '정사각'),
  mkInch(12, 12, '정사각'),
  // 세로 (W < H) — 웨딩/포토 앨범 표준
  mkInch(5, 7, '세로'),
  mkInch(6, 8, '세로'),
  mkInch(7, 10, '세로'),
  mkInch(8, 10, '세로'),
  mkInch(8, 12, '세로'),
  mkInch(10, 12, '세로'),
  mkInch(11, 14, '세로'),
  mkInch(12, 15, '세로'),
  // 가로 (W > H)
  mkInch(7, 5, '가로'),
  mkInch(7, 5.5, '가로'),
  mkInch(8, 6, '가로'),
  mkInch(10, 7, '가로'),
  mkInch(10, 8, '가로'),
  mkInch(12, 8, '가로'),
  mkInch(12, 10, '가로'),
  mkInch(14, 11, '가로'),
  mkInch(15, 12, '가로'),
  // 커스텀
  { key: 'custom', label: '커스텀 (직접 입력)', w: 0, h: 0, unit: 'mm', group: '기타' },
];
const PRODUCT_GROUPS = ['정사각', '세로', '가로', '기타'];

export default function ImpositionSettingsDialog({ open, onOpenChange, seed }: Props) {
  // ==== 상태 ====
  const [bindingTab, setBindingTab] = useState<'compressed' | 'tack' | 'perfect'>(
    seed?.bindingType === 'tack' ? 'tack'
      : seed?.bindingType === 'perfect' ? 'perfect'
      : 'compressed',
  );
  const [sheetKey, setSheetKey] = useState<SheetKey>('7900S');
  const [sheetW, setSheetW] = useState<number>(315);
  const [sheetH, setSheetH] = useState<number>(467);

  const [productW, setProductW] = useState<number>(seed?.productWidth ?? 210);
  const [productH, setProductH] = useState<number>(seed?.productHeight ?? 297);
  const [pageCount, setPageCount] = useState<number>(seed?.pageCount ?? 20);
  const [productUnit, setProductUnit] = useState<'mm' | 'inch'>('inch');
  const [productPresetKey, setProductPresetKey] = useState<string>('custom');
  const MM_PER_INCH = 25.4;
  const toDisplay = (mm: number) =>
    productUnit === 'inch' ? Math.round((mm / MM_PER_INCH) * 100) / 100 : Math.round(mm * 100) / 100;
  const fromDisplay = (val: number) => (productUnit === 'inch' ? val * MM_PER_INCH : val);

  const [marginT, setMarginT] = useState(8.5);
  const [marginR, setMarginR] = useState(2.5);
  const [marginB, setMarginB] = useState(8.5);
  const [marginL, setMarginL] = useState(2.5);

  const [bleed, setBleed] = useState(0);
  const [gutter, setGutter] = useState(3);
  const [rotationPolicy, setRotationPolicy] = useState<'0' | '90' | 'auto'>('auto');
  const [manualNup, setManualNup] = useState<number | ''>('');
  const [centerAlign, setCenterAlign] = useState(false);
  const [noGutter, setNoGutter] = useState(false);

  // 압축앨범
  const [creaseWidth, setCreaseWidth] = useState(0);
  const [creaseStyle, setCreaseStyle] = useState<'dashed' | 'solid'>('dashed');
  const [creaseDepth, setCreaseDepth] = useState(0.3);

  // 타카
  const [tackMargin, setTackMargin] = useState(12);
  const [tackEdge, setTackEdge] = useState<'left' | 'right' | 'top' | 'bottom'>('left');

  // 마크
  const [showCrop, setShowCrop] = useState(true);
  const [showBleed, setShowBleed] = useState(true);
  const [showReg, setShowReg] = useState(true);
  const [showColorBar, setShowColorBar] = useState(true);
  const [showJobMeta, setShowJobMeta] = useState(true);

  // 프리셋 선택 상태
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // 프리뷰
  const [result, setResult] = useState<ImpositionResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);

  // ==== 훅 ====
  const calcMut = useImpositionCalculate();
  const createPresetMut = useCreateImpositionPreset();
  const runMut = useRunImposition();
  const dlJdf = useDownloadImpositionJdf();
  const dlPdf = useDownloadImpositionPdf();

  // seed 변경 시 동기화
  useEffect(() => {
    if (!open) return;
    if (seed?.productWidth) setProductW(seed.productWidth);
    if (seed?.productHeight) setProductH(seed.productHeight);
    if (seed?.productUnit === 'inch' || seed?.productUnit === 'mm') {
      setProductUnit(seed.productUnit);
    }
    if (seed?.pageCount) setPageCount(seed.pageCount);
    if (seed?.bindingType === 'tack' || seed?.bindingType === 'compressed' || seed?.bindingType === 'perfect') {
      setBindingTab(seed.bindingType);
    }
  }, [open, seed?.productWidth, seed?.productHeight, seed?.productUnit, seed?.pageCount, seed?.bindingType]);

  // ==== 요청 payload ====
  const payload: CalculateImpositionRequest = useMemo(() => ({
    productWidth: productW,
    productHeight: productH,
    pageCount,
    bindingType: bindingTab,
    sheetWidth: sheetW,
    sheetHeight: sheetH,
    marginTop: marginT,
    marginRight: marginR,
    marginBottom: marginB,
    marginLeft: marginL,
    bleed,
    gutter,
    rotationPolicy,
    grainDirection: 'short',
    creaseWidth: bindingTab === 'compressed' ? creaseWidth : undefined,
    tackMargin: bindingTab === 'tack' ? tackMargin : undefined,
    tackEdge: bindingTab === 'tack' ? tackEdge : undefined,
    manualNup: manualNup === '' ? undefined : Number(manualNup),
    centerAlign,
    noGutter,
  }), [
    productW, productH, pageCount, bindingTab, sheetW, sheetH,
    marginT, marginR, marginB, marginL,
    bleed, gutter, rotationPolicy,
    creaseWidth, tackMargin, tackEdge, manualNup,
    centerAlign, noGutter,
  ]);

  // ==== debounce 150ms 자동 재계산 ====
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      calcMut.mutate(payload, {
        onSuccess: (r) => {
          setResult(r);
          setCalcError(null);
          if (sheetIndex >= r.sheets.length) setSheetIndex(0);
        },
        onError: (e: any) => {
          setResult(null);
          const msg = e?.response?.data?.message || e?.message || '계산 실패';
          setCalcError(Array.isArray(msg) ? msg.join(', ') : String(msg));
        },
      });
    }, 150);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payload]);

  // ==== 시트 프리셋 변경 ====
  const onSheetKeyChange = (k: SheetKey) => {
    setSheetKey(k);
    const p = SHEET_PRESETS.find((s) => s.key === k)!;
    if (k !== 'custom') {
      setSheetW(p.w);
      setSheetH(p.h);
    }
  };

  // ==== 프리셋 선택 → 폼 채우기 ====
  const onPresetPick = (p: ImpositionPreset | null) => {
    if (!p) {
      setSelectedPresetId(null);
      return;
    }
    setSelectedPresetId(p.id);
    setBindingTab(
      p.bindingType === 'tack' ? 'tack'
      : p.bindingType === 'perfect' ? 'perfect'
      : 'compressed',
    );
    setSheetW(Number(p.sheetWidth));
    setSheetH(Number(p.sheetHeight));
    if (Number(p.sheetWidth) === 330 && Number(p.sheetHeight) === 482) setSheetKey('7900');
    else if (Number(p.sheetWidth) === 315 && Number(p.sheetHeight) === 467) setSheetKey('7900S');
    else setSheetKey('custom');
    setMarginT(Number(p.marginTop));
    setMarginR(Number(p.marginRight));
    setMarginB(Number(p.marginBottom));
    setMarginL(Number(p.marginLeft));
    setGutter(Number(p.gutter));
    setBleed(Number(p.bleed));
    if (p.creaseWidth !== null && p.creaseWidth !== undefined) setCreaseWidth(Number(p.creaseWidth));
    if (p.tackMargin !== null && p.tackMargin !== undefined) setTackMargin(Number(p.tackMargin));
    if (p.tackEdge) setTackEdge(p.tackEdge);
    setRotationPolicy(p.rotationPolicy);
  };

  // ==== 프리셋 저장 ====
  const onSavePreset = () => {
    const name = window.prompt('프리셋 이름을 입력하세요', `${bindingTab} ${sheetW}×${sheetH}`);
    if (!name) return;
    createPresetMut.mutate(
      {
        name,
        bindingType: bindingTab,
        sheetWidth: sheetW,
        sheetHeight: sheetH,
        marginTop: marginT,
        marginRight: marginR,
        marginBottom: marginB,
        marginLeft: marginL,
        gutter,
        bleed,
        creaseWidth: bindingTab === 'compressed' ? creaseWidth : null,
        tackMargin: bindingTab === 'tack' ? tackMargin : null,
        tackEdge: bindingTab === 'tack' ? tackEdge : null,
        grainDirection: 'short',
        rotationPolicy,
        isDefault: false,
      } as any,
      {
        onSuccess: () => toast.success('프리셋이 저장되었습니다.'),
        onError: (e) => toast.error(`저장 실패: ${e.message}`),
      },
    );
  };

  // ==== 실행 (JDF+PDF 생성) ====
  const onRun = () => {
    if (!seed?.orderId || !seed?.orderItemId) {
      toast.error('주문/항목 정보가 없습니다. 행에서 [임포지션]을 눌러주세요.');
      return;
    }
    if (!selectedPresetId) {
      toast.error('프리셋을 먼저 선택하거나 저장한 후 실행해주세요.');
      return;
    }
    runMut.mutate(
      {
        orderId: seed.orderId,
        orderItemId: seed.orderItemId,
        presetId: selectedPresetId,
        manualNup: manualNup === '' ? undefined : Number(manualNup),
      },
      {
        onSuccess: (job) => {
          toast.success('JDF + PDF 생성 완료');
          dlJdf.mutate(job.id);
          setTimeout(() => dlPdf.mutate(job.id), 500);
        },
        onError: (e) => toast.error(`생성 실패: ${e.message}`),
      },
    );
  };

  const util = result?.utilization ?? 0;
  const utilLow = util > 0 && util < 0.5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-[24px] text-black font-normal">
              인디고 임포지션 설정
            </DialogTitle>
            <div className="flex items-center gap-2 mr-8">
              <div className="w-[260px]">
                <PresetSelector
                  value={selectedPresetId}
                  onChange={onPresetPick}
                  bindingType={bindingTab}
                />
              </div>
              <Button variant="outline" size="sm" onClick={onSavePreset}>
                저장
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-[420px_1fr] min-h-0 overflow-hidden">
          {/* ==== 좌측 설정 420 ==== */}
          <div className="border-r overflow-y-auto p-5 space-y-5">
            {/* 시트 규격 */}
            <section className="space-y-2">
              <h3 className="text-[18px] text-black font-bold">시트 규격</h3>
              <div className="flex gap-3">
                {SHEET_PRESETS.map((s) => (
                  <label key={s.key} className="flex items-center gap-1.5 text-[14px] text-black font-normal cursor-pointer">
                    <input
                      type="radio"
                      name="sheet"
                      checked={sheetKey === s.key}
                      onChange={() => onSheetKeyChange(s.key)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-[14px] text-black font-normal">W (mm)</Label>
                  <Input
                    type="number"
                    value={sheetW}
                    onChange={(e) => setSheetW(Number(e.target.value))}
                    disabled={sheetKey !== 'custom'}
                    className="h-9 text-[14px]"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-[14px] text-black font-normal">H (mm)</Label>
                  <Input
                    type="number"
                    value={sheetH}
                    onChange={(e) => setSheetH(Number(e.target.value))}
                    disabled={sheetKey !== 'custom'}
                    className="h-9 text-[14px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'T', value: marginT, setter: setMarginT },
                  { label: 'R', value: marginR, setter: setMarginR },
                  { label: 'B', value: marginB, setter: setMarginB },
                  { label: 'L', value: marginL, setter: setMarginL },
                ].map((m) => (
                  <div key={m.label}>
                    <Label className="text-[14px] text-black font-normal">여백 {m.label}</Label>
                    <Input
                      type="number"
                      value={m.value}
                      onChange={(e) => m.setter(Number(e.target.value))}
                      className="h-9 text-[14px]"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* 제품 규격 */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[18px] text-black font-bold">제품(앨범) 규격</h3>
                <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setProductUnit('mm')}
                    className={`px-3 h-7 text-[14px] font-normal ${productUnit === 'mm' ? 'bg-black text-white' : 'bg-white text-black'}`}
                  >
                    mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductUnit('inch')}
                    className={`px-3 h-7 text-[14px] font-normal ${productUnit === 'inch' ? 'bg-black text-white' : 'bg-white text-black'}`}
                  >
                    inch
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-[14px] text-black font-normal">규격 프리셋</Label>
                <select
                  aria-label="제품 규격 프리셋"
                  title="제품 규격 프리셋"
                  value={productPresetKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    setProductPresetKey(key);
                    const preset = PRODUCT_PRESETS.find((p) => p.key === key);
                    if (preset && preset.key !== 'custom') {
                      setProductW(preset.w);
                      setProductH(preset.h);
                      setProductUnit(preset.unit);
                    }
                  }}
                  className="w-full h-9 text-[14px] text-black font-normal border border-gray-300 rounded-md px-2 bg-white"
                >
                  {PRODUCT_GROUPS.map((group) => (
                    <optgroup key={group} label={group}>
                      {PRODUCT_PRESETS.filter((p) => p.group === group).map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[14px] text-black font-normal">W ({productUnit})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={toDisplay(productW)}
                    onChange={(e) => setProductW(fromDisplay(Number(e.target.value)))}
                    className="h-9 text-[14px]"
                  />
                </div>
                <div>
                  <Label className="text-[14px] text-black font-normal">H ({productUnit})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={toDisplay(productH)}
                    onChange={(e) => setProductH(fromDisplay(Number(e.target.value)))}
                    className="h-9 text-[14px]"
                  />
                </div>
                <div>
                  <Label className="text-[14px] text-black font-normal">페이지</Label>
                  <Input
                    type="number"
                    value={pageCount}
                    onChange={(e) => setPageCount(Number(e.target.value))}
                    className="h-9 text-[14px]"
                  />
                </div>
              </div>
              {productUnit === 'inch' && (
                <p className="text-[14px] text-black font-normal opacity-60">
                  내부 계산은 mm 기준 (현재: {Math.round(productW * 10) / 10} × {Math.round(productH * 10) / 10} mm)
                </p>
              )}
            </section>

            {/* Nup / 회전 / 갭 */}
            <section className="space-y-2">
              <h3 className="text-[18px] text-black font-bold">Nup & 회전</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[14px] text-black font-normal">Nup (0=자동)</Label>
                  <Input
                    type="number"
                    value={manualNup}
                    onChange={(e) => setManualNup(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="자동"
                    className="h-9 text-[14px]"
                  />
                </div>
                <div>
                  <Label className="text-[14px] text-black font-normal">Gutter (mm)</Label>
                  <Input
                    type="number"
                    value={gutter}
                    onChange={(e) => setGutter(Number(e.target.value))}
                    className="h-9 text-[14px]"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                {(['0', '90', 'auto'] as const).map((r) => (
                  <label key={r} className="flex items-center gap-1.5 text-[14px] text-black font-normal cursor-pointer">
                    <input
                      type="radio"
                      name="rotation"
                      checked={rotationPolicy === r}
                      onChange={() => setRotationPolicy(r)}
                    />
                    {r === '0' ? '0° 고정' : r === '90' ? '90° 허용' : '자동'}
                  </label>
                ))}
              </div>
              <div>
                <Label className="text-[14px] text-black font-normal">Bleed (mm)</Label>
                <Input
                  type="number"
                  value={bleed}
                  onChange={(e) => setBleed(Number(e.target.value))}
                  className="h-9 text-[14px]"
                />
              </div>
            </section>

            {/* 제본방식 탭 */}
            <section className="space-y-3">
              <h3 className="text-[18px] text-black font-bold">제본방식</h3>
              <Tabs value={bindingTab} onValueChange={(v) => setBindingTab(v as any)}>
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="compressed" className="text-[14px]">압축앨범</TabsTrigger>
                  <TabsTrigger value="tack" className="text-[14px]">타카</TabsTrigger>
                  <TabsTrigger value="perfect" className="text-[14px]">화보(무선제본)</TabsTrigger>
                </TabsList>
              </Tabs>

              {bindingTab === 'compressed' && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[14px] text-black font-normal">오시 폭 (mm, 0~5)</Label>
                        <Input
                          type="number"
                          step={0.1}
                          value={creaseWidth}
                          onChange={(e) => setCreaseWidth(Number(e.target.value))}
                          className="h-9 text-[14px]"
                        />
                      </div>
                      <div>
                        <Label className="text-[14px] text-black font-normal">오시 깊이 (mm)</Label>
                        <Input
                          type="number"
                          step={0.1}
                          value={creaseDepth}
                          onChange={(e) => setCreaseDepth(Number(e.target.value))}
                          className="h-9 text-[14px]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {(['dashed', 'solid'] as const).map((s) => (
                        <label key={s} className="flex items-center gap-1.5 text-[14px] text-black font-normal cursor-pointer">
                          <input
                            type="radio"
                            name="creaseStyle"
                            checked={creaseStyle === s}
                            onChange={() => setCreaseStyle(s)}
                          />
                          {s === 'dashed' ? '점선' : '실선'}
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {bindingTab === 'tack' && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <div>
                      <Label className="text-[14px] text-black font-normal">타카 위치</Label>
                      <div className="flex gap-3 mt-1">
                        {(['left', 'right', 'top', 'bottom'] as const).map((e) => (
                          <label key={e} className="flex items-center gap-1.5 text-[14px] text-black font-normal cursor-pointer">
                            <input
                              type="radio"
                              name="tackEdge"
                              checked={tackEdge === e}
                              onChange={() => setTackEdge(e)}
                            />
                            {e === 'left' ? '좌' : e === 'right' ? '우' : e === 'top' ? '상' : '하'}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[14px] text-black font-normal">여백 (mm, 8~20)</Label>
                      <Input
                        type="number"
                        value={tackMargin}
                        min={8}
                        max={20}
                        onChange={(e) => setTackMargin(Number(e.target.value))}
                        className="h-9 text-[14px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {bindingTab === 'perfect' && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-[14px] text-black font-normal">
                      화보 무선제본 모드 — 단면 출력, 순차 페이지네이션 (1)(2)(3)… 으로 시트에 앉힌 뒤 모아서 제본(gather &amp; glue)합니다.
                    </p>
                    <ul className="text-[14px] text-black font-normal list-disc pl-5 space-y-0.5">
                      <li>오시 마크 없음, 타카 여백 없음</li>
                      <li>Nup≥2 이면 시트 자른 뒤 순서대로 모아서 풀제본</li>
                      <li>시그니처 접기(folding) 사용 안 함</li>
                    </ul>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* 마크 */}
            <section className="space-y-2">
              <h3 className="text-[18px] text-black font-bold">마크</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-[14px] text-black font-normal">
                  <Checkbox checked={showCrop} onCheckedChange={(v) => setShowCrop(!!v)} />
                  재단선
                </label>
                <label className="flex items-center gap-2 text-[14px] text-black font-normal">
                  <Checkbox checked={showBleed} onCheckedChange={(v) => setShowBleed(!!v)} />
                  블리드
                </label>
                <label className="flex items-center gap-2 text-[14px] text-black font-normal">
                  <Checkbox checked={showReg} onCheckedChange={(v) => setShowReg(!!v)} />
                  레지
                </label>
                <label className="flex items-center gap-2 text-[14px] text-black font-normal">
                  <Checkbox checked={showColorBar} onCheckedChange={(v) => setShowColorBar(!!v)} />
                  컬러바
                </label>
                <label className="col-span-2 flex items-center gap-2 text-[14px] text-black font-normal">
                  <Checkbox checked={showJobMeta} onCheckedChange={(v) => setShowJobMeta(!!v)} />
                  JobID/스튜디오명
                </label>
              </div>
            </section>
          </div>

          {/* ==== 우측 프리뷰 760 ==== */}
          <div className="overflow-y-auto p-5 space-y-3 bg-gray-50">
            <div className="flex items-center gap-2">
              {utilLow && (
                <Badge variant="destructive" className="text-[14px]">
                  활용률 {(util * 100).toFixed(1)}% — 시트 낭비 큼
                </Badge>
              )}
              {result && (
                <>
                  <Badge variant="outline" className="text-[14px] text-black font-normal">
                    {result.nup}up · {result.cols}×{result.rows} · {result.rotation}°
                  </Badge>
                  <Badge variant="outline" className="text-[14px] text-black font-normal">
                    시트 {result.sheetCount}장 · 페이지 {result.pageCount}P
                  </Badge>
                </>
              )}
            </div>

            {calcError && (
              <div className="border border-red-300 bg-red-50 text-red-700 rounded-md p-3 text-[14px]">
                계산 오류: {calcError}
              </div>
            )}

            <ImpositionPreviewCanvas result={result} sheetIndex={sheetIndex} />

            {result && result.sheets.length > 1 && (
              <div className="flex items-center gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSheetIndex(Math.max(0, sheetIndex - 1))}
                  disabled={sheetIndex === 0}
                >
                  이전
                </Button>
                <span className="text-[14px] text-black font-normal">
                  {sheetIndex + 1} / {result.sheetCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSheetIndex(Math.min(result.sheetCount - 1, sheetIndex + 1))}
                  disabled={sheetIndex >= result.sheetCount - 1}
                >
                  다음
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t">
          <div className="flex-1 text-[14px] text-black font-normal">
            {seed?.orderItemId
              ? `대상 항목: ${seed.orderItemId}`
              : '주문 항목이 선택되지 않아 저장만 가능합니다.'}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={onRun}
            disabled={runMut.isPending || !seed?.orderItemId || !selectedPresetId}
          >
            {runMut.isPending ? '생성 중...' : 'JDF + PDF 생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

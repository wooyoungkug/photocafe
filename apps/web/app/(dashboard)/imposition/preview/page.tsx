'use client';

/**
 * 출력실 통합관리 — 면배치 미리보기 (Phase 6).
 *
 * 좌측 폼:
 *  - 규격(sizeCode) + NUP 선택 → PrintRoomPreset 자동 로드
 *  - 프리셋이 없으면 수동 설정 모드로 전환
 *  - paperOrientation / gridCols / gridRows / marginMm / cropMark* 입력
 *  - "프리셋으로 저장" 버튼
 *  - "PDF 테스트 생성" 버튼(자리표시자 — 기존 imposition PDF API 와 연동 예정)
 *
 * 우측 Canvas:
 *  - 용지 외곽선 / 면 분할선 / 크롭마크 위치 / 면 번호
 *  - 실시간 갱신 (폼 값 변경 시 자동 redraw)
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  usePrintRoomPresets,
  useCreatePrintRoomPreset,
  type PrintRoomPreset,
} from '@/hooks/use-print-room';

type Orientation = 'portrait' | 'landscape';

interface DraftSettings {
  sizeCode: string;
  nup: string;
  paperOrientation: Orientation;
  gridCols: number;
  gridRows: number;
  marginMm: number;
  cropMarkLengthMm: number;
  cropMarkThicknessPt: number;
  cropMarkColor: string;
  pdfVersion: string;
}

const DEFAULT_DRAFT: DraftSettings = {
  sizeCode: '',
  nup: '',
  paperOrientation: 'landscape',
  gridCols: 2,
  gridRows: 2,
  marginMm: 10,
  cropMarkLengthMm: 5,
  cropMarkThicknessPt: 0.25,
  cropMarkColor: 'K100',
  pdfVersion: '1.4',
};

/** 인쇄 단위 변환: 1 inch = 25.4 mm */
const MM_PER_INCH = 25.4;

/**
 * sizeCode 를 (mm 단위) 면 크기로 파싱.
 * - "10x10" / "10x13" / "10.5x12" → inch 로 간주 → mm 변환
 * - "A4세로" / "A4가로" → A4 (210x297mm)
 * - 그 외는 빈 값 처리
 */
function parseSizeCodeToMm(
  code: string,
  orientation: Orientation,
): { w: number; h: number } {
  const c = code.trim();
  if (!c) return { w: 0, h: 0 };

  if (c.startsWith('A4')) {
    const portrait = c.includes('세로') || orientation === 'portrait';
    return portrait ? { w: 210, h: 297 } : { w: 297, h: 210 };
  }
  const m = c.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)$/i);
  if (!m) return { w: 0, h: 0 };
  const wIn = parseFloat(m[1]);
  const hIn = parseFloat(m[2]);
  return { w: wIn * MM_PER_INCH, h: hIn * MM_PER_INCH };
}

export default function ImpositionPreviewPage() {
  const t = useTranslations('printRoom.preview');
  const tCommon = useTranslations('printRoom');

  // 데이터
  const presetsQuery = usePrintRoomPresets({ activeOnly: true });
  const createMutation = useCreatePrintRoomPreset();

  // 드래프트 (좌측 폼 상태)
  const [draft, setDraft] = useState<DraftSettings>(DEFAULT_DRAFT);
  const [isManual, setIsManual] = useState(false);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 가능한 NUP / sizeCode 목록 (프리셋 기반)
  const presets = presetsQuery.data ?? [];
  const nupOptions = useMemo(
    () => Array.from(new Set(presets.map((p) => p.nup))).sort(),
    [presets],
  );
  const sizeOptions = useMemo(() => {
    const list = draft.nup
      ? presets.filter((p) => p.nup === draft.nup)
      : presets;
    return Array.from(new Set(list.map((p) => p.sizeCode))).sort();
  }, [presets, draft.nup]);

  // sizeCode + nup 으로 자동 매칭
  const matched: PrintRoomPreset | undefined = useMemo(() => {
    if (!draft.sizeCode || !draft.nup) return undefined;
    return presets.find(
      (p) => p.sizeCode === draft.sizeCode && p.nup === draft.nup,
    );
  }, [presets, draft.sizeCode, draft.nup]);

  // 프리셋 매칭 시 draft 자동 갱신 (수동 모드가 아닐 때만)
  useEffect(() => {
    if (!matched || isManual) return;
    setDraft((d) => ({
      ...d,
      paperOrientation: matched.paperOrientation,
      gridCols: matched.gridCols,
      gridRows: matched.gridRows,
      marginMm: matched.marginMm,
      cropMarkLengthMm: matched.cropMarkLengthMm,
      cropMarkThicknessPt: matched.cropMarkThicknessPt,
      cropMarkColor: matched.cropMarkColor,
      pdfVersion: matched.pdfVersion,
    }));
  }, [matched, isManual]);

  // Canvas 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 면 크기 (mm)
    const cell = parseSizeCodeToMm(draft.sizeCode, draft.paperOrientation);

    // 용지 크기 (mm) = 면×그리드 + 2×marginMm
    const sheetW = cell.w * draft.gridCols + draft.marginMm * 2;
    const sheetH = cell.h * draft.gridRows + draft.marginMm * 2;

    // canvas display 크기 (CSS px). 부모 크기에 맞춰 그림.
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    if (sheetW <= 0 || sheetH <= 0) {
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('canvas.empty'), cssW / 2, cssH / 2);
      return;
    }

    // 스케일: 용지가 canvas 안에 90% 들어가도록
    const padding = 20;
    const scale = Math.min(
      (cssW - padding * 2) / sheetW,
      (cssH - padding * 2) / sheetH,
    );
    const sw = sheetW * scale;
    const sh = sheetH * scale;
    const sx = (cssW - sw) / 2;
    const sy = (cssH - sh) / 2;

    // 1) 용지 배경 + 외곽선
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, sw, sh);

    // 2) 마진 영역 표시 (옅은 회색)
    const m = draft.marginMm * scale;
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(sx + m, sy + m, sw - 2 * m, sh - 2 * m);

    // 3) 면 분할 + 면번호
    const cellW = cell.w * scale;
    const cellH = cell.h * scale;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#475569';
    ctx.font = `${Math.max(11, Math.min(18, cellW / 4))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let n = 1;
    for (let r = 0; r < draft.gridRows; r++) {
      for (let c = 0; c < draft.gridCols; c++) {
        const cx = sx + m + c * cellW;
        const cy = sy + m + r * cellH;
        // 면 배경
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx, cy, cellW, cellH);
        ctx.strokeRect(cx, cy, cellW, cellH);
        // 면번호
        ctx.fillStyle = '#475569';
        ctx.fillText(String(n), cx + cellW / 2, cy + cellH / 2);
        n++;
      }
    }

    // 4) 크롭마크
    const cropLen = draft.cropMarkLengthMm * scale;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = Math.max(0.5, draft.cropMarkThicknessPt * 0.75);
    for (let r = 0; r <= draft.gridRows; r++) {
      for (let c = 0; c <= draft.gridCols; c++) {
        const cx = sx + m + c * cellW;
        const cy = sy + m + r * cellH;
        // 짧은 수평선
        ctx.beginPath();
        ctx.moveTo(cx - cropLen, cy);
        ctx.lineTo(cx - 2, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 2, cy);
        ctx.lineTo(cx + cropLen, cy);
        ctx.stroke();
        // 짧은 수직선
        ctx.beginPath();
        ctx.moveTo(cx, cy - cropLen);
        ctx.lineTo(cx, cy - 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy + 2);
        ctx.lineTo(cx, cy + cropLen);
        ctx.stroke();
      }
    }

    // 5) 치수 표시 (용지 mm)
    ctx.fillStyle = '#1f2937';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${sheetW.toFixed(1)} mm`, sx + sw / 2, sy - 6);
    ctx.save();
    ctx.translate(sx - 10, sy + sh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'middle';
    ctx.fillText(`${sheetH.toFixed(1)} mm`, 0, 0);
    ctx.restore();
  }, [draft, t]);

  // Save
  function handleSave() {
    if (!draft.sizeCode || !draft.nup) {
      toast.error(t('toast.requireSizeNup'));
      return;
    }
    createMutation.mutate(
      {
        sizeCode: draft.sizeCode,
        nup: draft.nup,
        paperOrientation: draft.paperOrientation,
        gridCols: draft.gridCols,
        gridRows: draft.gridRows,
        marginMm: draft.marginMm,
        cropMarkLengthMm: draft.cropMarkLengthMm,
        cropMarkThicknessPt: draft.cropMarkThicknessPt,
        cropMarkColor: draft.cropMarkColor,
        pdfVersion: draft.pdfVersion,
        isActive: true,
      },
      {
        onSuccess: () => {
          toast.success(t('toast.saved'));
          setIsManual(false);
        },
        onError: (err) => toast.error(err.message || t('toast.saveFailed')),
      },
    );
  }

  function handleTestPdf() {
    toast.info(t('toast.testPdfTodo'));
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-[24px] text-black font-normal">{t('title')}</h1>
        <span className="text-[14px] text-black font-normal opacity-70">
          {t('subtitle')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        {/* 좌측: 설정 폼 */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* NUP + sizeCode 선택 */}
            <div className="space-y-2">
              <Label className="text-[14px] text-black font-bold">
                {t('section.preset')}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[14px] text-black font-normal">
                    NUP
                  </Label>
                  <Select
                    value={draft.nup}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, nup: v, sizeCode: '' }))
                    }
                  >
                    <SelectTrigger className="h-9 text-[14px] font-normal">
                      <SelectValue placeholder={t('placeholder.nup')} />
                    </SelectTrigger>
                    <SelectContent>
                      {nupOptions.map((n) => (
                        <SelectItem
                          key={n}
                          value={n}
                          className="text-[14px] font-normal"
                        >
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[14px] text-black font-normal">
                    {t('field.sizeCode')}
                  </Label>
                  <Select
                    value={draft.sizeCode}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, sizeCode: v }))
                    }
                  >
                    <SelectTrigger className="h-9 text-[14px] font-normal">
                      <SelectValue placeholder={t('placeholder.sizeCode')} />
                    </SelectTrigger>
                    <SelectContent>
                      {sizeOptions.map((s) => (
                        <SelectItem
                          key={s}
                          value={s}
                          className="text-[14px] font-normal"
                        >
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {matched ? (
                  <Badge className="bg-emerald-100 text-emerald-700 text-[14px] font-normal">
                    {t('status.matched')}
                  </Badge>
                ) : draft.sizeCode && draft.nup ? (
                  <Badge className="bg-amber-100 text-amber-700 text-[14px] font-normal">
                    {t('status.noPreset')}
                  </Badge>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 ml-auto text-[14px] font-normal"
                  onClick={() => setIsManual((v) => !v)}
                >
                  {isManual ? t('action.useAuto') : t('action.useManual')}
                </Button>
              </div>
            </div>

            {/* 수동 설정 */}
            <div
              className={`space-y-3 ${isManual ? '' : 'opacity-60 pointer-events-none'}`}
            >
              <Label className="text-[14px] text-black font-bold">
                {t('section.manual')}
              </Label>

              <div className="space-y-1">
                <Label className="text-[14px] text-black font-normal">
                  {t('field.paperOrientation')}
                </Label>
                <RadioGroup
                  value={draft.paperOrientation}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, paperOrientation: v as Orientation }))
                  }
                  className="flex gap-3"
                >
                  <div className="flex items-center gap-1">
                    <RadioGroupItem value="landscape" id="orient-landscape" />
                    <Label
                      htmlFor="orient-landscape"
                      className="text-[14px] font-normal cursor-pointer"
                    >
                      {t('orientation.landscape')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <RadioGroupItem value="portrait" id="orient-portrait" />
                    <Label
                      htmlFor="orient-portrait"
                      className="text-[14px] font-normal cursor-pointer"
                    >
                      {t('orientation.portrait')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[14px] text-black font-normal">
                    {t('field.gridCols')}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={draft.gridCols}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        gridCols: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                    className="h-9 text-[14px] font-normal"
                  />
                </div>
                <div>
                  <Label className="text-[14px] text-black font-normal">
                    {t('field.gridRows')}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={draft.gridRows}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        gridRows: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                    className="h-9 text-[14px] font-normal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[14px] text-black font-normal">
                    {t('field.marginMm')}
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    min={0}
                    max={100}
                    value={draft.marginMm}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        marginMm: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="h-9 text-[14px] font-normal"
                  />
                </div>
                <div>
                  <Label className="text-[14px] text-black font-normal">
                    {t('field.cropMarkLengthMm')}
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    min={0}
                    max={50}
                    value={draft.cropMarkLengthMm}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        cropMarkLengthMm: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="h-9 text-[14px] font-normal"
                  />
                </div>
                <div>
                  <Label className="text-[14px] text-black font-normal">
                    {t('field.cropMarkThicknessPt')}
                  </Label>
                  <Input
                    type="number"
                    step="0.05"
                    min={0}
                    max={10}
                    value={draft.cropMarkThicknessPt}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        cropMarkThicknessPt: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="h-9 text-[14px] font-normal"
                  />
                </div>
              </div>
            </div>

            {/* 액션 */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending}
                className="h-9 text-[14px] font-normal"
              >
                {t('action.save')}
              </Button>
              <Button
                variant="outline"
                onClick={handleTestPdf}
                className="h-9 text-[14px] font-normal"
              >
                {t('action.testPdf')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 우측: Canvas 미리보기 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[14px] text-black font-bold">
                {t('section.canvas')}
              </Label>
              <span className="text-[14px] text-black font-normal opacity-70">
                {tCommon('printMethod.indigo')} · {draft.nup || '-'} ·{' '}
                {draft.sizeCode || '-'}
              </span>
            </div>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: 'min(70vh, 720px)' }}
              className="bg-white border rounded"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

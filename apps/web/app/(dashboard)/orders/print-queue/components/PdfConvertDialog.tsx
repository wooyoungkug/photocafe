'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import {
  IndexOptions,
  DEFAULT_INDEX_OPTIONS,
  GeneratePrintPdfRequest,
} from '@/hooks/use-print-pdf';
import { usePdfSettings } from './PdfSettingsDialog';

interface PdfConvertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  selectedIds: string[];
  onGenerate: (request: GeneratePrintPdfRequest) => void;
  isGenerating: boolean;
}

export interface IndexOrderItem {
  key: keyof IndexOptions;
  label: string;
  enabled: boolean;
}

const DEFAULT_INDEX_ORDER: IndexOrderItem[] = [
  { key: 'showDateTime', label: '출력날짜+시간', enabled: true },
  { key: 'showOrderNumber', label: '주문번호', enabled: true },
  { key: 'showStudioName', label: '스튜디오명', enabled: true },
  { key: 'showSpec', label: '규격', enabled: true },
  { key: 'showPaper', label: '용지명', enabled: true },
  { key: 'showPageInfo', label: '페이지 정보', enabled: true },
  { key: 'showColorMode', label: '인디고도수', enabled: true },
  { key: 'showBinding', label: '제본방법', enabled: true },
  { key: 'showNup', label: 'Nup', enabled: true },
];

export default function PdfConvertDialog({
  open,
  onOpenChange,
  selectedCount,
  selectedIds,
  onGenerate,
  isGenerating,
}: PdfConvertDialogProps) {
  const pdfSettings = usePdfSettings();

  // 인덱스 항목 순서 + ON/OFF 상태
  const [indexOrder, setIndexOrder] = useState<IndexOrderItem[]>(() =>
    DEFAULT_INDEX_ORDER.map((item) => ({ ...item })),
  );
  const [includeBleed, setIncludeBleed] = useState(true);
  const [includeCropMarks, setIncludeCropMarks] = useState(true);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // 설정이 로드되면 기본값 반영
  useEffect(() => {
    if (!pdfSettings.isLoaded) return;

    setIncludeBleed(pdfSettings.includeBleed);
    setIncludeCropMarks(pdfSettings.includeCropMarks);

    // 인덱스 옵션 기본값 반영
    setIndexOrder((prev) =>
      prev.map((item) => ({
        ...item,
        enabled: pdfSettings.indexOptions[item.key] ?? item.enabled,
      })),
    );
  }, [pdfSettings.isLoaded]);

  const toggleItem = (idx: number) => {
    setIndexOrder((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], enabled: !next[idx].enabled };
      return next;
    });
  };

  const moveItem = (fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= indexOrder.length) return;

    setIndexOrder((prev) => {
      const next = [...prev];
      [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
      return next;
    });
  };

  // 드래그앤드롭
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;

    setIndexOrder((prev) => {
      const next = [...prev];
      const [dragged] = next.splice(dragIdx, 1);
      next.splice(idx, 0, dragged);
      return next;
    });
    setDragIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  const handleGenerate = () => {
    // indexOrder에서 IndexOptions 객체 생성
    const indexOptions: IndexOptions = { ...DEFAULT_INDEX_OPTIONS };
    for (const item of indexOrder) {
      indexOptions[item.key] = item.enabled;
    }

    // 순서 정보도 함께 전달 (백엔드에서 인덱스 렌더링 순서로 사용)
    const indexOrderKeys = indexOrder.filter((i) => i.enabled).map((i) => i.key);

    onGenerate({
      orderItemIds: selectedIds,
      indexOptions,
      includeBleed,
      includeCropMarks,
      nupOverride: pdfSettings.defaultNup !== '1up' ? pdfSettings.defaultNup : undefined,
      outputPath: pdfSettings.outputPath || undefined,
      indexOrderKeys,
      indexPosition: pdfSettings.indexPosition || 'bottom',
      ...(pdfSettings.canvasEnabled && {
        canvasWidthMm: pdfSettings.canvasWidth,
        canvasHeightMm: pdfSettings.canvasHeight,
      }),
    });
  };

  const enabledCount = indexOrder.filter((i) => i.enabled).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[18px] text-black font-bold">
            PDF 변환
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 선택 항목 수 */}
          <p className="text-[14px] text-black font-normal">
            선택된 항목: <span className="font-bold">{selectedCount}건</span>
          </p>

          <Separator />

          {/* 인덱스 표기 항목 (순서변경 가능) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[14px] text-black font-bold">인덱스 표기 항목</p>
              <span className="text-[12px] text-gray-500">{enabledCount}개 선택 · 드래그로 순서변경</span>
            </div>

            <div className="border rounded-lg divide-y">
              {indexOrder.map((item, idx) => (
                <div
                  key={item.key}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing transition-colors ${
                    dragIdx === idx ? 'bg-blue-50' : 'hover:bg-gray-50'
                  } ${!item.enabled ? 'opacity-50' : ''}`}
                >
                  <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />

                  <span className="text-[12px] text-gray-400 w-5 text-center flex-shrink-0">
                    {idx + 1}
                  </span>

                  <Checkbox
                    checked={item.enabled}
                    onCheckedChange={() => toggleItem(idx)}
                  />

                  <Label className="text-[14px] text-black font-normal flex-1 cursor-pointer"
                    onClick={() => toggleItem(idx)}
                  >
                    {item.label}
                  </Label>

                  {/* 위/아래 버튼 */}
                  <div className="flex flex-col gap-0">
                    <button
                      type="button"
                      title="위로 이동"
                      onClick={() => moveItem(idx, 'up')}
                      disabled={idx === 0}
                      className="p-0.5 text-gray-400 hover:text-black disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title="아래로 이동"
                      onClick={() => moveItem(idx, 'down')}
                      disabled={idx === indexOrder.length - 1}
                      className="p-0.5 text-gray-400 hover:text-black disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 인덱스 미리보기 */}
            {enabledCount > 0 && (
              <div className="mt-2 px-3 py-2 bg-gray-100 rounded text-[11px] text-gray-600 font-mono break-all">
                {indexOrder
                  .filter((i) => i.enabled)
                  .map((i) => i.label)
                  .join(' | ')}
              </div>
            )}
          </div>

          <Separator />

          {/* PDF 옵션 */}
          <div>
            <p className="text-[14px] text-black font-bold mb-2">PDF 옵션</p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="conv-includeBleed"
                  checked={includeBleed}
                  onCheckedChange={() => setIncludeBleed(!includeBleed)}
                />
                <Label htmlFor="conv-includeBleed" className="text-[14px] text-black font-normal cursor-pointer">
                  재단여백 포함 ({pdfSettings.bleedSize}mm)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="conv-includeCropMarks"
                  checked={includeCropMarks}
                  onCheckedChange={() => setIncludeCropMarks(!includeCropMarks)}
                />
                <Label htmlFor="conv-includeCropMarks" className="text-[14px] text-black font-normal cursor-pointer">
                  재단선(Crop Mark) 표시
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            취소
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? 'PDF 생성 중...' : 'PDF 생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

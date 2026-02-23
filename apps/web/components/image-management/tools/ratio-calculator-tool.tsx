'use client';

import { useState, useCallback, useRef } from 'react';
import { Copy, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ToolGuide } from './tool-guide';
import { ToolUsageCounter } from './tool-usage-counter';

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

const PRESETS = [
  { label: '14\u00d711', width: 14, height: 11 },
  { label: '12\u00d79', width: 12, height: 9 },
  { label: '10\u00d78', width: 10, height: 8 },
  { label: '8\u00d76', width: 8, height: 6 },
  { label: '16\u00d79', width: 16, height: 9 },
  { label: '4\u00d73', width: 4, height: 3 },
] as const;

// ---------------------------------------------------------------------------
// RatioCalculatorTool
// ---------------------------------------------------------------------------

export function RatioCalculatorTool() {
  const [origWidth, setOrigWidth] = useState('');
  const [origHeight, setOrigHeight] = useState('');
  const [newWidth, setNewWidth] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [lastChanged, setLastChanged] = useState<'width' | 'height'>('width');
  const trackUseRef = useRef<(() => void) | null>(null);

  // -----------------------------------------------------------------------
  // Computed values
  // -----------------------------------------------------------------------

  const ow = parseFloat(origWidth) || 0;
  const oh = parseFloat(origHeight) || 0;
  const nw = parseFloat(newWidth) || 0;
  const nh = parseFloat(newHeight) || 0;

  let resultWidth = nw;
  let resultHeight = nh;
  let formula = '';
  let hasResult = false;

  if (ow > 0 && oh > 0) {
    if (lastChanged === 'width' && nw > 0) {
      resultHeight = (nw * oh) / ow;
      resultWidth = nw;
      hasResult = true;
      formula = `${nw} \u00d7 ${oh} \u00f7 ${ow} = ${resultHeight.toFixed(2)}`;
    } else if (lastChanged === 'height' && nh > 0) {
      resultWidth = (nh * ow) / oh;
      resultHeight = nh;
      hasResult = true;
      formula = `${nh} \u00d7 ${ow} \u00f7 ${oh} = ${resultWidth.toFixed(2)}`;
    }
  }

  const scalePercent =
    ow > 0 && hasResult
      ? ((resultWidth / ow) * 100).toFixed(1)
      : null;

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleNewWidthChange = useCallback((value: string) => {
    setNewWidth(value);
    setLastChanged('width');
    if (parseFloat(value) > 0) trackUseRef.current?.();
  }, []);

  const handleNewHeightChange = useCallback((value: string) => {
    setNewHeight(value);
    setLastChanged('height');
    if (parseFloat(value) > 0) trackUseRef.current?.();
  }, []);

  const applyPreset = useCallback((w: number, h: number) => {
    setOrigWidth(String(w));
    setOrigHeight(String(h));
  }, []);

  const resetAll = useCallback(() => {
    setOrigWidth('');
    setOrigHeight('');
    setNewWidth('');
    setNewHeight('');
    setLastChanged('width');
  }, []);

  const copyResult = useCallback(async () => {
    if (!hasResult) {
      toast.warning('계산 결과가 없습니다.');
      return;
    }
    const text = `${resultWidth % 1 === 0 ? resultWidth : resultWidth.toFixed(2)} \u00d7 ${resultHeight % 1 === 0 ? resultHeight : resultHeight.toFixed(2)}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('클립보드에 복사되었습니다.');
    } catch {
      toast.error('복사에 실패했습니다.');
    }
  }, [hasResult, resultWidth, resultHeight]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Guide */}
      <ToolGuide title="비율 계산기 사용 방법">
        <div className="pt-3 space-y-3">
          <svg viewBox="0 0 400 130" className="w-full max-w-[400px]" xmlns="http://www.w3.org/2000/svg">
            {/* Original rectangle with dimension lines */}
            <rect x="20" y="25" width="100" height="75" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
            {/* Width dimension line */}
            <line x1="20" y1="112" x2="120" y2="112" stroke="#64748B" strokeWidth="1" />
            <line x1="20" y1="108" x2="20" y2="116" stroke="#64748B" strokeWidth="1" />
            <line x1="120" y1="108" x2="120" y2="116" stroke="#64748B" strokeWidth="1" />
            <text x="70" y="124" textAnchor="middle" fontSize="10" fill="#64748B">가로</text>
            {/* Height dimension line */}
            <line x1="132" y1="25" x2="132" y2="100" stroke="#64748B" strokeWidth="1" />
            <line x1="128" y1="25" x2="136" y2="25" stroke="#64748B" strokeWidth="1" />
            <line x1="128" y1="100" x2="136" y2="100" stroke="#64748B" strokeWidth="1" />
            <text x="148" y="66" textAnchor="middle" fontSize="10" fill="#64748B">세로</text>
            {/* Arrow */}
            <path d="M170 60 L220 60" stroke="#64748B" strokeWidth="2" fill="none" markerEnd="url(#ratio-arrow)" />
            <defs>
              <marker id="ratio-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748B" />
              </marker>
            </defs>
            {/* Resized rectangle (smaller) with dimension lines */}
            <rect x="250" y="35" width="70" height="52.5" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
            {/* Dashed outline showing original proportion */}
            <rect x="250" y="35" width="70" height="52.5" rx="4" fill="none" stroke="#93C5FD" strokeWidth="1" strokeDasharray="4 2" />
            {/* Width dimension line */}
            <line x1="250" y1="100" x2="320" y2="100" stroke="#64748B" strokeWidth="1" />
            <line x1="250" y1="96" x2="250" y2="104" stroke="#64748B" strokeWidth="1" />
            <line x1="320" y1="96" x2="320" y2="104" stroke="#64748B" strokeWidth="1" />
            <text x="285" y="112" textAnchor="middle" fontSize="10" fill="#3B82F6">?</text>
            {/* Height dimension line */}
            <line x1="332" y1="35" x2="332" y2="87.5" stroke="#64748B" strokeWidth="1" />
            <line x1="328" y1="35" x2="336" y2="35" stroke="#64748B" strokeWidth="1" />
            <line x1="328" y1="87.5" x2="336" y2="87.5" stroke="#64748B" strokeWidth="1" />
            <text x="348" y="65" textAnchor="middle" fontSize="10" fill="#3B82F6">?</text>
            {/* Labels */}
            <text x="70" y="16" textAnchor="middle" fontSize="11" fill="#64748B">원본 크기</text>
            <text x="285" y="16" textAnchor="middle" fontSize="11" fill="#64748B">비율 유지</text>
          </svg>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>원본 가로x세로 입력 → 비율 자동 계산</li>
            <li>목표 가로 또는 세로 입력 시 나머지 자동 계산</li>
            <li>인쇄 규격 프리셋 제공 (14x11, 12x9, 10x8 등)</li>
            <li>클립보드 복사 기능</li>
          </ul>
        </div>
      </ToolGuide>

      {/* Input card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">비율 입력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Original dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="orig-width" className="text-sm">
                원본 가로
              </Label>
              <Input
                id="orig-width"
                type="number"
                min="0"
                step="any"
                placeholder="예: 14"
                value={origWidth}
                onChange={(e) => setOrigWidth(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orig-height" className="text-sm">
                원본 세로
              </Label>
              <Input
                id="orig-height"
                type="number"
                min="0"
                step="any"
                placeholder="예: 11"
                value={origHeight}
                onChange={(e) => setOrigHeight(e.target.value)}
              />
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-1.5">
            <Label className="text-sm">프리셋</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset.width, preset.height)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* New dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-width" className="text-sm">
                새 가로
              </Label>
              <Input
                id="new-width"
                type="number"
                min="0"
                step="any"
                placeholder="입력하면 세로 계산"
                value={newWidth}
                onChange={(e) => handleNewWidthChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-height" className="text-sm">
                새 세로
              </Label>
              <Input
                id="new-height"
                type="number"
                min="0"
                step="any"
                placeholder="입력하면 가로 계산"
                value={newHeight}
                onChange={(e) => handleNewHeightChange(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result card */}
      {hasResult && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">계산 결과</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Formula */}
            <div className="rounded-md bg-slate-50 border p-3">
              <p className="text-xs text-muted-foreground mb-1">계산 공식</p>
              {lastChanged === 'width' ? (
                <p className="text-sm font-mono">
                  <span className="text-blue-600">새 세로</span>
                  {' = '}
                  <span className="text-green-600">{nw}</span>
                  {' \u00d7 '}
                  <span className="text-orange-600">{oh}</span>
                  {' \u00f7 '}
                  <span className="text-purple-600">{ow}</span>
                  {' = '}
                  <span className="font-bold">{resultHeight.toFixed(2)}</span>
                </p>
              ) : (
                <p className="text-sm font-mono">
                  <span className="text-blue-600">새 가로</span>
                  {' = '}
                  <span className="text-green-600">{nh}</span>
                  {' \u00d7 '}
                  <span className="text-orange-600">{ow}</span>
                  {' \u00f7 '}
                  <span className="text-purple-600">{oh}</span>
                  {' = '}
                  <span className="font-bold">{resultWidth.toFixed(2)}</span>
                </p>
              )}
            </div>

            {/* Large result */}
            <div className="text-center py-4">
              <p className="text-3xl font-bold tracking-tight">
                {resultWidth % 1 === 0 ? resultWidth : resultWidth.toFixed(2)}
                {' \u00d7 '}
                {resultHeight % 1 === 0 ? resultHeight : resultHeight.toFixed(2)}
              </p>
              {scalePercent && (
                <Badge variant="secondary" className="mt-2">
                  배율: {scalePercent}%
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={copyResult}>
                <Copy className="h-4 w-4 mr-2" />
                결과 복사
              </Button>
              <Button variant="ghost" className="flex-1" onClick={resetAll}>
                <RotateCcw className="h-4 w-4 mr-2" />
                초기화
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state hint */}
      {!hasResult && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p className="text-sm">
              원본 비율을 입력한 후, 새 가로 또는 새 세로 값을 입력하면 자동으로 계산됩니다.
            </p>
          </CardContent>
        </Card>
      )}

      <ToolUsageCounter toolId="ratio-calculator" onTrackUse={(fn) => { trackUseRef.current = fn; }} />
    </div>
  );
}

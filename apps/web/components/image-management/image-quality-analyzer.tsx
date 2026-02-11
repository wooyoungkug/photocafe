'use client';

import { useCallback, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Play, Trash2, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { useImageAnalysisStore } from '@/stores/image-analysis-store';
import { runAnalysisPipeline } from '@/lib/image-analysis/analysis-pipeline';
import { ImageDropZone } from './image-drop-zone';
import { AnalysisProgressPanel } from './analysis-progress-panel';
import { AnalysisResultsTable } from './analysis-results-table';

export function ImageQualityAnalyzer() {
  const {
    images,
    results,
    status,
    progress,
    thresholds,
    activeFilter,
    addImages,
    clearAll,
    setThresholds,
    setFilter,
    setStatus,
    setProgress,
    addResult,
    recalculateIssues,
  } = useImageAnalysisStore();

  const abortRef = useRef<AbortController | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      setStatus('loading');
      await addImages(files);
      setStatus('idle');
    },
    [addImages, setStatus],
  );

  const startAnalysis = useCallback(async () => {
    if (images.length === 0) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('analyzing');

    try {
      await runAnalysisPipeline({
        images,
        thresholds,
        onProgress: (phase, completed, total, current) => {
          setProgress({ phase, completed, total, current });
        },
        onResult: (result) => {
          addResult(result);
        },
        signal: controller.signal,
      });

      if (!controller.signal.aborted) {
        setStatus('completed');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('completed');
      } else {
        setStatus('error');
      }
    }
  }, [images, thresholds, setStatus, setProgress, addResult]);

  const cancelAnalysis = useCallback(() => {
    abortRef.current?.abort();
    setStatus('completed');
  }, [setStatus]);

  const handleThresholdChange = useCallback(
    (key: string, value: number) => {
      setThresholds({ [key]: value });
      if (status === 'completed') {
        recalculateIssues();
      }
    },
    [setThresholds, recalculateIssues, status],
  );

  const isAnalyzing = status === 'analyzing';
  const isLoading = status === 'loading';
  const hasResults = results.size > 0;

  return (
    <div className="space-y-4">
      {/* 업로드 영역 (이미지 없을 때) */}
      {images.length === 0 && !isAnalyzing && (
        <ImageDropZone onFilesSelected={handleFilesSelected} isLoading={isLoading} />
      )}

      {/* 컨트롤 패널 (이미지 있을 때) */}
      {images.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                이미지 분석
                <Badge variant="outline" className="ml-2 font-normal">
                  {images.length}장 로드됨
                </Badge>
              </CardTitle>
              <div className="flex gap-2">
                {!isAnalyzing && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.multiple = true;
                        input.onchange = () => {
                          if (input.files) handleFilesSelected(Array.from(input.files));
                        };
                        input.click();
                      }}
                    >
                      추가 선택
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAll}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      모두 삭제
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 분석 시작 버튼 */}
            {!isAnalyzing && (
              <Button
                type="button"
                onClick={startAnalysis}
                className="w-full gap-2"
                size="lg"
              >
                <Play className="h-5 w-5" />
                {hasResults ? '다시 분석하기' : '분석 시작'}
                <span className="text-sm opacity-80">({images.length}장)</span>
              </Button>
            )}

            {/* 임계값 설정 (접이식) */}
            {!isAnalyzing && (
              <>
                <div
                  className="flex items-center gap-2 cursor-pointer text-sm text-slate-500 hover:text-slate-700"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings2 className="h-4 w-4" />
                  <span>감지 민감도 설정</span>
                  {showSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </div>

                {showSettings && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                    <ThresholdSlider
                      label="블러 임계값"
                      description="낮을수록 민감 (선명도 기준)"
                      value={thresholds.blurVarianceMin}
                      min={20}
                      max={300}
                      step={10}
                      onChange={(v) => handleThresholdChange('blurVarianceMin', v)}
                    />
                    <ThresholdSlider
                      label="어두움 임계값"
                      description="평균 밝기 기준 (0-255)"
                      value={thresholds.brightnessDarkMax}
                      min={20}
                      max={120}
                      step={5}
                      onChange={(v) => handleThresholdChange('brightnessDarkMax', v)}
                    />
                    <ThresholdSlider
                      label="밝음 임계값"
                      description="평균 밝기 기준 (0-255)"
                      value={thresholds.brightnessBrightMin}
                      min={160}
                      max={250}
                      step={5}
                      onChange={(v) => handleThresholdChange('brightnessBrightMin', v)}
                    />
                    <ThresholdSlider
                      label="눈감음 EAR 임계값"
                      description="낮을수록 민감 (0.1-0.35)"
                      value={thresholds.earThreshold}
                      min={0.1}
                      max={0.35}
                      step={0.01}
                      onChange={(v) => handleThresholdChange('earThreshold', v)}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 진행률 패널 */}
      {isAnalyzing && (
        <AnalysisProgressPanel progress={progress} onCancel={cancelAnalysis} />
      )}

      {/* 결과 테이블 */}
      {hasResults && (
        <AnalysisResultsTable
          results={results}
          images={images}
          activeFilter={activeFilter}
          onFilterChange={setFilter}
        />
      )}
    </div>
  );
}

// 임계값 슬라이더 컴포넌트
function ThresholdSlider({
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="text-xs text-slate-500 font-mono">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <p className="text-[10px] text-slate-400">{description}</p>
    </div>
  );
}

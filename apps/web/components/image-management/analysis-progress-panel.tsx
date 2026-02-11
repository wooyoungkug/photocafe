'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, StopCircle, Clock, Zap } from 'lucide-react';
import type { AnalysisProgress, AnalysisResult } from '@/lib/image-analysis/types';
import { AnalysisLiveChart } from './analysis-live-chart';

interface AnalysisProgressPanelProps {
  progress: AnalysisProgress;
  results: Map<string, AnalysisResult>;
  totalImages: number;
  onCancel: () => void;
}

export function AnalysisProgressPanel({ progress, results, totalImages, onCancel }: AnalysisProgressPanelProps) {
  const { total, completed, current, phase } = progress;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const startTimeRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  // 경과 시간 타이머
  useEffect(() => {
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // ETA 계산
  const eta = useMemo(() => {
    if (completed === 0 || elapsed === 0) return null;
    const rate = completed / (elapsed / 1000);
    const remaining = total - completed;
    const secondsLeft = Math.ceil(remaining / rate);
    if (secondsLeft < 60) return `약 ${secondsLeft}초`;
    return `약 ${Math.ceil(secondsLeft / 60)}분`;
  }, [completed, total, elapsed]);

  const speed = useMemo(() => {
    if (elapsed < 2000 || completed === 0) return null;
    return (completed / (elapsed / 1000)).toFixed(1);
  }, [completed, elapsed]);

  const phaseLabel = phase === 'blur_lighting'
    ? '1단계: 초점/조도 분석'
    : '2단계: 얼굴 분석';

  const elapsedStr = useMemo(() => {
    const s = Math.floor(elapsed / 1000);
    if (s < 60) return `${s}초`;
    return `${Math.floor(s / 60)}분 ${s % 60}초`;
  }, [elapsed]);

  // 전체 진행률 (Phase1 40% + Phase2 60%)
  const overallPercent = useMemo(() => {
    if (phase === 'blur_lighting') {
      return Math.round((completed / Math.max(total, 1)) * 40);
    }
    return 40 + Math.round((results.size / Math.max(total, 1)) * 60);
  }, [phase, completed, total, results.size]);

  return (
    <div className="space-y-3">
      {/* 진행률 패널 */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <div>
                  <p className="font-semibold text-slate-700 text-sm">{phaseLabel}</p>
                  <p className="text-xs text-slate-500">
                    {completed} / {total}장
                    {current && <span className="ml-1 text-slate-400">({current})</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5">
                  {speed && (
                    <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                      <Zap className="h-3 w-3 text-yellow-500" />
                      {speed}장/초
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                    <Clock className="h-3 w-3 text-blue-500" />
                    {elapsedStr}
                  </Badge>
                  {eta && (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      남은: {eta}
                    </Badge>
                  )}
                </div>
                <Button type="button" variant="destructive" size="sm" onClick={onCancel}>
                  <StopCircle className="h-4 w-4 mr-1" />
                  중단
                </Button>
              </div>
            </div>

            {/* 전체 진행률 바 */}
            <div className="space-y-1">
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-blue-500 to-blue-600"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>전체 {overallPercent}%</span>
                <div className="flex gap-3">
                  <span className={phase === 'blur_lighting' ? 'text-blue-600 font-medium' : 'text-green-600'}>
                    초점/조도 {phase === 'blur_lighting' ? `${percent}%` : '완료'}
                  </span>
                  <span className={phase === 'face_detection' ? 'text-blue-600 font-medium' : 'text-slate-400'}>
                    얼굴분석 {phase === 'face_detection' ? `${percent}%` : '대기'}
                  </span>
                </div>
              </div>
            </div>

            {/* 단계별 진행률 바 */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${
                  phase === 'blur_lighting' ? 'bg-cyan-500' : 'bg-violet-500'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* 모바일 메트릭 */}
            <div className="flex sm:hidden items-center gap-1.5 text-[10px] text-slate-500">
              {speed && <span>{speed}장/초</span>}
              <span>{elapsedStr}</span>
              {eta && <span>/ 남은: {eta}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 실시간 동적 그래프 (Phase2에서 결과가 나올 때) */}
      {results.size > 0 && (
        <AnalysisLiveChart
          results={results}
          progress={progress}
          totalImages={totalImages}
        />
      )}
    </div>
  );
}

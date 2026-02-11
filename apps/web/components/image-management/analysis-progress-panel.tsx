'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, StopCircle } from 'lucide-react';
import type { AnalysisProgress } from '@/lib/image-analysis/types';

interface AnalysisProgressPanelProps {
  progress: AnalysisProgress;
  onCancel: () => void;
}

export function AnalysisProgressPanel({ progress, onCancel }: AnalysisProgressPanelProps) {
  const { total, completed, current, phase } = progress;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const phaseLabel = phase === 'blur_lighting'
    ? '1단계: 초점/조도 분석'
    : '2단계: 눈감음 감지';

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <div>
                <p className="font-semibold text-slate-700">{phaseLabel}</p>
                <p className="text-sm text-slate-500">
                  {completed} / {total}장 완료
                  {current && <span className="ml-2 text-slate-400">({current})</span>}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onCancel}
            >
              <StopCircle className="h-4 w-4 mr-1" />
              분석 중단
            </Button>
          </div>

          {/* 진행률 바 */}
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-slate-500">
            <span>{percent}%</span>
            <span>
              {phase === 'blur_lighting' ? '다음: 눈감음 감지' : '거의 완료'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

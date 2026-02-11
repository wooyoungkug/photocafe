'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Focus, Sun, Frown, Mic } from 'lucide-react';
import type { AnalysisResult } from '@/lib/image-analysis/types';
import { useEffect, useState } from 'react';

interface ImagePreviewDialogProps {
  result: AnalysisResult | null;
  imageFile?: File;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImagePreviewDialog({ result, imageFile, open, onOpenChange }: ImagePreviewDialogProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile || !open) {
      if (imageUrl) { URL.revokeObjectURL(imageUrl); setImageUrl(null); }
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile, open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{result.fileName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 이미지 미리보기 */}
          {imageUrl && (
            <div className="flex justify-center bg-slate-100 rounded-lg p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={result.fileName}
                className="max-h-[60vh] object-contain rounded"
              />
            </div>
          )}

          {/* 분석 결과 상세 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* 초점 */}
            <div className="p-4 rounded-lg border bg-white">
              <div className="flex items-center gap-2 mb-2">
                <Focus className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-sm">초점(블러)</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {result.blurScore.toFixed(1)}
              </p>
              <Badge variant={result.isBlurry ? 'destructive' : 'secondary'} className="mt-1">
                {result.isBlurry ? '초점불량' : '정상'}
              </Badge>
            </div>

            {/* 밝기 */}
            <div className="p-4 rounded-lg border bg-white">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-sm">조도</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {result.meanBrightness.toFixed(1)}
              </p>
              <Badge
                variant={result.lightingIssue !== 'ok' ? 'destructive' : 'secondary'}
                className="mt-1"
              >
                {result.lightingIssue === 'ok'
                  ? '정상'
                  : result.lightingIssue === 'too_dark'
                    ? '너무 어두움'
                    : result.lightingIssue === 'too_bright'
                      ? '너무 밝음'
                      : '불균일 조명'}
              </Badge>
            </div>

            {/* 눈감음 */}
            <div className="p-4 rounded-lg border bg-white">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-rose-600" />
                <span className="font-medium text-sm">눈감음</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                얼굴 {result.facesDetected}명
              </p>
              <Badge variant={result.eyesClosed ? 'destructive' : 'secondary'} className="mt-1">
                {result.eyesClosed ? '눈감음 감지' : '정상'}
              </Badge>
              {result.eyeAspectRatios.length > 0 && (
                <div className="mt-2 text-xs text-slate-500 space-y-1">
                  {result.eyeAspectRatios.map((ear, i) => (
                    <div key={i}>
                      얼굴{i + 1}: L={ear.left.toFixed(3)} R={ear.right.toFixed(3)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 찡그림 */}
            <div className="p-4 rounded-lg border bg-white">
              <div className="flex items-center gap-2 mb-2">
                <Frown className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-sm">표정(찡그림)</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {((result.negativeExpressionScore ?? 0) * 100).toFixed(0)}%
              </p>
              <Badge variant={result.negativeExpression ? 'destructive' : 'secondary'} className="mt-1">
                {result.negativeExpression ? '찡그린 표정' : '정상'}
              </Badge>
              {(result.negativeExpressionScores ?? []).length > 0 && (
                <div className="mt-2 text-xs text-slate-500 space-y-1">
                  {result.negativeExpressionScores.map((score, i) => (
                    <div key={i}>얼굴{i + 1}: {(score * 100).toFixed(1)}%</div>
                  ))}
                </div>
              )}
            </div>

            {/* 입벌림 */}
            <div className="p-4 rounded-lg border bg-white">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="h-4 w-4 text-cyan-600" />
                <span className="font-medium text-sm">입 개방</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {((result.mouthOpenScore ?? 0) * 100).toFixed(0)}%
              </p>
              <Badge variant={result.mouthOpen ? 'destructive' : 'secondary'} className="mt-1">
                {result.mouthOpen ? '입 벌림' : '정상'}
              </Badge>
              {(result.mouthOpenScores ?? []).length > 0 && (
                <div className="mt-2 text-xs text-slate-500 space-y-1">
                  {result.mouthOpenScores.map((score, i) => (
                    <div key={i}>얼굴{i + 1}: {(score * 100).toFixed(1)}%</div>
                  ))}
                </div>
              )}
            </div>

            {/* 시선 이탈 */}
            <div className="p-4 rounded-lg border bg-white">
              <div className="flex items-center gap-2 mb-2">
                <EyeOff className="h-4 w-4 text-indigo-600" />
                <span className="font-medium text-sm">시선</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {((result.gazeDeviationScore ?? 0) * 100).toFixed(0)}%
              </p>
              <Badge variant={result.gazeAway ? 'destructive' : 'secondary'} className="mt-1">
                {result.gazeAway ? '시선 이탈' : '정상'}
              </Badge>
              {(result.gazeDeviationScores ?? []).length > 0 && (
                <div className="mt-2 text-xs text-slate-500 space-y-1">
                  {result.gazeDeviationScores.map((d, i) => (
                    <div key={i}>얼굴{i + 1}: H={( d.horizontal * 100).toFixed(1)}% V={(d.vertical * 100).toFixed(1)}%</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 문제 요약 */}
          {result.issues.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {result.issues.map(issue => {
                const label: Record<string, string> = {
                  eyes_closed: '눈감음',
                  blurry: '초점불량',
                  poor_lighting: '조도불량',
                  negative_expression: '찡그림',
                  mouth_open: '입벌림',
                  gaze_away: '시선이탈',
                };
                return (
                  <Badge key={issue} variant="destructive">
                    {label[issue] ?? issue}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

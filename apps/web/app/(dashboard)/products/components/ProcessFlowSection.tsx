'use client';

import { Fragment } from 'react';
import { ChevronRight, GitBranch } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { ProcessTemplateStep } from '@/lib/types';

// 공정 프로세스 시각화 컴포넌트
// 상품 등록 폼과 주문 상세 페이지에서 재사용됩니다.
export function ProcessFlowSection({
  steps,
  currentStep,
}: {
  steps: ProcessTemplateStep[];
  currentStep?: string; // 주문 상세에서 현재 진행 단계 하이라이트용
}) {
  if (!steps || steps.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-500 to-purple-400 rounded-t-lg" />
        <div className="flex items-center gap-3.5 px-6 pt-5 pb-3">
          <div className="p-2 rounded-lg bg-violet-50 ring-1 ring-violet-100">
            <GitBranch className="h-[18px] w-[18px] text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-[15px] text-slate-900 leading-tight tracking-tight">
              제작 공정
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {steps.length}단계 공정 프로세스
            </p>
          </div>
        </div>
      </div>
      <CardContent className="px-6 pb-5">
        <div className="flex items-center gap-1.5 overflow-x-auto py-3">
          {steps.map((step, idx) => {
            // 현재 진행 단계 이전/이후 판별
            const currentIdx = currentStep
              ? steps.findIndex((s) => s.stepCode === currentStep)
              : -1;
            const isCompleted = currentIdx >= 0 && idx < currentIdx;
            const isCurrent = currentStep === step.stepCode;

            return (
              <Fragment key={step.stepCode}>
                <div
                  className={`flex flex-col items-center gap-1.5 min-w-[72px] ${
                    isCurrent ? 'scale-105' : ''
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isCurrent
                        ? 'bg-blue-500 text-white ring-2 ring-blue-300 ring-offset-1'
                        : isCompleted
                          ? 'bg-emerald-100 text-emerald-700'
                          : step.isCheckpoint
                            ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                            : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isCompleted ? '✓' : step.stepOrder}
                  </div>
                  <span
                    className={`text-[11px] font-medium text-center leading-tight ${
                      isCurrent
                        ? 'text-blue-700'
                        : isCompleted
                          ? 'text-emerald-600'
                          : 'text-slate-600'
                    }`}
                  >
                    {step.stepName}
                  </span>
                  {step.department && (
                    <span className="text-[9px] text-slate-400">
                      {step.department}
                    </span>
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <ChevronRight
                    className={`h-3.5 w-3.5 flex-shrink-0 mt-[-12px] ${
                      isCompleted ? 'text-emerald-400' : 'text-slate-300'
                    }`}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

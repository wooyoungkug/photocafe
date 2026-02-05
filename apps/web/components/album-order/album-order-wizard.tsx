'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAlbumOrderStore,
  type AlbumOrderStep,
} from '@/stores/album-order-store';

// Step 컴포넌트들 (lazy import)
import { StepPrintMethod } from './steps/step-print-method';
import { StepPageLayout } from './steps/step-page-layout';
import { StepDataUpload } from './steps/step-data-upload';
import { StepFolderAnalysis } from './steps/step-folder-analysis';
import { StepSpecification } from './steps/step-specification';

// 스텝 정보
const STEPS: {
  id: AlbumOrderStep;
  title: string;
  description: string;
  number: number;
}[] = [
  {
    id: 'print-method',
    title: '출력 설정',
    description: '출력기종과 도수를 선택하세요',
    number: 1,
  },
  {
    id: 'page-layout',
    title: '페이지 레이아웃',
    description: '낱장/펼침면과 제본방향을 선택하세요',
    number: 2,
  },
  {
    id: 'data-upload',
    title: '데이터 업로드',
    description: '폴더별로 파일을 업로드하세요',
    number: 3,
  },
  {
    id: 'folder-analysis',
    title: '폴더 분석',
    description: '업로드된 폴더를 확인하세요',
    number: 4,
  },
  {
    id: 'specification',
    title: '규격 선택',
    description: '출력 규격을 선택하세요',
    number: 5,
  },
];

interface AlbumOrderWizardProps {
  productId: string;
  productName: string;
  bindingId?: string;
  bindingName?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function AlbumOrderWizard({
  productId,
  productName,
  bindingId,
  bindingName,
  onComplete,
  onCancel,
}: AlbumOrderWizardProps) {
  const {
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    canProceedToNext,
    setProductInfo,
    setBindingInfo,
    reset,
  } = useAlbumOrderStore();

  // 초기화
  useEffect(() => {
    setProductInfo(productId, productName);
    if (bindingId && bindingName) {
      setBindingInfo(bindingId, bindingName);
    }
  }, [productId, productName, bindingId, bindingName, setProductInfo, setBindingInfo]);

  // 현재 스텝 인덱스
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const currentStepInfo = STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  // 스텝 이동
  const handleNext = () => {
    if (currentStepIndex === STEPS.length - 1) {
      onComplete?.();
    } else {
      nextStep();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex === 0) {
      onCancel?.();
    } else {
      prevStep();
    }
  };

  const handleStepClick = (stepId: AlbumOrderStep) => {
    const stepIndex = STEPS.findIndex((s) => s.id === stepId);
    // 이전 스텝으로만 이동 가능 (완료된 스텝)
    if (stepIndex < currentStepIndex) {
      setCurrentStep(stepId);
    }
  };

  // 스텝 컴포넌트 렌더링
  const renderStep = () => {
    switch (currentStep) {
      case 'print-method':
        return <StepPrintMethod />;
      case 'page-layout':
        return <StepPageLayout />;
      case 'data-upload':
        return <StepDataUpload />;
      case 'folder-analysis':
        return <StepFolderAnalysis />;
      case 'specification':
        return <StepSpecification />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-xl">{productName} 주문</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              reset();
              onCancel?.();
            }}
          >
            초기화
          </Button>
        </div>

        {/* 진행률 바 */}
        <Progress value={progress} className="h-2" />

        {/* 스텝 인디케이터 */}
        <div className="flex items-center justify-between mt-4">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isClickable = index < currentStepIndex;

            return (
              <div
                key={step.id}
                className={cn(
                  'flex flex-col items-center gap-1 flex-1',
                  isClickable && 'cursor-pointer'
                )}
                onClick={() => isClickable && handleStepClick(step.id)}
              >
                {/* 스텝 번호 */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    isCompleted && 'bg-green-500 text-white',
                    isCurrent && 'bg-primary text-primary-foreground',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.number}
                </div>

                {/* 스텝 제목 (데스크탑만) */}
                <span
                  className={cn(
                    'text-xs text-center hidden sm:block',
                    isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        {/* 현재 스텝 설명 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold">{currentStepInfo?.title}</h3>
          <p className="text-sm text-muted-foreground">{currentStepInfo?.description}</p>
        </div>

        {/* 스텝 컨텐츠 */}
        <div className="min-h-[300px]">{renderStep()}</div>

        {/* 네비게이션 버튼 */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrev}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {currentStepIndex === 0 ? '취소' : '이전'}
          </Button>

          <div className="text-sm text-muted-foreground">
            {currentStepIndex + 1} / {STEPS.length}
          </div>

          <Button
            onClick={handleNext}
            disabled={!canProceedToNext()}
            className="gap-2"
          >
            {currentStepIndex === STEPS.length - 1 ? '완료' : '다음'}
            {currentStepIndex < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

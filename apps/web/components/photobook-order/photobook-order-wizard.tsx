'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';

import { StepEditOptions } from './steps/step-edit-options';
import { StepMaterials } from './steps/step-materials';
import { StepQuantity } from './steps/step-quantity';
import { StepDataUpload } from './steps/step-data-upload';
import { StepAdditionalOrder } from './steps/step-additional-order';
import { usePhotobookOrderStore } from '@/stores/photobook-order-store';

const STEPS = [
  { id: 1, name: '편집옵션', description: '낱장/펼침면, 제본순서' },
  { id: 2, name: '마감재', description: '원단, 코팅' },
  { id: 3, name: '수량', description: '주문 부수' },
  { id: 4, name: '데이터', description: '파일 업로드' },
  { id: 5, name: '추가주문', description: '규격 변경/추가' },
  { id: 6, name: '장바구니', description: '주문 완료' },
];

interface PhotobookOrderWizardProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export function PhotobookOrderWizard({
  open,
  onClose,
  productId,
  productName,
}: PhotobookOrderWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const store = usePhotobookOrderStore();

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true; // 편집옵션은 기본값이 있음
      case 2:
        return !!store.fabricId; // 원단 필수
      case 3:
        return store.quantity >= 1;
      case 4:
        return store.files.length > 0 && store.validationStatus !== 'REJECTED';
      case 5:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < 6 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddToCart = () => {
    // 장바구니 추가 로직
    store.addToCart(productId, productName);
    onClose();
    store.reset();
  };

  const handleClose = () => {
    onClose();
    store.reset();
    setCurrentStep(1);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            화보 주문 - {productName}
          </DialogTitle>
        </DialogHeader>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center justify-between mb-6 px-2">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  )}
                >
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <span className={cn(
                  'text-xs mt-1',
                  currentStep === step.id ? 'text-blue-600 font-medium' : 'text-gray-500'
                )}>
                  {step.name}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mx-1',
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* 스텝 콘텐츠 */}
        <Card>
          <CardContent className="pt-6">
            {currentStep === 1 && <StepEditOptions />}
            {currentStep === 2 && <StepMaterials />}
            {currentStep === 3 && <StepQuantity />}
            {currentStep === 4 && <StepDataUpload />}
            {currentStep === 5 && <StepAdditionalOrder />}
            {currentStep === 6 && (
              <div className="text-center py-8">
                <ShoppingCart className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">주문 준비 완료</h3>
                <p className="text-gray-500 mb-6">
                  장바구니에 추가하여 주문을 완료하세요.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 text-left text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-gray-500">편집방식:</span>
                    <span>{store.editStyle === 'SINGLE' ? '낱장' : '펼침면'}</span>
                    <span className="text-gray-500">규격:</span>
                    <span>{store.specWidth}x{store.specHeight}inch</span>
                    <span className="text-gray-500">페이지:</span>
                    <span>{store.pageCount}p</span>
                    <span className="text-gray-500">수량:</span>
                    <span>{store.quantity}부</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 네비게이션 버튼 */}
        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            이전
          </Button>

          {currentStep < 6 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              다음
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleAddToCart} className="bg-green-600 hover:bg-green-700">
              <ShoppingCart className="w-4 h-4 mr-1" />
              장바구니 담기
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

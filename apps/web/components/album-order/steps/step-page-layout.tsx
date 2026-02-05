'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  useAlbumOrderStore,
  PAGE_LAYOUT_LABELS,
  BINDING_DIRECTION_LABELS,
  type PageLayout,
  type BindingDirection,
} from '@/stores/album-order-store';
import { FileText, BookOpen } from 'lucide-react';

export function StepPageLayout() {
  const {
    pageLayout,
    bindingDirection,
    setPageLayout,
    setBindingDirection,
  } = useAlbumOrderStore();

  return (
    <div className="space-y-8">
      {/* 페이지 레이아웃 선택 */}
      <div>
        <h4 className="text-sm font-medium mb-4">페이지 레이아웃</h4>
        <div className="grid grid-cols-2 gap-4">
          <PageLayoutButton
            layout="single"
            label={PAGE_LAYOUT_LABELS.single}
            description="한 페이지씩 개별 출력"
            icon={<FileText className="w-8 h-8" />}
            selected={pageLayout === 'single'}
            onClick={() => setPageLayout('single')}
          />
          <PageLayoutButton
            layout="spread"
            label={PAGE_LAYOUT_LABELS.spread}
            description="양면 펼침으로 출력"
            icon={<BookOpen className="w-8 h-8" />}
            selected={pageLayout === 'spread'}
            onClick={() => setPageLayout('spread')}
          />
        </div>
      </div>

      {/* 제본방향 선택 */}
      <div>
        <h4 className="text-sm font-medium mb-4">제본방향 선택</h4>
        <div className="grid grid-cols-2 gap-4">
          <BindingDirectionButton
            direction="ltr-rend"
            label={BINDING_DIRECTION_LABELS['ltr-rend']}
            selected={bindingDirection === 'ltr-rend'}
            onClick={() => setBindingDirection('ltr-rend')}
          />
          <BindingDirectionButton
            direction="ltr-lend"
            label={BINDING_DIRECTION_LABELS['ltr-lend']}
            selected={bindingDirection === 'ltr-lend'}
            onClick={() => setBindingDirection('ltr-lend')}
          />
          <BindingDirectionButton
            direction="rtl-lend"
            label={BINDING_DIRECTION_LABELS['rtl-lend']}
            selected={bindingDirection === 'rtl-lend'}
            onClick={() => setBindingDirection('rtl-lend')}
          />
          <BindingDirectionButton
            direction="rtl-rend"
            label={BINDING_DIRECTION_LABELS['rtl-rend']}
            selected={bindingDirection === 'rtl-rend'}
            onClick={() => setBindingDirection('rtl-rend')}
          />
        </div>
      </div>

      {/* 선택 정보 요약 */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2">선택된 설정</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>
            <span className="text-foreground/70">레이아웃:</span>{' '}
            <span className="font-medium text-foreground">{PAGE_LAYOUT_LABELS[pageLayout]}</span>
          </div>
          <div>
            <span className="text-foreground/70">제본방향:</span>{' '}
            <span className="font-medium text-foreground">{BINDING_DIRECTION_LABELS[bindingDirection]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 페이지 레이아웃 버튼 컴포넌트
function PageLayoutButton({
  layout,
  label,
  description,
  icon,
  selected,
  onClick,
}: {
  layout: PageLayout;
  label: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50',
        selected && 'border-primary ring-2 ring-primary/20'
      )}
      onClick={onClick}
    >
      <CardContent className="p-6 flex flex-col items-center text-center gap-3">
        <div
          className={cn(
            'p-3 rounded-full',
            selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          {icon}
        </div>
        <div>
          <h5 className="font-medium">{label}</h5>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// 제본방향 버튼 컴포넌트
function BindingDirectionButton({
  direction,
  label,
  selected,
  onClick,
}: {
  direction: BindingDirection;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  // 제본방향 시각화
  const renderDirectionVisual = () => {
    switch (direction) {
      case 'ltr-rend':
        // 좌 시작 → 우 끝
        return (
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="flex items-center gap-1">
              <div className="w-6 h-8 border-2 border-primary bg-primary/20 rounded-sm flex items-center justify-center text-[10px] font-bold">
                1
              </div>
              <div className="text-muted-foreground">→</div>
              <div className="w-6 h-8 border-2 border-muted bg-muted/50 rounded-sm"></div>
              <div className="w-6 h-8 border-2 border-muted bg-muted/50 rounded-sm"></div>
              <div className="w-6 h-8 border-2 border-primary bg-primary/20 rounded-sm flex items-center justify-center text-[10px] font-bold">
                N
              </div>
            </div>
          </div>
        );
      case 'ltr-lend':
        // 좌 시작 → 좌 끝
        return (
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="flex items-center gap-1">
              <div className="w-6 h-8 border-2 border-primary bg-primary/20 rounded-sm flex items-center justify-center text-[10px] font-bold">
                1
              </div>
              <div className="text-muted-foreground">↺</div>
              <div className="w-6 h-8 border-2 border-muted bg-muted/50 rounded-sm"></div>
              <div className="w-6 h-8 border-2 border-muted bg-muted/50 rounded-sm"></div>
              <div className="w-6 h-8 border-2 border-primary bg-primary/20 rounded-sm flex items-center justify-center text-[10px] font-bold">
                N
              </div>
            </div>
          </div>
        );
      case 'rtl-lend':
        // 우 시작 → 좌 끝
        return (
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="flex items-center gap-1">
              <div className="w-6 h-8 border-2 border-primary bg-primary/20 rounded-sm flex items-center justify-center text-[10px] font-bold">
                N
              </div>
              <div className="w-6 h-8 border-2 border-muted bg-muted/50 rounded-sm"></div>
              <div className="w-6 h-8 border-2 border-muted bg-muted/50 rounded-sm"></div>
              <div className="text-muted-foreground">←</div>
              <div className="w-6 h-8 border-2 border-primary bg-primary/20 rounded-sm flex items-center justify-center text-[10px] font-bold">
                1
              </div>
            </div>
          </div>
        );
      case 'rtl-rend':
        // 우 시작 → 우 끝
        return (
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="flex items-center gap-1">
              <div className="w-6 h-8 border-2 border-primary bg-primary/20 rounded-sm flex items-center justify-center text-[10px] font-bold">
                N
              </div>
              <div className="w-6 h-8 border-2 border-muted bg-muted/50 rounded-sm"></div>
              <div className="w-6 h-8 border-2 border-muted bg-muted/50 rounded-sm"></div>
              <div className="text-muted-foreground">↻</div>
              <div className="w-6 h-8 border-2 border-primary bg-primary/20 rounded-sm flex items-center justify-center text-[10px] font-bold">
                1
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50',
        selected && 'border-primary ring-2 ring-primary/20'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 flex flex-col items-center text-center gap-3">
        {/* 방향 시각화 */}
        <div className="h-12 flex items-center">
          {renderDirectionVisual()}
        </div>
        <div>
          <h5 className="font-medium text-sm">{label}</h5>
        </div>
      </CardContent>
    </Card>
  );
}

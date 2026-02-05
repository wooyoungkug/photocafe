'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  useAlbumOrderStore,
  PRINT_METHOD_LABELS,
  COLOR_MODE_LABELS,
  type PrintMethod,
  type ColorMode,
} from '@/stores/album-order-store';
import { Printer, Droplets } from 'lucide-react';

export function StepPrintMethod() {
  const { printMethod, colorMode, setPrintMethod, setColorMode } = useAlbumOrderStore();

  return (
    <div className="space-y-8">
      {/* 출력기종 선택 */}
      <div>
        <h4 className="text-sm font-medium mb-4">출력기종 선택</h4>
        <div className="grid grid-cols-2 gap-4">
          <PrintMethodButton
            method="indigo"
            label={PRINT_METHOD_LABELS.indigo}
            description="고품질 디지털 인쇄"
            icon={<Printer className="w-8 h-8" />}
            selected={printMethod === 'indigo'}
            onClick={() => setPrintMethod('indigo')}
          />
          <PrintMethodButton
            method="inkjet"
            label={PRINT_METHOD_LABELS.inkjet}
            description="대형 포스터/배너 출력"
            icon={<Droplets className="w-8 h-8" />}
            selected={printMethod === 'inkjet'}
            onClick={() => setPrintMethod('inkjet')}
          />
        </div>
      </div>

      {/* 도수 선택 */}
      <div>
        <h4 className="text-sm font-medium mb-4">도수 선택</h4>
        <div className="grid grid-cols-2 gap-4">
          <ColorModeButton
            mode="4c"
            label={COLOR_MODE_LABELS['4c']}
            description="일반 컬러 인쇄 (Cyan, Magenta, Yellow, Black)"
            colors={['#00BCD4', '#E91E63', '#FFEB3B', '#212121']}
            selected={colorMode === '4c'}
            onClick={() => setColorMode('4c')}
          />
          <ColorModeButton
            mode="6c"
            label={COLOR_MODE_LABELS['6c']}
            description="6도 인쇄 (CMYK + Orange + Violet)"
            colors={['#00BCD4', '#E91E63', '#FFEB3B', '#212121', '#FF9800', '#9C27B0']}
            selected={colorMode === '6c'}
            onClick={() => setColorMode('6c')}
          />
        </div>
      </div>

      {/* 선택 정보 요약 */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2">선택된 설정</h4>
        <div className="text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="font-medium text-foreground">{PRINT_METHOD_LABELS[printMethod]}</span>
            <span>+</span>
            <span className="font-medium text-foreground">{COLOR_MODE_LABELS[colorMode]}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// 출력기종 버튼 컴포넌트
function PrintMethodButton({
  method,
  label,
  description,
  icon,
  selected,
  onClick,
}: {
  method: PrintMethod;
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

// 도수 버튼 컴포넌트
function ColorModeButton({
  mode,
  label,
  description,
  colors,
  selected,
  onClick,
}: {
  mode: ColorMode;
  label: string;
  description: string;
  colors: string[];
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
        {/* 컬러 팔레트 */}
        <div className="flex gap-1">
          {colors.map((color, index) => (
            <div
              key={index}
              className="w-6 h-6 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div>
          <h5 className="font-medium">{label}</h5>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

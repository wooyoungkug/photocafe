'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePhotobookOrderStore } from '@/stores/photobook-order-store';
import {
  filterSameRatioSizes,
  getRatioLabel,
  type StandardSize,
} from '@/lib/album-utils';
import { Plus, Check } from 'lucide-react';

// 임시 표준 규격 목록 (실제로는 API에서 가져옴)
const STANDARD_SIZES: StandardSize[] = [
  { id: '1', name: '6x6', widthInch: 6, heightInch: 6, ratio: 1, ratioLabel: '1:1' },
  { id: '2', name: '8x8', widthInch: 8, heightInch: 8, ratio: 1, ratioLabel: '1:1' },
  { id: '3', name: '10x10', widthInch: 10, heightInch: 10, ratio: 1, ratioLabel: '1:1' },
  { id: '4', name: '11x11', widthInch: 11, heightInch: 11, ratio: 1, ratioLabel: '1:1' },
  { id: '5', name: '12x12', widthInch: 12, heightInch: 12, ratio: 1, ratioLabel: '1:1' },
  { id: '6', name: '9x6', widthInch: 9, heightInch: 6, ratio: 1.5, ratioLabel: '3:2' },
  { id: '7', name: '12x8', widthInch: 12, heightInch: 8, ratio: 1.5, ratioLabel: '3:2' },
  { id: '8', name: '15x10', widthInch: 15, heightInch: 10, ratio: 1.5, ratioLabel: '3:2' },
  { id: '9', name: '10x8', widthInch: 10, heightInch: 8, ratio: 1.25, ratioLabel: '5:4' },
  { id: '10', name: '15x12', widthInch: 15, heightInch: 12, ratio: 1.25, ratioLabel: '5:4' },
  { id: '11', name: '8x6', widthInch: 8, heightInch: 6, ratio: 1.33, ratioLabel: '4:3' },
  { id: '12', name: '12x9', widthInch: 12, heightInch: 9, ratio: 1.33, ratioLabel: '4:3' },
  { id: '13', name: '14x10', widthInch: 14, heightInch: 10, ratio: 1.4, ratioLabel: '7:5' },
  { id: '14', name: '14x11', widthInch: 14, heightInch: 11, ratio: 1.27, ratioLabel: '14:11' },
];

export function StepAdditionalOrder() {
  const { specWidth, specHeight, pageCount, quantity, setSpec } = usePhotobookOrderStore();

  // 같은 비율의 규격 필터링
  const sameRatioSizes = filterSameRatioSizes(specWidth, specHeight, STANDARD_SIZES);

  // 현재 비율 라벨
  const currentRatioLabel = getRatioLabel(specWidth, specHeight);

  return (
    <div className="space-y-6">
      {/* 현재 규격 정보 */}
      <div>
        <Label className="text-base font-medium mb-3 block">현재 주문 규격</Label>
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">
                {specWidth}x{specHeight}inch
              </div>
              <div className="text-sm text-gray-500">
                비율 {currentRatioLabel} · {pageCount}p · {quantity}부
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              현재 선택
            </Badge>
          </div>
        </Card>
      </div>

      {/* 같은 비율 규격 목록 */}
      {sameRatioSizes.length > 0 && (
        <div>
          <Label className="text-base font-medium mb-3 block">
            같은 비율로 추가 주문 가능한 규격
            <span className="text-sm font-normal text-gray-500 ml-2">
              (비율 {currentRatioLabel})
            </span>
          </Label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sameRatioSizes.map((size) => (
              <Card
                key={size.id}
                className="p-3 cursor-pointer hover:border-blue-300 transition-colors"
                onClick={() => setSpec(size.widthInch, size.heightInch)}
              >
                <div className="text-center">
                  <div className="font-medium">{size.name}</div>
                  <div className="text-xs text-gray-500">
                    {size.widthInch}x{size.heightInch}"
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSpec(size.widthInch, size.heightInch);
                    }}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    규격 변경
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 규격이 없는 경우 */}
      {sameRatioSizes.length === 0 && specWidth > 0 && (
        <div className="text-center py-6 text-gray-500">
          <p>같은 비율의 다른 규격이 없습니다.</p>
          <p className="text-sm">현재 규격으로 주문을 진행하세요.</p>
        </div>
      )}

      {/* 안내 */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <h4 className="font-medium mb-2">비율 규칙 안내</h4>
        <ul className="space-y-1 text-xs">
          <li>• 정사각형 (1:1): 6x6, 8x8, 10x10, 11x11, 12x12</li>
          <li>• 3:2 비율: 9x6, 12x8, 15x10</li>
          <li>• 5:4 비율: 10x8, 15x12</li>
          <li>• 같은 비율의 규격으로만 변경/추가 주문이 가능합니다.</li>
        </ul>
      </div>
    </div>
  );
}

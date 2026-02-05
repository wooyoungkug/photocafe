'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePhotobookOrderStore } from '@/stores/photobook-order-store';
import { Minus, Plus } from 'lucide-react';

export function StepQuantity() {
  const { quantity, setQuantity } = usePhotobookOrderStore();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setQuantity(value);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium mb-3 block">주문 수량 (부수)</Label>

        <div className="flex items-center gap-4 max-w-xs">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setQuantity(quantity - 1)}
            disabled={quantity <= 1}
          >
            <Minus className="w-4 h-4" />
          </Button>

          <Input
            type="number"
            value={quantity}
            onChange={handleInputChange}
            min={1}
            max={9999}
            className="text-center text-lg font-medium w-24"
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setQuantity(quantity + 1)}
            disabled={quantity >= 9999}
          >
            <Plus className="w-4 h-4" />
          </Button>

          <span className="text-gray-500">부</span>
        </div>

        {/* 대량 주문 안내 */}
        {quantity >= 50 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
            <span className="font-medium text-yellow-800">대량 주문 안내</span>
            <p className="text-yellow-700 mt-1">
              50부 이상 주문 시 별도 견적이 필요할 수 있습니다.
            </p>
          </div>
        )}
      </div>

      {/* 빠른 선택 버튼 */}
      <div>
        <Label className="text-sm text-gray-500 mb-2 block">빠른 선택</Label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 5, 10, 20, 50].map((num) => (
            <Button
              key={num}
              type="button"
              variant={quantity === num ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQuantity(num)}
            >
              {num}부
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

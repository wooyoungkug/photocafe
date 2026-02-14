'use client';

import { GripVertical, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { CartItem } from '@/stores/cart-store';
import { normalizeImageUrl } from '@/lib/utils';

interface CartItemDragOverlayProps {
  item: CartItem;
}

export function CartItemDragOverlay({ item }: CartItemDragOverlayProps) {
  return (
    <Card className="shadow-2xl ring-2 ring-primary/20 bg-white cursor-grabbing rotate-1 opacity-95">
      <div className="flex items-center gap-3 p-4">
        <GripVertical className="h-5 w-5 text-primary flex-shrink-0" />
        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
          {item.thumbnailUrl ? (
            <img
              src={normalizeImageUrl(item.thumbnailUrl)}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-6 h-6 text-gray-300" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.name}</p>
          <p className="text-xs text-gray-400">
            {item.quantity}개 · {item.totalPrice.toLocaleString()}원
          </p>
        </div>
      </div>
    </Card>
  );
}

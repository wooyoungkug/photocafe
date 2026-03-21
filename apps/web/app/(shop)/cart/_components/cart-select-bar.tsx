'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface CartSelectBarProps {
  totalCount: number;
  selectableCount: number;
  selectedCount: number;
  onSelectAll: (checked: boolean) => void;
  onDeleteSelected: () => void;
  onClearCart: () => void;
}

export function CartSelectBar({
  totalCount,
  selectableCount,
  selectedCount,
  onSelectAll,
  onDeleteSelected,
  onClearCart,
}: CartSelectBarProps) {
  const t = useTranslations('cart');

  const isAllSelected = selectableCount > 0 && selectedCount === selectableCount;

  return (
    <div className="bg-white rounded-lg max-sm:rounded-none max-sm:border-x-0 max-sm:-mx-4 border p-3 sm:p-4 flex items-center justify-between">
      <div className="flex items-center gap-2 touch-target">
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={onSelectAll}
          disabled={selectableCount === 0}
          className="w-5 h-5"
        />
        <span
          className="text-sm sm:text-base font-medium cursor-pointer select-none"
          onClick={() => selectableCount > 0 && onSelectAll(!isAllSelected)}
        >
          {t('selectAll')}
          <span className="text-muted-foreground ml-1">
            ({selectedCount}/{totalCount})
          </span>
        </span>
      </div>
      <div className="flex gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onDeleteSelected}
          disabled={selectedCount === 0}
          className="text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3"
        >
          {t('deleteSelected')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearCart}
          className="text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3"
        >
          {t('deleteAll')}
        </Button>
      </div>
    </div>
  );
}

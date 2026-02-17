'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { ProductFinishing } from '@/lib/types';

interface OptionFinishingProps {
  finishings: ProductFinishing[];
  selectedFinishings: ProductFinishing[];
  onToggle: (finishing: ProductFinishing, checked: boolean) => void;
}

export function OptionFinishing({ finishings, selectedFinishings, onToggle }: OptionFinishingProps) {
  if (!finishings || finishings.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {finishings.map((finishing) => {
        const isChecked = selectedFinishings.some(f => f.id === finishing.id);
        return (
          <label key={finishing.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
            <Checkbox checked={isChecked} onCheckedChange={(checked) => onToggle(finishing, !!checked)} />
            <span className={cn(isChecked ? 'text-gray-900' : 'text-gray-600')}>{finishing.name}</span>
          </label>
        );
      })}
    </div>
  );
}

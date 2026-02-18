'use client';

import { cn } from '@/lib/utils';
import type { ProductBinding } from '@/lib/types';

interface OptionBindingProps {
  bindings: ProductBinding[];
  selectedBindingId?: string;
  onSelect: (binding: ProductBinding) => void;
}

export function OptionBinding({ bindings, selectedBindingId, onSelect }: OptionBindingProps) {
  if (!bindings || bindings.length === 0) return null;
  if (bindings.length === 1) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {bindings.map((binding) => {
        const isSelected = selectedBindingId === binding.id;
        const label = binding.name.split(' - ')[0].replace(/\s*\(.*?\)$/, '');
        return (
          <button
            key={binding.id}
            type="button"
            onClick={() => onSelect(binding)}
            className={cn(
              'px-3 py-1.5 text-sm rounded border transition-colors',
              isSelected
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 text-gray-700 hover:border-gray-400'
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

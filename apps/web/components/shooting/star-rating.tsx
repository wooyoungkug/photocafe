'use client';

import { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  className?: string;
}

const SIZES = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

const TOUCH_SIZES = {
  sm: 'p-0.5',
  md: 'p-1',
  lg: 'p-2',
};

export function StarRating({
  value,
  onChange,
  max = 5,
  size = 'md',
  readOnly = false,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const handleClick = useCallback(
    (rating: number) => {
      if (readOnly || !onChange) return;
      // 같은 별을 다시 클릭하면 0으로 초기화
      onChange(rating === value ? 0 : rating);
    },
    [readOnly, onChange, value]
  );

  const handleMouseEnter = useCallback(
    (rating: number) => {
      if (readOnly) return;
      setHoverValue(rating);
    },
    [readOnly]
  );

  const handleMouseLeave = useCallback(() => {
    if (readOnly) return;
    setHoverValue(0);
  }, [readOnly]);

  const displayValue = hoverValue || value;

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      onMouseLeave={handleMouseLeave}
      role="radiogroup"
      aria-label="별점"
    >
      {Array.from({ length: max }, (_, i) => {
        const rating = i + 1;
        const isFilled = rating <= displayValue;

        return (
          <button
            key={rating}
            type="button"
            disabled={readOnly}
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            className={cn(
              'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded',
              TOUCH_SIZES[size],
              readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'
            )}
            role="radio"
            aria-checked={rating === value}
            aria-label={`${rating}점`}
          >
            <Star
              className={cn(
                SIZES[size],
                'transition-colors',
                isFilled
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-transparent text-gray-300'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatNumber, getDiffPercent } from './pricing-utils';

interface PriceCellProps {
  /** 현재 값 */
  value: number | string;
  /** 표준단가 (비교 참조, 그룹/개별 모드에서 사용) */
  referenceValue?: number;
  /** 변경 핸들러 */
  onChange: (value: number) => void;
  /** 읽기 전용 */
  readOnly?: boolean;
  /** 기준행 강조 (idx=0) */
  highlight?: boolean;
  /** 크기 */
  size?: 'sm' | 'md';
  /** 추가 className */
  className?: string;
  /** step */
  step?: string;
  /** placeholder */
  placeholder?: string;
}

export function PriceCell({
  value,
  referenceValue,
  onChange,
  readOnly = false,
  highlight = false,
  size = 'sm',
  className,
  step = '1',
  placeholder = '0',
}: PriceCellProps) {
  const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;

  // 차이 퍼센트 계산
  const diff =
    referenceValue && referenceValue > 0 && numericValue > 0
      ? getDiffPercent(referenceValue, numericValue)
      : null;

  const sizeClasses = size === 'sm' ? 'h-7 w-16 text-xs' : 'h-8 w-20 text-sm';

  if (readOnly) {
    return (
      <div className="flex flex-col items-center">
        {referenceValue != null && referenceValue > 0 && (
          <span className="text-[9px] text-gray-400">{formatNumber(referenceValue)}</span>
        )}
        <span
          className={cn(
            sizeClasses,
            'flex items-center justify-center font-mono text-gray-600 bg-gray-50 rounded border',
            className
          )}
        >
          {formatNumber(numericValue) || '-'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* 표준가 참조 표시 */}
      {referenceValue != null && referenceValue > 0 && (
        <div className="flex items-center gap-0.5">
          <span className="text-[9px] text-gray-400">{formatNumber(referenceValue)}</span>
          {diff && diff.direction !== 'same' && (
            <span
              className={cn(
                'text-[8px] font-medium',
                diff.direction === 'down' ? 'text-green-600' : 'text-red-500'
              )}
            >
              {diff.direction === 'down' ? '-' : '+'}
              {diff.percent}%
            </span>
          )}
        </div>
      )}
      <Input
        type="number"
        step={step}
        className={cn(
          sizeClasses,
          'text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          highlight
            ? 'bg-amber-100 border-amber-300 font-medium focus:border-amber-400 focus:ring-1 focus:ring-amber-200'
            : 'bg-white border-slate-200 hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200',
          className
        )}
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder={placeholder}
      />
    </div>
  );
}

'use client';

import { cn } from '@/lib/utils';

interface OptionCardProps {
  title: string;
  count?: number;
  stepNumber?: number;
  isCompleted?: boolean;
  summary?: string;
  children: React.ReactNode;
  className?: string;
  inline?: boolean;
}

export function OptionCard({
  title,
  count,
  summary,
  children,
  className,
  inline,
}: OptionCardProps) {
  if (inline) {
    return (
      <div className={cn('py-3 border-b border-gray-100 last:border-b-0', className)}>
        <div className="flex items-center gap-3 text-[10pt] text-gray-900">
          <span className="font-bold whitespace-nowrap w-16 text-right flex-shrink-0">
            {title}
            {count !== undefined && count > 0 && (
              <span className="text-xs text-gray-400 font-normal ml-0.5">({count})</span>
            )}
          </span>
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('py-3 border-b border-gray-100 last:border-b-0', className)}>
      <div className="flex items-start gap-3 text-[10pt] text-gray-900">
        <span className="font-bold whitespace-nowrap w-16 text-right flex-shrink-0 mt-0.5">
          {title}
          {count !== undefined && count > 0 && (
            <span className="text-xs text-gray-400 font-normal ml-0.5">({count})</span>
          )}
        </span>
        <div className="flex-1">
          {summary && (
            <span className="font-normal text-gray-700 block mb-2">{summary}</span>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

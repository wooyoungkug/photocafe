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
}

export function OptionCard({
  title,
  count,
  summary,
  children,
  className,
}: OptionCardProps) {
  return (
    <div className={cn('py-3 border-b border-gray-100 last:border-b-0', className)}>
      <h3 className="text-sm text-gray-900 mb-2">
        <span className="font-bold">{title}</span>
        {summary && (
          <span className="font-normal text-gray-700 ml-2">{summary}</span>
        )}
        {count !== undefined && count > 0 && (
          <span className="text-xs text-gray-400 font-normal ml-1">({count})</span>
        )}
      </h3>
      {children}
    </div>
  );
}

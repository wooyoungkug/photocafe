'use client';

import { Badge } from '@/components/ui/badge';

interface ColumnHeaderProps {
  title: string;
  count: number;
}

export function ColumnHeader({ title, count }: ColumnHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b bg-white sticky top-0 z-10">
      <span className="text-[18px] text-black font-bold">{title}</span>
      <Badge
        variant="secondary"
        className="rounded-full bg-gray-100 text-black font-normal text-[14px] px-2 min-w-[28px] justify-center"
      >
        {count}
      </Badge>
    </div>
  );
}

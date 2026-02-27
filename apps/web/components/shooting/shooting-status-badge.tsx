'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ShootingStatus } from '@/hooks/use-shooting';
import { SHOOTING_STATUS_LABELS } from '@/hooks/use-shooting';

const STATUS_STYLES: Record<ShootingStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-blue-100 text-blue-700 border-blue-200',
  bidding: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  in_progress: 'bg-violet-100 text-violet-700 border-violet-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

interface ShootingStatusBadgeProps {
  status: ShootingStatus;
  className?: string;
}

export function ShootingStatusBadge({ status, className }: ShootingStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[12px] font-medium',
        STATUS_STYLES[status] || 'bg-gray-100 text-gray-600',
        className
      )}
    >
      {SHOOTING_STATUS_LABELS[status] || status}
    </Badge>
  );
}

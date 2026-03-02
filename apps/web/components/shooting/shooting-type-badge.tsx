'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ShootingType } from '@/lib/constants/shooting-types';
import { SHOOTING_TYPE_LABELS, SHOOTING_TYPE_COLORS } from '@/lib/constants/shooting-types';

export { SHOOTING_TYPE_COLORS };

const TYPE_STYLES: Record<ShootingType, string> = {
  wedding_main: 'bg-rose-100 text-rose-700 border-rose-200',
  wedding_rehearsal: 'bg-orange-100 text-orange-700 border-orange-200',
  baby_dol: 'bg-violet-100 text-violet-700 border-violet-200',
  baby_growth: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  profile: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
};

interface ShootingTypeBadgeProps {
  type: ShootingType;
  className?: string;
}

export function ShootingTypeBadge({ type, className }: ShootingTypeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[12px] font-medium',
        TYPE_STYLES[type] || 'bg-gray-100 text-gray-600',
        className
      )}
    >
      {SHOOTING_TYPE_LABELS[type] || type}
    </Badge>
  );
}

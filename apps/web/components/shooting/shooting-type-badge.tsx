'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ShootingType } from '@/hooks/use-shooting';
import { SHOOTING_TYPE_LABELS } from '@/hooks/use-shooting';

/** 촬영 유형별 컬러 코딩 */
export const SHOOTING_TYPE_COLORS: Record<ShootingType, string> = {
  wedding: '#E11D48',
  studio: '#F97316',
  outdoor: '#8B5CF6',
  product: '#06B6D4',
  profile: '#10B981',
  event: '#D946EF',
  other: '#6B7280',
};

const TYPE_STYLES: Record<ShootingType, string> = {
  wedding: 'bg-rose-100 text-rose-700 border-rose-200',
  studio: 'bg-orange-100 text-orange-700 border-orange-200',
  outdoor: 'bg-violet-100 text-violet-700 border-violet-200',
  product: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  profile: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  event: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
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

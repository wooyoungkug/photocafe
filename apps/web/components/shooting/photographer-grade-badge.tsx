'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Award, Star, Shield, Crown, Sparkles } from 'lucide-react';

export type PhotographerGrade = 'NEW' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export const GRADE_LABELS: Record<PhotographerGrade, string> = {
  NEW: '신규',
  BRONZE: '브론즈',
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘',
};

const GRADE_STYLES: Record<PhotographerGrade, string> = {
  NEW: 'bg-slate-100 text-slate-600 border-slate-200',
  BRONZE: 'bg-amber-50 text-amber-700 border-amber-200',
  SILVER: 'bg-gray-100 text-gray-700 border-gray-300',
  GOLD: 'bg-yellow-50 text-yellow-700 border-yellow-300',
  PLATINUM: 'bg-indigo-50 text-indigo-700 border-indigo-300',
};

const GRADE_ICONS: Record<PhotographerGrade, React.ComponentType<{ className?: string }>> = {
  NEW: Sparkles,
  BRONZE: Shield,
  SILVER: Award,
  GOLD: Star,
  PLATINUM: Crown,
};

interface PhotographerGradeBadgeProps {
  grade: PhotographerGrade;
  className?: string;
  showIcon?: boolean;
}

export function PhotographerGradeBadge({
  grade,
  className,
  showIcon = true,
}: PhotographerGradeBadgeProps) {
  const Icon = GRADE_ICONS[grade] || Sparkles;

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[12px] font-medium gap-1',
        GRADE_STYLES[grade] || 'bg-gray-100 text-gray-600',
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {GRADE_LABELS[grade] || grade}
    </Badge>
  );
}

'use client';

import { Badge } from '@/components/ui/badge';
import {
  RETURN_STATUS_LABELS,
  RETURN_TYPE_LABELS,
} from '@/hooks/use-return-requests';

const STATUS_COLORS: Record<string, string> = {
  requested: 'bg-orange-100 text-orange-700',
  collecting: 'bg-cyan-100 text-cyan-700',
  collected: 'bg-teal-100 text-teal-700',
  inspecting: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
};

interface ReturnStatusBadgeProps {
  status: string;
  type?: string;
  className?: string;
}

export function ReturnStatusBadge({ status, type, className }: ReturnStatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
  const label = RETURN_STATUS_LABELS[status] || status;
  const typeLabel = type ? RETURN_TYPE_LABELS[type] : '';

  return (
    <Badge className={`${colorClass} ${className || ''} text-[10px] font-normal`}>
      {typeLabel ? `${typeLabel} - ` : ''}{label}
    </Badge>
  );
}

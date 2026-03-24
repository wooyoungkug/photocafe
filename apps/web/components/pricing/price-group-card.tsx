'use client';

import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRICE_GROUP_STYLES, type PriceGroupColor } from './pricing-constants';

interface PriceGroupCardProps {
  /** 용지그룹 색상 */
  color: PriceGroupColor | 'none';
  /** 할당된 용지 이름 목록 */
  assignedPaperNames?: string[];
  /** 내부 테이블 */
  children: ReactNode;
  /** 삭제 핸들러 (표준 모드에서만 사용) */
  onDelete?: () => void;
  /** 읽기 전용 */
  readOnly?: boolean;
  /** 추가 헤더 요소 (가중치 입력 등) */
  headerExtra?: ReactNode;
  /** 추가 className */
  className?: string;
}

export function PriceGroupCard({
  color,
  assignedPaperNames = [],
  children,
  onDelete,
  readOnly = false,
  headerExtra,
  className,
}: PriceGroupCardProps) {
  const style = PRICE_GROUP_STYLES[color] || PRICE_GROUP_STYLES.none;

  return (
    <div
      className={cn(
        'border-2 rounded-lg p-4 space-y-3 shadow-sm',
        style.bg,
        style.border,
        className
      )}
    >
      {/* 그룹 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{style.dot}</span>
          <span className={cn('font-bold text-base', style.text)}>{style.label}</span>
          {assignedPaperNames.length > 0 && (
            <span className="text-[13px] text-gray-500 truncate max-w-[300px]">
              {assignedPaperNames.join(', ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerExtra}
          {!readOnly && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 내부 콘텐츠 (가격 테이블) */}
      {children}
    </div>
  );
}

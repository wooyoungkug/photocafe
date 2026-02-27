'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhotographerGradeBadge, type PhotographerGrade } from './photographer-grade-badge';
import { StarRating } from './star-rating';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Check, X, Clock, User } from 'lucide-react';

export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface ShootingBid {
  id: string;
  shootingId: string;
  photographerId: string;
  photographerName: string;
  photographerGrade: PhotographerGrade;
  photographerProfileImage?: string;
  reliabilityScore: number;
  averageRating: number;
  totalShootings: number;
  onTimeRate: number;
  status: BidStatus;
  bidAmount?: number;
  message?: string;
  createdAt: string;
}

const BID_STATUS_LABELS: Record<BidStatus, string> = {
  pending: '대기중',
  accepted: '확정',
  rejected: '거절',
  withdrawn: '철회',
};

const BID_STATUS_STYLES: Record<BidStatus, string> = {
  pending: 'text-amber-600',
  accepted: 'text-emerald-600',
  rejected: 'text-red-500',
  withdrawn: 'text-gray-400',
};

interface BidCardProps {
  bid: ShootingBid;
  onAccept?: (bidId: string) => void;
  onReject?: (bidId: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function BidCard({
  bid,
  onAccept,
  onReject,
  isLoading = false,
  className,
}: BidCardProps) {
  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* 작가 정보 */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* 프로필 이미지 */}
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {bid.photographerProfileImage ? (
                <img
                  src={bid.photographerProfileImage}
                  alt={bid.photographerName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 text-gray-400" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              {/* 이름 + 등급 */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[14px] text-black font-bold truncate">
                  {bid.photographerName}
                </span>
                <PhotographerGradeBadge grade={bid.photographerGrade} />
              </div>

              {/* 통계 */}
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-[12px] text-gray-500">신뢰도</span>
                  <span className="text-[14px] text-black font-normal">
                    {bid.reliabilityScore.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <StarRating value={Math.round(bid.averageRating)} size="sm" readOnly />
                  <span className="text-[12px] text-gray-500">
                    ({bid.averageRating.toFixed(1)})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[12px] text-gray-500">정시율</span>
                  <span className="text-[14px] text-black font-normal">
                    {bid.onTimeRate}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[12px] text-gray-500">촬영</span>
                  <span className="text-[14px] text-black font-normal">
                    {bid.totalShootings}건
                  </span>
                </div>
              </div>

              {/* 메시지 */}
              {bid.message && (
                <p className="text-[14px] text-black font-normal mt-2 line-clamp-2">
                  {bid.message}
                </p>
              )}

              {/* 응찰 시각 + 상태 */}
              <div className="flex items-center gap-2 mt-2">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-[12px] text-gray-500">
                  {format(parseISO(bid.createdAt), 'M월 d일 HH:mm', { locale: ko })}
                </span>
                <span className={cn('text-[12px] font-medium', BID_STATUS_STYLES[bid.status])}>
                  {BID_STATUS_LABELS[bid.status]}
                </span>
              </div>
            </div>
          </div>

          {/* 액션 버튼 (pending 상태에서만) */}
          {bid.status === 'pending' && (
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <Button
                size="sm"
                onClick={() => onAccept?.(bid.id)}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[12px]"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                확정
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject?.(bid.id)}
                disabled={isLoading}
                className="text-[12px]"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                거절
              </Button>
            </div>
          )}
        </div>

        {/* 응찰 금액 */}
        {bid.bidAmount !== undefined && bid.bidAmount > 0 && (
          <div className="mt-3 pt-3 border-t">
            <span className="text-[12px] text-gray-500">응찰 금액</span>
            <span className="text-[14px] text-black font-bold ml-2">
              {new Intl.NumberFormat('ko-KR').format(bid.bidAmount)}원
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Award,
  TrendingUp,
  Heart,
  Star,
  Sparkles,
  Trophy,
  Loader2,
  XCircle,
} from 'lucide-react';
import { useMyBidderStats } from '@/hooks/use-recruitment-bid';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const TIER_INFO: Record<
  string,
  { label: string; gradient: string; min: number }
> = {
  NEW: { label: '신규', gradient: 'from-gray-400 to-gray-500', min: 0 },
  BRONZE: { label: '브론즈', gradient: 'from-orange-300 to-orange-400', min: 1 },
  SILVER: { label: '실버', gradient: 'from-slate-400 to-slate-500', min: 3 },
  GOLD: { label: '골드', gradient: 'from-amber-400 to-orange-500', min: 10 },
  PLATINUM: {
    label: '플래티넘',
    gradient: 'from-violet-500 to-fuchsia-500',
    min: 30,
  },
};

const TIER_ORDER = ['NEW', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as const;

export function MyBidderStatsCard({ enabled = true }: { enabled?: boolean }) {
  const { data, isLoading } = useMyBidderStats(enabled);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const tier = TIER_INFO[data.tier] ?? TIER_INFO.NEW;
  const currentTierIdx = TIER_ORDER.indexOf(data.tier as any);
  const nextTier =
    currentTierIdx < TIER_ORDER.length - 1
      ? TIER_INFO[TIER_ORDER[currentTierIdx + 1]]
      : null;
  const tierProgress = nextTier
    ? Math.min(
        100,
        Math.round((data.selectedCount / nextTier.min) * 100),
      )
    : 100;

  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      {/* 등급 헤더 */}
      <div className={cn('bg-gradient-to-r p-4', tier.gradient)}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] opacity-90">현재 등급</p>
              <p className="text-[18px] font-bold leading-tight">
                {tier.label} 작가
              </p>
            </div>
          </div>
          {data.avgRating != null && (
            <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1.5 rounded-full backdrop-blur">
              <Star className="h-3.5 w-3.5 fill-white" />
              <span className="text-[13px] font-bold">
                {data.avgRating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* 다음 등급까지 진행률 */}
        {nextTier && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-white/90">
              <span>다음 등급: {nextTier.label}</span>
              <span>
                {data.selectedCount} / {nextTier.min}회
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${tierProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 통계 */}
      <CardContent className="p-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <StatItem
            icon={<Award className="h-4 w-4 text-amber-500" />}
            label="선택된 횟수"
            value={data.selectedCount}
            suffix="회"
            tone="amber"
          />
          <StatItem
            icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
            label="누적 응찰"
            value={data.totalBids}
            suffix="회"
            tone="blue"
          />
          <StatItem
            icon={<Sparkles className="h-4 w-4 text-fuchsia-500" />}
            label="채택률"
            value={data.acceptanceRate}
            suffix="%"
            tone="fuchsia"
          />
          <StatItem
            icon={<Heart className="h-4 w-4 text-pink-500 fill-pink-500" />}
            label="고객 좋아요"
            value={data.likedCount}
            suffix="개"
            tone="pink"
          />
          <StatItem
            icon={<XCircle className="h-4 w-4 text-red-400" />}
            label="거절"
            value={data.rejectedCount}
            suffix="회"
            tone="red"
          />
          <StatItem
            icon={<XCircle className="h-4 w-4 text-gray-400" />}
            label="응찰 취소"
            value={data.cancelledCount}
            suffix="회"
            tone="gray"
          />
        </div>

        {/* 최근 리뷰 (선택적) */}
        {data.recentReviews && data.recentReviews.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-[12px] font-bold text-gray-700 mb-2 flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-pink-500 fill-pink-500" />
              최근 신랑신부 후기
            </p>
            <div className="space-y-2">
              {data.recentReviews.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="p-2.5 rounded-lg bg-pink-50/50 border border-pink-100"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    {r.rating != null && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn(
                              'h-3 w-3',
                              n <= (r.rating ?? 0)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-200',
                            )}
                          />
                        ))}
                      </div>
                    )}
                    {r.reviewerName && (
                      <span className="text-[11px] text-gray-500">
                        {r.reviewerName}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 ml-auto">
                      {format(new Date(r.completedAt), 'yyyy.MM.dd', { locale: ko })}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-[12px] text-gray-700 line-clamp-2 leading-relaxed">
                      {r.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatItem({
  icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix: string;
  tone: 'amber' | 'blue' | 'fuchsia' | 'pink' | 'red' | 'gray';
}) {
  const toneClass = {
    amber: 'bg-amber-50',
    blue: 'bg-blue-50',
    fuchsia: 'bg-fuchsia-50',
    pink: 'bg-pink-50',
    red: 'bg-red-50',
    gray: 'bg-gray-50',
  }[tone];

  return (
    <div className={cn('p-3 rounded-lg', toneClass)}>
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <p className="text-[11px] text-gray-600 font-medium">{label}</p>
      </div>
      <p className="text-[20px] font-bold text-black tabular-nums leading-none">
        {value.toLocaleString()}
        <span className="text-[12px] font-normal text-gray-500 ml-0.5">
          {suffix}
        </span>
      </p>
    </div>
  );
}

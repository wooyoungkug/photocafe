'use client';

import { Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDeliveryTracking } from '@/hooks/use-delivery-tracking';
import { toast } from '@/hooks/use-toast';

/** 택배사 코드 → 이름 매핑 (API 응답에 courierName이 없을 때 폴백) */
const COURIER_NAMES: Record<string, string> = {
  '01': '우체국택배',
  '04': 'CJ대한통운',
  '05': '한진택배',
  '06': '로젠택배',
  '08': '롯데택배',
  '11': '일양로지스',
  '23': '경동택배',
  '32': '합동택배',
  '88': '대신택배',
};

// 스마트택배 level → 단계 라벨
const TRACKING_STEPS = [
  { level: 1, label: '접수' },
  { level: 2, label: '집하' },
  { level: 3, label: '이동중' },
  { level: 5, label: '배달중' },
  { level: 6, label: '배달완료' },
];

function formatTrackingTime(when: string): string {
  // "2024/01/16 14:30:00" → "01.16 14:30"
  try {
    const match = when.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
    if (match) return `${match[2]}.${match[3]} ${match[4]}:${match[5]}`;
  } catch {
    // ignore
  }
  return when;
}

interface Props {
  courierCode: string;
  trackingNumber: string;
}

export function TrackingTimeline({ courierCode, trackingNumber }: Props) {
  const { data, isLoading, isError, error, refetch, isFetching } = useDeliveryTracking(
    courierCode,
    trackingNumber,
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingNumber).then(() => {
      toast({ title: '운송장 번호가 복사되었습니다.' });
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-10 bg-gray-100 rounded" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    const msg = (error as { message?: string })?.message;
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700 space-y-3">
        <div className="flex items-center justify-between">
          <span>{msg || '배송 정보를 불러올 수 없습니다.'}</span>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const currentLevel = data.level;

  return (
    <div className="space-y-4">
      {/* 헤더: 택배사 + 운송장 번호 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">{data.courierName || COURIER_NAMES[courierCode] || '택배사'}</span>
          <span className="text-gray-400 text-xs">{data.invoiceNo}</span>
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="운송장 번호 복사"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-3 w-3 mr-1', isFetching && 'animate-spin')} />
          새로고침
        </Button>
      </div>

      {/* 진행 단계 바 */}
      <div className="flex items-center justify-between gap-1">
        {TRACKING_STEPS.map((step, idx) => {
          const isActive = currentLevel >= step.level;
          const isCurrent = idx < TRACKING_STEPS.length - 1
            ? currentLevel >= step.level && currentLevel < TRACKING_STEPS[idx + 1].level
            : currentLevel >= step.level;

          return (
            <div key={step.level} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                    isActive
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white border-gray-300',
                    isCurrent && !data.isDelivered
                      ? 'ring-2 ring-blue-200 ring-offset-1'
                      : '',
                  )}
                >
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span
                  className={cn(
                    'text-[10px] whitespace-nowrap',
                    isActive ? 'text-blue-600 font-medium' : 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* 연결선 (마지막 제외) */}
              {idx < TRACKING_STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 -mt-4 mx-0.5',
                    currentLevel > step.level ? 'bg-blue-600' : 'bg-gray-200',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 상세 이력 목록 */}
      {data.details.length > 0 && (
        <div className="space-y-1.5">
          {[...data.details].reverse().map((detail, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-start gap-3 p-2.5 rounded-md text-sm',
                idx === 0 ? 'bg-blue-50' : 'bg-gray-50',
              )}
            >
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                  idx === 0 ? 'bg-blue-500' : 'bg-gray-300',
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'font-medium',
                      idx === 0 ? 'text-blue-700' : 'text-gray-700',
                    )}
                  >
                    {detail.status}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatTrackingTime(detail.time)}
                  </span>
                </div>
                {detail.location && (
                  <p className="text-xs text-gray-500 mt-0.5">{detail.location}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {data.details.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          아직 배송 이력이 없습니다.
        </p>
      )}
    </div>
  );
}

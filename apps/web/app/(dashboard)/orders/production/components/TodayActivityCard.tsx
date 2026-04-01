'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import type { ProcessDashboardData } from '@/hooks/use-statistics';

interface TodayActivityCardProps {
  data: ProcessDashboardData['todayActivity'] | undefined;
  isLoading: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending_receipt: '접수대기',
  receipt_completed: '접수완료',
  in_production: '생산진행',
  ready_for_shipping: '배송준비',
  shipped: '배송완료',
  cancelled: '취소',
  order_created: '주문생성',
  reception_waiting: '접수대기',
  reception_complete: '접수완료',
  print_waiting: '출력대기',
  post_processing: '후가공',
  binding: '제본',
  inspection: '검수',
  completed: '완료',
  shipping_waiting: '배송대기',
  shipping: '배송중',
  order_cancelled: '주문취소',
};

const STATUS_BADGE: Record<string, string> = {
  shipped: 'bg-teal-100 text-teal-700',
  ready_for_shipping: 'bg-emerald-100 text-emerald-700',
  in_production: 'bg-amber-100 text-amber-700',
  receipt_completed: 'bg-blue-100 text-blue-700',
  pending_receipt: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
  order_cancelled: 'bg-red-100 text-red-700',
};

export default function TodayActivityCard({ data, isLoading }: TodayActivityCardProps) {
  const entries = data
    ? Object.entries(data.byStatus).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" />
          <CardTitle className="text-[18px] font-bold text-black">오늘의 처리 현황</CardTitle>
          {!isLoading && data && (
            <span className="ml-auto text-[20px] font-bold text-blue-700">
              {data.total}
            </span>
          )}
        </div>
        <p className="text-[13px] text-gray-500">오늘 공정 변경된 건수</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[80px] flex items-center justify-center text-gray-400 text-[14px]">
            불러오는 중...
          </div>
        ) : entries.length === 0 ? (
          <div className="h-[80px] flex items-center justify-center text-gray-400 text-[14px]">
            오늘 처리된 내역이 없습니다
          </div>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {entries.map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-[13px]">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium ${
                    STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {STATUS_LABELS[status] ?? status}
                </span>
                <span className="font-bold text-black">{count}건</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import type { ProcessDashboardData } from '@/hooks/use-statistics';

interface UrgentOrdersCardProps {
  orders: ProcessDashboardData['urgentOrders'] | undefined;
  isLoading: boolean;
}

const PROCESS_LABELS: Record<string, string> = {
  receipt_pending: '접수대기',
  post_processing: '후가공',
  binding: '제본',
  inspection: '검수',
  completed: '완료',
  print_waiting: '출력대기',
  reception_waiting: '접수대기',
  reception_complete: '접수완료',
};

function getDaysDiff(dateStr: string | null) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function UrgentOrdersCard({ orders, isLoading }: UrgentOrdersCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <CardTitle className="text-[18px] font-bold text-black">긴급 주문</CardTitle>
          {!isLoading && orders && orders.length > 0 && (
            <span className="ml-auto text-[13px] font-medium text-red-600">
              {orders.length}건
            </span>
          )}
        </div>
        <p className="text-[13px] text-gray-500">납기일 기준 정렬</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[80px] flex items-center justify-center text-gray-400 text-[14px]">
            불러오는 중...
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="h-[80px] flex items-center justify-center text-gray-400 text-[14px]">
            긴급 주문이 없습니다
          </div>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {orders.map(order => {
              const diff = getDaysDiff(order.requestedDeliveryDate);
              const isOverdue = diff !== null && diff < 0;
              const isToday = diff === 0;
              const isTomorrow = diff === 1;

              return (
                <div
                  key={order.id}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-[13px] ${
                    isOverdue ? 'bg-red-50 border border-red-200' :
                    isToday || isTomorrow ? 'bg-amber-50 border border-amber-200' :
                    'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-medium text-blue-600 hover:underline truncate"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="text-gray-500 truncate">{order.clientName}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 ml-2 flex-shrink-0">
                    <span className={`font-medium ${isOverdue ? 'text-red-600' : isToday || isTomorrow ? 'text-amber-600' : 'text-gray-600'}`}>
                      {order.requestedDeliveryDate ? formatDate(order.requestedDeliveryDate) : '납기 미정'}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {PROCESS_LABELS[order.currentProcess ?? ''] ?? order.currentProcess ?? '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

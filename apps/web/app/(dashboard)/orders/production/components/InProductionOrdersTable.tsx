'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { Order } from '@/hooks/use-orders';

interface InProductionOrdersTableProps {
  data: { data: Order[]; total: number } | undefined;
  isLoading: boolean;
}

const PROCESS_LABELS: Record<string, string> = {
  receipt_pending: '접수대기',
  post_processing: '후가공',
  binding: '제본',
  inspection: '검수',
  completed: '완료',
  reception_waiting: '접수대기',
  reception_complete: '접수완료',
  print_waiting: '출력대기',
  shipping_waiting: '배송대기',
  shipping: '배송중',
  order_cancelled: '취소',
};

const PROCESS_BADGE_VARIANT: Record<string, string> = {
  receipt_pending: 'bg-slate-100 text-slate-700',
  post_processing: 'bg-blue-100 text-blue-700',
  binding: 'bg-violet-100 text-violet-700',
  inspection: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  print_waiting: 'bg-blue-100 text-blue-700',
  reception_waiting: 'bg-slate-100 text-slate-700',
  reception_complete: 'bg-blue-100 text-blue-700',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function isDeliveryUrgent(dateStr: string | undefined) {
  if (!dateStr) return false;
  const target = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);
  return target <= tomorrow;
}

export default function InProductionOrdersTable({ data, isLoading }: InProductionOrdersTableProps) {
  const orders = data?.data ?? [];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[18px] font-bold text-black">생산 진행 주문</CardTitle>
            <p className="text-[13px] text-gray-500">
              현재 생산진행 중인 주문 목록
              {data?.total != null && ` (총 ${data.total}건)`}
            </p>
          </div>
          <Link
            href="/orders?status=in_production"
            className="text-[13px] text-blue-600 hover:underline"
          >
            전체보기
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center text-gray-400 text-[14px]">
            불러오는 중...
          </div>
        ) : orders.length === 0 ? (
          <div className="h-[100px] flex items-center justify-center text-gray-400 text-[14px]">
            생산 진행 중인 주문이 없습니다
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-3 font-medium text-gray-500 whitespace-nowrap">주문번호</th>
                  <th className="text-left py-2 pr-3 font-medium text-gray-500 whitespace-nowrap">거래처</th>
                  <th className="text-left py-2 pr-3 font-medium text-gray-500 whitespace-nowrap">공정</th>
                  <th className="text-left py-2 pr-3 font-medium text-gray-500 whitespace-nowrap">납기일</th>
                  <th className="text-left py-2 font-medium text-gray-500 whitespace-nowrap">접수일</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const urgentDelivery = isDeliveryUrgent(order.requestedDeliveryDate);
                  const processLabel = PROCESS_LABELS[order.currentProcess] ?? order.currentProcess;
                  const processBadge = PROCESS_BADGE_VARIANT[order.currentProcess] ?? 'bg-gray-100 text-gray-700';

                  return (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline font-medium">
                          {order.orderNumber}
                        </Link>
                        {order.isUrgent && (
                          <AlertTriangle className="inline h-3.5 w-3.5 text-red-500 ml-1" />
                        )}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap max-w-[100px] truncate">
                        {order.client.clientName}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${processBadge}`}>
                          {processLabel}
                        </span>
                      </td>
                      <td className={`py-2 pr-3 whitespace-nowrap ${urgentDelivery ? 'text-red-600 font-medium' : ''}`}>
                        {order.requestedDeliveryDate ? formatDate(order.requestedDeliveryDate) : '—'}
                      </td>
                      <td className="py-2 whitespace-nowrap text-gray-500">
                        {formatDate(order.orderedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

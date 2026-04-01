'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProcessDashboard } from '@/hooks/use-statistics';
import { useOrders } from '@/hooks/use-orders';
import ProcessStatusKPI from './components/ProcessStatusKPI';
import ProcessFunnelChart from './components/ProcessFunnelChart';
import InProductionOrdersTable from './components/InProductionOrdersTable';
import UrgentOrdersCard from './components/UrgentOrdersCard';
import TodayActivityCard from './components/TodayActivityCard';

export default function ProductionDashboardPage() {
  const { data, isPending, refetch, isFetching } = useProcessDashboard();

  const { data: ordersData, isPending: ordersLoading } = useOrders({
    status: 'in_production',
    limit: 20,
    page: 1,
  });

  const tableData = ordersData
    ? { data: ordersData.data, total: ordersData.meta.total }
    : undefined;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] text-black font-normal">공정 현황 대시보드</h1>
          <p className="text-[14px] text-gray-500 mt-0.5">실시간 생산 공정 현황 · 30초 자동 갱신</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* Row 1: ORDER_STATUS 6단계 KPI 카드 */}
      <ProcessStatusKPI data={data?.statusCounts} isLoading={isPending} />

      {/* Row 2: 오늘의 처리 현황 + 긴급 주문 */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <TodayActivityCard data={data?.todayActivity} isLoading={isPending} />
        <UrgentOrdersCard orders={data?.urgentOrders} isLoading={isPending} />
      </div>

      {/* Row 3: 공정 단계 분포 + 생산 진행 주문 목록 */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <ProcessFunnelChart data={data?.processCounts} isLoading={isPending} />
        </div>
        <div className="lg:col-span-3">
          <InProductionOrdersTable data={tableData} isLoading={ordersLoading} />
        </div>
      </div>
    </div>
  );
}

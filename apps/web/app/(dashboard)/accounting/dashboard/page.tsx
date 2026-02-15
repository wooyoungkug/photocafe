'use client';

import { useReceivablesDashboard } from '@/hooks/use-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ReceivablesKPI from './components/ReceivablesKPI';
import TopClientsChart from './components/TopClientsChart';
import MonthlyCollectionChart from './components/MonthlyCollectionChart';

export default function AccountingDashboardPage() {
  const { data, isLoading } = useReceivablesDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">회계 대시보드</h1>
          <p className="text-muted-foreground">미입금 현황을 한눈에 확인하세요.</p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">회계 대시보드</h1>
        <p className="text-muted-foreground">미입금 현황을 한눈에 확인하세요.</p>
      </div>

      {/* KPI 카드 */}
      <ReceivablesKPI data={data} />

      {/* 차트 */}
      <div className="grid grid-cols-2 gap-6">
        <TopClientsChart data={data.topClients} />
        <MonthlyCollectionChart data={data.monthlyCollection} />
      </div>

      {/* Aging 분석 */}
      <Card>
        <CardHeader>
          <CardTitle>Aging 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">30일 이내</p>
              <p className="text-2xl font-bold text-blue-600">
                {data.aging.under30.toLocaleString()}원
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">31~60일</p>
              <p className="text-2xl font-bold text-yellow-600">
                {data.aging.days30to60.toLocaleString()}원
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">61~90일</p>
              <p className="text-2xl font-bold text-orange-600">
                {data.aging.days60to90.toLocaleString()}원
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">90일 초과</p>
              <p className="text-2xl font-bold text-red-600">
                {data.aging.over90.toLocaleString()}원
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

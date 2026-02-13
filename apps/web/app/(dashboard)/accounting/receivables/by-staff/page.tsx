'use client';

import { useState } from 'react';
import { format, subMonths } from 'date-fns';
import { Users, TrendingUp, DollarSign, BarChart3, Building2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSummaryByStaff, useCollectionByStaff } from '@/hooks/use-receivables-by-staff';
import StaffSummaryTable from './components/staff-summary-table';
import CollectionByStaffChart from './components/collection-by-staff-chart';

export default function ReceivablesByStaffPage() {
  const [dateRange, setDateRange] = useState({
    startDate: format(subMonths(new Date(), 12), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: staffSummary, isLoading: isLoadingSummary } = useSummaryByStaff(dateRange);
  const { data: collectionData, isLoading: isLoadingCollection } = useCollectionByStaff(dateRange);

  // 전체 합계 계산
  const totals = staffSummary?.reduce(
    (acc, staff) => ({
      totalSales: acc.totalSales + staff.totalSales,
      totalReceived: acc.totalReceived + staff.totalReceived,
      outstanding: acc.outstanding + staff.outstanding,
      clientCount: acc.clientCount + staff.clientCount,
    }),
    { totalSales: 0, totalReceived: 0, outstanding: 0, clientCount: 0 }
  ) || { totalSales: 0, totalReceived: 0, outstanding: 0, clientCount: 0 };

  const overallCollectionRate = totals.totalSales > 0
    ? Math.round((totals.totalReceived / totals.totalSales) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">영업담당자별 미수금 현황</h1>
          <p className="text-muted-foreground">영업담당자별 매출 및 수금 실적을 관리합니다.</p>
        </div>
        <Link href="/accounting/receivables">
          <Button variant="outline">
            <Building2 className="h-4 w-4 mr-2" />
            거래처별 보기
          </Button>
        </Link>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">총 매출</p>
                <p className="text-2xl font-bold text-blue-900">
                  {totals.totalSales.toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">총 수금</p>
                <p className="text-2xl font-bold text-green-900">
                  {totals.totalReceived.toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-green-500 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-2 text-xs text-green-600">
              수금률 {overallCollectionRate}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">총 미수금</p>
                <p className="text-2xl font-bold text-orange-900">
                  {totals.outstanding.toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">담당 고객</p>
                <p className="text-2xl font-bold text-purple-900">
                  {totals.clientCount.toLocaleString()}개
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">영업담당자별 요약</TabsTrigger>
          <TabsTrigger value="collection">수금 실적</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <StaffSummaryTable
            data={staffSummary || []}
            isLoading={isLoadingSummary}
            dateRange={dateRange}
          />
        </TabsContent>

        <TabsContent value="collection" className="space-y-4">
          <CollectionByStaffChart
            data={collectionData || []}
            isLoading={isLoadingCollection}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

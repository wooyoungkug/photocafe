'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Calendar,
  Building,
  TrendingUp,
  Loader2,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  useDailySummary,
  useMonthlySummary,
  useDepositDetails,
  getDatePresets,
  getPaymentMethodLabel,
} from '@/hooks/use-deposits';
import { toast } from '@/hooks/use-toast';

type ViewMode = 'daily' | 'monthly';

export default function DepositsPage() {
  const presets = getDatePresets();

  // 상태 관리
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [filterMode, setFilterMode] = useState<'today' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState(presets.today.startDate);
  const [endDate, setEndDate] = useState(presets.today.endDate);
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [detailParams, setDetailParams] = useState<{ date: string; clientId: string } | null>(null);

  // 일자별 합계 조회
  const { data: dailyData, isLoading: isDailyLoading } = useDailySummary({
    startDate,
    endDate,
    paymentMethod: paymentMethod === 'all' ? undefined : paymentMethod,
  });

  // 월별 합계 조회
  const currentYear = format(new Date(), 'yyyy');
  const { data: monthlyData, isLoading: isMonthlyLoading } = useMonthlySummary({
    year: currentYear,
  });

  // 드릴다운 건별 조회 (detailParams가 설정되면 자동 활성화)
  const { data: detailData, isFetching: isDetailFetching } =
    useDepositDetails({
      startDate: detailParams?.date || '',
      endDate: detailParams?.date || '',
      clientId: detailParams?.clientId,
    });

  const currentData = viewMode === 'daily' ? dailyData : monthlyData;
  const isLoading = viewMode === 'daily' ? isDailyLoading : isMonthlyLoading;

  // 빠른 필터 핸들러
  const handleQuickFilter = (mode: 'today' | 'month' | 'custom') => {
    setFilterMode(mode);
    if (mode === 'today') {
      setStartDate(presets.today.startDate);
      setEndDate(presets.today.endDate);
    } else if (mode === 'month') {
      setStartDate(presets.thisMonth.startDate);
      setEndDate(presets.thisMonth.endDate);
    }
    setExpandedRow(null);
    setDetailParams(null);
  };

  // 행 클릭 핸들러 (드릴다운)
  const handleRowClick = (date: string, clientId: string) => {
    const rowKey = `${date}-${clientId}`;

    if (expandedRow === rowKey) {
      setExpandedRow(null);
      setDetailParams(null);
      return;
    }

    setExpandedRow(rowKey);
    setDetailParams({ date, clientId });
  };

  // CSV 다운로드 핸들러
  const handleExportCSV = () => {
    if (!dailyData?.data?.length) {
      toast({
        title: '다운로드할 데이터가 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['입금일자', '거래처명', '입금건수', '입금합계액', '주문합계액'];

    const rows = dailyData.data.map((d) => [
      d.date,
      d.clientName,
      d.count.toString(),
      Math.round(d.totalDepositAmount).toString(),
      Math.round(d.totalOrderAmount).toString(),
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `입금내역_일자별_${format(new Date(), 'yyyyMMdd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'CSV 파일이 다운로드되었습니다.',
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">입금내역 조회</h1>
          <p className="text-muted-foreground">
            거래처별 입금 합계 및 상세 내역을 조회합니다.
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          CSV 다운로드
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 거래처 수 */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">거래처 수</p>
                <p className="text-2xl font-bold text-blue-900">
                  {currentData?.summary?.totalClients || 0}개
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Building className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 총 입금액 */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">총 입금액</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {Math.round(
                    currentData?.summary?.totalDepositAmount || 0
                  ).toLocaleString()}
                  원
                </p>
              </div>
              <div className="h-12 w-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                <Receipt className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 총 건수 */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">총 건수</p>
                <p className="text-2xl font-bold text-purple-900">
                  {currentData?.summary?.totalCount || 0}건
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 일평균 입금액 */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">
                  일평균 입금액
                </p>
                <p className="text-2xl font-bold text-orange-900">
                  {viewMode === 'daily'
                    ? Math.round(
                        dailyData?.summary?.averagePerDay || 0
                      ).toLocaleString()
                    : '-'}
                  {viewMode === 'daily' && '원'}
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="daily">일자별 합계</TabsTrigger>
                <TabsTrigger value="monthly">월별 합계</TabsTrigger>
              </TabsList>
            </div>

            {/* 필터 영역 */}
            <div className="space-y-4 mb-6">
              {/* Quick Presets */}
              <div className="flex gap-2">
                <Button
                  variant={filterMode === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('today')}
                >
                  금일
                </Button>
                <Button
                  variant={filterMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('month')}
                >
                  당월
                </Button>
                <Button
                  variant={filterMode === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickFilter('custom')}
                >
                  기간설정
                </Button>
              </div>

              {/* Date Range Inputs */}
              {filterMode === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>시작일</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setExpandedRow(null);
                        setDetailParams(null);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>종료일</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setExpandedRow(null);
                        setDetailParams(null);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>결제방법</Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(value) => {
                        setPaymentMethod(value);
                        setExpandedRow(null);
                        setDetailParams(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="cash">현금</SelectItem>
                        <SelectItem value="bank_transfer">계좌이체</SelectItem>
                        <SelectItem value="card">카드</SelectItem>
                        <SelectItem value="other">기타</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* 일자별 뷰 */}
            <TabsContent value="daily" className="mt-0">
              {isDailyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>입금일자</TableHead>
                        <TableHead>거래처명</TableHead>
                        <TableHead className="text-right">입금건수</TableHead>
                        <TableHead className="text-right">입금합계액</TableHead>
                        <TableHead className="text-right">주문합계액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!dailyData?.data?.length ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-12 text-muted-foreground"
                          >
                            입금 내역이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        dailyData.data.map((row) => {
                          const rowKey = `${row.date}-${row.clientId}`;
                          const isExpanded = expandedRow === rowKey;

                          return (
                            <Collapsible key={rowKey} open={isExpanded} asChild>
                              <>
                                {/* 합계 행 */}
                                <TableRow
                                  className="cursor-pointer hover:bg-slate-100"
                                  onClick={() =>
                                    handleRowClick(row.date, row.clientId)
                                  }
                                >
                                  <TableCell>
                                    <CollapsibleTrigger asChild>
                                      <div>
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                      </div>
                                    </CollapsibleTrigger>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {row.date}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {row.clientName}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">
                                    {row.count}건
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-emerald-600">
                                    {Math.round(
                                      row.totalDepositAmount
                                    ).toLocaleString()}
                                    원
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                                    {Math.round(
                                      row.totalOrderAmount
                                    ).toLocaleString()}
                                    원
                                  </TableCell>
                                </TableRow>

                                {/* 드릴다운: 건별 상세 */}
                                <CollapsibleContent asChild>
                                  <TableRow>
                                    <TableCell
                                      colSpan={6}
                                      className="bg-slate-50 p-0"
                                    >
                                      <div className="p-4">
                                        <h4 className="text-sm font-semibold mb-3">
                                          건별 상세 내역 ({row.date} /{' '}
                                          {row.clientName})
                                        </h4>
                                        {isDetailFetching ? (
                                          <div className="flex items-center justify-center py-4">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                          </div>
                                        ) : (
                                          <div className="overflow-x-auto">
                                            <Table className="text-sm">
                                              <TableHeader>
                                                <TableRow>
                                                  <TableHead>수금번호</TableHead>
                                                  <TableHead>주문번호</TableHead>
                                                  <TableHead className="text-right">주문금액</TableHead>
                                                  <TableHead className="text-right">결제금액</TableHead>
                                                  <TableHead className="text-right">미수금</TableHead>
                                                  <TableHead>결제방법</TableHead>
                                                  <TableHead>상태</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {detailData?.data?.map((detail) => (
                                                    <TableRow key={detail.id}>
                                                      <TableCell className="font-mono">
                                                        {detail.receiptNumber}
                                                      </TableCell>
                                                      <TableCell>
                                                        {detail.orderNumber}
                                                      </TableCell>
                                                      <TableCell className="text-right">
                                                        {Math.round(
                                                          detail.orderAmount
                                                        ).toLocaleString()}
                                                        원
                                                      </TableCell>
                                                      <TableCell className="text-right text-emerald-600 font-bold">
                                                        {Math.round(
                                                          detail.depositAmount
                                                        ).toLocaleString()}
                                                        원
                                                      </TableCell>
                                                      <TableCell className="text-right text-red-500 font-bold">
                                                        {detail.outstandingAmount > 0
                                                          ? Math.round(
                                                              detail.outstandingAmount
                                                            ).toLocaleString() + '원'
                                                          : '-'}
                                                      </TableCell>
                                                      <TableCell>
                                                        {getPaymentMethodLabel(
                                                          detail.paymentMethod
                                                        )}
                                                      </TableCell>
                                                      <TableCell>
                                                        <span
                                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            detail.paymentStatus === 'paid'
                                                              ? 'bg-green-100 text-green-700'
                                                              : detail.paymentStatus === 'partial'
                                                              ? 'bg-yellow-100 text-yellow-700'
                                                              : 'bg-red-100 text-red-700'
                                                          }`}
                                                        >
                                                          {detail.paymentStatus === 'paid'
                                                            ? '완납'
                                                            : detail.paymentStatus === 'partial'
                                                            ? '부분'
                                                            : '미수'}
                                                        </span>
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
                                              </TableBody>
                                            </Table>
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                </CollapsibleContent>
                              </>
                            </Collapsible>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* 월별 뷰 */}
            <TabsContent value="monthly" className="mt-0">
              {isMonthlyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>년월</TableHead>
                        <TableHead>거래처명</TableHead>
                        <TableHead className="text-right">입금건수</TableHead>
                        <TableHead className="text-right">입금합계액</TableHead>
                        <TableHead className="text-right">주문합계액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!monthlyData?.data?.length ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center py-12 text-muted-foreground"
                          >
                            입금 내역이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        monthlyData.data.map((row) => (
                          <TableRow
                            key={`${row.month}-${row.clientId}`}
                            className="hover:bg-slate-50"
                          >
                            <TableCell className="font-mono text-sm">
                              {row.month}
                            </TableCell>
                            <TableCell className="font-medium">
                              {row.clientName}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {row.count}건
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">
                              {Math.round(
                                row.totalDepositAmount
                              ).toLocaleString()}
                              원
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {Math.round(
                                row.totalOrderAmount
                              ).toLocaleString()}
                              원
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

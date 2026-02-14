'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Download, Receipt, Calendar, Building, Loader2 } from 'lucide-react';
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
import { useDeposits, getDatePresets, getPaymentMethodLabel } from '@/hooks/use-deposits';
import { toast } from '@/hooks/use-toast';

export default function DepositsPage() {
  const presets = getDatePresets();

  // 상태 관리
  const [filterMode, setFilterMode] = useState<'today' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState(presets.thisMonth.startDate);
  const [endDate, setEndDate] = useState(presets.thisMonth.endDate);
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [page, setPage] = useState(1);

  // 데이터 조회
  const { data, isLoading } = useDeposits({
    startDate,
    endDate,
    paymentMethod: paymentMethod === 'all' ? undefined : paymentMethod,
    page,
    limit: 50,
  });

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
    setPage(1);
  };

  // CSV 다운로드 핸들러
  const handleExportCSV = () => {
    if (!data?.data?.length) {
      toast({
        title: '다운로드할 데이터가 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    const headers = [
      '수금번호',
      '수금일',
      '거래처명',
      '금액',
      '결제방법',
      '입금은행',
      '입금자',
      '비고',
    ];

    const rows = data.data.map((d) => [
      d.receiptNumber,
      format(new Date(d.receiptDate), 'yyyy-MM-dd'),
      d.salesLedger.clientName,
      d.amount.toString(),
      getPaymentMethodLabel(d.paymentMethod),
      d.bankName || '',
      d.depositorName || '',
      d.note || '',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `입금내역_${format(new Date(), 'yyyyMMdd')}.csv`;
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
          <p className="text-muted-foreground">거래처 입금 내역을 조회합니다.</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          CSV 다운로드
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 금일 입금액 */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">금일 입금액</p>
                <p className="text-2xl font-bold text-blue-900">
                  {filterMode === 'today' && data?.summary?.totalAmount
                    ? Math.round(data.summary.totalAmount).toLocaleString()
                    : '0'}
                  원
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Receipt className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 당월 입금액 */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">당월 입금액</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {filterMode === 'month' && data?.summary?.totalAmount
                    ? Math.round(data.summary.totalAmount).toLocaleString()
                    : '0'}
                  원
                </p>
              </div>
              <div className="h-12 w-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 총 입금건수 */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">총 입금건수</p>
                <p className="text-2xl font-bold text-purple-900">
                  {data?.summary?.totalCount || 0}건
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Building className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Quick Presets */}
            <div className="flex gap-2">
              <Button
                variant={filterMode === 'today' ? 'default' : 'outline'}
                onClick={() => handleQuickFilter('today')}
              >
                금일
              </Button>
              <Button
                variant={filterMode === 'month' ? 'default' : 'outline'}
                onClick={() => handleQuickFilter('month')}
              >
                당월
              </Button>
              <Button
                variant={filterMode === 'custom' ? 'default' : 'outline'}
                onClick={() => handleQuickFilter('custom')}
              >
                기간설정
              </Button>
            </div>

            {/* Date Range Inputs */}
            {filterMode === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>시작일</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
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
                      setPage(1);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Payment Method Filter */}
            <div className="w-full sm:w-[200px]">
              <Label>결제방법</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => {
                  setPaymentMethod(value);
                  setPage(1);
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
                  <SelectItem value="check">수표</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>입금 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>수금번호</TableHead>
                      <TableHead>수금일</TableHead>
                      <TableHead>거래처명</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead>결제방법</TableHead>
                      <TableHead>입금은행</TableHead>
                      <TableHead>입금자</TableHead>
                      <TableHead>비고</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!data?.data?.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-12 text-muted-foreground"
                        >
                          입금 내역이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.data.map((deposit) => (
                        <TableRow
                          key={deposit.id}
                          className="hover:bg-slate-50"
                        >
                          <TableCell className="font-mono text-sm">
                            {deposit.receiptNumber}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {format(
                              new Date(deposit.receiptDate),
                              'yyyy-MM-dd'
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {deposit.salesLedger.clientName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {deposit.salesLedger.ledgerNumber}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">
                            {Math.round(deposit.amount).toLocaleString()}원
                          </TableCell>
                          <TableCell>
                            {getPaymentMethodLabel(deposit.paymentMethod)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {deposit.bankName || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {deposit.depositorName || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {deposit.note || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data && data.meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    이전
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {data.meta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === data.meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    다음
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

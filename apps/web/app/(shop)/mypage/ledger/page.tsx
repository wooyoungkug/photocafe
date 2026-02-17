'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth-store';
import { useSalesLedgers, useCarryOverBalance } from '@/hooks/use-sales-ledger';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { PaymentStatus } from '@/lib/types/sales-ledger';

export default function LedgerPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<'all' | PaymentStatus>('all');

  const startDate = startOfMonth(selectedDate);
  const endDate = endOfMonth(selectedDate);

  // 거래대장 조회
  const { data: ledgerData, isLoading } = useSalesLedgers({
    clientId: user?.id,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    ...(filterStatus !== 'all' && { paymentStatus: filterStatus }),
  });

  // 전월이월 잔액 조회
  const { data: carryOver } = useCarryOverBalance({
    clientId: user?.id,
    beforeDate: format(startDate, 'yyyy-MM-dd'),
  });

  const ledgers = ledgerData?.data || [];
  const carryOverBalance = carryOver?.balance || 0;

  // 날짜 오름차순 정렬 (누계 잔액 계산용)
  const sortedLedgersAsc = useMemo(() => {
    return [...ledgers].sort(
      (a, b) => new Date(a.ledgerDate).getTime() - new Date(b.ledgerDate).getTime(),
    );
  }, [ledgers]);

  // 누계 잔액 계산 (오름차순으로 계산 후 최신순으로 표시)
  const ledgersWithRunningBalance = useMemo(() => {
    let runningBalance = carryOverBalance;
    const withBalance = sortedLedgersAsc.map((ledger) => {
      const debit = Number(ledger.totalAmount);
      const credit = Number(ledger.receivedAmount);
      runningBalance = runningBalance + debit - credit;
      return { ...ledger, runningBalance };
    });
    return withBalance;
  }, [sortedLedgersAsc, carryOverBalance]);

  // 당월 합계
  const monthDebit = ledgers.reduce((sum, l) => sum + Number(l.totalAmount), 0);
  const monthCredit = ledgers.reduce((sum, l) => sum + Number(l.receivedAmount), 0);
  const finalBalance = ledgersWithRunningBalance.length > 0
    ? ledgersWithRunningBalance[ledgersWithRunningBalance.length - 1].runningBalance
    : carryOverBalance;

  const handlePrevMonth = () => setSelectedDate(subMonths(selectedDate, 1));
  const handleNextMonth = () => setSelectedDate(addMonths(selectedDate, 1));
  const handleToday = () => setSelectedDate(new Date());

  const handleExport = () => {
    alert('CSV 다운로드 기능은 추후 구현 예정입니다.');
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return <Badge variant="outline" className="text-green-700 border-green-700">완납</Badge>;
      case 'partial':
        return <Badge variant="outline" className="text-yellow-700 border-yellow-700">부분결제</Badge>;
      case 'unpaid':
        return <Badge variant="outline" className="text-orange-700 border-orange-700">미결제</Badge>;
      case 'overdue':
        return <Badge variant="outline" className="text-red-700 border-red-700">연체</Badge>;
      default:
        return null;
    }
  };

  const getBindingTypeLabel = (bindingType: string | undefined) => {
    if (!bindingType) return '-';
    const typeMap: Record<string, string> = {
      'wireless': '무선제본',
      'hardcover': '하드커버',
      'perfect': '양장제본',
      'saddle': '중철제본',
      'spiral': '스프링제본',
      'ring': '링제본',
    };
    const label = typeMap[bindingType] || bindingType;
    return label.split(' (')[0].split(' - ')[0];
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">로그인이 필요합니다.</p>
            <Link href="/auth/login">
              <Button className="mt-4">로그인하기</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-xl">
                  {format(selectedDate, 'yyyy년 MM월', { locale: ko })}
                </h2>
              </div>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleToday}>
                이번 달
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                내보내기
              </Button>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="unpaid">미결제</SelectItem>
                <SelectItem value="partial">부분결제</SelectItem>
                <SelectItem value="paid">완납</SelectItem>
                <SelectItem value="overdue">연체</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500 mb-1">전월이월</p>
            <p className="text-2xl">{carryOverBalance.toLocaleString()}원</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500 mb-1">당월 매출</p>
            <p className="text-2xl">{monthDebit.toLocaleString()}원</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500 mb-1">당월 입금</p>
            <p className="text-2xl">{monthCredit.toLocaleString()}원</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-red-500 mb-1">현재 잔액</p>
            <p className="text-2xl text-red-600 font-semibold">
              {finalBalance.toLocaleString()}원
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            거래 원장
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded"></div>
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] text-center">날짜</TableHead>
                    <TableHead className="text-center">내역</TableHead>
                    <TableHead className="w-[80px] text-center">제본</TableHead>
                    <TableHead className="w-[80px] text-center">상태</TableHead>
                    <TableHead className="w-[120px] text-right">매출</TableHead>
                    <TableHead className="w-[120px] text-right">입금</TableHead>
                    <TableHead className="w-[130px] text-right">잔액</TableHead>
                    <TableHead className="w-[50px] text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* 거래 내역 (최신순) */}
                  {[...ledgersWithRunningBalance].reverse().map((ledger) => (
                    <TableRow key={ledger.id}>
                      <TableCell className="text-sm text-center">
                        {format(new Date(ledger.ledgerDate), 'yy-MM-dd', { locale: ko })}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{ledger.description || `${ledger.orderNumber} 주문`}</div>
                        <div className="text-xs text-gray-400">{ledger.orderNumber}</div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 text-center">
                        {getBindingTypeLabel(ledger.order?.items?.[0]?.bindingType)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(ledger.paymentStatus)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {Number(ledger.totalAmount).toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {Number(ledger.receivedAmount) > 0
                          ? `${Number(ledger.receivedAmount).toLocaleString()}원`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {ledger.runningBalance.toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/mypage/orders/${ledger.orderId}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* 전월이월 행 */}
                  <TableRow className="bg-blue-50/50">
                    <TableCell className="text-sm text-center text-gray-500">-</TableCell>
                    <TableCell className="text-sm font-medium text-blue-700">
                      전월이월
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-semibold text-blue-700">
                      {carryOverBalance.toLocaleString()}원
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                  {ledgersWithRunningBalance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-gray-400">
                        {format(selectedDate, 'yyyy년 MM월', { locale: ko })}에는 거래 내역이 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell className="text-center">합계</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">
                      {monthDebit.toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right">
                      {monthCredit.toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {finalBalance.toLocaleString()}원
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

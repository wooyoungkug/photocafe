'use client';

import { useState } from 'react';
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
import { useSalesLedgers } from '@/hooks/use-sales-ledger';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { PaymentStatus } from '@/lib/types/sales-ledger';

export default function LedgerPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<'all' | PaymentStatus>('all');

  const startDate = startOfMonth(selectedDate);
  const endDate = endOfMonth(selectedDate);

  // 거래대장 조회 - useSalesLedgers 훅 사용
  const { data: ledgerData, isLoading } = useSalesLedgers({
    clientId: user?.id,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    ...(filterStatus !== 'all' && { paymentStatus: filterStatus }),
  });

  const ledgers = ledgerData?.data || [];

  // 합계 계산
  const totalDebit = ledgers.reduce((sum, ledger) => sum + Number(ledger.totalAmount), 0);
  const totalCredit = ledgers.reduce((sum, ledger) => sum + Number(ledger.receivedAmount), 0);
  const totalBalance = ledgers.reduce((sum, ledger) => sum + Number(ledger.outstandingAmount), 0);

  const handlePrevMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleExport = () => {
    // CSV 다운로드 로직 (추후 구현)
    alert('CSV 다운로드 기능은 추후 구현 예정입니다.');
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-700">완납</Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-yellow-100 text-yellow-700">부분결제</Badge>
        );
      case 'unpaid':
        return (
          <Badge className="bg-orange-100 text-orange-700">미결제</Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-red-100 text-red-700">연체</Badge>
        );
      default:
        return null;
    }
  };

  const getSalesTypeLabel = (salesType: string) => {
    const typeMap: Record<string, string> = {
      ALBUM: '앨범',
      PRINT: '출력',
      FRAME: '액자',
      GOODS: '굿즈',
      BINDING: '제본',
      DESIGN: '디자인',
      SHIPPING: '배송',
      OTHER: '기타',
    };
    return typeMap[salesType] || salesType;
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
                <h2 className="text-xl font-bold">
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
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 mb-1">총 구매금액</p>
            <p className="text-2xl font-bold text-primary">
              {totalDebit.toLocaleString()}원
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 mb-1">총 결제금액</p>
            <p className="text-2xl font-bold text-green-600">
              {totalCredit.toLocaleString()}원
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 mb-1">미결제금액</p>
            <p className="text-2xl font-bold text-orange-600">
              {totalBalance.toLocaleString()}원
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            거래 내역
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded"></div>
              ))}
            </div>
          ) : ledgers.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">날짜</TableHead>
                    <TableHead className="w-[120px]">주문번호</TableHead>
                    <TableHead>내역</TableHead>
                    <TableHead className="w-[80px]">분류</TableHead>
                    <TableHead className="w-[120px] text-right">구매금액</TableHead>
                    <TableHead className="w-[120px] text-right">결제금액</TableHead>
                    <TableHead className="w-[120px] text-right">미결제금액</TableHead>
                    <TableHead className="w-[100px] text-center">상태</TableHead>
                    <TableHead className="w-[80px] text-center">상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgers.map((ledger) => (
                    <TableRow key={ledger.id}>
                      <TableCell className="text-sm">
                        {format(new Date(ledger.ledgerDate), 'MM-dd', { locale: ko })}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {ledger.orderNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ledger.description || `${ledger.orderNumber} 주문`}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {getSalesTypeLabel(ledger.salesType)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {Number(ledger.totalAmount).toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {Number(ledger.receivedAmount) > 0
                          ? `${Number(ledger.receivedAmount).toLocaleString()}원`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {Number(ledger.outstandingAmount).toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(ledger.paymentStatus)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/mypage/orders/${ledger.orderId}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell colSpan={4}>합계</TableCell>
                    <TableCell className="text-right text-primary">
                      {totalDebit.toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {totalCredit.toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {totalBalance.toLocaleString()}원
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <BookOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                거래 내역이 없습니다
              </h3>
              <p className="text-gray-500">
                {format(selectedDate, 'yyyy년 MM월', { locale: ko })}에는 거래 내역이 없습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';

interface LedgerEntry {
  id: string;
  date: string;
  orderNumber: string;
  orderId: string;
  description: string;
  debit: number; // 차변 (매출)
  credit: number; // 대변 (입금)
  balance: number; // 잔액
  status: 'pending' | 'paid' | 'partial';
  category?: string;
}

export default function LedgerPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'partial'>('all');

  const startDate = startOfMonth(selectedDate);
  const endDate = endOfMonth(selectedDate);

  // 거래대장 조회
  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ['ledger', user?.id, format(selectedDate, 'yyyy-MM'), filterStatus],
    queryFn: async () => {
      const response = await api.get<{ data: LedgerEntry[]; summary: any }>('/ledger', {
        clientId: user?.id || '',
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        ...(filterStatus !== 'all' && { status: filterStatus }),
      });
      return response;
    },
    enabled: isAuthenticated && !!user?.id,
  });

  const entries = ledgerData?.data || [];
  const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);
  const totalBalance = totalDebit - totalCredit;

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-700">완납</Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-yellow-100 text-yellow-700">부분입금</Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-orange-100 text-orange-700">미입금</Badge>
        );
      default:
        return null;
    }
  };

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
                <SelectItem value="pending">미입금</SelectItem>
                <SelectItem value="partial">부분입금</SelectItem>
                <SelectItem value="paid">완납</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 mb-1">총 매출</p>
            <p className="text-2xl font-bold text-primary">
              {totalDebit.toLocaleString()}원
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 mb-1">총 입금</p>
            <p className="text-2xl font-bold text-green-600">
              {totalCredit.toLocaleString()}원
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 mb-1">미수금</p>
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
          ) : entries.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">날짜</TableHead>
                    <TableHead className="w-[120px]">주문번호</TableHead>
                    <TableHead>내역</TableHead>
                    <TableHead className="w-[80px]">분류</TableHead>
                    <TableHead className="w-[120px] text-right">매출</TableHead>
                    <TableHead className="w-[120px] text-right">입금</TableHead>
                    <TableHead className="w-[120px] text-right">잔액</TableHead>
                    <TableHead className="w-[100px] text-center">상태</TableHead>
                    <TableHead className="w-[80px] text-center">상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">
                        {format(new Date(entry.date), 'MM-dd', { locale: ko })}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {entry.orderNumber}
                      </TableCell>
                      <TableCell className="text-sm">{entry.description}</TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {entry.category || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {entry.debit > 0 ? `${entry.debit.toLocaleString()}원` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {entry.credit > 0 ? `${entry.credit.toLocaleString()}원` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {entry.balance.toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(entry.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/mypage/orders/${entry.orderId}`}>
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

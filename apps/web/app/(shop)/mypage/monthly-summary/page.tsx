'use client';

import { useState } from 'react';
import { Calendar, TrendingUp, Package, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MonthlySummary {
  year: number;
  month: number;
  orderCount: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  categoryBreakdown?: {
    category: string;
    count: number;
    amount: number;
  }[];
}

export default function MonthlySummaryPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const startDate = startOfMonth(selectedDate);
  const endDate = endOfMonth(selectedDate);

  // 월별 집계 조회
  const { data: summary, isLoading } = useQuery({
    queryKey: ['monthly-summary', user?.id, format(selectedDate, 'yyyy-MM')],
    queryFn: async () => {
      const response = await api.get<{ data: MonthlySummary }>('/orders/monthly-summary', {
        clientId: user?.id || '',
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      });
      return response.data;
    },
    enabled: isAuthenticated && !!user?.id,
  });

  const handlePrevMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">
                {format(selectedDate, 'yyyy년 MM월', { locale: ko })}
              </h2>
            </div>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-center mt-3">
            <Button variant="ghost" size="sm" onClick={handleToday}>
              이번 달
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">총 주문</p>
                  <p className="text-2xl font-bold">{summary?.orderCount || 0}건</p>
                </div>
                <Package className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">총 주문금액</p>
                  <p className="text-2xl font-bold text-primary">
                    {(summary?.totalAmount || 0).toLocaleString()}원
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">입금완료</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(summary?.paidAmount || 0).toLocaleString()}원
                  </p>
                </div>
                <DollarSign className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">미수금</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {(summary?.unpaidAmount || 0).toLocaleString()}원
                  </p>
                </div>
                <DollarSign className="h-10 w-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Breakdown */}
      {summary?.categoryBreakdown && summary.categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>카테고리별 집계</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>카테고리</TableHead>
                    <TableHead className="text-center">주문 수</TableHead>
                    <TableHead className="text-right">주문 금액</TableHead>
                    <TableHead className="text-right">비율</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.categoryBreakdown.map((item, index) => {
                    const percentage =
                      summary.totalAmount > 0
                        ? ((item.amount / summary.totalAmount) * 100).toFixed(1)
                        : 0;
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.category}</TableCell>
                        <TableCell className="text-center">{item.count || 0}건</TableCell>
                        <TableCell className="text-right">
                          {(item.amount || 0).toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          {percentage}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell>합계</TableCell>
                    <TableCell className="text-center">{summary.orderCount || 0}건</TableCell>
                    <TableCell className="text-right">
                      {(summary.totalAmount || 0).toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && (!summary || summary.orderCount === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              해당 월에 거래 내역이 없습니다
            </h3>
            <p className="text-gray-500">
              {format(selectedDate, 'yyyy년 MM월', { locale: ko })}에는 주문 내역이 없습니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

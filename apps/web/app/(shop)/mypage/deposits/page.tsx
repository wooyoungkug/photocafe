'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  CheckCircle,
  CreditCard,
  Building,
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

interface Deposit {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  orderNumber: string;
  orderId: string;
  orderAmount: number;
  depositAmount: number;
  paymentMethod: 'bank_transfer' | 'card' | 'cash' | 'other';
  bankName?: string;
  depositorName?: string;
  note?: string;
  createdAt?: string;
  createdBy?: string;
}

const PAYMENT_METHODS = {
  bank_transfer: { label: '계좌이체', icon: Building },
  card: { label: '카드결제', icon: CreditCard },
  cash: { label: '현금', icon: Wallet },
  other: { label: '기타', icon: Wallet },
};

export default function DepositsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterMethod, setFilterMethod] = useState<'all' | string>('all');

  const startDate = startOfMonth(selectedDate);
  const endDate = endOfMonth(selectedDate);

  // 입금내역 조회
  const { data: depositsData, isLoading, error } = useQuery({
    queryKey: ['deposits', user?.clientId, format(selectedDate, 'yyyy-MM'), filterMethod],
    queryFn: async () => {
      console.log('[Deposits] 요청 파라미터:', {
        clientId: user?.clientId,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        filterMethod,
      });
      const response = await api.get<{ data: Deposit[]; summary: any }>('/deposits', {
        clientId: user?.clientId || '',
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        ...(filterMethod !== 'all' && { paymentMethod: filterMethod }),
      });
      console.log('[Deposits] 응답:', response);
      return response;
    },
    enabled: isAuthenticated && !!user?.clientId,
  });

  const deposits = depositsData?.data || [];
  const totalDeposits = deposits.reduce((sum, deposit) => sum + deposit.depositAmount, 0);
  const totalOrders = deposits.reduce((sum, deposit) => sum + deposit.orderAmount, 0);

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

  const getPaymentMethodBadge = (method: string) => {
    const config = PAYMENT_METHODS[method as keyof typeof PAYMENT_METHODS] || PAYMENT_METHODS.other;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
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
            <Select value={filterMethod} onValueChange={(value: any) => setFilterMethod(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="bank_transfer">계좌이체</SelectItem>
                <SelectItem value="card">카드결제</SelectItem>
                <SelectItem value="cash">현금</SelectItem>
                <SelectItem value="other">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">입금 건수</p>
                <p className="text-2xl font-bold">{deposits.length}건</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">총 입금액</p>
                <p className="text-2xl font-bold text-green-600">
                  {totalDeposits.toLocaleString()}원
                </p>
              </div>
              <Wallet className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">관련 주문액</p>
                <p className="text-2xl font-bold text-primary">
                  {totalOrders.toLocaleString()}원
                </p>
              </div>
              <Building className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deposits Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            입금 내역
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="py-12 text-center">
              <div className="text-red-500 mb-2">⚠️ 데이터 조회 중 오류가 발생했습니다</div>
              <p className="text-sm text-gray-500">{(error as Error).message}</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded"></div>
              ))}
            </div>
          ) : deposits.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">수금번호</TableHead>
                    <TableHead className="w-[110px]">입금일자</TableHead>
                    <TableHead className="w-[120px]">주문번호</TableHead>
                    <TableHead className="w-[120px] text-right">주문금액</TableHead>
                    <TableHead className="w-[120px] text-right">입금금액</TableHead>
                    <TableHead className="w-[120px]">결제방법</TableHead>
                    <TableHead className="w-[100px]">입금은행</TableHead>
                    <TableHead className="w-[100px]">입금자</TableHead>
                    <TableHead>메모</TableHead>
                    <TableHead className="w-[80px] text-center">상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell className="text-sm font-medium text-primary">
                        {deposit.receiptNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(deposit.receiptDate), 'yyyy-MM-dd', { locale: ko })}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {deposit.orderNumber}
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {deposit.orderAmount.toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {deposit.depositAmount.toLocaleString()}원
                      </TableCell>
                      <TableCell>{getPaymentMethodBadge(deposit.paymentMethod)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {deposit.bankName || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {deposit.depositorName || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {deposit.note || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/mypage/orders/${deposit.orderId}`}>
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
                    <TableCell colSpan={2}>합계</TableCell>
                    <TableCell className="text-right text-primary">
                      {totalOrders.toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {totalDeposits.toLocaleString()}원
                    </TableCell>
                    <TableCell colSpan={4}></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <Wallet className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                입금 내역이 없습니다
              </h3>
              <p className="text-gray-500">
                {format(selectedDate, 'yyyy년 MM월', { locale: ko })}에는 입금 내역이 없습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

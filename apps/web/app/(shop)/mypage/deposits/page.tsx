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
  ChevronDown,
  ChevronUp,
  Loader2,
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
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuthStore } from '@/stores/auth-store';
import {
  useDailySummary,
  useDepositDetails,
  getPaymentMethodLabel,
} from '@/hooks/use-deposits';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

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
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const startDate = startOfMonth(selectedDate);
  const endDate = endOfMonth(selectedDate);

  // 일자별 합계 조회 (본인만)
  const { data: dailyData, isLoading } = useDailySummary({
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    clientId: user?.clientId,
    paymentMethod: filterMethod === 'all' ? undefined : filterMethod,
  });

  // 드릴다운 건별 조회 (초기 비활성화)
  const { data: detailData, refetch: refetchDetails, isFetching: isDetailFetching } =
    useDepositDetails({
      startDate: '',
      endDate: '',
      clientId: user?.clientId,
    });

  const handlePrevMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1));
    setExpandedRow(null);
  };

  const handleNextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1));
    setExpandedRow(null);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
    setExpandedRow(null);
  };

  // 행 클릭 핸들러 (드릴다운)
  const handleRowClick = async (date: string) => {
    if (expandedRow === date) {
      setExpandedRow(null);
      return;
    }

    setExpandedRow(date);

    // 해당 일자의 건별 상세 조회
    await refetchDetails({
      cancelRefetch: true,
      // @ts-ignore
      queryKey: [
        'deposits',
        'details',
        {
          startDate: date,
          endDate: date,
          clientId: user?.clientId,
        },
      ],
    });
  };

  const handleExport = () => {
    if (!dailyData?.data?.length) {
      toast({
        title: '다운로드할 데이터가 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['입금일자', '입금건수', '입금합계액', '주문합계액'];
    const rows = dailyData.data.map((d) => [
      d.date,
      d.count.toString(),
      Math.round(d.totalDepositAmount).toString(),
      Math.round(d.totalOrderAmount).toString(),
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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

  const getPaymentMethodBadge = (method: string) => {
    const config =
      PAYMENT_METHODS[method as keyof typeof PAYMENT_METHODS] ||
      PAYMENT_METHODS.other;
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
            <Select
              value={filterMethod}
              onValueChange={(value: any) => {
                setFilterMethod(value);
                setExpandedRow(null);
              }}
            >
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
                <p className="text-2xl font-bold">
                  {dailyData?.summary?.totalCount || 0}건
                </p>
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
                  {Math.round(
                    dailyData?.summary?.totalDepositAmount || 0
                  ).toLocaleString()}
                  원
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
                  {Math.round(
                    dailyData?.summary?.totalOrderAmount || 0
                  ).toLocaleString()}
                  원
                </p>
              </div>
              <Building className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deposits Table - 일자별 합계 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            일자별 입금 내역
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-100 animate-pulse rounded"
                ></div>
              ))}
            </div>
          ) : dailyData?.data && dailyData.data.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>입금일자</TableHead>
                    <TableHead className="text-right">입금건수</TableHead>
                    <TableHead className="text-right">입금합계액</TableHead>
                    <TableHead className="text-right">주문합계액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyData.data.map((row) => {
                    const isExpanded = expandedRow === row.date;

                    return (
                      <Collapsible key={row.date} open={isExpanded} asChild>
                        <>
                          {/* 합계 행 */}
                          <TableRow
                            className="cursor-pointer hover:bg-slate-100"
                            onClick={() => handleRowClick(row.date)}
                          >
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <div>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronUp className="h-4 w-4" />
                                  )}
                                </div>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell className="font-mono text-sm font-medium">
                              {format(new Date(row.date), 'yyyy-MM-dd', {
                                locale: ko,
                              })}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {row.count}건
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {Math.round(
                                row.totalDepositAmount
                              ).toLocaleString()}
                              원
                            </TableCell>
                            <TableCell className="text-right text-gray-600">
                              {Math.round(
                                row.totalOrderAmount
                              ).toLocaleString()}
                              원
                            </TableCell>
                          </TableRow>

                          {/* 드릴다운: 건별 상세 */}
                          <CollapsibleContent asChild>
                            <TableRow>
                              <TableCell colSpan={5} className="bg-slate-50 p-0">
                                <div className="p-4">
                                  <h4 className="text-sm font-semibold mb-3">
                                    건별 상세 내역 ({row.date})
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
                                            <TableHead>입금액</TableHead>
                                            <TableHead>결제방법</TableHead>
                                            <TableHead>입금은행</TableHead>
                                            <TableHead>입금자</TableHead>
                                            <TableHead className="text-center">
                                              상세
                                            </TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {detailData?.data
                                            ?.filter((d) =>
                                              d.receiptDate.startsWith(row.date)
                                            )
                                            .map((detail) => (
                                              <TableRow key={detail.id}>
                                                <TableCell className="font-mono text-primary">
                                                  {detail.receiptNumber}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                  {detail.orderNumber}
                                                </TableCell>
                                                <TableCell className="text-green-600 font-bold">
                                                  {Math.round(
                                                    detail.depositAmount
                                                  ).toLocaleString()}
                                                  원
                                                </TableCell>
                                                <TableCell>
                                                  {getPaymentMethodBadge(
                                                    detail.paymentMethod
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {detail.bankName || '-'}
                                                </TableCell>
                                                <TableCell>
                                                  {detail.depositorName || '-'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                  <Link
                                                    href={`/mypage/orders/${detail.orderId}`}
                                                  >
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                    >
                                                      <Eye className="h-4 w-4" />
                                                    </Button>
                                                  </Link>
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
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <Wallet className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                입금 내역이 없습니다
              </h3>
              <p className="text-gray-500">
                {format(selectedDate, 'yyyy년 MM월', { locale: ko })}에는 입금
                내역이 없습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

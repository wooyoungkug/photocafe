'use client';

import { useState, Fragment, useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Download,
  Eye,
  Loader2,
  CreditCard,
  Building,
  ArrowRightLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import {
  useDailyOrderSummary,
} from '@/hooks/use-orders';
import {
  useDepositDetails,
  getPaymentMethodLabel,
} from '@/hooks/use-deposits';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

const PAYMENT_METHODS: Record<string, { label: string; icon: any }> = {
  bank_transfer: { label: '계좌이체', icon: Building },
  card: { label: '카드결제', icon: CreditCard },
  cash: { label: '현금', icon: Wallet },
  other: { label: '기타', icon: Wallet },
};

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

export default function DepositsPage() {
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const startDate = startOfMonth(selectedDate);
  const endDate = endOfMonth(selectedDate);

  // 일자별 주문/입금 집계 (전월이월 포함) — monthly-summary와 동일 데이터
  const { data: dailyData, isLoading } = useDailyOrderSummary({
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    clientId: user?.clientId,
  });

  // 드릴다운: 선택 날짜의 건별 입금 내역
  const { data: detailData, isFetching: isDetailFetching } =
    useDepositDetails({
      startDate: expandedRow || '',
      endDate: expandedRow || '',
      clientId: user?.clientId,
    });

  // 누계잔액 계산
  const dataWithBalance = useMemo(() => {
    if (!dailyData?.data) return [];
    const carryForward = dailyData.summary?.carryForwardBalance || 0;
    let runningBalance = carryForward;

    return dailyData.data.map((row) => {
      runningBalance = runningBalance + row.orderAmount - row.depositAmount;
      return { ...row, runningBalance };
    });
  }, [dailyData]);

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
  const handleRowClick = (date: string) => {
    setExpandedRow(expandedRow === date ? null : date);
  };

  const handleExport = () => {
    if (!dataWithBalance.length) {
      toast({ title: '다운로드할 데이터가 없습니다.', variant: 'destructive' });
      return;
    }
    const carryForward = dailyData?.summary?.carryForwardBalance || 0;
    const headers = ['일자', '적요', '주문금액', '입금금액', '잔액'];
    const rows: string[][] = [
      ['', '전월이월', '', '', Math.round(carryForward).toString()],
      ...dataWithBalance.map((d) => [
        d.date,
        `${d.orderCount}건`,
        Math.round(d.orderAmount).toString(),
        Math.round(d.depositAmount).toString(),
        Math.round(d.runningBalance).toString(),
      ]),
    ];
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `입금내역_${format(selectedDate, 'yyyyMM')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'CSV 파일이 다운로드되었습니다.' });
  };

  const getPaymentMethodBadge = (method: string) => {
    const config = PAYMENT_METHODS[method] || PAYMENT_METHODS.other;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const summary = dailyData?.summary;
  const carryForward = summary?.carryForwardBalance || 0;
  const closingBalance = summary?.closingBalance || 0;

  return (
    <div className="space-y-6">
      {/* 월 네비게이션 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-xl">
                {format(selectedDate, 'yyyy년 MM월', { locale: ko })}
              </h2>
            </div>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={handleToday}>
              이번 달
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              내보내기
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 요약 카드 */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-6 bg-gray-200 rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">전월이월</p>
              <p className="text-lg sm:text-2xl tabular-nums">
                {fmt(carryForward)}<span className="text-sm">원</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">당월주문</p>
              <p className="text-lg sm:text-2xl tabular-nums">
                {fmt(summary?.totalOrderAmount || 0)}<span className="text-sm">원</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">당월입금</p>
              <p className="text-lg sm:text-2xl tabular-nums">
                {fmt(summary?.totalDepositAmount || 0)}<span className="text-sm">원</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">미결제잔액</p>
              <p
                className={`text-lg sm:text-2xl tabular-nums ${
                  closingBalance > 0 ? 'text-red-600' : closingBalance < 0 ? 'text-blue-600' : ''
                }`}
              >
                {closingBalance < 0 && '-'}
                {fmt(Math.abs(closingBalance))}<span className="text-sm">원</span>
              </p>
              {closingBalance > 0 && <p className="text-[10px] text-red-500 mt-0.5">미결제</p>}
              {closingBalance < 0 && <p className="text-[10px] text-blue-500 mt-0.5">선결제</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 입금내역 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-normal">
            <ArrowRightLeft className="h-4 w-4" />
            입금내역
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {isLoading ? (
            <div className="space-y-2 px-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : dataWithBalance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs text-muted-foreground">
                    <th className="w-8 p-2 sm:p-3" />
                    <th className="p-2 sm:p-3 text-left font-normal">일자</th>
                    <th className="p-2 sm:p-3 text-left font-normal">적요</th>
                    <th className="p-2 sm:p-3 text-right font-normal">
                      주문<span className="hidden sm:inline">금액</span>
                    </th>
                    <th className="p-2 sm:p-3 text-right font-normal">
                      입금<span className="hidden sm:inline">금액</span>
                    </th>
                    <th className="p-2 sm:p-3 text-right font-normal">잔액</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 일자별 거래 (최신순) */}
                  {[...dataWithBalance].reverse().map((row) => {
                    const isExpanded = expandedRow === row.date;
                    return (
                      <Fragment key={row.date}>
                        <tr
                          className="border-b cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => handleRowClick(row.date)}
                        >
                          <td className="p-2 sm:p-3 text-center">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-500 inline-block" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4 text-gray-400 inline-block" />
                            )}
                          </td>
                          <td className="p-2 sm:p-3 whitespace-nowrap">
                            {format(new Date(row.date + 'T00:00:00'), 'MM/dd (EEE)', { locale: ko })}
                          </td>
                          <td className="p-2 sm:p-3 text-muted-foreground">
                            {row.orderCount}건
                          </td>
                          <td className="p-2 sm:p-3 text-right tabular-nums">
                            {row.orderAmount > 0 ? fmt(row.orderAmount) + '원' : '-'}
                          </td>
                          <td className="p-2 sm:p-3 text-right tabular-nums">
                            {row.depositAmount > 0 ? fmt(row.depositAmount) + '원' : '-'}
                          </td>
                          <td
                            className={`p-2 sm:p-3 text-right tabular-nums ${
                              row.runningBalance > 0
                                ? 'text-red-600'
                                : row.runningBalance < 0
                                ? 'text-blue-600'
                                : ''
                            }`}
                          >
                            {row.runningBalance < 0 && '-'}
                            {fmt(Math.abs(row.runningBalance))}원
                          </td>
                        </tr>

                        {/* 드릴다운: 건별 입금 내역 */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="bg-slate-50/80 p-0 border-b">
                              <div className="px-4 py-3 sm:px-8">
                                <p className="text-xs text-muted-foreground mb-2">
                                  {format(new Date(row.date + 'T00:00:00'), 'MM월 dd일 (EEE)', { locale: ko })} 입금 내역
                                </p>
                                {isDetailFetching ? (
                                  <div className="flex items-center justify-center py-6">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                  </div>
                                ) : detailData?.data && detailData.data.filter((d) => d.receiptDate.startsWith(row.date)).length > 0 ? (
                                  <div className="space-y-2">
                                    {detailData.data
                                      .filter((d) => d.receiptDate.startsWith(row.date))
                                      .map((detail) => (
                                        <div
                                          key={detail.id}
                                          className="flex items-center gap-3 bg-white rounded-lg border p-3 text-sm"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <p className="font-mono text-primary text-xs">
                                              {detail.receiptNumber}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              {detail.orderNumber}
                                            </p>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <p className="tabular-nums">
                                              {fmt(detail.depositAmount)}원
                                            </p>
                                          </div>
                                          <div className="shrink-0">
                                            {getPaymentMethodBadge(detail.paymentMethod)}
                                          </div>
                                          <div className="shrink-0">
                                            <span
                                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
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
                                                : '미결제'}
                                            </span>
                                          </div>
                                          <Link href={`/mypage/orders/${detail.orderId}`}>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                          </Link>
                                        </div>
                                      ))}
                                  </div>
                                ) : (
                                  <p className="text-center text-muted-foreground text-xs py-4">
                                    입금 내역이 없습니다
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}

                  {/* 전월이월 */}
                  <tr className="border-b bg-blue-50/50">
                    <td className="p-2 sm:p-3" />
                    <td className="p-2 sm:p-3 whitespace-nowrap text-muted-foreground">
                      {format(startDate, 'MM/01')}
                    </td>
                    <td className="p-2 sm:p-3 text-blue-700">전월이월</td>
                    <td className="p-2 sm:p-3 text-right text-muted-foreground">-</td>
                    <td className="p-2 sm:p-3 text-right text-muted-foreground">-</td>
                    <td
                      className={`p-2 sm:p-3 text-right tabular-nums ${
                        carryForward > 0 ? 'text-red-600' : carryForward < 0 ? 'text-blue-600' : ''
                      }`}
                    >
                      {carryForward < 0 && '-'}
                      {fmt(Math.abs(carryForward))}원
                    </td>
                  </tr>

                  {/* 당월합계 */}
                  <tr className="bg-gray-100 text-sm border-t-2">
                    <td className="p-2 sm:p-3" />
                    <td className="p-2 sm:p-3" />
                    <td className="p-2 sm:p-3">당월합계</td>
                    <td className="p-2 sm:p-3 text-right tabular-nums">
                      {fmt(summary?.totalOrderAmount || 0)}원
                    </td>
                    <td className="p-2 sm:p-3 text-right tabular-nums">
                      {fmt(summary?.totalDepositAmount || 0)}원
                    </td>
                    <td className="p-2 sm:p-3" />
                  </tr>

                  {/* 차월이월 */}
                  <tr className="bg-gray-50 text-sm border-t">
                    <td className="p-2 sm:p-3" />
                    <td className="p-2 sm:p-3" />
                    <td className="p-2 sm:p-3 text-primary">차월이월</td>
                    <td className="p-2 sm:p-3" />
                    <td className="p-2 sm:p-3" />
                    <td
                      className={`p-2 sm:p-3 text-right tabular-nums ${
                        closingBalance > 0 ? 'text-red-600' : closingBalance < 0 ? 'text-blue-600' : ''
                      }`}
                    >
                      {closingBalance < 0 && '-'}
                      {fmt(Math.abs(closingBalance))}원
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center px-4">
              <Wallet className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                {format(selectedDate, 'yyyy년 MM월', { locale: ko })}에는 입금 내역이 없습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

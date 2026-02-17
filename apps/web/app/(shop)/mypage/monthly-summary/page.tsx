'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  TrendingUp,
  Package,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Truck,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuthStore } from '@/stores/auth-store';
import {
  useDailyOrderSummary,
  useOrders,
  ORDER_STATUS_LABELS,
} from '@/hooks/use-orders';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending_receipt: 'outline',
  receipt_completed: 'default',
  in_production: 'warning',
  ready_for_shipping: 'secondary',
  shipped: 'success',
  cancelled: 'destructive',
};

export default function MonthlySummaryPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const startDate = startOfMonth(selectedDate);
  const endDate = endOfMonth(selectedDate);

  // 일자별 집계 조회
  const { data: dailyData, isLoading } = useDailyOrderSummary({
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    clientId: user?.clientId,
  });

  // 드릴다운: 클릭한 날짜의 주문 목록 조회
  const { data: detailData, isFetching: isDetailFetching } = useOrders(
    expandedRow
      ? {
          clientId: user?.clientId,
          startDate: expandedRow,
          endDate: expandedRow,
          limit: 100,
        }
      : undefined,
  );

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

  // 배송상태 표시
  const renderShippingStatus = (order: any) => {
    if (!order.shipping) {
      return <span className="text-gray-400 text-xs">-</span>;
    }
    if (order.shipping.deliveredAt) {
      return <Badge variant="success">배송완료</Badge>;
    }
    if (order.shipping.shippedAt || order.shipping.trackingNumber) {
      return (
        <div className="flex items-center gap-1 text-xs">
          <Truck className="h-3 w-3 text-blue-500" />
          <span className="text-blue-600">
            {order.shipping.trackingNumber || '배송중'}
          </span>
        </div>
      );
    }
    if (order.status === 'ready_for_shipping') {
      return <Badge variant="secondary">배송준비</Badge>;
    }
    return <span className="text-gray-400 text-xs">-</span>;
  };

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

      {/* 월 합계 카드 */}
      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">총 주문</p>
                  <p className="text-2xl font-bold">
                    {dailyData?.summary?.totalOrders || 0}건
                  </p>
                </div>
                <Package className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">매출합계</p>
                  <p className="text-2xl font-bold text-primary">
                    {Math.round(
                      dailyData?.summary?.totalOrderAmount || 0,
                    ).toLocaleString()}
                    원
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
                  <p className="text-sm text-gray-500 mb-1">입금합계</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(
                      dailyData?.summary?.totalDepositAmount || 0,
                    ).toLocaleString()}
                    원
                  </p>
                </div>
                <Wallet className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 일자별 거래 내역 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            일자별 거래 내역
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
                    <TableHead>일자</TableHead>
                    <TableHead className="text-right">주문건수</TableHead>
                    <TableHead className="text-right">매출합계</TableHead>
                    <TableHead className="text-right">입금합계</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyData.data.map((row) => {
                    const isExpanded = expandedRow === row.date;

                    return (
                      <Collapsible key={row.date} open={isExpanded} asChild>
                        <tbody>
                          {/* 일자 합계 행 */}
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
                              {format(new Date(row.date + 'T00:00:00'), 'MM/dd (EEE)', {
                                locale: ko,
                              })}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {row.orderCount}건
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              {Math.round(row.orderAmount).toLocaleString()}원
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {Math.round(row.depositAmount).toLocaleString()}원
                            </TableCell>
                          </TableRow>

                          {/* 드릴다운: 건별 상세 */}
                          <CollapsibleContent asChild>
                            <TableRow>
                              <TableCell colSpan={5} className="bg-slate-50 p-0">
                                <div className="p-4">
                                  <h4 className="text-sm font-semibold mb-3">
                                    건별 거래 내역 (
                                    {format(new Date(row.date + 'T00:00:00'), 'MM월 dd일', {
                                      locale: ko,
                                    })}
                                    )
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
                                            <TableHead>주문번호</TableHead>
                                            <TableHead>상품명</TableHead>
                                            <TableHead className="text-right">
                                              금액
                                            </TableHead>
                                            <TableHead>진행상황</TableHead>
                                            <TableHead>배송</TableHead>
                                            <TableHead className="text-center w-[50px]">
                                              상세
                                            </TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {detailData?.data?.map((order) => (
                                            <TableRow key={order.id}>
                                              <TableCell className="font-mono text-xs text-primary">
                                                {order.orderNumber}
                                              </TableCell>
                                              <TableCell className="max-w-[200px] truncate">
                                                {order.items?.[0]?.productName ||
                                                  '-'}
                                                {order.items?.length > 1 && (
                                                  <span className="text-muted-foreground ml-1">
                                                    외 {order.items.length - 1}건
                                                  </span>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-right font-medium">
                                                {Math.round(
                                                  Number(order.finalAmount),
                                                ).toLocaleString()}
                                                원
                                              </TableCell>
                                              <TableCell>
                                                <Badge
                                                  variant={
                                                    STATUS_BADGE_VARIANT[order.status] ||
                                                    'outline'
                                                  }
                                                >
                                                  {ORDER_STATUS_LABELS[order.status] ||
                                                    order.status}
                                                </Badge>
                                              </TableCell>
                                              <TableCell>
                                                {renderShippingStatus(order)}
                                              </TableCell>
                                              <TableCell className="text-center">
                                                <Link
                                                  href={`/mypage/orders/${order.id}`}
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
                                          {(!detailData?.data ||
                                            detailData.data.length === 0) && (
                                            <TableRow>
                                              <TableCell
                                                colSpan={6}
                                                className="text-center text-muted-foreground py-4"
                                              >
                                                거래 내역이 없습니다
                                              </TableCell>
                                            </TableRow>
                                          )}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </tbody>
                      </Collapsible>
                    );
                  })}

                  {/* 합계 행 */}
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell></TableCell>
                    <TableCell>합계</TableCell>
                    <TableCell className="text-right">
                      {dailyData.summary.totalOrders}건
                    </TableCell>
                    <TableCell className="text-right text-primary">
                      {Math.round(
                        dailyData.summary.totalOrderAmount,
                      ).toLocaleString()}
                      원
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {Math.round(
                        dailyData.summary.totalDepositAmount,
                      ).toLocaleString()}
                      원
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                거래 내역이 없습니다
              </h3>
              <p className="text-gray-500">
                {format(selectedDate, 'yyyy년 MM월', { locale: ko })}에는 거래
                내역이 없습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Search,
  FileText,
  ImageIcon,
  ClipboardCheck,
  Printer,
  PackageCheck,
  Eye,
  Receipt,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrders, useOrderStatusCounts, ORDER_STATUS, ORDER_STATUS_LABELS } from '@/hooks/use-orders';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// 진행단계별 아이콘 상태 설정
const STAGE_ITEMS = [
  { key: 'all', label: '전체', icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50', activeBg: 'bg-gray-100', border: 'border-gray-300' },
  { key: 'pending_receipt', label: '접수대기', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', activeBg: 'bg-orange-100', border: 'border-orange-400' },
  { key: 'receipt_completed', label: '접수완료', icon: ClipboardCheck, color: 'text-blue-600', bg: 'bg-blue-50', activeBg: 'bg-blue-100', border: 'border-blue-400' },
  { key: 'in_production', label: '생산진행', icon: Printer, color: 'text-purple-600', bg: 'bg-purple-50', activeBg: 'bg-purple-100', border: 'border-purple-400' },
  { key: 'ready_for_shipping', label: '배송준비', icon: PackageCheck, color: 'text-indigo-600', bg: 'bg-indigo-50', activeBg: 'bg-indigo-100', border: 'border-indigo-400' },
  { key: 'shipped', label: '배송완료', icon: Truck, color: 'text-green-600', bg: 'bg-green-50', activeBg: 'bg-green-100', border: 'border-green-400' },
  { key: 'cancelled', label: '취소', icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-50', activeBg: 'bg-gray-100', border: 'border-gray-300' },
];

// 진행상황 뱃지 스타일
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending_receipt: { label: '접수대기', className: 'bg-orange-100 text-orange-700' },
  receipt_completed: { label: '접수완료', className: 'bg-blue-100 text-blue-700' },
  in_production: { label: '생산진행', className: 'bg-purple-100 text-purple-700' },
  ready_for_shipping: { label: '배송준비', className: 'bg-indigo-100 text-indigo-700' },
  shipped: { label: '배송완료', className: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소', className: 'bg-gray-100 text-gray-500' },
};

// 파일 사이즈 포맷
function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}

export default function OrderListPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // 주문 목록 조회
  const { data: ordersData, isLoading } = useOrders({
    page,
    limit,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  // 상태별 카운트
  const { data: statusCounts } = useOrderStatusCounts();

  const orders = ordersData?.data ?? [];
  const meta = ordersData?.meta;

  const totalCount = statusCounts
    ? Object.values(statusCounts).reduce((sum: number, count: number) => sum + count, 0)
    : 0;

  const getCount = (key: string) => {
    if (key === 'all') return totalCount;
    return statusCounts?.[key] || 0;
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          주문목록
        </h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="주문번호, 주문자 검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* 진행단계 아이콘 네비게이션 (참고: 성원애드피아 스타일) */}
      <Card>
        <CardContent className="py-4 px-2">
          <div className="flex items-center justify-around">
            {STAGE_ITEMS.map((stage) => {
              const Icon = stage.icon;
              const count = getCount(stage.key);
              const isActive = statusFilter === stage.key;

              return (
                <button
                  type="button"
                  key={stage.key}
                  onClick={() => { setStatusFilter(stage.key); setPage(1); }}
                  className={cn(
                    'flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-all min-w-[72px]',
                    isActive
                      ? `${stage.activeBg} ${stage.border} border-2 shadow-sm`
                      : 'border-2 border-transparent hover:bg-muted'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    isActive ? stage.activeBg : stage.bg,
                  )}>
                    <Icon className={cn('h-5 w-5', stage.color)} />
                  </div>
                  <span className={cn(
                    'text-xs font-medium',
                    isActive ? stage.color : 'text-muted-foreground'
                  )}>
                    {stage.label}
                  </span>
                  <span className={cn(
                    'text-sm font-bold',
                    isActive ? stage.color : 'text-foreground',
                    count > 0 ? '' : 'text-muted-foreground'
                  )}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 조회결과 + 페이지 설정 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          조회결과 : <b className="text-foreground">{meta?.total || 0}</b> 건
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">진행 사항이고</span>
          <select
            value={limit}
            className="h-8 text-xs border rounded px-2"
            aria-label="페이지당 표시 건수"
            disabled
          >
            <option value={10}>10개씩</option>
            <option value={20}>20개씩</option>
            <option value={50}>50개씩</option>
          </select>
        </div>
      </div>

      {/* 주문 테이블 */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      ) : orders.length > 0 ? (
        <>
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead className="text-center w-[130px] text-xs">
                      주문일<br />(주문번호)
                    </TableHead>
                    <TableHead className="text-center w-[70px] text-xs">순번</TableHead>
                    <TableHead className="w-[50px] text-center text-xs">썸네일</TableHead>
                    <TableHead className="text-xs">상품명 / 주문제목 / 재질 및 규격</TableHead>
                    <TableHead className="text-center w-[60px] text-xs">페이지</TableHead>
                    <TableHead className="text-center w-[50px] text-xs">부수</TableHead>
                    <TableHead className="text-center w-[70px] text-xs">용량</TableHead>
                    <TableHead className="text-right w-[100px] text-xs">주문금액</TableHead>
                    <TableHead className="text-center w-[80px] text-xs">진행상황</TableHead>
                    <TableHead className="text-center w-[100px] text-xs">확인</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const items = order.items || [];
                    const statusBadge = STATUS_BADGE[order.status] || STATUS_BADGE.pending_receipt;

                    return items.map((item, idx) => (
                      <TableRow
                        key={item.id}
                        className={cn(
                          'hover:bg-muted/30',
                          idx > 0 ? 'border-t border-dashed' : '',
                          order.isUrgent ? 'bg-red-50/30' : ''
                        )}
                      >
                        {/* 주문일(주문번호) - 첫 번째 항목에만 표시 */}
                        {idx === 0 && (
                          <TableCell
                            className="text-center align-top pt-3"
                            rowSpan={items.length}
                          >
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(order.orderedAt), 'yyyy-MM-dd', { locale: ko })}
                              </div>
                              <Link
                                href={`/mypage/orders/${order.id}`}
                                className="text-xs font-semibold text-primary hover:underline"
                              >
                                {order.orderNumber}
                              </Link>
                              {order.isUrgent && (
                                <Badge variant="destructive" className="text-[10px] px-1 py-0">긴급</Badge>
                              )}
                              <div className="text-[11px] text-muted-foreground mt-1">
                                {order.client?.clientName}
                              </div>
                            </div>
                          </TableCell>
                        )}

                        {/* 순번 */}
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {String(idx + 1).padStart(2, '0')}
                        </TableCell>

                        {/* 썸네일 */}
                        <TableCell className="text-center">
                          <div className="w-10 h-10 mx-auto bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                            {item.thumbnailUrl ? (
                              <Image
                                src={item.thumbnailUrl}
                                alt={item.productName}
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-gray-300" />
                            )}
                          </div>
                        </TableCell>

                        {/* 상품명 / 주문제목 / 재질 및 규격 */}
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-tight line-clamp-1">
                              {item.productName}
                            </p>
                            <div className="text-xs text-muted-foreground leading-tight">
                              {item.size} / {item.printMethod} / {item.paper}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.bindingType && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{item.bindingType}</Badge>
                              )}
                              {item.coverMaterial && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{item.coverMaterial}</Badge>
                              )}
                              {item.foilColor && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">박:{item.foilColor}</Badge>
                              )}
                              {item.finishingOptions?.map((opt, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] px-1 py-0 h-4">{opt}</Badge>
                              ))}
                            </div>
                          </div>
                        </TableCell>

                        {/* 페이지 */}
                        <TableCell className="text-center text-xs">
                          {item.pages}p
                        </TableCell>

                        {/* 부수 */}
                        <TableCell className="text-center text-xs font-medium">
                          {item.quantity}건
                        </TableCell>

                        {/* 용량 */}
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {formatFileSize(Number(item.totalFileSize))}
                        </TableCell>

                        {/* 주문금액 - 첫 번째 항목에만 합계 표시 */}
                        {idx === 0 && (
                          <TableCell
                            className="text-right align-top pt-3 font-bold text-sm"
                            rowSpan={items.length}
                          >
                            {Number(order.finalAmount).toLocaleString()}원
                          </TableCell>
                        )}

                        {/* 진행상황 - 첫 번째 항목에만 표시 */}
                        {idx === 0 && (
                          <TableCell
                            className="text-center align-top pt-3"
                            rowSpan={items.length}
                          >
                            <Badge className={cn('text-xs font-semibold', statusBadge.className)}>
                              {statusBadge.label}
                            </Badge>
                          </TableCell>
                        )}

                        {/* 확인 버튼 - 첫 번째 항목에만 표시 */}
                        {idx === 0 && (
                          <TableCell
                            className="text-center align-top pt-3"
                            rowSpan={items.length}
                          >
                            <div className="flex flex-col gap-1">
                              <Link href={`/mypage/orders/${order.id}`}>
                                <Button variant="outline" size="sm" className="w-full text-xs h-7">
                                  <Eye className="h-3 w-3 mr-1" />
                                  상세보기
                                </Button>
                              </Link>
                              <Button variant="ghost" size="sm" className="w-full text-xs h-7 text-muted-foreground">
                                <Receipt className="h-3 w-3 mr-1" />
                                거래명세
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ));
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* 페이지네이션 */}
          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-1 mt-4">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={page === p ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                disabled={page === meta.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              주문 내역이 없습니다
            </h3>
            <p className="text-gray-500 text-sm">
              {statusFilter !== 'all'
                ? `${ORDER_STATUS_LABELS[statusFilter] || statusFilter} 상태의 주문이 없습니다`
                : '등록된 주문이 없습니다'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  FileText,
  Eye,
  Receipt,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrders, ORDER_STATUS_LABELS } from '@/hooks/use-orders';
import { BulkActionToolbar } from './components/bulk-action-toolbar';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// 진행상황 뱃지 스타일
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending_receipt: { label: '접수대기', className: 'bg-orange-100 text-orange-700' },
  receipt_completed: { label: '접수완료', className: 'bg-blue-100 text-blue-700' },
  in_production: { label: '생산진행', className: 'bg-purple-100 text-purple-700' },
  ready_for_shipping: { label: '배송준비', className: 'bg-indigo-100 text-indigo-700' },
  shipped: { label: '배송완료', className: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소', className: 'bg-gray-100 text-gray-500' },
};

// 상태 필터 옵션
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'pending_receipt', label: '접수대기' },
  { value: 'receipt_completed', label: '접수완료' },
  { value: 'in_production', label: '생산진행' },
  { value: 'ready_for_shipping', label: '배송준비' },
  { value: 'shipped', label: '배송완료' },
  { value: 'cancelled', label: '취소' },
];

// 파일 사이즈 포맷
function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}

// 편집스타일 라벨
function getPageLayoutLabel(layout?: string): string {
  if (!layout) return '-';
  return layout === 'spread' ? '펼침면' : '낱장';
}

// 제본순서 라벨
function getBindingDirectionLabel(direction?: string): string {
  if (!direction) return '-';
  const labels: Record<string, string> = {
    LEFT_START_RIGHT_END: '좌시우끝',
    LEFT_START_LEFT_END: '좌시좌끝',
    RIGHT_START_LEFT_END: '우시좌끝',
    RIGHT_START_RIGHT_END: '우시우끝',
  };
  return labels[direction] || direction;
}

export default function OrderListPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // 체크박스 선택 상태
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // 주문 목록 조회
  const { data: ordersData, isLoading } = useOrders({
    page,
    limit,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const orders = ordersData?.data ?? [];
  const meta = ordersData?.meta;

  // 필터/페이지 변경 시 선택 초기화
  useEffect(() => {
    setSelectedOrderIds(new Set());
  }, [statusFilter, search, page]);

  // 선택 헬퍼
  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedOrderIds.size === orders.length && orders.length > 0) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(orders.map(o => o.id)));
    }
  };

  const clearSelection = () => setSelectedOrderIds(new Set());

  const isAllSelected = orders.length > 0 && selectedOrderIds.size === orders.length;

  return (
    <div className="space-y-4">
      {/* 헤더: 제목 + 상태필터 + 검색 */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2 shrink-0">
          <FileText className="h-5 w-5" />
          주문목록
        </h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>

      {/* 조회결과 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          조회결과 : <b className="text-foreground">{meta?.total || 0}</b> 건
          {selectedOrderIds.size > 0 && (
            <span className="ml-2 text-blue-600 font-medium">({selectedOrderIds.size}건 선택됨)</span>
          )}
        </span>
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
                    <TableHead className="text-center w-[40px]">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleAll}
                        aria-label="전체 선택"
                      />
                    </TableHead>
                    <TableHead className="text-center w-[130px] text-xs">
                      주문일<br />(주문번호)
                    </TableHead>
                    <TableHead className="text-center w-[80px] text-xs">회원정보</TableHead>
                    <TableHead className="text-xs w-[120px]">상품명</TableHead>
                    <TableHead className="text-xs">주문제목 / 재질 및 규격</TableHead>
                    <TableHead className="text-center w-[100px] text-xs">편집스타일<br />/ 제본순서</TableHead>
                    <TableHead className="text-center w-[80px] text-xs">페이지<br />/ 부수</TableHead>
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
                    const isSelected = selectedOrderIds.has(order.id);

                    return items.map((item, idx) => (
                      <TableRow
                        key={item.id}
                        data-state={isSelected ? 'selected' : undefined}
                        className={cn(
                          'hover:bg-muted/30',
                          idx > 0 ? 'border-t border-dashed' : '',
                          order.isUrgent ? 'bg-red-50/30' : ''
                        )}
                      >
                        {/* 체크박스 - 첫 번째 항목에만 표시 */}
                        {idx === 0 && (
                          <TableCell
                            className="text-center align-top pt-3"
                            rowSpan={items.length}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleOrder(order.id)}
                              aria-label={`주문 ${order.orderNumber} 선택`}
                            />
                          </TableCell>
                        )}

                        {/* 주문일(주문번호) - 첫 번째 항목에만 표시 */}
                        {idx === 0 && (
                          <TableCell
                            className="text-center align-top pt-3"
                            rowSpan={items.length}
                          >
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(order.orderedAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                              </div>
                              <Link
                                href={`/mypage/orders/${order.id}`}
                                className="text-xs font-semibold text-primary hover:underline"
                              >
                                {order.orderNumber?.replace(/^ORD-\d{8}-/, '') || order.orderNumber}
                              </Link>
                              {order.isUrgent && (
                                <Badge variant="destructive" className="text-[10px] px-1 py-0">긴급</Badge>
                              )}
                              {order.isDuplicateOverride && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-400 text-amber-600 bg-amber-50">중복주의</Badge>
                              )}
                            </div>
                          </TableCell>
                        )}

                        {/* 회원정보 - 첫 번째 항목에만 표시 */}
                        {idx === 0 && (
                          <TableCell
                            className="text-center align-top pt-3"
                            rowSpan={items.length}
                          >
                            <div className="text-xs font-medium">
                              {order.client?.clientName}
                            </div>
                            {order.client?.assignedStaff?.[0]?.staff?.name && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {order.client.assignedStaff[0].staff.name}
                              </div>
                            )}
                          </TableCell>
                        )}

                        {/* 상품명 */}
                        <TableCell>
                          <p className="text-xs font-medium leading-tight line-clamp-2">
                            {item.productName}
                          </p>
                        </TableCell>

                        {/* 주문제목 / 재질 및 규격 */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="text-xs font-medium truncate" title={item.folderName || item.productName}>
                              {item.folderName || item.productName}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate" title={[item.size, item.printMethod, item.paper, item.bindingType, item.coverMaterial, item.foilColor ? `박:${item.foilColor}` : ''].filter(Boolean).join(' / ')}>
                              {item.size} / {item.printMethod} / {item.paper}
                              {item.bindingType && <> / {item.bindingType}</>}
                              {item.coverMaterial && <> / {item.coverMaterial}</>}
                              {item.foilColor && <> / 박:{item.foilColor}</>}
                            </div>
                          </div>
                        </TableCell>

                        {/* 편집스타일 / 제본순서 */}
                        <TableCell className="text-center">
                          <div className="space-y-0.5">
                            <div className="text-xs">
                              {getPageLayoutLabel(item.pageLayout)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {getBindingDirectionLabel(item.bindingDirection)}
                            </div>
                          </div>
                        </TableCell>

                        {/* 페이지 / 부수 */}
                        <TableCell className="text-center text-xs">
                          <div>{item.pages}p</div>
                          <div className="text-muted-foreground">{item.quantity}건</div>
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

          {/* 벌크 액션 툴바 */}
          {selectedOrderIds.size > 0 && (
            <BulkActionToolbar
              selectedIds={selectedOrderIds}
              onClearSelection={clearSelection}
              onActionComplete={clearSelection}
            />
          )}

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

'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Truck,
  ScanBarcode,
  Link2,
  Printer,
  Search,
  Loader2,
  Package,
  FileText,
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
import { useShippingReady, useGenerateLabel, useDownloadLabel } from '@/hooks/use-shipping-mgmt';
import { useCourierList } from '@/hooks/use-delivery-tracking';
import { ShippingInputDialog } from '@/components/order/shipping-input-dialog';
import { BarcodeScanner } from '@/components/order/barcode-scanner';
import { BundleShippingDialog } from '@/components/order/bundle-shipping-dialog';
import type { Order } from '@/hooks/use-orders';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 배송 방법 라벨 */
const DELIVERY_METHOD_LABELS: Record<string, string> = {
  parcel: '택배',
  motorcycle: '오토바이퀵',
  freight: '화물',
  pickup: '방문수령',
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ShippingManagementPage() {
  // 필터 상태
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [courierFilter, setCourierFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const limit = 20;

  // 선택 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 다이얼로그 상태
  const [scannerOpen, setScannerOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [shippingDialogState, setShippingDialogState] = useState<{
    open: boolean;
    orderId: string;
    orderNumber: string;
    courierCode?: string;
    trackingNumber?: string;
  }>({ open: false, orderId: '', orderNumber: '' });

  // Data fetching
  const { data, isLoading, error } = useShippingReady({
    page,
    limit,
    search: search || undefined,
    courierCode: courierFilter !== 'all' ? courierFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const { data: couriers = [] } = useCourierList();
  const generateLabel = useGenerateLabel();
  const downloadLabel = useDownloadLabel();

  const orders = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit, totalPages: 0 };

  // 통계 계산
  const stats = useMemo(() => {
    const noTracking = orders.filter(
      (o) => !o.shipping?.trackingNumber
    ).length;
    const ready = orders.filter(
      (o) => !!o.shipping?.trackingNumber
    ).length;
    return { noTracking, ready, total: meta.total };
  }, [orders, meta.total]);

  // 전체 선택/해제
  const allSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 검색 처리
  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  // 운송장 출력
  const handlePrintLabel = useCallback(
    async (orderId: string) => {
      try {
        await generateLabel.mutateAsync(orderId);
        await downloadLabel.mutateAsync(orderId);
        toast({ title: '운송장이 생성되었습니다.' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '운송장 생성에 실패했습니다.';
        toast({ title: msg, variant: 'destructive' });
      }
    },
    [generateLabel, downloadLabel]
  );

  // 일괄 운송장 출력
  const handleBulkPrint = async () => {
    if (selectedIds.size === 0) {
      toast({ title: '출력할 주문을 선택해주세요.', variant: 'destructive' });
      return;
    }
    for (const id of selectedIds) {
      try {
        await generateLabel.mutateAsync(id);
        await downloadLabel.mutateAsync(id);
      } catch {
        // 개별 실패는 무시하고 계속 진행
      }
    }
    toast({ title: `${selectedIds.size}건의 운송장을 출력했습니다.` });
  };

  // 송장 상태 판별
  const getTrackingStatus = (order: Order) => {
    if (order.shipping?.trackingNumber) {
      return { label: '준비완료', className: 'bg-blue-100 text-blue-700' };
    }
    return { label: '송장없음', className: 'bg-orange-100 text-orange-700' };
  };

  // 택배사 이름 가져오기
  const getCourierName = (code?: string) => {
    if (!code) return '-';
    return couriers.find((c) => c.code === code)?.name ?? code;
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Truck className="h-5 w-5" />
            배송관리
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            배송준비 주문의 송장 입력, 묶음배송, 운송장 출력을 관리합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setScannerOpen(true)}>
            <ScanBarcode className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">바코드 스캔</span>
            <span className="sm:hidden">스캔</span>
          </Button>
          <Button variant="outline" onClick={() => setBundleOpen(true)}>
            <Link2 className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">묶음배송 감지</span>
            <span className="sm:hidden">묶음</span>
          </Button>
          <Button variant="outline" onClick={handleBulkPrint} disabled={selectedIds.size === 0}>
            <Printer className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">운송장 일괄출력</span>
            <span className="sm:hidden">출력</span>
            {selectedIds.size > 0 && (
              <Badge variant="secondary" className="ml-1.5 bg-blue-100 text-blue-700">
                {selectedIds.size}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">배송준비</p>
              <p className="text-xl font-bold">{stats.total}건</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">송장없음</p>
              <p className="text-xl font-bold text-orange-600">{stats.noTracking}건</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Truck className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">준비완료</p>
              <p className="text-xl font-bold text-blue-600">{stats.ready}건</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={courierFilter}
              onValueChange={(val) => {
                setCourierFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="택배사" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 택배사</SelectItem>
                {couriers.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-[140px]"
              placeholder="시작일"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-[140px]"
              placeholder="종료일"
            />

            <div className="flex flex-1 gap-2">
              <Input
                placeholder="주문번호, 수령인 검색"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button variant="secondary" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 테이블 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              주문 목록을 불러오고 있습니다...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-red-500">
              데이터를 불러오는데 실패했습니다.
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="h-10 w-10 mb-3 opacity-40" />
              <p>배송준비 중인 주문이 없습니다.</p>
            </div>
          ) : (
            <>
              {/* 데스크탑 테이블 */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleSelectAll}
                          aria-label="전체 선택"
                        />
                      </TableHead>
                      <TableHead className="w-24">날짜</TableHead>
                      <TableHead className="w-32">주문번호</TableHead>
                      <TableHead>거래처</TableHead>
                      <TableHead>수령인</TableHead>
                      <TableHead className="w-24">배송방법</TableHead>
                      <TableHead className="w-40">송장번호</TableHead>
                      <TableHead className="w-24">상태</TableHead>
                      <TableHead className="w-36 text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const trackingStatus = getTrackingStatus(order);
                      return (
                        <TableRow key={order.id} className="group">
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(order.id)}
                              onCheckedChange={() => toggleSelect(order.id)}
                              aria-label={`${order.orderNumber} 선택`}
                            />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {order.orderedAt
                              ? format(new Date(order.orderedAt), 'MM.dd', { locale: ko })
                              : '-'}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell className="text-sm truncate max-w-[120px]">
                            {order.client?.clientName ?? '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.shipping?.recipientName ?? '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {DELIVERY_METHOD_LABELS[order.shipping?.courierCode ?? ''] ??
                              getCourierName(order.shipping?.courierCode)}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {order.shipping?.trackingNumber ?? (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn('text-xs', trackingStatus.className)}
                            >
                              {trackingStatus.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() =>
                                  setShippingDialogState({
                                    open: true,
                                    orderId: order.id,
                                    orderNumber: order.orderNumber,
                                    courierCode: order.shipping?.courierCode,
                                    trackingNumber: order.shipping?.trackingNumber,
                                  })
                                }
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                송장입력
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => handlePrintLabel(order.id)}
                                disabled={generateLabel.isPending}
                              >
                                <Printer className="h-3 w-3 mr-1" />
                                출력
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* 모바일 카드 뷰 */}
              <div className="md:hidden space-y-2 p-3">
                {orders.map((order) => {
                  const trackingStatus = getTrackingStatus(order);
                  return (
                    <div
                      key={order.id}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedIds.has(order.id)}
                            onCheckedChange={() => toggleSelect(order.id)}
                          />
                          <span className="font-medium text-sm">
                            {order.orderNumber}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn('text-xs', trackingStatus.className)}
                        >
                          {trackingStatus.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div>
                          <span className="text-muted-foreground">거래처: </span>
                          {order.client?.clientName ?? '-'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">수령인: </span>
                          {order.shipping?.recipientName ?? '-'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">송장: </span>
                          <span className="font-mono">
                            {order.shipping?.trackingNumber ?? '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">날짜: </span>
                          {order.orderedAt
                            ? format(new Date(order.orderedAt), 'MM.dd', { locale: ko })
                            : '-'}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs"
                          onClick={() =>
                            setShippingDialogState({
                              open: true,
                              orderId: order.id,
                              orderNumber: order.orderNumber,
                              courierCode: order.shipping?.courierCode,
                              trackingNumber: order.shipping?.trackingNumber,
                            })
                          }
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          송장입력
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs"
                          onClick={() => handlePrintLabel(order.id)}
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          운송장출력
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 페이지네이션 */}
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    전체 {meta.total}건 중 {(meta.page - 1) * limit + 1}-
                    {Math.min(meta.page * limit, meta.total)}건
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm px-2">
                      {meta.page} / {meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.page >= meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 다이얼로그들 */}
      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
      />
      <BundleShippingDialog open={bundleOpen} onOpenChange={setBundleOpen} />
      <ShippingInputDialog
        open={shippingDialogState.open}
        onOpenChange={(open) =>
          setShippingDialogState((prev) => ({ ...prev, open }))
        }
        orderId={shippingDialogState.orderId}
        orderNumber={shippingDialogState.orderNumber}
        currentCourierCode={shippingDialogState.courierCode}
        currentTrackingNumber={shippingDialogState.trackingNumber}
      />
    </div>
  );
}

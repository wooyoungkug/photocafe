'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Package,
  Clock,
  Truck,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Eye,
  FileText,
  ClipboardCheck,
  Printer,
  PackageCheck,
  ImageIcon,
  Receipt,
  Search,
  CalendarIcon,
  Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { ProcessHistoryDialog } from '@/components/order/process-history-dialog';
import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// 취소 가능 상태 (출력 전 단계)
const CANCELLABLE_STATUSES = ['pending_receipt', 'receipt_completed'];

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
  cancelled: { label: '취소', className: 'bg-gray-100 text-gray-500 line-through' },
};

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}

interface OrderItem {
  id: string;
  productionNumber: string;
  productName: string;
  size: string;
  pages: number;
  printMethod: string;
  paper: string;
  bindingType: string;
  coverMaterial?: string;
  foilName?: string;
  foilColor?: string;
  fabricName?: string;
  finishingOptions: string[];
  thumbnailUrl?: string;
  totalFileSize?: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  orderedAt: string;
  isUrgent: boolean;
  finalAmount: number;
  client?: { clientName: string };
  _count?: { items: number };
  items?: OrderItem[];
  processHistory?: { id: string; toStatus: string; processType: string; processedBy: string; processedByName?: string; processedAt: string }[];
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  // 조회조건 상태
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState(() => format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [searchType, setSearchType] = useState<'orderNumber' | 'productName' | 'orderTitle' | 'spec'>('orderNumber');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedSearchType, setAppliedSearchType] = useState<string>('orderNumber');
  const [appliedStartDate, setAppliedStartDate] = useState(() => format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [appliedEndDate, setAppliedEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [limit, setLimit] = useState(30);

  // 체크박스 상태
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // 썸네일 미리보기
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // 공정 이력 다이얼로그
  const [historyOrderId, setHistoryOrderId] = useState<string | null>(null);
  const [historyOrderNumber, setHistoryOrderNumber] = useState<string>('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // 주문 목록 조회
  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ['orders', user?.clientId, statusFilter, page, limit, appliedSearch, appliedSearchType, appliedStartDate, appliedEndDate],
    queryFn: async () => {
      const params: Record<string, string> = {
        clientId: user?.clientId || '',
        page: String(page),
        limit: String(limit),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(appliedSearch && { search: appliedSearch, searchType: appliedSearchType }),
        ...(appliedStartDate && { startDate: appliedStartDate }),
        ...(appliedEndDate && { endDate: appliedEndDate }),
      };
      return api.get<{ data: Order[]; meta: { total: number; page: number; limit: number; totalPages: number } }>('/orders', params);
    },
    enabled: isAuthenticated && !!user?.clientId,
  });

  // 상태별 카운트
  const { data: allOrders } = useQuery({
    queryKey: ['orders', user?.clientId, 'counts'],
    queryFn: async () => {
      return api.get<{ data: Order[]; meta: any }>('/orders', {
        clientId: user?.clientId || '',
        limit: '1000',
      });
    },
    enabled: isAuthenticated && !!user?.clientId,
  });

  const orders = ordersResponse?.data ?? [];
  const meta = ordersResponse?.meta;

  // 상태별 카운트 계산
  const statusCounts: Record<string, number> = {};
  let totalCount = 0;
  if (allOrders?.data) {
    allOrders.data.forEach((order) => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      totalCount++;
    });
  }
  const getCount = (key: string) => key === 'all' ? totalCount : (statusCounts[key] || 0);

  // 취소 가능한 선택된 주문
  const cancellableSelected = useMemo(() => {
    return orders.filter(o => selectedOrders.has(o.id) && CANCELLABLE_STATUSES.includes(o.status));
  }, [orders, selectedOrders]);

  // 전체 취소 가능 주문
  const allCancellable = useMemo(() => {
    return orders.filter(o => CANCELLABLE_STATUSES.includes(o.status));
  }, [orders]);

  // 기간 단축 버튼
  const setPeriod = (type: 'today' | '1week' | '1month' | '3months' | '6months' | '1year') => {
    const now = new Date();
    const end = format(now, 'yyyy-MM-dd');
    let start: string;
    switch (type) {
      case 'today': start = end; break;
      case '1week': start = format(subDays(now, 7), 'yyyy-MM-dd'); break;
      case '1month': start = format(subMonths(now, 1), 'yyyy-MM-dd'); break;
      case '3months': start = format(subMonths(now, 3), 'yyyy-MM-dd'); break;
      case '6months': start = format(subMonths(now, 6), 'yyyy-MM-dd'); break;
      case '1year': start = format(subYears(now, 1), 'yyyy-MM-dd'); break;
    }
    setStartDate(start);
    setEndDate(end);
  };

  // 조회 실행
  const handleSearch = () => {
    setAppliedSearch(searchKeyword);
    setAppliedSearchType(searchType);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setPage(1);
    setSelectedOrders(new Set());
  };

  // 체크박스 핸들러
  const toggleOrder = (orderId: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedOrders.size === allCancellable.length && allCancellable.length > 0) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(allCancellable.map(o => o.id)));
    }
  };

  // 주문 취소 실행
  const handleCancelOrders = async () => {
    if (cancellableSelected.length === 0) return;
    setIsCancelling(true);
    try {
      await Promise.all(
        cancellableSelected.map(order =>
          api.patch(`/orders/${order.id}/cancel`, { reason: '고객 요청 취소' })
        )
      );
      toast({ title: '주문 취소 완료', description: `${cancellableSelected.length}건의 주문이 취소되었습니다.` });
      setSelectedOrders(new Set());
      setShowCancelDialog(false);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (error) {
      toast({ title: '취소 실패', description: '주문 취소 중 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setIsCancelling(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">로그인이 필요한 서비스입니다.</p>
            <Button onClick={() => router.push('/login?redirect=/mypage/orders')}>
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        <h1 className="text-xl font-bold">주문완료 배송조회</h1>
      </div>

      {/* 조회조건 (성원애드피아 스타일) */}
      <Card>
        <CardContent className="py-4 space-y-3">
          {/* 기간 */}
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="text-sm font-semibold w-12 shrink-0">기간</Label>
            <div className="flex items-center gap-1">
              {[
                { label: '오늘', value: 'today' as const },
                { label: '1주일', value: '1week' as const },
                { label: '3개월', value: '3months' as const },
                { label: '6개월', value: '6months' as const },
                { label: '1년', value: '1year' as const },
              ].map((btn) => (
                <Button
                  key={btn.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs px-3"
                  onClick={() => setPeriod(btn.value)}
                >
                  {btn.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs pl-7 w-[140px]"
                />
              </div>
              <span className="text-muted-foreground text-xs">~</span>
              <div className="relative">
                <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs pl-7 w-[140px]"
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={handleSearch}
              className="h-8 px-6 text-xs bg-orange-500 hover:bg-orange-600 text-white ml-auto"
            >
              <Search className="h-3.5 w-3.5 mr-1" />
              조회
            </Button>
          </div>
          {/* 검색어 */}
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="text-sm font-semibold w-12 shrink-0">검색어</Label>
            <RadioGroup
              value={searchType}
              onValueChange={(v) => setSearchType(v as typeof searchType)}
              className="flex items-center gap-4"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="orderNumber" id="st-orderNumber" />
                <Label htmlFor="st-orderNumber" className="text-xs cursor-pointer">주문번호</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="productName" id="st-productName" />
                <Label htmlFor="st-productName" className="text-xs cursor-pointer">주문내용</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="orderTitle" id="st-orderTitle" />
                <Label htmlFor="st-orderTitle" className="text-xs cursor-pointer">주문제목</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="spec" id="st-spec" />
                <Label htmlFor="st-spec" className="text-xs cursor-pointer">재질 및 규격</Label>
              </div>
            </RadioGroup>
            <Input
              placeholder="검색어를 입력하세요"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-8 text-xs w-[200px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* 진행단계 아이콘 네비게이션 */}
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
                  onClick={() => { setStatusFilter(stage.key); setPage(1); setSelectedOrders(new Set()); }}
                  className={cn(
                    'flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-all min-w-[72px]',
                    isActive ? `${stage.activeBg} ${stage.border} border-2 shadow-sm` : 'border-2 border-transparent hover:bg-muted'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', isActive ? stage.activeBg : stage.bg)}>
                    <Icon className={cn('h-5 w-5', stage.color)} />
                  </div>
                  <span className={cn('text-xs', isActive ? stage.color : 'text-muted-foreground')}>{stage.label}</span>
                  <span className={cn('text-sm', isActive ? stage.color : 'text-foreground', count > 0 ? '' : 'text-muted-foreground')}>({count})</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 조회결과 + 선택취소 버튼 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          조회결과 : <span className="text-foreground">{meta?.total || 0}</span> 건
        </span>
        <div className="flex items-center gap-2">
          {cancellableSelected.length > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowCancelDialog(true)}
            >
              <Ban className="h-3.5 w-3.5 mr-1" />
              선택 주문취소 ({cancellableSelected.length}건)
            </Button>
          )}
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="h-8 text-xs border rounded px-2"
            aria-label="페이지당 표시 건수"
          >
            <option value={20}>20개씩</option>
            <option value={30}>30개씩</option>
            <option value={50}>50개씩</option>
            <option value={100}>100개씩</option>
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
                    <TableHead className="text-center w-[40px]">
                      <Checkbox
                        checked={allCancellable.length > 0 && selectedOrders.size === allCancellable.length}
                        onCheckedChange={toggleAll}
                        aria-label="전체 선택"
                      />
                    </TableHead>
                    <TableHead className="text-center w-[120px] text-xs">주문일<br />(주문번호)</TableHead>
                    <TableHead className="w-[50px] text-center text-xs">썸네일</TableHead>
                    <TableHead className="text-xs">상품명 / 주문제목 / 재질 및 규격</TableHead>
                    <TableHead className="text-center w-[70px] text-xs">페이지<br />/ 부수</TableHead>
                    <TableHead className="text-center w-[65px] text-xs">용량</TableHead>
                    <TableHead className="text-right w-[90px] text-xs">주문금액</TableHead>
                    <TableHead className="text-center w-[70px] text-xs">진행상황</TableHead>
                    <TableHead className="text-center w-[90px] text-xs">확인/취소</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const items = order.items || [];
                    const statusBadge = STATUS_BADGE[order.status] || STATUS_BADGE.pending_receipt;
                    const isCancellable = CANCELLABLE_STATUSES.includes(order.status);

                    return items.map((item, idx) => (
                      <TableRow
                        key={item.id}
                        className={cn(
                          'hover:bg-muted/30',
                          idx > 0 ? 'border-t border-dashed' : '',
                          order.isUrgent ? 'bg-red-50/30' : '',
                          order.status === 'cancelled' ? 'opacity-50' : '',
                        )}
                      >
                        {/* 체크박스 - 첫 번째 항목에만 */}
                        {idx === 0 && (
                          <TableCell className="text-center align-top pt-3" rowSpan={items.length}>
                            {isCancellable ? (
                              <Checkbox
                                checked={selectedOrders.has(order.id)}
                                onCheckedChange={() => toggleOrder(order.id)}
                                aria-label={`${order.orderNumber} 선택`}
                              />
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        )}

                        {/* 주문일(주문번호) */}
                        {idx === 0 && (
                          <TableCell className="text-center align-top pt-3" rowSpan={items.length}>
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(order.orderedAt), 'yyyy-MM-dd', { locale: ko })}
                              </div>
                              <Link href={`/mypage/orders/${order.id}`} className="text-xs text-primary hover:underline">
                                {order.orderNumber}
                              </Link>
                              {order.isUrgent && <Badge variant="destructive" className="text-[10px] px-1 py-0">긴급</Badge>}
                            </div>
                          </TableCell>
                        )}

                        <TableCell className="text-center">
                          <div
                            className={cn(
                              'w-10 h-10 mx-auto bg-gray-100 rounded overflow-hidden flex items-center justify-center',
                              item.thumbnailUrl && 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all'
                            )}
                            onClick={() => item.thumbnailUrl && setPreviewImage({ url: item.thumbnailUrl, name: item.productName })}
                          >
                            {item.thumbnailUrl ? (
                              <Image src={item.thumbnailUrl} alt={item.productName} width={40} height={40} className="object-cover w-full h-full" />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-gray-300" />
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm leading-tight line-clamp-1">{item.productName}</p>
                            <div className="text-xs text-muted-foreground leading-tight">
                              {item.size} / {item.printMethod} / {item.paper}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.bindingType && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{item.bindingType}</Badge>}
                              {item.coverMaterial && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{item.coverMaterial}</Badge>}
                              {item.fabricName && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">원단:{item.fabricName}</Badge>}
                              {item.foilColor && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">박:{item.foilColor}</Badge>}
                              {item.finishingOptions?.map((opt, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] px-1 py-0 h-4">{opt}</Badge>
                              ))}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-center text-xs">
                          <div>{item.pages}p</div>
                          <div>{item.quantity}건</div>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">{formatFileSize(Number(item.totalFileSize))}</TableCell>

                        {idx === 0 && (
                          <TableCell className="text-right align-top pt-3 text-sm" rowSpan={items.length}>
                            {Number(order.finalAmount).toLocaleString()}원
                          </TableCell>
                        )}

                        {idx === 0 && (
                          <TableCell className="text-center align-top pt-3" rowSpan={items.length}>
                            <div className="space-y-1">
                              <Badge className={cn('text-xs', statusBadge.className)}>
                                {statusBadge.label}
                              </Badge>
                              <div
                                className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                                onClick={() => {
                                  setHistoryOrderId(order.id);
                                  setHistoryOrderNumber(order.orderNumber);
                                  setIsHistoryOpen(true);
                                }}
                              >
                                {order.processHistory?.[0]?.processedByName || '-'}
                              </div>
                            </div>
                          </TableCell>
                        )}

                        {idx === 0 && (
                          <TableCell className="text-center align-top pt-3" rowSpan={items.length}>
                            <div className="flex flex-col gap-1">
                              <Link href={`/mypage/orders/${order.id}`}>
                                <Button variant="outline" size="sm" className="w-full text-xs h-7">
                                  <Eye className="h-3 w-3 mr-1" />상세보기
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs h-7 text-green-700 hover:text-green-800"
                                onClick={() => window.open(`/mypage/orders/${order.id}/receipt`, '_blank', 'width=800,height=900,scrollbars=yes')}
                              >
                                <Receipt className="h-3 w-3 mr-1" />거래명세서
                              </Button>
                              {order.status === 'shipped' && (
                                <Button variant="ghost" size="sm" className="w-full text-xs h-7 text-muted-foreground">
                                  <Truck className="h-3 w-3 mr-1" />배송조회
                                </Button>
                              )}
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
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                <Button key={p} variant={page === p ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setPage(p)}>{p}</Button>
              ))}
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(Math.min(meta.totalPages, page + 1))} disabled={page === meta.totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">주문 내역이 없습니다</h3>
            <p className="text-gray-500 mb-6">상품을 주문하고 진행상황을 확인하세요</p>
            <Link href="/"><Button>쇼핑 시작하기<ChevronRight className="h-4 w-4 ml-1" /></Button></Link>
          </CardContent>
        </Card>
      )}

      {/* 주문 취소 확인 다이얼로그 */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>주문 취소 확인</DialogTitle>
            <DialogDescription>
              선택한 {cancellableSelected.length}건의 주문을 취소하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {cancellableSelected.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                <div>
                  <span className="font-medium">{order.orderNumber}</span>
                  <span className="text-muted-foreground ml-2">
                    {order.items?.[0]?.productName}
                    {(order.items?.length || 0) > 1 && ` 외 ${(order.items?.length || 0) - 1}건`}
                  </span>
                </div>
                <span className="font-bold">{Number(order.finalAmount).toLocaleString()}원</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-destructive">
            * 출력(생산) 진행 전 주문만 취소 가능합니다. 취소 후에는 복구할 수 없습니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={isCancelling}>
              닫기
            </Button>
            <Button variant="destructive" onClick={handleCancelOrders} disabled={isCancelling}>
              {isCancelling ? '취소 처리 중...' : '주문 취소'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 썸네일 미리보기 다이얼로그 */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-lg p-2">
          <DialogHeader className="px-2 pt-2">
            <DialogTitle className="text-sm">{previewImage?.name}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="relative w-full aspect-square bg-gray-50 rounded overflow-hidden">
              <Image
                src={previewImage.url}
                alt={previewImage.name}
                fill
                className="object-contain"
                sizes="(max-width: 512px) 100vw, 512px"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 공정 이력 다이얼로그 */}
      <ProcessHistoryDialog
        orderId={historyOrderId}
        orderNumber={historyOrderNumber}
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
      />
    </div>
  );
}

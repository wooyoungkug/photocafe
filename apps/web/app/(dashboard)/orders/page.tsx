'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  Package,
  Search,
  FileText,
  Clock,
  ExternalLink,
  Download,
  Trash2,
  Truck,
  Loader2,
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
import { useInfiniteOrders, useProductionStageCounts, Order, OrderItem, ORDER_STATUS_LABELS, useConfirmOrderItemSlipPrinted } from '@/hooks/use-orders';
import { useScanPrintQueueToFinishing } from '@/hooks/use-print-pdf';
import { BulkActionToolbar } from './components/bulk-action-toolbar';
import { OrderQuickEditDialog } from './components/order-quick-edit-dialog';
import { ConfirmActionDialog } from './components/confirm-action-dialog';
import { ProcessHistoryDialog } from '@/components/order/process-history-dialog';
import { ShippingInputDialog } from '@/components/order/shipping-input-dialog';
import { useDeleteOrderOriginals } from '@/hooks/use-order-bulk-actions';
import { useCourierList } from '@/hooks/use-delivery-tracking';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { ko } from 'date-fns/locale';

type DateRangePreset = '1w' | '1m' | '3m' | '6m' | '1y' | 'custom';

const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  '1w': '1주일',
  '1m': '1개월',
  '3m': '3개월',
  '6m': '6개월',
  '1y': '1년',
  'custom': '기간별',
};

function computeDateRange(
  range: DateRangePreset,
  customStart: string,
  customEnd: string,
): { startDate?: string; endDate?: string } {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  switch (range) {
    case '1w':
      return { startDate: format(subDays(now, 7), 'yyyy-MM-dd'), endDate: today };
    case '1m':
      return { startDate: format(subMonths(now, 1), 'yyyy-MM-dd'), endDate: today };
    case '3m':
      return { startDate: format(subMonths(now, 3), 'yyyy-MM-dd'), endDate: today };
    case '6m':
      return { startDate: format(subMonths(now, 6), 'yyyy-MM-dd'), endDate: today };
    case '1y':
      return { startDate: format(subYears(now, 1), 'yyyy-MM-dd'), endDate: today };
    case 'custom':
      // custom 인데 한쪽이라도 비어있으면 미적용
      if (!customStart || !customEnd) return {};
      return { startDate: customStart, endDate: customEnd };
    default:
      return {};
  }
}
import { cn } from '@/lib/utils';
import { api, API_URL } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { displayFinalAmount, isOrderCancelled } from '@/lib/order-display';

// 출력대기 PDF 변환 진행상황 뱃지 매핑 (PrintQueueTable 과 동일)
const PDF_INDIGO_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: '대기', className: 'bg-gray-100 text-black' },
  in_progress: { label: '변환중', className: 'bg-blue-100 text-black' },
  generating: { label: '변환중', className: 'bg-blue-100 text-black' },
  completed: { label: '성공', className: 'bg-green-100 text-black' },
  failed: { label: '변환에러', className: 'bg-red-100 text-red-600' },
};
const PDF_INKJET_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: '데이타대기', className: 'bg-gray-100 text-black' },
  in_progress: { label: '생성중', className: 'bg-blue-100 text-black' },
  generating: { label: '생성중', className: 'bg-blue-100 text-black' },
  completed: { label: '출력데이타생성', className: 'bg-green-100 text-black' },
  failed: { label: '데이터에러', className: 'bg-red-100 text-red-600' },
};
function getPdfBadge(pdfStatus?: string, printMethod?: string) {
  const status = pdfStatus || 'pending';
  const isInkjet = (printMethod || '').toLowerCase().includes('inkjet');
  const map = isInkjet ? PDF_INKJET_BADGE : PDF_INDIGO_BADGE;
  return map[status] || map.pending;
}

/** 취소 주문「확인」열: 택배·PDF 세부 공정 */
function CancelledOrderDeliveryPdfSummary({
  order,
  items,
  getCourierName,
}: {
  order: Order;
  items: NonNullable<Order['items']>;
  getCourierName: (code?: string) => string;
}) {
  const ship = order.shipping;
  const hasFullInvoice = !!(ship?.courierCode && ship?.trackingNumber);

  return (
    <div className="space-y-2 text-[11px] text-left w-full max-w-[168px] mx-auto">
      <div className="space-y-1 rounded border border-gray-200 bg-slate-50/70 px-2 py-1.5">
        <div className="text-black font-medium text-[12px]">택배</div>
        {hasFullInvoice ? (
          <>
            <div className="text-black font-normal">{getCourierName(ship!.courierCode)}</div>
            <div className="text-gray-600 font-mono text-[10px] break-all leading-tight">{ship!.trackingNumber}</div>
          </>
        ) : ship?.courierCode || ship?.trackingNumber ? (
          <div className="text-gray-600 space-y-0.5">
            {ship?.courierCode ? <div>{getCourierName(ship.courierCode)}</div> : null}
            {ship?.trackingNumber ? (
              <div className="font-mono text-[10px] break-all">{ship.trackingNumber}</div>
            ) : null}
            <span className="text-amber-700 text-[10px]">택배사·송장 중 일부만 등록됨</span>
          </div>
        ) : (
          <span className="text-gray-400">송장 미등록</span>
        )}
      </div>

      <div className="space-y-1.5 rounded border border-gray-200 bg-slate-50/70 px-2 py-1.5">
        <div className="text-black font-medium text-[12px]">PDF 공정</div>
        {items.length === 0 ? (
          <span className="text-gray-400">품목 없음</span>
        ) : (
          items.map((it) => {
            const badgeInfo = getPdfBadge(it.pdfStatus, it.printMethod);
            const canOpenPdf = (it.pdfStatus || 'pending') === 'completed';
            const pdfUrl = `${API_URL}/print-pdf/items/${it.id}/pdf`;
            const textColorClass = badgeInfo.className.split(' ').filter((c) => c.startsWith('text-')).join(' ');
            return (
              <div key={it.id} className="space-y-0.5 border-b border-gray-100 pb-1.5 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  {canOpenPdf ? (
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer" title="인쇄용 PDF">
                      <span className={cn('text-[11px] font-normal hover:underline', textColorClass)}>{badgeInfo.label}</span>
                    </a>
                  ) : (
                    <span className={cn('text-[11px] font-normal', textColorClass)}>{badgeInfo.label}</span>
                  )}
                  <a
                    href={`/print-slip/${it.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    지시서
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function itemNeedsPrintOutputCheck(item: OrderItem) {
  return Number(item.totalFileSize ?? 0) > 0 || !!(item.files && item.files.length > 0);
}

/** 접수완료: 품목별 PDF·지시서 완료 여부 + 수동 지시서 확정 */
function ReceiptCompletedOutputCell({
  order,
  items,
}: {
  order: Order;
  items: NonNullable<Order['items']>;
}) {
  const confirmSlip = useConfirmOrderItemSlipPrinted();
  const [regenBusy, setRegenBusy] = useState(false);

  const candidates = items.filter(itemNeedsPrintOutputCheck);
  if (candidates.length === 0) {
    return <span className="text-[13px] text-black font-normal">인쇄 파일 없음</span>;
  }

  const anyPdfFailed = candidates.some((it) => it.pdfStatus === 'failed');

  const onRegen = async () => {
    setRegenBusy(true);
    try {
      await api.post(`/orders/${order.id}/regenerate-pdf`);
      toast({ title: 'PDF 재생성을 시작했습니다.' });
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      toast({ title: 'PDF 재생성 요청 실패', description: m, variant: 'destructive' });
    } finally {
      setRegenBusy(false);
    }
  };

  return (
    <div className="space-y-2 text-left w-full max-w-[200px] mx-auto">
      {candidates.map((it) => {
        const pdfOk = (it.pdfStatus || '') === 'completed';
        const slipOk = !!it.slipAutoPrintedAt;
        const pdfUrl = `${API_URL}/print-pdf/items/${it.id}/pdf`;
        return (
          <div key={it.id} className="rounded border border-gray-200 bg-slate-50/70 px-2 py-1.5 space-y-1">
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-center text-[11px] text-black font-normal">
              {pdfOk ? (
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 font-medium hover:underline">
                  PDF
                </a>
              ) : (
                <span className="text-red-600" title={it.pdfStatus === 'failed' ? 'PDF 변환 실패' : undefined}>
                  PDF {it.pdfStatus === 'failed' ? '실패' : it.pdfStatus === 'generating' ? '생성 중' : '대기'}
                </span>
              )}
              {slipOk ? (
                <span className="text-green-700 font-medium">지시서</span>
              ) : (
                <span className="text-red-600">지시서 대기</span>
              )}
            </div>
            <div className="flex flex-col gap-1 pt-0.5">
              <a
                href={`/print-slip/${it.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 hover:underline text-center"
              >
                지시서 열기
              </a>
              {pdfOk && !slipOk && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] font-normal text-black"
                  disabled={confirmSlip.isPending}
                  onClick={() =>
                    confirmSlip.mutate(it.id, {
                      onSuccess: () =>
                        toast({ title: '지시서 출력 완료로 기록했습니다.' }),
                      onError: (err: Error) =>
                        toast({ variant: 'destructive', title: '기록 실패', description: err.message }),
                    })
                  }
                >
                  출력 완료 기록
                </Button>
              )}
            </div>
          </div>
        );
      })}
      {anyPdfFailed && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full h-7 text-[11px]"
          disabled={regenBusy}
          onClick={onRegen}
        >
          {regenBusy ? '요청 중…' : 'PDF 재생성'}
        </Button>
      )}
    </div>
  );
}

// 진행상황 뱃지 스타일
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending_receipt: { label: '접수대기', className: 'bg-orange-100 text-orange-700' },
  receipt_completed: { label: '접수완료', className: 'bg-blue-100 text-blue-700' },
  in_production: { label: '생산진행', className: 'bg-purple-100 text-purple-700' },
  print_waiting: { label: '출력대기', className: 'bg-cyan-100 text-cyan-700' },
  ready_for_shipping: { label: '제작완료', className: 'bg-indigo-100 text-indigo-700' },
  shipped: { label: '거래완료', className: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소', className: 'bg-gray-100 text-gray-500' },
};

// 상태 필터 옵션
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'pending_receipt', label: '접수대기' },
  { value: 'receipt_completed', label: '접수완료' },
  { value: 'in_production', label: '생산진행' },
  { value: 'print_waiting', label: '출력대기' },
  { value: 'ready_for_shipping', label: '제작완료' },
  { value: 'shipped', label: '거래완료' },
  { value: 'cancelled', label: '취소' },
];

/** 주문목록(/) 세부 공정 탭 — API productionStage 와 동일 id */
const PRODUCTION_STAGE_TABS = [
  { id: 'all', label: '전체' },
  { id: 'reception_hold', label: '접수보류' },
  { id: 'reception_pending', label: '접수대기' },
  { id: 'reception_done', label: '접수완료' },
  { id: 'print_queue', label: '출력대기' },
  { id: 'data_inspection', label: '데이타검수중' },
  { id: 'finishing_wait', label: '후가공대기' },
  { id: 'finishing_progress', label: '후가공진행중' },
  { id: 'outbound_qc', label: '출고검수중' },
  { id: 'shipping_progress', label: '배송중' },
  { id: 'shipping_done', label: '배송완료' },
] as const;

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
  const pathname = usePathname();
  const isPendingPage = pathname?.endsWith('/orders/pending') ?? false;

  const [statusFilter, setStatusFilter] = useState<string>(
    isPendingPage ? 'pending_receipt' : 'all',
  );
  /** 주문목록(/) 전용 — 세부 공정 탭 */
  const [productionStage, setProductionStage] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const limit = 20;

  // 검색어 300ms 디바운스
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [search]);

  // 기간별 검색 필터 (접수대기 페이지에서는 사용 안 함)
  const [dateRange, setDateRange] = useState<DateRangePreset>('1m');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const dateParams = useMemo(
    () => (isPendingPage ? {} : computeDateRange(dateRange, customStart, customEnd)),
    [isPendingPage, dateRange, customStart, customEnd],
  );

  const { data: stageCounts } = useProductionStageCounts(
    isPendingPage ? undefined : debouncedSearch ? { search: debouncedSearch } : dateParams,
  );

  // 체크박스 선택 상태
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // 주문 상세 수정 다이얼로그
  const [quickEditOrder, setQuickEditOrder] = useState<Order | null>(null);
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);

  // 공정 이력 다이얼로그
  const [historyOrderId, setHistoryOrderId] = useState<string | null>(null);
  const [historyOrderNumber, setHistoryOrderNumber] = useState<string>('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // 송장 입력 다이얼로그
  const [shippingOrder, setShippingOrder] = useState<Order | null>(null);
  const [isShippingDialogOpen, setIsShippingDialogOpen] = useState(false);

  // 원본 이미지 다운로드/삭제
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [deleteOriginalsOrderId, setDeleteOriginalsOrderId] = useState<string | null>(null);
  const [deleteOriginalsDialog, setDeleteOriginalsDialog] = useState(false);
  const deleteOrderOriginals = useDeleteOrderOriginals();
  const scanToFinishing = useScanPrintQueueToFinishing();

  // 주문 목록 조회 (cursor 무한스크롤 — 필터 변경 시 queryKey 교체로 자동 리셋)
  const {
    data: ordersInfinite,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteOrders(
    isPendingPage
      ? {
          limit,
          search: debouncedSearch || undefined,
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        }
      : {
          limit,
          search: debouncedSearch || undefined,
          ...(productionStage !== 'all' ? { productionStage } : {}),
          ...(debouncedSearch ? {} : dateParams),
        },
  );

  const orders = ordersInfinite?.pages.flatMap((p) => p.data) ?? [];
  const meta = ordersInfinite?.pages[0]?.meta;

  const { data: couriers = [] } = useCourierList();
  const getCourierName = (code?: string) => couriers.find((c) => c.code === code)?.name ?? code ?? '-';

  // 라우트 전환: 접수대기 전용 ↔ 일반 목록
  useEffect(() => {
    setProductionStage('all');
  }, [isPendingPage]);

  // 필터 변경 시 선택 초기화
  useEffect(() => {
    setSelectedOrderIds(new Set());
  }, [statusFilter, productionStage, search]);

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

  // 원본 이미지 다운로드
  const handleDownloadOriginals = async (orderId: string, orderNumber: string) => {
    try {
      setIsDownloading(orderId);
      await api.downloadBlob(`/orders/${orderId}/download-originals`, `${orderNumber}_originals.zip`);
      toast({ title: '원본 이미지 다운로드 완료' });
    } catch (err: any) {
      toast({ title: err.message || '다운로드 실패', variant: 'destructive' });
    } finally {
      setIsDownloading(null);
    }
  };

  // 원본 이미지 삭제
  const handleDeleteOriginals = () => {
    if (!deleteOriginalsOrderId) return;
    deleteOrderOriginals.mutate(deleteOriginalsOrderId, {
      onSuccess: (result: any) => {
        toast({ title: `원본 삭제 완료: ${result.totalFreedMB || 0}MB 확보` });
        setDeleteOriginalsDialog(false);
        setDeleteOriginalsOrderId(null);
      },
      onError: (err: any) => {
        toast({ title: err.message || '원본 삭제 실패', variant: 'destructive' });
      },
    });
  };

  // 회원 임퍼스네이션: 해당 거래처로 쇼핑몰 로그인 (관리자 토큰 보존)
  const handleImpersonate = async (clientId: string, orderId?: string) => {
    // 팝업 차단 방지: async/await 이전, 사용자 제스처 컨텍스트에서 새 탭 먼저 열기
    const newTab = window.open('about:blank', '_blank');
    try {
      const res = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; name: string; role: string; clientId: string; clientName: string };
      }>(`/auth/impersonate/${clientId}`);

      // 별도 키에 대리로그인 데이터 저장 (관리자 토큰은 건드리지 않음)
      localStorage.setItem('impersonate-data', JSON.stringify({
        user: res.user,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      }));

      // 미리 열어둔 탭으로 이동 — orderId 있으면 해당 주문 상세, 없으면 주문목록
      const dest = orderId ? `/mypage/orders/${orderId}` : '/mypage/orders';
      if (newTab) {
        newTab.location.href = dest;
      } else {
        window.open(dest, '_blank');
      }
    } catch {
      if (newTab) newTab.close();
      toast({ title: '회원 로그인에 실패했습니다.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더: 제목 + 기간필터 + 검색(중앙) */}
      <div className="relative flex items-center gap-2 sm:gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2 shrink-0">
          {isPendingPage ? <Clock className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          {isPendingPage ? '접수대기' : '주문목록'}
        </h1>

        {/* 주문목록: 기간필터 + 검색창 — 우측 정렬 */}
        {!isPendingPage && (
          <div className="ml-auto flex items-center gap-3">
            {/* 기간별 필터 */}
            <div className="flex items-center gap-2">
              {(['1w', '1m', '3m', '6m', '1y', 'custom'] as const).map((v) => (
                <label
                  key={v}
                  className="flex items-center gap-1 cursor-pointer text-[13px] text-black"
                >
                  <input
                    type="radio"
                    name="dateRange"
                    value={v}
                    checked={dateRange === v}
                    onChange={() => setDateRange(v)}
                    className="accent-black"
                  />
                  {DATE_RANGE_LABELS[v]}
                </label>
              ))}
              {dateRange === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    aria-label="조회 시작일"
                    title="조회 시작일"
                    className="border border-gray-300 rounded h-8 px-2 text-[13px]"
                  />
                  <span className="text-[13px]">~</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    aria-label="조회 종료일"
                    title="조회 종료일"
                    className="border border-gray-300 rounded h-8 px-2 text-[13px]"
                  />
                </div>
              )}
            </div>
            {/* 검색창 */}
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="주문번호·검색 후 Enter → 후가공대기"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  const q = search.trim();
                  if (!q || scanToFinishing.isPending) return;
                  scanToFinishing.mutate(q, {
                    onSuccess: (res) => {
                      if (res.already) {
                        toast({ title: res.message || '이미 후가공대기입니다.' });
                      } else {
                        toast({ title: '후가공대기로 이동했습니다.', description: `${res.orderNumber} · ${res.studioName || ''}` });
                      }
                      setProductionStage('finishing_wait');
                    },
                    onError: (err: unknown) => {
                      const m = err instanceof Error ? err.message : String(err);
                      toast({ title: '후가공대기 이동 실패', description: m, variant: 'destructive' });
                    },
                  });
                }}
                disabled={scanToFinishing.isPending}
                className="pl-9 pr-9 h-9"
              />
              {(isLoading || debouncedSearch !== search) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        )}

        {/* 접수대기: 오른쪽 정렬 검색창 + 상태필터 */}
        {isPendingPage && (
          <div className="ml-auto flex items-center gap-2">
            <div className="relative w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="주문번호·거래처 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 h-9"
              />
              {(isLoading || debouncedSearch !== search) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); }}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>


      {!isPendingPage ? (
        <div
          role="tablist"
          aria-label="주문 공정별 필터"
          className="flex flex-wrap justify-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 -mx-0.5 px-0.5"
        >
          {PRODUCTION_STAGE_TABS.map((tab) => {
            const active = productionStage === tab.id;
            const count = tab.id !== 'all' ? (stageCounts?.[tab.id] ?? 0) : undefined;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active ? 'true' : 'false'}
                onClick={() => {
                  setProductionStage(tab.id);
                }}
                className={cn(
                  'shrink-0 rounded-md border px-2.5 py-1.5 text-[14px] font-normal transition-colors whitespace-nowrap',
                  active
                    ? 'border-black bg-black text-white'
                    : 'border-gray-300 bg-white text-black hover:bg-gray-50',
                )}
              >
                {tab.label}
                {count !== undefined && (
                  <span className={cn('ml-1 text-[12px] font-bold', active ? 'text-white' : 'text-blue-600')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedOrderIds.size > 0 && (
        <span className="text-sm text-blue-600 font-medium">{selectedOrderIds.size}건 선택됨</span>
      )}

      {/* 주문 테이블 */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      ) : orders.length > 0 ? (
        <>
          {/* ── 모바일 카드 뷰 ── */}
          <div className="md:hidden space-y-2">
            {orders.map((order) => {
              const items = order.items || [];
              const statusBadge =
                order.status === 'pending_receipt' && order.currentProcess === 'inspection'
                  ? { label: '파일검수 중', className: 'bg-yellow-100 text-yellow-700' }
                  : isOrderCancelled(order)
                    ? STATUS_BADGE.cancelled
                    : STATUS_BADGE[order.status] || STATUS_BADGE.pending_receipt;
              const isSelected = selectedOrderIds.has(order.id);

              return (
                <Card
                  key={order.id}
                  className={cn(
                    'overflow-hidden',
                    isSelected && 'ring-2 ring-blue-400',
                    order.isUrgent && 'border-red-200 bg-red-50/30'
                  )}
                >
                  <CardContent className="p-3 space-y-2">
                    {/* 상단: 체크박스 + 날짜/주문번호 + 상태 */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOrder(order.id)}
                          className="mt-0.5"
                          aria-label={`주문 ${order.orderNumber} 선택`}
                        />
                        <div>
                          <div className="text-[11px] text-muted-foreground">
                            {format(new Date(order.orderedAt), 'yy-MM-dd HH:mm', { locale: ko })}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              // 주문번호 클릭 → 사양 편집 다이얼로그 (대리로그인 X)
                              setQuickEditOrder(order);
                              setIsQuickEditOpen(true);
                            }}
                            className="text-sm font-semibold text-foreground hover:underline text-left"
                            title="주문 사양 편집"
                          >
                            {order.orderNumber}
                          </button>
                          <div className="flex items-center gap-1 mt-0.5">
                            {order.isUrgent && (
                              <Badge variant="destructive" className="text-[10px] px-1 py-0">긴급</Badge>
                            )}
                            {order.isDuplicateOverride && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-400 text-amber-600 bg-amber-50">중복주의</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge className={cn('text-[11px] font-semibold whitespace-nowrap shrink-0', statusBadge.className)}>
                        {statusBadge.label}
                      </Badge>
                    </div>

                    {/* 거래처 + 금액 */}
                    <div className="flex items-center justify-between text-sm">
                      <span
                        className="text-foreground font-medium flex items-center gap-0.5 cursor-pointer hover:underline"
                        onClick={() => handleImpersonate(order.clientId)}
                      >
                        {order.client?.clientName}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                      <span className="font-bold">
                        {displayFinalAmount(order).toLocaleString()}원
                      </span>
                    </div>

                    {/* 주문 항목들 */}
                    {items.map((item, idx) => (
                      <div
                        key={item.id}
                        className={cn(
                          'text-xs space-y-0.5',
                          idx > 0 && 'pt-1.5 border-t border-dashed'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground truncate">
                            {item.productName?.split(' - ')?.[0] || item.productName}
                          </span>
                          <span className="text-muted-foreground shrink-0">
                            {item.pages}p / {item.quantity}부
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {item.folderName || item.productName}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {[item.size, item.printMethod, item.paper, item.bindingType, item.coverMaterial].filter(Boolean).join(' / ')}
                        </div>
                      </div>
                    ))}

                    {/* 액션 버튼 */}
                    {order.status === 'ready_for_shipping' && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 text-blue-600"
                          onClick={() => {
                            setShippingOrder(order);
                            setIsShippingDialogOpen(true);
                          }}
                        >
                          <Truck className="h-3 w-3 mr-1" />
                          {order.shipping?.trackingNumber ? '송장확인' : '송장입력'}
                        </Button>
                      </div>
                    )}
                    {order.status === 'receipt_completed' && (
                      <div className="pt-2 border-t border-dashed">
                        <ReceiptCompletedOutputCell order={order} items={items} />
                      </div>
                    )}
                    {(order.status === 'print_waiting' || order.status === 'pending_receipt') && items[0] && (() => {
                      const first = items[0];
                      const badgeInfo = getPdfBadge(first.pdfStatus, first.printMethod);
                      const canOpenPdf = (first.pdfStatus || 'pending') === 'completed';
                      const slipDone = !!first.slipAutoPrintedAt;
                      const pdfUrl = `${API_URL}/print-pdf/items/${first.id}/pdf`;
                      const badge = (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[11px] px-2 py-0.5',
                            badgeInfo.className,
                            canOpenPdf && 'cursor-pointer hover:underline',
                          )}
                        >
                          {badgeInfo.label}
                        </Badge>
                      );
                      return (
                        <div className="flex flex-col gap-1 pt-1">
                          <div className="flex items-center gap-2">
                            {canOpenPdf ? (
                              <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="새 탭에서 PDF 열기"
                              >
                                {badge}
                              </a>
                            ) : (
                              badge
                            )}
                          </div>
                          <div className="text-[11px] text-black font-normal">
                            {slipDone ? (
                              <a href={`/print-slip/${first.id}`} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">
                                지시서
                              </a>
                            ) : (
                              <span className="text-red-600">지시서 대기</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    {isOrderCancelled(order) && (
                      <div className="pt-2 border-t border-dashed">
                        <CancelledOrderDeliveryPdfSummary
                          order={order}
                          items={items}
                          getCourierName={getCourierName}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── 데스크탑 테이블 뷰 ── */}
          <Card className="hidden md:block">
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
                    <TableHead className="text-center w-[160px] text-xs whitespace-nowrap">
                      주문일(주문번호)
                    </TableHead>
                    <TableHead className="text-center w-[100px] text-xs">회원정보<br />영업담당자</TableHead>
                    <TableHead className="text-xs w-[150px]">상품명</TableHead>
                    <TableHead className="text-xs w-[400px]">주문제목 / 재질 및 규격</TableHead>
                    <TableHead className="text-center w-[100px] text-xs">편집스타일<br />/ 제본순서</TableHead>
                    <TableHead className="text-center w-[80px] text-xs">페이지<br />/ 부수</TableHead>
                    <TableHead className="text-center w-[80px] text-xs">용량</TableHead>
                    <TableHead className="text-right w-[120px] text-xs">주문금액</TableHead>
                    <TableHead className="text-center w-[120px] text-xs">진행상황</TableHead>
                    <TableHead className="text-center w-[100px] text-xs">확인</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const items = order.items || [];
                    // 파일검수 중 상태 처리
                    const statusBadge =
                      order.status === 'pending_receipt' && order.currentProcess === 'inspection'
                        ? { label: '파일검수 중', className: 'bg-yellow-100 text-yellow-700' }
                        : isOrderCancelled(order)
                          ? STATUS_BADGE.cancelled
                          : STATUS_BADGE[order.status] || STATUS_BADGE.pending_receipt;
                    const isSelected = selectedOrderIds.has(order.id);

                    const hasOriginals = items.some((i: any) => i.originalFileCount > 0);

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
                            className="text-center align-middle"
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
                            className="text-center align-middle"
                            rowSpan={items.length}
                          >
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground whitespace-nowrap">
                                {format(new Date(order.orderedAt), 'yy-MM-dd HH:mm', { locale: ko })}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  // 주문번호 클릭 → 사양 편집 다이얼로그 (대리로그인 X)
                                  setQuickEditOrder(order);
                                  setIsQuickEditOpen(true);
                                }}
                                className="text-sm font-normal text-foreground hover:underline whitespace-nowrap text-left"
                                title="주문 사양 편집"
                              >
                                {order.orderNumber}
                              </button>
                              {order.isUrgent && (
                                <Badge variant="destructive" className="text-xs px-1 py-0">긴급</Badge>
                              )}
                              {order.isDuplicateOverride && (
                                <Badge variant="outline" className="text-xs px-1 py-0 border-amber-400 text-amber-600 bg-amber-50">중복주의</Badge>
                              )}
                            </div>
                          </TableCell>
                        )}

                        {/* 회원정보 + 영업담당자 - 클릭 시 회원 쇼핑몰로 이동 */}
                        {idx === 0 && (
                          <TableCell
                            className="text-center align-middle cursor-pointer hover:bg-blue-50/50"
                            rowSpan={items.length}
                            onClick={() => handleImpersonate(order.clientId)}
                          >
                            <div className="text-sm font-normal text-foreground hover:underline flex items-center justify-center gap-0.5 whitespace-nowrap">
                              {order.client?.clientName}
                              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            </div>
                            <div className="text-sm text-black mt-0.5">
                              {order.client?.managerName || order.client?.assignedStaff?.[0]?.staff?.name || '-'}
                            </div>
                          </TableCell>
                        )}

                        {/* 상품명 */}
                        <TableCell className="whitespace-nowrap text-center">
                          <p className="text-sm font-normal leading-tight text-center">
                            {item.productName?.split(' - ')?.[0] || item.productName}
                          </p>
                        </TableCell>

                        {/* 주문제목 / 재질 및 규격 - 클릭 시 검증 다이얼로그 */}
                        <TableCell
                          className="cursor-pointer hover:bg-blue-50/30 max-w-[400px]"
                          onClick={() => {
                            setQuickEditOrder(order);
                            setIsQuickEditOpen(true);
                          }}
                        >
                          <div className="space-y-0.5">
                            <div className="text-sm font-normal truncate text-foreground hover:underline" title={item.folderName || item.productName}>
                              {item.folderName || item.productName}
                            </div>
                            <div className="text-[13px] text-muted-foreground truncate" title={[item.size, item.printMethod, item.paper, item.bindingType, item.coverMaterial, item.fabricName ? `원단:${item.fabricName}` : '', item.foilName ? `동판:${item.foilName}` : '', item.foilColor ? `박:${item.foilColor}` : '', item.foilPosition ? `위치:${item.foilPosition}` : ''].filter(Boolean).join(' / ')}>
                              {item.size} / {item.printMethod} / {item.paper}
                              {item.bindingType && <> / {item.bindingType}</>}
                              {item.coverMaterial && <> / {item.coverMaterial}</>}
                              {item.fabricName && <> / 원단:{item.fabricName}</>}
                              {item.foilName && <> / 동판:{item.foilName}</>}
                              {item.foilColor && <> / 박:{item.foilColor}</>}
                              {item.foilPosition && <> / 위치:{item.foilPosition}</>}
                            </div>
                          </div>
                        </TableCell>

                        {/* 편집스타일 / 제본순서 */}
                        <TableCell className="text-center">
                          <div className="space-y-0.5">
                            <div className="text-sm">
                              {getPageLayoutLabel(item.pageLayout)}
                            </div>
                            <div className="text-[13px] text-muted-foreground">
                              {getBindingDirectionLabel(item.bindingDirection)}
                            </div>
                          </div>
                        </TableCell>

                        {/* 페이지 / 부수 */}
                        <TableCell className="text-center text-sm">
                          <div>{item.pages}p</div>
                          <div className={(item.quantity ?? 1) > 1 ? 'text-red-600 font-bold' : ''}>{item.quantity}부</div>
                        </TableCell>

                        {/* 용량 + 원본받기/삭제 */}
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {item.originalsDeleted ? (
                            <Badge variant="outline" className="text-xs px-1 py-0 border-red-300 text-red-500">
                              삭제됨
                            </Badge>
                          ) : !hasOriginals ? (
                            <div className="space-y-1 whitespace-nowrap">
                              <div className="text-muted-foreground">{formatFileSize(Number(item.totalFileSize))}</div>
                              <span className="text-[13px] text-muted-foreground">원본 없음</span>
                            </div>
                          ) : (
                            <div className="space-y-1 whitespace-nowrap">
                              <div>{formatFileSize(Number(item.totalFileSize))}</div>
                              <button
                                type="button"
                                className="flex items-center justify-center gap-0.5 text-[13px] text-foreground hover:underline mx-auto disabled:opacity-50 whitespace-nowrap"
                                onClick={() => handleDownloadOriginals(order.id, order.orderNumber)}
                                disabled={isDownloading === order.id}
                              >
                                <Download className="h-3 w-3" />
                                {isDownloading === order.id ? '다운로드중...' : '원본받기'}
                              </button>
                              {order.status === 'shipped' && (
                                <button
                                  type="button"
                                  className="flex items-center justify-center gap-0.5 text-[13px] text-red-500 hover:underline mx-auto"
                                  onClick={() => {
                                    setDeleteOriginalsOrderId(order.id);
                                    setDeleteOriginalsDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  원본삭제
                                </button>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* 주문금액 - 첫 번째 항목에만 합계 표시 */}
                        {idx === 0 && (
                          <TableCell
                            className="text-right align-middle font-normal text-base whitespace-nowrap"
                            rowSpan={items.length}
                          >
                            {displayFinalAmount(order).toLocaleString()}원
                          </TableCell>
                        )}

                        {/* 진행상황 - 첫 번째 항목에만 표시 */}
                        {idx === 0 && (
                          <TableCell
                            className="text-center align-middle"
                            rowSpan={items.length}
                          >
                            <div className="space-y-1">
                              <Badge className={cn('text-sm font-normal whitespace-nowrap', statusBadge.className)}>
                                {statusBadge.label}
                              </Badge>
                              <div
                                className="text-[13px] text-blue-600 hover:underline cursor-pointer"
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

                        {/* 확인 버튼 - 첫 번째 항목에만 표시 */}
                        {idx === 0 && (
                          <TableCell
                            className="text-center align-middle"
                            rowSpan={items.length}
                          >
                            {order.status === 'ready_for_shipping' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-sm h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => {
                                  setShippingOrder(order);
                                  setIsShippingDialogOpen(true);
                                }}
                              >
                                <Truck className="h-3 w-3 mr-1" />
                                {order.shipping?.trackingNumber ? '송장확인' : '송장입력'}
                              </Button>
                            )}
                            {order.status === 'receipt_completed' && (
                              <ReceiptCompletedOutputCell order={order} items={items} />
                            )}
                            {(order.status === 'print_waiting' || order.status === 'pending_receipt') && items[0] && (() => {
                              const first = items[0];
                              const badgeInfo = getPdfBadge(first.pdfStatus, first.printMethod);
                              const canOpenPdf = (first.pdfStatus || 'pending') === 'completed';
                              const slipDone = !!first.slipAutoPrintedAt;
                              const pdfUrl = `${API_URL}/print-pdf/items/${first.id}/pdf`;
                              const textColorClass = badgeInfo.className.split(' ').filter(c => c.startsWith('text-')).join(' ');
                              const pdfText = (
                                <span className={cn('text-[13px] font-normal whitespace-nowrap', textColorClass, canOpenPdf && 'cursor-pointer hover:underline')}>
                                  {badgeInfo.label}
                                </span>
                              );
                              return (
                                <div className="space-y-1">
                                  {canOpenPdf ? (
                                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer" title="새 탭에서 PDF 열기">
                                      {pdfText}
                                    </a>
                                  ) : (
                                    pdfText
                                  )}
                                  <div className="text-[13px] font-normal">
                                    {slipDone ? (
                                      <a href={`/print-slip/${first.id}`} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">
                                        지시서
                                      </a>
                                    ) : (
                                      <span className="text-red-600">지시서 대기</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                            {isOrderCancelled(order) && (
                              <CancelledOrderDeliveryPdfSummary
                                order={order}
                                items={items}
                                getCourierName={getCourierName}
                              />
                            )}
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

          {/* 더 보기 (cursor 무한스크롤) */}
          {hasNextPage && (
            <div className="flex flex-col items-center gap-1 mt-4">
              <Button
                variant="outline"
                size="sm"
                className="px-6 h-9 text-[14px] font-normal text-black"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? '불러오는 중…' : `더 보기 (총 ${meta?.total?.toLocaleString() ?? '?'}건)`}
              </Button>
              <span className="text-[12px] text-gray-400">현재 {orders.length}건 표시 중</span>
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

      {/* 주문 상세 수정 다이얼로그 */}
      <OrderQuickEditDialog
        order={quickEditOrder}
        open={isQuickEditOpen}
        onOpenChange={setIsQuickEditOpen}
      />

      {/* 공정 이력 다이얼로그 */}
      <ProcessHistoryDialog
        orderId={historyOrderId}
        orderNumber={historyOrderNumber}
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
      />

      {/* 원본 이미지 삭제 확인 다이얼로그 */}
      <ConfirmActionDialog
        open={deleteOriginalsDialog}
        onOpenChange={setDeleteOriginalsDialog}
        title="원본 이미지 삭제"
        description="이 주문의 원본 이미지를 영구 삭제합니다. PDF가 완성된 항목만 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제 실행"
        variant="destructive"
        isLoading={deleteOrderOriginals.isPending}
        onConfirm={handleDeleteOriginals}
      />

      {/* 송장 입력 다이얼로그 */}
      {shippingOrder && (
        <ShippingInputDialog
          open={isShippingDialogOpen}
          onOpenChange={setIsShippingDialogOpen}
          orderId={shippingOrder.id}
          orderNumber={shippingOrder.orderNumber}
          currentCourierCode={shippingOrder.shipping?.courierCode}
          currentTrackingNumber={shippingOrder.shipping?.trackingNumber}
        />
      )}
    </div>
  );
}

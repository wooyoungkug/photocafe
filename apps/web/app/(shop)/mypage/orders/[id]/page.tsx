'use client';

import { useRouter, useParams } from 'next/navigation';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  MapPin,
  User,
  Phone,
  FileText,
  ImageIcon,
  Download,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Folder,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { TrackingTimeline } from '@/components/order/tracking-timeline';
import { ShippingEditWithFeeDialog } from '@/components/order/shipping-edit-with-fee-dialog';
import { ReturnRequestDialog } from '@/components/order/return-request-dialog';
import { ReturnStatusBadge } from '@/components/order/return-status-badge';
import { resolveOrderFileAccessUrl } from '@/lib/order-file-access';
import { formatThumbFileLabel } from '@/lib/format-thumb-file-label';
import { isOrderCancelled } from '@/lib/order-display';
import { OrderItemSpecBadges } from '@/components/order/order-item-spec-badges';
import {
  useReturnRequestsByOrder,
  REPAIR_REASON_LABELS,
  ALL_REASON_LABELS,
  RETURN_TYPE_LABELS,
} from '@/hooks/use-return-requests';

// 주문 상태 타입 (orders/page.tsx와 동일)
const ORDER_STATUS = {
  PENDING_RECEIPT: 'pending_receipt',
  RECEIPT_COMPLETED: 'receipt_completed',
  IN_PRODUCTION: 'in_production',
  PRINT_WAITING: 'print_waiting',
  READY_FOR_SHIPPING: 'ready_for_shipping',
  SHIPPED: 'shipped',
  CANCELLED: 'cancelled',
} as const;

type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

const STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  icon: React.ReactNode;
  className: string;
}> = {
  [ORDER_STATUS.PENDING_RECEIPT]: {
    label: '접수대기',
    icon: <Clock className="h-5 w-5" />,
    className: 'text-orange-600 bg-orange-50',
  },
  [ORDER_STATUS.RECEIPT_COMPLETED]: {
    label: '접수완료',
    icon: <CheckCircle className="h-5 w-5" />,
    className: 'text-blue-600 bg-blue-50',
  },
  [ORDER_STATUS.IN_PRODUCTION]: {
    label: '생산진행',
    icon: <Package className="h-5 w-5" />,
    className: 'text-purple-600 bg-purple-50',
  },
  [ORDER_STATUS.PRINT_WAITING]: {
    label: '출력대기',
    icon: <Package className="h-5 w-5" />,
    className: 'text-purple-600 bg-purple-50',
  },
  [ORDER_STATUS.READY_FOR_SHIPPING]: {
    label: '제작완료',
    icon: <Package className="h-5 w-5" />,
    className: 'text-indigo-600 bg-indigo-50',
  },
  [ORDER_STATUS.SHIPPED]: {
    label: '거래완료',
    icon: <Truck className="h-5 w-5" />,
    className: 'text-green-600 bg-green-50',
  },
  [ORDER_STATUS.CANCELLED]: {
    label: '취소',
    icon: <XCircle className="h-5 w-5" />,
    className: 'text-gray-600 bg-gray-50',
  },
};

const FALLBACK_STATUS_CONFIG = {
  label: '상태 확인 중',
  icon: <Clock className="h-5 w-5" />,
  className: 'text-gray-600 bg-gray-50',
};

interface OrderFile {
  id: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  storageStatus: string;
  pageRange: string;
  pageStart: number;
  pageEnd: number;
  width: number;
  height: number;
  dpi: number;
  fileSize: number;
  sortOrder: number;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  /** API Order와 동일 — 취소 판별용 */
  currentProcess?: string;
  orderedAt: string;
  finalAmount: number;
  productPrice?: number;
  tax?: number;
  shippingFee?: number;
  adjustmentAmount?: number;
  customerMemo?: string;
  productMemo?: string;
  client: {
    clientName: string;
    mobile?: string;
    phone?: string;
    email?: string;
    postalCode?: string;
    address?: string;
    addressDetail?: string;
    creditEnabled?: boolean;
    paymentCondition?: string;
    shippingType?: string;
  };
  shipping: {
    receiverType?: string;
    recipientName: string;
    phone: string;
    postalCode: string;
    address: string;
    addressDetail?: string;
    deliveryMethod: string;
    deliveryMemo?: string;
    courierCode?: string;
    trackingNumber?: string;
  };
  items: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    size?: string;
    pages?: number;
    printMethod?: string;
    paper?: string;
    bindingType?: string;
    coverMaterial?: string;
    foilName?: string;
    foilColor?: string;
    foilPosition?: string;
    fabricName?: string;
    pageLayout?: string;
    bindingDirection?: string;
    printSide?: string;
    finishingOptions?: string[];
    jdfCoatingFront?: string;
    jdfCoatingBack?: string;
    jdfNumColorsFront?: number;
    jdfNumColorsBack?: number;
    thumbnailUrl?: string;
    originalsDeleted?: boolean;
    files?: OrderFile[];
    options?: any;
  }[];
  salesLedger?: {
    receivedAmount: number;
    outstandingAmount: number;
    paymentStatus: string;
    totalAmount: number;
  };
  fileRetention?: {
    retentionMonths: number;
    shippedAt?: string;
    retentionDeadline?: string;
    isExpired: boolean;
  };
  processHistory?: {
    id: string;
    processType: string;
    note?: string;
    processedAt: string;
  }[];
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}

import { getSpreadPageLabel, pairSinglePagesForSpread } from '@/lib/page-utils';
import { cn, normalizeImageUrl } from '@/lib/utils';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;
  const { isAuthenticated } = useAuthStore();

  // 썸네일 미리보기 (파일 목록 + 현재 인덱스)
  const [previewFiles, setPreviewFiles] = useState<{ files: OrderFile[]; index: number; itemName: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  // 갤러리 펼침 상태 (아이템별)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  // 다운로드 진행 상태
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOpeningOriginal, setIsOpeningOriginal] = useState(false);
  // 배송정보 수정 다이얼로그
  const [shippingEditOpen, setShippingEditOpen] = useState(false);
  // 반품/교환 신청 다이얼로그
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);

  // 주문 상세 조회
  const { data: order, isLoading } = useQuery({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      return api.get<OrderDetail>(`/orders/${orderId}`);
    },
    enabled: isAuthenticated && !!orderId,
  });

  // 반품 목록 조회
  const { data: returnRequests } = useReturnRequestsByOrder(orderId);

  const openPreview = (files: OrderFile[], index: number, itemName: string) => {
    setZoomLevel(1);
    setPreviewFiles({ files, index, itemName });
  };

  const navigatePreview = useCallback((direction: 'prev' | 'next') => {
    setPreviewFiles(prev => {
      if (!prev) return prev;
      const { files, index } = prev;
      const newIndex = direction === 'prev'
        ? (index - 1 + files.length) % files.length
        : (index + 1) % files.length;
      return { ...prev, index: newIndex };
    });
    setZoomLevel(1);
  }, []);

  // 키보드 네비게이션
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!previewFiles) return;
    if (e.key === 'ArrowLeft') navigatePreview('prev');
    if (e.key === 'ArrowRight') navigatePreview('next');
    if (e.key === '+' || e.key === '=') setZoomLevel(z => Math.min(3, z + 0.25));
    if (e.key === '-') setZoomLevel(z => Math.max(0.5, z - 0.25));
    if (e.key === '0') setZoomLevel(1);
  }, [previewFiles, navigatePreview]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const toggleGallery = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleDownloadOriginals = async () => {
    if (!order) return;
    setIsDownloading(true);
    try {
      await api.downloadBlob(
        `/orders/${order.id}/download-originals`,
        `${order.orderNumber}_originals.zip`,
      );
    } catch (e: any) {
      alert(e?.message || '다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenOriginal = async (file: OrderFile) => {
    if (!file?.id) return;
    setIsOpeningOriginal(true);
    try {
      const finalUrl = await resolveOrderFileAccessUrl(file);
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      const fallback = normalizeImageUrl(file.fileUrl) || file.fileUrl;
      if (fallback) {
        window.open(fallback, '_blank', 'noopener,noreferrer');
      } else {
        alert(e?.message || '원본 파일 열기에 실패했습니다.');
      }
    } finally {
      setIsOpeningOriginal(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">로그인이 필요한 서비스입니다.</p>
            <Button onClick={() => router.push('/login')}>로그인하기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">주문을 찾을 수 없습니다.</p>
            <Button onClick={() => router.push('/mypage/orders')}>
              주문 목록으로
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || FALLBACK_STATUS_CONFIG;
  const retention = order.fileRetention;
  const allOriginalsDeleted = order.items.every(item => item.originalsDeleted);
  const isOriginalsExpired = retention?.isExpired || allOriginalsDeleted;
  const canDownload = !isOriginalsExpired && order.items.some(item => item.files && item.files.length > 0);

  const productAmount = order.productPrice != null ? Number(order.productPrice) : order.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const taxAmount = order.tax != null ? Number(order.tax) : 0;
  const shippingFeeAmount = order.shippingFee != null ? Number(order.shippingFee) : 0;
  const adjustmentAmount = order.adjustmentAmount != null ? Number(order.adjustmentAmount) : 0;
  // DB에 저장된 finalAmount를 최종 결제금액으로 직접 사용 (adjustmentAmount는 양수=할인). 취소 주문은 0원.
  const displayTotal = isOrderCancelled(order)
    ? 0
    : order.finalAmount != null
      ? Number(order.finalAmount)
      : productAmount + taxAmount + shippingFeeAmount - adjustmentAmount;
  const DELIVERY_METHOD_LABEL: Record<string, string> = {
    parcel: '택배',
    motorcycle: '오토바이퀵',
    freight: '화물',
    pickup: '방문수령',
  };
  const deliveryLabel = DELIVERY_METHOD_LABEL[order.shipping?.deliveryMethod] ?? order.shipping?.deliveryMethod ?? '';

  return (
    <div className="min-h-screen bg-gray-50 text-[11pt]">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/mypage/orders')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            주문 목록으로
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-normal mb-2">주문 상세</h1>
              <p className="text-gray-500">주문번호: {order.orderNumber}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* 앨범수리(재발송)는 배송완료 후에만 가능 (접수대기/접수완료/생산진행/배송준비 단계에서는 아직 앨범이 제작되지 않음) */}
              {order.status === ORDER_STATUS.SHIPPED && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-8"
                  onClick={() => setReturnDialogOpen(true)}
                >
                  <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                  앨범수리(재발송)
                </Button>
              )}
              <Badge className={`${statusConfig.className} px-4 py-2`}>
                {statusConfig.icon}
                <span className="ml-2 text-base">{statusConfig.label}</span>
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status Guide */}
            {order.status === ORDER_STATUS.PENDING_RECEIPT && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h3 className="font-normal text-orange-900 mb-1">
                        접수 대기 중입니다
                      </h3>
                      <p className="text-sm text-orange-700">
                        주문이 접수되었습니다. 곧 접수 확인 후 생산이 시작됩니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {order.status === ORDER_STATUS.RECEIPT_COMPLETED && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-normal text-blue-900 mb-1">
                        접수가 완료되었습니다
                      </h3>
                      <p className="text-sm text-blue-700">
                        주문이 접수 완료되었습니다. 생산이 진행됩니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 파일 보관정책 안내 */}
            {isOriginalsExpired && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <h3 className="font-normal text-red-900 mb-1">
                        원본 파일이 삭제되었습니다
                      </h3>
                      <p className="text-sm text-red-700">
                        파일 보관기간({retention?.retentionMonths || 3}개월)이 만료되어 원본 파일이 삭제되었습니다.
                        썸네일 이미지는 계속 확인하실 수 있습니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {!isOriginalsExpired && retention?.retentionDeadline && order.status === ORDER_STATUS.SHIPPED && (
              <Card className="border-sky-200 bg-sky-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-sky-600 mt-0.5" />
                    <div>
                      <h3 className="font-normal text-sky-900 mb-1">
                        원본 파일 보관 안내
                      </h3>
                      <p className="text-sm text-sky-700">
                        원본 파일은 거래완료일로부터 {retention.retentionMonths}개월간 보관됩니다.
                        보관기한: {format(new Date(retention.retentionDeadline), 'yyyy.MM.dd', { locale: ko })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Items + 원본 다운로드 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>주문 상품</CardTitle>
                  {canDownload && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadOriginals}
                      disabled={isDownloading}
                    >
                      <Download className="h-4 w-4 mr-1.5" />
                      {isDownloading ? '다운로드 중...' : '원본 다운로드 (ZIP)'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => {
                    const files = item.files || [];
                    const thumbnailFiles = files.filter(f => f.thumbnailUrl);
                    const hasFiles = thumbnailFiles.length > 0;
                    const isExpanded = expandedItems.has(item.id);

                    const displayThumbUrl = thumbnailFiles[0]?.thumbnailUrl || item.thumbnailUrl;

                    return (
                      <div key={item.id} className="border border-green-500 bg-green-50/30 rounded-lg p-3 last:mb-0 mb-3">
                        {/* 제목 행 */}
                        <div className="flex items-start gap-2 mb-2">
                          <Folder className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="font-normal text-black text-[13px] flex-1 leading-relaxed">{item.productName}</span>
                          {/* 썸네일 클릭 */}
                          {displayThumbUrl && (
                            <div
                              className="w-10 h-10 shrink-0 bg-gray-100 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                              onClick={() => {
                                if (thumbnailFiles.length > 0) {
                                  openPreview(thumbnailFiles, 0, item.productName);
                                } else {
                                  openPreview([{ id: item.id, fileName: '', fileUrl: displayThumbUrl!, thumbnailUrl: displayThumbUrl!, storageStatus: 'uploaded', pageRange: '1', pageStart: 1, pageEnd: 1, width: 0, height: 0, dpi: 0, fileSize: 0, sortOrder: 0 }], 0, item.productName);
                                }
                              }}
                            >
                              <img
                                src={normalizeImageUrl(displayThumbUrl)}
                                alt=""
                                className="object-cover w-full h-full"
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  const parent = img.parentElement;
                                  if (parent) parent.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <OrderItemSpecBadges item={item} />


                        {/* 전체 페이지 갤러리 토글 */}
                        {hasFiles && (
                          <div className="mt-2 border-t border-green-200 pt-2">
                            <button
                              type="button"
                              onClick={() => toggleGallery(item.id)}
                              className="flex items-center gap-1.5 text-[13px] text-gray-600 hover:text-gray-900 px-1 py-1 rounded hover:bg-green-100 transition-colors"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                              <span>전체 페이지 보기 ({item.pages || thumbnailFiles.length}페이지)</span>
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>

                            {isExpanded && (
                              <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                                {item.originalsDeleted && (
                                  <p className="text-xs text-gray-500 mb-2">
                                    * 원본 파일 삭제됨 - 썸네일만 표시됩니다
                                  </p>
                                )}
                                {(() => {
                                  // 업로드창 썸네일 양식과 동일 (folder-card.tsx 참조)
                                  const fmtInch = (px: number, dpi: number) => {
                                    if (!px || !dpi) return null;
                                    const v = px / dpi;
                                    return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, '');
                                  };
                                  // 펼침면 좌/우 실제 페이지 번호 계산 (folder-card / cart-thumbnail-gallery 동일 로직)
                                  const calcSpreadPages = (fileIndex: number, totalFiles: number, dir: string): { left: number | null; right: number | null } => {
                                    switch (dir) {
                                      case 'LEFT_START_RIGHT_END':
                                        return { left: fileIndex * 2 + 1, right: fileIndex * 2 + 2 };
                                      case 'LEFT_START_LEFT_END':
                                        return fileIndex === totalFiles - 1
                                          ? { left: fileIndex * 2 + 1, right: null }
                                          : { left: fileIndex * 2 + 1, right: fileIndex * 2 + 2 };
                                      case 'RIGHT_START_LEFT_END':
                                        if (fileIndex === 0) return { left: null, right: 1 };
                                        if (fileIndex === totalFiles - 1 && totalFiles > 1) return { left: fileIndex * 2, right: null };
                                        return { left: fileIndex * 2, right: fileIndex * 2 + 1 };
                                      case 'RIGHT_START_RIGHT_END':
                                        if (fileIndex === 0) return { left: null, right: 1 };
                                        return { left: fileIndex * 2, right: fileIndex * 2 + 1 };
                                      default:
                                        return { left: fileIndex * 2 + 1, right: fileIndex * 2 + 2 };
                                    }
                                  };

                                  const renderThumb = (
                                    file: typeof thumbnailFiles[number],
                                    pageLabel: string,
                                    globalIdx: number,
                                    opts?: { badgePosition?: 'left' | 'right'; spreadBadges?: { left: number | null; right: number | null } }
                                  ) => {
                                    const aspectPct = file.width > 0 && file.height > 0
                                      ? (file.height / file.width) * 100
                                      : 133;
                                    const wIn = fmtInch(file.width, file.dpi);
                                    const hIn = fmtInch(file.height, file.dpi);
                                    const badgePos = opts?.badgePosition ?? 'left';
                                    const spreadBadges = opts?.spreadBadges;
                                    return (
                                      <div key={file.id} className="flex flex-col">
                                        <div
                                          className="relative rounded-t-md overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
                                          style={{ paddingTop: `${aspectPct}%` }}
                                          onClick={() => openPreview(thumbnailFiles, globalIdx, item.productName)}
                                        >
                                          <img
                                            src={normalizeImageUrl(file.thumbnailUrl)}
                                            alt={formatThumbFileLabel(file.fileName)}
                                            className="absolute inset-0 w-full h-full object-cover"
                                            loading="lazy"
                                            onError={(e) => {
                                              const img = e.currentTarget;
                                              img.style.display = 'none';
                                              const fallback = img.parentElement?.querySelector('.thumb-fallback');
                                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                            }}
                                          />
                                          <div className="thumb-fallback absolute inset-0 w-full h-full bg-gray-100 items-center justify-center" style={{ display: 'none' }}>
                                            <span className="text-[10px] text-gray-400 px-1 text-center truncate max-w-full">{formatThumbFileLabel(file.fileName)}</span>
                                          </div>
                                          {spreadBadges && (spreadBadges.left === null || spreadBadges.right === null) && (
                                            <div
                                              className={cn(
                                                'absolute inset-y-1 w-[calc(50%-4px)] pointer-events-none flex items-center justify-center bg-blue-50/85 border-2 border-dashed border-blue-400 overflow-hidden rounded-md',
                                                spreadBadges.left === null ? 'left-1' : 'right-1'
                                              )}
                                              aria-label="빈 페이지"
                                            >
                                              <svg
                                                className="absolute inset-0 w-full h-full"
                                                viewBox="0 0 100 100"
                                                preserveAspectRatio="none"
                                                aria-hidden="true"
                                              >
                                                <line x1="0" y1="0" x2="100" y2="100" stroke="rgb(96 165 250 / 0.6)" strokeWidth="1.5" />
                                                <line x1="100" y1="0" x2="0" y2="100" stroke="rgb(96 165 250 / 0.6)" strokeWidth="1.5" />
                                              </svg>
                                              <span className="relative text-xs font-bold text-blue-600 select-none bg-white/95 rounded px-1.5 py-0.5 whitespace-nowrap shadow-sm">빈페이지</span>
                                            </div>
                                          )}
                                          {spreadBadges ? (
                                            <>
                                              <div className={cn('absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium', spreadBadges.left !== null ? 'bg-red-600' : 'bg-blue-500')}>
                                                {spreadBadges.left !== null ? spreadBadges.left : '空'}
                                              </div>
                                              <div className={cn('absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium', spreadBadges.right !== null ? 'bg-red-600' : 'bg-blue-500')}>
                                                {spreadBadges.right !== null ? spreadBadges.right : '空'}
                                              </div>
                                            </>
                                          ) : (
                                            <div className={cn('absolute top-1 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center text-white text-[10px] font-medium bg-red-600', badgePos === 'right' ? 'right-1' : 'left-1')}>
                                              {pageLabel}
                                            </div>
                                          )}
                                          {file.storageStatus === 'deleted' && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                              <span className="text-white text-[10px] font-medium">삭제됨</span>
                                            </div>
                                          )}
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <ImageIcon className="w-5 h-5 text-white" />
                                          </div>
                                        </div>
                                        <div className="text-[9px] leading-tight p-1 border border-t-0 rounded-b-md bg-white border-gray-200">
                                          <div className="truncate font-medium" title={file.fileName}>{formatThumbFileLabel(file.fileName)}</div>
                                          <div className="text-gray-500 truncate">
                                            {wIn && hIn ? `${wIn}×${hIn}"` : ''}
                                            {wIn && hIn && file.dpi > 0 ? ' ' : ''}
                                            {file.dpi > 0 ? `${file.dpi}dpi` : ''}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  };

                                  const renderBlankSlot = (key: string, aspectPct: number) => (
                                    <div key={key} className="flex flex-col">
                                      <div
                                        className="relative rounded-md border-2 border-dashed border-blue-400 bg-blue-50/20 overflow-hidden"
                                        style={{ paddingTop: `${aspectPct}%` }}
                                      >
                                        <svg
                                          className="absolute inset-0 w-full h-full"
                                          viewBox="0 0 100 100"
                                          preserveAspectRatio="none"
                                          aria-hidden="true"
                                        >
                                          <line x1="0" y1="0" x2="100" y2="100" stroke="rgb(96 165 250 / 0.5)" strokeWidth="1.2" />
                                          <line x1="100" y1="0" x2="0" y2="100" stroke="rgb(96 165 250 / 0.5)" strokeWidth="1.2" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <span className="relative text-xs font-bold text-blue-600 select-none bg-white/95 rounded px-1.5 py-0.5 whitespace-nowrap shadow-sm">빈페이지</span>
                                        </div>
                                      </div>
                                    </div>
                                  );

                                  if (item.pageLayout === 'spread') {
                                    // 펼침면: 파일 1개 = 스프레드 1개, 좌/우 페이지 번호 각각 표시
                                    const spreadDir = item.bindingDirection || 'LEFT_START_RIGHT_END';
                                    return (
                                      <div className="grid grid-cols-4 gap-3 p-2 bg-gray-50 rounded-lg border">
                                        {thumbnailFiles.map((file, idx) => {
                                          const pageLabel = getSpreadPageLabel(idx, thumbnailFiles.length, item.pageLayout, item.bindingDirection);
                                          const pages = calcSpreadPages(idx, thumbnailFiles.length, spreadDir);
                                          return (
                                            <div
                                              key={file.id}
                                              className="border-2 border-dashed rounded-lg p-1 border-orange-300 bg-orange-50/20"
                                            >
                                              <div className="text-[8px] text-center text-orange-500 mb-0.5 font-medium">
                                                S{idx + 1} (p{pageLabel})
                                              </div>
                                              {renderThumb(file, pageLabel, idx, { spreadBadges: pages })}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  }

                                  // 낱장(single): 2p씩 묶어 스프레드 그룹 (업로드창과 동일)
                                  const dir = item.bindingDirection || 'LEFT_START_RIGHT_END';
                                  const startsRight = dir.startsWith('RIGHT');
                                  const totalFiles = thumbnailFiles.length;
                                  const defaultAspect = thumbnailFiles[0] && thumbnailFiles[0].width > 0
                                    ? (thumbnailFiles[0].height / thumbnailFiles[0].width) * 100
                                    : 133;

                                  type SpreadSlot = { type: 'page'; fileIndex: number } | { type: 'blank' };
                                  const spreads: Array<{ left: SpreadSlot; right: SpreadSlot }> = [];
                                  let i = 0;
                                  if (startsRight && totalFiles > 0) {
                                    spreads.push({ left: { type: 'blank' }, right: { type: 'page', fileIndex: 0 } });
                                    i = 1;
                                  }
                                  while (i < totalFiles) {
                                    if (i + 1 < totalFiles) {
                                      spreads.push({ left: { type: 'page', fileIndex: i }, right: { type: 'page', fileIndex: i + 1 } });
                                      i += 2;
                                    } else {
                                      spreads.push({ left: { type: 'page', fileIndex: i }, right: { type: 'blank' } });
                                      i++;
                                    }
                                  }

                                  return (
                                    <div className="grid grid-cols-4 gap-3 p-2 bg-gray-50 rounded-lg border">
                                      {spreads.map((spread, spreadIdx) => {
                                        const leftFile = spread.left.type === 'page' ? thumbnailFiles[spread.left.fileIndex] : null;
                                        const rightFile = spread.right.type === 'page' ? thumbnailFiles[spread.right.fileIndex] : null;
                                        const leftPage = spread.left.type === 'page' ? spread.left.fileIndex + 1 : null;
                                        const rightPage = spread.right.type === 'page' ? spread.right.fileIndex + 1 : null;
                                        const hasBoth = !!leftFile && !!rightFile;
                                        const label = hasBoth
                                          ? `S${spreadIdx + 1} (p${leftPage}-${rightPage})`
                                          : leftFile
                                            ? `p${leftPage}`
                                            : rightFile
                                              ? `p${rightPage}`
                                              : '';
                                        return (
                                          <div
                                            key={spreadIdx}
                                            className={cn(
                                              'border-2 border-dashed rounded-lg p-1',
                                              !hasBoth ? 'border-yellow-400 bg-yellow-50/30' : 'border-orange-300 bg-orange-50/20'
                                            )}
                                          >
                                            <div className="text-[8px] text-center text-orange-500 mb-0.5 font-medium">
                                              {label}
                                            </div>
                                            <div className="grid grid-cols-2 gap-1">
                                              {spread.left.type === 'page' && leftFile
                                                ? renderThumb(leftFile, String(leftPage), spread.left.fileIndex, { badgePosition: 'left' })
                                                : renderBlankSlot(`s${spreadIdx}-l`, defaultAspect)}
                                              {spread.right.type === 'page' && rightFile
                                                ? renderThumb(rightFile, String(rightPage), spread.right.fileIndex, { badgePosition: 'right' })
                                                : renderBlankSlot(`s${spreadIdx}-r`, defaultAspect)}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                                <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-400">
                                  <span>총 {item.pages || thumbnailFiles.length}페이지</span>
                                  {thumbnailFiles[0] && (
                                    <span>{thumbnailFiles[0].width}x{thumbnailFiles[0].height}px / {thumbnailFiles[0].dpi}dpi</span>
                                  )}
                                  <span>{formatFileSize(files.reduce((sum, f) => sum + (f.fileSize || 0), 0))}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    배송 정보
                  </CardTitle>
                  {order.status !== ORDER_STATUS.SHIPPED && order.status !== ORDER_STATUS.CANCELLED && !order.shipping.trackingNumber && (
                    <Button variant="outline" size="sm" className="text-[11px] h-7" onClick={() => setShippingEditOpen(true)}>
                      수정
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-[13px]">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-500">수령인</p>
                      {order.shipping.receiverType && (
                        <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${order.shipping.receiverType === 'direct_customer' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                          {order.shipping.receiverType === 'direct_customer' ? '고객직배송' : '스튜디오배송'}
                        </span>
                      )}
                    </div>
                    <p className="font-normal">{order.shipping.recipientName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-gray-500">연락처</p>
                    <p className="font-normal">{order.shipping.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-gray-500">배송 주소</p>
                    <p className="font-normal select-none pointer-events-none">
                      [{order.shipping.postalCode}] {order.shipping.address}{' '}
                      {order.shipping.addressDetail}
                    </p>
                  </div>
                </div>

                {/* 배송 추적 */}
                {order.shipping.courierCode && order.shipping.trackingNumber && (
                  <>
                    <div className="border-t pt-3 mt-1" />
                    <TrackingTimeline
                      courierCode={order.shipping.courierCode}
                      trackingNumber={order.shipping.trackingNumber}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* 앨범수리(재발송) 이력 */}
            {returnRequests && returnRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RotateCw className="h-5 w-5" />
                    앨범수리(재발송) 이력
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {returnRequests.map((rr: any) => (
                    <div key={rr.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">{rr.returnNumber}</span>
                        <ReturnStatusBadge status={rr.status} type={rr.type} />
                      </div>
                      {/* 신청일시 */}
                      <div className="text-[11px] text-gray-500">
                        신청일시: {format(new Date(rr.createdAt), 'yyyy-MM-dd (EEE) HH:mm:ss', { locale: ko })}
                      </div>
                      <div className="text-[11px]">
                        <span className="text-gray-500">유형: </span>
                        <span>{RETURN_TYPE_LABELS[rr.type] || rr.type}</span>
                      </div>
                      <div className="text-[11px]">
                        <span className="text-gray-500">사유: </span>
                        <span>{ALL_REASON_LABELS[rr.reason] || rr.reason}</span>
                        {rr.reasonDetail && (
                          <span className="text-gray-400 ml-1">({rr.reasonDetail})</span>
                        )}
                      </div>
                      {rr.items && rr.items.length > 0 && (
                        <div className="text-[10px] text-gray-500">
                          {rr.items.map((item: any) => (
                            <div key={item.id}>
                              {item.orderItem?.productName || '상품'} x {item.quantity}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* 앨범수리 - 교체페이지 정보 */}
                      {rr.type === 'album_repair' && rr.repairPages && Array.isArray(rr.repairPages) && rr.repairPages.length > 0 && (
                        <div className="text-[10px] bg-blue-50 rounded p-2">
                          <span className="text-gray-500">교체 페이지: </span>
                          <span className="text-blue-700">
                            {(rr.repairPages as any[]).map((p: any) => `${p.pageNumber}p`).join(', ')}
                          </span>
                        </div>
                      )}
                      {rr.shippingFeeChargedTo && rr.type !== 'album_repair' && (
                        <div className="text-[10px]">
                          <span className="text-gray-500">배송비: </span>
                          <span className={rr.shippingFeeChargedTo === 'company' ? 'text-green-600' : 'text-red-600'}>
                            {rr.shippingFeeChargedTo === 'company' ? '무료(회사부담)' : `고객부담 ${rr.returnShippingFee ? `${Number(rr.returnShippingFee).toLocaleString()}원` : ''}`}
                          </span>
                        </div>
                      )}
                      {rr.returnCourierCode && rr.returnTrackingNumber && (
                        <div className="border-t pt-2 mt-2">
                          <p className="text-[10px] text-gray-500 mb-1">반품 배송추적</p>
                          <TrackingTimeline
                            courierCode={rr.returnCourierCode}
                            trackingNumber={rr.returnTrackingNumber}
                          />
                        </div>
                      )}
                      {rr.refundAmount && Number(rr.refundAmount) > 0 && (
                        <div className="text-[10px]">
                          <span className="text-gray-500">환불: </span>
                          <span className="text-blue-600">
                            {Number(rr.refundAmount).toLocaleString()}원
                            {rr.refundedAt && ` (${format(new Date(rr.refundedAt), 'yyyy.MM.dd HH:mm', { locale: ko })})`}
                          </span>
                        </div>
                      )}
                      {/* 승인/완료 일시 */}
                      {rr.approvedAt && (
                        <div className="text-[10px] text-gray-400">
                          승인: {format(new Date(rr.approvedAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                        </div>
                      )}
                      {rr.completedAt && (
                        <div className="text-[10px] text-gray-400">
                          완료: {format(new Date(rr.completedAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Memos */}
            {(order.customerMemo || order.productMemo) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    메모
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.customerMemo && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">고객 메모</p>
                      <p className="text-sm">{order.customerMemo}</p>
                    </div>
                  )}
                  {order.productMemo && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">상품 메모</p>
                      <p className="text-sm">{order.productMemo}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>결제 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">주문일시</span>
                  <span>
                    {format(new Date(order.orderedAt), 'yyyy.MM.dd HH:mm', {
                      locale: ko,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">상품 금액</span>
                  <span>{productAmount.toLocaleString()}원</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">부가세 (10%)</span>
                    <span>{taxAmount.toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {order.client.shippingType === 'prepaid' ? '배송형태' : `배송비${deliveryLabel ? ` (${deliveryLabel})` : ''}`}
                  </span>
                  {order.client.shippingType === 'prepaid' ? (
                    <span className="font-medium">직배송</span>
                  ) : shippingFeeAmount > 0 ? (
                    <span>{shippingFeeAmount.toLocaleString()}원</span>
                  ) : (
                    <span className="text-green-600 font-medium">무료배송</span>
                  )}
                </div>
                {adjustmentAmount !== 0 && (
                  <div className={`flex justify-between ${adjustmentAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <div>
                      <span>조정 금액</span>
                      {(() => {
                        const note = order.processHistory?.find(h => h.processType === 'admin_adjustment')?.note;
                        return note ? (
                          <p className="text-xs text-gray-400 mt-0.5">{note}</p>
                        ) : null;
                      })()}
                    </div>
                    <span>{adjustmentAmount > 0 ? '-' : '+'}{Math.abs(adjustmentAmount).toLocaleString()}원</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-normal">
                  <span>총 결제금액</span>
                  <span className="text-primary">
                    {displayTotal.toLocaleString()}원
                  </span>
                </div>
                {order.salesLedger && (
                  <>
                    <Separator />
                    {Number(order.salesLedger.receivedAmount) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">선수금</span>
                        <span className="text-blue-600">-{Number(order.salesLedger.receivedAmount).toLocaleString()}원</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium">
                      <span>결제할금액</span>
                      <span className={Number(order.salesLedger.outstandingAmount) <= 0 ? 'text-green-600' : 'text-red-600'}>
                        {Number(order.salesLedger.outstandingAmount) <= 0
                          ? '결제완료'
                          : `${Number(order.salesLedger.outstandingAmount).toLocaleString()}원`}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 출력정보 (인쇄 사양) */}
            {order.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>출력 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-[13px]">
                  {order.items.map((item, idx) => (
                    <div key={item.id} className={order.items.length > 1 ? 'pb-3 border-b last:border-b-0 last:pb-0' : ''}>
                      {order.items.length > 1 && (
                        <p className="font-medium text-black mb-2 truncate">{item.productName.split(' - ')[0]}</p>
                      )}
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-gray-500">인쇄방식</span>
                          <span>{item.printMethod || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">용지</span>
                          <span>{item.paper || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">규격</span>
                          <span>{item.size || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">페이지</span>
                          <span>{item.pages}p</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">제본</span>
                          <span>{item.bindingType || '-'}</span>
                        </div>
                        {item.coverMaterial && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">커버소재</span>
                            <span>{item.coverMaterial}</span>
                          </div>
                        )}
                        {item.fabricName && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">원단</span>
                            <span>{item.fabricName}</span>
                          </div>
                        )}
                        {item.pageLayout && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">편집</span>
                            <span>{item.pageLayout === 'spread' ? '펼침면' : item.pageLayout === 'single' ? '낱장' : item.pageLayout}</span>
                          </div>
                        )}
                        {(item.foilColor || item.foilName) && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">박</span>
                            <span>{[item.foilColor, item.foilName, item.foilPosition].filter(Boolean).join(' / ')}</span>
                          </div>
                        )}
                        {(item.finishingOptions?.length ?? 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">후가공</span>
                            <span>{item.finishingOptions!.join(', ')}</span>
                          </div>
                        )}
                        {item.jdfCoatingFront && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">코팅(앞)</span>
                            <span>{item.jdfCoatingFront}</span>
                          </div>
                        )}
                        {item.jdfCoatingBack && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">코팅(뒤)</span>
                            <span>{item.jdfCoatingBack}</span>
                          </div>
                        )}
                        {(item.jdfNumColorsFront || item.jdfNumColorsBack) && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">색수</span>
                            <span>앞 {item.jdfNumColorsFront ?? '-'} / 뒤 {item.jdfNumColorsBack ?? '-'}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">부수</span>
                          <span>{item.quantity}부</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle>주문자 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-[13px]">
                <div>
                  <p className="text-gray-500">이름</p>
                  <p className="font-normal">{order.client.clientName}</p>
                </div>
                {order.client.mobile && (
                  <div>
                    <p className="text-gray-500">연락처</p>
                    <p className="font-normal">{order.client.mobile}</p>
                  </div>
                )}
                {order.client.email && (
                  <div>
                    <p className="text-gray-500">이메일</p>
                    <p className="font-normal">{order.client.email}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 파일 보관 정보 */}
            {retention && (
              <Card>
                <CardHeader>
                  <CardTitle>파일 보관 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">보관기간</span>
                    <span>{retention.retentionMonths}개월</span>
                  </div>
                  {retention.shippedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">거래완료일</span>
                      <span>{format(new Date(retention.shippedAt), 'yyyy.MM.dd', { locale: ko })}</span>
                    </div>
                  )}
                  {retention.retentionDeadline && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">보관기한</span>
                      <span className={retention.isExpired ? 'text-red-600' : ''}>
                        {format(new Date(retention.retentionDeadline), 'yyyy.MM.dd', { locale: ko })}
                        {retention.isExpired && ' (만료)'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">원본 상태</span>
                    <span className={isOriginalsExpired ? 'text-red-600' : 'text-green-600'}>
                      {isOriginalsExpired ? '삭제됨' : '보관 중'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 배송정보 수정 다이얼로그 */}
      <ShippingEditWithFeeDialog
        open={shippingEditOpen}
        onOpenChange={setShippingEditOpen}
        orderId={order.id}
        orderNumber={order.orderNumber}
        shipping={order.shipping as any}
        creditEnabled={order.client.creditEnabled}
        paymentCondition={order.client.paymentCondition}
        studioInfo={{
          clientName: order.client.clientName,
          phone: order.client.mobile ?? order.client.phone,
          postalCode: order.client.postalCode,
          address: order.client.address,
          addressDetail: order.client.addressDetail,
        }}
      />

      {/* 반품/교환 신청 다이얼로그 */}
      <ReturnRequestDialog
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
        orderId={order.id}
        orderNumber={order.orderNumber}
        items={order.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          size: item.size,
          pages: item.pages,
          printMethod: item.printMethod,
          bindingType: item.bindingType,
          pageLayout: item.pageLayout,
          bindingDirection: item.bindingDirection,
          originalsDeleted: item.originalsDeleted,
          files: item.files?.map((f) => ({
            id: f.id,
            fileName: f.fileName,
            fileUrl: f.fileUrl,
            thumbnailUrl: f.thumbnailUrl,
            pageRange: f.pageRange,
            pageStart: f.pageStart,
            pageEnd: f.pageEnd,
            sortOrder: f.sortOrder,
          })),
        }))}
      />

      {/* 이미지 미리보기 다이얼로그 (줌 + 네비게이션) */}
      <Dialog open={!!previewFiles} onOpenChange={() => { setPreviewFiles(null); setZoomLevel(1); }}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
          {previewFiles && (() => {
            const currentFile = previewFiles.files[previewFiles.index];
            const totalFiles = previewFiles.files.length;
            const currentIndex = previewFiles.index;
            return (
              <>
                {/* 상단 바 */}
                <DialogHeader className="px-4 py-3 border-b bg-white">
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-sm">
                      {previewFiles.itemName} - {currentIndex + 1} / {totalFiles}
                    </DialogTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => handleOpenOriginal(currentFile)}
                        disabled={isOpeningOriginal || !currentFile.id}
                        title="원본 파일 열기"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        <span className="text-xs">
                          {isOpeningOriginal ? '열는 중...' : '원본 열기'}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
                        disabled={zoomLevel <= 0.5}
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}
                        disabled={zoomLevel >= 3}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      {zoomLevel !== 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setZoomLevel(1)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogHeader>

                {/* 이미지 영역 */}
                <div className="relative bg-gray-100 flex items-center justify-center" style={{ height: '70vh' }}>
                  {/* 이전 버튼 */}
                  {totalFiles > 1 && (
                    <button
                      type="button"
                      onClick={() => navigatePreview('prev')}
                      title="이전 페이지"
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                  )}

                  {/* 이미지 */}
                  <div
                    className="w-full h-full overflow-auto flex items-center justify-center"
                    style={{ cursor: zoomLevel > 1 ? 'grab' : 'default' }}
                  >
                    <img
                      src={normalizeImageUrl(currentFile.thumbnailUrl || currentFile.fileUrl)}
                      alt={`p${currentIndex + 1}`}
                      className="transition-transform duration-200"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'center center',
                        maxWidth: zoomLevel <= 1 ? '100%' : 'none',
                        maxHeight: zoomLevel <= 1 ? '100%' : 'none',
                      }}
                      draggable={false}
                    />
                  </div>

                  {/* 다음 버튼 */}
                  {totalFiles > 1 && (
                    <button
                      type="button"
                      onClick={() => navigatePreview('next')}
                      title="다음 페이지"
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  )}
                </div>

                {/* 하단 파일 정보 */}
                {(currentFile.width > 0 || currentFile.fileSize > 0) && (
                  <div className="px-4 py-2 border-t bg-white text-xs text-gray-500 flex items-center gap-4">
                    {currentFile.width > 0 && (
                      <span>{currentFile.width} x {currentFile.height}px</span>
                    )}
                    {currentFile.dpi > 0 && <span>{currentFile.dpi} DPI</span>}
                    {currentFile.fileSize > 0 && <span>{formatFileSize(currentFile.fileSize)}</span>}
                    {currentFile.fileName && <span className="text-gray-400 truncate" title={currentFile.fileName}>{formatThumbFileLabel(currentFile.fileName)}</span>}
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

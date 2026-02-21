'use client';

import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
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
  Palette,
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

// 주문 상태 타입 (orders/page.tsx와 동일)
const ORDER_STATUS = {
  PENDING_RECEIPT: 'pending_receipt',
  RECEIPT_COMPLETED: 'receipt_completed',
  IN_PRODUCTION: 'in_production',
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
  [ORDER_STATUS.READY_FOR_SHIPPING]: {
    label: '배송준비',
    icon: <Package className="h-5 w-5" />,
    className: 'text-indigo-600 bg-indigo-50',
  },
  [ORDER_STATUS.SHIPPED]: {
    label: '배송완료',
    icon: <Truck className="h-5 w-5" />,
    className: 'text-green-600 bg-green-50',
  },
  [ORDER_STATUS.CANCELLED]: {
    label: '취소',
    icon: <XCircle className="h-5 w-5" />,
    className: 'text-gray-600 bg-gray-50',
  },
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
    email?: string;
  };
  shipping: {
    recipientName: string;
    phone: string;
    postalCode: string;
    address: string;
    addressDetail?: string;
    deliveryMethod: string;
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
    finishingOptions?: string[];
    thumbnailUrl?: string;
    originalsDeleted?: boolean;
    files?: OrderFile[];
    options?: any;
  }[];
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

// 펼침면 앨범의 파일 인덱스에 해당하는 실제 페이지 범위 라벨 반환
function getSpreadPageLabel(
  fileIndex: number,
  totalFiles: number,
  pageLayout: string | undefined,
  bindingDirection: string | undefined,
): string {
  if (pageLayout !== 'spread') return `${fileIndex + 1}`;
  const dir = bindingDirection || 'LEFT_START_RIGHT_END';
  switch (dir) {
    case 'LEFT_START_RIGHT_END':
      return `${fileIndex * 2 + 1}-${fileIndex * 2 + 2}`;
    case 'LEFT_START_LEFT_END':
      if (fileIndex === totalFiles - 1) return `${fileIndex * 2 + 1}`;
      return `${fileIndex * 2 + 1}-${fileIndex * 2 + 2}`;
    case 'RIGHT_START_LEFT_END':
      if (fileIndex === 0) return '1';
      if (fileIndex === totalFiles - 1) return `${fileIndex * 2}`;
      return `${fileIndex * 2}-${fileIndex * 2 + 1}`;
    case 'RIGHT_START_RIGHT_END':
      if (fileIndex === 0) return '1';
      return `${fileIndex * 2}-${fileIndex * 2 + 1}`;
    default:
      return `${fileIndex * 2 + 1}-${fileIndex * 2 + 2}`;
  }
}

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

  // 주문 상세 조회
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      return api.get<OrderDetail>(`/orders/${orderId}`);
    },
    enabled: isAuthenticated && !!orderId,
  });

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

  const statusConfig = STATUS_CONFIG[order.status];
  const retention = order.fileRetention;
  const allOriginalsDeleted = order.items.every(item => item.originalsDeleted);
  const isOriginalsExpired = retention?.isExpired || allOriginalsDeleted;
  const canDownload = !isOriginalsExpired && order.items.some(item => item.files && item.files.length > 0);

  const productAmount = order.productPrice != null ? Number(order.productPrice) : order.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const taxAmount = order.tax != null ? Number(order.tax) : 0;
  const shippingFeeAmount = order.shippingFee != null ? Number(order.shippingFee) : 0;
  const adjustmentAmount = order.adjustmentAmount != null ? Number(order.adjustmentAmount) : 0;
  // DB에 저장된 finalAmount를 최종 결제금액으로 직접 사용 (adjustmentAmount는 양수=할인)
  const displayTotal = order.finalAmount != null
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
            <Badge className={`${statusConfig.className} px-4 py-2`}>
              {statusConfig.icon}
              <span className="ml-2 text-base">{statusConfig.label}</span>
            </Badge>
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
                        원본 파일은 배송완료일로부터 {retention.retentionMonths}개월간 보관됩니다.
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

                    const BINDING_DIRECTION_LABEL: Record<string, string> = {
                      LEFT_START_RIGHT_END: '좌시작우끝',
                      LEFT_START_LEFT_END: '좌시작좌끝',
                      RIGHT_START_LEFT_END: '우시작좌끝',
                      RIGHT_START_RIGHT_END: '우시작우끝',
                      'ltr-rend': '좌시작우끝',
                      'ltr-lend': '좌시작좌끝',
                      'rtl-lend': '우시작좌끝',
                      'rtl-rend': '우시작우끝',
                    };

                    const hasFabric = !!item.fabricName;
                    const hasFoil = !!(item.foilColor || item.foilName || item.foilPosition);

                    return (
                      <div key={item.id} className="border border-green-500 bg-green-50/30 rounded-lg p-3 last:mb-0 mb-3">
                        {/* 제목 행 */}
                        <div className="flex items-start gap-2 mb-2">
                          <Folder className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="font-normal text-black text-xs flex-1 leading-relaxed">{item.productName}</span>
                          {/* 썸네일 클릭 */}
                          {item.thumbnailUrl && (
                            <div
                              className="w-10 h-10 shrink-0 bg-gray-100 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                              onClick={() => {
                                if (thumbnailFiles.length > 0) {
                                  openPreview(thumbnailFiles, 0, item.productName);
                                } else {
                                  openPreview([{ id: item.id, fileName: '', fileUrl: item.thumbnailUrl!, thumbnailUrl: item.thumbnailUrl!, storageStatus: 'uploaded', pageRange: '1', pageStart: 1, pageEnd: 1, width: 0, height: 0, dpi: 0, fileSize: 0, sortOrder: 0 }], 0, item.productName);
                                }
                              }}
                            >
                              <Image src={item.thumbnailUrl} alt={item.productName} width={40} height={40} className="object-cover w-full h-full" />
                            </div>
                          )}
                        </div>

                        {/* 편집 · 제본방향 행 */}
                        {(item.bindingType || item.pageLayout || item.bindingDirection || item.printMethod) && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 mb-1.5 flex-wrap">
                            {item.bindingType && (
                              <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200 text-[10px]">
                                {item.bindingType.split('_')[0].replace(/\s*\(.*?\)$/, '').trim() || item.bindingType}
                              </span>
                            )}
                            {item.pageLayout && (
                              <>
                                <span className="text-xs text-black">편집</span>
                                <span className={`px-1.5 py-0.5 text-[10px] rounded border ${
                                  item.pageLayout === 'spread'
                                    ? 'bg-blue-500 text-white border-blue-500'
                                    : 'bg-blue-500 text-white border-blue-500'
                                }`}>
                                  {item.pageLayout === 'spread' ? '펼침면' : item.pageLayout === 'single' ? '낱장' : item.pageLayout}
                                </span>
                              </>
                            )}
                            {item.bindingDirection && (
                              <>
                                <span className="text-xs text-black ml-2">제본방향</span>
                                <span className="bg-white text-black px-1.5 py-0.5 rounded border border-gray-300 text-[10px]">
                                  {BINDING_DIRECTION_LABEL[item.bindingDirection] || item.bindingDirection}
                                </span>
                              </>
                            )}
                            {item.printMethod && (
                              <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 text-[10px] ml-2">{item.printMethod}</span>
                            )}
                            {item.finishingOptions?.map((opt, i) => (
                              <span key={i} className="bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 text-[10px]">{opt}</span>
                            ))}
                          </div>
                        )}

                        {/* 원단 · 동판정보 행 */}
                        {(hasFabric || hasFoil || item.coverMaterial) && (
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-gray-500 mb-1.5">
                            {(hasFabric || item.coverMaterial) && (
                              <span className="text-xs text-black">원단</span>
                            )}
                            {item.fabricName && (
                              <span className="bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded border border-pink-200 flex items-center gap-1">
                                <Palette className="w-2.5 h-2.5" />
                                {item.fabricName}
                              </span>
                            )}
                            {item.coverMaterial && (
                              <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">{item.coverMaterial}</span>
                            )}
                            {hasFoil && (
                              <span className="text-xs text-black ml-3">동판정보</span>
                            )}
                            {item.foilName && (
                              <span className="bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded border border-violet-200">{item.foilName}</span>
                            )}
                            {item.foilColor && (
                              <span className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200">{item.foilColor}</span>
                            )}
                            {item.foilPosition && (
                              <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">{item.foilPosition}</span>
                            )}
                          </div>
                        )}

                        {/* 규격 · 페이지 · 부수 · 가격 행 */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-2 text-xs flex-1">
                            {item.size && (
                              <>
                                <span className="text-black">규격</span>
                                <span className="bg-white text-black px-1.5 py-0.5 rounded border border-gray-300 text-[10px]">{item.size}</span>
                                <span className="text-gray-300">|</span>
                              </>
                            )}
                            {item.pages && (
                              <>
                                <span className="text-black">페이지</span>
                                <span className="text-black">{item.pages}p</span>
                                <span className="text-gray-300">|</span>
                              </>
                            )}
                            <span className="text-black">부수</span>
                            <span className="text-black">{item.quantity}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-medium text-sm text-black">{item.totalPrice.toLocaleString()}원</p>
                            {item.quantity > 1 && (
                              <p className="text-[10px] text-gray-400">단가 {item.unitPrice.toLocaleString()}원</p>
                            )}
                          </div>
                        </div>

                        {/* 전체 페이지 갤러리 토글 */}
                        {hasFiles && (
                          <div className="mt-2 border-t border-green-200 pt-2">
                            <button
                              type="button"
                              onClick={() => toggleGallery(item.id)}
                              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 px-1 py-1 rounded hover:bg-green-100 transition-colors"
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
                                <div className="flex flex-wrap gap-2">
                                  {thumbnailFiles.map((file, idx) => {
                                    const isSpread = file.width > 0 && file.height > 0 && file.width > file.height;
                                    return (
                                    <div
                                      key={file.id}
                                      className="relative rounded-md overflow-hidden border border-gray-200 bg-white cursor-pointer hover:ring-2 hover:ring-primary/50 hover:shadow-md transition-all group"
                                      style={{ width: isSpread ? 'calc(25% - 6px)' : 'calc(12.5% - 7px)' }}
                                      onClick={() => openPreview(thumbnailFiles, idx, item.productName)}
                                    >
                                      <img
                                        src={file.thumbnailUrl!}
                                        alt={`p${idx + 1}`}
                                        className="w-full h-auto block"
                                        loading="lazy"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1 pb-0.5 pt-3">
                                        <span className="text-white text-[10px] font-normal">
                                          {getSpreadPageLabel(idx, thumbnailFiles.length, item.pageLayout, item.bindingDirection)}
                                        </span>
                                      </div>
                                      {file.storageStatus === 'deleted' && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                          <span className="text-white text-[10px] font-normal">삭제됨</span>
                                        </div>
                                      )}
                                    </div>
                                    );
                                  })}
                                </div>
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
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  배송 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">수령인</p>
                    <p className="font-normal">{order.shipping.recipientName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">연락처</p>
                    <p className="font-normal">{order.shipping.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">배송 주소</p>
                    <p className="font-normal">
                      [{order.shipping.postalCode}] {order.shipping.address}{' '}
                      {order.shipping.addressDetail}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">주문일시</span>
                  <span>
                    {format(new Date(order.orderedAt), 'yyyy.MM.dd HH:mm', {
                      locale: ko,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">상품 금액</span>
                  <span>{productAmount.toLocaleString()}원</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">부가세 (10%)</span>
                    <span>{taxAmount.toLocaleString()}원</span>
                  </div>
                )}
                {shippingFeeAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">배송비{deliveryLabel ? ` (${deliveryLabel})` : ''}</span>
                    <span>{shippingFeeAmount.toLocaleString()}원</span>
                  </div>
                )}
                {adjustmentAmount !== 0 && (
                  <div className={`flex justify-between text-sm ${adjustmentAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                <div className="flex justify-between text-lg font-normal">
                  <span>총 결제금액</span>
                  <span className="text-primary">
                    {displayTotal.toLocaleString()}원
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle>주문자 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">이름</p>
                  <p className="font-normal">{order.client.clientName}</p>
                </div>
                {order.client.mobile && (
                  <div>
                    <p className="text-sm text-gray-500">연락처</p>
                    <p className="font-normal">{order.client.mobile}</p>
                  </div>
                )}
                {order.client.email && (
                  <div>
                    <p className="text-sm text-gray-500">이메일</p>
                    <p className="font-normal">{order.client.email}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 파일 보관 정보 */}
            {retention && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">파일 보관 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">보관기간</span>
                    <span>{retention.retentionMonths}개월</span>
                  </div>
                  {retention.shippedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">배송완료일</span>
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
                      src={currentFile.thumbnailUrl || currentFile.fileUrl}
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
                    {currentFile.fileName && <span className="text-gray-400 truncate">{currentFile.fileName}</span>}
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

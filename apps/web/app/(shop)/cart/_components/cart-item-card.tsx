'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Trash2,
  Minus,
  Plus,
  BookOpen,
  Package,
  Clock,
  Truck,
  Copy,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  Upload,
  Loader2,
  RefreshCw,
  XCircle,
  Ban,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { FolderShippingSection } from '@/components/album-upload/folder-shipping-section';
import { CartThumbnailGallery } from './cart-thumbnail-gallery';
import { cn, normalizeImageUrl } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CartItem, CartShippingInfo } from '@/stores/cart-store';
import type { FolderShippingInfo } from '@/stores/multi-folder-upload-store';
import type { CompanyShippingInfo, OrdererShippingInfo } from '@/hooks/use-shipping-data';
import type { DeliveryPricing } from '@/hooks/use-delivery-pricing';
import { useTranslations } from 'next-intl';
import { retryBackgroundUpload, canRetryUpload, cancelUpload, canCancelUpload } from '@/lib/background-upload';
import { useCartStore } from '@/stores/cart-store';

const DELIVERY_METHODS = [
  { value: 'parcel', label: '택배' },
  { value: 'freight', label: '화물' },
  { value: 'motorcycle', label: '오토바이퀵' },
  { value: 'pickup', label: '방문수령' },
] as const;

const getDeliveryMethodLabel = (method: string) =>
  DELIVERY_METHODS.find((m) => m.value === method)?.label || method;

const getBindingDirectionLabel = (direction: string): string => {
  const labels: Record<string, string> = {
    LEFT_START_RIGHT_END: '좌시우끝',
    LEFT_START_LEFT_END: '좌시좌끝',
    RIGHT_START_LEFT_END: '우시좌끝',
    RIGHT_START_RIGHT_END: '우시우끝',
    'ltr-rend': '좌시우끝',
    'ltr-lend': '좌시좌끝',
    'rtl-lend': '우시좌끝',
    'rtl-rend': '우시우끝',
  };
  return labels[direction] || direction;
};

export const isShippingComplete = (info?: CartShippingInfo): boolean => {
  if (!info) return false;
  if (info.deliveryMethod === 'pickup') return true;
  return !!(info.recipientName && info.recipientPhone && info.recipientAddress);
};

export const getCartShippingSummary = (info: CartShippingInfo): string => {
  const methodLabel = getDeliveryMethodLabel(info.deliveryMethod);
  if (info.deliveryMethod === 'pickup') return methodLabel;
  const senderLabel = info.senderType === 'company' ? '회사' : '주문자';
  const receiverLabel = info.receiverType === 'orderer' ? '스튜디오' : '고객직배송';
  const feeLabel = info.deliveryFee === 0 ? '무료' : `${info.deliveryFee.toLocaleString()}원`;
  return `${methodLabel} · ${senderLabel}→${receiverLabel} · ${feeLabel}`;
};

const PAGE_LAYOUT_OPTIONS = [
  { value: 'spread', label: '펼친면' },
  { value: 'single', label: '낱장' },
] as const;

const BINDING_DIRECTION_OPTIONS = [
  { value: 'LEFT_START_RIGHT_END', label: '좌시우끝' },
  { value: 'LEFT_START_LEFT_END', label: '좌시좌끝' },
  { value: 'RIGHT_START_LEFT_END', label: '우시좌끝' },
  { value: 'RIGHT_START_RIGHT_END', label: '우시우끝' },
] as const;

export interface CartItemCardProps {
  item: CartItem;
  isSelected: boolean;
  hasShipping: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onShippingChange: (id: string, shipping: FolderShippingInfo) => void;
  onAlbumInfoChange?: (id: string, updates: Partial<import('@/stores/cart-store').AlbumOrderCartInfo>) => void;
  onApplyToAll: (id: string) => void;
  onCopyFromPrevious: (() => void) | null;
  itemsCount: number;
  companyInfo: CompanyShippingInfo | null;
  clientInfo: OrdererShippingInfo | null;
  pricingMap: Record<string, DeliveryPricing>;
  studioTotal?: number;
}

export function CartItemCard({
  item,
  isSelected,
  hasShipping,
  onSelect,
  onRemove,
  onUpdateQuantity,
  onShippingChange,
  onAlbumInfoChange,
  onApplyToAll,
  onCopyFromPrevious,
  itemsCount,
  companyInfo,
  clientInfo,
  pricingMap,
  studioTotal,
}: CartItemCardProps) {
  const t = useTranslations('cart');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // Swipe state for mobile
  const [swipeX, setSwipeX] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX;
    if (deltaX < -10) {
      setIsSwiping(true);
      setSwipeX(Math.max(deltaX, -100));
    } else if (deltaX > 10 && swipeX < 0) {
      setSwipeX(Math.min(0, swipeX + deltaX));
    }
  };

  const handleTouchEnd = () => {
    if (swipeX < -60) {
      setSwipeX(-100);
    } else {
      setSwipeX(0);
    }
    setIsSwiping(false);
  };

  const hasAlbumShipping = !!item.albumOrderInfo?.shippingInfo;
  const itemShipping = item.shippingInfo;
  const shippingComplete = hasAlbumShipping || isShippingComplete(itemShipping);

  return (
    <div ref={setNodeRef} style={style} className="relative overflow-hidden lg:overflow-visible">
      {/* Swipe delete action (mobile only) */}
      <div className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center lg:hidden z-0">
        <button
          onClick={() => onRemove(item.id)}
          className="text-white flex flex-col items-center gap-1 touch-target"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs font-medium">{t('deleteSelected').replace('선택', '')}</span>
        </button>
      </div>

      <Card
        className={cn(
          'relative z-10 overflow-hidden transition-all duration-200 group',
          'max-sm:rounded-none max-sm:border-x-0 max-sm:-mx-4',
          isSelected && 'ring-2 ring-primary/25 border-primary/20 bg-primary/[0.015]',
          !isSelected && !isDragging && 'hover:shadow-md hover:border-gray-300',
          !hasShipping && !hasAlbumShipping && 'border-orange-300 bg-orange-50/30',
          isDragging && 'shadow-xl scale-[1.02] z-50'
        )}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex items-center px-2.5 sm:px-2 cursor-grab active:cursor-grabbing hover:bg-gray-100 active:bg-gray-200 transition-colors border-r touch-target flex-shrink-0"
          >
            <GripVertical className="h-5 w-5 text-gray-400" />
          </div>

          {/* Checkbox */}
          <div
            className={cn(
              'flex items-center justify-center w-10 sm:w-12 border-r transition-colors flex-shrink-0',
              isSelected ? 'bg-primary/5' : 'bg-transparent'
            )}
          >
            {hasShipping ? (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect(item.id, checked as boolean)}
                className="w-5 h-5"
              />
            ) : (
              <div className="relative group/tip">
                <Checkbox disabled checked={false} className="w-5 h-5" />
                <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden group-hover/tip:block z-10 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  {t('setShipping')}
                </div>
              </div>
            )}
          </div>

          {/* Product Image */}
          <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 m-2.5 sm:m-3">
            {item.thumbnailUrl ? (
              <img
                src={normalizeImageUrl(item.thumbnailUrl)}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-300" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 py-2.5 sm:py-3 pr-3 sm:pr-4 min-w-0">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                {/* Product name */}
                <Link
                  href={`/product/${item.productId}`}
                  className="text-sm sm:text-base font-semibold text-gray-900 hover:text-primary transition-colors line-clamp-2"
                >
                  {item.name}
                </Link>

                {/* Badges */}
                <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                  {item.productType === 'album-order' && (
                    <Badge className="bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 text-[11px] px-2 py-0.5 font-medium border border-purple-200/50 rounded-md">
                      <BookOpen className="w-3 h-3 mr-1" />
                      {t('album')}
                    </Badge>
                  )}
                  {item.productType === 'half_product' && (
                    <Badge className="bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 text-[11px] px-2 py-0.5 font-medium border border-amber-200/50 rounded-md">
                      <Package className="w-3 h-3 mr-1" />
                      {t('halfProduct')}
                    </Badge>
                  )}
                  {item.uploadStatus === 'completed' && item.serverFiles && item.serverFiles.length > 0 && (
                    <Badge className="bg-gradient-to-r from-green-100 to-green-50 text-green-700 text-[11px] px-2 py-0.5 font-medium border border-green-200/50 rounded-md">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      업로드 완료 ({item.serverFiles.length}건)
                    </Badge>
                  )}
                  {item.uploadStatus === 'completed' && (!item.serverFiles || item.serverFiles.length === 0) && (
                    <Badge className="bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 text-[11px] px-2 py-0.5 font-medium border border-orange-200/50 rounded-md">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      파일 누락 — 재업로드 필요
                    </Badge>
                  )}
                  {item.uploadStatus === 'uploading' && (
                    <Badge className="bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 text-[11px] px-2 py-0.5 font-medium border border-blue-200/50 rounded-md">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      {item.uploadedFileCount || 0}/{item.totalFileCount || 0}건 · {item.uploadProgress || 0}%
                    </Badge>
                  )}
                  {item.uploadStatus === 'failed' && (
                    <Badge className="bg-gradient-to-r from-red-100 to-red-50 text-red-700 text-[11px] px-2 py-0.5 font-medium border border-red-200/50 rounded-md">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      업로드 실패 ({item.serverFiles?.length || 0}/{item.totalFileCount || 0}건)
                    </Badge>
                  )}
                  {item.addedAt && (
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.addedAt).toLocaleDateString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit',
                      }).replace(/\. /g, '.')}{' '}
                      {new Date(item.addedAt).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </span>
                  )}
                </div>

                {/* Album specs */}
                {item.albumOrderInfo && (
                  <div className="mt-1.5">
                    <div className="inline-flex items-center gap-1 text-[11px] text-purple-600 bg-purple-50 rounded-md px-2 py-1 flex-wrap">
                      <span>
                        {item.albumOrderInfo.printMethod === 'indigo' ? '인디고앨범' : '잉크젯'}
                      </span>
                      <Separator orientation="vertical" className="h-3 bg-purple-200" />
                      <span>{item.albumOrderInfo.colorMode === '4c' ? '4도' : '6도'}</span>
                      <Separator orientation="vertical" className="h-3 bg-purple-200" />
                      <span>{item.albumOrderInfo.pageCount}p</span>
                      <Separator orientation="vertical" className="h-3 bg-purple-200" />
                      <select
                        title="편집스타일"
                        value={item.albumOrderInfo.pageLayout}
                        onChange={(e) => onAlbumInfoChange?.(item.id, { pageLayout: e.target.value as 'single' | 'spread' })}
                        className="bg-transparent text-purple-600 text-[11px] font-medium border border-purple-300 rounded px-1 py-0 cursor-pointer hover:bg-purple-100 focus:outline-none focus:ring-1 focus:ring-purple-400"
                      >
                        {PAGE_LAYOUT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <Separator orientation="vertical" className="h-3 bg-purple-200" />
                      <select
                        title="제본순서"
                        value={item.albumOrderInfo.bindingDirection}
                        onChange={(e) => onAlbumInfoChange?.(item.id, { bindingDirection: e.target.value })}
                        className="bg-transparent text-purple-600 text-[11px] font-medium border border-purple-300 rounded px-1 py-0 cursor-pointer hover:bg-purple-100 focus:outline-none focus:ring-1 focus:ring-purple-400"
                      >
                        {BINDING_DIRECTION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* 표지원단 / 동판 정보 */}
                {item.albumOrderInfo && (item.albumOrderInfo.fabricName || item.albumOrderInfo.foilName) && (
                  <div className="mt-1 flex items-center gap-1 flex-wrap text-[10px]">
                    {item.albumOrderInfo.fabricName && (
                      <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                        {item.albumOrderInfo.fabricName}
                      </span>
                    )}
                    {item.albumOrderInfo.foilName && (
                      <span className="bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded border border-violet-200">
                        {item.albumOrderInfo.foilName}
                      </span>
                    )}
                    {item.albumOrderInfo.foilColor && (
                      <span className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200">
                        {item.albumOrderInfo.foilColor}
                      </span>
                    )}
                    {item.albumOrderInfo.foilPosition && (
                      <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                        {item.albumOrderInfo.foilPosition}
                      </span>
                    )}
                  </div>
                )}

                {/* Options */}
                {item.options.length > 0 && (
                  <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                    {item.options.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <span className="text-gray-400">{option.name}:</span>
                        <span>{option.value}</span>
                        {option.price > 0 && (
                          <span className="text-primary font-medium">
                            (+{option.price.toLocaleString()}원)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Album shipping info badge */}
                {hasAlbumShipping && item.albumOrderInfo?.shippingInfo && (
                  <div className="mt-1.5">
                    <div className="text-[11px] text-blue-600 bg-blue-50 rounded-md px-2 py-1 inline-flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      <span>
                        {getDeliveryMethodLabel(item.albumOrderInfo.shippingInfo.deliveryMethod)}
                      </span>
                      <span>·</span>
                      <span>
                        {item.albumOrderInfo.shippingInfo.receiverType === 'orderer'
                          ? '스튜디오'
                          : '고객직배송'}
                      </span>
                      <span>·</span>
                      <span>
                        {item.albumOrderInfo.shippingInfo.deliveryFee === 0
                          ? '무료'
                          : `${item.albumOrderInfo.shippingInfo.deliveryFee.toLocaleString()}원`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={() => onRemove(item.id)}
                className="flex p-2 -mr-1 text-gray-400 hover:text-red-500 active:text-red-600 transition-colors rounded-lg hover:bg-red-50 touch-target"
                aria-label="삭제"
              >
                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Quantity + Price */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
              <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50/50">
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-l-lg hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-30 touch-target"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-10 sm:w-12 text-center font-semibold text-sm tabular-nums select-none">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-r-lg hover:bg-gray-100 active:bg-gray-200 transition-colors touch-target"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="text-right">
                <p className="text-base sm:text-lg font-bold text-gray-900">
                  {item.totalPrice.toLocaleString()}
                  <span className="text-xs sm:text-sm font-normal text-gray-500 ml-0.5">원</span>
                </p>
                {item.quantity > 1 && (
                  <p className="text-[11px] text-gray-400">
                    @{item.basePrice.toLocaleString()}원
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Upload warning: completed but no serverFiles (data lost after refresh) */}
        {item.uploadStatus === 'completed' && (!item.serverFiles || item.serverFiles.length === 0) && (
          <div className="border-t border-orange-200 bg-orange-50 px-4 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-orange-700">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="font-medium">파일 데이터가 누락되었습니다. 상품을 삭제 후 다시 업로드해주세요.</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                삭제
              </Button>
            </div>
          </div>
        )}

        {/* Upload progress section */}
        {item.uploadStatus && item.uploadStatus !== 'completed' && (
          <div className="border-t border-gray-100 px-4 py-2.5">
            {item.uploadStatus === 'uploading' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-blue-600">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="font-medium">원본 파일 업로드 중...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 tabular-nums">
                      {item.uploadedFileCount || 0}/{item.totalFileCount || 0}건 · {item.uploadProgress || 0}%
                    </span>
                    {canCancelUpload(item.id) ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded px-1.5 py-0.5 transition-colors"
                        onClick={() => cancelUpload(item.id)}
                        title="업로드 중단"
                      >
                        <XCircle className="w-4 h-4" />
                        <span className="text-[11px] font-medium">중단</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded px-1.5 py-0.5 transition-colors"
                        onClick={() => useCartStore.getState().updateUploadStatus(item.id, { uploadStatus: 'completed', uploadProgress: 100 })}
                        title="상태 해제"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[11px] font-medium">상태 해제</span>
                      </button>
                    )}
                  </div>
                </div>
                {canCancelUpload(item.id) && (
                  <Progress value={item.uploadProgress || 0} className="h-1.5 rounded-full bg-blue-100" />
                )}
              </div>
            )}
            {item.uploadStatus === 'pending' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Upload className="w-3.5 h-3.5" />
                  <span>업로드 대기 중...</span>
                </div>
                {!canCancelUpload(item.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => useCartStore.getState().updateUploadStatus(item.id, { uploadStatus: 'completed', uploadProgress: 100 })}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    상태 해제
                  </Button>
                )}
              </div>
            )}
            {item.uploadStatus === 'cancelled' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Ban className="w-3.5 h-3.5" />
                  <span>업로드 중단됨</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => useCartStore.getState().updateUploadStatus(item.id, { uploadStatus: 'completed', uploadProgress: 100 })}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  상태 해제
                </Button>
              </div>
            )}
            {item.uploadStatus === 'failed' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="font-medium">
                    업로드 실패 ({item.uploadedFileCount || 0}/{item.totalFileCount || 0}건 완료)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {canRetryUpload(item.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => retryBackgroundUpload(item.id)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      재시도
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => useCartStore.getState().updateUploadStatus(item.id, { uploadStatus: 'completed', uploadProgress: 100 })}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    상태 해제
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shipping section (non-album items) */}
        {!hasAlbumShipping && (
          <div className="border-t border-gray-100">
            <Accordion
              type="single"
              collapsible
            >
              <AccordionItem value={item.id} className="border-0">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50/50 hover:no-underline">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                        shippingComplete ? 'bg-green-100' : 'bg-orange-100'
                      )}
                    >
                      {shippingComplete ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                      )}
                    </div>
                    {isShippingComplete(itemShipping) ? (
                      <span className="text-sm text-gray-700">
                        {getCartShippingSummary(itemShipping!)}
                      </span>
                    ) : (
                      <span className="text-sm text-orange-600 font-medium">
                        {t('setShipping')}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                    <FolderShippingSection
                      shippingInfo={itemShipping as unknown as FolderShippingInfo | undefined}
                      companyInfo={companyInfo}
                      clientInfo={clientInfo}
                      pricingMap={pricingMap}
                      onChange={(shipping) => onShippingChange(item.id, shipping)}
                      studioTotal={studioTotal}
                    />

                    {onCopyFromPrevious && !isShippingComplete(itemShipping) && (
                      <div className="pt-3 border-t border-gray-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onCopyFromPrevious}
                          className="w-full"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          {t('copyPrevious')}
                        </Button>
                      </div>
                    )}

                    {itemsCount > 1 && isShippingComplete(itemShipping) && (
                      <div className="pt-3 border-t border-gray-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onApplyToAll(item.id)}
                          className="w-full"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          {t('applyToAll')}
                        </Button>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        {/* Thumbnail gallery */}
        {item.thumbnailUrls && item.thumbnailUrls.length > 1 && (
          <CartThumbnailGallery
            thumbnailUrls={item.thumbnailUrls}
            pageLayout={item.albumOrderInfo?.pageLayout}
            bindingDirection={item.albumOrderInfo?.bindingDirection}
          />
        )}
      </Card>
    </div>
  );
}

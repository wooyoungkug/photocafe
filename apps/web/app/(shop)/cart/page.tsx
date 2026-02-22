'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCartStore, type CartShippingInfo } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useShippingData } from '@/hooks/use-shipping-data';
import { useSameDayShipping } from '@/hooks/use-same-day-shipping';
import { useToast } from '@/hooks/use-toast';
import type { FolderShippingInfo } from '@/stores/multi-folder-upload-store';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';

import { CartStepIndicator } from './_components/cart-step-indicator';
import { CartEmptyState } from './_components/cart-empty-state';
import { CartSelectBar } from './_components/cart-select-bar';
import { CartGlobalShipping } from './_components/cart-global-shipping';
import { CartItemCard, isShippingComplete } from './_components/cart-item-card';
import { CartItemDragOverlay } from './_components/cart-item-drag-overlay';
import { CartOrderSummary } from './_components/cart-order-summary';
import { CartMobileCheckoutBar } from './_components/cart-mobile-checkout-bar';
import { CartDeleteDialog } from './_components/cart-delete-dialog';
import { canCancelUpload } from '@/lib/background-upload';

export default function CartPage() {
  const router = useRouter();
  const t = useTranslations('cart');
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    updateItemShipping,
    updateAllItemsShipping,
    updateAlbumInfo,
    reorderItems,
  } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Stale upload 상태 복구: 페이지 로드 시 pending/uploading인데 실제 업로드 프로세스가 없는 아이템 처리
  const { updateUploadStatus } = useCartStore();
  useEffect(() => {
    items.forEach((item) => {
      if (
        (item.uploadStatus === 'pending' || item.uploadStatus === 'uploading') &&
        !canCancelUpload(item.id)
      ) {
        if (item.serverFiles && item.serverFiles.length > 0) {
          updateUploadStatus(item.id, { uploadStatus: 'completed', uploadProgress: 100 });
        } else {
          updateUploadStatus(item.id, { uploadStatus: 'completed', uploadProgress: 100 });
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Delete dialogs
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [clearCartOpen, setClearCartOpen] = useState(false);

  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Shipping data
  const { companyInfo, clientInfo, pricingMap } = useShippingData();

  // 당일 합배송 현황 (스튜디오 배송 거래처에만 표시)
  const { data: sameDayInfo } = useSameDayShipping(
    clientInfo?.shippingType === 'conditional' ? clientInfo.id : null,
  );

  // --- Helpers ---
  const canSelectItem = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return false;
    if (item.albumOrderInfo?.shippingInfo) return true;
    return isShippingComplete(item.shippingInfo);
  };

  const selectableCount = items.filter((item) => canSelectItem(item.id)).length;
  const shippingCompleteCount = selectableCount;

  // --- Handlers ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      reorderItems(arrayMove(items, oldIndex, newIndex));
    }
    setActiveDragId(null);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(
      checked ? items.filter((item) => canSelectItem(item.id)).map((item) => item.id) : []
    );
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems((prev) =>
      checked ? [...prev, itemId] : prev.filter((id) => id !== itemId)
    );
  };

  // Delete handlers with toast
  const handleRemoveItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    removeItem(id);
    setSelectedItems((prev) => prev.filter((i) => i !== id));
    setDeleteTargetId(null);
    toast({ title: t('itemDeleted'), description: item?.name });
  };

  const handleRemoveSelected = () => {
    const count = selectedItems.length;
    selectedItems.forEach((id) => removeItem(id));
    setSelectedItems([]);
    setBulkDeleteOpen(false);
    toast({ title: t('itemsDeleted', { count }) });
  };

  const handleClearCart = () => {
    clearCart();
    setSelectedItems([]);
    setClearCartOpen(false);
    toast({ title: t('cartCleared') });
  };

  // Shipping handlers
  const handleShippingChange = (itemId: string, shipping: FolderShippingInfo) => {
    const cartShipping: CartShippingInfo = {
      senderType: shipping.senderType,
      senderName: shipping.senderName,
      senderPhone: shipping.senderPhone,
      senderPostalCode: shipping.senderPostalCode,
      senderAddress: shipping.senderAddress,
      senderAddressDetail: shipping.senderAddressDetail,
      receiverType: shipping.receiverType,
      recipientName: shipping.recipientName,
      recipientPhone: shipping.recipientPhone,
      recipientPostalCode: shipping.recipientPostalCode,
      recipientAddress: shipping.recipientAddress,
      recipientAddressDetail: shipping.recipientAddressDetail,
      deliveryMethod: shipping.deliveryMethod,
      deliveryFee: shipping.deliveryFee,
      deliveryFeeType: shipping.deliveryFeeType,
    };
    updateItemShipping(itemId, cartShipping);
    if (isShippingComplete(cartShipping) && !selectedItems.includes(itemId)) {
      setSelectedItems((prev) => [...prev, itemId]);
    }
  };

  const handleApplyToAll = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item?.shippingInfo) {
      updateAllItemsShipping(item.shippingInfo);
      setSelectedItems(items.map((i) => i.id));
      toast({ title: t('shippingApplied') });
    }
  };

  const handleCopyFromPrevious = (itemId: string) => {
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx <= 0) return;
    for (let i = idx - 1; i >= 0; i--) {
      const prevItem = items[i];
      const prevShipping = prevItem.albumOrderInfo?.shippingInfo || prevItem.shippingInfo;
      if (prevShipping && isShippingComplete(prevShipping)) {
        const cartShipping: CartShippingInfo = {
          senderType: prevShipping.senderType,
          senderName: prevShipping.senderName,
          senderPhone: prevShipping.senderPhone,
          senderPostalCode: prevShipping.senderPostalCode,
          senderAddress: prevShipping.senderAddress,
          senderAddressDetail: prevShipping.senderAddressDetail,
          receiverType: prevShipping.receiverType,
          recipientName: prevShipping.recipientName,
          recipientPhone: prevShipping.recipientPhone,
          recipientPostalCode: prevShipping.recipientPostalCode,
          recipientAddress: prevShipping.recipientAddress,
          recipientAddressDetail: prevShipping.recipientAddressDetail,
          deliveryMethod: prevShipping.deliveryMethod,
          deliveryFee: prevShipping.deliveryFee,
          deliveryFeeType: prevShipping.deliveryFeeType,
        };
        updateItemShipping(itemId, cartShipping);
        if (!selectedItems.includes(itemId)) {
          setSelectedItems((prev) => [...prev, itemId]);
        }
        toast({ title: t('shippingCopied') });
        break;
      }
    }
  };

  const handleGlobalShippingChange = (shipping: FolderShippingInfo) => {
    const cartShipping: CartShippingInfo = {
      senderType: shipping.senderType,
      senderName: shipping.senderName,
      senderPhone: shipping.senderPhone,
      senderPostalCode: shipping.senderPostalCode,
      senderAddress: shipping.senderAddress,
      senderAddressDetail: shipping.senderAddressDetail,
      receiverType: shipping.receiverType,
      recipientName: shipping.recipientName,
      recipientPhone: shipping.recipientPhone,
      recipientPostalCode: shipping.recipientPostalCode,
      recipientAddress: shipping.recipientAddress,
      recipientAddressDetail: shipping.recipientAddressDetail,
      deliveryMethod: shipping.deliveryMethod,
      deliveryFee: shipping.deliveryFee,
      deliveryFeeType: shipping.deliveryFeeType,
    };
    updateAllItemsShipping(cartShipping);
    setSelectedItems(items.map((i) => i.id));
    toast({ title: t('shippingApplied') });
  };

  // Totals
  const selectedCartItems = items.filter((item) => selectedItems.includes(item.id));
  const selectedTotal = selectedCartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  // 스튜디오배송 상품 합계 (조건부 무료배송 기준)
  const studioItemsTotal = selectedCartItems
    .filter((item) => {
      const sh = item.albumOrderInfo?.shippingInfo || item.shippingInfo;
      return sh?.receiverType === 'orderer';
    })
    .reduce((sum, item) => sum + item.totalPrice, 0);

  // 당일 합배송 조건 충족 여부 (이전 주문 누적 포함)
  // - 묶음배송: 당일 이미 배송비가 청구된 주문이 있으면 → 이번 주문만 무료 (기존 주문 환불 없음)
  // - 임계값 달성: 누적 금액이 무료배송 기준 이상이면 → 이번 주문 무료 + 기존 주문 배송비 환불
  const isBundledFree =
    !!sameDayInfo?.applicable &&
    sameDayInfo.ordersWithFee.length > 0;
  const isSameDayThresholdMet =
    !!sameDayInfo?.applicable &&
    sameDayInfo.totalProductAmount > 0 &&
    sameDayInfo.totalProductAmount + studioItemsTotal >= sameDayInfo.freeThreshold;
  const sameDayFreeEligible = isBundledFree || isSameDayThresholdMet;
  // 환불 대상 배송비: 임계값 달성 시에만 기존 주문 배송비 환불 (묶음배송은 이번 주문만 면제)
  const sameDayRefund = isSameDayThresholdMet ? sameDayInfo!.totalShippingCharged : 0;

  // 배송비 합계
  // - 고객직배송: 무조건 청구 (개별 배송)
  // - 스튜디오배송: 스튜디오 합계가 무료배송 임계값 이상이면 전체 무료, 미달 시 배송방법별 1회 청구
  // - 당일 합배송 조건 충족 시: 스튜디오 배송 전체 무료
  const freeThreshold = clientInfo?.freeShippingThreshold
    ?? (pricingMap['parcel']?.freeThreshold != null ? Number(pricingMap['parcel'].freeThreshold) : 90000);
  const isStudioFree =
    clientInfo?.shippingType === 'free' ||
    (clientInfo?.shippingType === 'conditional' && studioItemsTotal >= freeThreshold) ||
    sameDayFreeEligible;

  const totalShippingFee = (() => {
    let total = 0;
    const chargedStudioMethods = new Set<string>();

    for (const item of selectedCartItems) {
      const sh = item.albumOrderInfo?.shippingInfo || item.shippingInfo;
      if (!sh || sh.deliveryMethod === 'pickup') continue;

      if (sh.receiverType === 'direct_customer') {
        // 고객직배송: 조건 없이 항목별 청구
        total += sh.deliveryFee || 0;
      } else if (sh.receiverType === 'orderer' && !isStudioFree) {
        // 스튜디오배송: 동일 배송방법은 1회만 청구 (합배송)
        if (!chargedStudioMethods.has(sh.deliveryMethod)) {
          chargedStudioMethods.add(sh.deliveryMethod);
          total += sh.deliveryFee || 0;
        }
      }
    }
    return total;
  })();

  // 무료배송 사유 레이블
  const freeShippingLabel: string | null = (() => {
    if (!isStudioFree) return null;
    const hasStudioDelivery = selectedCartItems.some((item) => {
      const sh = item.albumOrderInfo?.shippingInfo || item.shippingInfo;
      return sh && sh.receiverType === 'orderer' && sh.deliveryMethod !== 'pickup';
    });
    if (!hasStudioDelivery) return null;
    if (sameDayFreeEligible) {
      return isSameDayThresholdMet ? '묶음배송 조건부 무료배송 달성' : '묶음배송 무료';
    }
    if (clientInfo?.shippingType === 'free') return '무료배송 거래처';
    if (clientInfo?.shippingType === 'conditional') return '조건부 무료배송';
    return null;
  })();

  // 합배송: 스튜디오배송에서 동일 배송방법의 2번째 이상 아이템 ID 집합 (배송비 1회만 청구)
  // - 당일 묶음배송 무료 조건 충족 시: 모든 스튜디오 배송 아이템을 무료(합배송) 표시
  const combinedShippingIds = new Set<string>();
  if (items.length > 1 || sameDayFreeEligible) {
    const seenStudioMethods = new Set<string>();
    for (const item of items) {
      const sh = item.albumOrderInfo?.shippingInfo || item.shippingInfo;
      if (!sh || sh.deliveryMethod === 'pickup' || sh.receiverType !== 'orderer') continue;
      if (sameDayFreeEligible || seenStudioMethods.has(sh.deliveryMethod)) {
        combinedShippingIds.add(item.id);
      } else {
        seenStudioMethods.add(sh.deliveryMethod);
      }
    }
  }

  // 선택된 아이템의 고유 배송방법 목록
  const selectedDeliveryMethods = [
    ...new Set(
      selectedCartItems
        .map((item) => {
          const sh = item.albumOrderInfo?.shippingInfo || item.shippingInfo;
          return sh?.deliveryMethod;
        })
        .filter((m): m is string => !!m)
    ),
  ];

  // 업로드 진행 중인 아이템이 있는지 확인
  const hasUploadInProgress = items.some(
    (item) => item.uploadStatus === 'uploading' || item.uploadStatus === 'pending'
  );
  const hasUploadFailed = items.some((item) => item.uploadStatus === 'failed');
  // 앨범 상품인데 업로드 완료 후 serverFiles가 누락된 경우 (새로고침 등으로 유실)
  const hasFileMissing = items.some(
    (item) => item.productType === 'album-order' && item.uploadStatus === 'completed' && (!item.serverFiles || item.serverFiles.length === 0)
  );

  const handleCheckout = () => {
    if (hasUploadInProgress) {
      toast({
        title: '파일 업로드 진행 중',
        description: '원본 파일 업로드가 완료된 후 주문할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }
    if (hasUploadFailed) {
      toast({
        title: '업로드 실패 항목 확인',
        description: '업로드에 실패한 항목이 있습니다. 재시도하거나 삭제 후 주문해주세요.',
        variant: 'destructive',
      });
      return;
    }
    if (hasFileMissing) {
      toast({
        title: '파일 데이터 누락',
        description: '파일 데이터가 누락된 앨범 상품이 있습니다. 해당 상품을 삭제 후 다시 업로드해주세요.',
        variant: 'destructive',
      });
      return;
    }
    if (!isAuthenticated) {
      router.push('/login?redirect=/order');
      return;
    }
    router.push('/order');
  };

  // Empty state
  if (items.length === 0) {
    return <CartEmptyState />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold">{t('title')}</h1>
            <Badge className="bg-primary/10 text-primary border-0 text-sm font-semibold px-2.5 py-0.5">
              {items.length}
            </Badge>
          </div>
          <CartStepIndicator currentStep={0} />
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4 pb-32 lg:pb-0">
            {/* Select All */}
            <CartSelectBar
              totalCount={items.length}
              selectableCount={selectableCount}
              selectedCount={selectedItems.length}
              onSelectAll={handleSelectAll}
              onDeleteSelected={() => selectedItems.length > 0 && setBulkDeleteOpen(true)}
              onClearCart={() => setClearCartOpen(true)}
            />

            {/* Global Shipping */}
            {items.filter((i) => !i.albumOrderInfo?.shippingInfo).length > 1 && (
              <CartGlobalShipping
                companyInfo={companyInfo}
                clientInfo={clientInfo}
                pricingMap={pricingMap}
                onGlobalShippingChange={handleGlobalShippingChange}
              />
            )}

            {/* Items List */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(event) => setActiveDragId(event.active.id as string)}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveDragId(null)}
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 sm:space-y-4">
                  {(() => {
                    // O(n) 사전 계산: 이전 배송정보 존재 여부 맵
                    const hasPrevShippingMap = new Map<number, boolean>();
                    let foundPrevShipping = false;
                    for (let i = 0; i < items.length; i++) {
                      hasPrevShippingMap.set(i, foundPrevShipping);
                      const shipping = items[i].albumOrderInfo?.shippingInfo || items[i].shippingInfo;
                      if (shipping && isShippingComplete(shipping)) {
                        foundPrevShipping = true;
                      }
                    }
                    const noShippingCount = items.filter((i) => !i.albumOrderInfo?.shippingInfo).length;

                    return items.map((item, idx) => {
                      const hasPrevShipping = !item.albumOrderInfo?.shippingInfo && (hasPrevShippingMap.get(idx) ?? false);
                      return (
                        <CartItemCard
                          key={item.id}
                          item={item}
                          isSelected={selectedItems.includes(item.id)}
                          hasShipping={canSelectItem(item.id)}
                          onSelect={handleSelectItem}
                          onRemove={setDeleteTargetId}
                          onUpdateQuantity={updateQuantity}
                          onShippingChange={handleShippingChange}
                          onAlbumInfoChange={updateAlbumInfo}
                          onApplyToAll={handleApplyToAll}
                          onCopyFromPrevious={
                            hasPrevShipping ? () => handleCopyFromPrevious(item.id) : null
                          }
                          isCombinedShipping={combinedShippingIds.has(item.id)}
                          itemsCount={noShippingCount}
                          companyInfo={companyInfo}
                          clientInfo={clientInfo}
                          pricingMap={pricingMap}
                          studioTotal={studioItemsTotal}
                        />
                      );
                    });
                  })()}
                </div>
              </SortableContext>

              <DragOverlay adjustScale={false}>
                {activeDragId ? (
                  <CartItemDragOverlay
                    item={items.find((i) => i.id === activeDragId)!}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* Continue Shopping */}
            <div className="text-center pt-4">
              <Link href="/">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('continueShopping')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Order Summary (Desktop) */}
          <div className="hidden lg:block lg:col-span-1">
            <CartOrderSummary
              selectedCount={selectedItems.length}
              totalCount={items.length}
              shippingCompleteCount={shippingCompleteCount}
              selectedTotal={selectedTotal}
              totalShippingFee={totalShippingFee}
              sameDayRefund={sameDayRefund}
              freeShippingLabel={freeShippingLabel}
              deliveryMethods={selectedDeliveryMethods}
              isAuthenticated={isAuthenticated}
              hasUploadInProgress={hasUploadInProgress}
              hasUploadFailed={hasUploadFailed}
              hasFileMissing={hasFileMissing}
              onCheckout={handleCheckout}
              sameDayInfo={sameDayInfo ?? null}
              newOrderStudioTotal={studioItemsTotal}
            />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Checkout Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40">
        <CartMobileCheckoutBar
          selectedCount={selectedItems.length}
          selectedTotal={selectedTotal}
          totalShippingFee={totalShippingFee}
          sameDayRefund={sameDayRefund}
          hasUploadInProgress={hasUploadInProgress}
          hasUploadFailed={hasUploadFailed}
          hasFileMissing={hasFileMissing}
          onCheckout={handleCheckout}
        />
      </div>

      {/* Delete Dialogs */}
      <CartDeleteDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        onConfirm={() => deleteTargetId && handleRemoveItem(deleteTargetId)}
        title={t('deleteConfirmTitle')}
        description={t('deleteConfirmMessage')}
      />
      <CartDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={handleRemoveSelected}
        title={t('deleteConfirmTitle')}
        description={t('itemsDeleted', { count: selectedItems.length })}
      />
      <CartDeleteDialog
        open={clearCartOpen}
        onOpenChange={setClearCartOpen}
        onConfirm={handleClearCart}
        title={t('clearConfirmTitle')}
        description={t('clearConfirmMessage')}
      />
    </div>
  );
}

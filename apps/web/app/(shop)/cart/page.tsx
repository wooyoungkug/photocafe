'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCartStore, type CartShippingInfo } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useShippingData } from '@/hooks/use-shipping-data';
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
  const totalShippingFee = selectedCartItems.reduce((sum, item) => {
    if (item.albumOrderInfo?.shippingInfo) return sum + (item.albumOrderInfo.shippingInfo.deliveryFee || 0);
    if (item.shippingInfo) return sum + (item.shippingInfo.deliveryFee || 0);
    return sum;
  }, 0);

  // 업로드 진행 중인 아이템이 있는지 확인
  const hasUploadInProgress = items.some(
    (item) => item.uploadStatus === 'uploading' || item.uploadStatus === 'pending'
  );
  const hasUploadFailed = items.some((item) => item.uploadStatus === 'failed');

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
                  {items.map((item, idx) => {
                    let hasPrevShipping = false;
                    if (!item.albumOrderInfo?.shippingInfo) {
                      for (let i = idx - 1; i >= 0; i--) {
                        const prev = items[i];
                        const prevShipping = prev.albumOrderInfo?.shippingInfo || prev.shippingInfo;
                        if (prevShipping && isShippingComplete(prevShipping)) {
                          hasPrevShipping = true;
                          break;
                        }
                      }
                    }
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
                        itemsCount={items.filter((i) => !i.albumOrderInfo?.shippingInfo).length}
                        companyInfo={companyInfo}
                        clientInfo={clientInfo}
                        pricingMap={pricingMap}
                      />
                    );
                  })}
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
              isAuthenticated={isAuthenticated}
              hasUploadInProgress={hasUploadInProgress}
              hasUploadFailed={hasUploadFailed}
              onCheckout={handleCheckout}
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
          hasUploadInProgress={hasUploadInProgress}
          hasUploadFailed={hasUploadFailed}
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

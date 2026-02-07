'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, ChevronRight, BookOpen, Package, Clock, Truck, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCartStore, type CartShippingInfo } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { API_URL, API_BASE_URL } from '@/lib/api';
import { FolderShippingSection } from '@/components/album-upload/folder-shipping-section';
import { useShippingData } from '@/hooks/use-shipping-data';
import type { FolderShippingInfo } from '@/stores/multi-folder-upload-store';

// 이미지 URL 정규화 함수
const normalizeImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.replace(/\/api\/v1\/api\/v1\//g, '/api/v1/');
  }
  if (url.startsWith('/api/v1/')) {
    return `${API_BASE_URL}${url}`;
  }
  if (url.startsWith('/upload')) {
    return `${API_URL}${url}`;
  }
  if (url.startsWith('/api/')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
};

const DELIVERY_METHODS = [
  { value: 'parcel', label: '택배' },
  { value: 'freight', label: '화물' },
  { value: 'motorcycle', label: '오토바이퀵' },
  { value: 'pickup', label: '방문수령' },
] as const;

const getDeliveryMethodLabel = (method: string) => {
  return DELIVERY_METHODS.find(m => m.value === method)?.label || method;
};

// 배송지 정보 유효성 검사
const isShippingComplete = (info?: CartShippingInfo): boolean => {
  if (!info) return false;
  if (info.deliveryMethod === 'pickup') return true;
  return !!(info.recipientName && info.recipientPhone && info.recipientPostalCode && info.recipientAddress);
};

// 배송 정보 요약 텍스트
const getCartShippingSummary = (info: CartShippingInfo): string => {
  const methodLabel = getDeliveryMethodLabel(info.deliveryMethod);
  if (info.deliveryMethod === 'pickup') return methodLabel;
  const senderLabel = info.senderType === 'company' ? '회사' : '주문자';
  const receiverLabel = info.receiverType === 'orderer' ? '스튜디오' : '고객직배송';
  const feeLabel = info.deliveryFee === 0 ? '무료' : `${info.deliveryFee.toLocaleString()}원`;
  return `${methodLabel} · ${senderLabel}→${receiverLabel} · ${feeLabel}`;
};

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, updateItemShipping, updateAllItemsShipping } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedShipping, setExpandedShipping] = useState<string | null>(null);

  // 배송 데이터 로드 (회사정보, 거래처정보, 배송비 단가)
  const { companyInfo, clientInfo, pricingMap } = useShippingData();

  // 배송지 입력 여부로 선택 가능 판단
  const canSelectItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return false;
    if (item.albumOrderInfo?.shippingInfo) return true;
    return isShippingComplete(item.shippingInfo);
  };

  const selectableCount = items.filter(item => canSelectItem(item.id)).length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(items.filter(item => canSelectItem(item.id)).map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleRemoveSelected = () => {
    selectedItems.forEach(id => removeItem(id));
    setSelectedItems([]);
  };

  // 배송 섹션 토글
  const toggleShipping = (itemId: string) => {
    setExpandedShipping(prev => prev === itemId ? null : itemId);
  };

  // 배송 정보 변경 핸들러
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

    // 배송 완료 시 자동 선택
    if (isShippingComplete(cartShipping) && !selectedItems.includes(itemId)) {
      setSelectedItems(prev => [...prev, itemId]);
    }
  };

  // 전체 상품에 동일 배송 적용
  const handleApplyToAll = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item?.shippingInfo) {
      updateAllItemsShipping(item.shippingInfo);
      setSelectedItems(items.map(i => i.id));
    }
  };

  const selectedCartItems = items.filter(item => selectedItems.includes(item.id));
  const selectedTotal = selectedCartItems.reduce((sum, item) => sum + item.totalPrice, 0);

  // 배송비 계산 (실제 설정된 배송비 기준)
  const totalShippingFee = selectedCartItems.reduce((sum, item) => {
    if (item.albumOrderInfo?.shippingInfo) {
      return sum + (item.albumOrderInfo.shippingInfo.deliveryFee || 0);
    }
    if (item.shippingInfo) {
      return sum + (item.shippingInfo.deliveryFee || 0);
    }
    return sum;
  }, 0);

  const handleCheckout = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/order');
      return;
    }
    router.push('/order');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-8xl mb-6">🛒</div>
          <h1 className="text-2xl font-bold mb-4">장바구니가 비어있습니다</h1>
          <p className="text-gray-500 mb-8">
            원하시는 상품을 장바구니에 담아보세요.
          </p>
          <Link href="/">
            <Button size="lg">
              <ArrowLeft className="h-5 w-5 mr-2" />
              쇼핑 계속하기
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">장바구니</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Select All & Actions */}
            <div className="bg-white rounded-lg border p-4 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectableCount > 0 && selectedItems.length === selectableCount}
                  onCheckedChange={handleSelectAll}
                  disabled={selectableCount === 0}
                />
                <span className="font-medium">
                  전체선택 ({selectedItems.length}/{items.length})
                </span>
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveSelected}
                  disabled={selectedItems.length === 0}
                >
                  선택삭제
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                >
                  전체삭제
                </Button>
              </div>
            </div>

            {/* Items List */}
            {items.map((item) => {
              const hasShipping = canSelectItem(item.id);
              const hasAlbumShipping = !!item.albumOrderInfo?.shippingInfo;
              const itemShipping = item.shippingInfo;
              const isExpanded = expandedShipping === item.id;

              return (
                <Card key={item.id} className={`overflow-hidden ${!hasShipping ? 'border-orange-200 bg-orange-50/30' : ''}`}>
                  <div className="flex">
                    {/* Checkbox */}
                    <div className="flex items-start p-4 border-r">
                      {hasShipping ? (
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                        />
                      ) : (
                        <div className="relative group">
                          <Checkbox disabled checked={false} />
                          <div className="absolute left-6 top-0 hidden group-hover:block z-10 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                            배송정보를 설정해주세요
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Product Image */}
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-100 flex-shrink-0">
                      {item.thumbnailUrl ? (
                        <img
                          src={normalizeImageUrl(item.thumbnailUrl)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          📦
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 p-4">
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/product/${item.productId}`}
                              className="font-medium hover:text-primary transition-colors"
                            >
                              {item.name}
                            </Link>
                            {item.productType === 'album-order' && (
                              <Badge className="bg-purple-100 text-purple-700 text-xs">
                                <BookOpen className="w-3 h-3 mr-1" />
                                앨범
                              </Badge>
                            )}
                            {item.productType === 'half_product' && (
                              <Badge className="bg-orange-100 text-orange-700 text-xs">
                                <Package className="w-3 h-3 mr-1" />
                                반제품
                              </Badge>
                            )}
                            {item.addedAt && (
                              <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(item.addedAt).toLocaleDateString('ko-KR', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>

                          {/* 앨범 주문 상세 정보 */}
                          {item.albumOrderInfo && (
                            <div className="mt-1 space-y-1">
                              <div className="text-xs text-purple-600 bg-purple-50 rounded px-2 py-1 inline-flex items-center gap-2">
                                <span>{item.albumOrderInfo.printMethod === 'indigo' ? '인디고' : '잉크젯'}</span>
                                <span>•</span>
                                <span>{item.albumOrderInfo.colorMode === '4c' ? '4도' : '6도'}</span>
                                <span>•</span>
                                <span>{item.albumOrderInfo.pageCount}p</span>
                              </div>
                            </div>
                          )}

                          {/* Options */}
                          {item.options.length > 0 && (
                            <div className="mt-2 text-sm text-gray-500 space-y-1">
                              {item.options.map((option, idx) => (
                                <div key={idx}>
                                  {option.name}: {option.value}
                                  {option.price > 0 && (
                                    <span className="text-primary ml-1">
                                      (+{option.price.toLocaleString()}원)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 앨범 배송 정보 표시 (앨범 주문은 업로드 시 설정됨) */}
                          {hasAlbumShipping && item.albumOrderInfo?.shippingInfo && (
                            <div className="mt-2">
                              <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 inline-flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                <span>
                                  {getDeliveryMethodLabel(item.albumOrderInfo.shippingInfo.deliveryMethod)}
                                </span>
                                <span>•</span>
                                <span>{item.albumOrderInfo.shippingInfo.receiverType === 'orderer' ? '스튜디오' : '고객직배송'}</span>
                                <span>•</span>
                                <span>{item.albumOrderInfo.shippingInfo.deliveryFee === 0 ? '무료' : `${item.albumOrderInfo.shippingInfo.deliveryFee.toLocaleString()}원`}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Quantity & Price */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center border rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-2 hover:bg-gray-100 transition-colors"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-2 hover:bg-gray-100 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="font-bold text-lg">
                          {item.totalPrice.toLocaleString()}원
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 배송 정보 섹션 (일반 상품 - 앨범 제외) */}
                  {!hasAlbumShipping && (
                    <div className="border-t">
                      {/* 요약 / 토글 헤더 */}
                      <button
                        onClick={() => toggleShipping(item.id)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-400" />
                          {isShippingComplete(itemShipping) ? (
                            <span className="text-sm text-gray-700">
                              {getCartShippingSummary(itemShipping!)}
                            </span>
                          ) : (
                            <span className="text-sm text-orange-600 font-medium">
                              배송정보를 설정해주세요
                            </span>
                          )}
                        </div>
                        {isShippingComplete(itemShipping) && !isExpanded ? (
                          <span className="text-xs text-blue-600 font-medium px-3 py-1 bg-blue-50 rounded-md">
                            배송지 수정
                          </span>
                        ) : isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </button>

                      {/* 확장된 배송 설정 */}
                      {isExpanded && (
                        <div className="px-4 pb-4">
                          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                            <FolderShippingSection
                              shippingInfo={itemShipping as unknown as FolderShippingInfo | undefined}
                              companyInfo={companyInfo}
                              clientInfo={clientInfo}
                              pricingMap={pricingMap}
                              onChange={(shipping) => handleShippingChange(item.id, shipping)}
                            />

                            {/* 확인 및 접기 버튼 */}
                            {isShippingComplete(itemShipping) && (
                              <div className="flex justify-center pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleShipping(item.id)}
                                  className="text-xs"
                                >
                                  <ChevronUp className="h-3 w-3 mr-1" />
                                  확인 및 접기
                                </Button>
                              </div>
                            )}

                            {/* 전체 적용 버튼 (2개 이상 일반 상품일 때) */}
                            {items.filter(i => !i.albumOrderInfo?.shippingInfo).length > 1 && isShippingComplete(itemShipping) && (
                              <div className="pt-3 border-t border-gray-200">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApplyToAll(item.id)}
                                  className="w-full"
                                >
                                  <Copy className="h-3.5 w-3.5 mr-1" />
                                  모든 상품에 동일 배송 적용
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Continue Shopping */}
            <div className="text-center pt-4">
              <Link href="/">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  쇼핑 계속하기
                </Button>
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>주문 요약</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">선택상품 금액</span>
                    <span>{selectedTotal.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">배송비</span>
                    <span>{totalShippingFee === 0 ? '무료' : `${totalShippingFee.toLocaleString()}원`}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>결제예정금액</span>
                    <span className="text-primary">
                      {(selectedTotal + totalShippingFee).toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* 배송정보 미설정 안내 */}
                {items.some(item => !canSelectItem(item.id)) && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs text-orange-700">
                      배송정보가 설정되지 않은 상품이 있습니다.
                      각 상품의 배송정보를 설정해야 선택할 수 있습니다.
                    </p>
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={selectedItems.length === 0}
                >
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  주문하기 ({selectedItems.length}개)
                </Button>

                {!isAuthenticated && (
                  <p className="text-sm text-center text-gray-500">
                    주문하려면{' '}
                    <Link href="/login" className="text-primary hover:underline">
                      로그인
                    </Link>
                    이 필요합니다
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Info */}
            <Card className="mt-4">
              <CardContent className="p-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>장바구니 상품은 30일간 보관됩니다.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>가격 및 옵션이 변경될 수 있습니다.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

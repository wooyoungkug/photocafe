'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, ChevronRight, BookOpen, Package, Clock, MapPin, Truck, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCartStore, type CartShippingInfo } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { API_URL, API_BASE_URL } from '@/lib/api';
import { AddressSearch } from '@/components/address-search';

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

interface ShippingFormState {
  recipientName: string;
  recipientPhone: string;
  recipientPostalCode: string;
  recipientAddress: string;
  recipientAddressDetail: string;
  deliveryMethod: string;
}

const emptyShippingForm: ShippingFormState = {
  recipientName: '',
  recipientPhone: '',
  recipientPostalCode: '',
  recipientAddress: '',
  recipientAddressDetail: '',
  deliveryMethod: 'parcel',
};

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, updateItemShipping, updateAllItemsShipping } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // 배송지 모달 상태
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [shippingModalMode, setShippingModalMode] = useState<'single' | 'all'>('single');
  const [shippingTargetItemId, setShippingTargetItemId] = useState<string | null>(null);
  const [shippingForm, setShippingForm] = useState<ShippingFormState>(emptyShippingForm);

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

  // 개별 배송지 설정 모달
  const openSingleShippingModal = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    const existing = item?.shippingInfo;
    setShippingModalMode('single');
    setShippingTargetItemId(itemId);
    setShippingForm(existing && isShippingComplete(existing) ? {
      recipientName: existing.recipientName,
      recipientPhone: existing.recipientPhone,
      recipientPostalCode: existing.recipientPostalCode,
      recipientAddress: existing.recipientAddress,
      recipientAddressDetail: existing.recipientAddressDetail,
      deliveryMethod: existing.deliveryMethod,
    } : { ...emptyShippingForm });
    setShippingModalOpen(true);
  };

  // 전체 배송지 설정 모달
  const openAllShippingModal = () => {
    const firstWithShipping = items.find(i => i.shippingInfo && isShippingComplete(i.shippingInfo));
    const existing = firstWithShipping?.shippingInfo;
    setShippingModalMode('all');
    setShippingTargetItemId(null);
    setShippingForm(existing ? {
      recipientName: existing.recipientName,
      recipientPhone: existing.recipientPhone,
      recipientPostalCode: existing.recipientPostalCode,
      recipientAddress: existing.recipientAddress,
      recipientAddressDetail: existing.recipientAddressDetail,
      deliveryMethod: existing.deliveryMethod,
    } : { ...emptyShippingForm });
    setShippingModalOpen(true);
  };

  // 배송지 저장
  const handleSaveShipping = () => {
    const shippingInfo: CartShippingInfo = {
      senderType: '',
      senderName: '',
      senderPhone: '',
      senderPostalCode: '',
      senderAddress: '',
      senderAddressDetail: '',
      receiverType: 'direct_customer',
      recipientName: shippingForm.recipientName,
      recipientPhone: shippingForm.recipientPhone,
      recipientPostalCode: shippingForm.recipientPostalCode,
      recipientAddress: shippingForm.recipientAddress,
      recipientAddressDetail: shippingForm.recipientAddressDetail,
      deliveryMethod: shippingForm.deliveryMethod,
      deliveryFee: 0,
      deliveryFeeType: 'standard',
    };

    if (shippingModalMode === 'all') {
      updateAllItemsShipping(shippingInfo);
      // 전체 적용 후 모든 항목 자동 선택
      setSelectedItems(items.map(item => item.id));
    } else if (shippingTargetItemId) {
      updateItemShipping(shippingTargetItemId, shippingInfo);
      // 개별 적용 후 해당 항목 자동 선택
      if (!selectedItems.includes(shippingTargetItemId)) {
        setSelectedItems(prev => [...prev, shippingTargetItemId]);
      }
    }

    setShippingModalOpen(false);
  };

  const isFormValid = shippingForm.deliveryMethod === 'pickup' ||
    !!(shippingForm.recipientName && shippingForm.recipientPhone && shippingForm.recipientPostalCode && shippingForm.recipientAddress);

  const selectedCartItems = items.filter(item => selectedItems.includes(item.id));
  const selectedTotal = selectedCartItems.reduce((sum, item) => sum + item.totalPrice, 0);

  // 배송비 계산
  const itemShippingFees = selectedCartItems.reduce((sum, item) => {
    if (item.albumOrderInfo?.shippingInfo) {
      return sum + (item.albumOrderInfo.shippingInfo.deliveryFee || 0);
    }
    return sum;
  }, 0);
  const hasItemsWithoutAlbumShipping = selectedCartItems.some(
    item => !item.albumOrderInfo?.shippingInfo
  );
  const generalShippingFee = hasItemsWithoutAlbumShipping
    ? (selectedTotal > 50000 ? 0 : 3000)
    : 0;
  const totalShippingFee = itemShippingFees + generalShippingFee;

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
                  variant="default"
                  size="sm"
                  onClick={openAllShippingModal}
                >
                  <MapPin className="h-3.5 w-3.5 mr-1" />
                  전체 배송지 설정
                </Button>
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
                            배송지를 입력해주세요
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

                          {/* 배송지 정보 표시 */}
                          {!hasAlbumShipping && (
                            <div className="mt-2">
                              {isShippingComplete(itemShipping) ? (
                                <div className="flex items-center gap-2">
                                  <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 inline-flex items-center gap-1">
                                    <Truck className="h-3 w-3" />
                                    <span>{getDeliveryMethodLabel(itemShipping!.deliveryMethod)}</span>
                                    {itemShipping!.deliveryMethod !== 'pickup' && (
                                      <>
                                        <span>•</span>
                                        <span>{itemShipping!.recipientName}</span>
                                        <span>•</span>
                                        <span className="max-w-[150px] truncate">{itemShipping!.recipientAddress}</span>
                                      </>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => openSingleShippingModal(item.id)}
                                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                                  >
                                    변경
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => openSingleShippingModal(item.id)}
                                  className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1 inline-flex items-center gap-1 hover:bg-orange-100 transition-colors border border-orange-200"
                                >
                                  <MapPin className="h-3 w-3" />
                                  배송지 입력 필요
                                </button>
                              )}
                            </div>
                          )}

                          {/* 앨범 배송지 표시 */}
                          {hasAlbumShipping && item.albumOrderInfo?.shippingInfo && (
                            <div className="mt-2">
                              <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 inline-flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                <span>
                                  {item.albumOrderInfo.shippingInfo.deliveryMethod === 'parcel' ? '택배' :
                                   item.albumOrderInfo.shippingInfo.deliveryMethod === 'freight' ? '화물' :
                                   item.albumOrderInfo.shippingInfo.deliveryMethod === 'motorcycle' ? '오토바이퀵' : '방문수령'}
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
                  {hasItemsWithoutAlbumShipping && (
                    <p className="text-xs text-gray-500 mt-1">
                      * 5만원 이상 구매시 일반상품 무료배송
                    </p>
                  )}
                </div>

                {/* 배송지 미입력 안내 */}
                {items.some(item => !canSelectItem(item.id)) && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs text-orange-700">
                      배송지 정보가 입력되지 않은 상품이 있습니다.
                      배송지를 입력해야 선택할 수 있습니다.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full text-orange-700 border-orange-300 hover:bg-orange-100"
                      onClick={openAllShippingModal}
                    >
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      전체 배송지 한번에 설정
                    </Button>
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

      {/* 배송지 입력 모달 */}
      <Dialog open={shippingModalOpen} onOpenChange={setShippingModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              {shippingModalMode === 'all' ? '전체 배송지 설정' : '배송지 설정'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {shippingModalMode === 'all' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                모든 상품에 동일한 배송지 정보가 적용됩니다.
              </div>
            )}

            {/* 배송 방법 */}
            <div>
              <Label className="text-sm font-medium">배송 방법</Label>
              <Select
                value={shippingForm.deliveryMethod}
                onValueChange={(v) => setShippingForm(prev => ({ ...prev, deliveryMethod: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {shippingForm.deliveryMethod !== 'pickup' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">수령인 <span className="text-red-500">*</span></Label>
                    <Input
                      value={shippingForm.recipientName}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, recipientName: e.target.value }))}
                      placeholder="이름"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">연락처 <span className="text-red-500">*</span></Label>
                    <Input
                      value={shippingForm.recipientPhone}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, recipientPhone: e.target.value }))}
                      placeholder="010-0000-0000"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm">주소 <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={shippingForm.recipientPostalCode}
                      readOnly
                      placeholder="우편번호"
                      className="w-28"
                    />
                    <AddressSearch
                      size="sm"
                      onComplete={(data) => {
                        setShippingForm(prev => ({
                          ...prev,
                          recipientPostalCode: data.postalCode,
                          recipientAddress: data.address,
                        }));
                      }}
                    />
                  </div>
                  <Input
                    value={shippingForm.recipientAddress}
                    readOnly
                    placeholder="주소"
                    className="mt-1"
                  />
                  <Input
                    value={shippingForm.recipientAddressDetail}
                    onChange={(e) => setShippingForm(prev => ({ ...prev, recipientAddressDetail: e.target.value }))}
                    placeholder="상세주소 (동/호수)"
                    className="mt-1"
                  />
                </div>
              </>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <Truck className="h-4 w-4" />
                  방문수령 안내
                </div>
                <p>제작 완료 후 안내 문자가 발송됩니다. 영업시간 내 방문하여 수령해 주세요.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShippingModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveShipping} disabled={!isFormValid}>
              <Check className="h-4 w-4 mr-1" />
              {shippingModalMode === 'all' ? '전체 적용' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

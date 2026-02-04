'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, ChevronRight } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { API_URL, API_BASE_URL } from '@/lib/api';

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

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [selectedItems, setSelectedItems] = useState<string[]>(items.map(item => item.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(items.map(item => item.id));
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

  const selectedTotal = items
    .filter(item => selectedItems.includes(item.id))
    .reduce((sum, item) => sum + item.totalPrice, 0);

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
            {/* Select All & Delete */}
            <div className="bg-white rounded-lg border p-4 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedItems.length === items.length}
                  onCheckedChange={handleSelectAll}
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
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="flex">
                  {/* Checkbox */}
                  <div className="flex items-start p-4 border-r">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                    />
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
                        <Link
                          href={`/product/${item.productId}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {item.name}
                        </Link>

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
            ))}

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
                    <span>{selectedTotal > 50000 ? '무료' : '3,000원'}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>결제예정금액</span>
                    <span className="text-primary">
                      {(selectedTotal + (selectedTotal > 50000 ? 0 : 3000)).toLocaleString()}원
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    * 5만원 이상 구매시 무료배송
                  </p>
                </div>

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

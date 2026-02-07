'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
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
  Mail,
  Calendar,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderedAt: string;
  finalAmount: number;
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
    options?: any;
  }[];
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;
  const { isAuthenticated } = useAuthStore();

  // 주문 상세 조회
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await api.get(`/orders/${orderId}`);
      return response.data as OrderDetail;
    },
    enabled: isAuthenticated && !!orderId,
  });

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

  return (
    <div className="min-h-screen bg-gray-50">
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
              <h1 className="text-2xl font-bold mb-2">주문 상세</h1>
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
                      <h3 className="font-medium text-orange-900 mb-1">
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
                      <h3 className="font-medium text-blue-900 mb-1">
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

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>주문 상품</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between py-3 border-b last:border-0">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{item.productName}</h4>
                        <p className="text-sm text-gray-500">
                          수량: {item.quantity} | 단가: {item.unitPrice.toLocaleString()}원
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{item.totalPrice.toLocaleString()}원</p>
                      </div>
                    </div>
                  ))}
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
                    <p className="font-medium">{order.shipping.recipientName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">연락처</p>
                    <p className="font-medium">{order.shipping.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">배송 주소</p>
                    <p className="font-medium">
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
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>총 결제금액</span>
                  <span className="text-primary">
                    {order.finalAmount.toLocaleString()}원
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
                  <p className="font-medium">{order.client.clientName}</p>
                </div>
                {order.client.mobile && (
                  <div>
                    <p className="text-sm text-gray-500">연락처</p>
                    <p className="font-medium">{order.client.mobile}</p>
                  </div>
                )}
                {order.client.email && (
                  <div>
                    <p className="text-sm text-gray-500">이메일</p>
                    <p className="font-medium">{order.client.email}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

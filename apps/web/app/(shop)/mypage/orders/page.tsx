'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Package, Clock, CheckCircle, Truck, XCircle, ChevronRight, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 주문 상태 타입
const ORDER_STATUS = {
  PENDING_RECEIPT: 'pending_receipt',       // 접수대기
  RECEIPT_COMPLETED: 'receipt_completed',   // 접수완료
  IN_PRODUCTION: 'in_production',           // 생산진행
  READY_FOR_SHIPPING: 'ready_for_shipping', // 배송준비
  SHIPPED: 'shipped',                       // 배송완료
  CANCELLED: 'cancelled',                   // 취소
} as const;

type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// 주문 상태별 스타일 및 라벨
const STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  icon: React.ReactNode;
  className: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  [ORDER_STATUS.PENDING_RECEIPT]: {
    label: '접수대기',
    icon: <Clock className="h-4 w-4" />,
    className: 'text-orange-600 bg-orange-50',
    badgeVariant: 'secondary',
  },
  [ORDER_STATUS.RECEIPT_COMPLETED]: {
    label: '접수완료',
    icon: <CheckCircle className="h-4 w-4" />,
    className: 'text-blue-600 bg-blue-50',
    badgeVariant: 'default',
  },
  [ORDER_STATUS.IN_PRODUCTION]: {
    label: '생산진행',
    icon: <Package className="h-4 w-4" />,
    className: 'text-purple-600 bg-purple-50',
    badgeVariant: 'default',
  },
  [ORDER_STATUS.READY_FOR_SHIPPING]: {
    label: '배송준비',
    icon: <Package className="h-4 w-4" />,
    className: 'text-indigo-600 bg-indigo-50',
    badgeVariant: 'default',
  },
  [ORDER_STATUS.SHIPPED]: {
    label: '배송완료',
    icon: <Truck className="h-4 w-4" />,
    className: 'text-green-600 bg-green-50',
    badgeVariant: 'outline',
  },
  [ORDER_STATUS.CANCELLED]: {
    label: '취소',
    icon: <XCircle className="h-4 w-4" />,
    className: 'text-gray-600 bg-gray-50',
    badgeVariant: 'destructive',
  },
};

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderedAt: string;
  finalAmount: number;
  client?: {
    clientName: string;
  };
  _count?: {
    items: number;
  };
  items?: {
    id: string;
    productName: string;
    size: string;
    pages: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  // 주문 목록 조회
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', user?.id, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {
        clientId: user?.id || '',
        ...(statusFilter !== 'all' && { status: statusFilter }),
      };
      const response = await api.get<{ data: Order[]; meta: any }>('/orders', params);
      return response;
    },
    enabled: isAuthenticated && !!user?.id,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">로그인이 필요한 서비스입니다.</p>
            <Button onClick={() => router.push('/login?redirect=/mypage/orders')}>
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredOrders = statusFilter === 'all'
    ? orders?.data ?? []
    : orders?.data?.filter(order => order.status === statusFilter) ?? [];

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            주문 내역
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Status Filter Tabs */}
          <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')} className="mb-6">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-7">
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value={ORDER_STATUS.PENDING_RECEIPT}>
                접수대기
              </TabsTrigger>
              <TabsTrigger value={ORDER_STATUS.RECEIPT_COMPLETED}>
                접수완료
              </TabsTrigger>
              <TabsTrigger value={ORDER_STATUS.IN_PRODUCTION}>
                생산중
              </TabsTrigger>
              <TabsTrigger value={ORDER_STATUS.READY_FOR_SHIPPING}>
                배송준비
              </TabsTrigger>
              <TabsTrigger value={ORDER_STATUS.SHIPPED}>
                배송완료
              </TabsTrigger>
              <TabsTrigger value={ORDER_STATUS.CANCELLED}>
                취소
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Orders Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded"></div>
              ))}
            </div>
          ) : filteredOrders && filteredOrders.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">주문번호</TableHead>
                    <TableHead className="w-[140px]">주문날짜</TableHead>
                    <TableHead>주문자</TableHead>
                    <TableHead>제목</TableHead>
                    <TableHead className="w-[100px]">규격</TableHead>
                    <TableHead className="w-[70px] text-center">페이지</TableHead>
                    <TableHead className="w-[70px] text-center">부수</TableHead>
                    <TableHead className="w-[120px] text-right">주문가격</TableHead>
                    <TableHead className="w-[100px] text-center">처리단계</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const statusConfig = STATUS_CONFIG[order.status];
                    // 첫 번째 상품 정보 표시 (여러 상품일 경우 외 N건으로 표시)
                    const firstItem = order.items?.[0];
                    const itemCount = order._count?.items || order.items?.length || 0;
                    const productName = firstItem
                      ? itemCount > 1
                        ? `${firstItem.productName} 외 ${itemCount - 1}건`
                        : firstItem.productName
                      : '-';

                    return (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell>
                          <Link
                            href={`/mypage/orders/${order.id}`}
                            className="text-primary hover:underline font-medium"
                          >
                            {order.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {format(new Date(order.orderedAt), 'yyyy-MM-dd', { locale: ko })}
                          <br />
                          <span className="text-xs text-gray-400">
                            {format(new Date(order.orderedAt), 'HH:mm', { locale: ko })}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.client?.clientName || '-'}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {productName}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {firstItem?.size || '-'}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {firstItem?.pages ? `${firstItem.pages}p` : '-'}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {firstItem?.quantity || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {order.finalAmount.toLocaleString()}원
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig.className} text-xs justify-center w-full`}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                주문 내역이 없습니다
              </h3>
              <p className="text-gray-500 mb-6">
                상품을 주문하고 진행상황을 확인하세요
              </p>
              <Link href="/">
                <Button>
                  쇼핑 시작하기
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

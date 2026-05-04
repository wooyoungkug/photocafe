'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  History,
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  MapPin,
  Phone,
  CreditCard,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/layout/page-header';
import { useOrder, ORDER_STATUS_LABELS, type Order } from '@/hooks/use-orders';
import { OrderQuickEditDialog } from '../components/order-quick-edit-dialog';
import { ProcessHistoryDialog } from '@/components/order/process-history-dialog';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { displayFinalAmount } from '@/lib/order-display';

const STATUS_STYLE: Record<string, { className: string; icon: React.ReactNode }> = {
  pending_receipt: { className: 'bg-orange-100 text-orange-700', icon: <Clock className="h-4 w-4" /> },
  receipt_completed: { className: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="h-4 w-4" /> },
  in_production: { className: 'bg-purple-100 text-purple-700', icon: <Package className="h-4 w-4" /> },
  print_waiting: { className: 'bg-cyan-100 text-cyan-700', icon: <Package className="h-4 w-4" /> },
  ready_for_shipping: { className: 'bg-indigo-100 text-indigo-700', icon: <Package className="h-4 w-4" /> },
  shipped: { className: 'bg-green-100 text-green-700', icon: <Truck className="h-4 w-4" /> },
  cancelled: { className: 'bg-gray-100 text-gray-500', icon: <XCircle className="h-4 w-4" /> },
};

const DELIVERY_METHOD_LABELS: Record<string, string> = {
  parcel: '택배',
  motorcycle: '오토바이퀵',
  freight: '화물',
  pickup: '방문수령',
};

function formatAmount(n: number) {
  return `₩${n.toLocaleString()}`;
}

function formatDate(iso?: string) {
  if (!iso) return '-';
  return format(new Date(iso), 'yyyy-MM-dd HH:mm', { locale: ko });
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: order, isLoading, isError, error, refetch } = useOrder(id);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="주문 상세"
          breadcrumbs={[{ label: '홈', href: '/' }, { label: '주문 관리', href: '/orders' }, { label: '상세' }]}
        />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-red-600">
            <AlertTriangle className="h-8 w-8" />
            <p className="text-[18px] font-bold text-black">주문을 불러오지 못했습니다</p>
            <p className="text-[14px] font-normal text-black/60">
              {(error as any)?.message || '주문 정보를 찾을 수 없습니다.'}
            </p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/orders')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                목록으로
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusStyle = STATUS_STYLE[order.status] ?? { className: 'bg-gray-100 text-gray-500', icon: <Clock className="h-4 w-4" /> };
  const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            주문 상세
            {order.isUrgent && (
              <Badge className="bg-red-500 text-white text-[12px]">긴급</Badge>
            )}
          </span>
        }
        description={`주문번호: ${order.orderNumber}`}
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '주문 관리', href: '/orders' },
          { label: order.orderNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/orders')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              목록
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)}>
              <History className="mr-2 h-4 w-4" />
              공정 이력
            </Button>
            <Button size="sm" onClick={() => setIsEditOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              수정
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 왼쪽 메인 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 주문 기본 정보 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[18px] font-bold text-black">주문 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="주문번호" value={order.orderNumber} />
              <Row
                label="진행상태"
                value={
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[14px] font-normal ${statusStyle.className}`}>
                    {statusStyle.icon}
                    {statusLabel}
                  </span>
                }
              />
              <Row label="주문일시" value={formatDate(order.orderedAt)} />
              {order.requestedDeliveryDate && (
                <Row label="납기요청일" value={formatDate(order.requestedDeliveryDate)} />
              )}
              <Row label="결제방법" value={order.paymentMethod === 'credit' ? '여신거래' : order.paymentMethod || '-'} />
              {order.customerMemo && <Row label="고객메모" value={order.customerMemo} />}
              {order.productMemo && <Row label="제품메모" value={order.productMemo} />}
              {order.adminMemo && <Row label="관리자메모" value={order.adminMemo} />}
            </CardContent>
          </Card>

          {/* 주문 항목 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[18px] font-bold text-black">주문 항목</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-bold text-black">{item.productName}</p>
                      {item.productionNumber && (
                        <p className="text-[12px] font-normal text-slate-400 mt-0.5">생산번호: {item.productionNumber}</p>
                      )}
                    </div>
                    <p className="text-[14px] font-bold text-black shrink-0">{formatAmount(item.totalPrice)}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] font-normal text-black/60">
                    {item.size && <span>크기: {item.size}</span>}
                    {item.pages ? <span>페이지: {item.pages}P</span> : null}
                    {item.printMethod && <span>출력: {item.printMethod}</span>}
                    {item.paper && <span>용지: {item.paper}</span>}
                    {item.bindingType && <span>제본: {item.bindingType}</span>}
                    <span>수량: {item.quantity}부</span>
                    <span>단가: {formatAmount(item.unitPrice)}</span>
                  </div>
                  {item.finishingOptions && item.finishingOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.finishingOptions.map((opt) => (
                        <Badge key={opt} variant="secondary" className="text-[12px]">{opt}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽 사이드 */}
        <div className="space-y-6">
          {/* 거래처 정보 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[18px] font-bold text-black">
                <User className="h-4 w-4" />
                거래처
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-[14px] font-bold text-black">{order.client.clientName}</p>
              <p className="text-[14px] font-normal text-black/60">코드: {order.client.clientCode}</p>
              {order.client.managerName && (
                <p className="text-[14px] font-normal text-black/60">담당: {order.client.managerName}</p>
              )}
            </CardContent>
          </Card>

          {/* 배송 정보 */}
          {order.shipping && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[18px] font-bold text-black">
                  <MapPin className="h-4 w-4" />
                  배송 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-[14px] font-bold text-black">{order.shipping.recipientName}</p>
                <div className="flex items-center gap-1 text-[14px] font-normal text-black/60">
                  <Phone className="h-3.5 w-3.5" />
                  {order.shipping.phone}
                </div>
                <p className="text-[14px] font-normal text-black/60">
                  ({order.shipping.postalCode}) {order.shipping.address}
                  {order.shipping.addressDetail && ` ${order.shipping.addressDetail}`}
                </p>
                {order.shipping.deliveryMethod && (
                  <Badge variant="outline" className="text-[12px]">
                    {DELIVERY_METHOD_LABELS[order.shipping.deliveryMethod] ?? order.shipping.deliveryMethod}
                  </Badge>
                )}
                {order.shipping.trackingNumber && (
                  <p className="text-[14px] font-normal text-black/60">
                    송장: {order.shipping.trackingNumber}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 금액 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[18px] font-bold text-black">
                <CreditCard className="h-4 w-4" />
                금액
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Row label="상품금액" value={formatAmount(order.productPrice)} small />
              <Row label="배송비" value={formatAmount(order.shippingFee)} small />
              <Row label="부가세" value={formatAmount(order.tax)} small />
              <Separator className="my-1" />
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-bold text-black">최종금액</p>
                <p className="text-[18px] font-bold text-black">{formatAmount(displayFinalAmount(order))}</p>
              </div>
              {order.salesLedger && (
                <>
                  <Separator className="my-1" />
                  <Row
                    label="수금상태"
                    value={
                      <Badge
                        className={
                          order.salesLedger.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }
                      >
                        {order.salesLedger.paymentStatus === 'paid' ? '수금완료' : '미수금'}
                      </Badge>
                    }
                    small
                  />
                  {order.salesLedger.outstandingAmount > 0 && (
                    <Row label="미수금액" value={formatAmount(order.salesLedger.outstandingAmount)} small />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 다이얼로그 */}
      <OrderQuickEditDialog
        order={order}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
      <ProcessHistoryDialog
        orderId={id}
        orderNumber={order.orderNumber}
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
      />
    </div>
  );
}

function Row({
  label,
  value,
  small,
}: {
  label: string;
  value: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className={`shrink-0 font-normal text-black/50 ${small ? 'text-[12px]' : 'text-[14px]'}`}>{label}</p>
      <div className={`text-right font-normal text-black ${small ? 'text-[12px]' : 'text-[14px]'}`}>{value}</div>
    </div>
  );
}

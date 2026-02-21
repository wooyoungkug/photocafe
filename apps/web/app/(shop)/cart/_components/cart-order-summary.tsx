'use client';

import Link from 'next/link';
import { ShoppingBag, ChevronRight, CheckCircle2, AlertCircle, Loader2, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { SameDayShippingInfo } from '@/hooks/use-same-day-shipping';

const DELIVERY_METHOD_LABELS: Record<string, string> = {
  parcel: '택배',
  motorcycle: '오토바이퀵',
  freight: '화물',
  pickup: '방문수령',
};

interface CartOrderSummaryProps {
  selectedCount: number;
  totalCount: number;
  shippingCompleteCount: number;
  selectedTotal: number;
  totalShippingFee: number;
  sameDayRefund?: number;
  freeShippingLabel?: string | null;
  deliveryMethods?: string[];
  isAuthenticated: boolean;
  hasUploadInProgress?: boolean;
  hasUploadFailed?: boolean;
  hasFileMissing?: boolean;
  onCheckout: () => void;
  /** 당일 합배송 현황 (조건부 배송 거래처에만 제공) */
  sameDayInfo?: SameDayShippingInfo | null;
  /** 현재 장바구니의 스튜디오배송 상품 합계 */
  newOrderStudioTotal?: number;
}

export function CartOrderSummary({
  selectedCount,
  totalCount,
  shippingCompleteCount,
  selectedTotal,
  totalShippingFee,
  sameDayRefund = 0,
  freeShippingLabel,
  deliveryMethods,
  isAuthenticated,
  hasUploadInProgress,
  hasUploadFailed,
  hasFileMissing,
  onCheckout,
  sameDayInfo,
  newOrderStudioTotal = 0,
}: CartOrderSummaryProps) {
  const t = useTranslations('cart');
  const incompleteCount = totalCount - shippingCompleteCount;

  return (
    <div className="space-y-4">
      <Card className="sticky top-4 overflow-hidden">
        <div className="h-1 gradient-primary" />

        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="w-5 h-5 text-primary" />
            {t('orderSummary')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 스튜디오배송 주문합계 (조건부 무료배송 거래처) */}
          {sameDayInfo?.applicable && (() => {
            const prevTotal = sameDayInfo.totalProductAmount;
            const combinedTotal = prevTotal + newOrderStudioTotal;
            const { freeThreshold } = sameDayInfo;
            const isBundledFree = (sameDayInfo.ordersWithFee?.length ?? 0) > 0;
            const isThresholdFree = combinedTotal >= freeThreshold;
            const isFree = isThresholdFree || isBundledFree;
            const remaining = freeThreshold - combinedTotal;
            const progress = Math.min(100, (combinedTotal / freeThreshold) * 100);

            return (
              <div className={cn(
                'rounded-lg p-3 space-y-2 text-xs',
                isFree ? 'bg-green-50 border border-green-200' : 'bg-blue-50/70 border border-blue-100',
              )}>
                <div className="flex items-center gap-1.5 font-medium mb-1">
                  <CalendarDays className={cn('w-3.5 h-3.5', isFree ? 'text-green-600' : 'text-blue-600')} />
                  <span className={isFree ? 'text-green-700' : 'text-blue-700'}>당일 스튜디오배송 주문합계</span>
                  {isFree && (
                    <span className="ml-auto text-green-600 font-semibold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      {isBundledFree && !isThresholdFree ? '묶음배송 무료' : '조건부 무료배송'}
                    </span>
                  )}
                </div>

                {prevTotal > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>기존 주문</span>
                    <span>{prevTotal.toLocaleString()}원</span>
                  </div>
                )}
                {newOrderStudioTotal > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>이번 주문</span>
                    <span>+{newOrderStudioTotal.toLocaleString()}원</span>
                  </div>
                )}

                <div className={cn(
                  'flex justify-between font-semibold pt-0.5 border-t',
                  isFree ? 'text-green-700 border-green-200' : 'text-blue-700 border-blue-100',
                )}>
                  <span>누적 합계</span>
                  <span>{combinedTotal.toLocaleString()}원</span>
                </div>

                {/* 진행 바 */}
                <Progress
                  value={progress}
                  className={cn(
                    'h-1.5 mt-1',
                    isFree ? '[&>div]:bg-green-400' : '[&>div]:bg-blue-400',
                  )}
                />
                <div className={cn(
                  'flex justify-between text-[10px] mt-0.5',
                  isFree ? 'text-green-500' : 'text-blue-400',
                )}>
                  {isFree ? (
                    isBundledFree && !isThresholdFree ? (
                      <>
                        <span>{combinedTotal.toLocaleString()}원</span>
                        <span className="font-medium">{remaining.toLocaleString()}원 더 주문 시 환불</span>
                      </>
                    ) : (
                      <span>기준 {freeThreshold.toLocaleString()}원 달성 — 조건부 무료배송</span>
                    )
                  ) : (
                    <>
                      <span>{combinedTotal.toLocaleString()}원</span>
                      <span className="font-medium">
                        {remaining.toLocaleString()}원 더 주문 시 무료
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Shipping completion progress */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-gray-500">{t('shippingProgress')}</span>
              <span
                className={cn(
                  'font-medium',
                  shippingCompleteCount === totalCount ? 'text-black/80' : 'text-primary'
                )}
              >
                {shippingCompleteCount}/{totalCount}
              </span>
            </div>
            <Progress
              value={totalCount > 0 ? (shippingCompleteCount / totalCount) * 100 : 0}
              className="h-1.5 rounded-full"
            />
            {shippingCompleteCount === totalCount && totalCount > 0 && (
              <p className="text-[11px] text-black/80 mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {t('allShippingComplete')}
              </p>
            )}
          </div>

          <Separator />

          {/* Price breakdown */}
          {(() => {
            const productAmount = Math.round(selectedTotal);
            const vatAmount = Math.round(productAmount * 0.1);
            const netShipping = Math.round(totalShippingFee - sameDayRefund);
            return (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    상품금액 ({selectedCount})
                  </span>
                  <span className="font-medium">{productAmount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">부가세 (10%)</span>
                  <span className="font-medium">+{vatAmount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    {t('shippingFee')}
                    {deliveryMethods && deliveryMethods.length > 0 && (
                      <span className="text-xs text-gray-400">
                        ({deliveryMethods.map((m) => DELIVERY_METHOD_LABELS[m] ?? m).join(', ')})
                      </span>
                    )}
                    {sameDayRefund > 0 && (
                      <span className="text-xs text-green-600">(묶음배송 환불 적용)</span>
                    )}
                  </span>
                  <div className="text-right">
                    <span className={cn('font-medium', netShipping === 0 && 'text-black/80', netShipping < 0 && 'text-green-600')}>
                      {netShipping === 0
                        ? t('free')
                        : netShipping < 0
                          ? `-${Math.abs(netShipping).toLocaleString()}원`
                          : `+${netShipping.toLocaleString()}원`}
                    </span>
                    {netShipping === 0 && freeShippingLabel && (
                      <p className="text-[11px] text-black/80 mt-0.5">{freeShippingLabel}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <Separator />

          {/* Total */}
          {(() => {
            const vatAmount = Math.round(selectedTotal * 0.1);
            const grandTotal = Math.round(selectedTotal + vatAmount + totalShippingFee - sameDayRefund);
            return (
              <div className="flex justify-between items-baseline">
                <span className="text-base font-semibold">
                  {grandTotal < 0 ? '환불 예정 금액' : t('totalPayment')}
                </span>
                <div className="text-right">
                  <span className={cn('text-2xl font-bold', grandTotal < 0 ? 'text-green-600' : 'text-primary')}>
                    {grandTotal < 0
                      ? `-${Math.abs(grandTotal).toLocaleString()}`
                      : grandTotal.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500 ml-0.5">원</span>
                </div>
              </div>
            );
          })()}

          {/* Warning for incomplete shipping */}
          {incompleteCount > 0 && (
            <div className="bg-orange-50 border border-orange-200/50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-orange-700 leading-relaxed">
                {t('shippingIncomplete', { count: incompleteCount })}
              </p>
            </div>
          )}

          {/* Warning for upload in progress */}
          {hasUploadInProgress && (
            <div className="bg-blue-50 border border-blue-200/50 rounded-lg p-3 flex items-start gap-2">
              <Loader2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0 animate-spin" />
              <p className="text-xs text-blue-700 leading-relaxed">
                원본 파일 업로드가 진행 중입니다. 완료 후 주문할 수 있습니다.
              </p>
            </div>
          )}

          {/* Warning for upload failed */}
          {hasUploadFailed && !hasUploadInProgress && (
            <div className="bg-red-50 border border-red-200/50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700 leading-relaxed">
                업로드에 실패한 항목이 있습니다. 재시도하거나 삭제해주세요.
              </p>
            </div>
          )}

          {/* Warning for file data missing */}
          {hasFileMissing && !hasUploadInProgress && !hasUploadFailed && (
            <div className="bg-orange-50 border border-orange-200/50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-orange-700 leading-relaxed">
                파일 데이터가 누락된 앨범 상품이 있습니다. 해당 상품을 삭제 후 다시 업로드해주세요.
              </p>
            </div>
          )}

          {/* Checkout button */}
          <Button
            size="lg"
            className="w-full h-12 text-base font-semibold gradient-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:shadow-none"
            onClick={onCheckout}
            disabled={selectedCount === 0 || hasUploadInProgress || hasUploadFailed || hasFileMissing}
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            {t('checkout')} ({selectedCount})
          </Button>

          {!isAuthenticated && (
            <p className="text-xs text-center text-gray-400">
              {t('loginRequiredPrefix')}{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                {t('loginLink')}
              </Link>
              {t('loginRequiredSuffix')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardContent className="p-4 space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
            <span>{t('retentionInfo')}</span>
          </div>
          <div className="flex items-start gap-2">
            <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
            <span>{t('priceChangeInfo')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

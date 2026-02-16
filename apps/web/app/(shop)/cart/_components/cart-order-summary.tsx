'use client';

import Link from 'next/link';
import { ShoppingBag, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface CartOrderSummaryProps {
  selectedCount: number;
  totalCount: number;
  shippingCompleteCount: number;
  selectedTotal: number;
  totalShippingFee: number;
  isAuthenticated: boolean;
  hasUploadInProgress?: boolean;
  hasUploadFailed?: boolean;
  hasFileMissing?: boolean;
  onCheckout: () => void;
}

export function CartOrderSummary({
  selectedCount,
  totalCount,
  shippingCompleteCount,
  selectedTotal,
  totalShippingFee,
  isAuthenticated,
  hasUploadInProgress,
  hasUploadFailed,
  hasFileMissing,
  onCheckout,
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
          {/* Shipping completion progress */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-gray-500">{t('shippingProgress')}</span>
              <span
                className={cn(
                  'font-medium',
                  shippingCompleteCount === totalCount ? 'text-green-600' : 'text-primary'
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
              <p className="text-[11px] text-green-600 mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {t('allShippingComplete')}
              </p>
            )}
          </div>

          <Separator />

          {/* Price breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                {t('selectedAmount')} ({selectedCount})
              </span>
              <span className="font-medium">{Math.round(selectedTotal).toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('shippingFee')}</span>
              <span className={cn('font-medium', totalShippingFee === 0 && 'text-green-600')}>
                {totalShippingFee === 0 ? t('free') : `+${Math.round(totalShippingFee).toLocaleString()}원`}
              </span>
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between items-baseline">
            <span className="text-base font-semibold">{t('totalPayment')}</span>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">
                {Math.round(selectedTotal + totalShippingFee).toLocaleString()}
              </span>
              <span className="text-sm text-gray-500 ml-0.5">원</span>
            </div>
          </div>

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

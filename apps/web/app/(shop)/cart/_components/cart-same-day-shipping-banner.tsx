'use client';

import { Truck, Gift, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SameDayShippingInfo } from '@/hooks/use-same-day-shipping';

interface CartSameDayShippingBannerProps {
  info: SameDayShippingInfo;
  newOrderTotal: number; // 현재 장바구니 선택 상품 합계
}

export function CartSameDayShippingBanner({ info, newOrderTotal }: CartSameDayShippingBannerProps) {
  if (!info.applicable) return null;

  const { totalProductAmount, totalShippingCharged, freeThreshold, ordersWithFee } = info;
  const combinedTotal = totalProductAmount + newOrderTotal;
  const remaining = freeThreshold - combinedTotal;
  const isBundleFree = ordersWithFee.length > 0; // 당일 이미 배송비 청구됨 → 묶음배송 무료
  const isFreeEligible = !isBundleFree && combinedTotal >= freeThreshold; // 임계값 달성

  // 오늘 주문이 없으면 배너 불필요
  if (totalProductAmount === 0) return null;

  // 현재 장바구니에 스튜디오 배송 상품이 없으면 배너 불필요
  // (고객직배송만 있으면 합배송 무료 조건이 적용되지 않음)
  if (newOrderTotal === 0) return null;

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 text-sm flex items-start gap-3',
        isBundleFree || isFreeEligible
          ? 'bg-green-50 border-green-200'
          : 'bg-blue-50 border-blue-200',
      )}
    >
      <div className="mt-0.5 shrink-0">
        {isBundleFree || isFreeEligible ? (
          <Gift className="w-4 h-4 text-green-600" />
        ) : (
          <Truck className="w-4 h-4 text-blue-500" />
        )}
      </div>

      <div className="flex-1 space-y-1">
        {isBundleFree ? (
          <>
            <p className="font-semibold text-green-700">
              묶음배송 — 배송비 무료 적용!
            </p>
            <p className="text-green-600 text-xs leading-relaxed">
              오늘 이미 배송비가 청구된 주문이 있어 이번 주문은 배송비가{' '}
              <span className="font-semibold">무료</span>
              로 적용됩니다.
            </p>
            <p className="text-[11px] text-green-500">
              묶음배송 기준 주문: {ordersWithFee.map((o) => o.orderNumber).join(', ')}{' '}
              ({totalShippingCharged.toLocaleString()}원 청구됨)
            </p>
          </>
        ) : isFreeEligible ? (
          <>
            <p className="font-semibold text-green-700">
              묶음배송 조건부 무료배송 달성!
            </p>
            <p className="text-green-600 text-xs leading-relaxed">
              오늘 누적 주문{' '}
              <span className="font-medium">{Math.round(combinedTotal).toLocaleString()}원</span>
              {' '}(기준 {freeThreshold.toLocaleString()}원) —{' '}
              이번 주문에{' '}
              <span className="font-semibold">조건부 무료배송</span>
              이 적용됩니다.
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-blue-700">
              오늘 스튜디오 주문 합산 중
            </p>
            <p className="text-blue-600 text-xs leading-relaxed">
              현재 누적{' '}
              <span className="font-medium">{Math.round(combinedTotal).toLocaleString()}원</span>
              {' '}—{' '}
              <span className="font-medium text-blue-700">
                {Math.round(remaining).toLocaleString()}원
              </span>
              {' '}더 주문하면{' '}
              <span className="font-semibold">조건부 무료배송</span>
              이 적용됩니다.
            </p>
            {/* 진행 바 */}
            <div className="mt-1.5 h-1.5 rounded-full bg-blue-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (combinedTotal / freeThreshold) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-blue-400 mt-0.5">
              <span>{Math.round(combinedTotal).toLocaleString()}원</span>
              <span>{freeThreshold.toLocaleString()}원</span>
            </div>
          </>
        )}
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-current opacity-40 mt-0.5 shrink-0" />
    </div>
  );
}

'use client';

/**
 * 주문 검증/수정 다이얼로그용 단가 breakdown.
 *
 * folder-card.tsx 의 단가 표시 UX 를 동일하게 재현하되, 데이터 소스만
 * 편집 중인 ItemSpecsValue + product 옵션 으로 바꿔서 admin 에게
 * "현재 편집 중인 사양으로 가격이 어떻게 산출되는지" 실시간 미리보기.
 */

import { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useColorIntents } from '@/hooks/use-jdf';
import { useCalculateAlbumOrderPrice } from '@/hooks/use-pricing';
import type { OrderItem } from '@/hooks/use-orders';
import type { Product } from '@/lib/types/product';
import type { ItemSpecsValue } from './item-specs-editor';

interface Props {
  orderItem: OrderItem;
  edit: ItemSpecsValue;
  product?: Product;
  clientId?: string;
  /** 계산된 단가를 부모에 알림 — auto 모드에서 unitPrice 동기화용 */
  onUnitPriceCalculated?: (unitPrice: number) => void;
}

export function OrderItemPriceBreakdown({
  orderItem,
  edit,
  product,
  clientId,
  onUnitPriceCalculated,
}: Props) {
  const colorIntentsQuery = useColorIntents();
  const colorIntents = colorIntentsQuery.data ?? [];

  // 편집 중인 fileSpecId 로 product.specifications 매칭 (specificationId 또는 row id)
  const fileSpecId = edit.fileSpecId ?? orderItem.fileSpecId ?? '';
  const productSpec = useMemo(() => {
    if (!product?.specifications || !fileSpecId) return undefined;
    return product.specifications.find(
      (ps) => (ps.specificationId ?? ps.id) === fileSpecId,
    );
  }, [product?.specifications, fileSpecId]);

  // 색상모드: ColorIntent.numColorsFront 로 4도/6도 판별
  const colorIntentId = edit.colorIntentId ?? orderItem.colorIntentId ?? '';
  const colorMode: '4c' | '6c' = useMemo(() => {
    const ci = colorIntents.find((c) => c.id === colorIntentId);
    return (ci?.numColorsFront ?? 0) >= 6 ? '6c' : '4c';
  }, [colorIntents, colorIntentId]);

  // 페이지 레이아웃: spread / single (double 도 single 로 합침 — folder-card 와 동일)
  const printSide = edit.printSide ?? orderItem.printSide ?? '';
  const pageLayout: 'single' | 'spread' = printSide === 'spread' ? 'spread' : 'single';

  // paperId: product.papers 에서 name 매칭 → paperId 추출
  // 합성 라벨 "이름 (Ng)" 또는 단순 "이름" 둘 다 허용 (구 데이터 호환)
  const paperName = edit.paper ?? orderItem.paper ?? '';
  const paperId = useMemo(() => {
    if (!product?.papers || !paperName) return undefined;
    const found = product.papers.find((p) => {
      const composite = p.grammage ? `${p.name} (${p.grammage}g)` : p.name;
      return composite === paperName || p.name === paperName;
    });
    return found?.paperId;
  }, [product?.papers, paperName]);

  const widthInch = productSpec ? productSpec.widthMm / 25.4 : undefined;
  const heightInch = productSpec ? productSpec.heightMm / 25.4 : undefined;

  const calcQuery = useCalculateAlbumOrderPrice({
    productId: orderItem.productId,
    widthInch,
    heightInch,
    pageCount: orderItem.pages,
    colorMode,
    pageLayout,
    paperId,
    clientId,
  });

  const data = calcQuery.data;
  const isFetching = calcQuery.isFetching;

  // 부모에 단가 통보
  useEffect(() => {
    if (data?.unitPrice && onUnitPriceCalculated) {
      onUnitPriceCalculated(Math.round(data.unitPrice));
    }
  }, [data?.unitPrice, onUnitPriceCalculated]);

  // 로딩
  if (!productSpec) {
    return (
      <div className="text-[11px] text-slate-500">
        규격 정보가 부족하여 단가 계산 불가
      </div>
    );
  }
  if (isFetching && !data) {
    return (
      <div className="text-[11px] text-blue-500 animate-pulse">단가 조회중...</div>
    );
  }
  if (!data || !data.pricePerPage) {
    return (
      <div className="text-[11px] text-red-500">
        가격 미등록 <span className="text-[10px] font-normal">관리자 문의</span>
      </div>
    );
  }

  const pages = orderItem.pages;
  const extraPages = data.billingExtraPages || 0;
  const billingPages = pages + extraPages;

  const coverPrice = data.coverPrice || 0;
  const bindingOnlyPrice = data.bindingOnlyPrice || 0;
  const totalBindingPrice = data.bindingPrice || 0;

  const rangePrices = data.bindingRangePrices || null;
  const basePrice = data.bindingBasePrice || 0;
  const pricePerPageBinding = data.bindingPricePerPage || 0;
  const billingPageKey = String(billingPages);
  const isRangePricing = !!(rangePrices && billingPageKey in rangePrices);
  const isInterpolatedRange =
    !!rangePrices &&
    !(billingPageKey in rangePrices) &&
    Object.keys(rangePrices)
      .filter((k) => !k.startsWith('__'))
      .some((k) => Number(k) <= billingPages);

  const printPrice = data.printPrice || 0;
  const postPrice = data.postProcessingPrice || 0;
  const unitPrice = data.unitPrice || 0;
  const perPage = data.pricePerPage;

  const colorLabel =
    colorMode === '6c' ? '인디고6도' : printSide && printSide !== 'spread' ? '인디고4도' : '인디고4도';
  const paperLabel = paperName || '';
  const paperGrammage = product?.papers?.find((p) => p.name === paperName)?.grammage;
  const resolvedPrintSide = printSide === 'double' ? 'double' : printSide === 'spread' ? 'spread' : 'single';
  const bName = '제본';
  const quantity = orderItem.quantity;
  const totalPrice = unitPrice * quantity;

  return (
    <div className="space-y-1 text-[11px]">
      {/* 표지+제본비 */}
      <div className="space-y-0.5">
        <div className="text-gray-500 font-medium flex items-center gap-1">
          ■ 표지+제본비
          <span className="text-gray-400 font-normal">
            ({bName}
            {extraPages > 0 ? ` · ${billingPages}p(${pages}+${extraPages})` : ''})
          </span>
        </div>
        <div className="text-gray-600 pl-2">
          {isRangePricing ? (
            <>
              <span className="text-gray-400">소계:</span> 구간단가
              {data.nup ? `(${data.nup})` : ''}({billingPages}p) ={' '}
              {Math.round(bindingOnlyPrice).toLocaleString()}원
            </>
          ) : isInterpolatedRange ? (
            (() => {
              const numericKeys = Object.keys(rangePrices!)
                .filter((k) => !k.startsWith('__'))
                .map(Number)
                .filter((k) => !isNaN(k))
                .sort((a, b) => a - b);
              const lowerKey = numericKeys.filter((k) => k <= billingPages).pop();
              const lowerPrice =
                lowerKey !== undefined ? rangePrices![String(lowerKey)] || 0 : 0;
              return (
                <>
                  <span className="text-gray-400">소계:</span> {lowerKey}p구간{' '}
                  {lowerPrice.toLocaleString()} +{' '}
                  {pricePerPageBinding.toLocaleString()}원
                  {data.nup ? `(${data.nup})` : ''}×
                  {billingPages - (lowerKey ?? 0)}p ={' '}
                  {Math.round(bindingOnlyPrice).toLocaleString()}원
                </>
              );
            })()
          ) : basePrice > 0 || pricePerPageBinding > 0 ? (
            pricePerPageBinding > 0 ? (
              <>
                <span className="text-gray-400">소계:</span> 기본{' '}
                {basePrice.toLocaleString()} +{' '}
                {pricePerPageBinding.toLocaleString()}원
                {data.nup ? `(${data.nup})` : ''}×{billingPages}p ={' '}
                {Math.round(bindingOnlyPrice).toLocaleString()}원
              </>
            ) : (
              <>
                <span className="text-gray-400">소계:</span> 고정가{' '}
                {Math.round(bindingOnlyPrice).toLocaleString()}원
              </>
            )
          ) : (
            <>
              <span className="text-gray-400">소계:</span>{' '}
              {Math.round(bindingOnlyPrice).toLocaleString()}원
            </>
          )}
        </div>
        {coverPrice > 0 && (
          <div className="text-gray-600 pl-2">
            <span className="text-gray-400">표지비:</span>{' '}
            {Math.round(coverPrice).toLocaleString()}원
          </div>
        )}
        {coverPrice > 0 && (
          <div className="text-gray-700 pl-2 font-medium">
            <span className="text-gray-400 font-normal">소계:</span>{' '}
            {Math.round(totalBindingPrice).toLocaleString()}원
            <span className="text-gray-400 font-normal text-[10px]"> (제본+표지)</span>
          </div>
        )}
      </div>

      {/* 출력비 */}
      <div className="space-y-0.5">
        <div className="text-gray-500 font-medium flex items-center gap-1">
          ■ 출력비
          <span className="text-gray-400 font-normal">
            ({colorLabel} {paperLabel}
            {paperGrammage ? ` ${paperGrammage}g` : ''} ·{' '}
            {resolvedPrintSide === 'single' ? '단면' : resolvedPrintSide === 'double' ? '양면' : '펼침'})
          </span>
        </div>
        <div className="text-gray-700 pl-2 font-medium">
          <span className="text-gray-400 font-normal">소계:</span>{' '}
          {extraPages > 0 ? (
            <>
              <span className="text-black">
                {perPage.toLocaleString()}원{data.nup ? `(${data.nup})` : ''}
              </span>{' '}
              × {billingPages}p({pages}+{extraPages}) ={' '}
              {Math.round(printPrice).toLocaleString()}원
            </>
          ) : (
            <>
              <span className="text-black">
                {perPage.toLocaleString()}원{data.nup ? `(${data.nup})` : ''}
              </span>{' '}
              × {pages}p = {Math.round(printPrice).toLocaleString()}원
            </>
          )}
        </div>
      </div>

      {/* 후가공비 */}
      <div className="space-y-0.5">
        <div className="text-gray-500 font-medium flex items-center gap-1">
          ■ 후가공비
          {data.postProcessingNames && data.postProcessingNames.length > 0 && (
            <span className="text-gray-400 font-normal">
              ({data.postProcessingNames.join(', ')})
            </span>
          )}
        </div>
        <div className="text-gray-600 pl-2">
          {postPrice === 0 ? (
            <span className="text-gray-400">없음 (0원)</span>
          ) : (
            <>
              <span className="text-gray-400">소계:</span>{' '}
              <span className="text-black">
                {Math.round(postPrice / billingPages).toLocaleString()}원
                {data.nup ? `(${data.nup})` : ''}
              </span>{' '}
              × {billingPages}p = {Math.round(postPrice).toLocaleString()}원
            </>
          )}
        </div>
      </div>

      {/* 단가 소계 */}
      <div className="border-t border-gray-200 pt-0.5 space-y-0.5">
        <div className="text-gray-600">
          <span className="text-gray-400">단가(1권):</span>{' '}
          {Math.round(totalBindingPrice).toLocaleString()} +{' '}
          {Math.round(printPrice).toLocaleString()}
          {postPrice > 0 && <> + {Math.round(postPrice).toLocaleString()}</>} ={' '}
          <span className="font-medium">
            {Math.round(unitPrice).toLocaleString()}
            <span className="text-[11px]">원</span>
          </span>
        </div>
        <div className={cn('font-bold text-[11px]', 'text-primary')}>
          <span className="text-gray-400 font-normal">합계:</span>{' '}
          {quantity > 1 ? (
            <>
              <span className="text-[16px]">
                {Math.round(unitPrice).toLocaleString()}
                <span className="text-[11px]">원</span>
              </span>{' '}
              × {quantity}부 ={' '}
              <span className="text-[16px]">
                {Math.round(totalPrice).toLocaleString()}
                <span className="text-[11px]">원</span>
              </span>
            </>
          ) : (
            <span className="text-[16px]">
              {Math.round(totalPrice).toLocaleString()}
              <span className="text-[11px]">원</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

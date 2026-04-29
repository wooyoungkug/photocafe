'use client';

import { Palette } from 'lucide-react';

const BINDING_DIRECTION_LABEL: Record<string, string> = {
  LEFT_START_RIGHT_END: '좌시작우끝',
  LEFT_START_LEFT_END: '좌시작좌끝',
  RIGHT_START_LEFT_END: '우시작좌끝',
  RIGHT_START_RIGHT_END: '우시작우끝',
  'ltr-rend': '좌시작우끝',
  'ltr-lend': '좌시작좌끝',
  'rtl-lend': '우시작좌끝',
  'rtl-rend': '우시작우끝',
};

export interface OrderItemSpecBadgesProps {
  item: {
    bindingType?: string;
    pageLayout?: string;
    printSide?: string;
    bindingDirection?: string;
    printMethod?: string;
    finishingOptions?: string[];
    fabricName?: string;
    coverMaterial?: string;
    foilName?: string;
    foilColor?: string;
    foilPosition?: string;
    size?: string;
    pages?: number;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
  };
  /** 가격 행 표시 여부 (관리자 화면에서는 별도 가격 영역이 있으므로 숨김) */
  showPrice?: boolean;
}

export function OrderItemSpecBadges({ item, showPrice = true }: OrderItemSpecBadgesProps) {
  const hasFabric = !!item.fabricName;
  const hasFoil = !!(item.foilColor || item.foilName || item.foilPosition);
  const hasEditRow =
    !!(item.bindingType || item.pageLayout || item.bindingDirection || item.printMethod || item.printSide);
  const hasMaterialRow = hasFabric || hasFoil || !!item.coverMaterial;

  return (
    <div className="space-y-1.5">
      {hasEditRow && (
        <div className="flex items-center gap-2 text-[13px] text-gray-600 flex-wrap">
          {item.bindingType && (
            <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200 text-[13px]">
              {item.bindingType.split('_')[0].replace(/\s*\(.*?\)$/, '').trim() || item.bindingType}
            </span>
          )}
          {item.pageLayout && (
            <>
              <span className="text-[13px] text-black">편집</span>
              <span className="px-1.5 py-0.5 text-[13px] rounded border bg-blue-500 text-white border-blue-500">
                {item.pageLayout === 'spread' ? '펼침면' : item.pageLayout === 'single' ? '낱장' : item.pageLayout}
              </span>
            </>
          )}
          {item.printSide && (
            <>
              <span className="text-[13px] text-black ml-2">인쇄</span>
              <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 text-[13px]">
                {item.printSide === 'double' ? '양면' : item.printSide === 'single' ? '단면' : item.printSide}
              </span>
            </>
          )}
          {item.bindingDirection && (
            <>
              <span className="text-[13px] text-black ml-2">제본방향</span>
              <span className="bg-white text-black px-1.5 py-0.5 rounded border border-gray-300 text-[13px]">
                {BINDING_DIRECTION_LABEL[item.bindingDirection] || item.bindingDirection}
              </span>
            </>
          )}
          {item.printMethod && (
            <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 text-[13px] ml-2">
              {item.printMethod}
            </span>
          )}
          {item.finishingOptions?.map((opt, i) => (
            <span
              key={i}
              className="bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 text-[13px]"
            >
              {opt}
            </span>
          ))}
        </div>
      )}

      {hasMaterialRow && (
        <div className="flex items-center gap-1.5 flex-wrap text-[13px] text-gray-500">
          {(hasFabric || item.coverMaterial) && (
            <span className="text-[13px] text-black">원단</span>
          )}
          {item.fabricName && (
            <span className="bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded border border-pink-200 flex items-center gap-1">
              <Palette className="w-2.5 h-2.5" />
              {item.fabricName}
            </span>
          )}
          {item.coverMaterial && (
            <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
              {item.coverMaterial}
            </span>
          )}
          {hasFoil && <span className="text-[13px] text-black ml-3">동판정보</span>}
          {item.foilName && (
            <span className="bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded border border-violet-200">
              {item.foilName}
            </span>
          )}
          {item.foilColor && (
            <span className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200">
              {item.foilColor}
            </span>
          )}
          {item.foilPosition && (
            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
              {item.foilPosition}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-[13px] flex-1">
          {item.size && (
            <>
              <span className="text-black">규격</span>
              <span className="bg-white text-black px-1.5 py-0.5 rounded border border-gray-300 text-[13px]">
                {item.size}
              </span>
              <span className="text-gray-300">|</span>
            </>
          )}
          {item.pages && (
            <>
              <span className="text-black">페이지</span>
              <span className="text-black">{item.pages}p</span>
              <span className="text-gray-300">|</span>
            </>
          )}
          {typeof item.quantity === 'number' && (
            <>
              <span className="text-black">부수</span>
              <span className="text-black">{item.quantity}</span>
            </>
          )}
        </div>
        {showPrice && typeof item.totalPrice === 'number' && (
          <div className="text-right shrink-0">
            <p className="font-medium text-[13px] text-black">{item.totalPrice.toLocaleString()}원</p>
            {(item.quantity ?? 0) > 1 && typeof item.unitPrice === 'number' && (
              <p className="text-[13px] text-gray-400">단가 {item.unitPrice.toLocaleString()}원</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

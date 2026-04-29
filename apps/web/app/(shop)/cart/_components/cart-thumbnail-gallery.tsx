'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useTranslations } from 'next-intl';
import { cn, normalizeImageUrl } from '@/lib/utils';

type BindingDirection =
  | 'LEFT_START_RIGHT_END'
  | 'LEFT_START_LEFT_END'
  | 'RIGHT_START_LEFT_END'
  | 'RIGHT_START_RIGHT_END';

interface CartThumbnailGalleryProps {
  thumbnailUrls: string[];
  pageLayout?: 'single' | 'spread';
  bindingDirection?: string;
  /** Controlled open state from parent (undefined = uncontrolled) */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

// 펼침면에서 각 파일의 좌/우 실제 페이지 번호 계산 (FolderCard 동일 로직)
function getSpreadPageNumbers(
  fileIndex: number,
  totalFiles: number,
  direction: BindingDirection | null
): { left: number | null; right: number | null } {
  const dir = direction || 'LEFT_START_RIGHT_END';

  switch (dir) {
    case 'LEFT_START_RIGHT_END':
      return { left: fileIndex * 2 + 1, right: fileIndex * 2 + 2 };
    case 'LEFT_START_LEFT_END':
      if (fileIndex === totalFiles - 1) {
        return { left: fileIndex * 2 + 1, right: null };
      }
      return { left: fileIndex * 2 + 1, right: fileIndex * 2 + 2 };
    case 'RIGHT_START_LEFT_END':
      if (fileIndex === 0) {
        return { left: null, right: 1 };
      }
      if (fileIndex === totalFiles - 1 && totalFiles > 1) {
        return { left: fileIndex * 2, right: null };
      }
      return { left: fileIndex * 2, right: fileIndex * 2 + 1 };
    case 'RIGHT_START_RIGHT_END':
      if (fileIndex === 0) {
        return { left: null, right: 1 };
      }
      return { left: fileIndex * 2, right: fileIndex * 2 + 1 };
  }
}

/** 개별 썸네일 - 이미지 에러 시 React state로 fallback 처리 */
function ThumbnailItem({
  url,
  idx,
  pageLayout,
  totalFiles,
  direction,
  blankLabel,
}: {
  url: string;
  idx: number;
  pageLayout?: 'single' | 'spread';
  totalFiles: number;
  direction: BindingDirection;
  blankLabel: string;
}) {
  const [hasError, setHasError] = useState(false);
  const [imgRatio, setImgRatio] = useState<number | null>(null);

  return (
    <div className="relative rounded overflow-hidden border border-gray-200 bg-white">
      {hasError ? (
        <div className="flex items-center justify-center aspect-[3/4] bg-gray-100 text-gray-400 text-[10px]">
          {idx + 1}
        </div>
      ) : (
        <img
          src={normalizeImageUrl(url)}
          alt={`${idx + 1}`}
          className="w-full h-auto"
          loading="lazy"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              setImgRatio(img.naturalWidth / img.naturalHeight);
            }
          }}
          onError={() => setHasError(true)}
        />
      )}
      {pageLayout === 'spread' && (() => {
        const pages = getSpreadPageNumbers(idx, totalFiles, direction);
        const leftBlank = pages.left === null;
        const rightBlank = pages.right === null;
        if (!leftBlank && !rightBlank) return null;
        return (
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 max-w-[48%] max-h-[96%] pointer-events-none flex items-center justify-center bg-blue-50/85 border-2 border-dashed border-blue-400 overflow-hidden rounded',
              leftBlank ? 'left-[2%]' : 'right-[2%]'
            )}
            style={{
              aspectRatio: imgRatio ? String(imgRatio) : '4/5',
              width: imgRatio && imgRatio > 1 ? '48%' : `${Math.min(48, (imgRatio ?? 0.8) * 50)}%`,
            }}
            aria-label={blankLabel}
          >
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line x1="0" y1="0" x2="100" y2="100" stroke="rgb(96 165 250 / 0.6)" strokeWidth="1.5" />
              <line x1="100" y1="0" x2="0" y2="100" stroke="rgb(96 165 250 / 0.6)" strokeWidth="1.5" />
            </svg>
            <span className="relative text-[8px] font-bold text-blue-600 select-none bg-white/95 rounded px-1 py-0.5 whitespace-nowrap shadow-sm">빈페이지</span>
          </div>
        );
      })()}
      {pageLayout === 'spread' ? (() => {
        const pages = getSpreadPageNumbers(idx, totalFiles, direction);
        return (
          <>
            <div
              className={cn(
                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[7px] font-medium',
                pages.left !== null ? 'bg-red-600' : 'bg-blue-500'
              )}
              title={pages.left !== null ? undefined : blankLabel}
            >
              {pages.left !== null ? pages.left : '空'}
            </div>
            <div
              className={cn(
                'absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[7px] font-medium',
                pages.right !== null ? 'bg-red-600' : 'bg-blue-500'
              )}
              title={pages.right !== null ? undefined : blankLabel}
            >
              {pages.right !== null ? pages.right : '空'}
            </div>
          </>
        );
      })() : (
        <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-white text-[7px] font-medium">
          {idx + 1}
        </div>
      )}
    </div>
  );
}

export function CartThumbnailGallery({ thumbnailUrls, pageLayout, bindingDirection, expanded, onExpandedChange }: CartThumbnailGalleryProps) {
  const t = useTranslations('cart');

  if (!thumbnailUrls || thumbnailUrls.length <= 1) return null;

  const direction = (bindingDirection as BindingDirection) || 'LEFT_START_RIGHT_END';
  const totalFiles = thumbnailUrls.length;
  const blankLabel = t('blank') ?? 'Blank page';

  // 개별 썸네일 렌더링
  const renderThumbnail = (url: string, idx: number) => (
    <ThumbnailItem
      key={idx}
      url={url}
      idx={idx}
      pageLayout={pageLayout}
      totalFiles={totalFiles}
      direction={direction}
      blankLabel={blankLabel}
    />
  );

  // 빈페이지 슬롯 렌더링 — 첫장/막장의 빈쪽을 "X 대각선 + 空" 으로 명확히 시각화
  const renderBlankSlot = (key: string) => (
    <div key={key} className="relative rounded border-2 border-dashed border-blue-400 bg-blue-50/20 aspect-[3/4] flex items-center justify-center overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line x1="0" y1="0" x2="100" y2="100" stroke="rgb(96 165 250 / 0.5)" strokeWidth="1.2" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="rgb(96 165 250 / 0.5)" strokeWidth="1.2" />
      </svg>
      <span className="relative text-[10px] font-bold text-blue-600 select-none bg-white/95 rounded px-1.5 py-0.5 whitespace-nowrap shadow-sm">빈페이지</span>
    </div>
  );

  // 낱장: 2p씩 묶어서 외각박스 + 가상 빈페이지 표시
  if (pageLayout === 'single') {
    const startsRight = direction.startsWith('RIGHT');

    type SpreadSlot = { type: 'page'; fileIndex: number } | { type: 'blank' };
    const spreads: Array<{ left: SpreadSlot; right: SpreadSlot }> = [];
    let i = 0;

    if (startsRight && totalFiles > 0) {
      spreads.push({
        left: { type: 'blank' },
        right: { type: 'page', fileIndex: 0 },
      });
      i = 1;
    }

    while (i < totalFiles) {
      if (i + 1 < totalFiles) {
        spreads.push({
          left: { type: 'page', fileIndex: i },
          right: { type: 'page', fileIndex: i + 1 },
        });
        i += 2;
      } else {
        spreads.push({
          left: { type: 'page', fileIndex: i },
          right: { type: 'blank' },
        });
        i++;
      }
    }

    const accordionValue = expanded ? 'thumbnails' : '';

    return (
      <div className="border-t border-gray-100">
        <Accordion
          type="single"
          collapsible
          {...(expanded !== undefined
            ? { value: accordionValue, onValueChange: (v: string) => onExpandedChange?.(v === 'thumbnails') }
            : {}
          )}
        >
          <AccordionItem value="thumbnails" className="border-0">
            <AccordionTrigger className="px-4 py-2 hover:bg-gray-50/50 hover:no-underline text-xs">
              <span className="flex items-center gap-1.5 text-gray-600">
                <ImageIcon className="h-3.5 w-3.5" />
                {t('thumbnailPreview')} ({thumbnailUrls.length})
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3 pt-0">
              <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded-lg border">
                {spreads.map((spread, spreadIdx) => {
                  const leftIdx = spread.left.type === 'page' ? spread.left.fileIndex : null;
                  const rightIdx = spread.right.type === 'page' ? spread.right.fileIndex : null;
                  const hasBoth = leftIdx !== null && rightIdx !== null;
                  const label = hasBoth
                    ? `S${spreadIdx + 1} (p${leftIdx! + 1}-${rightIdx! + 1})`
                    : leftIdx !== null
                      ? `p${leftIdx + 1}`
                      : rightIdx !== null
                        ? `p${rightIdx + 1}`
                        : '';

                  return (
                    <div
                      key={spreadIdx}
                      className={cn(
                        'border-2 border-dashed rounded-lg p-1',
                        !hasBoth ? 'border-blue-400 bg-blue-50/30' : 'border-orange-300 bg-orange-50/20'
                      )}
                    >
                      <div className="text-[8px] text-center text-orange-500 mb-0.5 font-medium">
                        {label}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {spread.left.type === 'page'
                          ? renderThumbnail(thumbnailUrls[spread.left.fileIndex], spread.left.fileIndex)
                          : renderBlankSlot(`blank-l-${spreadIdx}`)}
                        {spread.right.type === 'page'
                          ? renderThumbnail(thumbnailUrls[spread.right.fileIndex], spread.right.fileIndex)
                          : renderBlankSlot(`blank-r-${spreadIdx}`)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  }

  // 펼침면: 기본 그리드 레이아웃 (좌/우 페이지번호 + 빈페이지 표시)
  const accordionValue = expanded ? 'thumbnails' : '';

  return (
    <div className="border-t border-gray-100">
      <Accordion
        type="single"
        collapsible
        {...(expanded !== undefined
          ? { value: accordionValue, onValueChange: (v: string) => onExpandedChange?.(v === 'thumbnails') }
          : {}
        )}
      >
        <AccordionItem value="thumbnails" className="border-0">
          <AccordionTrigger className="px-4 py-2 hover:bg-gray-50/50 hover:no-underline text-xs">
            <span className="flex items-center gap-1.5 text-gray-600">
              <ImageIcon className="h-3.5 w-3.5" />
              {t('thumbnailPreview')} ({thumbnailUrls.length})
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-3 pt-0">
            <div className="grid gap-1.5 p-2 bg-gray-50 rounded-lg border grid-cols-3">
              {thumbnailUrls.map((url, idx) => renderThumbnail(url, idx))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

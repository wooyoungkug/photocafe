'use client';

import { ImageIcon } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type BindingDirection =
  | 'LEFT_START_RIGHT_END'
  | 'LEFT_START_LEFT_END'
  | 'RIGHT_START_LEFT_END'
  | 'RIGHT_START_RIGHT_END';

interface CartThumbnailGalleryProps {
  thumbnailUrls: string[];
  pageLayout?: 'single' | 'spread';
  bindingDirection?: string;
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

export function CartThumbnailGallery({ thumbnailUrls, pageLayout, bindingDirection }: CartThumbnailGalleryProps) {
  const t = useTranslations('cart');

  if (!thumbnailUrls || thumbnailUrls.length <= 1) return null;

  const direction = (bindingDirection as BindingDirection) || 'LEFT_START_RIGHT_END';
  const totalFiles = thumbnailUrls.length;

  // 개별 썸네일 렌더링
  const renderThumbnail = (url: string, idx: number) => (
    <div
      key={idx}
      className="relative rounded overflow-hidden border border-gray-200 bg-white"
    >
      <img
        src={url}
        alt={`${idx + 1}`}
        className="w-full h-auto"
        loading="lazy"
      />
      {pageLayout === 'spread' ? (() => {
        const pages = getSpreadPageNumbers(idx, totalFiles, direction);
        return (
          <>
            <div className={cn(
              'absolute top-0.5 left-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[7px] font-medium',
              pages.left !== null ? 'bg-red-600' : 'bg-yellow-500'
            )}>
              {pages.left !== null ? pages.left : t('blank') ?? '빈'}
            </div>
            <div className={cn(
              'absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[7px] font-medium',
              pages.right !== null ? 'bg-red-600' : 'bg-yellow-500'
            )}>
              {pages.right !== null ? pages.right : t('blank') ?? '빈'}
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

  // 빈페이지 슬롯 렌더링
  const renderBlankSlot = (key: string) => (
    <div key={key} className="relative rounded border-2 border-dashed border-blue-400 bg-blue-50/20 aspect-[3/4]" />
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

    return (
      <div className="border-t border-gray-100">
        <Accordion type="single" collapsible>
          <AccordionItem value="thumbnails" className="border-0">
            <AccordionTrigger className="px-4 py-2 hover:bg-gray-50/50 hover:no-underline text-xs">
              <span className="flex items-center gap-1.5 text-gray-600">
                <ImageIcon className="h-3.5 w-3.5" />
                {t('thumbnailPreview')} ({thumbnailUrls.length})
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3 pt-0">
              <div className="grid grid-cols-4 gap-2 p-2 bg-gray-50 rounded-lg border">
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
                        !hasBoth ? 'border-yellow-400 bg-yellow-50/30' : 'border-orange-300 bg-orange-50/20'
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
  return (
    <div className="border-t border-gray-100">
      <Accordion type="single" collapsible>
        <AccordionItem value="thumbnails" className="border-0">
          <AccordionTrigger className="px-4 py-2 hover:bg-gray-50/50 hover:no-underline text-xs">
            <span className="flex items-center gap-1.5 text-gray-600">
              <ImageIcon className="h-3.5 w-3.5" />
              {t('thumbnailPreview')} ({thumbnailUrls.length})
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-3 pt-0">
            <div className="grid gap-1.5 p-2 bg-gray-50 rounded-lg border grid-cols-4">
              {thumbnailUrls.map((url, idx) => renderThumbnail(url, idx))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

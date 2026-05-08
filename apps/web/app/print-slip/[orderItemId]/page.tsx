'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { usePrintQueueItemDetail } from '@/hooks/use-print-pdf';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizeImageUrl } from '@/lib/utils';

const URGENT_KEYWORDS = ['긴급', '지급', '즉시', '당일', '특급', '우선처리', '급처리', '촉급', '최급', '급건'];
const URGENT_REGEX = new RegExp(`(${URGENT_KEYWORDS.join('|')})`, 'g');

function stripUrgentKeywords(text: string) {
  return text
    .replace(new RegExp(`(${URGENT_KEYWORDS.join('|')})[\\-_\\s]*`, 'g'), '')
    .trim();
}

const BINDING_DIRECTION_LABELS: Record<string, string> = {
  LEFT_START_RIGHT_END: '좌시우끝',
  LEFT_START_LEFT_END: '좌시좌끝',
  RIGHT_START_LEFT_END: '우시좌끝',
  RIGHT_START_RIGHT_END: '우시우끝',
};

function BarcodeCanvas({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    import('bwip-js/browser').then((bwipjs) => {
      try {
        bwipjs.toCanvas(canvasRef.current!, {
          bcid: 'code128',
          text: value,
          scale: 2,
          height: 12,
          includetext: true,
          textxalign: 'center',
          textsize: 9,
        });
      } catch {
        setError(true);
      }
    }).catch(() => setError(true));
  }, [value]);

  if (error) return <span className="text-[10px] text-red-500">{value}</span>;
  return <canvas ref={canvasRef} className="slip-barcode-canvas" />;
}

interface ThumbItem { file: any; url: string | null }

/** DB pageStart/pageEnd·pageRange 우선. 없을 때만 순번 추정(구버전 호환). */
function filePageLabel(
  file: { pageStart?: number; pageEnd?: number; pageRange?: string | null },
  isSpread: boolean,
  fallbackIndexZeroBased: number,
): string {
  const ps = file.pageStart;
  const pe = file.pageEnd;
  if (typeof ps === 'number' && typeof pe === 'number' && ps >= 1 && pe >= 1) {
    if (ps === pe) return String(ps);
    return `${ps}-${pe}`;
  }
  const pr = (file.pageRange || '').trim();
  if (pr) return pr;
  if (isSpread) return `${fallbackIndexZeroBased * 2 + 1}-${fallbackIndexZeroBased * 2 + 2}`;
  return `${fallbackIndexZeroBased + 1}`;
}

function ThumbnailGrid({
  items,
  globalOffset,
  isSpread,
  bindingDirection,
  totalItemCount,
}: {
  items: ThumbItem[];
  globalOffset: number;
  isSpread: boolean;
  bindingDirection?: string;
  totalItemCount: number;
}) {
  const isLeftStart = !(bindingDirection || 'LEFT_START_RIGHT_END').startsWith('RIGHT_START');

  return (
    <div className={isSpread ? 'grid gap-2 grid-cols-4' : 'grid gap-1 grid-cols-8'}>
      {items.map(({ file, url }, localIdx) => {
        const fallbackIndex = globalOffset + localIdx;
        const pageLabel = filePageLabel(file, isSpread, fallbackIndex);
        const ps = file.pageStart;
        const pe = file.pageEnd;
        const leftPage = typeof ps === 'number' && ps >= 1 ? ps
          : isSpread ? fallbackIndex * 2 + 1 : fallbackIndex + 1;
        const rightPage = isSpread
          ? (typeof pe === 'number' && pe >= 1 ? pe : fallbackIndex * 2 + 2)
          : null;
        const fileName = (file.fileName || '').replace(/\.[^.]+$/, '');
        const seqNum = String(fallbackIndex + 1).padStart(2, '0');
        const cleanName = (fileName || pageLabel).replace(/^\d+\s*/, '');
        const displayLabel = `${seqNum} ${cleanName}`;

        // 하프 스프레드 감지: pageStart === pageEnd (한쪽만 실제 페이지)
        const isHalfSpread = isSpread &&
          typeof ps === 'number' && typeof pe === 'number' && ps >= 1 && ps === pe;
        const isFirstItem = fallbackIndex === 0;
        const isLastItem = fallbackIndex === totalItemCount - 1;

        // 빈페이지 위치 결정
        // 우시작(RIGHT_START): 첫 스프레드 왼쪽이 빈면
        // 좌끝(LEFT_END): 마지막 스프레드 오른쪽이 빈면
        // 좌시우끝(LEFT_START_RIGHT_END): 빈페이지 없음
        let blankLeft = false;
        let blankRight = false;
        if (isHalfSpread) {
          if (isFirstItem) {
            blankLeft = !isLeftStart;   // 우시작(RIGHT_START) → 왼쪽 빈면
            // 좌시작(LEFT_START): 1페이지가 왼쪽에서 시작 → 빈면 없음
          } else if (isLastItem) {
            const isLeftEnd = (bindingDirection || '').includes('LEFT_END');
            blankRight = isLeftEnd;     // 좌끝(LEFT_END) → 오른쪽 빈면
            // 우끝(RIGHT_END): 마지막 페이지가 오른쪽에서 끝 → 빈면 없음
          }
        }

        return (
          <div key={file.id ?? fallbackIndex} className="flex flex-col min-w-0">
            {/* 이미지 셀 */}
            <div className="relative border border-gray-300 rounded-t-md overflow-hidden bg-gray-50">
              {url ? (
                <img src={url} alt={pageLabel} className="w-full h-auto block" />
              ) : (
                <div className="relative aspect-[3/2] border-2 border-dashed border-blue-400 bg-blue-50/50 flex items-center justify-center overflow-hidden">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <line x1="0" y1="0" x2="100" y2="100" stroke="rgb(96 165 250 / 0.5)" strokeWidth="1.2" />
                    <line x1="100" y1="0" x2="0" y2="100" stroke="rgb(96 165 250 / 0.5)" strokeWidth="1.2" />
                  </svg>
                  <span className="relative text-[9px] font-bold text-blue-600 bg-white/95 rounded px-1 py-0.5">미생성</span>
                </div>
              )}

              {/* 빈페이지 오버레이 */}
              {blankLeft && (
                <div className="absolute inset-y-0 left-0 w-1/2 border-2 border-dashed border-blue-400 bg-blue-50/60 flex items-center justify-center overflow-hidden">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <line x1="0" y1="0" x2="100" y2="100" stroke="rgb(96 165 250 / 0.55)" strokeWidth="2.5" />
                    <line x1="100" y1="0" x2="0" y2="100" stroke="rgb(96 165 250 / 0.55)" strokeWidth="2.5" />
                  </svg>
                  <span className="relative text-[8px] font-bold text-blue-600 bg-white/95 rounded px-1 py-0.5 whitespace-nowrap shadow-sm">빈페이지</span>
                </div>
              )}
              {blankRight && (
                <div className="absolute inset-y-0 right-0 w-1/2 border-2 border-dashed border-blue-400 bg-blue-50/60 flex items-center justify-center overflow-hidden">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <line x1="0" y1="0" x2="100" y2="100" stroke="rgb(96 165 250 / 0.55)" strokeWidth="2.5" />
                    <line x1="100" y1="0" x2="0" y2="100" stroke="rgb(96 165 250 / 0.55)" strokeWidth="2.5" />
                  </svg>
                  <span className="relative text-[8px] font-bold text-blue-600 bg-white/95 rounded px-1 py-0.5 whitespace-nowrap shadow-sm">빈페이지</span>
                </div>
              )}

              {/* 왼쪽 페이지 번호 뱃지 */}
              <div className={`absolute top-1 left-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold leading-none ${blankLeft ? 'bg-pink-200 text-pink-900' : 'bg-pink-500 text-white'}`}>
                {blankLeft ? '空' : leftPage}
              </div>
              {/* 오른쪽 페이지 번호 뱃지 (스프레드만) */}
              {rightPage !== null && (
                <div className={`absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold leading-none ${blankRight ? 'bg-pink-200 text-pink-900' : 'bg-pink-500 text-white'}`}>
                  {blankRight ? '空' : rightPage}
                </div>
              )}
            </div>
            {/* 파일명 하단 패널 */}
            <div className="text-[8px] text-center truncate font-medium text-black border border-t-0 border-gray-300 rounded-b-md bg-white px-1 py-0.5 leading-tight">
              {displayLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PrintSlipPage() {
  const { orderItemId } = useParams<{ orderItemId: string }>();
  const searchParams = useSearchParams();
  const printToken = searchParams.get('printToken') ?? undefined;
  const { data, isLoading, isError } = usePrintQueueItemDetail(orderItemId, printToken);

  useEffect(() => {
    if (!data || isError) return;
    const prev = document.title;
    const num = (data as any).order?.orderNumber;
    document.title = num ? `작업 지시서 ${num}` : '작업 지시서';
    return () => {
      document.title = prev;
    };
  }, [data, isError]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-[14px] text-black">로딩 중...</div>;
  }
  if (isError || !data) {
    return <div className="flex items-center justify-center h-screen text-[14px] text-black">데이터를 불러올 수 없습니다.</div>;
  }

  const d = data as any;
  const order = d.order || {};
  const client = order.client || {};
  const isUrgent = order.isUrgent;
  const isInkjet = (d.printMethod || '').toLowerCase().includes('inkjet');
  const printMethodLabel = isInkjet ? '잉크젯' : '인디고';
  const bindingDirection: string = d.bindingDirection || 'LEFT_START_RIGHT_END';

  const toThumbUrl = (p: string | undefined) => {
    if (!p) return null;
    const t = p.trim();
    if (t.startsWith('http://') || t.startsWith('https://')) return t;
    const normalized = normalizeImageUrl(t.replace(/\\/g, '/'));
    if (!normalized) return null;
    if (normalized.startsWith('/')) return normalized;
    return `/uploads/${normalized.replace(/^\/+/, '').replace(/^.*\/uploads\//, '')}`;
  };

  const thumbItems: ThumbItem[] = (d.files || []).map((f: any) => ({
    file: f,
    url: toThumbUrl(f.thumbnailUrl),
  }));

  const isSpread = d.pageLayout === 'spread';

  // 1페이지: 최대한 채움 (실제 파일 수가 제한)
  // 이후 페이지: 미니헤더 포함 A4 한 면 기준
  const PAGE1_COUNT = isSpread ? 40 : 100;
  const PAGE_N_COUNT = isSpread ? 28 : 96;

  const page1Items = thumbItems.slice(0, PAGE1_COUNT);
  const remaining = thumbItems.slice(PAGE1_COUNT);

  const subsequentPages: ThumbItem[][] = [];
  for (let i = 0; i < remaining.length; i += PAGE_N_COUNT) {
    subsequentPages.push(remaining.slice(i, i + PAGE_N_COUNT));
  }
  const totalPages = 1 + subsequentPages.length;

  const totalFiles = thumbItems.length;
  const missingThumbCount = thumbItems.filter((t) => t.url === null).length;

  const pageLayoutLabel = isSpread ? '펼침면' : d.pageLayout === 'single' ? '낱장' : '-';
  const bindingLabel = d.bindingType
    ? d.bindingType.replace(/^인디고/, '').replace(/\s*\(.*\)$/, '').replace(/_/g, ' ').trim() || d.bindingType
    : '-';
  const bindingDirLabel = d.bindingDirection
    ? BINDING_DIRECTION_LABELS[d.bindingDirection] || d.bindingDirection
    : '';
  const printSideLabel = d.printSide === 'double' ? '양면' : d.printSide === 'single' ? '단면' : '';
  const sizeDisplay = (d.size || '-').replace(/인치$/, '') + (d.size?.includes('인치') ? '인치' : '');
  const memo = [order.customerMemo, d.productMemo].filter(Boolean).join(' / ');
  const barcodeValue = order.orderNumber || orderItemId;
  const folderLabel = stripUrgentKeywords(d.folderName || d.productName || '-');

  const orderDateLabel = (() => {
    const raw = order.createdAt || order.orderedAt || d.orderedAt;
    if (!raw) return '-';
    const dt = new Date(raw);
    const yy = String(dt.getFullYear()).slice(2);
    const mo = dt.getMonth() + 1;
    const da = dt.getDate();
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return `${yy}년${mo}월${da}일 ${hh}시 ${mm}분`;
  })();

  return (
    <>
      <style jsx global>{`
        @media print {
          /* Sonner 등 포털 — visibility:hidden 은 공간을 남겨 빈 2페이지 유발 가능 */
          [data-sonner-toaster],
          section[aria-live="polite"][tabindex="-1"][aria-label] {
            display: none !important;
          }
          /* 본문만 인쇄 (출력대기 슬립 페이지와 동일 패턴) */
          body * {
            visibility: hidden !important;
          }
          #slip-wrapper,
          #slip-wrapper * {
            visibility: visible !important;
          }
          #slip-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            gap: 0 !important;
          }
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }
          html,
          body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
          }
          .a4-page,
          .a4-page-cont {
            box-shadow: none !important;
            border: none !important;
          }
          #slip-wrapper > *:not(:last-child) {
            break-after: page;
          }
          .a4-page:last-child,
          .a4-page-cont:last-child {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          img,
          canvas {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        body {
          background: #f5f5f5;
          margin: 0;
        }
      `}</style>

      {/* 툴바 */}
      <div className="no-print flex items-center gap-2 px-4 py-2 border-b bg-white sticky top-0 z-10">
        <Button size="sm" onClick={() => window.print()} className="gap-1">
          <Printer className="h-4 w-4" />인쇄
        </Button>
        <Button size="sm" variant="ghost" onClick={() => window.close()} className="gap-1">
          <X className="h-4 w-4" />닫기
        </Button>
        <span className="ml-2 text-[13px] text-gray-500">
          A4 / 작업지시서{totalPages > 1 ? ` (${totalPages}페이지)` : ''}
        </span>
      </div>

      <div id="slip-wrapper" className="flex flex-col items-center py-6 px-4 gap-6">

        {/* ─── 1페이지 ─── */}
        <div className="a4-page shadow-lg border border-gray-200 text-black">
          {/* 긴급 배너 */}
          {isUrgent && (
            <div className="bg-red-600 text-white text-center font-bold py-2 text-[14px] tracking-widest">
              긴급 주문
            </div>
          )}

          {/* 헤더 */}
          <div className="flex items-center justify-center px-5 py-4 border-b border-gray-300 bg-gray-50">
            <div className="flex items-center gap-2 font-bold text-[30pt]">
              {(isUrgent || URGENT_KEYWORDS.some(kw => (d.folderName || d.productName || '').includes(kw))) && (
                <span className="urgent-stamp">긴급</span>
              )}
              <span>작업 지시서</span>
            </div>
          </div>

          {/* 바코드 + 주문정보 */}
          <div className="flex items-center gap-4 px-5 py-2 border-b border-gray-200 bg-white">
            <div className="flex flex-col items-start gap-0.5">
              <BarcodeCanvas value={barcodeValue} />
            </div>
            <div className="flex-1 flex flex-col justify-center gap-1">
              <div className="flex items-center gap-4">
                <span className="text-[10pt] text-gray-500">주문날자</span>
                <span className="text-[10pt] text-black font-normal">{orderDateLabel}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10pt] text-gray-500">주문번호</span>
                <span className="font-bold text-[10pt] tracking-widest">{order.orderNumber || '-'}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10pt] text-gray-500">스튜디오</span>
                <span className="font-bold text-[10pt]">{client.clientName || '-'}</span>
                {d.salesRep && (
                  <>
                    <span className="text-[10pt] text-gray-500">CS담당</span>
                    <span className="text-[10pt] text-black">{d.salesRep}</span>
                    {d.salesRepPhone && (
                      <span className="text-[10pt] text-gray-600 ml-1">{d.salesRepPhone}</span>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="w-24 h-24 border border-gray-300 rounded overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
              {d.copperPlateImageUrl ? (
                <img
                  src={`/uploads/${d.copperPlateImageUrl.replace(/\\/g, '/').replace(/^.*\/uploads\//, '')}`}
                  alt="동판"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[9px] text-gray-400 text-center leading-tight">동판<br/>이미지<br/>없음</span>
              )}
            </div>
          </div>

          {/* 폴더명 */}
          <div className="px-4 py-2">
            <div className="text-[14pt] font-bold text-center leading-tight line-clamp-2 break-words">{folderLabel}</div>
          </div>

          {/* 메모 */}
          {memo && (
            <div className="mx-4 mb-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-[13px]">
              <span className="text-gray-500 mr-1 font-medium">메모:</span>{memo}
            </div>
          )}

          {/* 스펙 박스 */}
          <div className="mx-4 mb-3 px-4 py-2 border border-gray-200 rounded">
            <div className="flex flex-wrap items-center gap-3 text-[13px] mb-1.5">
              <span className="font-medium">{sizeDisplay}</span>
              <span className="text-gray-400">|</span>
              <span>{printMethodLabel}</span>
              <span className="text-gray-400">|</span>
              <span>{d.paper || '-'}</span>
              <span className="text-gray-400">|</span>
              <span>{pageLayoutLabel}{bindingDirLabel ? ` / ${bindingDirLabel}` : ''}</span>
              {printSideLabel && <><span className="text-gray-400">|</span><span>{printSideLabel}</span></>}
              <span className="text-gray-400">|</span>
              <span>{d.pages ?? '-'}p</span>
              <span className="text-gray-400">|</span>
              <span className={(d.quantity ?? 1) > 1 ? 'text-red-600 font-bold' : ''}>{d.quantity ?? 1}부</span>
            </div>
            {(bindingLabel || d.fabricName || d.foilName || d.foilColor || d.foilPosition) && (
              <div className="flex flex-wrap gap-6 text-[13px]">
                {bindingLabel && <span><span className="text-gray-500">제본: </span>{bindingLabel}</span>}
                {d.fabricName && <span><span className="text-gray-500">원단: </span>{d.fabricName}</span>}
                {d.foilName && <span><span className="text-gray-500">박이름: </span>{d.foilName}</span>}
                {d.foilColor && <span><span className="text-gray-500">박컬러: </span>{d.foilColor}</span>}
                {d.foilPosition && <span><span className="text-gray-500">박위치: </span>{d.foilPosition}</span>}
              </div>
            )}
          </div>

          {/* 1페이지 썸네일 */}
          {page1Items.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] text-gray-400">페이지 썸네일</span>
                {missingThumbCount > 0 && (
                  <span className="text-[10px] text-orange-500">
                    (미생성 {missingThumbCount}개 포함 — 전체 {totalFiles}개)
                  </span>
                )}
                {totalPages > 1 && (
                  <span className="text-[10px] text-blue-400 ml-auto">1 / {totalPages}</span>
                )}
              </div>
              <ThumbnailGrid items={page1Items} globalOffset={0} isSpread={isSpread} bindingDirection={bindingDirection} totalItemCount={thumbItems.length} />
            </div>
          )}
        </div>

        {/* ─── 2페이지~ ─── */}
        {subsequentPages.map((pageItems, pageIdx) => {
          const globalOffset = PAGE1_COUNT + pageIdx * PAGE_N_COUNT;
          const pageNum = pageIdx + 2;
          return (
            <div key={pageIdx} className="a4-page-cont shadow-lg border border-gray-200 text-black">
              {/* 미니 헤더 */}
              <div className="flex items-center justify-between px-5 py-2 border-b border-gray-300 bg-gray-50">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-[10pt] tracking-widest">{order.orderNumber || '-'}</span>
                  <span className="text-[10pt] text-gray-700">{client.clientName || '-'}</span>
                </div>
                <span className="text-[9pt] text-gray-500 truncate max-w-[280px]">{folderLabel}</span>
                <span className="text-[9pt] text-gray-400 shrink-0">{pageNum} / {totalPages}</span>
              </div>
              <div className="p-3">
                <ThumbnailGrid items={pageItems} globalOffset={globalOffset} isSpread={isSpread} bindingDirection={bindingDirection} totalItemCount={thumbItems.length} />
              </div>
            </div>
          );
        })}

      </div>
    </>
  );
}

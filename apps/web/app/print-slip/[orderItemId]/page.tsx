'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { usePrintQueueItemDetail } from '@/hooks/use-print-pdf';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

function ThumbnailGrid({
  items,
  globalOffset,
  isSpread,
}: {
  items: ThumbItem[];
  globalOffset: number;
  isSpread: boolean;
}) {
  return (
    <div className={isSpread ? 'grid gap-1 grid-cols-4' : 'grid gap-1 grid-cols-8'}>
      {items.map(({ file, url }, localIdx) => {
        const i = globalOffset + localIdx;
        const pageLabel = isSpread ? `${i * 2 + 1}-${i * 2 + 2}` : `${i + 1}`;
        return (
          <div key={file.id ?? i} className="flex flex-col">
            <div className="thumb-cell">
              {url ? (
                <img src={url} alt={pageLabel} className="w-full h-auto block rounded-sm" />
              ) : (
                <div className="thumb-placeholder"><span>미생성</span></div>
              )}
              <span className="thumb-page-label">{pageLabel}</span>
            </div>
            <span className="thumb-filename block w-full truncate">{file.fileName || ''}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function PrintSlipPage() {
  const { orderItemId } = useParams<{ orderItemId: string }>();
  const { data, isLoading, isError } = usePrintQueueItemDetail(orderItemId);

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

  const toThumbUrl = (p: string | undefined) =>
    p ? `/uploads/${p.replace(/\\/g, '/').replace(/^.*\/uploads\//, '')}` : null;

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
          .no-print { display: none !important; }
          body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          #slip-wrapper { padding: 0 !important; gap: 0 !important; }
          .a4-page, .a4-page-cont { box-shadow: none !important; border: none !important; break-after: page; }
          .a4-page-cont:last-child { break-after: avoid; }
          @page { size: A4 portrait; margin: 10mm; }
          img, canvas { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { background: #f5f5f5; margin: 0; }
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
              <ThumbnailGrid items={page1Items} globalOffset={0} isSpread={isSpread} />
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
                <ThumbnailGrid items={pageItems} globalOffset={globalOffset} isSpread={isSpread} />
              </div>
            </div>
          );
        })}

      </div>
    </>
  );
}

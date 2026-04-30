'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { usePrintQueueItemDetail } from '@/hooks/use-print-pdf';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const URGENT_KEYWORDS = ['긴급', '지급', '즉시', '당일', '특급', '우선처리', '급처리', '촉급', '최급', '급건'];
const URGENT_REGEX = new RegExp(`(${URGENT_KEYWORDS.join('|')})`, 'g');

function highlightUrgent(text: string, urgentClass: string) {
  const parts = text.split(URGENT_REGEX);
  return parts.map((part, i) =>
    URGENT_KEYWORDS.includes(part)
      ? <span key={i} className={urgentClass}>{part}</span>
      : part
  );
}

const PRINT_METHOD_LABELS: Record<string, string> = {
  indigo: '인디고',
  inkjet: '잉크젯',
};

const BINDING_DIRECTION_LABELS: Record<string, string> = {
  LEFT_START_RIGHT_END: '좌시우끝',
  LEFT_START_LEFT_END: '좌시좌끝',
  RIGHT_START_LEFT_END: '우시좌끝',
  RIGHT_START_RIGHT_END: '우시우끝',
};

export default function PrintSlipPage() {
  const { orderItemId } = useParams<{ orderItemId: string }>();
  const { data, isLoading, isError } = usePrintQueueItemDetail(orderItemId);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const orderId = (data as any).order?.id;
    if (!orderId) return;
    const url = `${window.location.origin}/orders/${orderId}`;
    QRCode.toDataURL(url, { width: 120, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-[14px] text-black font-normal">
        로딩 중...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-screen text-[14px] text-black font-normal">
        데이터를 불러올 수 없습니다.
      </div>
    );
  }

  const d = data as any;
  const order = d.order || {};
  const client = order.client || {};
  const isUrgent = order.isUrgent;
  const isInkjet = (d.printMethod || '').toLowerCase().includes('inkjet');
  const printMethodLabel = isInkjet ? '잉크젯' : '인디고';
  const printMethodColor = isInkjet ? 'bg-blue-600' : 'bg-purple-700';

  const thumbnailUrl = d.files?.[0]?.thumbnailUrl
    ? `/uploads/${d.files[0].thumbnailUrl.replace(/^.*\/uploads\//, '')}`
    : null;

  const pageLayoutLabel =
    d.pageLayout === 'spread' ? '펼침면' : d.pageLayout === 'single' ? '낱장' : '-';

  const bindingLabel = d.bindingType
    ? d.bindingType
        .replace(/^인디고/, '')
        .replace(/\s*\(.*\)$/, '')
        .replace(/_/g, ' ')
        .trim() || d.bindingType
    : '-';

  const bindingDirLabel = d.bindingDirection
    ? BINDING_DIRECTION_LABELS[d.bindingDirection] || d.bindingDirection
    : '';

  const printSideLabel =
    d.printSide === 'double' ? '양면' : d.printSide === 'single' ? '단면' : '';

  const sizeDisplay = (d.size || '-').replace(/인치$/, '') + (d.size?.includes('인치') ? '인치' : '');

  const deliveryDate = order.requestedDeliveryDate
    ? new Date(order.requestedDeliveryDate).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '-';

  const memo = [order.customerMemo, d.productMemo].filter(Boolean).join(' / ');

  const pdfStatusMap: Record<string, string> = {
    pending: 'PDF변환대기',
    in_progress: '변환중',
    completed: '변환완료',
    failed: '변환에러',
  };
  const pdfStatusLabel = pdfStatusMap[d.pdfStatus || 'pending'] || '-';

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #slip-area, #slip-area * { visibility: visible; }
          #slip-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { size: A5 landscape; margin: 8mm; }
          img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { background: #f5f5f5; }
      `}</style>

      {/* 툴바 */}
      <div className="no-print flex items-center gap-2 px-4 py-2 border-b bg-white sticky top-0 z-10">
        <Button size="sm" onClick={() => window.print()} className="gap-1">
          <Printer className="h-4 w-4" />
          인쇄
        </Button>
        <Button size="sm" variant="ghost" onClick={() => window.close()} className="gap-1">
          <X className="h-4 w-4" />
          닫기
        </Button>
        <span className="ml-2 text-[13px] text-gray-500">A5 가로 / 작업지시서</span>
      </div>

      {/* 작업지시서 본체 */}
      <div className="flex justify-center py-6 px-4">
        <div
          id="slip-area"
          style={{ width: '190mm', minHeight: '130mm', background: '#fff', fontFamily: 'sans-serif' }}
          className="shadow-lg border border-gray-200 text-black"
        >
          {/* 긴급 배너 */}
          {isUrgent && (
            <div className="bg-red-600 text-white text-center font-bold py-1.5 text-[13px] tracking-widest">
              긴급 주문
            </div>
          )}

          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-300 bg-gray-50">
            <div className="font-bold text-[16px] tracking-tight">PhotoCafe</div>
            <div className="font-bold text-[15px]">작업 지시서</div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-gray-600">
                {new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })}
              </span>
              <span className={`text-white text-[11px] px-2 py-0.5 rounded font-bold ${printMethodColor}`}>
                {printMethodLabel}
              </span>
            </div>
          </div>

          {/* 메인 섹션: 썸네일 + 스펙 */}
          <div className="flex">
            {/* 썸네일 */}
            <div
              className="flex-shrink-0 border-r border-gray-200 flex items-center justify-center bg-gray-100"
              style={{ width: '50mm', minHeight: '80mm' }}
            >
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt="썸네일"
                  style={{ width: '44mm', height: '44mm', objectFit: 'cover' }}
                  className="rounded"
                />
              ) : (
                <span className="text-[11px] text-gray-400">이미지 없음</span>
              )}
            </div>

            {/* 스펙 테이블 */}
            <div className="flex-1 px-3 py-2">
              <table className="w-full text-[12px] border-collapse">
                <tbody>
                  <tr>
                    <td className="py-0.5 pr-2 text-gray-500 whitespace-nowrap w-[18mm]">주문번호</td>
                    <td className="py-0.5 font-bold">{order.orderNumber || '-'}</td>
                    <td className="py-0.5 pr-2 text-gray-500 whitespace-nowrap w-[18mm]">납기일</td>
                    <td className="py-0.5">{deliveryDate}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-2 text-gray-500">스튜디오</td>
                    <td className="py-0.5" colSpan={3}>{client.clientName || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-2 text-gray-500">영업담당</td>
                    <td className="py-0.5" colSpan={3}>{(d as any).salesRep || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-2 text-gray-500">폴더명</td>
                    <td className="py-0.5 text-[11px]" colSpan={3}>
                      {highlightUrgent(d.folderName || d.productName || '-', 'urgent-keyword-11px')}
                    </td>
                  </tr>
                  <tr><td colSpan={4} className="py-1"><hr className="border-gray-200" /></td></tr>
                  <tr>
                    <td className="py-0.5 pr-2 text-gray-500">규격</td>
                    <td className="py-0.5 font-medium">{sizeDisplay}</td>
                    <td className="py-0.5 pr-2 text-gray-500">Nup</td>
                    <td className="py-0.5">
                      {d.nup ? (
                        <span className="font-medium">{d.nup}</span>
                      ) : (
                        <span className="text-red-600">미설정</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-2 text-gray-500">용지</td>
                    <td className="py-0.5" colSpan={3}>
                      {d.paper || <span className="text-red-600">미설정</span>}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-2 text-gray-500">제본</td>
                    <td className="py-0.5" colSpan={3}>{bindingLabel}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-2 text-gray-500">편집</td>
                    <td className="py-0.5" colSpan={3}>
                      {pageLayoutLabel}
                      {bindingDirLabel ? ` / ${bindingDirLabel}` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-2 text-gray-500">페이지</td>
                    <td className="py-0.5">
                      {d.pages ?? '-'}p
                    </td>
                    <td className="py-0.5 pr-2 text-gray-500">부수</td>
                    <td className="py-0.5">
                      <span className={(d.quantity ?? 1) > 1 ? 'text-red-600 font-bold' : ''}>
                        {d.quantity ?? 1}부
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-2 text-gray-500">인쇄면</td>
                    <td className="py-0.5" colSpan={3}>{printSideLabel || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 메모 */}
          {memo && (
            <div className="mx-3 mb-1 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded text-[12px]">
              <span className="text-gray-500 mr-1">메모:</span>
              {memo}
            </div>
          )}

          {/* 표지 및 후가공정보 */}
          {(d.fabricName || d.foilName || d.foilColor || d.foilPosition) && (
            <div className="mx-3 mb-2 px-3 py-1.5 border border-gray-200 rounded">
              <div className="text-[11px] text-gray-500 mb-1">표지 및 후가공정보</div>
              <div className="flex gap-4 text-[12px]">
                {d.fabricName && (
                  <span><span className="text-gray-500">원단: </span>{d.fabricName}</span>
                )}
                {d.foilName && (
                  <span><span className="text-gray-500">박이름: </span>{d.foilName}</span>
                )}
                {d.foilColor && (
                  <span><span className="text-gray-500">박컬러: </span>{d.foilColor}</span>
                )}
                {d.foilPosition && (
                  <span><span className="text-gray-500">박위치: </span>{d.foilPosition}</span>
                )}
              </div>
            </div>
          )}

          {/* QR + PDF 상태 */}
          <div className="flex items-center border-t border-gray-200 mx-3 mb-3 pt-2 gap-4">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR코드" style={{ width: '80px', height: '80px' }} />
            ) : (
              <div
                style={{ width: '80px', height: '80px' }}
                className="bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 rounded"
              >
                QR생성중
              </div>
            )}
            <div className="text-[11px] text-gray-600 flex-1">
              <div className="mb-0.5">
                <span className="text-gray-500">파일명: </span>
                <span className="font-medium break-all">{d.files?.[0]?.originalName || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">PDF상태: </span>
                <span
                  className={
                    d.pdfStatus === 'completed'
                      ? 'text-green-700 font-bold'
                      : d.pdfStatus === 'failed'
                        ? 'text-red-600 font-bold'
                        : 'text-gray-700'
                  }
                >
                  {pdfStatusLabel}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-gray-400">
                QR 스캔 → 주문 상세 (공정 입력)
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

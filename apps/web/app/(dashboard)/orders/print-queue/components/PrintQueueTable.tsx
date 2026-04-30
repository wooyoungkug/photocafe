'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PrintQueueItem } from '@/hooks/use-print-pdf';
import { useMatchImpositionBatch, MatchResult, BindingType } from '@/hooks/use-imposition';
import { API_URL } from '@/lib/api';

interface PrintQueueTableProps {
  items: PrintQueueItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isLoading?: boolean;
  onImposition?: (item: PrintQueueItem) => void;
  onOrderClick?: (orderId: string) => void;
}

/** 아이템에서 매칭 엔진 입력으로 변환 */
function toMatchInput(item: PrintQueueItem): {
  productSize?: string;
  bindingType?: BindingType;
  pageCount?: number;
} {
  const m = (item.size || '').match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
  let label: string | undefined;
  if (m) {
    const w = parseFloat(m[1]);
    const h = parseFloat(m[2]);
    const [sh, lg] = w < h ? [w, h] : [h, w];
    const within = (a: number, b: number, t: number) => Math.abs(a - b) <= t;
    if (within(sh, 210, 3) && within(lg, 297, 4)) label = 'A4';
    else if (within(sh, 148, 3) && within(lg, 210, 3)) label = 'A5';
    else if (within(sh, 105, 2) && within(lg, 148, 3)) label = 'A6';
    else if (within(sh, 176, 3) && within(lg, 250, 4)) label = 'B5';
    else if (within(sh, 200, 2) && within(lg, 200, 2)) label = '200x200';
    else label = `${w}x${h}`;
  }
  const bt = (item.bindingType || '').toLowerCase();
  let binding: BindingType | undefined;
  if (bt.includes('압축') || bt.includes('compressed')) binding = 'compressed';
  else if (bt.includes('타카') || bt.includes('tack') || bt.includes('핀')) binding = 'tack';
  else if (bt.includes('무선') || bt.includes('perfect') || bt.includes('화보')) binding = 'perfect';
  else if (bt) binding = 'flat';

  return { productSize: label, bindingType: binding, pageCount: item.pages };
}

export default function PrintQueueTable({
  items,
  selectedIds,
  onSelectionChange,
  isLoading,
  onImposition,
  onOrderClick,
}: PrintQueueTableProps) {
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const batchMut = useMatchImpositionBatch();
  const [matchMap, setMatchMap] = useState<Record<string, MatchResult>>({});

  // 아이템 리스트 변할 때마다 매칭 재조회 (병렬)
  const inputsKey = useMemo(
    () => items.map((it) => `${it.id}:${it.size}:${it.bindingType}:${it.pages}`).join('|'),
    [items],
  );

  useEffect(() => {
    if (items.length === 0) {
      setMatchMap({});
      return;
    }
    const inputs = items.map(toMatchInput);
    batchMut.mutate(inputs, {
      onSuccess: (results) => {
        const next: Record<string, MatchResult> = {};
        items.forEach((it, idx) => {
          next[it.id] = results[idx];
        });
        setMatchMap(next);
      },
      onError: () => setMatchMap({}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputsKey]);

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map((item) => item.id));
    }
  };

  const toggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-[14px] text-black font-normal">
        로딩 중...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[14px] text-black font-normal">
        출력대기 항목이 없습니다.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            </TableHead>
            <TableHead className="text-center text-[14px] text-gray-600 font-bold">주문번호</TableHead>
            <TableHead className="text-center text-[14px] text-gray-600 font-bold">스튜디오<br/>영업담당자</TableHead>
            <TableHead className="text-[14px] text-gray-600 font-bold">상품/폴더</TableHead>
            <TableHead className="text-center text-[14px] text-gray-600 font-bold">규격<br/>Nup</TableHead>
            <TableHead className="text-center text-[14px] text-gray-600 font-bold">편집스타일<br/>제본순서</TableHead>
            <TableHead className="text-center text-[14px] text-gray-600 font-bold">Page<br/>부수</TableHead>
            <TableHead className="text-center text-[14px] text-gray-600 font-bold">용지</TableHead>
            <TableHead className="text-center text-[14px] text-gray-600 font-bold">제본</TableHead>
            <TableHead className="text-center text-[14px] text-gray-600 font-bold">진행상황</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const match = matchMap[item.id];
            const matched = match?.matched && match.preset;
            return (
              <TableRow
                key={item.id}
                className={selectedIds.includes(item.id) ? 'bg-blue-50' : ''}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                  />
                </TableCell>
                <TableCell className="text-center text-[14px] text-black font-normal whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onOrderClick?.(item.orderId)}
                    className="font-medium text-blue-600 hover:underline cursor-pointer"
                  >
                    {item.orderNumber}
                  </button>
                </TableCell>
                <TableCell className="text-[14px] text-black font-normal whitespace-nowrap">
                  <div className="text-center">{item.studioName}</div>
                  {item.salesRep && (
                    <div className="text-[9pt] text-black text-center">{item.salesRep}</div>
                  )}
                </TableCell>
                <TableCell className="text-[14px] text-black font-normal">
                  {item.folderName || item.productName || '-'}
                </TableCell>
                <TableCell className="text-center text-[14px] text-black font-normal">
                  <div>{item.size?.replace(/인치$/,'') || '-'}</div>
                  <div className="text-[9pt] text-black">{item.nup || <span className="text-red-600">미설정</span>}</div>
                </TableCell>
                <TableCell className="text-center text-[14px] text-black font-normal">
                  <div>{item.pageLayout === 'spread' ? '펼침면' : item.pageLayout === 'single' ? '낱장' : '-'}</div>
                  <div className="text-[9pt] text-black">
                    {(() => {
                      const labels: Record<string, string> = {
                        LEFT_START_RIGHT_END: '좌시우끝',
                        LEFT_START_LEFT_END: '좌시좌끝',
                        RIGHT_START_LEFT_END: '우시좌끝',
                        RIGHT_START_RIGHT_END: '우시우끝',
                      };
                      return item.bindingDirection ? (labels[item.bindingDirection] || item.bindingDirection) : '';
                    })()}
                  </div>
                </TableCell>
                <TableCell className="text-center text-[14px] text-black font-normal">
                  <div>{item.pages ?? '-'}p</div>
                  <div className={(item.quantity ?? 1) > 1 ? 'text-[14px] font-bold text-black' : 'text-[12px] text-black'}>{item.quantity ?? 1}부</div>
                </TableCell>
                <TableCell className="text-center text-[14px] text-black font-normal whitespace-nowrap">
                  {item.paper || <span className="text-red-600">미설정</span>}
                </TableCell>
                <TableCell
                  className="text-center text-[14px] text-black font-normal whitespace-nowrap"
                >
                  <div>
                    {item.bindingType
                      ? item.bindingType
                          .replace(/^인디고/, '')
                          .replace(/\s*\(.*\)$/, '')
                          .replace(/_/g, ' ')
                          .trim() || item.bindingType
                      : <span className="text-red-600">미설정</span>}
                  </div>
                  <div className="text-[9pt] text-black text-center">
                    {item.printSide === 'double' ? '양면' : item.printSide === 'single' ? '단면' : ''}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {(() => {
                    const status = item.pdfStatus || 'pending';
                    const isInkjet = (item.printMethod || '').toLowerCase().includes('inkjet');
                    const indigoMap: Record<string, { label: string; className: string }> = {
                      pending: { label: 'PDF변환대기', className: 'text-black' },
                      in_progress: { label: '변환중', className: 'text-black' },
                      completed: { label: '성공', className: 'text-black' },
                      failed: { label: '변환에러', className: 'text-black' },
                    };
                    const inkjetMap: Record<string, { label: string; className: string }> = {
                      pending: { label: '데이타대기', className: 'text-black' },
                      in_progress: { label: '생성중', className: 'text-black' },
                      completed: { label: '출력데이타생성', className: 'text-black' },
                      failed: { label: '데이터에러', className: 'text-black' },
                    };
                    const map = isInkjet ? inkjetMap : indigoMap;
                    const s = map[status] || map.pending;
                    const showImposition = status === 'pending' || status === 'failed';
                    // PDF변환성공 + hasPdf=true 인 경우 배지를 새 탭 링크로 감싼다.
                    // inline 스트림이라 PDF 뷰어로 바로 열림 (다운로드 강제 X).
                    const canOpenPdf = status === 'completed' && (item as any).hasPdf;
                    const pdfUrl = `${API_URL}/print-pdf/items/${item.id}/pdf`;
                    const badge = (
                      <Badge variant="ghost" className={`text-[13px] font-normal px-2 py-0.5 border-0 shadow-none ${s.className}${canOpenPdf ? ' cursor-pointer hover:underline' : ''}`}>
                        {s.label}
                      </Badge>
                    );
                    return (
                      <div className="flex flex-col items-center gap-0.5">
                        {canOpenPdf ? (
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="새 탭에서 PDF 열기"
                          >
                            {badge}
                          </a>
                        ) : (
                          badge
                        )}
                        {showImposition && !match && (
                          <span className="text-[10px] text-black">임포지션 확인중...</span>
                        )}
                        {showImposition && match && !matched && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-red-600 font-normal bg-amber-50 border-amber-300 cursor-pointer px-1.5 py-0"
                            onClick={() => onImposition?.(item)}
                            title="클릭하여 임포지션 수동 설정"
                          >
                            임포지션 수동 필요
                          </Badge>
                        )}
                        {status === 'failed' && (item as any).pdfError && (
                          <span className="text-[10px] text-red-600 max-w-[120px] truncate" title={(item as any).pdfError}>
                            {(item as any).pdfError}
                          </span>
                        )}
                        {item.warnings && item.warnings.length > 0 && (
                          <span
                            className="text-[10px] text-red-600 max-w-[140px] truncate cursor-help"
                            title={item.warnings.join('\n')}
                          >
                            {item.warnings.length}건 누락
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

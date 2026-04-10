'use client';

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

interface PrintQueueTableProps {
  items: PrintQueueItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isLoading?: boolean;
}

export default function PrintQueueTable({
  items,
  selectedIds,
  onSelectionChange,
  isLoading,
}: PrintQueueTableProps) {
  const allSelected = items.length > 0 && selectedIds.length === items.length;

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
      <div className="flex items-center justify-center h-40 text-[14px] text-gray-400">
        로딩 중...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[14px] text-gray-400">
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
            <TableHead className="w-12">긴급</TableHead>
            <TableHead>주문번호</TableHead>
            <TableHead>스튜디오</TableHead>
            <TableHead>상품/폴더</TableHead>
            <TableHead>규격</TableHead>
            <TableHead className="text-center">파일수</TableHead>
            <TableHead>용지</TableHead>
            <TableHead>제본</TableHead>
            <TableHead className="text-center">Nup</TableHead>
            <TableHead className="text-center">진행상황</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
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
              <TableCell>
                {item.isUrgent && (
                  <Badge variant="destructive" className="text-[11px] px-1.5 py-0">
                    긴급
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-[14px] text-black font-normal">
                {item.orderNumber}
              </TableCell>
              <TableCell className="text-[14px] text-black font-normal">
                {item.studioName}
              </TableCell>
              <TableCell className="text-[14px] text-black font-normal">
                {item.folderName || item.productName || '-'}
              </TableCell>
              <TableCell className="text-[14px] text-black font-normal">
                {item.size?.replace(/인치$/,'') || '-'}
              </TableCell>
              <TableCell className="text-center text-[14px] text-black font-normal">
                {item.fileCount}
              </TableCell>
              <TableCell className="text-[14px] text-black font-normal">
                {item.paper || '-'}
              </TableCell>
              <TableCell className="text-[14px] text-black font-normal">
                {item.bindingType || '-'}
              </TableCell>
              <TableCell className="text-center text-[14px] text-black font-normal">
                {item.nup || '-'}
              </TableCell>
              <TableCell className="text-center">
                {(() => {
                  const status = item.pdfStatus || 'pending';
                  const map: Record<string, { label: string; className: string }> = {
                    pending: { label: '대기', className: 'bg-gray-100 text-gray-700' },
                    in_progress: { label: '변환중', className: 'bg-blue-100 text-blue-700' },
                    completed: { label: '성공', className: 'bg-green-100 text-green-700' },
                    failed: { label: '실패', className: 'bg-red-100 text-red-700' },
                  };
                  const s = map[status] || map.pending;
                  return (
                    <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${s.className}`}>
                      {s.label}
                    </Badge>
                  );
                })()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

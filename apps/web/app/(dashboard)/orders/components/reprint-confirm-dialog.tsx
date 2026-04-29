'use client';

/**
 * ReprintConfirmDialog
 * 출력완료 이후 상태(printed/ready_for_shipping/reprint_*)에서 사양/페이지 변경이 감지될 때
 * 부모 다이얼로그에서 인터셉트하여 본 다이얼로그를 띄운다.
 *
 * 본 다이얼로그에서 사용자는:
 *  - 변경할 페이지 썸네일을 확인하고
 *  - 페이지별(또는 항목별) 사유를 입력하고
 *  - 추정 추가비용을 확인한 후
 *  - "재출력 요청" 버튼으로 POST /orders/:id/reprint 호출
 *
 * 추가비용은 Client.pendingAdjustmentAmount 음수 누적으로 다음 주문에 자동 차감됨.
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, ImageIcon, Printer } from 'lucide-react';
import { OrderItem, useRequestReprint } from '@/hooks/use-orders';
import { toast } from '@/hooks/use-toast';
import { normalizeImageUrl } from '@/lib/utils';

export interface ReprintChangedItemInput {
  itemId: string;
  pages: number[];
  reason?: string;
}

interface ReprintConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  items: OrderItem[];
  changedItems: ReprintChangedItemInput[];
  /**
   * 재출력 요청이 성공한 후 호출됨. 부모는 보통 OrderQuickEditDialog 닫고
   * 함께 진행해야 하는 사양 편집(useEditOrderWithAudit)도 이 콜백 안에서 호출한다.
   */
  onConfirm: () => void;
}

export function ReprintConfirmDialog({
  open,
  onOpenChange,
  orderId,
  items,
  changedItems,
  onConfirm,
}: ReprintConfirmDialogProps) {
  const requestReprint = useRequestReprint();
  // itemId → reason 입력 state
  const [reasons, setReasons] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    changedItems.forEach((c) => {
      initial[c.itemId] = c.reason ?? '';
    });
    return initial;
  });

  // 추정 추가비용: sum(item.unitPrice / item.pages × changedPagesCount)
  const estimatedCost = useMemo(() => {
    return changedItems.reduce((sum, ci) => {
      const item = items.find((i) => i.id === ci.itemId);
      if (!item || !item.pages || item.pages <= 0) return sum;
      const perPage = Number(item.unitPrice) / item.pages;
      return sum + Math.round(perPage * ci.pages.length);
    }, 0);
  }, [items, changedItems]);

  const totalChangedPages = useMemo(
    () => changedItems.reduce((sum, c) => sum + c.pages.length, 0),
    [changedItems],
  );

  const allReasonsFilled = changedItems.every(
    (c) => (reasons[c.itemId] ?? '').trim().length > 0,
  );

  const handleConfirm = async () => {
    if (!allReasonsFilled) {
      toast({
        title: '재출력 사유를 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await requestReprint.mutateAsync({
        id: orderId,
        data: {
          items: changedItems.map((c) => ({
            itemId: c.itemId,
            pages: c.pages,
            reason: reasons[c.itemId] ?? '',
          })),
          notifyOperator: true,
          settlementMode: 'append_pending',
        },
      });
      toast({
        title: '재출력 요청이 생성되었습니다.',
        description: `추가비용 ₩${estimatedCost.toLocaleString()}원이 다음 주문에 청구됩니다.`,
      });
      onOpenChange(false);
      onConfirm();
    } catch (err) {
      const message = err instanceof Error ? err.message : '재출력 요청 실패';
      toast({
        title: '재출력 요청에 실패했습니다.',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[18px] text-black font-bold flex items-center gap-2">
            <Printer className="h-5 w-5" />
            재출력 작업 생성
          </DialogTitle>
          <DialogDescription className="text-[14px] text-black font-normal">
            출력 완료된 주문의 사양/페이지가 변경되었습니다. 재출력 작업을
            생성하면 추가비용이 <strong>다음 주문에 자동 청구</strong>됩니다.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-[14px] text-black font-normal">
            변경 페이지 <strong>{totalChangedPages}장</strong> · 추정 추가비용{' '}
            <strong>₩{estimatedCost.toLocaleString()}</strong>
          </AlertDescription>
        </Alert>

        <div className="space-y-4 mt-2">
          {changedItems.map((ci) => {
            const item = items.find((i) => i.id === ci.itemId);
            if (!item) return null;
            // 페이지번호 → 파일 매핑 (sortOrder + 1)
            const pageFiles = ci.pages.map((pageNum) => {
              const file = item.files?.find((f) => f.sortOrder + 1 === pageNum);
              return { pageNum, file };
            });

            return (
              <div
                key={ci.itemId}
                className="border rounded-lg p-4 space-y-3 bg-white"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[14px] text-black font-bold truncate">
                      {item.folderName || item.productName}
                    </span>
                    <Badge variant="secondary" className="shrink-0">
                      {ci.pages.length}p 변경
                    </Badge>
                  </div>
                  <span className="text-[12px] text-gray-500 shrink-0">
                    단가 ₩{Number(item.unitPrice).toLocaleString()} / {item.pages}p
                  </span>
                </div>

                {/* 변경 페이지 썸네일 grid */}
                <div className="grid grid-cols-6 gap-2">
                  {pageFiles.map(({ pageNum, file }) => (
                    <div
                      key={pageNum}
                      className="relative border rounded-md overflow-hidden bg-gray-100 aspect-[3/4]"
                      title={`p${pageNum}`}
                    >
                      {file?.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={normalizeImageUrl(file.thumbnailUrl) || file.thumbnailUrl}
                          alt={`p${pageNum}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                      <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-medium flex items-center justify-center">
                        {pageNum}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 사유 입력 */}
                <div className="space-y-1">
                  <label className="text-[14px] text-black font-bold">
                    재출력 사유 <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={reasons[ci.itemId] ?? ''}
                    onChange={(e) =>
                      setReasons((prev) => ({
                        ...prev,
                        [ci.itemId]: e.target.value,
                      }))
                    }
                    placeholder="예: 색상 보정 후 재인쇄, 파일 누락, 사양 변경 등"
                    rows={2}
                    className="text-[14px] text-black font-normal resize-none"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={requestReprint.isPending}
          >
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={requestReprint.isPending || !allReasonsFilled}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {requestReprint.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-1" />
            )}
            재출력 요청 (₩{estimatedCost.toLocaleString()} 청구)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useOrderHistory, ORDER_STATUS_LABELS } from '@/hooks/use-orders';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Clock, User, ArrowRight, Loader2 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending_receipt: 'bg-orange-100 text-orange-700',
  receipt_completed: 'bg-blue-100 text-blue-700',
  in_production: 'bg-purple-100 text-purple-700',
  ready_for_shipping: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const PROCESS_TYPE_LABELS: Record<string, string> = {
  order_created: '주문 생성',
  status_change: '상태 변경',
  order_cancelled: '주문 취소',
  delivery_completed: '배송 완료',
  admin_adjustment: '금액 조정',
  bulk_status_change: '일괄 상태 변경',
  bulk_order_cancelled: '일괄 취소',
  bulk_amount_reset: '금액 초기화',
  bulk_receipt_date_change: '접수일 변경',
  order_duplicated: '주문 복제',
};

interface ProcessHistoryDialogProps {
  orderId: string | null;
  orderNumber?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProcessHistoryDialog({
  orderId,
  orderNumber,
  open,
  onOpenChange,
}: ProcessHistoryDialogProps) {
  const { data: history, isLoading, isError, error } = useOrderHistory(open ? orderId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">
            공정 진행 이력 {orderNumber && <span className="text-muted-foreground font-normal">({orderNumber})</span>}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive text-center py-8">
            이력 조회 실패: {error?.message || '서버 오류'}
          </p>
        ) : !history?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">이력이 없습니다</p>
        ) : (
          <div className="relative">
            {/* 타임라인 세로 선 */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

            <div className="space-y-4">
              {history.map((entry, idx) => (
                <div key={entry.id} className="relative pl-10">
                  {/* 타임라인 점 */}
                  <div className={cn(
                    'absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-background',
                    idx === 0 ? 'bg-primary' : 'bg-muted-foreground/30',
                  )} />

                  <div className="space-y-1">
                    {/* 시간 */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(entry.processedAt), 'yyyy-MM-dd HH:mm:ss', { locale: ko })}
                    </div>

                    {/* 상태 변경 */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {entry.fromStatus && (
                        <>
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', STATUS_COLORS[entry.fromStatus])}>
                            {ORDER_STATUS_LABELS[entry.fromStatus] || entry.fromStatus}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </>
                      )}
                      <Badge className={cn('text-[10px] px-1.5 py-0', STATUS_COLORS[entry.toStatus])}>
                        {ORDER_STATUS_LABELS[entry.toStatus] || entry.toStatus}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        ({PROCESS_TYPE_LABELS[entry.processType] || entry.processType})
                      </span>
                    </div>

                    {/* 담당자 */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{entry.processedByName || '-'}</span>
                    </div>

                    {/* 메모 */}
                    {entry.note && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                        {entry.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

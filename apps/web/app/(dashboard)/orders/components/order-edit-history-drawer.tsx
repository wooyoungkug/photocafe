'use client';

/**
 * OrderEditHistoryDrawer
 * 주문 편집 이력을 우측 슬라이드(Sheet)로 표시.
 * GET /orders/:id/edit-history?limit=20&cursor=<id>
 *  - editor (이름)
 *  - 변경 시각 (formatDistanceToNow + ko)
 *  - message
 *  - changedFields → field/before/after Badge
 *  - reprintJob (있으면) — 재출력 작업 ID 표시
 */

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useOrderEditHistory, OrderEditHistoryChange } from '@/hooks/use-orders';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { History, Loader2, Printer, Bell, User2 } from 'lucide-react';

interface OrderEditHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
}

export function OrderEditHistoryDrawer({
  open,
  onOpenChange,
  orderId,
}: OrderEditHistoryDrawerProps) {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOrderEditHistory(orderId, { limit: 20 });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-[18px] text-black font-bold flex items-center gap-2">
            <History className="h-5 w-5" />
            편집 이력
          </SheetTitle>
          <SheetDescription className="text-[14px] text-black font-normal">
            주문에 대한 편집·재출력·담당자 변경 이력을 시간 순으로 표시합니다.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {isLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </>
          )}

          {!isLoading && items.length === 0 && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <History className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-[14px] text-black font-normal text-gray-500">
                이력이 없습니다
              </p>
            </div>
          )}

          {items.map((entry) => (
            <article
              key={entry.id}
              className="border rounded-lg p-3 bg-white space-y-2"
            >
              <header className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <User2 className="h-4 w-4 text-gray-500 shrink-0" />
                  <span className="text-[14px] text-black font-bold truncate">
                    {entry.editor?.name ?? '시스템'}
                  </span>
                </div>
                <time
                  className="text-[12px] text-gray-500 shrink-0"
                  dateTime={entry.createdAt}
                  title={new Date(entry.createdAt).toLocaleString('ko-KR')}
                >
                  {formatDistanceToNow(new Date(entry.createdAt), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </time>
              </header>

              {entry.message && (
                <p className="text-[14px] text-black font-normal bg-gray-50 rounded px-2 py-1.5 whitespace-pre-wrap break-words">
                  {entry.message}
                </p>
              )}

              {entry.notifyOperator && (
                <div className="flex items-center gap-1 text-[12px] text-blue-600">
                  <Bell className="h-3 w-3" />
                  담당자 알림 발송됨
                </div>
              )}

              {Array.isArray(entry.changedFields) && entry.changedFields.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    {entry.changedFields.map((change, idx) => (
                      <ChangeRow key={idx} change={change} />
                    ))}
                  </div>
                </>
              )}

              {entry.reprintJobId && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-[14px] text-amber-700 bg-amber-50 rounded px-2 py-1.5">
                    <Printer className="h-4 w-4" />
                    <span className="font-bold">재출력 작업</span>
                    <span className="font-mono text-[12px]">
                      #{entry.reprintJobId.slice(0, 8)}
                    </span>
                    {entry.reprintJob?.totalAdditionalCost ? (
                      <span className="ml-auto">
                        ₩{Number(entry.reprintJob.totalAdditionalCost).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                </>
              )}
            </article>
          ))}

          {hasNextPage && (
            <Button
              type="button"
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full"
            >
              {isFetchingNextPage ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : null}
              더 보기
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function ChangeRow({ change }: { change: OrderEditHistoryChange }) {
  const before = formatValue(change.before);
  const after = formatValue(change.after);
  return (
    <div className="text-[12px] flex items-start gap-2 flex-wrap">
      <span className="text-black font-bold shrink-0">{change.field}:</span>
      <Badge
        variant="outline"
        className="text-[11px] line-through text-gray-500 max-w-[140px] truncate"
        title={before}
      >
        {before}
      </Badge>
      <span className="text-gray-400">→</span>
      <Badge
        variant="outline"
        className="text-[11px] text-blue-700 border-blue-300 max-w-[140px] truncate"
        title={after}
      >
        {after}
      </Badge>
    </div>
  );
}

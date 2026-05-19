'use client';

import { useState } from 'react';
import { MoreHorizontal, Download, CheckCircle2, RotateCcw, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  type PrintRoomQueueItem,
  type PrintRoomStatus,
  PRINT_ROOM_STATUSES,
  useUpdateStatusMutation,
  useRetryMutation,
} from '@/hooks/use-print-room';

interface PrintRoomCardProps {
  item: PrintRoomQueueItem;
  onOpenDetail: (orderItemId: string) => void;
}

function formatRelativeTime(iso: string | null, fmt: (key: string, opts?: Record<string, unknown>) => string): string {
  if (!iso) return fmt('justNow');
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return fmt('justNow');
  const min = Math.floor(sec / 60);
  if (min < 60) return fmt('minutesAgo', { minutes: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return fmt('hoursAgo', { hours: hr });
  const day = Math.floor(hr / 24);
  return fmt('daysAgo', { days: day });
}

export function PrintRoomCard({ item, onOpenDetail }: PrintRoomCardProps) {
  const t = useTranslations('printRoom');
  const tTime = useTranslations('printRoom.time');
  const updateStatus = useUpdateStatusMutation();
  const retry = useRetryMutation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const nupColor =
    item.printMethod === 'indigo'
      ? 'bg-purple-100 text-purple-700 border-purple-200'
      : item.printMethod === 'inkjet'
        ? 'bg-teal-100 text-teal-700 border-teal-200'
        : 'bg-gray-100 text-gray-700 border-gray-200';

  const isFailed = item.impositionStatus === 'failed';
  const isInProgress = item.printRoomStatus === 'imposing' || item.printRoomStatus === 'printing';

  function handleStatusChange(next: PrintRoomStatus) {
    updateStatus.mutate(
      { orderItemId: item.orderItemId, status: next },
      {
        onSuccess: () => toast.success(t('toast.statusUpdated')),
        onError: (err) => toast.error(err.message || t('toast.statusUpdateFailed')),
      },
    );
  }

  function handleDeliver() {
    // Phase 8 핫폴더 에이전트 연동 자리표시자
    toast.info(t('toast.agentTodo'));
  }

  function handleComplete() {
    handleStatusChange('done');
  }

  function handleRetry() {
    retry.mutate(item.orderItemId, {
      onSuccess: () => toast.success(t('toast.retryQueued')),
      onError: (err) => toast.error(err.message || t('toast.retryFailed')),
    });
  }

  return (
    <Card className="border bg-white hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2">
        {/* Row 1: 주문번호 + 스튜디오명 + 메뉴 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[14px] text-black font-bold truncate">
              {item.orderNumber}
            </span>
            <span className="text-[14px] text-black font-normal truncate">
              {item.studioName || '-'}
            </span>
          </div>
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label={t('action.menu')}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onOpenDetail(item.orderItemId)}>
                {t('action.viewDetail')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[14px] text-black font-normal">
                {t('action.changeStatus')}
              </DropdownMenuLabel>
              {PRINT_ROOM_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s}
                  disabled={s === item.printRoomStatus}
                  onClick={() => handleStatusChange(s)}
                >
                  {t(`columns.${s}`)}
                  {s === item.printRoomStatus && ' ✓'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Row 2: 규격 + NUP */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] text-black font-normal">
            {item.sizeCode || '-'}
          </span>
          {item.nup != null && (
            <Badge variant="outline" className={`${nupColor} text-[14px] font-normal`}>
              {item.nup}-up
            </Badge>
          )}
          {item.printMethod && (
            <Badge variant="outline" className={`${nupColor} text-[14px] font-normal`}>
              {item.printMethod === 'indigo' ? t('printMethod.indigo') : item.printMethod === 'inkjet' ? t('printMethod.inkjet') : item.printMethod}
            </Badge>
          )}
        </div>

        {/* Row 3: 페이지 × 부수 */}
        <div className="text-[14px] text-black font-normal">
          {t('card.pagesQuantity', { pages: item.pages, quantity: item.quantity })}
        </div>

        {/* Row 4: 현재 상태 + 진행 인디케이터 */}
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-black font-normal">
            {t(`columns.${item.printRoomStatus}`)}
          </span>
          {isInProgress && (
            <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />
          )}
          {isFailed && (
            <Badge className="bg-red-100 text-red-700 text-[14px] font-normal">
              {t('card.failed')}
            </Badge>
          )}
        </div>

        {/* Row 5: 마지막 다운로드 */}
        <div className="text-[14px] text-black font-normal pt-1 border-t">
          {item.lastDownloadedAt ? (
            <span>
              {t('card.lastDownload', {
                by: item.lastDownloadedBy ?? '-',
                when: formatRelativeTime(item.lastDownloadedAt, (k, o) => tTime(k as any, o as any)),
              })}
            </span>
          ) : (
            <span>{t('card.noDownload')}</span>
          )}
          {item.downloadCount > 0 && (
            <span className="ml-2">
              {t('card.downloadCount', { count: item.downloadCount })}
            </span>
          )}
        </div>

        {/* 상태별 액션 버튼 */}
        <div className="flex flex-wrap gap-2 pt-1">
          {item.printRoomStatus === 'imposed' && (
            <Button
              size="sm"
              variant="default"
              className="h-8 text-[14px] font-normal"
              onClick={handleDeliver}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              {t('action.deliver')}
            </Button>
          )}
          {item.printRoomStatus === 'printing' && (
            <Button
              size="sm"
              variant="default"
              className="h-8 text-[14px] font-normal bg-emerald-600 hover:bg-emerald-700"
              onClick={handleComplete}
              disabled={updateStatus.isPending}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {t('action.complete')}
            </Button>
          )}
          {isFailed && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[14px] font-normal border-red-300 text-red-700"
              onClick={handleRetry}
              disabled={retry.isPending}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              {t('action.retry')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

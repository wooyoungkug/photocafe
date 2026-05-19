'use client';

import { useTranslations } from 'next-intl';
import { ColumnHeader } from './ColumnHeader';
import { PrintRoomCard } from './PrintRoomCard';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type PrintRoomQueue,
  type PrintRoomStatus,
  PRINT_ROOM_STATUSES,
} from '@/hooks/use-print-room';

interface PrintRoomKanbanProps {
  data?: PrintRoomQueue;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onOpenDetail: (orderItemId: string) => void;
}

export function PrintRoomKanban({
  data,
  isLoading,
  isError,
  errorMessage,
  onOpenDetail,
}: PrintRoomKanbanProps) {
  const t = useTranslations('printRoom');

  return (
    <div className="flex-1 min-w-0 flex gap-3 overflow-x-auto pb-2">
      {PRINT_ROOM_STATUSES.map((status: PrintRoomStatus) => {
        const items = data?.[status] ?? [];
        return (
          <div
            key={status}
            className="flex flex-col min-w-[280px] w-[280px] bg-gray-50 rounded-md border"
          >
            <ColumnHeader title={t(`columns.${status}`)} count={items.length} />
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {isLoading && (
                <>
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </>
              )}
              {isError && (
                <div className="text-[14px] text-red-600 font-normal p-2">
                  {errorMessage ?? t('error.loadFailed')}
                </div>
              )}
              {!isLoading && !isError && items.length === 0 && (
                <div className="text-[14px] text-black font-normal p-2 opacity-60">
                  {t('empty')}
                </div>
              )}
              {!isLoading &&
                items.map((item) => (
                  <PrintRoomCard
                    key={item.orderItemId}
                    item={item}
                    onOpenDetail={onOpenDetail}
                  />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

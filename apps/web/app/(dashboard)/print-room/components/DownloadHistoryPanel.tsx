'use client';

import { useTranslations } from 'next-intl';
import { Clock, User, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDownloadLogsQuery } from '@/hooks/use-print-room';

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

export function DownloadHistoryPanel() {
  const t = useTranslations('printRoom');
  const { data, isLoading, isError } = useDownloadLogsQuery({
    page: 1,
    pageSize: 10,
  });

  return (
    <aside className="w-[380px] shrink-0 hidden xl:flex flex-col border-l bg-white">
      <div className="px-4 py-3 border-b">
        <h2 className="text-[18px] text-black font-bold">
          {t('history.title')}
        </h2>
        <p className="text-[14px] text-black font-normal opacity-70">
          {t('history.subtitle')}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        )}
        {isError && (
          <div className="text-[14px] text-red-600 font-normal">
            {t('error.loadFailed')}
          </div>
        )}
        {!isLoading && !isError && (data?.data?.length ?? 0) === 0 && (
          <div className="text-[14px] text-black font-normal opacity-60 p-2">
            {t('history.empty')}
          </div>
        )}
        {data?.data?.map((row) => (
          <Card key={row.id} className="border">
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center gap-1 text-[14px] text-black font-normal">
                <Clock className="h-3.5 w-3.5" />
                <span>{fmtTime(row.downloadedAt)}</span>
              </div>
              <div className="flex items-center gap-1 text-[14px] text-black font-normal">
                <User className="h-3.5 w-3.5" />
                <span>{row.staffName ?? '-'}</span>
              </div>
              <div className="flex items-center gap-1 text-[14px] text-black font-normal">
                <Hash className="h-3.5 w-3.5" />
                <span className="font-bold">
                  {row.orderItem?.order?.orderNumber ?? '-'}
                </span>
                {row.orderItem?.order?.client?.clientName && (
                  <span className="opacity-70 ml-1">
                    · {row.orderItem.order.client.clientName}
                  </span>
                )}
              </div>
              <div className="text-[14px] text-black font-normal opacity-70">
                {t('history.fileCount', { count: row.fileCount })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </aside>
  );
}

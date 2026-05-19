'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PrintRoomKanban } from './components/PrintRoomKanban';
import {
  PrintRoomFilters,
  type PrintMethodFilter,
} from './components/PrintRoomFilters';
import { DownloadHistoryPanel } from './components/DownloadHistoryPanel';
import {
  useItemDetail,
  useQueueQuery,
} from '@/hooks/use-print-room';

export default function PrintRoomPage() {
  const t = useTranslations('printRoom');
  const [date, setDate] = useState<Date>(new Date());
  const [printMethod, setPrintMethod] = useState<PrintMethodFilter>('all');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [detailId, setDetailId] = useState<string | null>(null);

  const dateStr = useMemo(() => format(date, 'yyyy-MM-dd'), [date]);

  const queueQuery = useQueueQuery({
    date: dateStr,
    printMethod: printMethod === 'all' ? undefined : printMethod,
    autoRefresh,
  });

  const detailQuery = useItemDetail(detailId);

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-[600px] bg-white">
      {/* 좌측 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0 p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[24px] text-black font-normal">{t('title')}</h1>
          <span className="text-[14px] text-black font-normal opacity-70">
            {t('subtitle')}
          </span>
        </div>

        <PrintRoomFilters
          date={date}
          onDateChange={setDate}
          printMethod={printMethod}
          onPrintMethodChange={setPrintMethod}
          autoRefresh={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
          onRefresh={() => queueQuery.refetch()}
          isFetching={queueQuery.isFetching}
        />

        <PrintRoomKanban
          data={queueQuery.data}
          isLoading={queueQuery.isLoading}
          isError={queueQuery.isError}
          errorMessage={(queueQuery.error as Error | null)?.message}
          onOpenDetail={(id) => setDetailId(id)}
        />
      </div>

      {/* 우측 다운로드 이력 패널 (xl 이상 표시) */}
      <DownloadHistoryPanel />

      {/* 카드 상세 모달 */}
      <Dialog
        open={!!detailId}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">
              {t('detail.title')}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-black font-normal">
              {detailQuery.data?.order?.orderNumber ?? ''}
            </DialogDescription>
          </DialogHeader>
          {detailQuery.isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          )}
          {detailQuery.isError && (
            <div className="text-[14px] text-red-600 font-normal">
              {(detailQuery.error as Error | null)?.message ??
                t('error.loadFailed')}
            </div>
          )}
          {detailQuery.data && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <DetailRow
                  label={t('detail.studio')}
                  value={detailQuery.data.order?.client?.clientName ?? '-'}
                />
                <DetailRow
                  label={t('detail.size')}
                  value={detailQuery.data.size ?? '-'}
                />
                <DetailRow
                  label={t('detail.pages')}
                  value={String(detailQuery.data.pages)}
                />
                <DetailRow
                  label={t('detail.quantity')}
                  value={String(detailQuery.data.quantity)}
                />
                <DetailRow
                  label={t('detail.printMethod')}
                  value={detailQuery.data.printMethod ?? '-'}
                />
                <DetailRow
                  label={t('detail.status')}
                  value={
                    detailQuery.data.printRoomStatus
                      ? t(`columns.${detailQuery.data.printRoomStatus}`)
                      : '-'
                  }
                />
              </div>

              <div>
                <div className="text-[18px] text-black font-bold mb-2">
                  {t('detail.files')}
                </div>
                <div className="text-[14px] text-black font-normal">
                  {t('detail.fileCount', {
                    count: detailQuery.data.files?.length ?? 0,
                  })}
                </div>
              </div>

              {(detailQuery.data.printRoomJobs?.length ?? 0) > 0 && (
                <div>
                  <div className="text-[18px] text-black font-bold mb-2">
                    {t('detail.recentJobs')}
                  </div>
                  <ul className="space-y-1">
                    {detailQuery.data.printRoomJobs!.map((j) => (
                      <li
                        key={j.id}
                        className="text-[14px] text-black font-normal flex items-center gap-2"
                      >
                        <Badge
                          variant="outline"
                          className="text-[14px] font-normal"
                        >
                          {j.status ?? '-'}
                        </Badge>
                        <span>{new Date(j.createdAt).toLocaleString()}</span>
                        {j.preset?.gridCols && j.preset?.gridRows && (
                          <span className="opacity-70">
                            {j.preset.gridCols * j.preset.gridRows}-up
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(detailQuery.data.printDownloadLogs?.length ?? 0) > 0 && (
                <div>
                  <div className="text-[18px] text-black font-bold mb-2">
                    {t('detail.recentDownloads')}
                  </div>
                  <ul className="space-y-1">
                    {detailQuery.data.printDownloadLogs!.map((l) => (
                      <li
                        key={l.id}
                        className="text-[14px] text-black font-normal"
                      >
                        {new Date(l.downloadedAt).toLocaleString()} ·{' '}
                        {l.staffName ?? '-'} ·{' '}
                        {t('detail.fileCount', { count: l.fileCount })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[14px] text-black font-normal opacity-70">
        {label}
      </div>
      <div className="text-[14px] text-black font-normal">{value}</div>
    </div>
  );
}

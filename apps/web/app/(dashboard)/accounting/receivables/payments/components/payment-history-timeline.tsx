'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PAYMENT_METHOD_LABELS } from './payment-form-schema';

interface PaymentHistoryEntry {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  amount: number;
  paymentMethod: string;
  bankName?: string;
  depositorName?: string;
  note?: string;
}

interface PaymentHistoryTimelineProps {
  entries: PaymentHistoryEntry[];
  isLoading: boolean;
  maxItems?: number;
}

const METHOD_COLORS: Record<string, string> = {
  bank_transfer: 'bg-blue-100 text-blue-700',
  cash: 'bg-green-100 text-green-700',
  card: 'bg-purple-100 text-purple-700',
  check: 'bg-amber-100 text-amber-700',
};

export function PaymentHistoryTimeline({
  entries,
  isLoading,
  maxItems = 10,
}: PaymentHistoryTimelineProps) {
  const displayEntries = entries.slice(0, maxItems);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">최근 입금 이력</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-2 w-2 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : displayEntries.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            입금 이력이 없습니다.
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-200" />

            <div className="space-y-3">
              {displayEntries.map((entry, index) => {
                const methodColor =
                  METHOD_COLORS[entry.paymentMethod] || 'bg-slate-100 text-slate-700';
                const methodLabel =
                  PAYMENT_METHOD_LABELS[entry.paymentMethod] ||
                  entry.paymentMethod;

                return (
                  <div key={entry.id} className="flex items-start gap-3 relative">
                    {/* Timeline dot */}
                    <div
                      className={`h-[10px] w-[10px] rounded-full mt-1.5 flex-shrink-0 z-10 ${
                        index === 0 ? 'bg-primary ring-2 ring-primary/20' : 'bg-slate-300'
                      }`}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">
                          {format(new Date(entry.receiptDate), 'MM/dd')}
                        </span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${methodColor}`}>
                          {methodLabel}
                        </Badge>
                        {entry.bankName && (
                          <span className="text-[10px] text-muted-foreground">
                            {entry.bankName}
                          </span>
                        )}
                      </div>
                      {(entry.depositorName || entry.note) && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {entry.depositorName && `${entry.depositorName}`}
                          {entry.depositorName && entry.note && ' | '}
                          {entry.note}
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="font-medium text-sm text-green-600 flex-shrink-0">
                      +{Number(entry.amount).toLocaleString()}원
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {entries.length > maxItems && (
          <div className="mt-3 pt-3 border-t text-center">
            <span className="text-xs text-muted-foreground">
              외 {entries.length - maxItems}건 더 있음
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { SalesLedger } from '@/lib/types/sales-ledger';

interface LedgerAllocationListProps {
  ledgers: SalesLedger[] | undefined;
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  /** 입금액이 변경될 때 자동으로 FIFO 배분 */
  paymentAmount?: number;
}

export function LedgerAllocationList({
  ledgers,
  isLoading,
  selectedIds,
  onSelectionChange,
  paymentAmount,
}: LedgerAllocationListProps) {
  // 미수 잔액이 있는 건만 필터링하고 날짜순 정렬 (FIFO)
  const unpaidLedgers = useMemo(() => {
    if (!ledgers) return [];
    return ledgers
      .filter(
        (l) =>
          Number(l.outstandingAmount) > 0 &&
          l.salesStatus !== 'CANCELLED'
      )
      .sort(
        (a, b) =>
          new Date(a.ledgerDate).getTime() - new Date(b.ledgerDate).getTime()
      );
  }, [ledgers]);

  // paymentAmount 변경 시 FIFO 자동 배분
  useEffect(() => {
    if (paymentAmount === undefined || paymentAmount <= 0) return;
    if (unpaidLedgers.length === 0) return;

    let remaining = paymentAmount;
    const autoSelected: string[] = [];

    for (const ledger of unpaidLedgers) {
      if (remaining <= 0) break;
      autoSelected.push(ledger.id);
      remaining -= Number(ledger.outstandingAmount);
    }

    // 선택이 변경된 경우에만 업데이트
    const currentSet = new Set(selectedIds);
    const newSet = new Set(autoSelected);
    const isDifferent =
      currentSet.size !== newSet.size ||
      autoSelected.some((id) => !currentSet.has(id));

    if (isDifferent) {
      onSelectionChange(autoSelected);
    }
  }, [paymentAmount, unpaidLedgers]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = (ledgerId: string) => {
    if (selectedIds.includes(ledgerId)) {
      onSelectionChange(selectedIds.filter((id) => id !== ledgerId));
    } else {
      onSelectionChange([...selectedIds, ledgerId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === unpaidLedgers.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(unpaidLedgers.map((l) => l.id));
    }
  };

  const selectedTotal = unpaidLedgers
    .filter((l) => selectedIds.includes(l.id))
    .reduce((sum, l) => sum + Number(l.outstandingAmount), 0);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (unpaidLedgers.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        미수 매출 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={
              unpaidLedgers.length > 0 &&
              selectedIds.length === unpaidLedgers.length
            }
            onCheckedChange={handleSelectAll}
            aria-label="전체 선택"
          />
          <label
            htmlFor="select-all"
            className="text-xs font-medium text-muted-foreground cursor-pointer"
          >
            전체 선택 ({unpaidLedgers.length}건)
          </label>
        </div>
        {selectedIds.length > 0 && (
          <span className="text-xs font-medium text-orange-600">
            선택 미수금: {selectedTotal.toLocaleString()}원
          </span>
        )}
      </div>

      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {unpaidLedgers.map((ledger) => {
          const isSelected = selectedIds.includes(ledger.id);
          const outstanding = Number(ledger.outstandingAmount);
          const statusBadge =
            ledger.paymentStatus === 'overdue' ? (
              <Badge className="bg-red-100 text-red-700 text-[10px] px-1 py-0">
                연체
              </Badge>
            ) : ledger.paymentStatus === 'partial' ? (
              <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1 py-0">
                부분
              </Badge>
            ) : null;

          return (
            <div
              key={ledger.id}
              className={`flex items-center gap-2 p-2 rounded-md border text-sm transition-colors ${
                isSelected
                  ? 'bg-primary/5 border-primary/30'
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <Checkbox
                id={`ledger-${ledger.id}`}
                checked={isSelected}
                onCheckedChange={() => handleToggle(ledger.id)}
                aria-label={`${ledger.ledgerNumber} 선택`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-muted-foreground truncate">
                    {ledger.ledgerNumber}
                  </span>
                  {statusBadge}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(ledger.ledgerDate), 'MM/dd')}
                  {ledger.orderNumber && ` | ${ledger.orderNumber}`}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-medium text-orange-600 text-sm">
                  {outstanding.toLocaleString()}원
                </div>
                <div className="text-[10px] text-muted-foreground">
                  / {Number(ledger.totalAmount).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

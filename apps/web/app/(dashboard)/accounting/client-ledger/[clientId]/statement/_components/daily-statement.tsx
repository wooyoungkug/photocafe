'use client';

import { useState, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LedgerTransaction {
  ledgerNumber: string;
  date: string;
  orderNumber?: string;
  productName?: string;
  description: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
}

interface DailyStatementProps {
  carryForward?: { netBalance: number };
  transactions: LedgerTransaction[];
  totals?: { totalDebit: number; totalCredit: number; closingBalance: number };
  startDate: string;
  endDate: string;
}

const typeLabels: Record<string, string> = {
  sales: '매출',
  receipt: '입금',
  purchase: '매입',
  payment: '지급',
};

interface DailyGroup {
  date: string;
  transactions: LedgerTransaction[];
  debitSum: number;
  creditSum: number;
  lastBalance: number;
  typeCounts: Record<string, { count: number; amount: number }>;
}

export function DailyStatement({
  carryForward,
  transactions,
  totals,
  startDate,
  endDate,
}: DailyStatementProps) {
  // 현재 보고 있는 월 (기본: startDate의 월)
  const [currentMonth, setCurrentMonth] = useState(() => {
    return startDate ? startOfMonth(new Date(startDate)) : startOfMonth(new Date());
  });

  const rangeStart = startDate ? new Date(startDate) : new Date();
  const rangeEnd = endDate ? new Date(endDate) : new Date();

  // 전체 기간에서 사용 가능한 월 목록
  const availableMonths = useMemo(() => {
    const months: Date[] = [];
    let cursor = startOfMonth(rangeStart);
    const last = startOfMonth(rangeEnd);
    while (cursor <= last) {
      months.push(new Date(cursor));
      cursor = addMonths(cursor, 1);
    }
    return months;
  }, [startDate, endDate]);

  // 현재 월의 인덱스
  const currentMonthIdx = availableMonths.findIndex((m) =>
    isSameMonth(m, currentMonth),
  );
  const canGoPrev = currentMonthIdx > 0;
  const canGoNext = currentMonthIdx < availableMonths.length - 1;

  // 현재 월에 해당하는 거래만 필터
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= monthStart && d <= monthEnd;
    });
  }, [transactions, currentMonth]);

  // 현재 월 이전의 마지막 잔액 계산 (해당 월의 전기이월)
  const monthCarryForward = useMemo(() => {
    const priorTransactions = transactions.filter(
      (t) => new Date(t.date) < monthStart,
    );
    if (priorTransactions.length === 0) {
      return carryForward?.netBalance || 0;
    }
    return priorTransactions[priorTransactions.length - 1].balance;
  }, [transactions, currentMonth, carryForward]);

  // 일별 그룹핑
  const dailyGroups: DailyGroup[] = useMemo(() => {
    const dateMap = new Map<string, LedgerTransaction[]>();

    monthTransactions.forEach((t) => {
      const dateStr = format(new Date(t.date), 'yyyy-MM-dd');
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, []);
      }
      dateMap.get(dateStr)!.push(t);
    });

    const groups: DailyGroup[] = [];

    dateMap.forEach((txns, date) => {
      let debitSum = 0;
      let creditSum = 0;
      let lastBalance = 0;
      const typeCounts: Record<string, { count: number; amount: number }> = {};

      txns.forEach((t) => {
        debitSum += t.debit;
        creditSum += t.credit;
        lastBalance = t.balance;

        if (!typeCounts[t.type]) {
          typeCounts[t.type] = { count: 0, amount: 0 };
        }
        typeCounts[t.type].count++;
        typeCounts[t.type].amount += t.type === 'sales' || t.type === 'payment' ? t.debit : t.credit;
      });

      groups.push({ date, transactions: txns, debitSum, creditSum, lastBalance, typeCounts });
    });

    groups.sort((a, b) => a.date.localeCompare(b.date));
    return groups;
  }, [monthTransactions]);

  // 월 합계
  const monthTotals = useMemo(() => {
    const totalDebit = monthTransactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = monthTransactions.reduce((sum, t) => sum + t.credit, 0);
    const closingBalance = monthTransactions.length > 0
      ? monthTransactions[monthTransactions.length - 1].balance
      : monthCarryForward;
    return { totalDebit, totalCredit, closingBalance };
  }, [monthTransactions, monthCarryForward]);

  const handlePrevMonth = () => {
    if (canGoPrev) setCurrentMonth(availableMonths[currentMonthIdx - 1]);
  };

  const handleNextMonth = () => {
    if (canGoNext) setCurrentMonth(availableMonths[currentMonthIdx + 1]);
  };

  return (
    <div className="mb-6">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-center gap-4 mb-4 no-print">
        <button
          onClick={handlePrevMonth}
          disabled={!canGoPrev}
          className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {availableMonths.map((m, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentMonth(m)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                isSameMonth(m, currentMonth)
                  ? 'bg-gray-800 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {format(m, 'M월')}
            </button>
          ))}
        </div>
        <button
          onClick={handleNextMonth}
          disabled={!canGoNext}
          className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* 인쇄용 월 표시 */}
      <div className="hidden print:block text-center text-lg font-bold mb-3">
        {format(currentMonth, 'yyyy년 MM월', { locale: ko })}
      </div>

      {/* 일별 거래내역 테이블 */}
      <table className="w-full text-sm border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-center w-24">일자</th>
            <th className="border border-gray-300 px-3 py-2 text-center w-16">건수</th>
            <th className="border border-gray-300 px-3 py-2 text-left">거래 내용</th>
            <th className="border border-gray-300 px-3 py-2 text-right w-28">매출</th>
            <th className="border border-gray-300 px-3 py-2 text-right w-28">입금</th>
            <th className="border border-gray-300 px-3 py-2 text-right w-28">잔액</th>
          </tr>
        </thead>
        <tbody>
          {/* 전기이월 / 전월이월 */}
          <tr className="bg-amber-50">
            <td colSpan={3} className="border border-gray-300 px-3 py-2">
              {currentMonthIdx > 0 ? '전월이월' : '전기이월'}
            </td>
            <td className="border border-gray-300 px-3 py-2 text-right">-</td>
            <td className="border border-gray-300 px-3 py-2 text-right">-</td>
            <td className="border border-gray-300 px-3 py-2 text-right">
              {Math.round(monthCarryForward).toLocaleString()}
            </td>
          </tr>

          {dailyGroups.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="border border-gray-300 px-3 py-8 text-center text-gray-500"
              >
                {format(currentMonth, 'yyyy년 M월', { locale: ko })}의 거래내역이 없습니다.
              </td>
            </tr>
          ) : (
            dailyGroups.map((group) => {
              const day = new Date(group.date).getDate();
              const totalCount = group.transactions.length;

              // 거래 내용 요약
              const descParts: string[] = [];
              Object.entries(group.typeCounts).forEach(([type, info]) => {
                const label = typeLabels[type] || type;
                descParts.push(
                  `${label} ${info.count}건 (${Math.round(info.amount).toLocaleString()}원)`,
                );
              });

              return (
                <tr key={group.date} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {format(new Date(group.date), 'MM/dd (EEE)', { locale: ko })}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {totalCount}건
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {descParts.map((desc, i) => (
                        <span key={i} className="text-gray-700">{desc}</span>
                      ))}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {group.debitSum > 0 ? Math.round(group.debitSum).toLocaleString() : '-'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {group.creditSum > 0 ? Math.round(group.creditSum).toLocaleString() : '-'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                    {Math.round(group.lastBalance).toLocaleString()}
                  </td>
                </tr>
              );
            })
          )}

          {/* 월 합계 */}
          {dailyGroups.length > 0 && (
            <tr className="bg-gray-100 font-bold">
              <td colSpan={2} className="border border-gray-300 px-3 py-2">
                {format(currentMonth, 'M월', { locale: ko })} 합계
              </td>
              <td className="border border-gray-300 px-3 py-2 text-sm">
                거래일수 {dailyGroups.length}일 / {monthTransactions.length}건
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                {Math.round(monthTotals.totalDebit).toLocaleString()}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                {Math.round(monthTotals.totalCredit).toLocaleString()}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                {Math.round(monthTotals.closingBalance).toLocaleString()}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 전체 기간 합계 (기간이 여러 월인 경우) */}
      {availableMonths.length > 1 && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              전체 기간 합계 ({format(rangeStart, 'yyyy.MM.dd')} ~ {format(rangeEnd, 'yyyy.MM.dd')})
            </span>
            <div className="flex gap-6">
              <span>
                매출: <strong>{Math.round(totals?.totalDebit || 0).toLocaleString()}</strong>원
              </span>
              <span>
                입금: <strong>{Math.round(totals?.totalCredit || 0).toLocaleString()}</strong>원
              </span>
              <span>
                기말잔액:{' '}
                <strong className={(totals?.closingBalance || 0) >= 0 ? 'text-red-600' : 'text-blue-600'}>
                  {Math.round(totals?.closingBalance || 0).toLocaleString()}
                </strong>
                원
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

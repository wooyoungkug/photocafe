interface PeriodSummaryItem {
  period: string;
  count: number;
  description?: string;
  debit: number;
  credit: number;
  balance: number;
}

interface MonthlyStatementProps {
  carryForward?: { netBalance: number };
  periodSummary: PeriodSummaryItem[];
  totals?: { totalDebit: number; totalCredit: number; closingBalance: number };
}

// "2025-01" → "2025년 01월"
function formatMonthLabel(period: string): string {
  const parts = period.split('-');
  if (parts.length === 2) {
    return `${parts[0]}년 ${parts[1]}월`;
  }
  return period;
}

export function MonthlyStatement({ carryForward, periodSummary, totals }: MonthlyStatementProps) {
  return (
    <div className="mb-6">
      <table className="w-full text-sm border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-center w-28">기간</th>
            <th className="border border-gray-300 px-3 py-2 text-center w-16">건수</th>
            <th className="border border-gray-300 px-3 py-2 text-left">적요</th>
            <th className="border border-gray-300 px-3 py-2 text-right w-28">매출</th>
            <th className="border border-gray-300 px-3 py-2 text-right w-28">입금</th>
            <th className="border border-gray-300 px-3 py-2 text-right w-28">잔액</th>
          </tr>
        </thead>
        <tbody>
          {/* 전기이월 */}
          <tr className="bg-amber-50">
            <td colSpan={3} className="border border-gray-300 px-3 py-2">
              전기이월
            </td>
            <td className="border border-gray-300 px-3 py-2 text-right">-</td>
            <td className="border border-gray-300 px-3 py-2 text-right">-</td>
            <td className="border border-gray-300 px-3 py-2 text-right">
              {Math.round(carryForward?.netBalance || 0).toLocaleString()}
            </td>
          </tr>

          {!periodSummary.length ? (
            <tr>
              <td
                colSpan={6}
                className="border border-gray-300 px-3 py-8 text-center text-gray-500"
              >
                해당 기간의 거래내역이 없습니다.
              </td>
            </tr>
          ) : (
            periodSummary.map((ps) => (
              <tr key={ps.period}>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  {formatMonthLabel(ps.period)}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  {ps.count}건
                </td>
                <td className="border border-gray-300 px-3 py-2 text-sm">
                  {ps.description || '-'}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {ps.debit > 0 ? Math.round(ps.debit).toLocaleString() : '-'}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {ps.credit > 0 ? Math.round(ps.credit).toLocaleString() : '-'}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {Math.round(ps.balance).toLocaleString()}
                </td>
              </tr>
            ))
          )}

          {/* 합계 */}
          {periodSummary.length > 0 && (
            <tr className="bg-gray-100 font-bold">
              <td colSpan={3} className="border border-gray-300 px-3 py-2">
                합 계
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                {Math.round(totals?.totalDebit || 0).toLocaleString()}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                {Math.round(totals?.totalCredit || 0).toLocaleString()}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                {Math.round(totals?.closingBalance || 0).toLocaleString()}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

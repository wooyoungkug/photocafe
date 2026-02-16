import { format } from 'date-fns';

const typeLabels: Record<string, string> = {
  sales: '매출',
  receipt: '입금',
  purchase: '매입',
  payment: '지급',
};

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

interface DetailStatementProps {
  carryForward?: { netBalance: number };
  transactions: LedgerTransaction[];
  totals?: { totalDebit: number; totalCredit: number; closingBalance: number };
}

export function DetailStatement({ carryForward, transactions, totals }: DetailStatementProps) {
  return (
    <div className="mb-6">
      <table className="w-full text-sm border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-center w-24">일자</th>
            <th className="border border-gray-300 px-3 py-2 text-center w-28">주문번호</th>
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

          {/* 거래내역 */}
          {!transactions.length ? (
            <tr>
              <td
                colSpan={6}
                className="border border-gray-300 px-3 py-8 text-center text-gray-500"
              >
                해당 기간의 거래내역이 없습니다.
              </td>
            </tr>
          ) : (
            transactions.map((t, idx) => (
              <tr key={`${t.ledgerNumber}-${idx}`}>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  {format(new Date(t.date), 'yyyy-MM-dd')}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  {t.orderNumber || '-'}
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  {t.productName && `${t.productName} - `}
                  {t.description}
                  <span className="ml-2 text-xs text-gray-500">
                    [{typeLabels[t.type] || t.type}]
                  </span>
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {t.debit > 0 ? Math.round(t.debit).toLocaleString() : ''}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {t.credit > 0 ? Math.round(t.credit).toLocaleString() : ''}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {Math.round(t.balance).toLocaleString()}
                </td>
              </tr>
            ))
          )}

          {/* 합계 */}
          {transactions.length > 0 && (
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

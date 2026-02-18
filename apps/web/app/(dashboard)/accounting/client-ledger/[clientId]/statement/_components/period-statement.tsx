import { useMemo } from 'react';

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

interface PeriodStatementProps {
  carryForward?: { netBalance: number; salesBalance: number; purchaseBalance: number };
  transactions: LedgerTransaction[];
  totals?: { totalDebit: number; totalCredit: number; closingBalance: number };
  startDate: string;
  endDate: string;
}

export function PeriodStatement({
  carryForward,
  transactions,
  totals,
  startDate,
  endDate,
}: PeriodStatementProps) {
  // 유형별 집계 (프론트 계산)
  const typeSummary = useMemo(() => {
    const summary = {
      sales: { count: 0, amount: 0 },
      receipt: { count: 0, amount: 0 },
      purchase: { count: 0, amount: 0 },
      payment: { count: 0, amount: 0 },
    };
    for (const t of transactions) {
      const type = t.type as keyof typeof summary;
      if (summary[type]) {
        summary[type].count++;
        summary[type].amount += type === 'sales' || type === 'payment' ? t.debit : t.credit;
      }
    }
    return summary;
  }, [transactions]);

  const rows = [
    { label: '전기이월 잔액', value: carryForward?.netBalance || 0 },
    {
      label: '기간 매출 합계',
      value: typeSummary.sales.amount,
      sub: `${typeSummary.sales.count}건`,
    },
    {
      label: '기간 입금 합계',
      value: typeSummary.receipt.amount,
      sub: `${typeSummary.receipt.count}건`,
      negative: true,
    },
    ...(typeSummary.purchase.count > 0
      ? [
          {
            label: '기간 매입 합계',
            value: typeSummary.purchase.amount,
            sub: `${typeSummary.purchase.count}건`,
          },
        ]
      : []),
    ...(typeSummary.payment.count > 0
      ? [
          {
            label: '기간 지급 합계',
            value: typeSummary.payment.amount,
            sub: `${typeSummary.payment.count}건`,
            negative: true,
          },
        ]
      : []),
  ];

  return (
    <div className="mb-6">
      {/* 기간 요약 박스 */}
      <div className="border-2 border-gray-800 mb-6">
        <div className="bg-gray-800 text-white px-4 py-2 text-sm font-medium">
          거래기간: {startDate} ~ {endDate}
        </div>
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-200">
                <td className="px-6 py-3 text-gray-700 w-48">{row.label}</td>
                <td className="px-4 py-3 text-right text-xs text-gray-500 w-20">
                  {row.sub || ''}
                </td>
                <td className="px-6 py-3 text-right font-medium w-40">
                  {row.negative ? '-' : ''}
                  {Math.round(row.value).toLocaleString()}원
                </td>
              </tr>
            ))}
            {/* 구분선 + 기말 잔액 */}
            <tr className="bg-gray-50 border-t-2 border-gray-800">
              <td className="px-6 py-4 font-bold text-base">기말 미수금 잔액</td>
              <td></td>
              <td className="px-6 py-4 text-right font-bold text-base text-red-600">
                {Math.round(totals?.closingBalance || 0).toLocaleString()}원
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 안내 문구 */}
      <div className="text-sm text-gray-600 leading-relaxed">
        <p>상기 금액은 당사 장부 기준이며, 차이가 있을 경우 연락 부탁드립니다.</p>
        <p>입금 확인까지 영업일 기준 1~2일 소요될 수 있습니다.</p>
      </div>
    </div>
  );
}

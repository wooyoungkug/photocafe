'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClientLedgerDetail } from '@/hooks/use-client-ledger';

const typeLabels: Record<string, string> = {
  sales: '매출',
  receipt: '수금',
  purchase: '매입',
  payment: '지급',
};

export default function ClientLedgerStatementPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const periodType = searchParams.get('periodType') || 'daily';

  const { data, isLoading } = useClientLedgerDetail(clientId, {
    startDate,
    endDate,
    periodType,
  });

  const client = data?.client;
  const carryForward = data?.carryForward;
  const transactions = data?.transactions || [];
  const totals = data?.totals;

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 인쇄 제외 버튼 영역 */}
      <div className="no-print bg-white border-b sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          인쇄하기
        </Button>
      </div>

      {/* A4 용지 영역 */}
      <div className="print-page p-8 max-w-[210mm] mx-auto">
        {/* 문서 제목 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">거 래 내 역 서</h1>
          <p className="text-sm text-gray-600">
            기간: {startDate} ~ {endDate}
          </p>
        </div>

        {/* 거래처 정보 */}
        <div className="mb-6 border border-gray-300">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="bg-gray-100 px-4 py-2 font-medium w-32 border-r border-gray-300">
                  거래처명
                </td>
                <td className="px-4 py-2">{client?.clientName}</td>
                <td className="bg-gray-100 px-4 py-2 font-medium w-32 border-l border-gray-300">
                  거래처코드
                </td>
                <td className="px-4 py-2">{client?.clientCode}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="bg-gray-100 px-4 py-2 font-medium border-r border-gray-300">
                  대표자
                </td>
                <td className="px-4 py-2">{client?.representative || '-'}</td>
                <td className="bg-gray-100 px-4 py-2 font-medium border-l border-gray-300">
                  사업자번호
                </td>
                <td className="px-4 py-2">{client?.businessNumber || '-'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="bg-gray-100 px-4 py-2 font-medium border-r border-gray-300">
                  업태
                </td>
                <td className="px-4 py-2">{client?.businessType || '-'}</td>
                <td className="bg-gray-100 px-4 py-2 font-medium border-l border-gray-300">
                  업종
                </td>
                <td className="px-4 py-2">{client?.businessCategory || '-'}</td>
              </tr>
              <tr>
                <td className="bg-gray-100 px-4 py-2 font-medium border-r border-gray-300">
                  주소
                </td>
                <td className="px-4 py-2" colSpan={3}>
                  {client?.address || '-'} {client?.addressDetail || ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 거래내역 테이블 */}
        <div className="mb-6">
          <table className="w-full text-sm border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-center w-24">
                  일자
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center w-28">
                  주문번호
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left">
                  적요
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right w-28">
                  차변(입금)
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right w-28">
                  대변(출금)
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right w-28">
                  잔액
                </th>
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

        {/* 하단 정보 */}
        <div className="flex justify-between items-end mt-12">
          <div className="text-sm text-gray-600">
            <p>발행일: {format(new Date(), 'yyyy년 MM월 dd일')}</p>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-800 w-48 pt-2">
              <p className="text-sm font-medium">귀하</p>
            </div>
          </div>
        </div>

        {/* 회사 정보 (하단) */}
        <div className="mt-16 text-center border-t pt-4">
          <p className="text-lg font-bold mb-1">포토미 주식회사</p>
          <p className="text-xs text-gray-600">
            대표이사: 우성우 | 사업자등록번호: 123-45-67890
          </p>
          <p className="text-xs text-gray-600">
            주소: 서울시 강남구 테헤란로 123 | 전화: 02-1234-5678
          </p>
        </div>
      </div>

      {/* 인쇄용 CSS */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }

          .print-page {
            max-width: 100%;
            padding: 20mm;
          }

          @page {
            size: A4;
            margin: 0;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}

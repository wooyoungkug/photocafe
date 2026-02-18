'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useClientLedgerDetail } from '@/hooks/use-client-ledger';
import { useSystemSettings, settingsToMap } from '@/hooks/use-system-settings';
import { PrintToolbar } from './_components/print-toolbar';
import { StatementHeader } from './_components/statement-header';
import { ClientInfoTable } from './_components/client-info-table';
import { CompanyFooter } from './_components/company-footer';
import { DetailStatement } from './_components/detail-statement';
import { DailyStatement } from './_components/daily-statement';
import { MonthlyStatement } from './_components/monthly-statement';
import { PeriodStatement } from './_components/period-statement';

export type StatementType = 'detail' | 'daily' | 'monthly' | 'period';

const STATEMENT_TITLES: Record<StatementType, string> = {
  detail: '세부 거래내역서',
  daily: '일별 거래내역서',
  monthly: '월별 거래내역서',
  period: '기간별 거래내역서',
};

export default function ClientLedgerStatementPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const statementType = (searchParams.get('statementType') || 'detail') as StatementType;

  // 월별거래내역서는 periodType=monthly로 API 호출
  const periodType = statementType === 'monthly' ? 'monthly' : 'daily';

  const { data, isLoading } = useClientLedgerDetail(clientId, {
    startDate,
    endDate,
    periodType,
  });

  // 시스템 설정 (회사 정보)
  const { data: settings } = useSystemSettings('company');
  const companySettings = settings ? settingsToMap(settings) : {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const title = STATEMENT_TITLES[statementType] || '거래내역서';

  return (
    <div className="min-h-screen bg-white">
      <PrintToolbar
        onBack={() => router.back()}
        clientId={clientId}
        clientName={data?.client?.clientName}
        clientEmail={data?.client?.email || ''}
        statementType={statementType}
        startDate={startDate}
        endDate={endDate}
        closingBalance={data?.totals?.closingBalance}
      />

      <div className="print-page p-8 max-w-[210mm] mx-auto">
        <StatementHeader title={title} startDate={startDate} endDate={endDate} />
        <ClientInfoTable client={data?.client} />

        {/* 유형별 본문 */}
        {statementType === 'detail' && (
          <DetailStatement
            carryForward={data?.carryForward}
            transactions={data?.transactions || []}
            totals={data?.totals}
          />
        )}
        {statementType === 'daily' && (
          <DailyStatement
            carryForward={data?.carryForward}
            transactions={data?.transactions || []}
            totals={data?.totals}
            startDate={startDate}
            endDate={endDate}
          />
        )}
        {statementType === 'monthly' && (
          <MonthlyStatement
            carryForward={data?.carryForward}
            periodSummary={data?.periodSummary || []}
            totals={data?.totals}
          />
        )}
        {statementType === 'period' && (
          <PeriodStatement
            carryForward={data?.carryForward}
            transactions={data?.transactions || []}
            totals={data?.totals}
            startDate={startDate}
            endDate={endDate}
          />
        )}

        <CompanyFooter companySettings={companySettings} clientName={data?.client?.clientName} />
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

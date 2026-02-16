import { format } from 'date-fns';

interface CompanyFooterProps {
  companySettings: Record<string, string>;
  clientName?: string;
}

export function CompanyFooter({ companySettings, clientName }: CompanyFooterProps) {
  return (
    <>
      {/* 하단 정보 */}
      <div className="flex justify-between items-end mt-12">
        <div className="text-sm text-gray-600">
          <p>발행일: {format(new Date(), 'yyyy년 MM월 dd일')}</p>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-800 w-48 pt-2">
            <p className="text-sm font-medium">{clientName || '귀하'}</p>
          </div>
        </div>
      </div>

      {/* 회사 정보 (하단) */}
      <div className="mt-16 text-center border-t pt-4">
        <p className="text-lg font-bold mb-1">
          {companySettings.company_name || '회사명'}
        </p>
        <p className="text-xs text-gray-600">
          대표이사: {companySettings.company_ceo || '-'} | 사업자등록번호:{' '}
          {companySettings.company_business_number || '-'}
        </p>
        <p className="text-xs text-gray-600">
          주소:{' '}
          {companySettings.company_address
            ? `${companySettings.company_address} ${companySettings.company_address_detail || ''}`.trim()
            : '-'}{' '}
          | 전화: {companySettings.company_phone || '-'}
        </p>
      </div>
    </>
  );
}

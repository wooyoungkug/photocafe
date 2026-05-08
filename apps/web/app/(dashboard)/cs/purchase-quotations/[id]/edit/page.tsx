'use client';

import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PurchaseQuotationForm } from '@/components/purchase-quotation/purchase-quotation-form';
import { usePurchaseQuotation } from '@/hooks/use-purchase-quotation';

export default function EditPurchaseQuotationPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, isLoading, isError } = usePurchaseQuotation(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-[14px] text-black font-normal">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        불러오는 중...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-[14px] text-black font-normal">
        매입처 견적을 찾을 수 없습니다.
      </div>
    );
  }

  return <PurchaseQuotationForm mode="edit" initial={data} />;
}

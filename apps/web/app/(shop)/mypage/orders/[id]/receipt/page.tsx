'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useSystemSettings, settingsToMap } from '@/hooks/use-system-settings';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  orderedAt: string;
  productPrice: number;
  shippingFee: number;
  tax: number;
  totalAmount: number;
  finalAmount: number;
  client: {
    clientName: string;
    clientCode: string;
    businessNumber?: string;
    representative?: string;
    phone?: string;
    address?: string;
    addressDetail?: string;
    businessType?: string;
    businessCategory?: string;
  };
  items: {
    id: string;
    productionNumber: string;
    productName: string;
    size: string;
    pages: number;
    printMethod: string;
    paper: string;
    bindingType: string;
    coverMaterial?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}

export default function OrderReceiptPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const { isAuthenticated } = useAuthStore();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await api.get(`/orders/${orderId}`);
      return (response as any).data ?? response as OrderDetail;
    },
    enabled: isAuthenticated && !!orderId,
  });

  const { data: settings } = useSystemSettings('company');
  const companyMap = settings ? settingsToMap(settings) : {};

  const companyName = companyMap.company_name || '포토카페';
  const companyCeo = companyMap.company_ceo || '';
  const companyBizNum = companyMap.company_business_number || '';
  const companyAddress = [companyMap.company_address, companyMap.company_address_detail].filter(Boolean).join(' ');
  const companyBizType = companyMap.company_business_type || '';
  const companyBizCategory = companyMap.company_business_category || '';
  const companyPhone = companyMap.company_phone || '';

  if (isLoading || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  const orderDate = new Date(order.orderedAt);
  const productPrice = Number(order.productPrice) || 0;
  const tax = Number(order.tax) || 0;
  const shippingFee = Number(order.shippingFee) || 0;
  const finalAmount = Number(order.finalAmount) || 0;

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-area, #receipt-area * { visibility: visible; }
          #receipt-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { margin: 10mm; size: A4; }
        }
      `}</style>

      {/* 인쇄 버튼 */}
      <div className="no-print flex justify-center gap-3 py-4 bg-gray-100">
        <button
          onClick={() => window.print()}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
        >
          인쇄하기
        </button>
        <button
          onClick={() => window.close()}
          className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm font-medium"
        >
          닫기
        </button>
      </div>

      {/* 거래명세표 본문 */}
      <div id="receipt-area" className="max-w-[720px] mx-auto bg-white p-8 font-['Malgun Gothic',sans-serif]">

        {/* 제목 */}
        <h1 className="text-center text-3xl font-bold tracking-[0.5em] text-green-700 mb-6">
          거 래 명 세 표
        </h1>

        {/* 공급받는자 / 공급자 정보 */}
        <div className="flex gap-0 border-2 border-black mb-4">
          {/* 좌측 - 공급받는자 (고객) */}
          <div className="flex-1 border-r-2 border-black">
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr>
                  <td className="border border-gray-400 bg-gray-100 text-center font-bold px-2 py-1.5 w-[80px]">고 객 명</td>
                  <td className="border border-gray-400 px-2 py-1.5">
                    {order.client?.clientName} ({order.client?.clientCode})
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-400 bg-gray-100 text-center font-bold px-2 py-1.5">접수번호</td>
                  <td className="border border-gray-400 px-2 py-1.5">
                    {order.orderNumber} ({format(orderDate, 'yyyy.MM.dd')})
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-400 bg-gray-100 text-center font-bold px-2 py-1.5">접수시간</td>
                  <td className="border border-gray-400 px-2 py-1.5">
                    {format(orderDate, 'yyyy-MM-dd HH:mm:ss')}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-400 bg-gray-100 text-center font-bold px-2 py-1.5">접수담당자</td>
                  <td className="border border-gray-400 px-2 py-1.5">
                    {order.client?.representative || '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 우측 - 공급자 (회사) */}
          <div className="flex-1">
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr>
                  <td className="border border-gray-400 bg-gray-100 text-center font-bold px-2 py-1.5 w-[70px]">등록번호</td>
                  <td className="border border-gray-400 px-2 py-1.5 font-bold text-blue-700" colSpan={2}>
                    {companyBizNum}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-400 bg-gray-100 text-center font-bold px-2 py-1.5">상 호</td>
                  <td className="border border-gray-400 px-2 py-1.5">{companyName}</td>
                  <td className="border border-gray-400 bg-gray-100 text-center font-bold px-1 py-1.5 w-[60px]">대 표</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 bg-gray-100 text-center font-bold px-2 py-1.5">주 소</td>
                  <td className="border border-gray-400 px-2 py-1.5 text-xs" colSpan={2}>
                    {companyAddress}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-400 bg-gray-100 text-center font-bold px-2 py-1.5">업 태</td>
                  <td className="border border-gray-400 px-2 py-1.5">{companyBizType}</td>
                  <td className="border border-gray-400 bg-gray-100 text-center font-bold px-1 py-1.5">종 목</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 총금액 */}
        <div className="border-2 border-black mb-4 flex items-center">
          <div className="bg-green-50 border-r-2 border-black px-4 py-2">
            <span className="text-lg font-bold tracking-[0.3em]">총 금 액</span>
          </div>
          <div className="px-4 py-2 flex-1 flex items-center justify-between">
            <span className="text-2xl font-bold">
              {finalAmount.toLocaleString()} 원
            </span>
            <span className="text-sm text-gray-600">
              합계 : {productPrice.toLocaleString()}원 + 부가세 {tax.toLocaleString()}원 + 배송비(VAT 포함) {shippingFee.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* 주문 내역 테이블 */}
        <table className="w-full text-sm border-collapse border-2 border-black mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-2 text-center w-[120px]">주문번호</th>
              <th className="border border-gray-400 px-2 py-2 text-center">재질/도수</th>
              <th className="border border-gray-400 px-2 py-2 text-center w-[110px]">수량/건</th>
              <th className="border border-gray-400 px-2 py-2 text-center w-[100px]">금액</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item) => (
              <tr key={item.id}>
                <td className="border border-gray-400 px-2 py-2 text-center text-xs font-medium">
                  {item.productionNumber}
                </td>
                <td className="border border-gray-400 px-2 py-2">
                  <div className="font-medium">[{item.bindingType}] {item.paper}</div>
                  <div className="text-xs text-gray-600">
                    전면:{item.printMethod.includes('4') ? '4도' : item.printMethod} / {item.size} / {item.pages}p
                    {item.coverMaterial && ` / ${item.coverMaterial}`}
                  </div>
                </td>
                <td className="border border-gray-400 px-2 py-2 text-center">
                  {Number(item.quantity).toLocaleString()}매 / {item.quantity}건
                </td>
                <td className="border border-gray-400 px-2 py-2 text-right font-medium">
                  {Number(item.totalPrice).toLocaleString()} 원
                </td>
              </tr>
            ))}
            {/* 빈 행 채우기 (최소 5행) */}
            {Array.from({ length: Math.max(0, 5 - (order.items?.length || 0)) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-gray-400 px-2 py-2">&nbsp;</td>
                <td className="border border-gray-400 px-2 py-2">&nbsp;</td>
                <td className="border border-gray-400 px-2 py-2">&nbsp;</td>
                <td className="border border-gray-400 px-2 py-2">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 날짜 및 영수 안내 */}
        <div className="text-center space-y-2 mb-8">
          <p className="text-lg text-green-700 font-medium">
            {format(orderDate, 'yyyy')} 년 {format(orderDate, 'MM')} 월 {format(orderDate, 'dd')} 일
          </p>
          <p className="text-base">상기 내용을 영수합니다.</p>
        </div>

        {/* 하단 안내사항 */}
        <div className="bg-green-50 border border-green-300 rounded p-3 text-xs text-green-900 space-y-1">
          <p>- 배송비(택배, 화물, 퀵)는 별도입니다.</p>
          <p>- 모든 인쇄물 작업은 작업가이드에 준하여 작업하셔야 하며 이에 부합하지 않은 작업에 대해서는 책임을 지지 않습니다.</p>
          <p>&nbsp;&nbsp;반드시 숙지하시고 접수에 문제가 없으시길 바랍니다. (자세한 내용은 뒷면을 참조하시기 바랍니다.)</p>
        </div>

        {/* 회사 하단 바 */}
        <div className="mt-4 bg-green-700 text-white px-4 py-2 flex items-center justify-between rounded text-sm">
          <span className="font-bold">{companyName}</span>
          <span>{companyPhone}</span>
        </div>
      </div>
    </>
  );
}

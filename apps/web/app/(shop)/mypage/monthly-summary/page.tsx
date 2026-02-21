'use client';

import { useState, Fragment, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Eye,
  FileText,
  Loader2,
  Truck,
  ArrowRightLeft,
  Download,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import {
  useDailyOrderSummary,
  useOrders,
  ORDER_STATUS_LABELS,
  type Order,
  type OrderItem,
} from '@/hooks/use-orders';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

const STATUS_BADGE_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
> = {
  pending_receipt: 'outline',
  receipt_completed: 'default',
  in_production: 'warning',
  ready_for_shipping: 'secondary',
  shipped: 'success',
  cancelled: 'destructive',
};

function formatAmount(amount: number) {
  return Math.round(amount).toLocaleString();
}

/** 상품 규격 문자열 생성 */
function buildSpec(item: OrderItem): string {
  const parts: string[] = [
    item.size,
    item.pages > 0 ? `${item.pages}p` : '',
    item.paper,
    item.bindingType,
    item.printMethod,
    item.coverMaterial || '',
  ].filter((p) => p && p !== '-');
  return parts.join(' · ');
}

export default function MonthlySummaryPage() {
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [printType, setPrintType] = useState<'summary' | 'detail' | null>(null);

  const startDate = startOfMonth(selectedDate);
  const endDate = endOfMonth(selectedDate);

  // 일자별 집계 조회
  const { data: dailyData, isLoading } = useDailyOrderSummary({
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    clientId: user?.clientId,
  });

  // 드릴다운: 클릭한 날짜의 주문 목록 조회
  const { data: detailData, isFetching: isDetailFetching } = useOrders(
    expandedRow
      ? {
          clientId: user?.clientId,
          startDate: expandedRow,
          endDate: expandedRow,
          limit: 100,
        }
      : undefined,
  );

  // 상세 인쇄용: 해당 월 전체 주문 조회
  const { data: allMonthOrders, isLoading: isAllOrdersLoading } = useOrders(
    user?.clientId
      ? {
          clientId: user.clientId,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          limit: 500,
        }
      : undefined,
  );

  // 일자별 주문 그룹 (상세 인쇄용)
  const ordersByDate = useMemo((): [string, Order[]][] => {
    if (!allMonthOrders?.data) return [];
    const groups = new Map<string, Order[]>();
    [...allMonthOrders.data]
      .sort((a, b) => new Date(a.orderedAt).getTime() - new Date(b.orderedAt).getTime())
      .forEach((order) => {
        const date = format(new Date(order.orderedAt), 'yyyy-MM-dd');
        if (!groups.has(date)) groups.set(date, []);
        groups.get(date)!.push(order);
      });
    return Array.from(groups.entries());
  }, [allMonthOrders]);

  // 누계잔액 계산
  const dataWithBalance = useMemo(() => {
    if (!dailyData?.data) return [];
    const carryForward = dailyData.summary?.carryForwardBalance || 0;
    let runningBalance = carryForward;
    return dailyData.data.map((row) => {
      runningBalance = runningBalance + row.orderAmount - row.depositAmount;
      return { ...row, runningBalance };
    });
  }, [dailyData]);

  // 인쇄 후 상태 초기화
  useEffect(() => {
    const handler = () => setPrintType(null);
    window.addEventListener('afterprint', handler);
    return () => window.removeEventListener('afterprint', handler);
  }, []);

  // printType 변경 후 인쇄 실행
  useEffect(() => {
    if (printType) {
      window.print();
    }
  }, [printType]);

  const handlePrevMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1));
    setExpandedRow(null);
  };

  const handleNextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1));
    setExpandedRow(null);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
    setExpandedRow(null);
  };

  const handleRowClick = (date: string) => {
    setExpandedRow(expandedRow === date ? null : date);
  };

  const handlePrintSummary = () => setPrintType('summary');

  const handlePrintDetail = () => {
    if (isAllOrdersLoading) {
      toast({ title: '데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.' });
      return;
    }
    setPrintType('detail');
  };

  const handleExport = () => {
    if (!dataWithBalance.length) {
      toast({ title: '다운로드할 데이터가 없습니다.', variant: 'destructive' });
      return;
    }
    const carryForward = dailyData?.summary?.carryForwardBalance || 0;
    const headers = ['일자', '적요', '주문건수', '주문금액', '납부금액', '잔액'];
    const rows: string[][] = [
      ['', '전월이월', '', '', '', Math.round(carryForward).toString()],
      ...dataWithBalance.map((d) => [
        d.date,
        '일자거래',
        d.orderCount.toString(),
        Math.round(d.orderAmount).toString(),
        Math.round(d.depositAmount).toString(),
        Math.round(d.runningBalance).toString(),
      ]),
    ];
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `월거래원장_${format(selectedDate, 'yyyyMM')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'CSV 파일이 다운로드되었습니다.' });
  };

  const renderShippingStatus = (order: Order) => {
    if (!order.shipping) return <span className="text-gray-400">-</span>;
    if (order.shipping.deliveredAt) return <Badge variant="success">배송완료</Badge>;
    if (order.shipping.shippedAt || order.shipping.trackingNumber) {
      return (
        <div className="flex items-center gap-1">
          <Truck className="h-3 w-3 text-blue-500" />
          <span className="text-blue-600 text-xs">
            {order.shipping.trackingNumber || '배송중'}
          </span>
        </div>
      );
    }
    if (order.status === 'ready_for_shipping')
      return <Badge variant="secondary">배송준비</Badge>;
    return <span className="text-gray-400">-</span>;
  };

  const summary = dailyData?.summary;
  const carryForward = summary?.carryForwardBalance || 0;
  const closingBalance = summary?.closingBalance || 0;

  const printYear = format(selectedDate, 'yyyy');
  const printMonth = format(selectedDate, 'MM');
  const printPeriodStart = format(startDate, 'yyyy년 MM월 dd일', { locale: ko });
  const printPeriodEnd = format(endDate, 'yyyy년 MM월 dd일', { locale: ko });
  const printToday = format(new Date(), 'yyyy년 MM월 dd일', { locale: ko });

  const printRows = [...dataWithBalance];

  // 동적 인쇄 CSS (printType에 따라 해당 영역만 표시)
  const printAreaId =
    printType === 'detail' ? 'monthly-print-detail-area' : 'monthly-print-area';
  const printCss = [
    '@media print {',
    '  body * { visibility: hidden !important; }',
    `  #${printAreaId}, #${printAreaId} * { visibility: visible !important; }`,
    `  #${printAreaId} { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }`,
    '  @page { size: A4 portrait; margin: 15mm; }',
    '}',
  ].join('\n');

  // ===== 공통 헤더 컴포넌트 (약식/상세 공용) =====
  const PrintHeader = ({ title }: { title: string }) => (
    <>
      <div className="text-center mb-1 text-[9pt] text-gray-500">
        포토카페 - 고품질 인쇄 서비스
      </div>
      <h1 className="text-center text-[16pt] font-bold tracking-widest mb-3">{title}</h1>
      <div className="flex justify-between items-end mb-3 text-[10pt]">
        <table className="border-collapse text-[10pt]">
          <tbody>
            <tr>
              <td className="pr-2 font-semibold">거래처</td>
              <td className="border-b border-black px-3 min-w-[160px]">
                {user?.clientName || user?.name || '-'}
              </td>
            </tr>
            <tr>
              <td className="pr-2 font-semibold pt-1">사업자번호</td>
              <td className="border-b border-black px-3 pt-1">
                {(user as any)?.businessNumber || '-'}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="text-right text-[9pt] text-gray-600 space-y-0.5">
          <div>
            기&nbsp;&nbsp;&nbsp;&nbsp;간: {printPeriodStart} ~ {printPeriodEnd}
          </div>
          <div>출력일자: {printToday}</div>
        </div>
      </div>
      {/* 요약 박스 */}
      <table className="w-full border-collapse mb-4 text-[10pt]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 p-2 text-center font-semibold w-1/4">
              이월잔액
            </th>
            <th className="border border-gray-400 p-2 text-center font-semibold w-1/4">
              당월 주문금액
            </th>
            <th className="border border-gray-400 p-2 text-center font-semibold w-1/4">
              당월 납부금액
            </th>
            <th className="border border-gray-400 p-2 text-center font-semibold w-1/4">
              기말잔액
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-400 p-2 text-right tabular-nums">
              {formatAmount(carryForward)}원
            </td>
            <td className="border border-gray-400 p-2 text-right tabular-nums">
              {formatAmount(summary?.totalOrderAmount || 0)}원
            </td>
            <td className="border border-gray-400 p-2 text-right tabular-nums">
              {formatAmount(summary?.totalDepositAmount || 0)}원
            </td>
            <td
              className={`border border-gray-400 p-2 text-right tabular-nums font-bold ${
                closingBalance > 0
                  ? 'text-red-700'
                  : closingBalance < 0
                  ? 'text-blue-700'
                  : ''
              }`}
            >
              {closingBalance < 0 && '-'}
              {formatAmount(Math.abs(closingBalance))}원
              {closingBalance > 0 && <span className="text-[8pt] ml-1">(미납)</span>}
              {closingBalance < 0 && <span className="text-[8pt] ml-1">(선납)</span>}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );

  // ===== 공통 서명/푸터 컴포넌트 =====
  const PrintFooter = () => (
    <>
      <div className="flex justify-end mt-6 gap-8 text-[10pt]">
        <div className="text-center">
          <div className="mb-6 text-gray-600">확&nbsp;&nbsp;&nbsp;&nbsp;인</div>
          <div className="border-b border-black w-32" />
          <div className="text-gray-500 text-[8pt] mt-1">(인)</div>
        </div>
        <div className="text-center">
          <div className="mb-6 text-gray-600">발&nbsp;&nbsp;&nbsp;&nbsp;행</div>
          <div className="border-b border-black w-32" />
          <div className="text-gray-500 text-[8pt] mt-1">포토카페 (인)</div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-300 text-[8pt] text-gray-500 text-center">
        본 거래내역서는 {printYear}년 {printMonth}월 기준으로 발행된 내역입니다.&nbsp;
        문의: 포토카페 고객센터
      </div>
    </>
  );

  return (
    <>
      <style>{printCss}</style>

      {/* ===== 약식 인쇄 영역 ===== */}
      <div
        id="monthly-print-area"
        className="hidden print:block font-sans text-[11pt] text-black bg-white"
      >
        <PrintHeader title="월 별 거 래 내 역" />

        {/* 거래원장 테이블 */}
        <table className="w-full border-collapse text-[10pt]">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-500 p-1.5 text-center font-semibold w-[70px]">
                일자
              </th>
              <th className="border border-gray-500 p-1.5 text-center font-semibold">
                적&nbsp;&nbsp;요
              </th>
              <th className="border border-gray-500 p-1.5 text-center font-semibold w-[110px]">
                차&nbsp;변
                <br />
                <span className="text-[8pt] font-normal">(주문금액)</span>
              </th>
              <th className="border border-gray-500 p-1.5 text-center font-semibold w-[110px]">
                대&nbsp;변
                <br />
                <span className="text-[8pt] font-normal">(납부금액)</span>
              </th>
              <th className="border border-gray-500 p-1.5 text-center font-semibold w-[110px]">
                잔&nbsp;&nbsp;액
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-blue-50">
              <td className="border border-gray-400 p-1.5 text-center text-gray-500">
                {printYear}.{printMonth}.01
              </td>
              <td className="border border-gray-400 p-1.5 text-center font-semibold text-blue-700">
                전월 이월
              </td>
              <td className="border border-gray-400 p-1.5 text-right text-gray-400">-</td>
              <td className="border border-gray-400 p-1.5 text-right text-gray-400">-</td>
              <td
                className={`border border-gray-400 p-1.5 text-right tabular-nums font-semibold ${
                  carryForward > 0
                    ? 'text-red-700'
                    : carryForward < 0
                    ? 'text-blue-700'
                    : ''
                }`}
              >
                {carryForward < 0 && '-'}
                {formatAmount(Math.abs(carryForward))}원
              </td>
            </tr>

            {printRows.map((row) => (
              <tr key={row.date}>
                <td className="border border-gray-400 p-1.5 text-center">
                  {format(new Date(row.date + 'T00:00:00'), 'MM.dd (EEE)', { locale: ko })}
                </td>
                <td className="border border-gray-400 p-1.5 text-center text-gray-600">
                  주문 {row.orderCount}건
                </td>
                <td className="border border-gray-400 p-1.5 text-right tabular-nums">
                  {row.orderAmount > 0 ? formatAmount(row.orderAmount) + '원' : '-'}
                </td>
                <td className="border border-gray-400 p-1.5 text-right tabular-nums">
                  {row.depositAmount > 0 ? formatAmount(row.depositAmount) + '원' : '-'}
                </td>
                <td
                  className={`border border-gray-400 p-1.5 text-right tabular-nums ${
                    row.runningBalance > 0
                      ? 'text-red-700'
                      : row.runningBalance < 0
                      ? 'text-blue-700'
                      : ''
                  }`}
                >
                  {row.runningBalance < 0 && '-'}
                  {formatAmount(Math.abs(row.runningBalance))}원
                </td>
              </tr>
            ))}

            <tr className="bg-gray-100 font-bold">
              <td className="border border-gray-500 p-1.5" />
              <td className="border border-gray-500 p-1.5 text-center">당 월 합 계</td>
              <td className="border border-gray-500 p-1.5 text-right tabular-nums">
                {formatAmount(summary?.totalOrderAmount || 0)}원
              </td>
              <td className="border border-gray-500 p-1.5 text-right tabular-nums">
                {formatAmount(summary?.totalDepositAmount || 0)}원
              </td>
              <td className="border border-gray-500 p-1.5" />
            </tr>

            <tr className="bg-gray-200 font-bold">
              <td className="border border-gray-500 p-1.5" />
              <td className="border border-gray-500 p-1.5 text-center text-primary">
                차 월 이 월
              </td>
              <td className="border border-gray-500 p-1.5" />
              <td className="border border-gray-500 p-1.5" />
              <td
                className={`border border-gray-500 p-1.5 text-right tabular-nums ${
                  closingBalance > 0
                    ? 'text-red-700'
                    : closingBalance < 0
                    ? 'text-blue-700'
                    : ''
                }`}
              >
                {closingBalance < 0 && '-'}
                {formatAmount(Math.abs(closingBalance))}원
              </td>
            </tr>
          </tbody>
        </table>

        <PrintFooter />
      </div>

      {/* ===== 상세 인쇄 영역 ===== */}
      <div
        id="monthly-print-detail-area"
        className="hidden print:block font-sans text-[10pt] text-black bg-white"
      >
        <PrintHeader title="월 별 상 세 거 래 내 역 서" />

        {/* 상세 거래 테이블 */}
        <table className="w-full border-collapse text-[9pt]">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-500 p-1.5 text-center font-semibold w-[105px]">
                주문번호
              </th>
              <th className="border border-gray-500 p-1.5 text-center font-semibold w-[28%]">
                상품명
              </th>
              <th className="border border-gray-500 p-1.5 text-center font-semibold">
                규격
              </th>
              <th className="border border-gray-500 p-1.5 text-center font-semibold w-[36px]">
                수량
              </th>
              <th className="border border-gray-500 p-1.5 text-center font-semibold w-[80px]">
                단가
              </th>
              <th className="border border-gray-500 p-1.5 text-center font-semibold w-[80px]">
                금액
              </th>
            </tr>
          </thead>
          <tbody>
            {/* 전월이월 행 */}
            <tr className="bg-blue-50">
              <td
                colSpan={5}
                className="border border-gray-400 p-1.5 text-right font-semibold text-blue-700"
              >
                전월 이월
              </td>
              <td
                className={`border border-gray-400 p-1.5 text-right tabular-nums font-semibold ${
                  carryForward > 0 ? 'text-red-700' : carryForward < 0 ? 'text-blue-700' : ''
                }`}
              >
                {carryForward < 0 && '-'}
                {formatAmount(Math.abs(carryForward))}원
              </td>
            </tr>

            {ordersByDate.map(([date, orders]) => {
              const dateSubtotal = orders.reduce(
                (sum, o) => sum + Number(o.finalAmount),
                0,
              );
              return (
                <Fragment key={date}>
                  {/* 날짜 그룹 헤더 */}
                  <tr className="bg-gray-100">
                    <td
                      colSpan={6}
                      className="border border-gray-500 p-1.5 font-bold text-[9pt]"
                    >
                      {format(new Date(date + 'T00:00:00'), 'yyyy년 MM월 dd일 (EEE)', {
                        locale: ko,
                      })}
                    </td>
                  </tr>

                  {/* 주문별 품목 */}
                  {orders.map((order) => (
                    <Fragment key={order.id}>
                      {order.items.map((item, iIdx) => (
                        <tr key={item.id}>
                          <td className="border border-gray-400 p-1 text-[8pt] text-gray-600 align-top">
                            {iIdx === 0 ? order.orderNumber : ''}
                          </td>
                          <td className="border border-gray-400 p-1 align-top">
                            {item.productName}
                          </td>
                          <td className="border border-gray-400 p-1 text-[8pt] text-gray-600 align-top">
                            {buildSpec(item)}
                          </td>
                          <td className="border border-gray-400 p-1 text-center tabular-nums align-top">
                            {item.quantity}
                          </td>
                          <td className="border border-gray-400 p-1 text-right tabular-nums align-top">
                            {formatAmount(item.unitPrice)}원
                          </td>
                          <td className="border border-gray-400 p-1 text-right tabular-nums align-top">
                            {formatAmount(item.totalPrice)}원
                          </td>
                        </tr>
                      ))}

                      {/* 배송비 행 (있는 경우) */}
                      {order.shippingFee > 0 && (
                        <tr>
                          <td className="border border-gray-400 p-1 text-[8pt] text-gray-400" />
                          <td className="border border-gray-400 p-1 text-gray-500">
                            배송비
                          </td>
                          <td className="border border-gray-400 p-1 text-[8pt] text-gray-400">
                            -
                          </td>
                          <td className="border border-gray-400 p-1 text-center">1</td>
                          <td className="border border-gray-400 p-1 text-right tabular-nums">
                            {formatAmount(order.shippingFee)}원
                          </td>
                          <td className="border border-gray-400 p-1 text-right tabular-nums">
                            {formatAmount(order.shippingFee)}원
                          </td>
                        </tr>
                      )}

                      {/* 주문 소계 */}
                      <tr className="bg-gray-50">
                        <td
                          colSpan={5}
                          className="border border-gray-400 p-1 text-right text-[8pt] text-gray-500 pr-2"
                        >
                          소계 ({order.orderNumber})
                        </td>
                        <td className="border border-gray-400 p-1 text-right tabular-nums font-semibold">
                          {formatAmount(Number(order.finalAmount))}원
                        </td>
                      </tr>
                    </Fragment>
                  ))}

                  {/* 일계 */}
                  <tr className="bg-blue-50 font-bold">
                    <td
                      colSpan={5}
                      className="border border-gray-500 p-1.5 text-right pr-3"
                    >
                      {format(new Date(date + 'T00:00:00'), 'MM월 dd일 합계', {
                        locale: ko,
                      })}
                    </td>
                    <td className="border border-gray-500 p-1.5 text-right tabular-nums">
                      {formatAmount(dateSubtotal)}원
                    </td>
                  </tr>
                </Fragment>
              );
            })}

            {/* 당월 합계 */}
            <tr className="bg-gray-200 font-bold">
              <td colSpan={5} className="border border-gray-500 p-1.5 text-right pr-3">
                당 월 합 계
              </td>
              <td className="border border-gray-500 p-1.5 text-right tabular-nums">
                {formatAmount(summary?.totalOrderAmount || 0)}원
              </td>
            </tr>

            {/* 납부금액 합계 */}
            <tr className="bg-gray-100 font-bold">
              <td colSpan={5} className="border border-gray-500 p-1.5 text-right pr-3">
                납 부 합 계
              </td>
              <td className="border border-gray-500 p-1.5 text-right tabular-nums text-blue-700">
                {formatAmount(summary?.totalDepositAmount || 0)}원
              </td>
            </tr>

            {/* 차월이월 */}
            <tr className="bg-gray-300 font-bold">
              <td colSpan={5} className="border border-gray-500 p-1.5 text-right pr-3 text-primary">
                차 월 이 월
              </td>
              <td
                className={`border border-gray-500 p-1.5 text-right tabular-nums ${
                  closingBalance > 0
                    ? 'text-red-700'
                    : closingBalance < 0
                    ? 'text-blue-700'
                    : ''
                }`}
              >
                {closingBalance < 0 && '-'}
                {formatAmount(Math.abs(closingBalance))}원
                {closingBalance > 0 && <span className="text-[8pt] ml-1">(미납)</span>}
                {closingBalance < 0 && <span className="text-[8pt] ml-1">(선납)</span>}
              </td>
            </tr>
          </tbody>
        </table>

        <PrintFooter />
      </div>

      {/* ===== 화면 UI ===== */}
      <div className="space-y-6">
        {/* 월 네비게이션 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-xl">
                  {format(selectedDate, 'yyyy년 MM월', { locale: ko })}
                </h2>
              </div>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              <Button variant="ghost" size="sm" onClick={handleToday}>
                이번 달
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                내보내기
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintSummary}>
                <Printer className="h-4 w-4 mr-1" />
                약식 인쇄
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintDetail}
                disabled={isAllOrdersLoading}
              >
                {isAllOrdersLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1" />
                )}
                상세 인쇄
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 요약 카드 */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">이월잔액</p>
                <p className="text-lg sm:text-2xl tabular-nums">
                  {formatAmount(carryForward)}
                  <span className="text-sm">원</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">이번달 주문금액</p>
                <p className="text-lg sm:text-2xl tabular-nums">
                  {formatAmount(summary?.totalOrderAmount || 0)}
                  <span className="text-sm">원</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">이번달 납부금액</p>
                <p className="text-lg sm:text-2xl tabular-nums text-green-600">
                  {formatAmount(summary?.totalDepositAmount || 0)}
                  <span className="text-sm">원</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">미결제 잔액</p>
                <p
                  className={`text-lg sm:text-2xl tabular-nums ${
                    closingBalance > 0
                      ? 'text-red-600'
                      : closingBalance < 0
                      ? 'text-blue-600'
                      : ''
                  }`}
                >
                  {closingBalance < 0 && '-'}
                  {formatAmount(Math.abs(closingBalance))}
                  <span className="text-sm">원</span>
                </p>
                {closingBalance > 0 && (
                  <p className="text-[10px] text-red-500 mt-0.5">미납금</p>
                )}
                {closingBalance < 0 && (
                  <p className="text-[10px] text-blue-500 mt-0.5">선납금</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 일자별 거래원장 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="h-4 w-4" />
              거래내역
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            {isLoading ? (
              <div className="space-y-2 px-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
                ))}
              </div>
            ) : dataWithBalance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-xs text-muted-foreground">
                      <th className="w-8 p-2 sm:p-3" aria-label="펼치기" />
                      <th className="p-2 sm:p-3 text-left font-medium">일자</th>
                      <th className="p-2 sm:p-3 text-left font-medium">적요</th>
                      <th className="p-2 sm:p-3 text-right font-medium">
                        주문<span className="hidden sm:inline">금액</span>
                      </th>
                      <th className="p-2 sm:p-3 text-right font-medium">
                        납부<span className="hidden sm:inline">금액</span>
                      </th>
                      <th className="p-2 sm:p-3 text-right font-medium">잔액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...dataWithBalance].reverse().map((row) => {
                      const isExpanded = expandedRow === row.date;
                      return (
                        <Fragment key={row.date}>
                          <tr
                            className="border-b cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => handleRowClick(row.date)}
                          >
                            <td className="p-2 sm:p-3 text-center">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-500 inline-block" />
                              ) : (
                                <ChevronRightIcon className="h-4 w-4 text-gray-400 inline-block" />
                              )}
                            </td>
                            <td className="p-2 sm:p-3 whitespace-nowrap">
                              {format(
                                new Date(row.date + 'T00:00:00'),
                                'MM/dd (EEE)',
                                { locale: ko },
                              )}
                            </td>
                            <td className="p-2 sm:p-3 text-muted-foreground">
                              {row.orderCount}건
                            </td>
                            <td className="p-2 sm:p-3 text-right tabular-nums">
                              {row.orderAmount > 0
                                ? formatAmount(row.orderAmount) + '원'
                                : '-'}
                            </td>
                            <td className="p-2 sm:p-3 text-right tabular-nums text-green-600">
                              {row.depositAmount > 0
                                ? formatAmount(row.depositAmount) + '원'
                                : '-'}
                            </td>
                            <td
                              className={`p-2 sm:p-3 text-right tabular-nums font-semibold ${
                                row.runningBalance > 0
                                  ? 'text-red-600'
                                  : row.runningBalance < 0
                                  ? 'text-blue-600'
                                  : ''
                              }`}
                            >
                              {row.runningBalance < 0 && '-'}
                              {formatAmount(Math.abs(row.runningBalance))}원
                            </td>
                          </tr>

                          {/* 드릴다운: 건별 상세 */}
                          {isExpanded && (
                            <tr>
                              <td
                                colSpan={6}
                                className="bg-slate-50/80 p-0 border-b"
                              >
                                <div className="px-4 py-3 sm:px-8">
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {format(
                                      new Date(row.date + 'T00:00:00'),
                                      'MM월 dd일 (EEE)',
                                      { locale: ko },
                                    )}{' '}
                                    거래 내역
                                  </p>
                                  {isDetailFetching ? (
                                    <div className="flex items-center justify-center py-6">
                                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                  ) : detailData?.data &&
                                    detailData.data.length > 0 ? (
                                    <div className="space-y-2">
                                      {detailData.data.map((order) => (
                                        <div
                                          key={order.id}
                                          className="flex items-center gap-3 bg-white rounded-lg border p-3 text-[10pt]"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <p className="truncate">
                                              {order.items?.[0]?.productName || '-'}
                                              {order.items?.length > 1 && (
                                                <span className="text-muted-foreground text-xs ml-1">
                                                  외 {order.items.length - 1}건
                                                </span>
                                              )}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              {order.orderNumber}
                                              {order.createdAt && (
                                                <span className="ml-1.5 text-gray-400">
                                                  {format(
                                                    new Date(order.createdAt),
                                                    'HH:mm',
                                                  )}
                                                </span>
                                              )}
                                            </p>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <p className="tabular-nums">
                                              {formatAmount(Number(order.finalAmount))}원
                                            </p>
                                          </div>
                                          <div className="shrink-0">
                                            <Badge
                                              variant={
                                                STATUS_BADGE_VARIANT[order.status] ||
                                                'outline'
                                              }
                                            >
                                              {ORDER_STATUS_LABELS[order.status] ||
                                                order.status}
                                            </Badge>
                                          </div>
                                          <div className="shrink-0 w-16 text-center">
                                            {renderShippingStatus(order)}
                                          </div>
                                          <Link href={`/mypage/orders/${order.id}`}>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0"
                                            >
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                          </Link>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-center text-muted-foreground text-xs py-4">
                                      거래 내역이 없습니다
                                    </p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}

                    {/* 전월이월 행 */}
                    <tr className="border-b bg-blue-50/50">
                      <td className="p-2 sm:p-3" />
                      <td className="p-2 sm:p-3 whitespace-nowrap text-muted-foreground">
                        {format(startDate, 'MM/01', { locale: ko })}
                      </td>
                      <td className="p-2 sm:p-3 font-medium text-blue-700">이월잔액</td>
                      <td className="p-2 sm:p-3 text-right text-muted-foreground">-</td>
                      <td className="p-2 sm:p-3 text-right text-muted-foreground">-</td>
                      <td
                        className={`p-2 sm:p-3 text-right tabular-nums font-bold ${
                          carryForward > 0
                            ? 'text-red-600'
                            : carryForward < 0
                            ? 'text-blue-600'
                            : ''
                        }`}
                      >
                        {carryForward < 0 && '-'}
                        {formatAmount(Math.abs(carryForward))}원
                      </td>
                    </tr>

                    {/* 당월합계 행 */}
                    <tr className="bg-gray-100 text-sm border-t-2 font-semibold">
                      <td className="p-2 sm:p-3" />
                      <td className="p-2 sm:p-3" />
                      <td className="p-2 sm:p-3">이번달 합계</td>
                      <td className="p-2 sm:p-3 text-right tabular-nums">
                        {formatAmount(summary?.totalOrderAmount || 0)}원
                      </td>
                      <td className="p-2 sm:p-3 text-right tabular-nums text-green-600">
                        {formatAmount(summary?.totalDepositAmount || 0)}원
                      </td>
                      <td className="p-2 sm:p-3 text-right tabular-nums" />
                    </tr>

                    {/* 기말잔액 행 */}
                    <tr className="bg-gray-50 text-sm border-t font-bold">
                      <td className="p-2 sm:p-3" />
                      <td className="p-2 sm:p-3" />
                      <td className="p-2 sm:p-3 text-primary">차월이월</td>
                      <td className="p-2 sm:p-3" />
                      <td className="p-2 sm:p-3" />
                      <td
                        className={`p-2 sm:p-3 text-right tabular-nums ${
                          closingBalance > 0
                            ? 'text-red-600'
                            : closingBalance < 0
                            ? 'text-blue-600'
                            : ''
                        }`}
                      >
                        {closingBalance < 0 && '-'}
                        {formatAmount(Math.abs(closingBalance))}원
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center px-4">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">
                  {format(selectedDate, 'yyyy년 MM월', { locale: ko })}에는 거래
                  내역이 없습니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

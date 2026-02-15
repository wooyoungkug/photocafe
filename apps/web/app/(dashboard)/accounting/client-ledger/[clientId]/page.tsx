'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  FileText,
  Calendar,
  BarChart3,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  useClientLedgerDetail,
  useClientLedgerSummary,
  LedgerTransaction,
  PeriodSummaryItem,
} from '@/hooks/use-client-ledger';

// 거래 유형별 색상 & 라벨 설정
const TRANSACTION_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  SALES: { label: '매출', color: 'bg-blue-100 text-blue-700' },
  RECEIPT: { label: '수금', color: 'bg-green-100 text-green-700' },
  PURCHASE: { label: '매입', color: 'bg-orange-100 text-orange-700' },
  PAYMENT: { label: '지급', color: 'bg-red-100 text-red-700' },
};

// 기간단위 옵션
const PERIOD_UNIT_OPTIONS = [
  { value: 'DAILY', label: '일별' },
  { value: 'MONTHLY', label: '월별' },
  { value: 'QUARTERLY', label: '분기별' },
  { value: 'YEARLY', label: '연별' },
] as const;

const SUMMARY_PERIOD_OPTIONS = [
  { value: 'MONTHLY', label: '월별' },
  { value: 'QUARTERLY', label: '분기별' },
  { value: 'YEARLY', label: '연별' },
] as const;

export default function ClientLedgerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  // ===== 거래내역 탭 상태 =====
  const [detailDateRange, setDetailDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [detailPeriodUnit, setDetailPeriodUnit] = useState<'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('DAILY');

  // ===== 기간별 요약 탭 상태 =====
  const [summaryDateRange, setSummaryDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [summaryPeriodUnit, setSummaryPeriodUnit] = useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');

  // ===== 데이터 조회 =====
  const { data: detailData, isLoading: isDetailLoading } = useClientLedgerDetail(clientId, {
    startDate: detailDateRange.start || undefined,
    endDate: detailDateRange.end || undefined,
    periodUnit: detailPeriodUnit,
  });

  const { data: summaryData, isLoading: isSummaryLoading } = useClientLedgerSummary(clientId, {
    startDate: summaryDateRange.start || undefined,
    endDate: summaryDateRange.end || undefined,
    periodUnit: summaryPeriodUnit,
  });

  // ===== 금액 포맷 =====
  const formatAmount = (amount: number) => {
    return amount.toLocaleString();
  };

  // ===== 거래유형 Badge =====
  const getTypeBadge = (type: string) => {
    const config = TRANSACTION_TYPE_CONFIG[type];
    if (!config) {
      return <Badge className="bg-gray-100 text-gray-800 text-xs">{type}</Badge>;
    }
    return (
      <Badge className={`${config.color} text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const client = detailData?.client;

  return (
    <div className="space-y-4">
      {/* 헤더: 뒤로가기 + 제목 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/accounting/client-ledger')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          목록
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          거래처원장 상세
        </h1>
      </div>

      {/* 거래처 정보 카드 */}
      <Card>
        <CardContent className="py-4 px-5">
          {isDetailLoading && !client ? (
            <div className="h-16 bg-gray-100 animate-pulse rounded" />
          ) : client ? (
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{client.clientName}</h2>
                  <p className="text-sm text-muted-foreground font-mono">{client.clientCode}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {client.businessNumber && (
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    <span>{client.businessNumber}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    <span>{client.email}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">거래처 정보를 불러올 수 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* 탭 구성 */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="rounded-lg">
          <TabsTrigger value="transactions" className="rounded-md text-sm">
            <Calendar className="h-4 w-4 mr-1.5" />
            일별 거래내역
          </TabsTrigger>
          <TabsTrigger value="summary" className="rounded-md text-sm">
            <BarChart3 className="h-4 w-4 mr-1.5" />
            기간별 요약
          </TabsTrigger>
        </TabsList>

        {/* ===== 일별 거래내역 탭 ===== */}
        <TabsContent value="transactions" className="space-y-4">
          {/* 필터 바 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="date"
              value={detailDateRange.start}
              onChange={(e) => setDetailDateRange({ ...detailDateRange, start: e.target.value })}
              className="w-[140px] h-9 text-xs"
            />
            <span className="text-muted-foreground text-sm">~</span>
            <Input
              type="date"
              value={detailDateRange.end}
              onChange={(e) => setDetailDateRange({ ...detailDateRange, end: e.target.value })}
              className="w-[140px] h-9 text-xs"
            />
            <Select
              value={detailPeriodUnit}
              onValueChange={(v) => setDetailPeriodUnit(v as typeof detailPeriodUnit)}
            >
              <SelectTrigger className="w-[100px] h-9 text-xs">
                <SelectValue placeholder="기간단위" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_UNIT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 거래내역 테이블 */}
          {isDetailLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : detailData?.transactions && detailData.transactions.length > 0 ? (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead className="w-[110px] text-xs">날짜</TableHead>
                      <TableHead className="w-[80px] text-xs text-center">구분</TableHead>
                      <TableHead className="text-xs">적요</TableHead>
                      <TableHead className="w-[130px] text-xs">전표번호</TableHead>
                      <TableHead className="text-right w-[120px] text-xs">차변</TableHead>
                      <TableHead className="text-right w-[120px] text-xs">대변</TableHead>
                      <TableHead className="text-right w-[120px] text-xs">잔액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* 전기이월 행 */}
                    <TableRow className="bg-yellow-50/50">
                      <TableCell className="text-xs py-2 font-medium text-yellow-700" colSpan={4}>
                        전기이월
                      </TableCell>
                      <TableCell className="text-right text-xs py-2" />
                      <TableCell className="text-right text-xs py-2" />
                      <TableCell className="text-right text-xs py-2 font-bold text-yellow-700">
                        {formatAmount(detailData.openingBalance)}
                      </TableCell>
                    </TableRow>

                    {/* 거래 내역 행들 */}
                    {detailData.transactions.map((tx: LedgerTransaction, idx: number) => (
                      <TableRow key={idx} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs py-2 whitespace-nowrap">
                          {tx.date}
                        </TableCell>
                        <TableCell className="text-center py-2">
                          {getTypeBadge(tx.type)}
                        </TableCell>
                        <TableCell className="text-xs py-2">
                          {tx.description || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs py-2 text-blue-600 whitespace-nowrap">
                          {tx.referenceNo || '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 whitespace-nowrap">
                          {tx.debit > 0 ? (
                            <span className="text-red-600 font-medium">{formatAmount(tx.debit)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 whitespace-nowrap">
                          {tx.credit > 0 ? (
                            <span className="text-blue-600 font-medium">{formatAmount(tx.credit)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 whitespace-nowrap font-bold">
                          <span className={tx.balance > 0 ? 'text-red-600' : tx.balance < 0 ? 'text-blue-600' : 'text-green-600'}>
                            {formatAmount(tx.balance)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/40 font-bold">
                      <TableCell colSpan={4} className="text-right text-xs">합계</TableCell>
                      <TableCell className="text-right text-xs text-red-600">
                        {formatAmount(detailData.summary?.totalDebit || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-blue-600">
                        {formatAmount(detailData.summary?.totalCredit || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold">
                        <span className={detailData.closingBalance > 0 ? 'text-red-600' : detailData.closingBalance < 0 ? 'text-blue-600' : 'text-green-600'}>
                          {formatAmount(detailData.closingBalance)}
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  거래내역이 없습니다
                </h3>
                <p className="text-gray-500 text-sm">
                  선택한 기간에 해당하는 거래내역이 없습니다.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== 기간별 요약 탭 ===== */}
        <TabsContent value="summary" className="space-y-4">
          {/* 필터 바 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="date"
              value={summaryDateRange.start}
              onChange={(e) => setSummaryDateRange({ ...summaryDateRange, start: e.target.value })}
              className="w-[140px] h-9 text-xs"
            />
            <span className="text-muted-foreground text-sm">~</span>
            <Input
              type="date"
              value={summaryDateRange.end}
              onChange={(e) => setSummaryDateRange({ ...summaryDateRange, end: e.target.value })}
              className="w-[140px] h-9 text-xs"
            />
            <Select
              value={summaryPeriodUnit}
              onValueChange={(v) => setSummaryPeriodUnit(v as typeof summaryPeriodUnit)}
            >
              <SelectTrigger className="w-[100px] h-9 text-xs">
                <SelectValue placeholder="기간단위" />
              </SelectTrigger>
              <SelectContent>
                {SUMMARY_PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 기간별 요약 테이블 */}
          {isSummaryLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : summaryData?.periods && summaryData.periods.length > 0 ? (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead className="w-[120px] text-xs">기간</TableHead>
                      <TableHead className="text-right w-[110px] text-xs">매출</TableHead>
                      <TableHead className="text-right w-[110px] text-xs">수금</TableHead>
                      <TableHead className="text-right w-[110px] text-xs">매입</TableHead>
                      <TableHead className="text-right w-[110px] text-xs">지급</TableHead>
                      <TableHead className="text-right w-[120px] text-xs">매출잔액</TableHead>
                      <TableHead className="text-right w-[120px] text-xs">매입잔액</TableHead>
                      <TableHead className="text-right w-[110px] text-xs">순잔액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* 전기이월 행 */}
                    <TableRow className="bg-yellow-50/50">
                      <TableCell className="text-xs py-2 font-medium text-yellow-700">
                        전기이월
                      </TableCell>
                      <TableCell className="text-right text-xs py-2" colSpan={4} />
                      <TableCell className="text-right text-xs py-2 font-bold text-yellow-700">
                        {formatAmount(summaryData.openingBalance?.salesBalance || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs py-2 font-bold text-yellow-700">
                        {formatAmount(summaryData.openingBalance?.purchaseBalance || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs py-2 font-bold text-yellow-700">
                        {formatAmount(summaryData.openingBalance?.netBalance || 0)}
                      </TableCell>
                    </TableRow>

                    {/* 기간별 데이터 행 */}
                    {summaryData.periods.map((period: PeriodSummaryItem, idx: number) => (
                      <TableRow key={idx} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs py-2 whitespace-nowrap font-medium">
                          {period.period}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 whitespace-nowrap">
                          {period.sales > 0 ? (
                            <span className="text-blue-600">{formatAmount(period.sales)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 whitespace-nowrap">
                          {period.received > 0 ? (
                            <span className="text-green-600">{formatAmount(period.received)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 whitespace-nowrap">
                          {period.purchases > 0 ? (
                            <span className="text-orange-600">{formatAmount(period.purchases)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 whitespace-nowrap">
                          {period.paid > 0 ? (
                            <span className="text-red-600">{formatAmount(period.paid)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 whitespace-nowrap font-medium">
                          <span className={period.salesBalance > 0 ? 'text-red-600' : period.salesBalance === 0 ? 'text-green-600' : ''}>
                            {formatAmount(period.salesBalance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 whitespace-nowrap font-medium">
                          <span className={period.purchaseBalance > 0 ? 'text-orange-600' : period.purchaseBalance === 0 ? 'text-green-600' : ''}>
                            {formatAmount(period.purchaseBalance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs py-2 whitespace-nowrap font-bold">
                          <span className={period.netBalance > 0 ? 'text-red-600' : period.netBalance < 0 ? 'text-blue-600' : 'text-green-600'}>
                            {formatAmount(period.netBalance)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/40 font-bold">
                      <TableCell className="text-xs">합계</TableCell>
                      <TableCell className="text-right text-xs text-blue-600">
                        {formatAmount(summaryData.periods.reduce((sum: number, p: PeriodSummaryItem) => sum + p.sales, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs text-green-600">
                        {formatAmount(summaryData.periods.reduce((sum: number, p: PeriodSummaryItem) => sum + p.received, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs text-orange-600">
                        {formatAmount(summaryData.periods.reduce((sum: number, p: PeriodSummaryItem) => sum + p.purchases, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs text-red-600">
                        {formatAmount(summaryData.periods.reduce((sum: number, p: PeriodSummaryItem) => sum + p.paid, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold">
                        <span className={(summaryData.closingBalance?.salesBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}>
                          {formatAmount(summaryData.closingBalance?.salesBalance || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold">
                        <span className={(summaryData.closingBalance?.purchaseBalance || 0) > 0 ? 'text-orange-600' : 'text-green-600'}>
                          {formatAmount(summaryData.closingBalance?.purchaseBalance || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold">
                        {(() => {
                          const net = summaryData.closingBalance?.netBalance || 0;
                          return (
                            <span className={net > 0 ? 'text-red-600' : net < 0 ? 'text-blue-600' : 'text-green-600'}>
                              {formatAmount(net)}
                            </span>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <BarChart3 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  기간별 요약 데이터가 없습니다
                </h3>
                <p className="text-gray-500 text-sm">
                  선택한 기간에 해당하는 요약 데이터가 없습니다.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { useState, useMemo, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Download,
  Loader2,
  Building2,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  TrendingDown,
  Wallet,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useClientLedgerDetail } from '@/hooks/use-client-ledger';
import { toast } from '@/hooks/use-toast';

const periodTypeLabels: Record<string, string> = {
  daily: '일별',
  monthly: '월별',
  quarterly: '분기별',
  yearly: '연별',
};

const typeLabels: Record<string, { label: string; color: string }> = {
  sales: { label: '매출', color: 'bg-emerald-100 text-emerald-700' },
  receipt: { label: '수금', color: 'bg-blue-100 text-blue-700' },
  purchase: { label: '매입', color: 'bg-orange-100 text-orange-700' },
  payment: { label: '지급', color: 'bg-purple-100 text-purple-700' },
};

export default function ClientLedgerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  // 기간: 기본 당월
  const now = new Date();
  const defaultStart = format(
    new Date(now.getFullYear(), now.getMonth(), 1),
    'yyyy-MM-dd',
  );
  const defaultEnd = format(now, 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [periodType, setPeriodType] = useState('daily');
  const [activeTab, setActiveTab] = useState('transactions');

  const { data, isLoading } = useClientLedgerDetail(clientId, {
    startDate,
    endDate,
    periodType,
  });

  const client = data?.client;
  const carryForward = data?.carryForward;
  const transactions = data?.transactions || [];
  const periodSummary = data?.periodSummary || [];
  const totals = data?.totals;

  // 일자별 + 유형별 그룹핑
  const transactionsByDate = useMemo(() => {
    // 1. 날짜별로 그룹핑
    const dateGroups = new Map<string, typeof transactions>();

    transactions.forEach(t => {
      const dateStr = format(new Date(t.date), 'yyyy-MM-dd');
      if (!dateGroups.has(dateStr)) {
        dateGroups.set(dateStr, []);
      }
      dateGroups.get(dateStr)!.push(t);
    });

    // 2. 각 날짜별로 유형별 합계 생성
    const groups: {
      date: string;
      items: typeof transactions;
      debitSum: number;
      creditSum: number;
      lastBalance: number;
    }[] = [];

    dateGroups.forEach((dailyTransactions, date) => {
      // 유형별로 그룹핑
      const typeGroups = new Map<string, typeof transactions>();

      dailyTransactions.forEach(t => {
        if (!typeGroups.has(t.type)) {
          typeGroups.set(t.type, []);
        }
        typeGroups.get(t.type)!.push(t);
      });

      // 각 유형별로 합계 거래 생성 (매출은 개별, 나머지는 합계)
      const mergedItems: typeof transactions = [];
      let debitSum = 0;
      let creditSum = 0;
      let lastBalance = 0;

      typeGroups.forEach((items, type) => {
        if (type === 'sales' || items.length === 1) {
          // 매출이거나 1건이면 개별 추가
          items.forEach(item => {
            mergedItems.push(item);
            debitSum += item.debit;
            creditSum += item.credit;
            lastBalance = item.balance;
          });
        } else {
          // 수금/매입/지급이고 여러 건이면 합계 생성
          const totalDebit = items.reduce((sum, item) => sum + item.debit, 0);
          const totalCredit = items.reduce((sum, item) => sum + item.credit, 0);
          const firstItem = items[0];
          const lastItem = items[items.length - 1];

          const typeLabel = typeLabels[type]?.label || type;

          mergedItems.push({
            ...firstItem,
            debit: totalDebit,
            credit: totalCredit,
            balance: lastItem.balance,
            description: `${typeLabel} ${items.length}건`,
            productName: '', // 합계이므로 상품명 제거
          });

          debitSum += totalDebit;
          creditSum += totalCredit;
          lastBalance = lastItem.balance;
        }
      });

      groups.push({
        date,
        items: mergedItems,
        debitSum,
        creditSum,
        lastBalance,
      });
    });

    // 날짜순 정렬
    groups.sort((a, b) => a.date.localeCompare(b.date));

    return groups;
  }, [transactions]);

  // CSV 다운로드
  const handleExportCSV = () => {
    if (!transactions.length) {
      toast({ title: '다운로드할 데이터가 없습니다.', variant: 'destructive' });
      return;
    }

    const headers = [
      '일자',
      '유형',
      '주문번호',
      '적요',
      '매출',
      '입금',
      '잔액',
    ];
    const rows = transactions.map((t) => [
      format(new Date(t.date), 'yyyy-MM-dd'),
      typeLabels[t.type]?.label || t.type,
      t.orderNumber || '',
      t.description,
      t.debit > 0 ? Math.round(t.debit).toString() : '',
      t.credit > 0 ? Math.round(t.credit).toString() : '',
      Math.round(t.balance).toString(),
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `거래처원장_${client?.clientName || ''}_${format(new Date(), 'yyyyMMdd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'CSV 파일이 다운로드되었습니다.' });
  };

  // 빠른 기간 선택
  const handleQuickPeriod = (months: number) => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - months + 1, 1);
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  // 거래내역서 출력
  const handlePrintStatement = () => {
    const url = `/accounting/client-ledger/${clientId}/statement?startDate=${startDate}&endDate=${endDate}&periodType=${periodType}`;
    router.push(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {client?.clientName || '거래처원장 상세'}
            </h1>
            <p className="text-muted-foreground">
              {client?.clientCode}
              {client?.businessNumber && ` | ${client.businessNumber}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV 다운로드
          </Button>
          <Button onClick={handlePrintStatement}>
            <Printer className="h-4 w-4 mr-2" />
            거래내역서 출력
          </Button>
        </div>
      </div>

      {/* Client Info + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 거래처 정보 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              거래처 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {client?.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {client.phone}
              </div>
            )}
            {client?.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {client.email}
              </div>
            )}
            {client?.address && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {client.address} {client.addressDetail}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Badge variant="outline">
                신용등급: {client?.creditGrade || '-'}
              </Badge>
              <Badge variant="outline">
                결제조건: {client?.paymentTerms || 30}일
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 전기이월 */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">전기이월 잔액</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">매출 미수금</span>
              <span className="font-medium text-red-600">
                {Math.round(carryForward?.salesBalance || 0).toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">매입 미지급금</span>
              <span className="font-medium text-orange-600">
                {Math.round(
                  carryForward?.purchaseBalance || 0,
                ).toLocaleString()}
                원
              </span>
            </div>
            <hr className="my-1" />
            <div className="flex justify-between text-sm font-bold">
              <span>순 잔액</span>
              <span
                className={
                  (carryForward?.netBalance || 0) >= 0
                    ? 'text-red-600'
                    : 'text-blue-600'
                }
              >
                {Math.round(carryForward?.netBalance || 0).toLocaleString()}원
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 기간 합계 */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">기간 합계</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                매출 합계
              </span>
              <span className="font-medium">
                {Math.round(totals?.totalDebit || 0).toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                입금 합계
              </span>
              <span className="font-medium">
                {Math.round(totals?.totalCredit || 0).toLocaleString()}원
              </span>
            </div>
            <hr className="my-1" />
            <div className="flex justify-between text-sm font-bold">
              <span className="flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5" />
                기말 잔액
              </span>
              <span
                className={
                  (totals?.closingBalance || 0) >= 0
                    ? 'text-red-600'
                    : 'text-blue-600'
                }
              >
                {Math.round(totals?.closingBalance || 0).toLocaleString()}원
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>시작일</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-2">
              <Label>종료일</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-2">
              <Label>조회 단위</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">일별</SelectItem>
                  <SelectItem value="monthly">월별</SelectItem>
                  <SelectItem value="quarterly">분기별</SelectItem>
                  <SelectItem value="yearly">연별</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickPeriod(1)}
              >
                당월
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickPeriod(3)}
              >
                3개월
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickPeriod(6)}
              >
                6개월
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickPeriod(12)}
              >
                1년
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions / Period Summary Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="transactions">세부내역</TabsTrigger>
              <TabsTrigger value="summary">
                {periodTypeLabels[periodType] || '기간별'} 요약
              </TabsTrigger>
            </TabsList>

            {/* 거래내역 탭 */}
            <TabsContent value="transactions" className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[110px]">일자</TableHead>
                      <TableHead className="whitespace-nowrap">주문번호</TableHead>
                      <TableHead>적요</TableHead>
                      <TableHead className="text-right">매출</TableHead>
                      <TableHead className="text-right">입금</TableHead>
                      <TableHead className="text-right">잔액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* 전기이월 행 */}
                    <TableRow className="bg-amber-50/50">
                      <TableCell colSpan={3} className="text-sm">
                        전기이월
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">
                        {Math.round(
                          carryForward?.netBalance || 0,
                        ).toLocaleString()}
                      </TableCell>
                    </TableRow>

                    {!transactions.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-12 text-muted-foreground"
                        >
                          해당 기간의 거래내역이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactionsByDate.map((group) => (
                        <Fragment key={`group-${group.date}`}>
                          {group.items.map((t, idx) => (
                            <TableRow key={`${t.ledgerNumber}-${idx}`}>
                              <TableCell className="font-mono text-sm">
                                {idx === 0 ? group.date : ''}
                              </TableCell>
                              <TableCell className="font-mono text-sm whitespace-nowrap">
                                {t.orderNumber || '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>
                                    {t.productName && `${t.productName} - `}
                                    {(t.description || '').slice(0, 36)}
                                    {t.description && t.description.length > 36 ? '...' : ''}
                                  </span>
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-gray-500 bg-gray-100">
                                    {typeLabels[t.type]?.label || t.type}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {t.debit > 0
                                  ? Math.round(t.debit).toLocaleString()
                                  : ''}
                              </TableCell>
                              <TableCell className="text-right">
                                {t.credit > 0
                                  ? Math.round(t.credit).toLocaleString()
                                  : ''}
                              </TableCell>
                              <TableCell className="text-right">
                                {Math.round(t.balance).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                          {/* 일자별 소계 */}
                          {group.items.length > 1 && (
                            <TableRow key={`subtotal-${group.date}`} className="bg-gray-50 border-b">
                              <TableCell className="text-sm">
                                {group.date}
                              </TableCell>
                              <TableCell colSpan={2} className="text-sm">
                                일계 ({group.items.length}건)
                              </TableCell>
                              <TableCell className="text-right">
                                {group.debitSum > 0
                                  ? Math.round(group.debitSum).toLocaleString()
                                  : ''}
                              </TableCell>
                              <TableCell className="text-right">
                                {group.creditSum > 0
                                  ? Math.round(group.creditSum).toLocaleString()
                                  : ''}
                              </TableCell>
                              <TableCell className="text-right">
                                {Math.round(group.lastBalance).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      ))
                    )}

                    {/* 합계 행 */}
                    {transactions.length > 0 && (
                      <TableRow className="bg-slate-100">
                        <TableCell colSpan={3} className="text-sm">
                          합 계
                        </TableCell>
                        <TableCell className="text-right">
                          {Math.round(
                            totals?.totalDebit || 0,
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {Math.round(
                            totals?.totalCredit || 0,
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {Math.round(
                            totals?.closingBalance || 0,
                          ).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* 기간별 요약 탭 */}
            <TabsContent value="summary" className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>기간</TableHead>
                      <TableHead>적요</TableHead>
                      <TableHead className="text-center">건수</TableHead>
                      <TableHead className="text-right">매출</TableHead>
                      <TableHead className="text-right">입금</TableHead>
                      <TableHead className="text-right">잔액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!periodSummary.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-12 text-muted-foreground"
                        >
                          해당 기간의 데이터가 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      periodSummary.map((ps) => (
                        <TableRow key={ps.period}>
                          <TableCell className="font-mono">
                            {ps.period}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {ps.description || '-'}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {ps.count}건
                          </TableCell>
                          <TableCell className="text-right">
                            {ps.debit > 0
                              ? Math.round(ps.debit).toLocaleString()
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {ps.credit > 0
                              ? Math.round(ps.credit).toLocaleString()
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {Math.round(ps.balance).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

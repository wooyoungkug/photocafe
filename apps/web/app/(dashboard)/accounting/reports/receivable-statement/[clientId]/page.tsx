'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, subMonths } from 'date-fns';
import { ArrowLeft, Download, FileText, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReceivableStatement } from '@/hooks/use-dashboard';
import { toast } from '@/hooks/use-toast';

export default function ReceivableStatementPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  const [dateRange] = useState({
    startDate: format(subMonths(new Date(), 12), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data, isLoading } = useReceivableStatement(clientId, dateRange);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    if (!data) return;

    // CSV 헤더
    const headers = ['전표번호', '매출일', '주문번호', '공급가액', '부가세', '합계', '수금액', '미수금', '결제상태'];

    // CSV 데이터 행
    const rows = data.ledgers.map((ledger: any) => [
      ledger.ledgerNumber,
      format(new Date(ledger.ledgerDate), 'yyyy-MM-dd'),
      ledger.orderNumber,
      Number(ledger.supplyAmount).toLocaleString(),
      Number(ledger.vatAmount).toLocaleString(),
      Number(ledger.totalAmount).toLocaleString(),
      Number(ledger.receivedAmount).toLocaleString(),
      Number(ledger.outstandingAmount).toLocaleString(),
      ledger.paymentStatus,
    ]);

    // CSV 문자열 생성
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    // Blob 생성 및 다운로드
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `미수금명세서_${data.client.clientName}_${format(new Date(), 'yyyyMMdd')}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'CSV 파일이 다운로드되었습니다.' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      paid: { label: '완납', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      partial: { label: '부분수금', color: 'bg-blue-100 text-blue-700', icon: DollarSign },
      unpaid: { label: '미수', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
      overdue: { label: '연체', color: 'bg-red-100 text-red-700', icon: AlertCircle },
    };
    const config = configs[status] || configs.unpaid;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 print:p-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">미수금 명세서</h1>
            <p className="text-muted-foreground">{data.client.clientName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV 다운로드
          </Button>
          <Button onClick={handlePrint}>
            <FileText className="h-4 w-4 mr-2" />
            인쇄
          </Button>
        </div>
      </div>

      {/* 거래처 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>거래처 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">거래처명</p>
              <p className="font-medium">{data.client.clientName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">거래처코드</p>
              <p className="font-medium">{data.client.clientCode}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">사업자번호</p>
              <p className="font-medium">{data.client.businessNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">대표자</p>
              <p className="font-medium">{data.client.representative || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">전화번호</p>
              <p className="font-medium">{data.client.phone || data.client.mobile || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">이메일</p>
              <p className="font-medium">{data.client.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">신용등급</p>
              <Badge variant="secondary">{data.client.creditGrade}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">결제조건</p>
              <p className="font-medium">
                {data.client.creditEnabled
                  ? `${data.client.paymentTerms || 0}일 후 결제`
                  : '즉시 결제'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 요약 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">총 매출</p>
            <p className="text-2xl font-bold">{data.summary.totalSales.toLocaleString()}원</p>
            <p className="text-xs text-muted-foreground mt-1">{data.summary.ledgerCount}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">수금액</p>
            <p className="text-2xl font-bold text-green-600">
              {data.summary.totalReceived.toLocaleString()}원
            </p>
            <p className="text-xs text-muted-foreground mt-1">{data.summary.paidCount}건 완납</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">미수금</p>
            <p className="text-2xl font-bold text-orange-600">
              {data.summary.totalOutstanding.toLocaleString()}원
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.unpaidCount + data.summary.partialCount}건 미수
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">수금률</p>
            <p className="text-2xl font-bold text-blue-600">
              {data.summary.totalSales > 0
                ? Math.round((data.summary.totalReceived / data.summary.totalSales) * 100)
                : 0}
              %
            </p>
            <p className="text-xs text-red-600 mt-1">{data.summary.overdueCount}건 연체</p>
          </CardContent>
        </Card>
      </div>

      {/* 탭 */}
      <Tabs defaultValue="ledgers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ledgers">매출 내역</TabsTrigger>
          <TabsTrigger value="receipts">수금 이력</TabsTrigger>
        </TabsList>

        <TabsContent value="ledgers">
          <Card>
            <CardHeader>
              <CardTitle>매출 내역</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>전표번호</TableHead>
                    <TableHead>매출일</TableHead>
                    <TableHead>주문번호</TableHead>
                    <TableHead className="text-right">공급가액</TableHead>
                    <TableHead className="text-right">부가세</TableHead>
                    <TableHead className="text-right">합계</TableHead>
                    <TableHead className="text-right">수금액</TableHead>
                    <TableHead className="text-right">미수금</TableHead>
                    <TableHead className="text-center">상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ledgers.map((ledger: any) => (
                    <TableRow key={ledger.id}>
                      <TableCell className="font-mono text-sm">{ledger.ledgerNumber}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(ledger.ledgerDate), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{ledger.orderNumber}</TableCell>
                      <TableCell className="text-right">
                        {Number(ledger.supplyAmount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(ledger.vatAmount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(ledger.totalAmount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {Number(ledger.receivedAmount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-600">
                        {Number(ledger.outstandingAmount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(ledger.paymentStatus)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts">
          <Card>
            <CardHeader>
              <CardTitle>수금 이력</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>수금번호</TableHead>
                    <TableHead>수금일</TableHead>
                    <TableHead>전표번호</TableHead>
                    <TableHead>주문번호</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>결제방법</TableHead>
                    <TableHead>메모</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.receipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        수금 이력이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.receipts.map((receipt: any) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="font-mono text-sm">{receipt.receiptNumber}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(receipt.receiptDate), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{receipt.ledgerNumber}</TableCell>
                        <TableCell className="font-mono text-sm">{receipt.orderNumber}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {Number(receipt.amount).toLocaleString()}원
                        </TableCell>
                        <TableCell>{receipt.paymentMethod}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {receipt.note || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

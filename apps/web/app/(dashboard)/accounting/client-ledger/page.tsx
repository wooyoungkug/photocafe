'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  Search,
  Download,
  Building2,
  TrendingUp,
  TrendingDown,
  Banknote,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClientLedgers } from '@/hooks/use-client-ledger';
import { toast } from '@/hooks/use-toast';

export default function ClientLedgerPage() {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // 전체 거래처 데이터 (매출+매입)
  const { data, isLoading } = useClientLedgers({
    clientType: 'all',
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: search || undefined,
    page,
    limit,
  });

  const summary = data?.summary;
  const clients = data?.data || [];
  const meta = data?.meta;

  // CSV 다운로드
  const handleExportCSV = () => {
    if (!clients.length) {
      toast({ title: '다운로드할 데이터가 없습니다.', variant: 'destructive' });
      return;
    }

    const headers = [
      '거래처코드',
      '거래처명',
      '사업자번호',
      '매출액',
      '입금액',
      '매출미수금',
      '매출건수',
      '매입액',
      '지급액',
      '매입미지급',
      '매입건수',
    ];

    const rows = clients.map((c) => [
      c.clientCode,
      c.clientName,
      c.businessNumber || '',
      Math.round(c.totalSales).toString(),
      Math.round(c.totalReceived).toString(),
      Math.round(c.salesOutstanding).toString(),
      c.salesCount.toString(),
      Math.round(c.totalPurchases).toString(),
      Math.round(c.totalPaid).toString(),
      Math.round(c.purchaseOutstanding).toString(),
      c.purchaseCount.toString(),
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `거래처원장_${format(new Date(), 'yyyyMMdd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'CSV 파일이 다운로드되었습니다.' });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">거래처원장</h1>
          <p className="text-muted-foreground">
            거래처별 매출/매입 거래내역 및 잔액을 조회합니다.
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          CSV 다운로드
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">거래처 수</p>
                <p className="text-2xl font-bold text-blue-900">
                  {summary?.clientCount || 0}개
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">총 매출액</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {Math.round(summary?.totalSales || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">매출 미수금</p>
                <p className="text-2xl font-bold text-red-900">
                  {Math.round(
                    summary?.totalSalesOutstanding || 0,
                  ).toLocaleString()}
                  원
                </p>
              </div>
              <div className="h-12 w-12 bg-red-500 rounded-xl flex items-center justify-center">
                <Banknote className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">총 매입액</p>
                <p className="text-2xl font-bold text-purple-900">
                  {Math.round(
                    summary?.totalPurchases || 0,
                  ).toLocaleString()}
                  원
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label>거래처 검색</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="거래처명 또는 거래처코드"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>시작일</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>종료일</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[100px]">거래처코드</TableHead>
                      <TableHead>거래처명</TableHead>
                      <TableHead className="text-right">매출액</TableHead>
                      <TableHead className="text-right">입금액</TableHead>
                      <TableHead className="text-right">매출미수금</TableHead>
                      <TableHead className="text-center">매출건수</TableHead>
                      <TableHead className="text-right">매입액</TableHead>
                      <TableHead className="text-right">지급액</TableHead>
                      <TableHead className="text-right">매입미지급</TableHead>
                      <TableHead className="text-center">매입건수</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!clients.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={11}
                          className="text-center py-16 text-muted-foreground"
                        >
                          거래 내역이 있는 거래처가 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      clients.map((client) => (
                        <TableRow
                          key={client.clientId}
                          className="hover:bg-slate-50"
                        >
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {client.clientCode}
                          </TableCell>
                          <TableCell className="font-medium">
                            {client.clientName}
                          </TableCell>
                          <TableCell className="text-right">
                            {Math.round(client.totalSales).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600">
                            {Math.round(client.totalReceived).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            {client.salesOutstanding > 0
                              ? Math.round(
                                  client.salesOutstanding,
                                ).toLocaleString()
                              : '-'}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {client.salesCount}건
                          </TableCell>
                          <TableCell className="text-right">
                            {client.totalPurchases > 0
                              ? Math.round(
                                  client.totalPurchases,
                                ).toLocaleString()
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            {client.totalPaid > 0
                              ? Math.round(client.totalPaid).toLocaleString()
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-orange-600">
                            {client.purchaseOutstanding > 0
                              ? Math.round(
                                  client.purchaseOutstanding,
                                ).toLocaleString()
                              : '-'}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {client.purchaseCount > 0
                              ? `${client.purchaseCount}건`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/accounting/client-ledger/${client.clientId}`}
                            >
                              <Button variant="ghost" size="icon">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    총 {meta.total}개 중 {(page - 1) * limit + 1}-
                    {Math.min(page * limit, meta.total)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      {page} / {meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(meta.totalPages, p + 1))
                      }
                      disabled={page >= meta.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  MoreHorizontal,
  Receipt,
  TrendingDown,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useReceivables, useReceivableSummary, useCreatePayment } from '@/hooks/use-accounting';
import { useAgingAnalysis, useClientSalesSummary, useSalesLedgers, useAddSalesReceipt } from '@/hooks/use-sales-ledger';
import { toast } from '@/hooks/use-toast';
import type { Receivable } from '@/lib/types/accounting';
import { AgingChart } from './components/aging-chart';
import Link from 'next/link';

export default function ReceivablesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<any>(null);

  // 거래처별 미수금 집계 데이터 사용
  const { data: clientSummary, isLoading: isLoadingSummary } = useClientSalesSummary();
  const { data: summary } = useReceivableSummary();
  const { data: agingData } = useAgingAnalysis();
  const { data: recentSales } = useSalesLedgers({ limit: 5, paymentStatus: 'unpaid' });
  const createPayment = useCreatePayment();
  const addReceipt = useAddSalesReceipt();

  // Aging 비율 계산
  const agingTotal = agingData
    ? agingData.under30 + agingData.days30to60 + agingData.days60to90 + agingData.over90
    : 0;
  const agingPercent = {
    under30: agingTotal > 0 ? (agingData!.under30 / agingTotal) * 100 : 0,
    days30to60: agingTotal > 0 ? (agingData!.days30to60 / agingTotal) * 100 : 0,
    days60to90: agingTotal > 0 ? (agingData!.days60to90 / agingTotal) * 100 : 0,
    over90: agingTotal > 0 ? (agingData!.over90 / agingTotal) * 100 : 0,
  };

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: 'bank_transfer',
    description: '',
  });

  const handleOpenPaymentDialog = (receivable: any) => {
    setSelectedReceivable(receivable);
    setPaymentForm({
      amount: receivable.remainingAmount,
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: 'bank_transfer',
      description: '',
    });
    setIsPaymentDialogOpen(true);
  };

  const handlePayment = async () => {
    if (paymentForm.amount <= 0) {
      toast({ title: '수금액을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      // 해당 거래처의 미수금 중 가장 오래된 건을 조회하여 수금 처리
      // 간단한 구현: Payment 생성 (향후 매출원장과 연결 필요)
      await createPayment.mutateAsync({
        type: 'income',
        amount: paymentForm.amount,
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod as any,
        clientId: selectedReceivable?.clientId,
        clientName: selectedReceivable?.clientName,
        description: paymentForm.description || `${selectedReceivable?.clientName} 미수금 수금`,
      });
      toast({ title: '수금이 처리되었습니다.' });
      setIsPaymentDialogOpen(false);
    } catch (error) {
      console.error('수금 처리 오류:', error);
      toast({ title: '수금 처리에 실패했습니다.', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      outstanding: { label: '미수', color: 'bg-orange-100 text-orange-700', icon: Clock },
      partial: { label: '부분수금', color: 'bg-blue-100 text-blue-700', icon: TrendingDown },
      paid: { label: '완납', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      overdue: { label: '연체', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
    };
    const config = configs[status] || configs.outstanding;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-xs flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getCollectionRate = (paid: number, total: number) => {
    return total > 0 ? Math.round((paid / total) * 100) : 0;
  };

  // CSV 다운로드 함수
  const handleDownloadCSV = () => {
    if (!clientSummary || clientSummary.length === 0) {
      toast({ title: '다운로드할 데이터가 없습니다.', variant: 'destructive' });
      return;
    }

    // CSV 헤더
    const headers = ['거래처코드', '거래처명', '총매출', '수금액', '미수금', '수금률(%)', '거래건수'];

    // CSV 데이터 행
    const rows = clientSummary.map(item => [
      item.clientCode || '',
      item.clientName || '',
      item.totalSales?.toString() || '0',
      item.totalReceived?.toString() || '0',
      item.outstanding?.toString() || '0',
      getCollectionRate(item.totalReceived || 0, item.totalSales || 0).toString(),
      item.ledgerCount?.toString() || '0',
    ]);

    // CSV 문자열 생성 (UTF-8 BOM 추가하여 한글 깨짐 방지)
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    // Blob 생성 및 다운로드
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `미수금관리_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'CSV 파일이 다운로드되었습니다.' });
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">미수금 관리</h1>
          <p className="text-muted-foreground">거래처별 미수금 현황을 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV 다운로드
          </Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">총 미수금</p>
                <p className="text-2xl font-bold text-orange-900">
                  {(summary?.totalReceivables || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-2 text-xs text-orange-600">
              {summary?.clientCount || 0}개 거래처
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">연체금액</p>
                <p className="text-2xl font-bold text-red-900">
                  {(summary?.overdueAmount || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-red-500 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">30일 이내</p>
                <p className="text-2xl font-bold text-blue-900">
                  {(summary?.aging?.under30 || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">90일 초과</p>
                <p className="text-2xl font-bold text-purple-900">
                  {(summary?.aging?.over90 || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging 분석 바 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aging 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground">30일 이내</div>
              <Progress value={agingPercent.under30} className="flex-1 h-3" />
              <div className="w-32 text-right text-sm font-medium">
                {(agingData?.under30 || 0).toLocaleString()}원
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground">31~60일</div>
              <Progress value={agingPercent.days30to60} className="flex-1 h-3 [&>div]:bg-yellow-500" />
              <div className="w-32 text-right text-sm font-medium">
                {(agingData?.days30to60 || 0).toLocaleString()}원
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground">61~90일</div>
              <Progress value={agingPercent.days60to90} className="flex-1 h-3 [&>div]:bg-orange-500" />
              <div className="w-32 text-right text-sm font-medium">
                {(agingData?.days60to90 || 0).toLocaleString()}원
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground">90일 초과</div>
              <Progress value={agingPercent.over90} className="flex-1 h-3 [&>div]:bg-red-500" />
              <div className="w-32 text-right text-sm font-medium">
                {(agingData?.over90 || 0).toLocaleString()}원
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aging 분석 차트 */}
      {agingData && <AgingChart data={agingData} />}

      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="거래처명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="outstanding">미수</SelectItem>
                <SelectItem value="partial">부분수금</SelectItem>
                <SelectItem value="overdue">연체</SelectItem>
                <SelectItem value="paid">완납</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              필터 초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 미수금 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>미수금 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>거래처</TableHead>
                <TableHead className="text-right">발생금액</TableHead>
                <TableHead className="text-right">수금액</TableHead>
                <TableHead className="text-right">잔액</TableHead>
                <TableHead className="text-center">수금률</TableHead>
                <TableHead className="text-center">수금예정일</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingSummary ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : !clientSummary?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    미수금 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                clientSummary
                  .filter((item: any) => item.outstanding > 0)
                  .filter((item: any) =>
                    searchTerm ? item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) : true
                  )
                  .map((item: any) => {
                    const rate = getCollectionRate(item.totalReceived, item.totalSales);
                    const status = item.outstanding === 0 ? 'paid' : (item.totalReceived > 0 ? 'partial' : 'outstanding');
                    return (
                      <TableRow key={item.clientId} className="hover:bg-slate-50">
                        <TableCell>
                          <Link href={`/accounting/receivables/${item.clientId}`}>
                            <div className="cursor-pointer hover:text-primary">
                              <div className="font-medium">{item.clientName}</div>
                              <div className="text-xs text-muted-foreground">{item.clientCode}</div>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.totalSales.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {item.totalReceived.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold text-orange-600">
                          {item.outstanding.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={rate} className="w-16 h-2" />
                            <span className="text-xs text-muted-foreground">{rate}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {item.lastOrderDate ? format(new Date(item.lastOrderDate), 'yyyy-MM-dd') : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPaymentDialog({
                                clientId: item.clientId,
                                clientName: item.clientName,
                                remainingAmount: item.outstanding,
                              })}
                              disabled={status === 'paid'}
                            >
                              <Receipt className="h-3 w-3 mr-1" />
                              수금
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 최근 매출 내역 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 미수 매출 (5건)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>전표번호</TableHead>
                <TableHead>거래처</TableHead>
                <TableHead>주문번호</TableHead>
                <TableHead>매출일</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead className="text-right">미수금</TableHead>
                <TableHead className="text-center">결제상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSales?.data?.map((sale: any) => (
                <TableRow key={sale.id} className="hover:bg-slate-50">
                  <TableCell className="font-mono text-sm">{sale.ledgerNumber}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{sale.clientName}</div>
                      <div className="text-xs text-muted-foreground">{sale.client?.clientCode}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{sale.orderNumber}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(sale.ledgerDate), 'yyyy-MM-dd')}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(sale.totalAmount).toLocaleString()}원
                  </TableCell>
                  <TableCell className="text-right font-bold text-orange-600">
                    {Number(sale.outstandingAmount).toLocaleString()}원
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(sale.paymentStatus)}
                  </TableCell>
                </TableRow>
              )) || (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    최근 미수 매출 내역이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 수금 등록 다이얼로그 */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>수금 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">거래처</span>
                <span className="font-medium">{selectedReceivable?.clientName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">미수금 잔액</span>
                <span className="font-bold text-orange-600">
                  {selectedReceivable?.remainingAmount?.toLocaleString()}원
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>수금일자</Label>
              <Input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>수금액</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                max={selectedReceivable?.remainingAmount}
              />
            </div>

            <div className="space-y-2">
              <Label>결제방법</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">계좌이체</SelectItem>
                  <SelectItem value="cash">현금</SelectItem>
                  <SelectItem value="card">카드</SelectItem>
                  <SelectItem value="check">수표</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>메모</Label>
              <Input
                value={paymentForm.description}
                onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                placeholder="수금 내용을 입력하세요"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handlePayment} disabled={createPayment.isPending}>
              수금 등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

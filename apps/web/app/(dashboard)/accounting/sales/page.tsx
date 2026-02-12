'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Search,
  TrendingUp,
  Receipt,
  FileText,
  AlertTriangle,
  Filter,
  CreditCard,
  CheckCircle,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

import {
  useSalesLedgers,
  useSalesLedgerSummary,
  useClientSalesSummary,
  useAddSalesReceipt,
  useConfirmSales,
} from '@/hooks/use-sales-ledger';
import {
  SalesLedger,
  SALES_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  RECEIPT_METHOD_OPTIONS,
} from '@/lib/types/sales-ledger';
import { toast } from '@/hooks/use-toast';

export default function SalesLedgerPage() {
  // ===== 필터 상태 =====
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [salesStatusFilter, setSalesStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  // ===== 상세 보기 Dialog =====
  const [selectedLedger, setSelectedLedger] = useState<SalesLedger | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // ===== 수금 처리 Dialog =====
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<SalesLedger | null>(null);
  const [receiptForm, setReceiptForm] = useState({
    receiptDate: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    paymentMethod: 'bank_transfer',
    bankName: '',
    depositorName: '',
    note: '',
  });

  // ===== 데이터 조회 =====
  const { data: ledgerData, isLoading } = useSalesLedgers({
    search: searchTerm || undefined,
    paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
    salesStatus: salesStatusFilter !== 'all' ? salesStatusFilter : undefined,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
  });
  const { data: summary } = useSalesLedgerSummary();
  const { data: clientSummary } = useClientSalesSummary({
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
  });

  // ===== 뮤테이션 =====
  const addReceipt = useAddSalesReceipt();
  const confirmSales = useConfirmSales();

  // ===== 상세 보기 =====
  const handleRowClick = (ledger: SalesLedger) => {
    setSelectedLedger(ledger);
    setIsDetailOpen(true);
  };

  // ===== 수금 처리 Dialog 열기 =====
  const openReceiptDialog = (ledger: SalesLedger) => {
    setReceiptTarget(ledger);
    setReceiptForm({
      receiptDate: format(new Date(), 'yyyy-MM-dd'),
      amount: ledger.outstandingAmount,
      paymentMethod: 'bank_transfer',
      bankName: '',
      depositorName: '',
      note: '',
    });
    setIsReceiptOpen(true);
  };

  // ===== 수금 처리 제출 =====
  const handleReceiptSubmit = async () => {
    if (!receiptTarget) return;

    if (receiptForm.amount <= 0) {
      toast({ title: '수금액을 입력해주세요.', variant: 'destructive' });
      return;
    }

    if (receiptForm.amount > receiptTarget.outstandingAmount) {
      toast({ title: '수금액이 미수금 잔액을 초과할 수 없습니다.', variant: 'destructive' });
      return;
    }

    try {
      await addReceipt.mutateAsync({
        salesLedgerId: receiptTarget.id,
        data: {
          receiptDate: receiptForm.receiptDate,
          amount: receiptForm.amount,
          paymentMethod: receiptForm.paymentMethod,
          bankName: receiptForm.bankName || undefined,
          depositorName: receiptForm.depositorName || undefined,
          note: receiptForm.note || undefined,
        },
      });
      toast({ title: '수금이 처리되었습니다.' });
      setIsReceiptOpen(false);
      setReceiptTarget(null);
    } catch {
      toast({ title: '수금 처리에 실패했습니다.', variant: 'destructive' });
    }
  };

  // ===== 매출 확정 =====
  const handleConfirmSales = async (ledgerId: string) => {
    try {
      await confirmSales.mutateAsync(ledgerId);
      toast({ title: '매출이 확정되었습니다.' });
      setIsDetailOpen(false);
    } catch {
      toast({ title: '매출 확정에 실패했습니다.', variant: 'destructive' });
    }
  };

  // ===== 필터 초기화 =====
  const resetFilters = () => {
    setSearchTerm('');
    setPaymentStatusFilter('all');
    setSalesStatusFilter('all');
    setDateRange({
      start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  // ===== Badge 렌더링 =====
  const getPaymentStatusBadge = (status: string) => {
    const config = PAYMENT_STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge className={`${config?.color || 'bg-gray-100 text-gray-800'} text-xs`}>
        {config?.label || status}
      </Badge>
    );
  };

  const getSalesStatusBadge = (status: string) => {
    const config = SALES_STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge className={`${config?.color || 'bg-gray-100 text-gray-800'} text-xs`}>
        {config?.label || status}
      </Badge>
    );
  };

  const getReceiptMethodLabel = (method: string) => {
    return RECEIPT_METHOD_OPTIONS.find((m) => m.value === method)?.label || method;
  };

  // ===== 거래처별 미수금 합계 맵 =====
  const clientOutstandingMap = useMemo(() => {
    const map = new Map<string, number>();
    if (clientSummary) {
      clientSummary.forEach((c) => map.set(c.clientId, c.outstanding));
    }
    return map;
  }, [clientSummary]);

  // ===== 목록 데이터 =====
  const ledgers = ledgerData?.data || [];

  return (
    <div className="space-y-4">
      {/* 헤더: 제목 + 필터 인라인 */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2 shrink-0">
          <FileText className="h-5 w-5" />
          매출원장
        </h1>
        <div className="flex items-center gap-2">
          <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue placeholder="결제상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 결제</SelectItem>
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={salesStatusFilter} onValueChange={setSalesStatusFilter}>
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue placeholder="매출상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">매출확정</SelectItem>
              {SALES_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="w-[140px] h-9 text-xs"
          />
          <span className="text-muted-foreground text-sm">~</span>
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="w-[140px] h-9 text-xs"
          />
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="주문번호, 거래처명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={resetFilters}>
            <Filter className="h-3.5 w-3.5 mr-1" />
            초기화
          </Button>
        </div>
      </div>

      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 당월 매출 */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium">당월 매출</p>
                <p className="text-xl font-bold text-blue-900">
                  {(summary?.totalSales || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-blue-600">
              전표 {summary?.ledgerCount || 0}건 / 거래처 {summary?.clientCount || 0}곳
            </p>
          </CardContent>
        </Card>

        {/* 수금 완료 */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium">수금 완료</p>
                <p className="text-xl font-bold text-green-900">
                  {(summary?.totalReceived || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-10 w-10 bg-green-500 rounded-xl flex items-center justify-center">
                <Receipt className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-green-600">
              수금률{' '}
              {summary?.totalSales
                ? Math.round((summary.totalReceived / summary.totalSales) * 100)
                : 0}
              %
            </p>
          </CardContent>
        </Card>

        {/* 미수금 잔액 */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 font-medium">미수금 잔액</p>
                <p className="text-xl font-bold text-orange-900">
                  {(summary?.totalOutstanding || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-10 w-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 연체 금액 */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-medium">연체 금액</p>
                <p className="text-xl font-bold text-red-900">
                  {(summary?.totalOverdue || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-10 w-10 bg-red-500 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 거래처별 미수금 합계 */}
      {clientSummary && clientSummary.filter((c) => c.outstanding > 0).length > 0 && (
        <Card>
          <CardContent className="py-3 px-4">
            <h3 className="text-sm font-semibold mb-2">거래처별 미수금 합계</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead className="text-xs w-[100px]">거래처코드</TableHead>
                    <TableHead className="text-xs">거래처명</TableHead>
                    <TableHead className="text-right text-xs w-[80px]">건수</TableHead>
                    <TableHead className="text-right text-xs w-[120px]">총 매출</TableHead>
                    <TableHead className="text-right text-xs w-[120px]">수금액</TableHead>
                    <TableHead className="text-right text-xs w-[120px]">미수금 잔액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientSummary
                    .filter((c) => c.outstanding > 0)
                    .map((client) => (
                      <TableRow key={client.clientId}>
                        <TableCell className="font-mono text-xs">{client.clientCode}</TableCell>
                        <TableCell className="text-xs font-medium">{client.clientName}</TableCell>
                        <TableCell className="text-right text-xs">{client.orderCount}건</TableCell>
                        <TableCell className="text-right text-xs">
                          {client.totalSales.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs text-green-600">
                          {client.totalReceived.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs text-orange-600 font-bold">
                          {client.outstanding.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/40 font-bold">
                    <TableCell colSpan={3} className="text-right text-xs">합계</TableCell>
                    <TableCell className="text-right text-xs">
                      {clientSummary
                        .filter((c) => c.outstanding > 0)
                        .reduce((sum, c) => sum + c.totalSales, 0)
                        .toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-xs text-green-600">
                      {clientSummary
                        .filter((c) => c.outstanding > 0)
                        .reduce((sum, c) => sum + c.totalReceived, 0)
                        .toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-xs text-orange-600">
                      {clientSummary
                        .filter((c) => c.outstanding > 0)
                        .reduce((sum, c) => sum + c.outstanding, 0)
                        .toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 조회결과 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          조회결과 : <b className="text-foreground">{ledgers.length}</b> 건
        </span>
      </div>

      {/* 매출원장 테이블 */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      ) : ledgers.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="w-[140px] text-xs">전표번호</TableHead>
                  <TableHead className="w-[90px] text-xs">전표일자</TableHead>
                  <TableHead className="w-[140px] text-xs">주문번호</TableHead>
                  <TableHead className="w-[80px] text-xs">거래처</TableHead>
                  <TableHead className="text-right w-[90px] text-xs">공급가액</TableHead>
                  <TableHead className="text-right w-[80px] text-xs">부가세</TableHead>
                  <TableHead className="text-right w-[80px] text-xs">할인금액</TableHead>
                  <TableHead className="text-right w-[100px] text-xs">합계금액</TableHead>
                  <TableHead className="text-right w-[100px] text-xs">미수금액</TableHead>
                  <TableHead className="text-right w-[100px] text-xs">거래처미수합계</TableHead>
                  <TableHead className="text-center w-[70px] text-xs">결제상태</TableHead>
                  <TableHead className="text-center w-[80px] text-xs">수금처리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgers.map((ledger) => (
                  <TableRow
                    key={ledger.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => handleRowClick(ledger)}
                  >
                    <TableCell className="font-mono text-xs text-blue-600 font-medium py-2 whitespace-nowrap">
                      {ledger.ledgerNumber}
                    </TableCell>
                    <TableCell className="font-mono text-xs py-2 whitespace-nowrap">
                      {format(new Date(ledger.ledgerDate), 'yyyy-MM-dd')}
                    </TableCell>
                    <TableCell className="font-mono text-xs py-2 whitespace-nowrap">
                      {ledger.orderNumber}
                    </TableCell>
                    <TableCell className="text-xs font-medium py-2 whitespace-nowrap">{ledger.clientName}</TableCell>
                    <TableCell className="text-right text-xs py-2 whitespace-nowrap">
                      {Number(ledger.supplyAmount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-xs py-2 whitespace-nowrap text-muted-foreground">
                      {Number(ledger.vatAmount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-xs py-2 whitespace-nowrap text-red-500">
                      {Number(ledger.adjustmentAmount || 0) > 0
                        ? `-${Number(ledger.adjustmentAmount || 0).toLocaleString()}`
                        : '0'}
                    </TableCell>
                    <TableCell className="text-right text-xs py-2 whitespace-nowrap font-bold text-blue-600">
                      {Number(ledger.totalAmount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-xs py-2 whitespace-nowrap text-orange-600 font-medium">
                      {Number(ledger.outstandingAmount) > 0 ? Number(ledger.outstandingAmount).toLocaleString() : '0'}
                    </TableCell>
                    <TableCell className="text-right text-xs py-2 whitespace-nowrap text-red-600 font-bold">
                      {(clientOutstandingMap.get(ledger.clientId) || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center py-2">
                      {getPaymentStatusBadge(ledger.paymentStatus)}
                    </TableCell>
                    <TableCell className="text-center py-2">
                      {ledger.outstandingAmount > 0 && ledger.salesStatus !== 'CANCELLED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            openReceiptDialog(ledger);
                          }}
                        >
                          <CreditCard className="h-3 w-3 mr-1" />
                          수금
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/40 font-bold">
                  <TableCell colSpan={4} className="text-right text-xs">합계</TableCell>
                  <TableCell className="text-right text-xs">
                    {ledgers.reduce((sum, l) => sum + Number(l.supplyAmount), 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {ledgers.reduce((sum, l) => sum + Number(l.vatAmount), 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-xs text-red-500">
                    {(() => {
                      const total = ledgers.reduce((sum, l) => sum + Number(l.adjustmentAmount || 0), 0);
                      return total > 0 ? `-${total.toLocaleString()}` : '0';
                    })()}
                  </TableCell>
                  <TableCell className="text-right text-xs text-blue-600">
                    {ledgers.reduce((sum, l) => sum + Number(l.totalAmount), 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-xs text-orange-600">
                    {(() => {
                      const total = ledgers.reduce((sum, l) => sum + Number(l.outstandingAmount), 0);
                      return total > 0 ? total.toLocaleString() : '0';
                    })()}
                  </TableCell>
                  <TableCell />
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              매출원장 데이터가 없습니다
            </h3>
            <p className="text-gray-500 text-sm">
              조건에 맞는 매출 데이터가 없습니다.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ===== 상세 보기 Dialog ===== */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>매출원장 상세</DialogTitle>
            <DialogDescription>
              {selectedLedger?.ledgerNumber} 전표 상세 정보
            </DialogDescription>
          </DialogHeader>

          {selectedLedger && (
            <div className="space-y-6 mt-2">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">전표번호</span>
                    <span className="font-mono font-medium">{selectedLedger.ledgerNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">전표일자</span>
                    <span>{format(new Date(selectedLedger.ledgerDate), 'yyyy-MM-dd')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">주문번호</span>
                    <span className="font-mono">{selectedLedger.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">거래처</span>
                    <span className="font-medium">{selectedLedger.clientName}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">결제상태</span>
                    {getPaymentStatusBadge(selectedLedger.paymentStatus)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">매출상태</span>
                    {getSalesStatusBadge(selectedLedger.salesStatus)}
                  </div>
                  {selectedLedger.dueDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">결제기한</span>
                      <span>{format(new Date(selectedLedger.dueDate), 'yyyy-MM-dd')}</span>
                    </div>
                  )}
                  {selectedLedger.description && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">비고</span>
                      <span>{selectedLedger.description}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* 금액 정보 */}
              <div>
                <h4 className="font-semibold mb-3">금액 정보</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-slate-50 p-3 rounded-lg text-center">
                    <p className="text-muted-foreground">공급가액</p>
                    <p className="text-lg font-bold">
                      {selectedLedger.supplyAmount.toLocaleString()}원
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg text-center">
                    <p className="text-muted-foreground">부가세</p>
                    <p className="text-lg font-bold">
                      {selectedLedger.vatAmount.toLocaleString()}원
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-blue-600">합계</p>
                    <p className="text-lg font-bold text-blue-700">
                      {selectedLedger.totalAmount.toLocaleString()}원
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-green-600">수금액</p>
                    <p className="text-lg font-bold text-green-700">
                      {selectedLedger.receivedAmount.toLocaleString()}원
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg text-center">
                    <p className="text-orange-600">미수금</p>
                    <p className="text-lg font-bold text-orange-700">
                      {selectedLedger.outstandingAmount.toLocaleString()}원
                    </p>
                  </div>
                </div>
              </div>

              {/* 라인아이템 */}
              {selectedLedger.items && selectedLedger.items.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">품목 내역</h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/60">
                          <TableHead>품목명</TableHead>
                          <TableHead className="text-right">수량</TableHead>
                          <TableHead className="text-right">단가</TableHead>
                          <TableHead className="text-right">공급가액</TableHead>
                          <TableHead className="text-right">부가세</TableHead>
                          <TableHead className="text-right">합계</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLedger.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <span className="font-medium">{item.itemName}</span>
                                {item.specification && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({item.specification})
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              {item.unitPrice.toLocaleString()}원
                            </TableCell>
                            <TableCell className="text-right">
                              {item.supplyAmount.toLocaleString()}원
                            </TableCell>
                            <TableCell className="text-right">
                              {item.vatAmount.toLocaleString()}원
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.totalAmount.toLocaleString()}원
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {/* 수금 이력 */}
              {selectedLedger.receipts && selectedLedger.receipts.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">수금 이력</h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/60">
                          <TableHead>수금번호</TableHead>
                          <TableHead>수금일자</TableHead>
                          <TableHead className="text-right">수금액</TableHead>
                          <TableHead>결제수단</TableHead>
                          <TableHead>입금은행</TableHead>
                          <TableHead>입금자명</TableHead>
                          <TableHead>비고</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLedger.receipts.map((receipt) => (
                          <TableRow key={receipt.id}>
                            <TableCell className="font-mono text-sm">
                              {receipt.receiptNumber}
                            </TableCell>
                            <TableCell>
                              {format(new Date(receipt.receiptDate), 'yyyy-MM-dd')}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {receipt.amount.toLocaleString()}원
                            </TableCell>
                            <TableCell>{getReceiptMethodLabel(receipt.paymentMethod)}</TableCell>
                            <TableCell>{receipt.bankName || '-'}</TableCell>
                            <TableCell>{receipt.depositorName || '-'}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {receipt.note || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {/* 하단 액션 버튼 */}
              <DialogFooter className="gap-2">
                {selectedLedger.outstandingAmount > 0 &&
                  selectedLedger.salesStatus !== 'CANCELLED' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsDetailOpen(false);
                        openReceiptDialog(selectedLedger);
                      }}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      수금 처리
                    </Button>
                  )}
                {selectedLedger.salesStatus === 'REGISTERED' && (
                  <Button
                    onClick={() => handleConfirmSales(selectedLedger.id)}
                    disabled={confirmSales.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    매출 확정
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  닫기
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== 수금 처리 Dialog ===== */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>수금 처리</DialogTitle>
            <DialogDescription>
              {receiptTarget?.ledgerNumber} - {receiptTarget?.clientName}
            </DialogDescription>
          </DialogHeader>

          {receiptTarget && (
            <div className="space-y-4 mt-2">
              {/* 미수금 잔액 안내 */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                <p className="text-sm text-orange-600">미수금 잔액</p>
                <p className="text-xl font-bold text-orange-700">
                  {receiptTarget.outstandingAmount.toLocaleString()}원
                </p>
              </div>

              {/* 수금일자 */}
              <div className="space-y-2">
                <Label>수금일자 *</Label>
                <Input
                  type="date"
                  value={receiptForm.receiptDate}
                  onChange={(e) =>
                    setReceiptForm({ ...receiptForm, receiptDate: e.target.value })
                  }
                />
              </div>

              {/* 수금액 */}
              <div className="space-y-2">
                <Label>수금액 *</Label>
                <Input
                  type="number"
                  value={receiptForm.amount}
                  onChange={(e) =>
                    setReceiptForm({
                      ...receiptForm,
                      amount: Math.min(Number(e.target.value), receiptTarget.outstandingAmount),
                    })
                  }
                  max={receiptTarget.outstandingAmount}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  최대 {receiptTarget.outstandingAmount.toLocaleString()}원
                </p>
              </div>

              {/* 결제수단 */}
              <div className="space-y-2">
                <Label>결제수단 *</Label>
                <Select
                  value={receiptForm.paymentMethod}
                  onValueChange={(v) =>
                    setReceiptForm({ ...receiptForm, paymentMethod: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECEIPT_METHOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 입금은행 */}
              <div className="space-y-2">
                <Label>입금은행</Label>
                <Input
                  value={receiptForm.bankName}
                  onChange={(e) =>
                    setReceiptForm({ ...receiptForm, bankName: e.target.value })
                  }
                  placeholder="예: 국민은행, 우리은행"
                />
              </div>

              {/* 입금자명 */}
              <div className="space-y-2">
                <Label>입금자명</Label>
                <Input
                  value={receiptForm.depositorName}
                  onChange={(e) =>
                    setReceiptForm({ ...receiptForm, depositorName: e.target.value })
                  }
                  placeholder="입금자명을 입력하세요"
                />
              </div>

              {/* 비고 */}
              <div className="space-y-2">
                <Label>비고</Label>
                <Textarea
                  value={receiptForm.note}
                  onChange={(e) =>
                    setReceiptForm({ ...receiptForm, note: e.target.value })
                  }
                  rows={2}
                  placeholder="추가 메모를 입력하세요"
                />
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setIsReceiptOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleReceiptSubmit} disabled={addReceipt.isPending}>
                  {addReceipt.isPending ? '처리 중...' : '수금 처리'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

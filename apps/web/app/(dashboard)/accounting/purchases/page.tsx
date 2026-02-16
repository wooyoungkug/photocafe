'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  TrendingDown,
  Receipt,
  FileText,
  AlertTriangle,
  Filter,
  CreditCard,
  CheckCircle,
  Trash2,
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
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  usePurchaseLedgers,
  usePurchaseLedgerSummary,
  useCreatePurchaseLedger,
  useAddPurchasePayment,
  useConfirmPurchase,
  useCancelPurchase,
  PurchaseLedger,
  PURCHASE_TYPE_OPTIONS,
  PURCHASE_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
} from '@/hooks/use-purchase-ledger';
import { toast } from '@/hooks/use-toast';

// ===== 품목 행 초기값 =====
interface ItemRow {
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  purchaseType: string;
  accountCode: string;
  remark: string;
}

const emptyItemRow: ItemRow = {
  itemName: '',
  specification: '',
  quantity: 1,
  unit: 'EA',
  unitPrice: 0,
  supplyAmount: 0,
  vatAmount: 0,
  totalAmount: 0,
  purchaseType: 'RAW_MATERIAL',
  accountCode: '',
  remark: '',
};

export default function PurchaseLedgerPage() {
  const router = useRouter();

  // ===== 필터 상태 =====
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  // ===== 상세 보기 Dialog =====
  const [selectedLedger, setSelectedLedger] = useState<PurchaseLedger | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // ===== 지급 처리 Dialog =====
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<PurchaseLedger | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    paymentMethod: 'bank_transfer',
    bankName: '',
    accountNumber: '',
    note: '',
  });

  // ===== 매입 등록 Dialog =====
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    supplierId: '',
    purchaseType: 'RAW_MATERIAL',
    accountCode: '501',
    supplyAmount: 0,
    vatAmount: 0,
    totalAmount: 0,
    paymentMethod: 'bank_transfer',
    dueDate: '',
    description: '',
  });
  const [itemRows, setItemRows] = useState<ItemRow[]>([{ ...emptyItemRow }]);

  // ===== 데이터 조회 =====
  const { data: ledgerData, isLoading } = usePurchaseLedgers({
    search: searchTerm || undefined,
    paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
    purchaseStatus: purchaseStatusFilter !== 'all' ? purchaseStatusFilter : undefined,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
  });
  const { data: summary } = usePurchaseLedgerSummary();

  // ===== 뮤테이션 =====
  const createPurchase = useCreatePurchaseLedger();
  const addPayment = useAddPurchasePayment();
  const confirmPurchase = useConfirmPurchase();
  const cancelPurchase = useCancelPurchase();

  // ===== 상세 보기 =====
  const handleRowClick = (ledger: PurchaseLedger) => {
    setSelectedLedger(ledger);
    setIsDetailOpen(true);
  };

  // ===== 지급 처리 Dialog 열기 =====
  const openPaymentDialog = (ledger: PurchaseLedger) => {
    setPaymentTarget(ledger);
    setPaymentForm({
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      amount: ledger.outstandingAmount,
      paymentMethod: 'bank_transfer',
      bankName: '',
      accountNumber: '',
      note: '',
    });
    setIsPaymentOpen(true);
  };

  // ===== 지급 처리 제출 =====
  const handlePaymentSubmit = async () => {
    if (!paymentTarget) return;

    if (paymentForm.amount <= 0) {
      toast({ title: '지급액을 입력해주세요.', variant: 'destructive' });
      return;
    }

    if (paymentForm.amount > paymentTarget.outstandingAmount) {
      toast({ title: '지급액이 미지급 잔액을 초과할 수 없습니다.', variant: 'destructive' });
      return;
    }

    try {
      await addPayment.mutateAsync({
        purchaseLedgerId: paymentTarget.id,
        data: {
          paymentDate: paymentForm.paymentDate,
          amount: paymentForm.amount,
          paymentMethod: paymentForm.paymentMethod,
          bankName: paymentForm.bankName || undefined,
          accountNumber: paymentForm.accountNumber || undefined,
          note: paymentForm.note || undefined,
        },
      });
      toast({ title: '지급이 처리되었습니다.' });
      setIsPaymentOpen(false);
      setPaymentTarget(null);
    } catch {
      toast({ title: '지급 처리에 실패했습니다.', variant: 'destructive' });
    }
  };

  // ===== 매입 확정 =====
  const handleConfirmPurchase = async (ledgerId: string) => {
    try {
      await confirmPurchase.mutateAsync(ledgerId);
      toast({ title: '매입이 확정되었습니다.' });
      setIsDetailOpen(false);
    } catch {
      toast({ title: '매입 확정에 실패했습니다.', variant: 'destructive' });
    }
  };

  // ===== 매입 취소 =====
  const handleCancelPurchase = async (ledgerId: string) => {
    try {
      await cancelPurchase.mutateAsync(ledgerId);
      toast({ title: '매입이 취소되었습니다.' });
      setIsDetailOpen(false);
    } catch {
      toast({ title: '매입 취소에 실패했습니다.', variant: 'destructive' });
    }
  };

  // ===== 매입 등록 제출 =====
  const handleCreateSubmit = async () => {
    if (!createForm.supplierId) {
      toast({ title: '매입처를 입력해주세요.', variant: 'destructive' });
      return;
    }

    const validItems = itemRows.filter((item) => item.itemName && item.unitPrice > 0);
    if (validItems.length === 0) {
      toast({ title: '최소 1개 이상의 품목을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      await createPurchase.mutateAsync({
        supplierId: createForm.supplierId,
        purchaseType: createForm.purchaseType,
        accountCode: createForm.accountCode,
        supplyAmount: createForm.supplyAmount,
        vatAmount: createForm.vatAmount,
        totalAmount: createForm.totalAmount,
        paymentMethod: createForm.paymentMethod,
        dueDate: createForm.dueDate || undefined,
        description: createForm.description || undefined,
        items: validItems.map((item) => ({
          itemName: item.itemName,
          specification: item.specification || undefined,
          quantity: item.quantity,
          unit: item.unit || undefined,
          unitPrice: item.unitPrice,
          supplyAmount: item.supplyAmount,
          vatAmount: item.vatAmount,
          totalAmount: item.totalAmount,
          purchaseType: item.purchaseType || undefined,
          accountCode: item.accountCode || undefined,
          remark: item.remark || undefined,
        })),
      });
      toast({ title: '매입이 등록되었습니다.' });
      setIsCreateOpen(false);
      resetCreateForm();
    } catch {
      toast({ title: '매입 등록에 실패했습니다.', variant: 'destructive' });
    }
  };

  // ===== 매입 등록 폼 초기화 =====
  const resetCreateForm = () => {
    setCreateForm({
      supplierId: '',
      purchaseType: 'RAW_MATERIAL',
      accountCode: '501',
      supplyAmount: 0,
      vatAmount: 0,
      totalAmount: 0,
      paymentMethod: 'bank_transfer',
      dueDate: '',
      description: '',
    });
    setItemRows([{ ...emptyItemRow }]);
  };

  // ===== 품목 행 추가 =====
  const addItemRow = () => {
    setItemRows([...itemRows, { ...emptyItemRow }]);
  };

  // ===== 품목 행 삭제 =====
  const removeItemRow = (index: number) => {
    if (itemRows.length <= 1) return;
    const newRows = itemRows.filter((_, i) => i !== index);
    setItemRows(newRows);
    recalculateTotals(newRows);
  };

  // ===== 품목 행 업데이트 =====
  const updateItemRow = (index: number, field: keyof ItemRow, value: string | number) => {
    const newRows = [...itemRows];
    const row = { ...newRows[index], [field]: value };

    // 수량 또는 단가 변경 시 자동 계산
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = field === 'quantity' ? Number(value) : row.quantity;
      const price = field === 'unitPrice' ? Number(value) : row.unitPrice;
      row.supplyAmount = qty * price;
      row.vatAmount = Math.round(row.supplyAmount * 0.1);
      row.totalAmount = row.supplyAmount + row.vatAmount;
    }

    newRows[index] = row;
    setItemRows(newRows);
    recalculateTotals(newRows);
  };

  // ===== 합계 재계산 =====
  const recalculateTotals = (rows: ItemRow[]) => {
    const supplyAmount = rows.reduce((sum, row) => sum + row.supplyAmount, 0);
    const vatAmount = rows.reduce((sum, row) => sum + row.vatAmount, 0);
    const totalAmount = rows.reduce((sum, row) => sum + row.totalAmount, 0);
    setCreateForm((prev) => ({ ...prev, supplyAmount, vatAmount, totalAmount }));
  };

  // ===== 필터 초기화 =====
  const resetFilters = () => {
    setSearchTerm('');
    setPaymentStatusFilter('all');
    setPurchaseStatusFilter('all');
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

  const getPurchaseStatusBadge = (status: string) => {
    const config = PURCHASE_STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge className={`${config?.color || 'bg-gray-100 text-gray-800'} text-xs`}>
        {config?.label || status}
      </Badge>
    );
  };

  const getPurchaseTypeLabel = (type: string) => {
    const config = PURCHASE_TYPE_OPTIONS.find((t) => t.value === type);
    return config ? (
      <Badge className={`${config.color} text-xs`}>{config.label}</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-700 text-xs">{type}</Badge>
    );
  };

  const getPaymentMethodLabel = (method: string) => {
    return PAYMENT_METHOD_OPTIONS.find((m) => m.value === method)?.label || method;
  };

  // ===== 목록 데이터 =====
  const ledgers = ledgerData?.data || [];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">매입원장</h1>
          <p className="text-muted-foreground">매입원장을 조회하고 지급 처리를 관리합니다.</p>
        </div>
        <Button onClick={() => router.push('/accounting/purchases/new')}>
          <Plus className="h-4 w-4 mr-2" />
          매입 등록
        </Button>
      </div>

      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 당월 매입 */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">당월 매입</p>
                <p className="text-2xl font-bold text-red-900">
                  {(summary?.totalPurchases || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-red-500 rounded-xl flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="mt-2 text-xs text-red-600">
              전표 {summary?.ledgerCount || 0}건 / 매입처 {summary?.supplierCount || 0}곳
            </p>
          </CardContent>
        </Card>

        {/* 지급 완료 */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">지급 완료</p>
                <p className="text-2xl font-bold text-green-900">
                  {(summary?.totalPaid || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-green-500 rounded-xl flex items-center justify-center">
                <Receipt className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="mt-2 text-xs text-green-600">
              지급률{' '}
              {summary?.totalPurchases
                ? Math.round((summary.totalPaid / summary.totalPurchases) * 100)
                : 0}
              %
            </p>
          </CardContent>
        </Card>

        {/* 미지급 잔액 */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">미지급 잔액</p>
                <p className="text-2xl font-bold text-orange-900">
                  {(summary?.totalOutstanding || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 연체 금액 */}
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-rose-600 font-medium">연체 금액</p>
                <p className="text-2xl font-bold text-rose-900">
                  {(summary?.totalOverdue || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-rose-500 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="매입처명, 전표번호 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-[130px]">
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
            <Select value={purchaseStatusFilter} onValueChange={setPurchaseStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="매입상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 매입</SelectItem>
                {PURCHASE_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-[150px]"
              />
              <span className="text-muted-foreground">~</span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-[150px]"
              />
            </div>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <Filter className="h-4 w-4 mr-1" />
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 매입원장 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>매입원장 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[120px]">전표번호</TableHead>
                <TableHead className="w-[100px]">전표일자</TableHead>
                <TableHead>매입처</TableHead>
                <TableHead className="w-[100px] text-center">매입유형</TableHead>
                <TableHead className="text-right">공급가액</TableHead>
                <TableHead className="text-right">부가세</TableHead>
                <TableHead className="text-right">합계</TableHead>
                <TableHead className="text-right">지급액</TableHead>
                <TableHead className="text-right">미지급</TableHead>
                <TableHead className="text-center">결제상태</TableHead>
                <TableHead className="text-center">매입상태</TableHead>
                <TableHead className="w-[100px] text-center">지급처리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : !ledgers.length ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    매입원장 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                ledgers.map((ledger) => (
                  <TableRow
                    key={ledger.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => handleRowClick(ledger)}
                  >
                    <TableCell className="font-mono text-sm text-red-600 font-medium">
                      {ledger.ledgerNumber}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(ledger.ledgerDate), 'yyyy-MM-dd')}
                    </TableCell>
                    <TableCell className="font-medium">{ledger.supplierName}</TableCell>
                    <TableCell className="text-center">
                      {getPurchaseTypeLabel(ledger.purchaseType)}
                    </TableCell>
                    <TableCell className="text-right">
                      {ledger.supplyAmount.toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {ledger.vatAmount.toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      {ledger.totalAmount.toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {ledger.paidAmount.toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                      {ledger.outstandingAmount.toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-center">
                      {getPaymentStatusBadge(ledger.paymentStatus)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPurchaseStatusBadge(ledger.purchaseStatus)}
                    </TableCell>
                    <TableCell className="text-center">
                      {ledger.outstandingAmount > 0 && ledger.purchaseStatus !== 'CANCELLED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPaymentDialog(ledger);
                          }}
                        >
                          <CreditCard className="h-3 w-3 mr-1" />
                          지급
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ===== 상세 보기 Dialog ===== */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>매입원장 상세</DialogTitle>
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
                    <span className="text-muted-foreground">매입처</span>
                    <span className="font-medium">{selectedLedger.supplierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">매입유형</span>
                    {getPurchaseTypeLabel(selectedLedger.purchaseType)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">결제상태</span>
                    {getPaymentStatusBadge(selectedLedger.paymentStatus)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">매입상태</span>
                    {getPurchaseStatusBadge(selectedLedger.purchaseStatus)}
                  </div>
                  {selectedLedger.dueDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">결제기한</span>
                      <span>{format(new Date(selectedLedger.dueDate), 'yyyy-MM-dd')}</span>
                    </div>
                  )}
                  {selectedLedger.description && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">적요</span>
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
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <p className="text-red-600">합계</p>
                    <p className="text-lg font-bold text-red-700">
                      {selectedLedger.totalAmount.toLocaleString()}원
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-green-600">지급액</p>
                    <p className="text-lg font-bold text-green-700">
                      {selectedLedger.paidAmount.toLocaleString()}원
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg text-center">
                    <p className="text-orange-600">미지급</p>
                    <p className="text-lg font-bold text-orange-700">
                      {selectedLedger.outstandingAmount.toLocaleString()}원
                    </p>
                  </div>
                </div>
              </div>

              {/* 품목 내역 */}
              {selectedLedger.items && selectedLedger.items.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">품목 내역</h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
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
                            <TableCell className="text-right">
                              {item.quantity}
                              {item.unit && (
                                <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                              )}
                            </TableCell>
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

              {/* 지급 이력 */}
              {selectedLedger.payments && selectedLedger.payments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">지급 이력</h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>지급번호</TableHead>
                          <TableHead>지급일자</TableHead>
                          <TableHead className="text-right">지급액</TableHead>
                          <TableHead>결제수단</TableHead>
                          <TableHead>은행명</TableHead>
                          <TableHead>계좌번호</TableHead>
                          <TableHead>비고</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLedger.payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-mono text-sm">
                              {payment.paymentNumber}
                            </TableCell>
                            <TableCell>
                              {format(new Date(payment.paymentDate), 'yyyy-MM-dd')}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {payment.amount.toLocaleString()}원
                            </TableCell>
                            <TableCell>{getPaymentMethodLabel(payment.paymentMethod)}</TableCell>
                            <TableCell>{payment.bankName || '-'}</TableCell>
                            <TableCell>{payment.accountNumber || '-'}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {payment.note || '-'}
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
                  selectedLedger.purchaseStatus !== 'CANCELLED' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsDetailOpen(false);
                        openPaymentDialog(selectedLedger);
                      }}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      지급 처리
                    </Button>
                  )}
                {selectedLedger.purchaseStatus === 'REGISTERED' && (
                  <Button
                    onClick={() => handleConfirmPurchase(selectedLedger.id)}
                    disabled={confirmPurchase.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    매입 확정
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

      {/* ===== 지급 처리 Dialog ===== */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>지급 처리</DialogTitle>
            <DialogDescription>
              {paymentTarget?.ledgerNumber} - {paymentTarget?.supplierName}
            </DialogDescription>
          </DialogHeader>

          {paymentTarget && (
            <div className="space-y-4 mt-2">
              {/* 미지급 잔액 안내 */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                <p className="text-sm text-orange-600">미지급 잔액</p>
                <p className="text-xl font-bold text-orange-700">
                  {paymentTarget.outstandingAmount.toLocaleString()}원
                </p>
              </div>

              {/* 지급일자 */}
              <div className="space-y-2">
                <Label>지급일자 *</Label>
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentDate: e.target.value })
                  }
                />
              </div>

              {/* 지급액 */}
              <div className="space-y-2">
                <Label>지급액 *</Label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: Math.min(Number(e.target.value), paymentTarget.outstandingAmount),
                    })
                  }
                  max={paymentTarget.outstandingAmount}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  최대 {paymentTarget.outstandingAmount.toLocaleString()}원
                </p>
              </div>

              {/* 결제수단 */}
              <div className="space-y-2">
                <Label>결제수단 *</Label>
                <Select
                  value={paymentForm.paymentMethod}
                  onValueChange={(v) =>
                    setPaymentForm({ ...paymentForm, paymentMethod: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 은행명 */}
              <div className="space-y-2">
                <Label>은행명</Label>
                <Input
                  value={paymentForm.bankName}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, bankName: e.target.value })
                  }
                  placeholder="예: 국민은행, 우리은행"
                />
              </div>

              {/* 계좌번호 */}
              <div className="space-y-2">
                <Label>계좌번호</Label>
                <Input
                  value={paymentForm.accountNumber}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, accountNumber: e.target.value })
                  }
                  placeholder="계좌번호를 입력하세요"
                />
              </div>

              {/* 비고 */}
              <div className="space-y-2">
                <Label>비고</Label>
                <Textarea
                  value={paymentForm.note}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, note: e.target.value })
                  }
                  rows={2}
                  placeholder="추가 메모를 입력하세요"
                />
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>
                  취소
                </Button>
                <Button onClick={handlePaymentSubmit} disabled={addPayment.isPending}>
                  {addPayment.isPending ? '처리 중...' : '지급 처리'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== 매입 등록 Dialog ===== */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>매입 등록</DialogTitle>
            <DialogDescription>
              새로운 매입 전표를 등록합니다.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">기본정보</TabsTrigger>
              <TabsTrigger value="items">품목정보</TabsTrigger>
            </TabsList>

            {/* 기본정보 탭 */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>매입처 ID *</Label>
                  <Input
                    value={createForm.supplierId}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, supplierId: e.target.value })
                    }
                    placeholder="매입처 ID를 입력하세요"
                  />
                </div>
                <div className="space-y-2">
                  <Label>매입유형</Label>
                  <Select
                    value={createForm.purchaseType}
                    onValueChange={(v) =>
                      setCreateForm({ ...createForm, purchaseType: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PURCHASE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>계정과목</Label>
                  <Input
                    value={createForm.accountCode}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, accountCode: e.target.value })
                    }
                    placeholder="계정과목 코드"
                  />
                </div>
                <div className="space-y-2">
                  <Label>결제방법</Label>
                  <Select
                    value={createForm.paymentMethod}
                    onValueChange={(v) =>
                      setCreateForm({ ...createForm, paymentMethod: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHOD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>공급가액</Label>
                  <Input
                    type="number"
                    value={createForm.supplyAmount}
                    readOnly
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>부가세 (10%)</Label>
                  <Input
                    type="number"
                    value={createForm.vatAmount}
                    readOnly
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>합계금액</Label>
                  <Input
                    type="number"
                    value={createForm.totalAmount}
                    readOnly
                    className="bg-slate-50 font-bold text-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>결제기한</Label>
                  <Input
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, dueDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>적요</Label>
                <Textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                  rows={2}
                  placeholder="매입 내용을 입력하세요"
                />
              </div>
            </TabsContent>

            {/* 품목정보 탭 */}
            <TabsContent value="items" className="space-y-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">품목 목록</h4>
                <Button variant="outline" size="sm" onClick={addItemRow}>
                  <Plus className="h-3 w-3 mr-1" />
                  품목 추가
                </Button>
              </div>

              <div className="space-y-4">
                {itemRows.map((row, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-muted-foreground">
                        품목 {index + 1}
                      </span>
                      {itemRows.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                          onClick={() => removeItemRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">품목명 *</Label>
                        <Input
                          value={row.itemName}
                          onChange={(e) => updateItemRow(index, 'itemName', e.target.value)}
                          placeholder="품목명"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">규격</Label>
                        <Input
                          value={row.specification}
                          onChange={(e) =>
                            updateItemRow(index, 'specification', e.target.value)
                          }
                          placeholder="규격"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">수량</Label>
                          <Input
                            type="number"
                            value={row.quantity}
                            onChange={(e) =>
                              updateItemRow(index, 'quantity', Number(e.target.value))
                            }
                            min={1}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">단위</Label>
                          <Input
                            value={row.unit}
                            onChange={(e) => updateItemRow(index, 'unit', e.target.value)}
                            placeholder="EA"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">단가 *</Label>
                        <Input
                          type="number"
                          value={row.unitPrice}
                          onChange={(e) =>
                            updateItemRow(index, 'unitPrice', Number(e.target.value))
                          }
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">공급가액</Label>
                        <Input
                          type="number"
                          value={row.supplyAmount}
                          readOnly
                          className="h-8 text-sm bg-slate-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">부가세</Label>
                        <Input
                          type="number"
                          value={row.vatAmount}
                          readOnly
                          className="h-8 text-sm bg-slate-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">합계</Label>
                        <Input
                          type="number"
                          value={row.totalAmount}
                          readOnly
                          className="h-8 text-sm bg-slate-50 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 품목 합계 */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm text-center">
                  <div>
                    <p className="text-muted-foreground">공급가액 합계</p>
                    <p className="text-lg font-bold">{createForm.supplyAmount.toLocaleString()}원</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">부가세 합계</p>
                    <p className="text-lg font-bold">{createForm.vatAmount.toLocaleString()}원</p>
                  </div>
                  <div>
                    <p className="text-red-600">총 합계</p>
                    <p className="text-lg font-bold text-red-700">
                      {createForm.totalAmount.toLocaleString()}원
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createPurchase.isPending}>
              {createPurchase.isPending ? '등록 중...' : '매입 등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

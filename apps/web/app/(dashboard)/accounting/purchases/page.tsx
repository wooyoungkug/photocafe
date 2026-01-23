'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  Download,
  FileText,
  TrendingDown,
  Calendar,
  Filter,
  MoreHorizontal,
  ShoppingCart,
  Package,
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  usePurchaseTransactions,
  useAccountingSummary,
  useCreateTransaction,
} from '@/hooks/use-accounting';
import {
  PAYMENT_METHOD_OPTIONS,
  TRANSACTION_STATUS_OPTIONS,
  ACCOUNT_CODES,
} from '@/lib/types/accounting';
import { toast } from '@/hooks/use-toast';

export default function PurchaseManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: purchaseData, isLoading } = usePurchaseTransactions();
  const { data: summary } = useAccountingSummary();
  const createTransaction = useCreateTransaction();

  // 비용 계정과목
  const expenseAccounts = ACCOUNT_CODES.filter(
    (acc) => acc.class === 'expense' && acc.level >= 2
  );

  const [formData, setFormData] = useState({
    accountCode: '501',
    supplierName: '',
    amount: 0,
    tax: 0,
    description: '',
    transactionDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: 'bank_transfer',
    memo: '',
  });

  const handleSubmit = async () => {
    if (!formData.supplierName || formData.amount <= 0) {
      toast({ title: '필수 항목을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      await createTransaction.mutateAsync({
        type: 'expense',
        category: 'purchase',
        amount: formData.amount,
        tax: formData.tax,
        description: formData.description,
        transactionDate: formData.transactionDate,
        paymentMethod: formData.paymentMethod as any,
        memo: formData.memo,
      });
      toast({ title: '매입이 등록되었습니다.' });
      setIsDialogOpen(false);
    } catch {
      toast({ title: '등록에 실패했습니다.', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const config = TRANSACTION_STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge className={`${config?.color || 'bg-gray-100'} text-xs`}>
        {config?.label || status}
      </Badge>
    );
  };

  const getPaymentLabel = (method: string) => {
    return PAYMENT_METHOD_OPTIONS.find((m) => m.value === method)?.label || method;
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">매입 관리</h1>
          <p className="text-muted-foreground">매입 내역을 조회하고 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            엑셀 다운로드
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            매입 등록
          </Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-4">
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
            <div className="mt-2 flex items-center text-xs text-red-600">
              전월 대비 +8.3%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">지급 완료</p>
                <p className="text-2xl font-bold text-orange-900">
                  {(summary?.totalExpense || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">미지급 잔액</p>
                <p className="text-2xl font-bold text-blue-900">
                  {(summary?.payablesBalance || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-2 text-xs text-blue-600">
              미지급 매입처 5건
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">원자재 구매</p>
                <p className="text-2xl font-bold text-green-900">12건</p>
              </div>
              <div className="h-12 w-12 bg-green-500 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-2 text-xs text-green-600">
              용지, 원단, 잉크 등
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="매입처명, 품목 검색..."
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
                {TRANSACTION_STATUS_OPTIONS.map((opt) => (
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
                className="w-[140px]"
              />
              <span className="text-muted-foreground">~</span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-[140px]"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              필터 초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 매입 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>매입 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[120px]">거래일자</TableHead>
                <TableHead className="w-[120px]">거래번호</TableHead>
                <TableHead>매입처</TableHead>
                <TableHead>품목</TableHead>
                <TableHead className="text-right">공급가액</TableHead>
                <TableHead className="text-right">부가세</TableHead>
                <TableHead className="text-right">합계</TableHead>
                <TableHead className="text-center">결제방법</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : !purchaseData?.data?.length ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    등록된 매입이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                purchaseData.data.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm">
                      {format(new Date(item.transactionDate), 'yyyy-MM-dd')}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-red-600">
                      {item.transactionCode}
                    </TableCell>
                    <TableCell className="font-medium">{item.clientName || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.tax.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      {item.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {getPaymentLabel(item.paymentMethod || '')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 매입 등록 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>매입 등록</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">기본정보</TabsTrigger>
              <TabsTrigger value="detail">상세정보</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>매입일자 *</Label>
                  <Input
                    type="date"
                    value={formData.transactionDate}
                    onChange={(e) =>
                      setFormData({ ...formData, transactionDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>계정과목 *</Label>
                  <Select
                    value={formData.accountCode}
                    onValueChange={(v) => setFormData({ ...formData, accountCode: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseAccounts.map((acc) => (
                        <SelectItem key={acc.code} value={acc.code}>
                          [{acc.code}] {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>매입처명 *</Label>
                <Input
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder="매입처를 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <Label>품목/적요</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="용지 구입, 잉크 구입 등"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>공급가액 *</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => {
                      const amount = Number(e.target.value);
                      setFormData({
                        ...formData,
                        amount,
                        tax: Math.round(amount * 0.1),
                      });
                    }}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>부가세 (10%)</Label>
                  <Input
                    type="number"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>합계금액</Label>
                  <Input
                    type="number"
                    value={formData.amount + formData.tax}
                    readOnly
                    className="bg-slate-50 font-bold text-red-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>결제방법</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
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
            </TabsContent>

            <TabsContent value="detail" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>메모</Label>
                <Textarea
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  rows={3}
                  placeholder="추가 메모를 입력하세요"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={createTransaction.isPending}>
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

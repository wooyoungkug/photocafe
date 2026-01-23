'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Search,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  MoreHorizontal,
  CreditCard,
  TrendingUp,
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
import { Progress } from '@/components/ui/progress';
import { usePayables, usePayableSummary, useCreatePayment } from '@/hooks/use-accounting';
import { toast } from '@/hooks/use-toast';
import type { Payable } from '@/lib/types/accounting';

export default function PayablesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<any>(null);

  const { data: payablesData, isLoading } = usePayables({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const { data: summary } = usePayableSummary();
  const createPayment = useCreatePayment();

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: 'bank_transfer',
    description: '',
  });

  const handleOpenPaymentDialog = (payable: any) => {
    setSelectedPayable(payable);
    setPaymentForm({
      amount: payable.remainingAmount,
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: 'bank_transfer',
      description: '',
    });
    setIsPaymentDialogOpen(true);
  };

  const handlePayment = async () => {
    if (paymentForm.amount <= 0) {
      toast({ title: '지급액을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      await createPayment.mutateAsync({
        type: 'expense',
        amount: paymentForm.amount,
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod as any,
        supplierName: selectedPayable?.supplierName,
        description: paymentForm.description || `${selectedPayable?.supplierName} 미지급금 지급`,
      });
      toast({ title: '지급이 처리되었습니다.' });
      setIsPaymentDialogOpen(false);
    } catch {
      toast({ title: '지급 처리에 실패했습니다.', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      outstanding: { label: '미지급', color: 'bg-orange-100 text-orange-700', icon: Clock },
      partial: { label: '부분지급', color: 'bg-blue-100 text-blue-700', icon: TrendingUp },
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

  const getPaymentRate = (paid: number, total: number) => {
    return total > 0 ? Math.round((paid / total) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">미지급금 관리</h1>
          <p className="text-muted-foreground">매입처별 미지급금 현황을 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            엑셀 다운로드
          </Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">총 미지급금</p>
                <p className="text-2xl font-bold text-red-900">
                  {(summary?.totalPayables || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-red-500 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-2 text-xs text-red-600">
              {summary?.supplierCount || 0}개 매입처
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">이번 주 지급예정</p>
                <p className="text-2xl font-bold text-orange-900">0원</p>
              </div>
              <div className="h-12 w-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">연체 금액</p>
                <p className="text-2xl font-bold text-purple-900">0원</p>
              </div>
              <div className="h-12 w-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
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
                placeholder="매입처명 검색..."
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
                <SelectItem value="outstanding">미지급</SelectItem>
                <SelectItem value="partial">부분지급</SelectItem>
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

      {/* 미지급금 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>미지급금 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>매입처</TableHead>
                <TableHead className="text-right">발생금액</TableHead>
                <TableHead className="text-right">지급액</TableHead>
                <TableHead className="text-right">잔액</TableHead>
                <TableHead className="text-center">지급률</TableHead>
                <TableHead className="text-center">지급예정일</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : !payablesData?.data?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    미지급금 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                payablesData.data.map((item: Payable) => {
                  const rate = getPaymentRate(item.paidAmount, item.totalAmount);
                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.supplierName}</div>
                          <div className="text-xs text-muted-foreground">{item.supplierCode}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {item.paidAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        {item.remainingAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={rate} className="w-16 h-2" />
                          <span className="text-xs text-muted-foreground">{rate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {item.dueDate ? format(new Date(item.dueDate), 'yyyy-MM-dd') : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(item.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPaymentDialog(item)}
                            disabled={item.status === 'paid'}
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            지급
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

      {/* 지급 등록 다이얼로그 */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>지급 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">매입처</span>
                <span className="font-medium">{selectedPayable?.supplierName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">미지급 잔액</span>
                <span className="font-bold text-red-600">
                  {selectedPayable?.remainingAmount?.toLocaleString()}원
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>지급일자</Label>
              <Input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>지급액</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                max={selectedPayable?.remainingAmount}
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
                placeholder="지급 내용을 입력하세요"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handlePayment} disabled={createPayment.isPending}>
              지급 등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

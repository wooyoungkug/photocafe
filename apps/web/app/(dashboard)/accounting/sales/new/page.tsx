'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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

import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// ===== 타입 정의 =====
interface SalesItem {
  id: string;
  itemName: string;
  specification: string;
  quantity: number;
  unitPrice: number;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
}

interface ClientOption {
  id: string;
  clientName: string;
  clientCode: string;
}

interface DirectSalesPayload {
  clientId: string;
  salesType: string;
  paymentMethod: string;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  description?: string;
  items: Array<{
    itemName: string;
    specification?: string;
    quantity: number;
    unitPrice: number;
    supplyAmount: number;
    vatAmount: number;
    totalAmount: number;
  }>;
}

// ===== 상수 =====
const SALES_TYPE_OPTIONS = [
  { value: 'ALBUM', label: '앨범' },
  { value: 'PRINT', label: '인화' },
  { value: 'OUTPUT', label: '출력' },
  { value: 'SERVICE', label: '서비스' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'prepaid', label: '선불' },
  { value: 'postpaid', label: '외상' },
  { value: 'card', label: '카드' },
  { value: 'bank_transfer', label: '계좌이체' },
];

// ===== 유틸 =====
let itemIdCounter = 0;
function generateItemId(): string {
  itemIdCounter += 1;
  return `item_${Date.now()}_${itemIdCounter}`;
}

function createEmptyItem(): SalesItem {
  return {
    id: generateItemId(),
    itemName: '',
    specification: '',
    quantity: 1,
    unitPrice: 0,
    supplyAmount: 0,
    vatAmount: 0,
    totalAmount: 0,
  };
}

function recalcItem(item: SalesItem): SalesItem {
  const supplyAmount = item.quantity * item.unitPrice;
  const vatAmount = Math.round(supplyAmount * 0.1);
  const totalAmount = supplyAmount + vatAmount;
  return { ...item, supplyAmount, vatAmount, totalAmount };
}

// ===== 컴포넌트 =====
export default function DirectSalesNewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // 거래처 목록
  const [clients, setClients] = useState<ClientOption[]>([]);
  useEffect(() => {
    api
      .get<{ data: ClientOption[] }>('/clients', { limit: 200 })
      .then((res) => setClients(res.data || []))
      .catch(() => {});
  }, []);

  // 폼 상태
  const [clientId, setClientId] = useState('');
  const [salesType, setSalesType] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<SalesItem[]>([createEmptyItem()]);

  // 품목 변경 핸들러
  const updateItem = useCallback(
    (id: string, field: keyof SalesItem, value: string | number) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const updated = { ...item, [field]: value };
          // 수량 또는 단가 변경 시 자동 계산
          if (field === 'quantity' || field === 'unitPrice') {
            return recalcItem(updated);
          }
          return updated;
        }),
      );
    },
    [],
  );

  // 품목 추가
  const addItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyItem()]);
  }, []);

  // 품목 삭제
  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      if (prev.length <= 1) {
        toast({ title: '최소 1개의 품목이 필요합니다.', variant: 'destructive' });
        return prev;
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  // 합계 계산
  const totals = useMemo(() => {
    const supplyAmount = items.reduce((sum, item) => sum + item.supplyAmount, 0);
    const vatAmount = items.reduce((sum, item) => sum + item.vatAmount, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
    return { supplyAmount, vatAmount, totalAmount };
  }, [items]);

  // 저장 mutation
  const saveMutation = useMutation({
    mutationFn: async (data: DirectSalesPayload) => {
      return api.post('/sales-ledger/direct', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['sales-ledger-summary'] });
      toast({ title: '매출이 등록되었습니다.' });
      router.push('/accounting/sales');
    },
    onError: (error: Error) => {
      toast({
        title: '매출 등록에 실패했습니다.',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 저장 핸들러
  const handleSave = () => {
    // 유효성 검사
    if (!clientId) {
      toast({ title: '거래처를 선택해주세요.', variant: 'destructive' });
      return;
    }
    if (!salesType) {
      toast({ title: '매출 유형을 선택해주세요.', variant: 'destructive' });
      return;
    }
    if (!paymentMethod) {
      toast({ title: '결제방식을 선택해주세요.', variant: 'destructive' });
      return;
    }

    // 품목 유효성 검사
    const hasEmptyItems = items.some((item) => !item.itemName.trim());
    if (hasEmptyItems) {
      toast({ title: '품목명을 입력해주세요.', variant: 'destructive' });
      return;
    }

    const hasZeroAmount = items.some((item) => item.supplyAmount <= 0);
    if (hasZeroAmount) {
      toast({ title: '수량과 단가를 확인해주세요.', variant: 'destructive' });
      return;
    }

    const payload: DirectSalesPayload = {
      clientId,
      salesType,
      paymentMethod,
      supplyAmount: totals.supplyAmount,
      vatAmount: totals.vatAmount,
      totalAmount: totals.totalAmount,
      description: description.trim() || undefined,
      items: items.map((item) => ({
        itemName: item.itemName,
        specification: item.specification || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        supplyAmount: item.supplyAmount,
        vatAmount: item.vatAmount,
        totalAmount: item.totalAmount,
      })),
    };

    saveMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">매출 직접 등록</h1>
          <p className="text-sm text-muted-foreground">
            홈페이지 외 매출을 직접 등록합니다. ({format(new Date(), 'yyyy-MM-dd')})
          </p>
        </div>
      </div>

      {/* 기본정보 Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 거래처 선택 */}
            <div className="space-y-2">
              <Label>
                거래처 <span className="text-red-500">*</span>
              </Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="거래처를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      [{client.clientCode}] {client.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 매출 유형 */}
            <div className="space-y-2">
              <Label>
                매출 유형 <span className="text-red-500">*</span>
              </Label>
              <Select value={salesType} onValueChange={setSalesType}>
                <SelectTrigger>
                  <SelectValue placeholder="매출 유형을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {SALES_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 결제방식 */}
            <div className="space-y-2">
              <Label>
                결제방식 <span className="text-red-500">*</span>
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="결제방식을 선택하세요" />
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
        </CardContent>
      </Card>

      {/* 품목 Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">품목 내역</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" />
            품목 추가
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="w-[40px] text-center text-xs">No</TableHead>
                  <TableHead className="min-w-[160px] text-xs">품목명</TableHead>
                  <TableHead className="min-w-[120px] text-xs">규격</TableHead>
                  <TableHead className="w-[100px] text-right text-xs">수량</TableHead>
                  <TableHead className="w-[120px] text-right text-xs">단가</TableHead>
                  <TableHead className="w-[120px] text-right text-xs">공급가액</TableHead>
                  <TableHead className="w-[100px] text-right text-xs">부가세</TableHead>
                  <TableHead className="w-[120px] text-right text-xs">합계</TableHead>
                  <TableHead className="w-[50px] text-center text-xs">삭제</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.itemName}
                        onChange={(e) => updateItem(item.id, 'itemName', e.target.value)}
                        placeholder="품목명 입력"
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.specification}
                        onChange={(e) =>
                          updateItem(item.id, 'specification', e.target.value)
                        }
                        placeholder="규격"
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, 'quantity', Math.max(1, Number(e.target.value)))
                        }
                        className="h-8 text-sm text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(item.id, 'unitPrice', Math.max(0, Number(e.target.value)))
                        }
                        className="h-8 text-sm text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {item.supplyAmount.toLocaleString('ko-KR')}원
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {item.vatAmount.toLocaleString('ko-KR')}원
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold text-blue-600">
                      {item.totalAmount.toLocaleString('ko-KR')}원
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/40 font-bold">
                  <TableCell colSpan={5} className="text-right text-xs">
                    합계
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {totals.supplyAmount.toLocaleString('ko-KR')}원
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {totals.vatAmount.toLocaleString('ko-KR')}원
                  </TableCell>
                  <TableCell className="text-right text-xs text-blue-600">
                    {totals.totalAmount.toLocaleString('ko-KR')}원
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 금액 요약 + 적요 Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">금액 요약</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 금액 요약 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">공급가액</p>
              <p className="text-xl font-bold mt-1">
                {totals.supplyAmount.toLocaleString('ko-KR')}원
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">부가세 (10%)</p>
              <p className="text-xl font-bold mt-1">
                {totals.vatAmount.toLocaleString('ko-KR')}원
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-sm text-blue-600">총합계</p>
              <p className="text-2xl font-bold mt-1 text-blue-700">
                {totals.totalAmount.toLocaleString('ko-KR')}원
              </p>
            </div>
          </div>

          <Separator />

          {/* 적요 */}
          <div className="space-y-2">
            <Label>적요 (선택)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="추가 메모 또는 비고를 입력하세요"
            />
          </div>
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          취소
        </Button>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="min-w-[120px]"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? '저장 중...' : '매출 등록'}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

import {
  useCreatePurchaseLedger,
  PURCHASE_TYPE_OPTIONS,
} from '@/hooks/use-purchase-ledger';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

// ===== 상수 =====

/** 매입유형 -> 계정과목 자동 매핑 */
const ACCOUNT_CODE_MAP: Record<string, { code: string; label: string }> = {
  RAW_MATERIAL: { code: '120', label: '120 원재료' },
  MERCHANDISE: { code: '123', label: '123 상품' },
  SUPPLIES: { code: '617', label: '617 소모품비' },
  OUTSOURCING: { code: '616', label: '616 디자인외주비' },
  EQUIPMENT: { code: '131', label: '131 기계장치' },
  SERVICE: { code: '618', label: '618 지급수수료' },
  OTHER: { code: '501', label: '501 상품매출원가' },
};

/** 과세 유형 */
const TAX_TYPE_OPTIONS = [
  { value: 'TAXABLE', label: '과세 (10%)' },
  { value: 'ZERO_RATED', label: '영세율 (0%)' },
  { value: 'EXEMPT', label: '면세' },
];

/** 결제방식 */
const SETTLEMENT_METHOD_OPTIONS = [
  { value: 'prepaid', label: '선불' },
  { value: 'postpaid', label: '외상' },
];

// ===== 품목 행 타입 =====

interface ItemRow {
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
}

const createEmptyItem = (): ItemRow => ({
  itemName: '',
  specification: '',
  quantity: 1,
  unit: 'EA',
  unitPrice: 0,
  supplyAmount: 0,
  vatAmount: 0,
  totalAmount: 0,
});

// ===== 페이지 컴포넌트 =====

export default function NewPurchasePage() {
  const router = useRouter();
  const createPurchase = useCreatePurchaseLedger();

  // ----- 거래처 목록 -----
  const [clients, setClients] = useState<
    Array<{ id: string; clientName: string; clientCode: string }>
  >([]);

  useEffect(() => {
    api
      .get<{ data: Array<{ id: string; clientName: string; clientCode: string }> }>(
        '/clients',
        { limit: 200 },
      )
      .then((res) => setClients(res.data || []))
      .catch(() => {});
  }, []);

  // ----- 기본정보 폼 상태 -----
  const [supplierId, setSupplierId] = useState('');
  const [purchaseType, setPurchaseType] = useState('RAW_MATERIAL');
  const [taxType, setTaxType] = useState('TAXABLE');
  const [paymentMethod, setPaymentMethod] = useState('postpaid');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  // ----- 품목 상태 -----
  const [items, setItems] = useState<ItemRow[]>([createEmptyItem()]);

  // ----- 계정과목 자동 매핑 -----
  const accountMapping = ACCOUNT_CODE_MAP[purchaseType] || ACCOUNT_CODE_MAP.OTHER;

  // ----- 과세유형에 따른 VAT 비율 -----
  const getVatRate = useCallback((): number => {
    return taxType === 'TAXABLE' ? 0.1 : 0;
  }, [taxType]);

  // ----- 품목 금액 재계산 (과세유형 변경 시) -----
  useEffect(() => {
    const vatRate = getVatRate();
    setItems((prev) =>
      prev.map((item) => {
        const supplyAmount = item.quantity * item.unitPrice;
        const vatAmount = Math.round(supplyAmount * vatRate);
        return {
          ...item,
          supplyAmount,
          vatAmount,
          totalAmount: supplyAmount + vatAmount,
        };
      }),
    );
  }, [taxType, getVatRate]);

  // ----- 품목 행 추가 -----
  const addItemRow = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  // ----- 품목 행 삭제 -----
  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ----- 품목 행 업데이트 -----
  const updateItemRow = (index: number, field: keyof ItemRow, value: string | number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const row = { ...newItems[index], [field]: value };

      // 수량 또는 단가 변경 시 자동 계산
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : row.quantity;
        const price = field === 'unitPrice' ? Number(value) : row.unitPrice;
        const vatRate = getVatRate();
        row.supplyAmount = qty * price;
        row.vatAmount = Math.round(row.supplyAmount * vatRate);
        row.totalAmount = row.supplyAmount + row.vatAmount;
      }

      newItems[index] = row;
      return newItems;
    });
  };

  // ----- 합계 계산 -----
  const totals = items.reduce(
    (acc, item) => ({
      supplyAmount: acc.supplyAmount + item.supplyAmount,
      vatAmount: acc.vatAmount + item.vatAmount,
      totalAmount: acc.totalAmount + item.totalAmount,
    }),
    { supplyAmount: 0, vatAmount: 0, totalAmount: 0 },
  );

  // ----- 저장 -----
  const handleSubmit = async () => {
    // 유효성 검사
    if (!supplierId) {
      toast({ title: '매입처를 선택해주세요.', variant: 'destructive' });
      return;
    }

    const validItems = items.filter((item) => item.itemName.trim() && item.unitPrice > 0);
    if (validItems.length === 0) {
      toast({ title: '최소 1개 이상의 품목을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      await createPurchase.mutateAsync({
        supplierId,
        purchaseType,
        taxType,
        accountCode: accountMapping.code,
        supplyAmount: totals.supplyAmount,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        paymentMethod,
        dueDate: dueDate || undefined,
        description: description || undefined,
        items: validItems.map((item) => ({
          itemName: item.itemName,
          specification: item.specification || undefined,
          quantity: item.quantity,
          unit: item.unit || undefined,
          unitPrice: item.unitPrice,
          supplyAmount: item.supplyAmount,
          vatAmount: item.vatAmount,
          totalAmount: item.totalAmount,
          purchaseType,
          accountCode: accountMapping.code,
        })),
      });

      toast({ title: '매입계산서가 등록되었습니다.' });
      router.push('/accounting/purchases');
    } catch {
      toast({ title: '매입계산서 등록에 실패했습니다.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* ===== 헤더 ===== */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/accounting/purchases')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">매입계산서 등록</h1>
          <p className="text-muted-foreground">새로운 매입계산서를 등록합니다.</p>
        </div>
      </div>

      {/* ===== 기본정보 Card ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">기본정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 매입처 선택 */}
            <div className="space-y-2">
              <Label>
                매입처 <span className="text-red-500">*</span>
              </Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="매입처를 선택하세요" />
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

            {/* 매입 유형 */}
            <div className="space-y-2">
              <Label>매입 유형</Label>
              <Select value={purchaseType} onValueChange={setPurchaseType}>
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

            {/* 과세 유형 */}
            <div className="space-y-2">
              <Label>과세 유형</Label>
              <Select value={taxType} onValueChange={setTaxType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 계정과목 (자동 매핑, 읽기전용) */}
            <div className="space-y-2">
              <Label>계정과목</Label>
              <Input
                value={accountMapping.label}
                readOnly
                className="bg-slate-50 cursor-not-allowed"
              />
            </div>

            {/* 결제방식 */}
            <div className="space-y-2">
              <Label>결제방식</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SETTLEMENT_METHOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 결제기한 */}
            <div className="space-y-2">
              <Label>결제기한</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== 품목 Card ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">품목</CardTitle>
            <Button variant="outline" size="sm" onClick={addItemRow}>
              <Plus className="h-4 w-4 mr-1" />
              품목 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[40px] text-center">#</TableHead>
                  <TableHead className="min-w-[160px]">품목명</TableHead>
                  <TableHead className="min-w-[120px]">규격</TableHead>
                  <TableHead className="w-[90px] text-right">수량</TableHead>
                  <TableHead className="w-[70px]">단위</TableHead>
                  <TableHead className="w-[120px] text-right">단가</TableHead>
                  <TableHead className="w-[120px] text-right">공급가액</TableHead>
                  <TableHead className="w-[100px] text-right">부가세</TableHead>
                  <TableHead className="w-[120px] text-right">합계</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-center text-muted-foreground text-sm">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.itemName}
                        onChange={(e) => updateItemRow(index, 'itemName', e.target.value)}
                        placeholder="품목명"
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.specification}
                        onChange={(e) =>
                          updateItemRow(index, 'specification', e.target.value)
                        }
                        placeholder="규격"
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItemRow(index, 'quantity', Number(e.target.value))
                        }
                        min={1}
                        className="h-8 text-sm text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.unit}
                        onChange={(e) => updateItemRow(index, 'unit', e.target.value)}
                        placeholder="EA"
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) =>
                          updateItemRow(index, 'unitPrice', Number(e.target.value))
                        }
                        placeholder="0"
                        className="h-8 text-sm text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {item.supplyAmount.toLocaleString('ko-KR')}원
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {item.vatAmount.toLocaleString('ko-KR')}원
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold">
                      {item.totalAmount.toLocaleString('ko-KR')}원
                    </TableCell>
                    <TableCell>
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => removeItemRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ===== 금액 요약 + 적요 Card ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">금액 요약</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">공급가액</p>
              <p className="text-xl font-bold">
                {totals.supplyAmount.toLocaleString('ko-KR')}원
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">부가세</p>
              <p className="text-xl font-bold">
                {totals.vatAmount.toLocaleString('ko-KR')}원
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-sm text-red-600 mb-1">총합계</p>
              <p className="text-xl font-bold text-red-700">
                {totals.totalAmount.toLocaleString('ko-KR')}원
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>적요</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="매입 내용을 입력하세요 (예: 2월분 원재료 매입)"
            />
          </div>
        </CardContent>
      </Card>

      {/* ===== 저장 버튼 ===== */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => router.push('/accounting/purchases')}
        >
          취소
        </Button>
        <Button onClick={handleSubmit} disabled={createPurchase.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {createPurchase.isPending ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { useToast } from '@/hooks/use-toast';
import { useCreateQuotation } from '@/hooks/use-quotation';
import {
  CreateQuotationItemDto,
  QUOTATION_TYPE_LABELS,
  QuotationType,
} from '@/lib/types/quotation';
import Link from 'next/link';

interface FormItem extends CreateQuotationItemDto {
  _key: string;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createMutation = useCreateQuotation();

  const [title, setTitle] = useState('');
  const [quotationType, setQuotationType] = useState<string>('');
  const [subType, setSubType] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [memo, setMemo] = useState('');
  const [items, setItems] = useState<FormItem[]>([
    { _key: crypto.randomUUID(), itemName: '', quantity: 1, unitPrice: 0 },
  ]);

  const addItem = () => {
    setItems([...items, { _key: crypto.randomUUID(), itemName: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (key: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item._key !== key));
  };

  const updateItem = (key: string, field: keyof FormItem, value: any) => {
    setItems(items.map((item) =>
      item._key === key ? { ...item, [field]: value } : item
    ));
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 0), 0);
  const tax = Math.round(totalAmount * 0.1);
  const finalAmount = totalAmount + tax;

  const formatAmount = (amount: number) => amount.toLocaleString('ko-KR');

  // 앨범 세부분류 옵션
  const getSubTypeOptions = () => {
    switch (quotationType) {
      case 'album':
        return [
          { value: 'premium_photo', label: '고급화보' },
          { value: 'compressed', label: '압축앨범' },
          { value: 'photobook', label: '포토북' },
        ];
      case 'digital_print':
        return [
          { value: 'booklet', label: '책자디지털인쇄' },
          { value: 'single_item', label: '단품디지털인쇄' },
        ];
      default:
        return [];
    }
  };

  const subTypeOptions = getSubTypeOptions();

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: '견적 제목을 입력하세요.', variant: 'destructive' });
      return;
    }
    if (!quotationType) {
      toast({ title: '견적 분류를 선택하세요.', variant: 'destructive' });
      return;
    }
    if (items.some((item) => !item.itemName.trim())) {
      toast({ title: '모든 항목의 품목명을 입력하세요.', variant: 'destructive' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        title,
        quotationType,
        subType: subType || undefined,
        clientName: clientName || undefined,
        clientPhone: clientPhone || undefined,
        clientEmail: clientEmail || undefined,
        validUntil: validUntil || undefined,
        memo: memo || undefined,
        items: items.map(({ _key, ...item }, idx) => ({
          ...item,
          sortOrder: idx,
        })),
      });
      toast({ title: '견적이 생성되었습니다.' });
      router.push('/cs/quotations');
    } catch {
      toast({ title: '견적 생성에 실패했습니다.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cs/quotations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-[24px] text-black font-normal flex items-center gap-2">
              <FileText className="h-7 w-7" />
              견적 작성
            </h1>
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="bg-pink-500 hover:bg-pink-600"
        >
          {createMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          저장
        </Button>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[14px] text-black font-normal">견적 제목 *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 웨딩앨범 견적"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">견적 분류 *</Label>
              <Select value={quotationType} onValueChange={(v) => { setQuotationType(v); setSubType(''); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="분류 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUOTATION_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {subTypeOptions.length > 0 && (
              <div>
                <Label className="text-[14px] text-black font-normal">세부 분류</Label>
                <Select value={subType} onValueChange={setSubType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="세부분류 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {subTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-[14px] text-black font-normal">유효기한</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 고객 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">고객 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-[14px] text-black font-normal">고객명</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="고객명"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">연락처</Label>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">이메일</Label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="email@example.com"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 견적 항목 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[18px] text-black font-bold">견적 항목</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 h-4 w-4" /> 항목 추가
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>품목명 *</TableHead>
                <TableHead className="w-[120px]">규격</TableHead>
                <TableHead className="w-[100px]">수량</TableHead>
                <TableHead className="w-[140px]">단가</TableHead>
                <TableHead className="w-[140px] text-right">소계</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => {
                const subtotal = (item.unitPrice || 0) * (item.quantity || 0);
                return (
                  <TableRow key={item._key}>
                    <TableCell className="text-[14px] text-black font-normal">{idx + 1}</TableCell>
                    <TableCell>
                      <Input
                        value={item.itemName}
                        onChange={(e) => updateItem(item._key, 'itemName', e.target.value)}
                        placeholder="품목명 입력"
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.specification || ''}
                        onChange={(e) => updateItem(item._key, 'specification', e.target.value)}
                        placeholder="A4, 8x10..."
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(item._key, 'quantity', parseInt(e.target.value) || 1)}
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item._key, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal text-right">
                      {formatAmount(subtotal)}원
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500"
                        disabled={items.length <= 1}
                        onClick={() => removeItem(item._key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* 합계 */}
          <div className="border-t p-4 space-y-2">
            <div className="flex justify-between text-[14px] text-black font-normal">
              <span>공급가액</span>
              <span>{formatAmount(totalAmount)}원</span>
            </div>
            <div className="flex justify-between text-[14px] text-black font-normal">
              <span>부가세 (10%)</span>
              <span>{formatAmount(tax)}원</span>
            </div>
            <div className="flex justify-between text-[18px] text-black font-bold border-t pt-2">
              <span>총 견적금액</span>
              <span>{formatAmount(finalAmount)}원</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메모 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">메모</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="견적 관련 메모를 입력하세요..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* 하단 버튼 */}
      <div className="flex justify-end gap-3">
        <Link href="/cs/quotations">
          <Button variant="outline">취소</Button>
        </Link>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="bg-pink-500 hover:bg-pink-600"
        >
          {createMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          견적 저장
        </Button>
      </div>
    </div>
  );
}

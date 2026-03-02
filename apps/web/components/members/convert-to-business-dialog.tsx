'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Building2, Loader2 } from 'lucide-react';
import { useConvertToBusiness } from '@/hooks/use-clients';
import { toast } from '@/hooks/use-toast';
import { Client } from '@/lib/types/client';

interface ConvertToBusinessDialogProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updated: Client) => void;
}

export function ConvertToBusinessDialog({
  client,
  open,
  onOpenChange,
  onSuccess,
}: ConvertToBusinessDialogProps) {
  const [form, setForm] = useState({
    clientName: client.clientName,
    businessNumber: client.businessNumber || '',
    representative: client.representative || '',
    businessType: client.businessType || '',
    businessCategory: client.businessCategory || '',
    taxInvoiceEmail: client.taxInvoiceEmail || '',
    taxInvoiceMethod: client.taxInvoiceMethod || 'email',
  });

  const convertMutation = useConvertToBusiness();

  const handleSubmit = async () => {
    if (!form.clientName.trim()) {
      toast({ title: '상호명을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      const result = await convertMutation.mutateAsync({
        id: client.id,
        data: {
          clientName: form.clientName.trim(),
          businessNumber: form.businessNumber.trim() || undefined,
          representative: form.representative.trim() || undefined,
          businessType: form.businessType.trim() || undefined,
          businessCategory: form.businessCategory.trim() || undefined,
          taxInvoiceEmail: form.taxInvoiceEmail.trim() || undefined,
          taxInvoiceMethod: form.taxInvoiceMethod || undefined,
        },
      });
      toast({ title: '사업자 회원으로 전환되었습니다.' });
      onSuccess?.(result);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: '전환 실패',
        description: err?.message || '사업자 전환 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const formatBusinessNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 10);
    if (numbers.length > 5) return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`;
    if (numbers.length > 3) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return numbers;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[18px] font-bold text-black">
            <Building2 className="h-5 w-5 text-blue-600" />
            사업자 회원 전환
          </DialogTitle>
          <DialogDescription className="text-[14px] text-black font-normal">
            <span className="font-medium">{client.clientName}</span> 회원을 사업자 회원으로 전환합니다.
            전환 후 취소할 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 안내 메시지 */}
          <div className="flex gap-2 items-start p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[14px] text-amber-800">
              사업자 전환 시 회원 그룹이 <span className="font-medium">스튜디오회원</span> 그룹으로 자동 변경됩니다.
            </p>
          </div>

          {/* 상호명 */}
          <div className="space-y-1.5">
            <Label className="text-[14px] font-medium text-black">
              상호(스튜디오명) <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              placeholder="예: 홍길동 포토스튜디오"
              className="text-[14px]"
            />
          </div>

          {/* 사업자등록번호 */}
          <div className="space-y-1.5">
            <Label className="text-[14px] font-medium text-black">사업자등록번호</Label>
            <Input
              value={form.businessNumber}
              onChange={(e) =>
                setForm({ ...form, businessNumber: formatBusinessNumber(e.target.value) })
              }
              placeholder="123-45-67890"
              className="text-[14px]"
            />
          </div>

          {/* 대표자명 */}
          <div className="space-y-1.5">
            <Label className="text-[14px] font-medium text-black">대표자명</Label>
            <Input
              value={form.representative}
              onChange={(e) => setForm({ ...form, representative: e.target.value })}
              placeholder="홍길동"
              className="text-[14px]"
            />
          </div>

          {/* 업태 / 업종 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[14px] font-medium text-black">업태</Label>
              <Input
                value={form.businessType}
                onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                placeholder="서비스업"
                className="text-[14px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[14px] font-medium text-black">업종(종목)</Label>
              <Input
                value={form.businessCategory}
                onChange={(e) => setForm({ ...form, businessCategory: e.target.value })}
                placeholder="사진촬영업"
                className="text-[14px]"
              />
            </div>
          </div>

          {/* 세금계산서 정보 */}
          <div className="space-y-3 pt-1 border-t">
            <p className="text-[14px] font-medium text-black pt-1">세금계산서 정보</p>
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black">수신 이메일</Label>
              <Input
                type="email"
                value={form.taxInvoiceEmail}
                onChange={(e) => setForm({ ...form, taxInvoiceEmail: e.target.value })}
                placeholder="tax@example.com"
                className="text-[14px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black">발행 방법</Label>
              <Select
                value={form.taxInvoiceMethod}
                onValueChange={(v) => setForm({ ...form, taxInvoiceMethod: v })}
              >
                <SelectTrigger className="text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">이메일 발송</SelectItem>
                  <SelectItem value="hometax">홈택스 전송</SelectItem>
                  <SelectItem value="none">발행 안 함</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={convertMutation.isPending}
            className="text-[14px]"
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={convertMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-[14px]"
          >
            {convertMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                전환 중...
              </>
            ) : (
              '사업자 전환'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

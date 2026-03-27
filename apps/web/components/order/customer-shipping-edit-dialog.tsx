'use client';

import { useState, useEffect } from 'react';
import { Truck, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { AddressSearch } from '@/components/address-search';
import { useUpdateShipping } from '@/hooks/use-orders';
import { toast } from '@/hooks/use-toast';

interface CustomerShippingForm {
  recipientName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  deliveryMethod: string;
  deliveryMemo: string;
}

interface CustomerShipping {
  recipientName?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  deliveryMethod?: string;
  deliveryMemo?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  shipping?: CustomerShipping;
}

const DELIVERY_METHOD_OPTIONS = [
  { value: 'parcel', label: '택배' },
  { value: 'motorcycle', label: '오토바이퀵' },
  { value: 'freight', label: '화물' },
  { value: 'pickup', label: '방문수령' },
];

function toForm(s?: CustomerShipping): CustomerShippingForm {
  return {
    recipientName: s?.recipientName ?? '',
    phone: s?.phone ?? '',
    postalCode: s?.postalCode ?? '',
    address: s?.address ?? '',
    addressDetail: s?.addressDetail ?? '',
    deliveryMethod: s?.deliveryMethod ?? 'parcel',
    deliveryMemo: s?.deliveryMemo ?? '',
  };
}

function detectApartmentFromAddress(address: string): boolean {
  if (!address) return false;
  return /아파트|APT|apt|\(.*동.*\)/.test(address);
}

export function CustomerShippingEditDialog({ open, onOpenChange, orderId, orderNumber, shipping }: Props) {
  const [form, setForm] = useState<CustomerShippingForm>(toForm(shipping));
  const [isApartment, setIsApartment] = useState(false);
  const updateShipping = useUpdateShipping();

  useEffect(() => {
    if (open) {
      const initial = toForm(shipping);
      setForm(initial);
      setIsApartment(detectApartmentFromAddress(initial.address));
    }
  }, [open, shipping]);

  const set = (key: keyof CustomerShippingForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!form.recipientName.trim()) {
      toast({ title: '수령인 이름을 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!form.phone.trim()) {
      toast({ title: '전화번호를 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!form.address.trim()) {
      toast({ title: '배송 주소를 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (isApartment && !form.addressDetail.trim()) {
      toast({ title: '아파트/연립 동호수를 입력해주세요.', description: '배송 오류 방지를 위해 동호수는 필수입력입니다.', variant: 'destructive' });
      return;
    }

    updateShipping.mutate(
      {
        orderId,
        recipientName: form.recipientName,
        phone: form.phone,
        postalCode: form.postalCode,
        address: form.address,
        addressDetail: form.addressDetail || undefined,
        deliveryMethod: form.deliveryMethod || undefined,
        deliveryMemo: form.deliveryMemo || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: '배송정보가 수정되었습니다.' });
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : '배송정보 수정에 실패했습니다.';
          toast({ title: msg, variant: 'destructive' });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[13px]">
            <Truck className="h-4 w-4" />
            배송정보 수정
          </DialogTitle>
          <p className="text-[11px] text-gray-500">{orderNumber}</p>
        </DialogHeader>

        <div className="space-y-4 text-[11px]">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">수령인 이름 *</Label>
              <Input
                value={form.recipientName}
                onChange={(e) => set('recipientName', e.target.value)}
                placeholder="수령인 이름"
                className="h-8 text-[11px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">연락처 *</Label>
              <Input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="010-0000-0000"
                className="h-8 text-[11px]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-[11px]">배송 주소 *</Label>
                <p className="text-[10px] text-gray-400">건물명·아파트명으로도 검색 가능</p>
              </div>
              <AddressSearch
                size="sm"
                inline
                onComplete={({ postalCode, address, isApartment: apt }) => {
                  set('postalCode', postalCode);
                  set('address', address);
                  set('addressDetail', '');
                  setIsApartment(!!apt);
                }}
              />
            </div>
            <Input
              value={form.address}
              readOnly
              placeholder="주소 검색 버튼을 눌러주세요"
              className="h-8 text-[11px] bg-gray-50"
            />
            <div className="space-y-1">
              <Input
                value={form.addressDetail}
                onChange={(e) => set('addressDetail', e.target.value)}
                placeholder={isApartment ? '동호수 입력 (필수)' : '상세주소 (건물명, 층수 등)'}
                className={`h-8 text-[11px] ${isApartment && !form.addressDetail.trim() ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
              />
              {isApartment && !form.addressDetail.trim() && (
                <p className="flex items-center gap-1 text-[10px] text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  아파트/연립은 동호수 입력이 필수입니다
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">배송방법</Label>
            <Select value={form.deliveryMethod} onValueChange={(v) => set('deliveryMethod', v)}>
              <SelectTrigger className="h-8 text-[11px]">
                <SelectValue placeholder="배송방법" />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_METHOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">배송메모</Label>
            <Textarea
              value={form.deliveryMemo}
              onChange={(e) => set('deliveryMemo', e.target.value)}
              placeholder="배송 시 요청사항 (예: 부재 시 경비실에 맡겨주세요)"
              rows={2}
              className="text-[11px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-[11px]">
            취소
          </Button>
          <Button onClick={handleSave} disabled={updateShipping.isPending} className="text-[11px]">
            {updateShipping.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Truck, Loader2 } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { AddressSearch } from '@/components/address-search';
import { useUpdateShipping, OrderShipping } from '@/hooks/use-orders';
import { useCourierList } from '@/hooks/use-delivery-tracking';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  shipping?: OrderShipping;
}

const DELIVERY_METHOD_OPTIONS = [
  { value: 'parcel', label: '택배' },
  { value: 'motorcycle', label: '오토바이퀵' },
  { value: 'freight', label: '화물' },
  { value: 'pickup', label: '방문수령' },
];

const FEE_TYPE_OPTIONS = [
  { value: 'free', label: '무료배송' },
  { value: 'conditional', label: '조건부무료' },
  { value: 'standard', label: '유료배송' },
];

const FARE_TYPE_OPTIONS = [
  { value: 'prepaid', label: '선불' },
  { value: 'cod', label: '착불' },
];

interface FormState {
  senderType: string;
  senderName: string;
  senderPhone: string;
  senderPostalCode: string;
  senderAddress: string;
  senderAddressDetail: string;
  receiverType: string;
  recipientName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  deliveryMethod: string;
  deliveryFee: string;
  deliveryFeeType: string;
  fareType: string;
  deliveryMemo: string;
  courierCode: string;
  trackingNumber: string;
}

function toFormState(s?: OrderShipping): FormState {
  return {
    senderType: s?.senderType ?? '',
    senderName: s?.senderName ?? '',
    senderPhone: s?.senderPhone ?? '',
    senderPostalCode: s?.senderPostalCode ?? '',
    senderAddress: s?.senderAddress ?? '',
    senderAddressDetail: s?.senderAddressDetail ?? '',
    receiverType: s?.receiverType ?? '',
    recipientName: s?.recipientName ?? '',
    phone: s?.phone ?? '',
    postalCode: s?.postalCode ?? '',
    address: s?.address ?? '',
    addressDetail: s?.addressDetail ?? '',
    deliveryMethod: s?.deliveryMethod ?? 'parcel',
    deliveryFee: s?.deliveryFee != null ? String(s.deliveryFee) : '',
    deliveryFeeType: s?.deliveryFeeType ?? 'standard',
    fareType: s?.fareType ?? 'prepaid',
    deliveryMemo: s?.deliveryMemo ?? '',
    courierCode: s?.courierCode ?? '06',
    trackingNumber: s?.trackingNumber ?? '',
  };
}

export function ShippingInfoEditDialog({ open, onOpenChange, orderId, orderNumber, shipping }: Props) {
  const [form, setForm] = useState<FormState>(toFormState(shipping));
  const { data: couriers = [] } = useCourierList();
  const updateShipping = useUpdateShipping();

  useEffect(() => {
    if (open) setForm(toFormState(shipping));
  }, [open, shipping]);

  const set = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!form.recipientName.trim()) {
      toast({ title: '수령인 이름을 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!form.address.trim()) {
      toast({ title: '수령인 주소를 입력해주세요.', variant: 'destructive' });
      return;
    }

    updateShipping.mutate(
      {
        orderId,
        senderType: form.senderType || undefined,
        senderName: form.senderName || undefined,
        senderPhone: form.senderPhone || undefined,
        senderPostalCode: form.senderPostalCode || undefined,
        senderAddress: form.senderAddress || undefined,
        senderAddressDetail: form.senderAddressDetail || undefined,
        receiverType: form.receiverType || undefined,
        recipientName: form.recipientName,
        phone: form.phone,
        postalCode: form.postalCode,
        address: form.address,
        addressDetail: form.addressDetail || undefined,
        deliveryMethod: form.deliveryMethod || undefined,
        deliveryFee: form.deliveryFee ? Number(form.deliveryFee) : undefined,
        deliveryFeeType: form.deliveryFeeType || undefined,
        fareType: form.fareType || undefined,
        deliveryMemo: form.deliveryMemo || undefined,
        courierCode: form.courierCode || undefined,
        trackingNumber: form.trackingNumber || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: '배송정보가 저장되었습니다.' });
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : '배송정보 저장에 실패했습니다.';
          toast({ title: msg, variant: 'destructive' });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[13px]">
            <Truck className="h-4 w-4" />
            배송정보 수정 — {orderNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-[11px]">

          {/* 발송인 */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-gray-500">발송인</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">발송인 유형</Label>
                <Select value={form.senderType} onValueChange={(v) => set('senderType', v)}>
                  <SelectTrigger className="h-8 text-[11px]">
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">제작사 발송</SelectItem>
                    <SelectItem value="studio">스튜디오 발송</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">발송인 이름</Label>
                <Input
                  value={form.senderName}
                  onChange={(e) => set('senderName', e.target.value)}
                  placeholder="발송인 이름"
                  className="h-8 text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">발송인 전화번호</Label>
                <Input
                  value={form.senderPhone}
                  onChange={(e) => set('senderPhone', e.target.value)}
                  placeholder="010-0000-0000"
                  className="h-8 text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">우편번호</Label>
                <Input
                  value={form.senderPostalCode}
                  onChange={(e) => set('senderPostalCode', e.target.value)}
                  placeholder="우편번호"
                  className="h-8 text-[11px]"
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px]">발송인 주소</Label>
                <AddressSearch
                  size="sm"
                  inline
                  onComplete={({ postalCode, address }) => {
                    set('senderPostalCode', postalCode);
                    set('senderAddress', address);
                  }}
                />
              </div>
              <Input
                value={form.senderAddress}
                onChange={(e) => set('senderAddress', e.target.value)}
                placeholder="주소"
                className="h-8 text-[11px]"
              />
              <Input
                value={form.senderAddressDetail}
                onChange={(e) => set('senderAddressDetail', e.target.value)}
                placeholder="상세주소"
                className="h-8 text-[11px]"
              />
            </div>
          </div>

          <Separator />

          {/* 수령인 */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-gray-500">수령인</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">수령인 유형</Label>
                <Select value={form.receiverType} onValueChange={(v) => set('receiverType', v)}>
                  <SelectTrigger className="h-8 text-[11px]">
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_customer">고객 직배송</SelectItem>
                    <SelectItem value="studio">스튜디오 배송</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <Label className="text-[11px]">수령인 전화번호</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="010-0000-0000"
                  className="h-8 text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">우편번호</Label>
                <Input
                  value={form.postalCode}
                  onChange={(e) => set('postalCode', e.target.value)}
                  placeholder="우편번호"
                  className="h-8 text-[11px]"
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px]">수령인 주소 *</Label>
                <AddressSearch
                  size="sm"
                  inline
                  onComplete={({ postalCode, address }) => {
                    set('postalCode', postalCode);
                    set('address', address);
                  }}
                />
              </div>
              <Input
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="주소"
                className="h-8 text-[11px]"
              />
              <Input
                value={form.addressDetail}
                onChange={(e) => set('addressDetail', e.target.value)}
                placeholder="상세주소"
                className="h-8 text-[11px]"
              />
            </div>
          </div>

          <Separator />

          {/* 배송 방법/비용 */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-gray-500">배송 방법 / 비용</p>
            <div className="grid grid-cols-2 gap-2">
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
                <Label className="text-[11px]">배송비 (원)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.deliveryFee}
                  onChange={(e) => set('deliveryFee', e.target.value)}
                  placeholder="0"
                  className="h-8 text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">배송형태</Label>
                <Select value={form.deliveryFeeType} onValueChange={(v) => set('deliveryFeeType', v)}>
                  <SelectTrigger className="h-8 text-[11px]">
                    <SelectValue placeholder="배송형태" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEE_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">운임구분</Label>
                <Select value={form.fareType} onValueChange={(v) => set('fareType', v)}>
                  <SelectTrigger className="h-8 text-[11px]">
                    <SelectValue placeholder="운임구분" />
                  </SelectTrigger>
                  <SelectContent>
                    {FARE_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">배송메모</Label>
              <Textarea
                value={form.deliveryMemo}
                onChange={(e) => set('deliveryMemo', e.target.value)}
                placeholder="배송 시 요청사항"
                rows={2}
                className="text-[11px] resize-none"
              />
            </div>
          </div>

          <Separator />

          {/* 택배사 / 송장 */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-gray-500">택배사 / 송장</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">택배사</Label>
                <Select value={form.courierCode} onValueChange={(v) => set('courierCode', v)}>
                  <SelectTrigger className="h-8 text-[11px]">
                    <SelectValue placeholder="택배사 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {couriers.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">송장번호</Label>
                <Input
                  value={form.trackingNumber}
                  onChange={(e) => set('trackingNumber', e.target.value)}
                  placeholder="송장번호 입력"
                  className="h-8 text-[11px] font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-[11px]">
            닫기
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

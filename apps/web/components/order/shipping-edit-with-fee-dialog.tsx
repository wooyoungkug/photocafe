'use client';

import { useState, useEffect } from 'react';
import { Truck, Loader2, ArrowRight, CreditCard, Building2, AlertCircle } from 'lucide-react';
import { DaumAddressFields } from '@/components/daum-address-fields';
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
import {
  useUpdateShippingWithFee,
  UpdateShippingWithFeeResult,
  OrderShipping,
} from '@/hooks/use-orders';
import { toast } from '@/hooks/use-toast';

interface StudioInfo {
  clientName?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  shipping?: OrderShipping;
  creditEnabled?: boolean;
  paymentCondition?: string; // 당월말/익월말/2개월여신 등 정산조건
  studioInfo?: StudioInfo;
}

interface FormState {
  receiverType: string;
  recipientName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  deliveryMemo: string;
}

function toFormState(s?: OrderShipping): FormState {
  return {
    receiverType: s?.receiverType === 'direct_customer' ? 'direct_customer' : 'studio',
    recipientName: s?.recipientName ?? '',
    phone: s?.phone ?? '',
    postalCode: s?.postalCode ?? '',
    address: s?.address ?? '',
    addressDetail: s?.addressDetail ?? '',
    deliveryMemo: s?.deliveryMemo ?? '',
  };
}

function detectApartmentFromAddress(address: string): boolean {
  if (!address) return false;
  return /아파트|APT|apt|\(.*동.*\)/.test(address);
}

export function ShippingEditWithFeeDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  shipping,
  creditEnabled = false,
  paymentCondition,
  studioInfo,
}: Props) {
  // 정산조건이 있으면(당월말/익월말 등) 여신거래 고객, 없으면 주문시결제(무통장) 고객
  const isSettlementClient = !!paymentCondition || creditEnabled;
  const isCashClient = !isSettlementClient;

  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [form, setForm] = useState<FormState>(toFormState(shipping));
  const [isApartment, setIsApartment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>(
    isCashClient ? 'bank_transfer' : 'credit'
  );
  const [result, setResult] = useState<UpdateShippingWithFeeResult | null>(null);
  // 고객 직배송 ↔ 스튜디오 배송 전환 시 이전 입력값 보존
  const [savedDirectCustomerForm, setSavedDirectCustomerForm] = useState<Omit<FormState, 'receiverType'> | null>(
    shipping?.receiverType === 'direct_customer'
      ? { recipientName: shipping.recipientName, phone: shipping.phone, postalCode: shipping.postalCode, address: shipping.address, addressDetail: shipping.addressDetail ?? '', deliveryMemo: shipping.deliveryMemo ?? '' }
      : null
  );

  const updateShippingWithFee = useUpdateShippingWithFee();

  useEffect(() => {
    if (open) {
      setStep('form');
      const initial = toFormState(shipping);
      setForm(initial);
      setPaymentMethod(isCashClient ? 'bank_transfer' : 'credit');
      setResult(null);
      setIsApartment(detectApartmentFromAddress(initial.address));
      setSavedDirectCustomerForm(
        shipping?.receiverType === 'direct_customer'
          ? { recipientName: shipping.recipientName, phone: shipping.phone, postalCode: shipping.postalCode, address: shipping.address, addressDetail: shipping.addressDetail ?? '', deliveryMemo: shipping.deliveryMemo ?? '' }
          : null
      );
    }
  }, [open, shipping]);

  const set = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.startsWith('02')) {
      if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
    }
    if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePreview = () => {
    if (!form.recipientName.trim()) {
      toast({ title: '수령인 이름을 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!form.phone.trim()) {
      toast({ title: '전화번호를 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!form.address.trim()) {
      toast({ title: '수령인 주소를 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!form.addressDetail.trim()) {
      toast({ title: '상세주소를 입력해주세요.', description: '건물명, 층수, 동호수 등을 입력해주세요.', variant: 'destructive' });
      return;
    }
    setStep('confirm');
  };

  const handleSave = () => {
    updateShippingWithFee.mutate(
      {
        orderId,
        receiverType: form.receiverType || undefined,
        recipientName: form.recipientName,
        phone: form.phone,
        postalCode: form.postalCode,
        address: form.address,
        addressDetail: form.addressDetail || undefined,
        deliveryMemo: form.deliveryMemo || undefined,
        paymentMethod: result?.paymentRequired ? paymentMethod : undefined,
      },
      {
        onSuccess: (data) => {
          setResult(data);
          if (data.paymentRequired) {
            const msg = paymentMethod === 'credit'
              ? '여신 거래로 처리되었습니다. 다음 결제일에 청구됩니다.'
              : `배송비 ${data.feeDifference.toLocaleString()}원이 추가되었습니다.${data.bankAccount ? `\n입금계좌: ${data.bankAccount}` : ''}`;
            toast({ title: '배송정보가 저장되었습니다.', description: msg });
          } else if (data.creditAdded > 0) {
            toast({
              title: '배송정보가 저장되었습니다.',
              description: `${data.creditAdded.toLocaleString()}원이 크레딧으로 적립되었습니다. 다음 주문 시 자동 차감됩니다.`,
            });
          } else {
            toast({ title: '배송정보가 저장되었습니다.' });
          }
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : '배송정보 저장에 실패했습니다.';
          toast({ title: msg, variant: 'destructive' });
        },
      }
    );
  };

  const receiverTypeLabel = (type: string) =>
    type === 'direct_customer' ? '고객 직배송' : '스튜디오 배송';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto text-[12px] [&_label]:text-[12px] [&_input]:text-[12px] [&_textarea]:text-[12px] [&_button]:text-[12px] [&_select]:text-[12px] [&_[role=combobox]]:text-[12px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[13px]">
            <Truck className="h-4 w-4" />
            배송정보 수정 — {orderNumber}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4 text-[12px]">
            {/* 수령인 유형 */}
            <div className="space-y-1">
              <Label className="text-[12px]">배송 유형</Label>
              <Select
                value={form.receiverType}
                onValueChange={(v) => {
                  if (v === 'direct_customer') {
                    // 이전에 입력했던 고객 직배송 주소가 있으면 복원, 없으면 초기화
                    if (savedDirectCustomerForm) {
                      setForm({ receiverType: 'direct_customer', ...savedDirectCustomerForm });
                    } else {
                      setForm((prev) => ({
                        ...prev,
                        receiverType: 'direct_customer',
                        recipientName: '',
                        phone: '',
                        postalCode: '',
                        address: '',
                        addressDetail: '',
                        deliveryMemo: '',
                      }));
                    }
                  } else {
                    // 스튜디오 배송으로 전환 전 현재 고객 직배송 입력값 저장
                    if (form.receiverType === 'direct_customer') {
                      setSavedDirectCustomerForm({
                        recipientName: form.recipientName,
                        phone: form.phone,
                        postalCode: form.postalCode,
                        address: form.address,
                        addressDetail: form.addressDetail,
                        deliveryMemo: form.deliveryMemo,
                      });
                    }
                    // 스튜디오 배송으로 변경 시 studioInfo가 있으면 스튜디오 주소로 채움
                    if (studioInfo?.address) {
                      setForm({
                        receiverType: 'studio',
                        recipientName: studioInfo.clientName ?? '',
                        phone: studioInfo.phone ?? '',
                        postalCode: studioInfo.postalCode ?? '',
                        address: studioInfo.address,
                        addressDetail: studioInfo.addressDetail ?? '',
                        deliveryMemo: '',
                      });
                    } else {
                      setForm({ ...toFormState(shipping), receiverType: 'studio' });
                    }
                  }
                }}
              >
                <SelectTrigger className="h-8 text-[12px]">
                  <span>
                    {form.receiverType === 'studio' ? '스튜디오 배송'
                      : form.receiverType === 'direct_customer' ? '고객 직배송'
                      : '배송 유형 선택'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="studio" className="text-[12px]">스튜디오 배송</SelectItem>
                  <SelectItem value="direct_customer" className="text-[12px]">고객 직배송</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* 수령인 정보 */}
            <div className="space-y-3">
              <p className="text-[12px] font-medium text-gray-500">수령인</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[12px]">수령인 이름 *</Label>
                  <Input
                    value={form.recipientName}
                    onChange={(e) => set('recipientName', e.target.value)}
                    placeholder="수령인 이름"
                    className="h-8 text-[12px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[12px]">전화번호 *</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => set('phone', formatPhone(e.target.value))}
                    placeholder="010-0000-0000"
                    maxLength={13}
                    className="h-8 text-[12px]"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[12px]">주소 *</Label>
                <DaumAddressFields
                  showLabel={false}
                  postalCode={form.postalCode}
                  address={form.address}
                  addressDetail={form.addressDetail}
                  detailPlaceholder="상세주소 (건물명, 층수, 동호수 등) *"
                  onComplete={({ postalCode, address, isApartment: apt }) => {
                    set('postalCode', postalCode);
                    set('address', address);
                    set('addressDetail', '');
                    setIsApartment(!!apt);
                  }}
                  onAddressDetailChange={(v) => set('addressDetail', v)}
                />
                {!form.addressDetail.trim() && (
                  <p className="flex items-center gap-1 text-[11px] text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    상세주소를 입력해주세요
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[12px]">배송메모</Label>
              <Textarea
                value={form.deliveryMemo}
                onChange={(e) => set('deliveryMemo', e.target.value)}
                placeholder="배송 시 요청사항"
                rows={2}
                className="text-[12px] resize-none"
              />
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 text-[12px]">
            {/* 배송지 요약 */}
            <div className="rounded-lg border p-3 space-y-1 bg-gray-50">
              <p className="font-medium">
                {receiverTypeLabel(form.receiverType)}
                {shipping?.receiverType && shipping.receiverType !== form.receiverType && (
                  <span className="text-gray-400 ml-1">
                    ({receiverTypeLabel(shipping.receiverType)} <ArrowRight className="inline h-3 w-3" /> {receiverTypeLabel(form.receiverType)})
                  </span>
                )}
              </p>
              <p>{form.recipientName} {form.phone && `/ ${form.phone}`}</p>
              <p className="text-gray-600">{form.postalCode && `[${form.postalCode}] `}{form.address}{form.addressDetail && ` ${form.addressDetail}`}</p>
              {form.deliveryMemo && <p className="text-gray-500">메모: {form.deliveryMemo}</p>}
            </div>

            {/* 배송비 안내 박스 (저장 후 서버에서 계산됨) */}
            <div className="rounded-lg border p-3 space-y-3">
              <p className="font-medium text-gray-700">배송비 처리 안내</p>

              {form.receiverType !== shipping?.receiverType && (
                <>
                  {form.receiverType === 'direct_customer' ? (
                    <div className="space-y-2">
                      <p className="text-amber-700 bg-amber-50 rounded p-2">
                        배송 유형이 <strong>고객 직배송</strong>으로 변경되어 배송비가 추가될 수 있습니다.
                      </p>
                      <div className="space-y-1">
                        <Label className="text-[12px]">결제 방법</Label>
                        <div className="flex flex-col gap-2">
                          {isCashClient && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="bank_transfer"
                                checked={paymentMethod === 'bank_transfer'}
                                onChange={() => setPaymentMethod('bank_transfer')}
                                className="accent-blue-600"
                              />
                              <Building2 className="h-3.5 w-3.5 text-gray-500" />
                              <span>무통장입금</span>
                            </label>
                          )}
                          {isSettlementClient && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="credit"
                                checked={paymentMethod === 'credit'}
                                onChange={() => setPaymentMethod('credit')}
                                className="accent-blue-600"
                              />
                              <CreditCard className="h-3.5 w-3.5 text-gray-500" />
                              <span>여신거래{paymentCondition ? ` (${paymentCondition} 정산)` : ' (다음 결제일 청구)'}</span>
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-blue-700 bg-blue-50 rounded p-2">
                      배송 유형이 <strong>스튜디오 배송</strong>으로 변경되어 배송비 차액이 크레딧으로 적립될 수 있습니다.
                      적립된 크레딧은 다음 주문 시 자동 차감됩니다.
                    </p>
                  )}
                </>
              )}

              {form.receiverType === shipping?.receiverType && (
                <p className="text-gray-500">배송 유형이 변경되지 않아 배송비 변동이 없습니다.</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'form' ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="text-[12px]">
                닫기
              </Button>
              <Button onClick={handlePreview} className="text-[12px]">
                다음
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('form')} className="text-[12px]">
                이전
              </Button>
              <Button onClick={handleSave} disabled={updateShippingWithFee.isPending} className="text-[12px]">
                {updateShippingWithFee.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                저장
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

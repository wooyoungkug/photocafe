'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Truck, Building2, User, MapPin, Package } from 'lucide-react';
import { AddressSearch } from '@/components/address-search';
import {
  type FolderShippingInfo,
  type SenderType,
  type ReceiverType,
  type FolderDeliveryMethod,
} from '@/stores/multi-folder-upload-store';
import type { CompanyShippingInfo, OrdererShippingInfo } from '@/hooks/use-shipping-data';
import type { DeliveryPricing } from '@/hooks/use-delivery-pricing';

const DELIVERY_METHOD_OPTIONS: { value: FolderDeliveryMethod; label: string }[] = [
  { value: 'parcel', label: '택배' },
  { value: 'freight', label: '화물' },
  { value: 'motorcycle', label: '오토바이퀵' },
  { value: 'pickup', label: '방문수령' },
];

interface FolderShippingSectionProps {
  shippingInfo?: FolderShippingInfo;
  companyInfo: CompanyShippingInfo | null;
  clientInfo: OrdererShippingInfo | null;
  pricingMap: Record<string, DeliveryPricing>;
  onChange: (shipping: FolderShippingInfo) => void;
  studioTotal?: number;
}

export function FolderShippingSection({
  shippingInfo,
  companyInfo,
  clientInfo,
  pricingMap,
  onChange,
  studioTotal,
}: FolderShippingSectionProps) {
  // 로컬 상태
  const [senderType, setSenderType] = useState<SenderType>(shippingInfo?.senderType || 'company');
  const [receiverType, setReceiverType] = useState<ReceiverType>(shippingInfo?.receiverType || 'orderer');
  const [deliveryMethod, setDeliveryMethod] = useState<FolderDeliveryMethod>(shippingInfo?.deliveryMethod || 'parcel');

  // 고객직배송 시 수동 입력 필드
  const [directRecipientName, setDirectRecipientName] = useState(shippingInfo?.receiverType === 'direct_customer' ? shippingInfo?.recipientName || '' : '');
  const [directPhone, setDirectPhone] = useState(shippingInfo?.receiverType === 'direct_customer' ? shippingInfo?.recipientPhone || '' : '');
  const [directPostalCode, setDirectPostalCode] = useState(shippingInfo?.receiverType === 'direct_customer' ? shippingInfo?.recipientPostalCode || '' : '');
  const [directAddress, setDirectAddress] = useState(shippingInfo?.receiverType === 'direct_customer' ? shippingInfo?.recipientAddress || '' : '');
  const [directAddressDetail, setDirectAddressDetail] = useState(shippingInfo?.receiverType === 'direct_customer' ? shippingInfo?.recipientAddressDetail || '' : '');

  // 배송비 계산
  const calculateDeliveryFee = useCallback(
    (method: FolderDeliveryMethod, recvType: ReceiverType): { fee: number; feeType: string } => {
      // 방문수령: 항상 무료
      if (method === 'pickup') {
        return { fee: 0, feeType: 'free' };
      }

      // 스튜디오(주문자) 배송
      if (recvType === 'orderer') {
        const shippingType = clientInfo?.shippingType || 'conditional';

        if (shippingType === 'free') {
          return { fee: 0, feeType: 'free' };
        }
        if (shippingType === 'conditional') {
          const parcelPricing = pricingMap['parcel'];
          const baseFee = parcelPricing ? Number(parcelPricing.baseFee) : 3500;
          // per-client 기준금액 우선, 없으면 90,000원 기본값
          const freeThreshold = clientInfo?.freeShippingThreshold ?? 90000;
          // 상품금액이 무료배송 임계값 이상이면 0원
          if (itemTotal != null && itemTotal >= freeThreshold) {
            return { fee: 0, feeType: 'free' };
          }
          return { fee: baseFee, feeType: 'conditional' };
        }
        if (shippingType === 'prepaid') {
          const parcelPricing = pricingMap['parcel'];
          const baseFee = parcelPricing ? Number(parcelPricing.baseFee) : 3500;
          return { fee: baseFee, feeType: 'standard' };
        }
        // cod (착불): 주문에서는 0원
        return { fee: 0, feeType: 'free' };
      }

      // 고객직배송
      const pricing = pricingMap[method];
      if (!pricing) {
        return { fee: 3500, feeType: 'standard' };
      }
      return { fee: Number(pricing.baseFee), feeType: 'standard' };
    },
    [clientInfo, pricingMap, itemTotal]
  );

  // 변경 시 부모에게 전달
  const emitChange = useCallback(() => {
    // 발송지 정보
    let senderName = '';
    let senderPhone = '';
    let senderPostalCode = '';
    let senderAddress = '';
    let senderAddressDetail = '';

    if (senderType === 'company' && companyInfo) {
      senderName = companyInfo.name;
      senderPhone = companyInfo.phone;
      senderPostalCode = companyInfo.postalCode;
      senderAddress = companyInfo.address;
      senderAddressDetail = companyInfo.addressDetail;
    } else if (senderType === 'orderer' && clientInfo) {
      senderName = clientInfo.clientName;
      senderPhone = clientInfo.phone;
      senderPostalCode = clientInfo.postalCode;
      senderAddress = clientInfo.address;
      senderAddressDetail = clientInfo.addressDetail;
    }

    // 배송지 정보
    let recipientName = '';
    let recipientPhone = '';
    let recipientPostalCode = '';
    let recipientAddress = '';
    let recipientAddressDetail = '';

    if (receiverType === 'orderer' && clientInfo) {
      recipientName = clientInfo.clientName;
      recipientPhone = clientInfo.phone;
      recipientPostalCode = clientInfo.postalCode;
      recipientAddress = clientInfo.address;
      recipientAddressDetail = clientInfo.addressDetail;
    } else if (receiverType === 'direct_customer') {
      recipientName = directRecipientName;
      recipientPhone = directPhone;
      recipientPostalCode = directPostalCode;
      recipientAddress = directAddress;
      recipientAddressDetail = directAddressDetail;
    }

    // 배송비 계산
    const { fee, feeType } = calculateDeliveryFee(deliveryMethod, receiverType);

    onChange({
      senderType,
      senderName,
      senderPhone,
      senderPostalCode,
      senderAddress,
      senderAddressDetail,
      receiverType,
      recipientName,
      recipientPhone,
      recipientPostalCode,
      recipientAddress,
      recipientAddressDetail,
      deliveryMethod,
      deliveryFee: fee,
      deliveryFeeType: feeType,
    });
  }, [
    senderType, receiverType, deliveryMethod,
    companyInfo, clientInfo,
    directRecipientName, directPhone, directPostalCode, directAddress, directAddressDetail,
    calculateDeliveryFee, onChange,
  ]);

  // 상태 변경 시 자동 emit
  useEffect(() => {
    emitChange();
  }, [senderType, receiverType, deliveryMethod, directRecipientName, directPhone, directPostalCode, directAddress, directAddressDetail, itemTotal]);

  // 배송지가 고객직배송이면 방문수령 비활성
  const availableMethods = receiverType === 'direct_customer'
    ? DELIVERY_METHOD_OPTIONS.filter((m) => m.value !== 'pickup')
    : DELIVERY_METHOD_OPTIONS;

  // 고객직배송으로 변경 시 방문수령이면 택배로 전환
  useEffect(() => {
    if (receiverType === 'direct_customer' && deliveryMethod === 'pickup') {
      setDeliveryMethod('parcel');
    }
  }, [receiverType, deliveryMethod]);

  const { fee } = calculateDeliveryFee(deliveryMethod, receiverType);
  const feeLabel = fee === 0 ? '무료' : `${fee.toLocaleString()}원`;

  const parcelFreeThreshold = pricingMap['parcel']?.freeThreshold != null
    ? Number(pricingMap['parcel'].freeThreshold)
    : null;
  const isConditionalFree = clientInfo?.shippingType === 'conditional'
    && parcelFreeThreshold != null
    && itemTotal != null
    && itemTotal >= parcelFreeThreshold;

  const shippingTypeLabel = clientInfo?.shippingType === 'free' ? '(무료배송 회원)' :
    clientInfo?.shippingType === 'conditional'
      ? isConditionalFree
        ? `(조건부 무료)`
        : parcelFreeThreshold != null
          ? `(${parcelFreeThreshold.toLocaleString()}원 이상 무료)`
          : '(조건부 무료)'
      : clientInfo?.shippingType === 'cod' ? '(착불)' : '';

  return (
    <div className="space-y-4">
      {/* 발송지 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Building2 className="h-3.5 w-3.5" />
          발송지
        </div>
        <RadioGroup
          value={senderType}
          onValueChange={(v) => setSenderType(v as SenderType)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="company" id="sender-company" />
            <Label htmlFor="sender-company" className="text-sm cursor-pointer">포토미(회사)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="orderer" id="sender-orderer" />
            <Label htmlFor="sender-orderer" className="text-sm cursor-pointer">주문자 정보</Label>
          </div>
        </RadioGroup>
        {/* 발송지 정보 표시 */}
        <div className="bg-gray-50 rounded-md p-2.5 text-xs text-gray-600">
          {senderType === 'company' && companyInfo ? (
            <div className="space-y-0.5">
              <div className="font-medium">{companyInfo.name} / {companyInfo.phone}</div>
              <div>{companyInfo.postalCode && `[${companyInfo.postalCode}]`} {companyInfo.address} {companyInfo.addressDetail}</div>
            </div>
          ) : senderType === 'orderer' && clientInfo ? (
            <div className="space-y-0.5">
              <div className="font-medium">{clientInfo.clientName} / {clientInfo.phone}</div>
              <div>{clientInfo.postalCode && `[${clientInfo.postalCode}]`} {clientInfo.address} {clientInfo.addressDetail}</div>
            </div>
          ) : (
            <div className="text-gray-400">정보를 불러오는 중...</div>
          )}
        </div>
      </div>

      {/* 배송지 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-3.5 w-3.5" />
          배송지
          {receiverType === 'orderer' && shippingTypeLabel && (
            <Badge
              variant="outline"
              className={`text-[10px] font-normal ${isConditionalFree || clientInfo?.shippingType === 'free' ? 'border-green-400 text-green-700 bg-green-50' : ''}`}
            >
              {shippingTypeLabel}
            </Badge>
          )}
        </div>
        <RadioGroup
          value={receiverType}
          onValueChange={(v) => setReceiverType(v as ReceiverType)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="orderer" id="receiver-orderer" />
            <Label htmlFor="receiver-orderer" className="text-sm cursor-pointer">주문자(스튜디오)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="direct_customer" id="receiver-direct" />
            <Label htmlFor="receiver-direct" className="text-sm cursor-pointer">고객직배송</Label>
          </div>
        </RadioGroup>

        {receiverType === 'orderer' && clientInfo ? (
          <div className="bg-gray-50 rounded-md p-2.5 text-xs text-gray-600">
            <div className="space-y-0.5">
              <div className="font-medium">{clientInfo.clientName} / {clientInfo.phone}</div>
              <div>{clientInfo.postalCode && `[${clientInfo.postalCode}]`} {clientInfo.address} {clientInfo.addressDetail}</div>
            </div>
          </div>
        ) : receiverType === 'direct_customer' ? (
          <div className="space-y-2 border rounded-md p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-500">수령인 <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="수령인명"
                  value={directRecipientName}
                  onChange={(e) => setDirectRecipientName(e.target.value)}
                  className={`h-8 text-sm ${!directRecipientName.trim() ? 'border-red-300 focus-visible:ring-red-400' : ''}`}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">연락처 <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="010-0000-0000"
                  value={directPhone}
                  onChange={(e) => setDirectPhone(e.target.value)}
                  className={`h-8 text-sm ${!directPhone.trim() ? 'border-red-300 focus-visible:ring-red-400' : ''}`}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">주소 <span className="text-red-500">*</span></Label>
              <div className="flex gap-2 mb-1">
                <Input
                  placeholder="우편번호"
                  value={directPostalCode}
                  onChange={(e) => setDirectPostalCode(e.target.value)}
                  className="h-8 text-sm w-28"
                />
                <AddressSearch
                  size="sm"
                  inline
                  onComplete={(data) => {
                    setDirectPostalCode(data.postalCode);
                    setDirectAddress(data.address);
                  }}
                />
              </div>
              <Input
                placeholder="주소"
                value={directAddress}
                onChange={(e) => setDirectAddress(e.target.value)}
                className={`h-8 text-sm mb-1 ${!directAddress.trim() ? 'border-red-300 focus-visible:ring-red-400' : ''}`}
              />
              <Input
                placeholder="상세주소"
                value={directAddressDetail}
                onChange={(e) => setDirectAddressDetail(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            {(!directRecipientName.trim() || !directPhone.trim() || !directAddress.trim()) && (
              <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 rounded px-2.5 py-1.5">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                <span>
                  {[
                    !directRecipientName.trim() && '수령인',
                    !directPhone.trim() && '연락처',
                    !directAddress.trim() && '주소',
                  ].filter(Boolean).join(', ')}를 입력해주세요
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* 배송방법 + 배송비 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Truck className="h-3.5 w-3.5" />
          배송방법
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={deliveryMethod}
            onValueChange={(v) => setDeliveryMethod(v as FolderDeliveryMethod)}
          >
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMethods.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-sm font-medium">
              배송비: <span className={fee === 0 ? 'text-green-600' : 'text-blue-600'}>{feeLabel}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 배송 정보 한줄 요약
 */
export function getShippingSummary(info?: FolderShippingInfo): string {
  if (!info) return '배송정보 미설정';

  const methodLabel =
    info.deliveryMethod === 'parcel' ? '택배' :
    info.deliveryMethod === 'freight' ? '화물' :
    info.deliveryMethod === 'motorcycle' ? '오토바이퀵' :
    info.deliveryMethod === 'pickup' ? '방문수령' : info.deliveryMethod;

  const senderLabel = info.senderType === 'company' ? '회사' : '주문자';
  const receiverLabel = info.receiverType === 'orderer' ? '스튜디오' : '고객직배송';
  const feeLabel = info.deliveryFee === 0 ? '무료' : `${info.deliveryFee.toLocaleString()}원`;

  return `[${methodLabel}] ${senderLabel} → ${receiverLabel} (${feeLabel})`;
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
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
import { Truck, Building2, MapPin, Package, Search } from 'lucide-react';
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
  isCombinedShipping?: boolean;
}

export function FolderShippingSection({
  shippingInfo,
  companyInfo,
  clientInfo,
  pricingMap,
  onChange,
  studioTotal,
  isCombinedShipping,
}: FolderShippingSectionProps) {
  // 로컬 상태
  const [senderType, setSenderType] = useState<SenderType>(shippingInfo?.senderType || 'company');
  const [receiverType, setReceiverType] = useState<ReceiverType>(shippingInfo?.receiverType || 'orderer');
  const [deliveryMethod, setDeliveryMethod] = useState<FolderDeliveryMethod>(shippingInfo?.deliveryMethod || 'parcel');

  // 고객직배송 시 수동 입력 필드
  const [directRecipientName, setDirectRecipientName] = useState(shippingInfo?.receiverType === 'direct_customer' ? shippingInfo?.recipientName || '' : '');
  const [directPhone, setDirectPhone] = useState(shippingInfo?.receiverType === 'direct_customer' ? shippingInfo?.recipientPhone || '' : '');
  const [directPhone2, setDirectPhone2] = useState(shippingInfo?.receiverType === 'direct_customer' ? shippingInfo?.recipientPhone2 || '' : '');
  const [directPostalCode, setDirectPostalCode] = useState(shippingInfo?.receiverType === 'direct_customer' ? shippingInfo?.recipientPostalCode || '' : '');
  const [directAddress, setDirectAddress] = useState(shippingInfo?.receiverType === 'direct_customer' ? shippingInfo?.recipientAddress || '' : '');
  const [directAddressDetail, setDirectAddressDetail] = useState(shippingInfo?.receiverType === 'direct_customer' ? shippingInfo?.recipientAddressDetail || '' : '');
  const [deliveryMemo, setDeliveryMemo] = useState(shippingInfo?.deliveryMemo || '');
  const [fareType, setFareType] = useState<string>(shippingInfo?.fareType || 'prepaid');

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
          // 기준금액: Client 설정 → DeliveryPricing['parcel'].freeThreshold → 90,000원 순 fallback
          const freeThreshold = clientInfo?.freeShippingThreshold
            ?? (parcelPricing?.freeThreshold != null ? Number(parcelPricing.freeThreshold) : 90000);
          // 스튜디오배송 합계가 무료배송 임계값 이상이면 0원
          if (studioTotal != null && studioTotal >= freeThreshold) {
            return { fee: 0, feeType: 'free' };
          }
          return { fee: baseFee, feeType: 'conditional' };
        }
        if (shippingType === 'prepaid') {
          return { fee: 0, feeType: 'free' };
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
    [clientInfo, pricingMap, studioTotal]
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
      recipientPhone2: receiverType === 'direct_customer' ? directPhone2 : undefined,
      recipientPostalCode,
      recipientAddress,
      recipientAddressDetail,
      deliveryMethod,
      deliveryFee: fee,
      deliveryFeeType: feeType,
      fareType: (deliveryMethod === 'parcel' && fee > 0) ? fareType : undefined,
      deliveryMemo: deliveryMemo || undefined,
    });
  }, [
    senderType, receiverType, deliveryMethod, fareType,
    companyInfo, clientInfo,
    directRecipientName, directPhone, directPhone2, directPostalCode, directAddress, directAddressDetail,
    deliveryMemo, calculateDeliveryFee, onChange,
  ]);

  // 상태 변경 시 자동 emit
  useEffect(() => {
    emitChange();
  }, [senderType, receiverType, deliveryMethod, fareType, directRecipientName, directPhone, directPhone2, directPostalCode, directAddress, directAddressDetail, deliveryMemo, studioTotal]);

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
  const isThisCombined = isCombinedShipping && receiverType === 'orderer' && deliveryMethod !== 'pickup';
  const showFareType = deliveryMethod === 'parcel' && fee > 0;
  const feeLabel = isThisCombined
    ? '무료(묶음배송)'
    : fee === 0
      ? '무료'
      : fareType === 'cod'
        ? `${fee.toLocaleString()}원 (착불)`
        : `${fee.toLocaleString()}원`;

  const parcelFreeThreshold = clientInfo?.freeShippingThreshold
    ?? (pricingMap['parcel']?.freeThreshold != null ? Number(pricingMap['parcel'].freeThreshold) : 90000);
  const isConditionalFree = clientInfo?.shippingType === 'conditional'
    && studioTotal != null
    && studioTotal >= parcelFreeThreshold;

  const shippingTypeLabel = clientInfo?.shippingType === 'free' ? '(무료배송 회원)' :
    clientInfo?.shippingType === 'conditional'
      ? isConditionalFree
        ? `(스튜디오 합계 무료)`
        : parcelFreeThreshold != null
          ? `(스튜디오 합계 ${parcelFreeThreshold.toLocaleString()}원 이상 무료)`
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
          <DirectCustomerForm
            directRecipientName={directRecipientName}
            setDirectRecipientName={setDirectRecipientName}
            directPhone={directPhone}
            setDirectPhone={setDirectPhone}
            directPhone2={directPhone2}
            setDirectPhone2={setDirectPhone2}
            directPostalCode={directPostalCode}
            directAddress={directAddress}
            directAddressDetail={directAddressDetail}
            setDirectAddressDetail={setDirectAddressDetail}
            onAddressComplete={(data) => {
              setDirectPostalCode(data.postalCode);
              setDirectAddress(data.address);
            }}
          />
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
              배송비: <span className={fee === 0 ? 'text-green-600' : 'text-gray-900 font-normal'}>{feeLabel}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 운임구분 (택배 + 유료배송일 때만) */}
      {showFareType && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-3.5 w-3.5" />
            운임구분
          </div>
          <RadioGroup
            value={fareType}
            onValueChange={setFareType}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="prepaid" id={`fare-prepaid-${shippingInfo?.deliveryMethod}`} />
              <Label htmlFor={`fare-prepaid-${shippingInfo?.deliveryMethod}`} className="text-sm cursor-pointer">
                선불 <span className="text-xs text-gray-500">(발송인 부담)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cod" id={`fare-cod-${shippingInfo?.deliveryMethod}`} />
              <Label htmlFor={`fare-cod-${shippingInfo?.deliveryMethod}`} className="text-sm cursor-pointer">
                착불 <span className="text-xs text-gray-500">(수령인 부담)</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* 배송메모 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Package className="h-3.5 w-3.5" />
          배송메모
        </div>
        <Input
          placeholder="배송 시 요청사항 (예: 부재 시 경비실 맡겨주세요)"
          value={deliveryMemo}
          onChange={(e) => setDeliveryMemo(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
}

/**
 * 고객직배송 입력 폼 (컴팩트 버전)
 * - 주소 입력 필드 클릭 시 바로 다음 우편번호 검색 인라인 표시
 * - 연락처2는 토글로 숨김 처리 (기본 접힘)
 * - 최소 클릭, 최소 공간으로 빠른 입력
 */
function DirectCustomerForm({
  directRecipientName,
  setDirectRecipientName,
  directPhone,
  setDirectPhone,
  directPhone2,
  setDirectPhone2,
  directPostalCode,
  directAddress,
  directAddressDetail,
  setDirectAddressDetail,
  onAddressComplete,
}: {
  directRecipientName: string;
  setDirectRecipientName: (v: string) => void;
  directPhone: string;
  setDirectPhone: (v: string) => void;
  directPhone2: string;
  setDirectPhone2: (v: string) => void;
  directPostalCode: string;
  directAddress: string;
  directAddressDetail: string;
  setDirectAddressDetail: (v: string) => void;
  onAddressComplete: (data: { postalCode: string; address: string }) => void;
}) {
  const [showPhone2, setShowPhone2] = useState(!!directPhone2);
  const [addressSearchOpen, setAddressSearchOpen] = useState(false);

  const missingFields = [
    !directRecipientName.trim() && '수령인',
    !directPhone.trim() && '연락처',
    !directAddress.trim() && '주소',
  ].filter(Boolean);

  return (
    <div className="space-y-2 border rounded-md p-3">
      {/* Row 1: 수령인 + 연락처1 (2 columns) */}
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
          <div className="flex items-center justify-between">
            <Label className="text-xs text-gray-500">연락처 <span className="text-red-500">*</span></Label>
            {!showPhone2 && (
              <button
                type="button"
                onClick={() => setShowPhone2(true)}
                className="text-[11px] text-blue-500 hover:text-blue-700 hover:underline"
              >
                +백업번호
              </button>
            )}
          </div>
          <PhoneInput
            placeholder="010-0000-0000"
            value={directPhone}
            onChange={(value) => setDirectPhone(value)}
            className={`h-8 text-sm ${!directPhone.trim() ? 'border-red-300 focus-visible:ring-red-400' : ''}`}
          />
        </div>
      </div>

      {/* 연락처2: 토글로 표시/숨김 */}
      {showPhone2 && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs text-gray-500">연락처2 (백업)</Label>
            <PhoneInput
              placeholder="010-0000-0000"
              value={directPhone2}
              onChange={(value) => setDirectPhone2(value)}
              className="h-8 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => { setShowPhone2(false); setDirectPhone2(''); }}
            className="h-8 px-2 text-xs text-gray-400 hover:text-red-500"
            title="백업번호 삭제"
          >
            삭제
          </button>
        </div>
      )}

      {/* Row 2: 주소 - 클릭하면 바로 다음 검색 열림 */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-500">주소 <span className="text-red-500">*</span></Label>
        {directAddress ? (
          // 주소가 입력된 상태: 주소 표시 + 재검색 클릭 영역
          <div
            className="flex items-center gap-2 bg-gray-50 rounded px-2.5 py-1.5 text-[14px] text-black font-normal cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => setAddressSearchOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setAddressSearchOpen(true); }}
          >
            <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="flex-1 truncate">
              {directPostalCode && <span className="text-gray-500 text-xs">[{directPostalCode}] </span>}
              {directAddress}
            </span>
            <span className="text-[11px] text-blue-500 flex-shrink-0">변경</span>
          </div>
        ) : (
          // 주소 미입력: 검색 유도 클릭 영역
          <div
            className={`flex items-center gap-2 rounded px-2.5 py-2 cursor-pointer transition-colors ${
              !directAddress.trim()
                ? 'bg-red-50 border border-red-200 text-red-400 hover:bg-red-100'
                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
            }`}
            onClick={() => setAddressSearchOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setAddressSearchOpen(true); }}
          >
            <Search className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-sm">클릭하여 주소 검색</span>
          </div>
        )}

        {/* 다음 우편번호 인라인 embed */}
        <AddressSearch
          headless
          inline
          isOpen={addressSearchOpen}
          onOpenChange={setAddressSearchOpen}
          embedHeight={350}
          onComplete={(data) => {
            onAddressComplete(data);
            setAddressSearchOpen(false);
          }}
        />

        {/* 상세주소: 주소 선택 후 표시 */}
        {directAddress && (
          <Input
            placeholder="상세주소 (동/호수/층 등)"
            value={directAddressDetail}
            onChange={(e) => setDirectAddressDetail(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
        )}
      </div>

      {/* 미입력 경고 - 인라인 간결 표시 */}
      {missingFields.length > 0 && !addressSearchOpen && (
        <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 rounded px-2.5 py-1.5">
          <svg className="h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
          <span>{missingFields.join(', ')}를 입력해주세요</span>
        </div>
      )}
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
  const feeLabel = info.deliveryFee === 0
    ? '무료'
    : info.fareType === 'cod'
      ? `${info.deliveryFee.toLocaleString()}원/착불`
      : `${info.deliveryFee.toLocaleString()}원`;

  return `[${methodLabel}] ${senderLabel} → ${receiverLabel} (${feeLabel})`;
}

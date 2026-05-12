'use client';
// Reusable Daum postcode address fields.
// - postalCode + address are readOnly inputs; clicking either opens the inline Daum widget
// - addressDetail is a normal editable input
// - The Daum embed appears inline below the inputs and closes after selection

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

// Access the Daum postcode global without redeclaring `Window.daum`
// (the type may already be declared in components/address-search.tsx).
function getDaum(): any {
  return typeof window !== 'undefined' ? (window as any).daum : undefined;
}

interface DaumAddressFieldsProps {
  postalCode: string;
  address: string;
  addressDetail?: string;
  onComplete: (data: { postalCode: string; address: string; isApartment?: boolean }) => void;
  onAddressDetailChange?: (value: string) => void;
  showDetail?: boolean;         // default true
  detailPlaceholder?: string;   // default "상세주소"
  required?: boolean;           // adds * to label
  className?: string;
  embedHeight?: number;         // default 380
  label?: string | React.ReactNode;
  /** show label row above fields, default true */
  showLabel?: boolean;
  postalCodeClassName?: string;
  addressClassName?: string;
  detailClassName?: string;
}

export function DaumAddressFields({
  postalCode,
  address,
  addressDetail = '',
  onComplete,
  onAddressDetailChange,
  showDetail = true,
  detailPlaceholder = '상세주소',
  required = false,
  className = '',
  embedHeight = 380,
  label = '주소',
  showLabel = true,
  postalCodeClassName,
  addressClassName,
  detailClassName,
}: DaumAddressFieldsProps) {
  const [open, setOpen] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(!!getDaum());
  const embedRef = useRef<HTMLDivElement>(null);

  // Load Daum postcode script once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (getDaum()) { setScriptLoaded(true); return; }
    const existing = document.querySelector('script[src*="postcode.v2.js"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => setScriptLoaded(true));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  const handleComplete = useCallback((data: any) => {
    const addr = data.roadAddress || data.jibunAddress;
    let extra = '';
    if (data.addressType === 'R') {
      if (data.bname && /[동로가]$/.test(data.bname)) extra += data.bname;
      if (data.buildingName && data.apartment === 'Y')
        extra += (extra ? ', ' : '') + data.buildingName;
    }
    onComplete({
      postalCode: data.zonecode,
      address: addr + (extra ? ` (${extra})` : ''),
      isApartment: data.apartment === 'Y',
    });
    setOpen(false);
  }, [onComplete]);

  // Embed when open becomes true
  useEffect(() => {
    if (!open || !scriptLoaded || !embedRef.current) return;
    embedRef.current.innerHTML = '';
    new (getDaum().Postcode)({
      oncomplete: handleComplete,
      width: '100%',
      height: '100%',
    }).embed(embedRef.current, { autoClose: false });
  }, [open, scriptLoaded, handleComplete]);

  const openSearch = () => {
    if (!scriptLoaded) return;
    setOpen(true);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabel && (
        <Label className="text-[14px] font-normal text-black">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
      )}
      <div className="grid grid-cols-[120px_1fr] gap-2">
        <Input
          value={postalCode}
          readOnly
          placeholder="우편번호"
          onClick={openSearch}
          className={`text-[14px] cursor-pointer hover:border-gray-400 transition-colors ${postalCodeClassName || 'bg-gray-50'}`}
        />
        <Input
          value={address}
          readOnly
          placeholder="주소 검색을 클릭하세요"
          onClick={openSearch}
          className={`text-[14px] cursor-pointer hover:border-gray-400 transition-colors ${addressClassName || 'bg-gray-50'}`}
        />
      </div>
      {open && (
        <div className="border rounded-lg overflow-hidden relative">
          <button
            type="button"
            title="닫기"
            onClick={() => setOpen(false)}
            className="absolute top-1 right-1 z-10 bg-white rounded-full p-0.5 shadow hover:bg-gray-100"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
          <div ref={embedRef} style={{ height: `${embedHeight}px` }} />
        </div>
      )}
      {showDetail && (
        <Input
          value={addressDetail}
          onChange={(e) => onAddressDetailChange?.(e.target.value)}
          placeholder={detailPlaceholder}
          className={`text-[14px] ${detailClassName || ''}`}
        />
      )}
    </div>
  );
}

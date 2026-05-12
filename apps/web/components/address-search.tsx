'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, X } from 'lucide-react';

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
        onclose?: () => void;
        width?: string | number;
        height?: string | number;
      }) => {
        open: () => void;
        embed: (element: HTMLElement, options?: { autoClose?: boolean }) => void;
      };
    };
  }
}

interface DaumPostcodeData {
  zonecode: string;
  address: string;
  addressEnglish: string;
  addressType: 'R' | 'J';
  userSelectedType: 'R' | 'J';
  roadAddress: string;
  roadAddressEnglish: string;
  jibunAddress: string;
  jibunAddressEnglish: string;
  buildingCode: string;
  buildingName: string;
  apartment: 'Y' | 'N';
  sido: string;
  sigungu: string;
  sigunguCode: string;
  roadnameCode: string;
  bcode: string;
  roadname: string;
  bname: string;
  bname1: string;
  bname2: string;
  hname: string;
  query: string;
}

interface AddressSearchProps {
  onComplete: (data: {
    postalCode: string;
    address: string;
    addressDetail?: string;
    isApartment?: boolean;
    buildingCode?: string;
    buildingName?: string;
  }) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** true이면 카드 안에 인라인 임베드, false이면 팝업 */
  inline?: boolean;
  /** 외부에서 open/close 제어 (controlled mode) */
  isOpen?: boolean;
  /** controlled mode에서 닫힐 때 호출 */
  onOpenChange?: (open: boolean) => void;
  /** true이면 버튼 숨기고 embed 영역만 렌더 (controlled mode용) */
  headless?: boolean;
  /** embed 영역 높이 (기본: 400px) */
  embedHeight?: number;
}

export function AddressSearch({
  onComplete,
  className,
  variant = 'outline',
  size = 'default',
  inline = false,
  isOpen: controlledOpen,
  onOpenChange,
  headless = false,
  embedHeight = 400,
}: AddressSearchProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(
    typeof window !== 'undefined' && !!window.daum
  );
  const embedRef = useRef<HTMLDivElement>(null);

  // controlled vs uncontrolled
  const showEmbed = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setShowEmbed = useCallback((open: boolean) => {
    if (onOpenChange) onOpenChange(open);
    setInternalOpen(open);
  }, [onOpenChange]);

  // 다음 우편번호 스크립트 로드 — onload로 scriptLoaded 감지
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.daum) {
      setScriptLoaded(true);
      return;
    }
    // 이미 스크립트 태그가 삽입되었는지 확인
    const existing = document.querySelector(
      'script[src*="postcode.v2.js"]'
    ) as HTMLScriptElement | null;
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

  const handleComplete = useCallback(
    (data: DaumPostcodeData) => {
      const address = data.roadAddress || data.jibunAddress;

      let extraAddress = '';
      if (data.addressType === 'R') {
        if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
          extraAddress += data.bname;
        }
        if (data.buildingName !== '' && data.apartment === 'Y') {
          extraAddress += extraAddress !== '' ? ', ' + data.buildingName : data.buildingName;
        }
      }

      onComplete({
        postalCode: data.zonecode,
        address: address + (extraAddress ? ` (${extraAddress})` : ''),
        isApartment: data.apartment === 'Y',
        buildingCode: data.buildingCode,
        buildingName: data.buildingName,
      });

      setShowEmbed(false);
    },
    [onComplete, setShowEmbed]
  );

  const handleSearch = useCallback(() => {
    if (!scriptLoaded || !window.daum) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (inline || headless) {
      setShowEmbed(true);
    } else {
      new window.daum.Postcode({
        oncomplete: handleComplete,
      }).open();
    }
  }, [inline, headless, handleComplete, setShowEmbed, scriptLoaded]);

  // 인라인 모드: showEmbed && scriptLoaded가 되면 embed 렌더
  useEffect(() => {
    if ((inline || headless) && showEmbed && scriptLoaded && embedRef.current) {
      embedRef.current.innerHTML = '';
      new window.daum.Postcode({
        oncomplete: handleComplete,
        width: '100%',
        height: '100%',
      }).embed(embedRef.current, { autoClose: false });
    }
  }, [inline, headless, showEmbed, handleComplete, scriptLoaded]);

  return (
    <div className={(inline || headless) ? 'w-full' : undefined}>
      {!headless && (
        <Button
          type="button"
          variant={variant}
          size={size}
          onClick={handleSearch}
          className={className}
        >
          <MapPin className="h-4 w-4 mr-2" />
          주소 검색
        </Button>
      )}

      {(inline || headless) && showEmbed && (
        <div className={`${headless ? '' : 'mt-2 '}border rounded-lg overflow-hidden relative`}>
          <button
            type="button"
            title="닫기"
            onClick={() => setShowEmbed(false)}
            className="absolute top-1 right-1 z-10 bg-white rounded-full p-0.5 shadow hover:bg-gray-100"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
          <div ref={embedRef} style={{ height: `${embedHeight}px` }} />
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
        onclose?: () => void;
      }) => {
        open: () => void;
      };
    };
  }
}

interface DaumPostcodeData {
  zonecode: string; // 우편번호
  address: string; // 기본주소
  addressEnglish: string; // 영문주소
  addressType: 'R' | 'J'; // R: 도로명, J: 지번
  userSelectedType: 'R' | 'J';
  roadAddress: string; // 도로명주소
  roadAddressEnglish: string;
  jibunAddress: string; // 지번주소
  jibunAddressEnglish: string;
  buildingCode: string;
  buildingName: string;
  apartment: 'Y' | 'N';
  sido: string; // 시도
  sigungu: string; // 시군구
  sigunguCode: string;
  roadnameCode: string;
  bcode: string; // 법정동코드
  roadname: string; // 도로명
  bname: string; // 법정동/법정리
  bname1: string;
  bname2: string;
  hname: string; // 행정동
  query: string;
}

interface AddressSearchProps {
  onComplete: (data: {
    postalCode: string;
    address: string;
    addressDetail?: string;
  }) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function AddressSearch({
  onComplete,
  className,
  variant = 'outline',
  size = 'default',
}: AddressSearchProps) {
  // 다음 우편번호 스크립트 로드
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.daum) {
      const script = document.createElement('script');
      script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleSearch = useCallback(() => {
    if (typeof window === 'undefined' || !window.daum) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data: DaumPostcodeData) => {
        // 도로명 주소 우선, 없으면 지번 주소
        const address = data.roadAddress || data.jibunAddress;

        // 건물명이 있으면 추가
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
        });
      },
    }).open();
  }, [onComplete]);

  return (
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
  );
}

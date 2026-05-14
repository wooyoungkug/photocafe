'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    kakao: any;
  }
}

interface PlaceResult {
  placeName: string;
  address: string;
  roadAddress?: string;
  phone?: string;
  categoryName?: string;
}

interface VenueSearchInputProps {
  value: string;
  onChange: (name: string) => void;
  onSelect: (place: { name: string; address: string }) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  id?: string;
}

let sdkLoadPromise: Promise<void> | null = null;

function loadKakaoMapsSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.kakao?.maps?.services) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key) {
      sdkLoadPromise = null;
      reject(new Error('NEXT_PUBLIC_KAKAO_JS_KEY 미설정'));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services&autoload=false`;
    script.onload = () => {
      window.kakao.maps.load(() => resolve());
    };
    script.onerror = () => {
      sdkLoadPromise = null;
      reject(new Error('Kakao Maps SDK 로드 실패'));
    };
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

export function VenueSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = '예: 더채플앳청담',
  className,
  error,
  id,
}: VenueSearchInputProps) {
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 컴포넌트 마운트 시 SDK 미리 로드
  useEffect(() => {
    loadKakaoMapsSdk().catch(() => {});
  }, []);

  const search = useCallback((keyword: string) => {
    if (keyword.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    // SDK 로딩 완료까지 기다린 후 검색
    loadKakaoMapsSdk()
      .then(() => {
        const ps = new window.kakao.maps.services.Places();
        ps.keywordSearch(
          keyword,
          (data: any[], status: string) => {
            if (status === window.kakao.maps.services.Status.OK) {
              setResults(
                data.map((doc) => ({
                  placeName: doc.place_name,
                  address: doc.address_name,
                  roadAddress: doc.road_address_name || undefined,
                  phone: doc.phone || undefined,
                  categoryName: doc.category_name || undefined,
                })),
              );
              setIsOpen(true);
            } else {
              setResults([]);
              setIsOpen(false);
            }
            setActiveIndex(-1);
          },
          { size: 5 },
        );
      })
      .catch(() => {
        setResults([]);
        setIsOpen(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (place: PlaceResult) => {
    onSelect({
      name: place.placeName,
      address: place.address || place.roadAddress || '',
    });
    setIsOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        className={cn('text-[14px]', className)}
      />
      {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg max-h-[240px] overflow-y-auto">
          {results.map((place, idx) => (
            <button
              key={`${place.placeName}-${idx}`}
              type="button"
              className={cn(
                'w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b last:border-b-0 transition-colors',
                activeIndex === idx && 'bg-gray-50',
              )}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => handleSelect(place)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[14px] text-black font-medium truncate">
                    {place.placeName}
                  </p>
                  {place.roadAddress && (
                    <p className="text-[12px] text-gray-500 truncate">
                      {place.roadAddress}
                    </p>
                  )}
                  {place.address && (
                    <p className="text-[11px] text-gray-400 truncate">
                      {place.address}
                    </p>
                  )}
                  {place.categoryName && (
                    <p className="text-[11px] text-gray-400 truncate">
                      {place.categoryName}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

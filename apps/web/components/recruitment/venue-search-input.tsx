'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

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

  const search = useCallback(async (keyword: string) => {
    if (keyword.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    try {
      const data = await api.get<PlaceResult[]>('/place-search', { keyword });
      setResults(data);
      setIsOpen(data.length > 0);
      setActiveIndex(-1);
    } catch {
      setResults([]);
      setIsOpen(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (place: PlaceResult) => {
    // 지번 주소 우선 사용 (동 단위 포함) → 없으면 도로명 주소 사용
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

  // 외부 클릭 시 닫기
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

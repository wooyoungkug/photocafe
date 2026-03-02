'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { KOREAN_REGIONS, KOREAN_PROVINCES } from '@/lib/constants/korean-regions';

interface RegionSelectorProps {
  value?: string;           // "서울특별시 강남구"
  onChange: (value: string) => void;
  label?: string;           // "1순위"
}

export function RegionSelector({ value, onChange, label }: RegionSelectorProps) {
  // Parse initial value into province and district
  const { province, district } = useMemo(() => {
    if (!value) return { province: '', district: '' };
    const parts = value.split(' ');
    const prov = parts[0] || '';
    const dist = parts.slice(1).join(' ') || '';
    return { province: prov, district: dist };
  }, [value]);

  // Get available districts for the selected province
  const districts = useMemo(() => {
    if (!province) return [];
    return KOREAN_REGIONS[province] || [];
  }, [province]);

  const handleProvinceChange = (newProvince: string) => {
    // Reset district when province changes
    onChange(newProvince);
  };

  const handleDistrictChange = (newDistrict: string) => {
    onChange(`${province} ${newDistrict}`);
  };

  return (
    <div className="flex items-center gap-2">
      {label && (
        <Label className="text-[14px] text-black font-normal whitespace-nowrap min-w-[40px]">
          {label}
        </Label>
      )}
      <Select value={province} onValueChange={handleProvinceChange}>
        <SelectTrigger className="h-9 text-[14px] text-black font-normal flex-1">
          <SelectValue placeholder="시/도 선택" />
        </SelectTrigger>
        <SelectContent>
          {KOREAN_PROVINCES.map((prov) => (
            <SelectItem key={prov} value={prov} className="text-[14px]">
              {prov}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={district}
        onValueChange={handleDistrictChange}
        disabled={!province || districts.length === 0}
      >
        <SelectTrigger className="h-9 text-[14px] text-black font-normal flex-1">
          <SelectValue placeholder="시/군/구 선택" />
        </SelectTrigger>
        <SelectContent>
          {districts.map((dist) => (
            <SelectItem key={dist} value={dist} className="text-[14px]">
              {dist}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

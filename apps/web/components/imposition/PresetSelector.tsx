'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useImpositionPresets, ImpositionPreset } from '@/hooks/use-imposition';

interface Props {
  value: string | null;
  onChange: (preset: ImpositionPreset | null) => void;
  bindingType?: 'compressed' | 'tack' | 'perfect' | 'flat';
}

export default function PresetSelector({ value, onChange, bindingType }: Props) {
  const { data, isLoading } = useImpositionPresets(bindingType);
  const presets = data || [];

  return (
    <Select
      value={value ?? ''}
      onValueChange={(id) => {
        const p = presets.find((x) => x.id === id) || null;
        onChange(p);
      }}
    >
      <SelectTrigger className="h-9 text-[14px]">
        <SelectValue placeholder={isLoading ? '불러오는 중...' : '프리셋 선택'} />
      </SelectTrigger>
      <SelectContent>
        {presets.length === 0 && (
          <div className="p-2 text-[14px] text-black font-normal">
            저장된 프리셋이 없습니다.
          </div>
        )}
        {presets.map((p) => (
          <SelectItem key={p.id} value={p.id} className="text-[14px]">
            {p.isDefault && '★ '}
            {p.name} ({p.sheetWidth}×{p.sheetHeight})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

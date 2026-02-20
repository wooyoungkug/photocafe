'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { CopperPlate, CopperPlateLabels } from '@/hooks/use-copper-plates';
import type { PublicCopperPlate } from '@/hooks/use-public-copper-plates';

interface OptionCopperPlateProps {
  copperPlateType: 'none' | 'public' | 'owned';
  publicCopperPlates?: PublicCopperPlate[];
  ownedCopperPlates?: CopperPlate[];
  selectedPublicPlate?: PublicCopperPlate;
  selectedOwnedPlate?: CopperPlate;
  foilColor?: string;
  foilPosition?: string;
  copperPlateLabels?: CopperPlateLabels;
  isAuthenticated: boolean;
  onTypeChange: (type: 'none' | 'public' | 'owned') => void;
  onPublicPlateSelect: (plate: PublicCopperPlate) => void;
  onOwnedPlateSelect: (plate: CopperPlate) => void;
  onFoilColorChange: (code: string) => void;
  onFoilPositionChange: (code: string) => void;
}

export function OptionCopperPlate({
  copperPlateType, publicCopperPlates, ownedCopperPlates,
  selectedPublicPlate, selectedOwnedPlate, foilColor, foilPosition,
  copperPlateLabels, isAuthenticated,
  onTypeChange, onPublicPlateSelect, onOwnedPlateSelect, onFoilColorChange, onFoilPositionChange,
}: OptionCopperPlateProps) {
  const t = useTranslations('product');
  const initializedRef = useRef(false);

  const hasPublic = publicCopperPlates && publicCopperPlates.length > 0;
  const storedOwned = ownedCopperPlates?.filter(cp => cp.status === 'stored') || [];
  const hasOwned = isAuthenticated && storedOwned.length > 0;

  const activeColors = copperPlateLabels?.foilColors?.filter(c => c.isActive) ?? [];
  const activePositions = copperPlateLabels?.platePositions?.filter(p => p.isActive) ?? [];
  const hasColors = activeColors.length > 0;
  const hasPositions = activePositions.length > 0;

  if (!hasPublic && !hasOwned) return null;

  // 현재 선택된 동판 id → select value
  const selectedPlateValue =
    copperPlateType === 'public' && selectedPublicPlate ? `public:${selectedPublicPlate.id}` :
    copperPlateType === 'owned' && selectedOwnedPlate ? `owned:${selectedOwnedPlate.id}` :
    '';

  // 저장된 상품 불러올 때 초기화 방지
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    initializedRef.current = true;
  }, []);

  const handlePlateChange = (value: string) => {
    if (!value) {
      onTypeChange('none');
      return;
    }
    const [type, id] = value.split(':');
    if (type === 'public') {
      const plate = publicCopperPlates?.find(p => p.id === id);
      if (plate) { onTypeChange('public'); onPublicPlateSelect(plate); }
    } else if (type === 'owned') {
      const cp = storedOwned.find(p => p.id === id);
      if (cp) { onTypeChange('owned'); onOwnedPlateSelect(cp); }
    }
  };

  const selectClass = cn(
    'h-8 rounded border px-2 py-0 text-[10pt]',
    'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
    'appearance-none cursor-pointer min-w-0',
  );
  const selectedClass = 'border-blue-500 bg-transparent text-gray-900';
  const unselectedClass = 'border-gray-200 bg-white text-gray-700';

  return (
    <div className="flex items-center gap-2 flex-nowrap">
      {/* 동판 선택 드롭다운 */}
      <select
        value={selectedPlateValue}
        onChange={e => handlePlateChange(e.target.value)}
        title={t('copperPlate')}
        className={cn(selectClass, 'w-auto max-w-full', selectedPlateValue ? selectedClass : unselectedClass)}
      >
        <option value="">{t('noCopperPlate')}</option>
        {hasPublic && (
          <optgroup label={t('publicCopperPlate')}>
            {publicCopperPlates!.map(plate => (
              <option key={plate.id} value={`public:${plate.id}`}>
                {plate.plateName}
                {(plate.widthMm || plate.heightMm) ? ` (${plate.widthMm}×${plate.heightMm}mm)` : ''}
              </option>
            ))}
          </optgroup>
        )}
        {hasOwned && (
          <optgroup label={`${t('ownedCopperPlate')} (${storedOwned.length})`}>
            {storedOwned.map(cp => (
              <option key={cp.id} value={`owned:${cp.id}`}>
                {cp.plateName}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {/* 박 컬러 드롭다운 (동판 선택 시에만 표시) */}
      {copperPlateType !== 'none' && hasColors && (
        <select
          value={foilColor ?? ''}
          onChange={e => onFoilColorChange(e.target.value)}
          title={t('foilColor')}
          className={cn(selectClass, 'min-w-[90px]', foilColor ? selectedClass : unselectedClass)}
        >
          <option value="">{t('foilColor')}</option>
          {activeColors.map(color => (
            <option key={color.id} value={color.code}>{color.name}</option>
          ))}
        </select>
      )}

      {/* 박 위치 드롭다운 (동판 선택 시에만 표시) */}
      {copperPlateType !== 'none' && hasPositions && (
        <select
          value={foilPosition ?? ''}
          onChange={e => onFoilPositionChange(e.target.value)}
          title={t('foilPosition')}
          className={cn(selectClass, 'min-w-[80px]', foilPosition ? selectedClass : unselectedClass)}
        >
          <option value="">{t('foilPosition')}</option>
          {activePositions.map(pos => (
            <option key={pos.id} value={pos.code}>{pos.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}

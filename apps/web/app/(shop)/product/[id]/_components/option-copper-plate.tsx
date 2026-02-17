'use client';

import { Image as ImageIcon } from 'lucide-react';
import { cn, normalizeImageUrl } from '@/lib/utils';
import { useTranslations } from 'next-intl';
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
  const hasPublic = publicCopperPlates && publicCopperPlates.length > 0;
  const storedOwned = ownedCopperPlates?.filter(cp => cp.status === 'stored') || [];
  const hasOwned = isAuthenticated && storedOwned.length > 0;

  if (!hasPublic && !hasOwned) return null;

  return (
    <div className="space-y-2">
      {/* Type buttons */}
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => onTypeChange('none')}
          className={cn('px-3 py-1.5 text-xs rounded border transition-colors',
            copperPlateType === 'none' ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400')}>
          {t('noCopperPlate')}
        </button>
        {hasPublic && (
          <button type="button" onClick={() => onTypeChange('public')}
            className={cn('px-3 py-1.5 text-xs rounded border transition-colors',
              copperPlateType === 'public' ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400')}>
            {t('publicCopperPlate')}
          </button>
        )}
        {hasOwned && (
          <button type="button" onClick={() => onTypeChange('owned')}
            className={cn('px-3 py-1.5 text-xs rounded border transition-colors',
              copperPlateType === 'owned' ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400')}>
            {t('ownedCopperPlate')} ({storedOwned.length})
          </button>
        )}
      </div>

      {/* Public plates */}
      {copperPlateType === 'public' && hasPublic && (
        <div className="space-y-2">
          <div className="space-y-1 max-h-[180px] overflow-y-auto">
            {publicCopperPlates!.map((plate) => (
              <button key={plate.id} type="button" onClick={() => onPublicPlateSelect(plate)}
                className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors',
                  selectedPublicPlate?.id === plate.id ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50')}>
                {plate.imageUrl ? (
                  <img src={normalizeImageUrl(plate.imageUrl)} alt={plate.plateName}
                    className="w-8 h-8 object-cover rounded border flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div className="w-8 h-8 rounded border bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <span className="truncate">{plate.plateName}</span>
                {(plate.widthMm || plate.heightMm) && (
                  <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">{plate.widthMm}x{plate.heightMm}mm</span>
                )}
              </button>
            ))}
          </div>
          <FoilOptions copperPlateLabels={copperPlateLabels} foilColor={foilColor} foilPosition={foilPosition}
            onFoilColorChange={onFoilColorChange} onFoilPositionChange={onFoilPositionChange} />
        </div>
      )}

      {/* Owned plates */}
      {copperPlateType === 'owned' && hasOwned && (
        <div className="space-y-2">
          <div className="space-y-1 max-h-[180px] overflow-y-auto">
            {storedOwned.map((cp) => (
              <button key={cp.id} type="button" onClick={() => onOwnedPlateSelect(cp)}
                className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors',
                  selectedOwnedPlate?.id === cp.id ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50')}>
                {cp.imageUrl ? (
                  <img src={normalizeImageUrl(cp.imageUrl)} alt={cp.plateName}
                    className="w-8 h-8 object-cover rounded border flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div className="w-8 h-8 rounded border bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <span className="truncate">{cp.plateName}</span>
                <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">
                  {cp.plateType === 'copper' ? t('copperType') : t('leadType')}
                </span>
              </button>
            ))}
          </div>
          {selectedOwnedPlate && (
            <FoilOptions copperPlateLabels={copperPlateLabels} foilColor={foilColor} foilPosition={foilPosition}
              onFoilColorChange={onFoilColorChange} onFoilPositionChange={onFoilPositionChange} />
          )}
        </div>
      )}
    </div>
  );
}

function FoilOptions({ copperPlateLabels, foilColor, foilPosition, onFoilColorChange, onFoilPositionChange }: {
  copperPlateLabels?: CopperPlateLabels; foilColor?: string; foilPosition?: string;
  onFoilColorChange: (code: string) => void; onFoilPositionChange: (code: string) => void;
}) {
  const t = useTranslations('product');

  return (
    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
      {copperPlateLabels?.foilColors && copperPlateLabels.foilColors.length > 0 && (
        <>
          <span className="text-xs text-gray-500">{t('foilColor')}</span>
          {copperPlateLabels.foilColors.filter(c => c.isActive).map((color) => (
            <button key={color.id} type="button" onClick={() => onFoilColorChange(color.code)}
              className={cn('flex items-center gap-1 px-2 py-1 text-[11px] rounded border transition-colors',
                foilColor === color.code ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-gray-400')}>
              <span className={cn('w-3 h-3 rounded-sm border',
                color.code === 'hologram' && 'bg-gradient-to-r from-pink-300 via-purple-300 to-cyan-300',
                color.colorHex === '#FFFFFF' && 'border-gray-400')}
                style={{ backgroundColor: color.code !== 'hologram' ? color.colorHex : undefined,
                  borderColor: color.colorHex === '#FFFFFF' ? '#9ca3af' : color.colorHex }} />
              {color.name}
            </button>
          ))}
        </>
      )}
      {copperPlateLabels?.platePositions && copperPlateLabels.platePositions.length > 0 && (
        <>
          <span className="text-gray-300">|</span>
          <span className="text-xs text-gray-500">{t('foilPosition')}</span>
          {copperPlateLabels.platePositions.filter(p => p.isActive).map((pos) => (
            <button key={pos.id} type="button" onClick={() => onFoilPositionChange(pos.code)}
              className={cn('px-2 py-1 text-[11px] rounded border transition-colors',
                foilPosition === pos.code ? 'border-primary bg-primary text-white' : 'border-gray-200 hover:border-gray-400')}>
              {pos.name}
            </button>
          ))}
        </>
      )}
    </div>
  );
}

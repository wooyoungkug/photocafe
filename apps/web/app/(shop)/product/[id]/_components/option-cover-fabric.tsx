'use client';

import { Check, Palette } from 'lucide-react';
import { cn, normalizeImageUrl } from '@/lib/utils';
import { useFabrics, FABRIC_CATEGORY_LABELS, type Fabric, type FabricCategory } from '@/hooks/use-fabrics';

interface OptionCoverFabricProps {
  selectedFabricCategory: FabricCategory | null;
  onCategoryChange: (cat: FabricCategory | null) => void;
  selectedFabricInfo: { id?: string | null; name?: string | null; thumbnail?: string | null } | null;
  onFabricSelect: (fabric: Fabric) => void;
}

export function OptionCoverFabric({
  selectedFabricCategory,
  onCategoryChange,
  selectedFabricInfo,
  onFabricSelect,
}: OptionCoverFabricProps) {
  const { data: categoryFabricsData } = useFabrics(
    selectedFabricCategory
      ? { category: selectedFabricCategory, forAlbumCover: true, isActive: true, limit: 100 }
      : undefined
  );
  const categoryFabrics = selectedFabricCategory ? (categoryFabricsData?.data || []) : [];
  const categories = Object.keys(FABRIC_CATEGORY_LABELS) as FabricCategory[];

  return (
    <div className="space-y-2">
      {/* Selected info */}
      {selectedFabricInfo?.id && (
        <div className="flex items-center gap-2 text-sm text-primary">
          {selectedFabricInfo.thumbnail && (
            <div className="w-6 h-6 rounded border bg-cover bg-center flex-shrink-0"
              style={{ backgroundImage: `url(${normalizeImageUrl(selectedFabricInfo.thumbnail)})` }} />
          )}
          <span className="font-medium">{selectedFabricInfo.name}</span>
          <Check className="h-3.5 w-3.5" />
        </div>
      )}

      {/* Category buttons */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button key={cat} type="button"
            onClick={() => onCategoryChange(selectedFabricCategory === cat ? null : cat)}
            className={cn('px-3 py-1.5 text-xs rounded border transition-colors',
              selectedFabricCategory === cat ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'
            )}>
            {FABRIC_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Fabric grid */}
      {selectedFabricCategory && categoryFabrics.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-[220px] overflow-y-auto">
          {categoryFabrics.map((fabric) => {
            const isSelected = selectedFabricInfo?.id === fabric.id;
            return (
              <button key={fabric.id} type="button" onClick={() => onFabricSelect(fabric)}
                className={cn('flex flex-col items-center gap-1 p-1.5 rounded transition-colors text-center relative',
                  isSelected ? 'bg-primary/10' : 'hover:bg-gray-50')}>
                {fabric.thumbnailUrl ? (
                  <div className={cn('w-10 h-10 rounded border bg-cover bg-center', isSelected && 'ring-2 ring-primary')}
                    style={{ backgroundImage: `url(${normalizeImageUrl(fabric.thumbnailUrl)})` }} />
                ) : fabric.colorCode ? (
                  <div className={cn('w-10 h-10 rounded border', isSelected && 'ring-2 ring-primary')}
                    style={{ backgroundColor: fabric.colorCode }} />
                ) : (
                  <div className="w-10 h-10 rounded border bg-gray-100 flex items-center justify-center">
                    <Palette className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <span className={cn('text-[10px] leading-tight line-clamp-1', isSelected ? 'text-primary font-medium' : 'text-gray-600')}>
                  {fabric.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

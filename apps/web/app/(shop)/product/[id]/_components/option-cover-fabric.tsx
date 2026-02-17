'use client';

import { Check, Palette } from 'lucide-react';
import { cn, normalizeImageUrl } from '@/lib/utils';
import { FABRIC_CATEGORY_LABELS, type FabricCategory } from '@/hooks/use-fabrics';

interface ProductFabricItem {
  fabricId: string;
  fabric: {
    id: string;
    name: string;
    category: string;
    colorCode?: string | null;
    colorName?: string | null;
    thumbnailUrl?: string | null;
    isActive: boolean;
  };
}

interface OptionCoverFabricProps {
  productFabrics: ProductFabricItem[];
  selectedFabricCategory: FabricCategory | null;
  onCategoryChange: (cat: FabricCategory | null) => void;
  selectedFabricInfo: { id?: string | null; name?: string | null; thumbnail?: string | null } | null;
  onFabricSelect: (fabric: { id: string; name: string; thumbnailUrl?: string | null; colorCode?: string | null }) => void;
}

export function OptionCoverFabric({
  productFabrics,
  selectedFabricCategory,
  onCategoryChange,
  selectedFabricInfo,
  onFabricSelect,
}: OptionCoverFabricProps) {
  // 상품에 설정된 원단 중 활성화된 것만 사용
  const activeFabrics = productFabrics.filter(pf => pf.fabric.isActive);

  // 카테고리 목록 (상품에 설정된 원단의 카테고리만)
  const categories = [...new Set(activeFabrics.map(pf => pf.fabric.category))] as FabricCategory[];

  // 카테고리 필터링
  const categoryFabrics = selectedFabricCategory
    ? activeFabrics.filter(pf => pf.fabric.category === selectedFabricCategory)
    : activeFabrics;

  // 상품에 설정된 원단이 없는 경우
  if (activeFabrics.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        선택 가능한 표지 원단이 없습니다.
      </div>
    );
  }

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

      {/* Category buttons (카테고리가 2개 이상일 때만 표시) */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button type="button"
            onClick={() => onCategoryChange(null)}
            className={cn('px-3 py-1.5 text-xs rounded border transition-colors',
              selectedFabricCategory === null ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'
            )}>
            전체
          </button>
          {categories.map((cat) => (
            <button key={cat} type="button"
              onClick={() => onCategoryChange(selectedFabricCategory === cat ? null : cat)}
              className={cn('px-3 py-1.5 text-xs rounded border transition-colors',
                selectedFabricCategory === cat ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'
              )}>
              {FABRIC_CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      )}

      {/* Fabric grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-[220px] overflow-y-auto">
        {categoryFabrics.map((pf) => {
          const fabric = pf.fabric;
          const isSelected = selectedFabricInfo?.id === fabric.id;
          return (
            <button key={fabric.id} type="button" onClick={() => onFabricSelect({
              id: fabric.id,
              name: fabric.name,
              thumbnailUrl: fabric.thumbnailUrl,
              colorCode: fabric.colorCode,
            })}
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
    </div>
  );
}

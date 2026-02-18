'use client';

import { useRef, useState, useEffect } from 'react';
import { Check, ChevronDown, Palette, Search, X } from 'lucide-react';
import { cn, normalizeImageUrl } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { FABRIC_CATEGORY_LABELS, type FabricCategory } from '@/hooks/use-fabrics';

export interface ProductFabricItem {
  fabricId: string;
  fabric: {
    id: string;
    name: string;
    category: string;
    colorCode?: string | null;
    colorName?: string | null;
    thumbnailUrl?: string | null;
    basePrice?: number;
    isActive: boolean;
  };
}

interface OptionCoverFabricProps {
  productFabrics: ProductFabricItem[];
  selectedFabricCategory: FabricCategory | null;
  onCategoryChange: (cat: FabricCategory | null) => void;
  selectedFabricInfo: { id?: string | null; name?: string | null; thumbnail?: string | null } | null;
  onFabricSelect: (fabric: ProductFabricItem['fabric']) => void;
}

export function OptionCoverFabric({
  productFabrics,
  selectedFabricCategory,
  onCategoryChange,
  selectedFabricInfo,
  onFabricSelect,
}: OptionCoverFabricProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // 활성화된 원단만
  const activeFabrics = productFabrics.filter(pf => pf.fabric.isActive);

  // 카테고리 목록
  const categories = [...new Set(activeFabrics.map(pf => pf.fabric.category))] as FabricCategory[];

  // 카테고리 + 검색어 필터링
  const filteredFabrics = activeFabrics.filter(pf => {
    const matchCategory = selectedFabricCategory ? pf.fabric.category === selectedFabricCategory : true;
    const matchSearch = searchQuery.trim()
      ? pf.fabric.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      : true;
    return matchCategory && matchSearch;
  });

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 드롭다운 열릴 때 검색 input 포커스
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (activeFabrics.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        선택 가능한 표지 원단이 없습니다.
      </div>
    );
  }

  const selectedFabric = selectedFabricInfo?.id
    ? activeFabrics.find(pf => pf.fabric.id === selectedFabricInfo.id)?.fabric
    : null;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 border rounded-md text-sm transition-colors text-left',
          isOpen ? 'border-primary ring-1 ring-primary' : selectedFabric ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-400'
        )}
      >
        {/* 선택된 원단 미리보기 */}
        {selectedFabric ? (
          <>
            {selectedFabric.thumbnailUrl ? (
              <div
                className="w-6 h-6 rounded border bg-cover bg-center flex-shrink-0"
                style={{ backgroundImage: `url(${normalizeImageUrl(selectedFabric.thumbnailUrl)})` }}
              />
            ) : selectedFabric.colorCode ? (
              <div
                className="w-6 h-6 rounded border flex-shrink-0"
                style={{ backgroundColor: selectedFabric.colorCode }}
              />
            ) : (
              <div className="w-6 h-6 rounded border bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Palette className="w-3.5 h-3.5 text-gray-400" />
              </div>
            )}
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
          </>
        ) : (
          <>
            <div className="w-6 h-6 rounded border bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Palette className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <span className="flex-1 text-gray-400">표지 원단 선택 ({activeFabrics.length}종)</span>
          </>
        )}
        <ChevronDown className={cn('h-4 w-4 text-gray-400 flex-shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="원단 이름 검색..."
                className="pl-8 pr-8 h-8 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category filter */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50">
              <button
                type="button"
                onClick={() => onCategoryChange(null)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded border transition-colors',
                  selectedFabricCategory === null
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                )}
              >
                전체 ({activeFabrics.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onCategoryChange(selectedFabricCategory === cat ? null : cat)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded border transition-colors',
                    selectedFabricCategory === cat
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                  )}
                >
                  {FABRIC_CATEGORY_LABELS[cat] || cat} ({activeFabrics.filter(pf => pf.fabric.category === cat).length})
                </button>
              ))}
            </div>
          )}

          {/* Fabric list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredFabrics.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">
                {searchQuery ? `"${searchQuery}" 검색 결과가 없습니다` : '원단이 없습니다'}
              </div>
            ) : (
              filteredFabrics.map(pf => {
                const fabric = pf.fabric;
                const isSelected = selectedFabricInfo?.id === fabric.id;
                return (
                  <button
                    key={fabric.id}
                    type="button"
                    onClick={() => {
                      onFabricSelect(fabric);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left',
                      isSelected
                        ? 'bg-primary/5 text-primary'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {/* Swatch */}
                    {fabric.thumbnailUrl ? (
                      <div
                        className={cn('w-7 h-7 rounded border bg-cover bg-center flex-shrink-0', isSelected && 'ring-1 ring-primary')}
                        style={{ backgroundImage: `url(${normalizeImageUrl(fabric.thumbnailUrl)})` }}
                      />
                    ) : fabric.colorCode ? (
                      <div
                        className={cn('w-7 h-7 rounded border flex-shrink-0', isSelected && 'ring-1 ring-primary')}
                        style={{ backgroundColor: fabric.colorCode }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded border bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Palette className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                    )}
                    <span className={cn('flex-1 truncate', isSelected && 'font-medium')}>{fabric.name}</span>
                    {categories.length > 1 && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {FABRIC_CATEGORY_LABELS[fabric.category as FabricCategory] || fabric.category}
                      </span>
                    )}
                    {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Result count */}
          <div className="px-3 py-1.5 border-t bg-gray-50 text-xs text-gray-400 text-right">
            {filteredFabrics.length}/{activeFabrics.length}종
          </div>
        </div>
      )}
    </div>
  );
}

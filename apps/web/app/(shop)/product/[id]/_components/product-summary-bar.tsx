'use client';

import { ShoppingCart, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface ProductSummaryBarProps {
  isAlbum: boolean;
  bindingName?: string;
  paperName?: string;
  fabricName?: string;
  copperPlateType?: string;
  onAddToCart: () => void;
  onScrollToUpload: () => void;
  hasUploadedFolders: boolean;
}

export function ProductSummaryBar({
  isAlbum, bindingName, paperName, fabricName,
  onAddToCart, onScrollToUpload,
}: ProductSummaryBarProps) {
  const t = useTranslations('product');

  const items = [
    bindingName?.split(' - ')[0].replace(/\s*\(.*?\)$/, ''),
    fabricName,
    paperName,
  ].filter(Boolean);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <div className="flex-1 text-xs text-gray-500 truncate">
          {items.join(' · ')}
        </div>
        {isAlbum ? (
          <Button size="sm" onClick={onScrollToUpload} className="px-6">
            <Upload className="h-4 w-4 mr-1.5" />{t('dataUpload')}
          </Button>
        ) : (
          <Button size="sm" onClick={onAddToCart} className="px-6">
            <ShoppingCart className="h-4 w-4 mr-1.5" />{t('addToCart')}
          </Button>
        )}
      </div>
    </div>
  );
}

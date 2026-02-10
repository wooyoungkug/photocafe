'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useFabrics, type Fabric } from '@/hooks/use-fabrics';

interface FabricPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFabricId: string | null;
  onSelect: (fabric: Fabric) => void;
}

export function FabricPickerDialog({
  open,
  onOpenChange,
  selectedFabricId,
  onSelect,
}: FabricPickerDialogProps) {
  const t = useTranslations('folder');
  const tc = useTranslations('common');
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelectedId, setTempSelectedId] = useState<string | null>(selectedFabricId);

  // 앨범 커버용 원단만 조회
  const { data: fabricData, isLoading } = useFabrics({
    isActive: true,
    forAlbumCover: true,
    limit: 100,
  });

  const fabrics = fabricData?.data || [];

  const filteredFabrics = useMemo(() => {
    if (!searchTerm.trim()) return fabrics;
    const term = searchTerm.toLowerCase();
    return fabrics.filter(
      f => f.code.toLowerCase().includes(term) ||
           f.name.toLowerCase().includes(term) ||
           (f.colorName && f.colorName.toLowerCase().includes(term))
    );
  }, [fabrics, searchTerm]);

  const handleConfirm = () => {
    const selected = fabrics.find(f => f.id === tempSelectedId);
    if (selected) {
      onSelect(selected);
      onOpenChange(false);
    }
  };

  // Reset temp selection when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTempSelectedId(selectedFabricId);
      setSearchTerm('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{t('fabricPickerTitle')}</DialogTitle>
        </DialogHeader>

        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t('fabricSearchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 원단 목록 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto p-1 flex-1">
          {isLoading ? (
            <div className="col-span-full text-center text-sm text-gray-400 py-8">
              {tc('loading')}
            </div>
          ) : filteredFabrics.length === 0 ? (
            <div className="col-span-full text-center text-sm text-gray-400 py-8">
              {t('fabricNoResults')}
            </div>
          ) : (
            filteredFabrics.map((fabric) => (
              <button
                key={fabric.id}
                type="button"
                onClick={() => setTempSelectedId(fabric.id)}
                className={cn(
                  'p-2 text-left border-2 rounded-lg transition-all',
                  tempSelectedId === fabric.id
                    ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex flex-col items-center gap-1.5">
                  {fabric.thumbnailUrl ? (
                    <div
                      className="w-full aspect-square rounded border bg-cover bg-center"
                      style={{ backgroundImage: `url(${fabric.thumbnailUrl})` }}
                    />
                  ) : fabric.colorCode ? (
                    <div
                      className="w-full aspect-square rounded border"
                      style={{ backgroundColor: fabric.colorCode }}
                    />
                  ) : (
                    <div className="w-full aspect-square rounded border bg-gray-100 flex items-center justify-center">
                      <Palette className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <div className="w-full text-center">
                    <div className="text-xs font-medium truncate">{fabric.code}</div>
                    <div className="text-[10px] text-gray-500 truncate">{fabric.name}</div>
                    {fabric.colorName && (
                      <div className="text-[10px] text-gray-400 truncate">{fabric.colorName}</div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button
            size="sm"
            disabled={!tempSelectedId}
            className="bg-amber-600 hover:bg-amber-700"
            onClick={handleConfirm}
          >
            {t('fabricSelectComplete')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

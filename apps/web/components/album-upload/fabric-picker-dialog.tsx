'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Palette, Plus, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useFabrics, useFabricSuppliers, useCreateFabric, type Fabric } from '@/hooks/use-fabrics';
import { useToast } from '@/hooks/use-toast';

interface FabricPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFabricId: string | null;
  onSelect: (fabric: Fabric) => void;
}

// 원단코드 자동 생성
const generateFabricCode = (): string => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `FA-${dateStr}-${rand}`;
};

export function FabricPickerDialog({
  open,
  onOpenChange,
  selectedFabricId,
  onSelect,
}: FabricPickerDialogProps) {
  const t = useTranslations('folder');
  const tp = useTranslations('product');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelectedId, setTempSelectedId] = useState<string | null>(selectedFabricId);

  // 원단 추가 모드
  const [isAddMode, setIsAddMode] = useState(false);
  const [newFabricName, setNewFabricName] = useState('');
  const [newFabricColor, setNewFabricColor] = useState('');
  const [newFabricSupplierId, setNewFabricSupplierId] = useState('');

  // 앨범 커버용 원단만 조회
  const { data: fabricData, isLoading } = useFabrics({
    isActive: true,
    forAlbumCover: true,
    limit: 100,
  });

  // 원단 매입처 조회
  const { data: suppliers } = useFabricSuppliers();

  const createFabric = useCreateFabric();

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

  // 원단 추가 제출
  const handleAddFabric = async () => {
    if (!newFabricName.trim()) return;

    try {
      const autoCode = generateFabricCode();
      await createFabric.mutateAsync({
        code: autoCode,
        name: newFabricName.trim(),
        colorName: newFabricColor.trim() || undefined,
        supplierId: newFabricSupplierId || undefined,
        category: 'fabric',
        material: 'cotton',
        forAlbumCover: true,
        isActive: true,
        basePrice: 0,
        unitType: 'm',
      });
      toast({
        title: tp('fabricAdded'),
        description: tp('fabricAddedDesc', { name: newFabricName.trim() }),
      });
      // 초기화 & 목록으로 돌아가기
      setNewFabricName('');
      setNewFabricColor('');
      setNewFabricSupplierId('');
      setIsAddMode(false);
    } catch (error: any) {
      toast({
        title: tc('error'),
        description: error?.message || '원단 등록에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  // Reset temp selection when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTempSelectedId(selectedFabricId);
      setSearchTerm('');
      setIsAddMode(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            {isAddMode ? (
              <>
                <button type="button" onClick={() => setIsAddMode(false)} className="hover:text-primary" title={tc('back')}>
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {tp('addFabric')}
              </>
            ) : (
              t('fabricPickerTitle')
            )}
          </DialogTitle>
        </DialogHeader>

        {isAddMode ? (
          /* 원단 추가 폼 */
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="fabricName">{tp('fabricName')} *</Label>
              <Input
                id="fabricName"
                placeholder="예: 이탈리아 가죽 블랙"
                value={newFabricName}
                onChange={(e) => setNewFabricName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fabricColor">색상명</Label>
              <Input
                id="fabricColor"
                placeholder="예: 블랙, 아이보리"
                value={newFabricColor}
                onChange={(e) => setNewFabricColor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fabricSupplier">원단매입처</Label>
              <Select value={newFabricSupplierId} onValueChange={setNewFabricSupplierId}>
                <SelectTrigger id="fabricSupplier">
                  <SelectValue placeholder="매입처 선택" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsAddMode(false)}>
                {tc('cancel')}
              </Button>
              <Button
                size="sm"
                disabled={!newFabricName.trim() || createFabric.isPending}
                className="bg-amber-600 hover:bg-amber-700"
                onClick={handleAddFabric}
              >
                {createFabric.isPending ? tc('loading') : tp('addFabric')}
              </Button>
            </div>
          </div>
        ) : (
          /* 원단 선택 목록 */
          <>
            {/* 검색 + 추가 버튼 */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('fabricSearchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                onClick={() => setIsAddMode(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                {tp('addFabric')}
              </Button>
            </div>

            {/* 원단 목록 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto p-1 flex-1">
              {isLoading ? (
                <div className="col-span-full text-center text-sm text-gray-400 py-8">
                  {tc('loading')}
                </div>
              ) : filteredFabrics.length === 0 ? (
                <div className="col-span-full text-center text-sm text-gray-400 py-8">
                  {fabrics.length === 0 ? (
                    <div>
                      <Palette className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p>{tp('noFabricsForAlbum')}</p>
                      <p className="text-xs mt-1">{tp('noFabricsForAlbumHint')}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-1"
                        onClick={() => setIsAddMode(true)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {tp('addFabric')}
                      </Button>
                    </div>
                  ) : (
                    t('fabricNoResults')
                  )}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

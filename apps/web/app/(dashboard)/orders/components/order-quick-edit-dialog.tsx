'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Order, useOrder, useAdjustOrder } from '@/hooks/use-orders';
import { toast } from '@/hooks/use-toast';
import { ImageIcon, Save, Loader2, FolderOpen, FileText, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== 편집스타일 / 제본순서 라벨 ====================

function getPageLayoutLabel(layout?: string): string {
  if (!layout) return '-';
  return layout === 'spread' ? '펼침면' : '낱장';
}

const BINDING_DIRECTION_OPTIONS = [
  { value: 'LEFT_START_RIGHT_END', label: '좌시우끝' },
  { value: 'LEFT_START_LEFT_END', label: '좌시좌끝' },
  { value: 'RIGHT_START_LEFT_END', label: '우시좌끝' },
  { value: 'RIGHT_START_RIGHT_END', label: '우시우끝' },
] as const;

function getBindingDirectionLabel(direction?: string): string {
  if (!direction) return '-';
  const found = BINDING_DIRECTION_OPTIONS.find((o) => o.value === direction);
  return found?.label || direction;
}

// ==================== 펼침면 페이지 번호 계산 ====================

type BindingDirectionType =
  | 'LEFT_START_RIGHT_END'
  | 'LEFT_START_LEFT_END'
  | 'RIGHT_START_LEFT_END'
  | 'RIGHT_START_RIGHT_END';

function getSpreadPageNumbers(
  fileIndex: number,
  totalFiles: number,
  direction: BindingDirectionType | null
): { left: number | null; right: number | null } {
  const dir = direction || 'LEFT_START_RIGHT_END';
  switch (dir) {
    case 'LEFT_START_RIGHT_END':
      return { left: fileIndex * 2 + 1, right: fileIndex * 2 + 2 };
    case 'LEFT_START_LEFT_END':
      if (fileIndex === totalFiles - 1) {
        return { left: fileIndex * 2 + 1, right: null };
      }
      return { left: fileIndex * 2 + 1, right: fileIndex * 2 + 2 };
    case 'RIGHT_START_LEFT_END':
      if (fileIndex === 0) {
        return { left: null, right: 1 };
      }
      if (fileIndex === totalFiles - 1 && totalFiles > 1) {
        return { left: fileIndex * 2, right: null };
      }
      return { left: fileIndex * 2, right: fileIndex * 2 + 1 };
    case 'RIGHT_START_RIGHT_END':
      if (fileIndex === 0) {
        return { left: null, right: 1 };
      }
      return { left: fileIndex * 2, right: fileIndex * 2 + 1 };
  }
}

// ==================== Types ====================

interface OrderQuickEditDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ItemEdit {
  quantity: number;
  unitPrice: number;
  pageLayout?: string;
  bindingDirection?: string;
  fabricName?: string;
  foilName?: string;
  foilColor?: string;
  foilPosition?: string;
}

// ==================== ThumbnailGrid 서브 컴포넌트 ====================

interface ThumbnailFile {
  id: string;
  thumbnailUrl?: string | null;
  fileUrl?: string;
  fileName: string;
  sortOrder: number;
  pageRange?: string;
  pageStart?: number;
}

function AdaptiveThumbnail({
  file,
  index,
  pageLayout,
  totalFiles,
  direction,
}: {
  file: ThumbnailFile;
  index: number;
  pageLayout?: string;
  totalFiles: number;
  direction: BindingDirectionType;
}) {
  const [aspectStyle, setAspectStyle] = useState<string>('aspect-[3/4]');

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const { naturalWidth, naturalHeight } = img;
    if (naturalWidth && naturalHeight) {
      const ratio = naturalWidth / naturalHeight;
      if (ratio > 1) {
        // 가로 이미지
        setAspectStyle('aspect-[4/3]');
      } else if (ratio > 0.9) {
        // 거의 정사각형
        setAspectStyle('aspect-square');
      } else {
        // 세로 이미지 - 실제 비율 적용
        setAspectStyle('');
      }
    }
  };

  return (
    <div className="flex flex-col">
      <div className={cn(
        'relative rounded-t-md overflow-hidden border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all bg-gray-100',
        aspectStyle || 'aspect-auto'
      )}>
        {file.thumbnailUrl || file.fileUrl ? (
          <img
            src={file.thumbnailUrl || file.fileUrl}
            alt={file.fileName}
            className={cn(
              'w-full object-contain',
              aspectStyle ? 'h-full' : 'h-auto'
            )}
            loading="lazy"
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center min-h-[80px]">
            <ImageIcon className="h-6 w-6 text-gray-300" />
          </div>
        )}
        {/* Page number badges */}
        {pageLayout === 'spread' ? (() => {
          const pages = getSpreadPageNumbers(index, totalFiles, direction);
          return (
            <>
              <div className={cn(
                'absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium',
                pages.left !== null ? 'bg-red-600' : 'bg-yellow-500'
              )}>
                {pages.left !== null ? pages.left : '빈'}
              </div>
              <div className={cn(
                'absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium',
                pages.right !== null ? 'bg-red-600' : 'bg-yellow-500'
              )}>
                {pages.right !== null ? pages.right : '빈'}
              </div>
            </>
          );
        })() : (
          <div className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center bg-red-600 text-white text-[10px] font-medium">
            {index + 1}
          </div>
        )}
      </div>
      <div className="text-[9px] leading-tight p-1 border border-t-0 rounded-b-md bg-white border-gray-200">
        <div className="truncate font-medium" title={file.fileName}>{file.fileName}</div>
        <div className="text-gray-500">
          {file.pageRange || `${file.pageStart}p`}
        </div>
      </div>
    </div>
  );
}

function ThumbnailGrid({
  files,
  pageLayout,
  bindingDirection,
}: {
  files: ThumbnailFile[];
  pageLayout?: string;
  bindingDirection?: BindingDirectionType;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const direction = bindingDirection || 'LEFT_START_RIGHT_END';
  const totalFiles = files.length;

  const renderSingleThumbnail = (file: ThumbnailFile, index: number) => (
    <AdaptiveThumbnail
      key={file.id}
      file={file}
      index={index}
      pageLayout={pageLayout}
      totalFiles={totalFiles}
      direction={direction}
    />
  );

  // 낱장 모드: 2p씩 묶어서 스프레드 표시
  if (pageLayout === 'single' || !pageLayout) {
    const startsRight = direction.startsWith('RIGHT');

    type SpreadSlot = { type: 'page'; fileIndex: number } | { type: 'blank' };
    const spreads: Array<{ left: SpreadSlot; right: SpreadSlot }> = [];
    let i = 0;

    if (startsRight && totalFiles > 0) {
      spreads.push({
        left: { type: 'blank' },
        right: { type: 'page', fileIndex: 0 },
      });
      i = 1;
    }

    while (i < totalFiles) {
      if (i + 1 < totalFiles) {
        spreads.push({
          left: { type: 'page', fileIndex: i },
          right: { type: 'page', fileIndex: i + 1 },
        });
        i += 2;
      } else {
        spreads.push({
          left: { type: 'page', fileIndex: i },
          right: { type: 'blank' },
        });
        i++;
      }
    }

    const renderBlankSlot = () => (
      <div className="flex flex-col">
        <div className="relative rounded-md border-2 border-dashed border-blue-400 bg-blue-50/20 aspect-[3/4]" />
      </div>
    );

    return (
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5 hover:text-gray-700 transition-colors"
        >
          <ImageIcon className="h-3 w-3" />
          이미지 미리보기 ({totalFiles}장)
          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {isOpen && (
          <div className="grid grid-cols-4 gap-3 p-2 bg-gray-50 rounded-lg border">
            {spreads.map((spread, spreadIdx) => {
              const leftFile = spread.left.type === 'page' ? files[spread.left.fileIndex] : null;
              const rightFile = spread.right.type === 'page' ? files[spread.right.fileIndex] : null;
              const hasBoth = !!leftFile && !!rightFile;
              const label = hasBoth
                ? `S${spreadIdx + 1} (p${spread.left.type === 'page' ? spread.left.fileIndex + 1 : '?'}-${spread.right.type === 'page' ? spread.right.fileIndex + 1 : '?'})`
                : leftFile
                  ? `p${(spread.left as { type: 'page'; fileIndex: number }).fileIndex + 1}`
                  : rightFile
                    ? `p${(spread.right as { type: 'page'; fileIndex: number }).fileIndex + 1}`
                    : '';

              return (
                <div
                  key={spreadIdx}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-1',
                    !hasBoth ? 'border-yellow-400 bg-yellow-50/30' : 'border-orange-300 bg-orange-50/20'
                  )}
                >
                  <div className="text-[8px] text-center text-orange-500 mb-0.5 font-medium">
                    {label}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {spread.left.type === 'page'
                      ? renderSingleThumbnail(files[spread.left.fileIndex], spread.left.fileIndex)
                      : renderBlankSlot()}
                    {spread.right.type === 'page'
                      ? renderSingleThumbnail(files[spread.right.fileIndex], spread.right.fileIndex)
                      : renderBlankSlot()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 펼침면 모드: 그리드 레이아웃
  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5 hover:text-gray-700 transition-colors"
      >
        <ImageIcon className="h-3 w-3" />
        이미지 미리보기 ({totalFiles}장)
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {isOpen && (
        <div className="grid gap-2 p-2 bg-gray-50 rounded-lg border grid-cols-4">
          {files.map((file, index) => renderSingleThumbnail(file, index))}
        </div>
      )}
    </div>
  );
}

// ==================== Component ====================

export function OrderQuickEditDialog({
  order,
  open,
  onOpenChange,
}: OrderQuickEditDialogProps) {
  const adjustOrder = useAdjustOrder();

  // Fetch full order detail with ALL files when dialog opens
  const {
    data: fullOrder,
    isLoading: isLoadingDetail,
  } = useOrder(order?.id || '');

  // Item-level edit state
  const [itemEdits, setItemEdits] = useState<Record<string, ItemEdit>>({});
  // Discount
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');

  // Initialize edit state when full order data loads
  useEffect(() => {
    if (fullOrder) {
      const edits: Record<string, ItemEdit> = {};
      fullOrder.items.forEach((item) => {
        edits[item.id] = {
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          pageLayout: item.pageLayout || undefined,
          bindingDirection: item.bindingDirection || undefined,
          fabricName: item.fabricName || undefined,
          foilName: item.foilName || undefined,
          foilColor: item.foilColor || undefined,
          foilPosition: item.foilPosition || undefined,
        };
      });
      setItemEdits(edits);
      setDiscountAmount(0);
      setDiscountReason('');
    }
  }, [fullOrder]);

  if (!order) return null;

  // Use full order data when available, fall back to list order
  const displayOrder = fullOrder || order;

  // ==================== Price calculations ====================

  const calcProductTotal = () => {
    return displayOrder.items.reduce((sum, item) => {
      const edit = itemEdits[item.id];
      if (!edit) return sum + Number(item.unitPrice) * item.quantity;
      return sum + edit.unitPrice * edit.quantity;
    }, 0);
  };

  const productTotal = calcProductTotal();
  const tax = Math.round(productTotal * 0.1);
  const shippingFee = Number(displayOrder.shippingFee) || 0;
  const totalBeforeDiscount = productTotal + tax + shippingFee;
  const finalTotal = Math.max(0, totalBeforeDiscount - discountAmount);

  // ==================== Change detection ====================

  const hasChanges = () => {
    if (discountAmount > 0) return true;
    return displayOrder.items.some((item) => {
      const edit = itemEdits[item.id];
      if (!edit) return false;
      return (
        edit.quantity !== item.quantity ||
        edit.unitPrice !== Number(item.unitPrice) ||
        edit.pageLayout !== (item.pageLayout || undefined) ||
        edit.bindingDirection !== (item.bindingDirection || undefined) ||
        edit.fabricName !== (item.fabricName || undefined) ||
        edit.foilName !== (item.foilName || undefined) ||
        edit.foilColor !== (item.foilColor || undefined) ||
        edit.foilPosition !== (item.foilPosition || undefined)
      );
    });
  };

  // ==================== Save handler ====================

  const handleSave = async () => {
    const itemUpdates = displayOrder.items
      .filter((item) => {
        const edit = itemEdits[item.id];
        if (!edit) return false;
        return (
          edit.quantity !== item.quantity ||
          edit.unitPrice !== Number(item.unitPrice) ||
          edit.pageLayout !== (item.pageLayout || undefined) ||
          edit.bindingDirection !== (item.bindingDirection || undefined) ||
          edit.fabricName !== (item.fabricName || undefined) ||
          edit.foilName !== (item.foilName || undefined) ||
          edit.foilColor !== (item.foilColor || undefined) ||
          edit.foilPosition !== (item.foilPosition || undefined)
        );
      })
      .map((item) => ({
        itemId: item.id,
        quantity: itemEdits[item.id].quantity,
        unitPrice: itemEdits[item.id].unitPrice,
        pageLayout: itemEdits[item.id].pageLayout,
        bindingDirection: itemEdits[item.id].bindingDirection,
        fabricName: itemEdits[item.id].fabricName,
        foilName: itemEdits[item.id].foilName,
        foilColor: itemEdits[item.id].foilColor,
        foilPosition: itemEdits[item.id].foilPosition,
      }));

    try {
      await adjustOrder.mutateAsync({
        id: displayOrder.id,
        data: {
          adjustmentAmount: discountAmount > 0 ? discountAmount : undefined,
          adjustmentReason: discountReason || undefined,
          itemUpdates: itemUpdates.length > 0 ? itemUpdates : undefined,
        },
      });
      toast({ title: '주문이 수정되었습니다.' });
      onOpenChange(false);
    } catch {
      toast({ title: '주문 수정에 실패했습니다.', variant: 'destructive' });
    }
  };

  // ==================== Render ====================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">주문 검증 및 수정</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span className="font-medium">{displayOrder.orderNumber}</span>
            <span className="text-muted-foreground">-</span>
            <span>{displayOrder.client?.clientName}</span>
            {displayOrder.isUrgent && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                긴급
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Loading skeleton */}
          {isLoadingDetail ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="border-2 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-12 ml-auto" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="bg-gray-50 rounded-lg border p-2">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((j) => (
                        <Skeleton key={j} className="w-16 h-16 rounded" />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-40" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Order item cards */}
              {displayOrder.items.map((item, itemIndex) => {
                const edit = itemEdits[item.id] || {
                  quantity: item.quantity,
                  unitPrice: Number(item.unitPrice),
                  pageLayout: item.pageLayout || undefined,
                  bindingDirection: item.bindingDirection || undefined,
                };

                // Collect all file thumbnails sorted by sortOrder
                const allFiles = [...(item.files || [])].sort(
                  (a, b) => a.sortOrder - b.sortOrder
                );

                return (
                  <div
                    key={item.id}
                    className="border-2 rounded-xl overflow-hidden"
                  >
                    {/* Card Header - folder name & specs */}
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderOpen className="h-4 w-4 text-blue-600 shrink-0" />
                          <span className="font-semibold text-sm truncate">
                            {item.folderName || item.productName}
                          </span>
                          {itemIndex > 0 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 shrink-0"
                            >
                              항목 {itemIndex + 1}
                            </Badge>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-xs shrink-0 ml-2"
                        >
                          {item.pages}p
                        </Badge>
                      </div>

                      {/* Product specs line 1 */}
                      <div className="text-xs text-muted-foreground mt-1.5 truncate">
                        {[
                          item.productName,
                          item.size,
                          item.printMethod,
                          item.paper,
                        ]
                          .filter(Boolean)
                          .join(' \u00B7 ')}
                      </div>

                      {/* Product specs line 2 (optional) */}
                      {(item.bindingType ||
                        item.coverMaterial ||
                        item.fabricName ||
                        item.foilColor) && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {[
                            item.bindingType,
                            item.coverMaterial,
                            item.fabricName
                              ? `원단:${item.fabricName}`
                              : null,
                            item.foilColor
                              ? `박:${item.foilColor}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' \u00B7 ')}
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Thumbnail gallery - grid layout */}
                      {allFiles.length > 0 ? (
                        <ThumbnailGrid
                          files={allFiles}
                          pageLayout={edit.pageLayout}
                          bindingDirection={edit.bindingDirection as BindingDirectionType | undefined}
                        />
                      ) : item.thumbnailUrl ? (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            대표 이미지
                          </div>
                          <div className="bg-gray-50 rounded-lg border p-2">
                            <div className="flex gap-2">
                              <div className="w-16 h-16 rounded border bg-white overflow-hidden relative shrink-0">
                                <Image
                                  src={item.thumbnailUrl}
                                  alt={item.folderName || item.productName}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg border p-3 flex items-center justify-center text-xs text-muted-foreground gap-1.5">
                          <ImageIcon className="h-4 w-4 text-gray-300" />
                          업로드된 이미지가 없습니다
                        </div>
                      )}

                      {/* Verification controls: Size · Page Layout · Binding Direction (한 줄) */}
                      <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                        {/* Size label */}
                        {item.size && (
                          <>
                            <span className="text-blue-600 font-medium">{item.size}</span>
                            <span className="text-gray-300">|</span>
                          </>
                        )}

                        {/* Page layout toggle (compact) */}
                        <div className="flex border rounded overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], pageLayout: 'single' },
                              }))
                            }
                            className={cn(
                              'px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 transition-colors',
                              (edit.pageLayout === 'single' || !edit.pageLayout)
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            )}
                          >
                            <FileText className="w-2.5 h-2.5" />낱장
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], pageLayout: 'spread' },
                              }))
                            }
                            className={cn(
                              'px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 transition-colors',
                              edit.pageLayout === 'spread'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            )}
                          >
                            <BookOpen className="w-2.5 h-2.5" />펼침면
                          </button>
                        </div>

                        {/* Binding direction visual icons */}
                        {edit.pageLayout === 'spread' ? (
                          <>
                            <span className="text-gray-300">|</span>
                            <div className="flex gap-1">
                              {(['LEFT_START_RIGHT_END', 'LEFT_START_LEFT_END', 'RIGHT_START_LEFT_END', 'RIGHT_START_RIGHT_END'] as BindingDirectionType[]).map((dir) => {
                                const isSelected = (edit.bindingDirection || 'LEFT_START_RIGHT_END') === dir;
                                const startLeft = dir.startsWith('LEFT_START');
                                const endRight = dir.endsWith('RIGHT_END');
                                const label = dir === 'LEFT_START_RIGHT_END' ? '좌→우' : dir === 'LEFT_START_LEFT_END' ? '좌→좌' : dir === 'RIGHT_START_LEFT_END' ? '우→좌' : '우→우';
                                return (
                                  <button
                                    key={dir}
                                    type="button"
                                    onClick={() =>
                                      setItemEdits((prev) => ({
                                        ...prev,
                                        [item.id]: { ...prev[item.id], bindingDirection: dir },
                                      }))
                                    }
                                    className={cn(
                                      'flex flex-col items-center gap-0.5 px-1 py-0.5 rounded border transition-colors',
                                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                                    )}
                                  >
                                    <span className="flex items-center gap-1">
                                      <span className="flex gap-px">
                                        <span className={cn('w-4 h-6 rounded-sm', startLeft ? 'bg-blue-500' : 'bg-gray-200')} />
                                        <span className={cn('w-4 h-6 rounded-sm', startLeft ? 'bg-gray-200' : 'bg-blue-500')} />
                                      </span>
                                      <span className="flex gap-px">
                                        <span className={cn('w-4 h-6 rounded-sm', endRight ? 'bg-gray-200' : 'bg-blue-500')} />
                                        <span className={cn('w-4 h-6 rounded-sm', endRight ? 'bg-blue-500' : 'bg-gray-200')} />
                                      </span>
                                    </span>
                                    <span className={cn('text-[8px] leading-none', isSelected ? 'text-blue-600 font-medium' : 'text-gray-400')}>{label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-gray-300">|</span>
                            <div className="flex gap-1">
                              {(['LEFT', 'RIGHT'] as const).map((side) => {
                                const currentSide = (edit.bindingDirection || 'LEFT_START_RIGHT_END').startsWith('RIGHT') ? 'RIGHT' : 'LEFT';
                                const isSelected = currentSide === side;
                                const label = side === 'LEFT' ? '좌시작' : '우시작';
                                return (
                                  <button
                                    key={side}
                                    type="button"
                                    onClick={() => {
                                      const newDir: BindingDirectionType = side === 'RIGHT' ? 'RIGHT_START_LEFT_END' : 'LEFT_START_RIGHT_END';
                                      setItemEdits((prev) => ({
                                        ...prev,
                                        [item.id]: { ...prev[item.id], bindingDirection: newDir },
                                      }));
                                    }}
                                    className={cn(
                                      'flex flex-col items-center gap-0.5 px-1 py-0.5 rounded border transition-colors',
                                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                                    )}
                                  >
                                    <span className="flex gap-px">
                                      <span className={cn('w-4 h-6 rounded-sm', side === 'LEFT' ? 'bg-blue-500' : 'bg-gray-200')} />
                                      <span className={cn('w-4 h-6 rounded-sm', side === 'RIGHT' ? 'bg-blue-500' : 'bg-gray-200')} />
                                    </span>
                                    <span className={cn('text-[8px] leading-none', isSelected ? 'text-blue-600 font-medium' : 'text-gray-400')}>{label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      <Separator />

                      {/* Fabric name */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">원단명</Label>
                        <Input
                          value={edit.fabricName || ''}
                          onChange={(e) =>
                            setItemEdits((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                fabricName: e.target.value || undefined,
                              },
                            }))
                          }
                          placeholder="원단명 입력"
                          className="w-48 h-8 text-sm"
                        />
                      </div>

                      {/* Foil information (동판 정보) */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">박 동판명</Label>
                          <Input
                            value={edit.foilName || ''}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  foilName: e.target.value || undefined,
                                },
                              }))
                            }
                            placeholder="동판명 입력"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">박 색상</Label>
                          <Input
                            value={edit.foilColor || ''}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  foilColor: e.target.value || undefined,
                                },
                              }))
                            }
                            placeholder="박 색상"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">박 위치</Label>
                          <Input
                            value={edit.foilPosition || ''}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  foilPosition: e.target.value || undefined,
                                },
                              }))
                            }
                            placeholder="박 위치"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* Quantity / Unit price / Subtotal */}
                      <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            부수
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={edit.quantity}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  quantity: Math.max(
                                    1,
                                    Number(e.target.value)
                                  ),
                                },
                              }))
                            }
                            className="w-24 h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            단가
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={edit.unitPrice}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  unitPrice: Math.max(
                                    0,
                                    Number(e.target.value)
                                  ),
                                },
                              }))
                            }
                            className="w-32 h-8 text-sm"
                          />
                        </div>
                        <div className="text-sm font-medium text-right flex-1 whitespace-nowrap">
                          소계:{' '}
                          <span className="text-blue-600">
                            {(edit.unitPrice * edit.quantity).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <Separator />

              {/* Discount section */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">할인/금액 조정</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">할인금액</Label>
                    <Input
                      type="number"
                      min={0}
                      value={discountAmount}
                      onChange={(e) =>
                        setDiscountAmount(Math.max(0, Number(e.target.value)))
                      }
                      placeholder="0"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">할인사유</Label>
                    <Textarea
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="예: VIP 고객 할인, 재주문 할인 등"
                      rows={1}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Price summary */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">상품금액</span>
                  <span className="text-right">
                    {productTotal.toLocaleString()}원
                  </span>
                  <span className="text-muted-foreground">부가세 (10%)</span>
                  <span className="text-right">
                    {tax.toLocaleString()}원
                  </span>
                  <span className="text-muted-foreground">배송비</span>
                  <span className="text-right">
                    {shippingFee.toLocaleString()}원
                  </span>
                  {discountAmount > 0 && (
                    <>
                      <span className="text-red-600">할인금액</span>
                      <span className="text-right text-red-600">
                        -{discountAmount.toLocaleString()}원
                      </span>
                    </>
                  )}
                  <Separator className="col-span-2 my-1" />
                  <span className="font-bold">최종금액</span>
                  <span className="text-right font-bold text-blue-600 text-base">
                    {finalTotal.toLocaleString()}원
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isLoadingDetail || !hasChanges() || adjustOrder.isPending
            }
          >
            {adjustOrder.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {adjustOrder.isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

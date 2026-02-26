'use client';

import { useState, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import {
  useCreateReturnRequest,
  RETURN_TYPE_LABELS,
  REPAIR_REASON_LABELS,
  REPAIR_REASON_PAID,
} from '@/hooks/use-return-requests';
import { useOrder } from '@/hooks/use-orders';
import { uploadRepairFile, type RepairFileResult } from '@/lib/file-upload';
import { getSpreadPageLabel, getPagePairForSheet, getFileForPageNumber, type PageFile } from '@/lib/page-utils';
import { Upload, X, FileImage, Calendar, Check, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// === 타입 정의 ===

interface OrderFileForReturn {
  id: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  pageRange: string;
  pageStart: number;
  pageEnd: number;
  sortOrder: number;
}

interface OrderItemForReturn {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  size?: string;
  pages?: number;
  printMethod?: string;
  bindingType?: string;
  pageLayout?: string;
  bindingDirection?: string;
  originalsDeleted?: boolean;
  files?: OrderFileForReturn[];
}

interface ReturnRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  items: OrderItemForReturn[];
}

interface RepairPageEntry {
  pageNumber: number;
  fileIndex: number;
  isCompanion: boolean;
  originalFileUrl?: string;
  originalThumbnailUrl?: string;
  file?: File;
  uploading: boolean;
  progress: number;
  result?: RepairFileResult;
  error?: string;
}

export function ReturnRequestDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  items,
}: ReturnRequestDialogProps) {
  const [type, setType] = useState<string>('album_repair');
  const [reason, setReason] = useState<string>('');
  const [reasonDetail, setReasonDetail] = useState('');
  const [selectedItems, setSelectedItems] = useState<
    Record<string, { selected: boolean; quantity: number }>
  >({});

  // 페이지교체 관련 상태
  const [selectedPageMap, setSelectedPageMap] = useState<Map<number, RepairPageEntry>>(new Map());
  // 수동 입력 fallback용
  const [newPageNumber, setNewPageNumber] = useState<string>('');
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const tempRepairId = useRef<string>(`repair-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const createReturn = useCreateReturnRequest();
  const isRepair = type === 'album_repair';
  const isPageReplace = isRepair && reason === 'page_replace';

  // on-demand 파일 데이터 로딩 (목록 페이지에서 호출 시 files가 없을 때)
  const needsFileFetch = open && isPageReplace && items.some((item) => !item.files || item.files.length === 0);
  const { data: orderDetail } = useOrder(needsFileFetch ? orderId : '');

  // items에 파일 데이터 보강
  const enrichedItems = useMemo(() => {
    if (!orderDetail) return items;
    return items.map((item) => {
      if (item.files && item.files.length > 0) return item;
      const detailItem = orderDetail.items?.find((di: any) => di.id === item.id);
      if (detailItem) {
        return {
          ...item,
          pageLayout: item.pageLayout || detailItem.pageLayout,
          bindingDirection: item.bindingDirection || detailItem.bindingDirection,
          originalsDeleted: item.originalsDeleted ?? detailItem.originalsDeleted,
          files: detailItem.files?.map((f: any) => ({
            id: f.id,
            fileName: f.fileName,
            fileUrl: f.fileUrl,
            thumbnailUrl: f.thumbnailUrl,
            pageRange: f.pageRange,
            pageStart: f.pageStart,
            pageEnd: f.pageEnd,
            sortOrder: f.sortOrder,
          })),
        };
      }
      return item;
    });
  }, [items, orderDetail]);

  // 현재 활성 아이템 (페이지교체 시 선택된 첫 번째 아이템)
  const activeItem = useMemo(() => {
    if (!isPageReplace) return null;
    const selectedId = Object.entries(selectedItems).find(([, v]) => v.selected)?.[0];
    if (!selectedId) return null;
    return enrichedItems.find((item) => item.id === selectedId) || null;
  }, [isPageReplace, selectedItems, enrichedItems]);

  // 해당 아이템이 화보앨범(양면) 여부 - single layout이면 양면
  const isDoubleSided = activeItem?.pageLayout === 'single';
  const isSpread = activeItem?.pageLayout === 'spread';

  // 파일이 없는 경우 (원본 삭제됨 또는 파일 없음)
  const hasNoFiles = activeItem && (!activeItem.files || activeItem.files.length === 0 || activeItem.originalsDeleted);

  const resetForm = () => {
    setType('album_repair');
    setReason('');
    setReasonDetail('');
    setSelectedItems({});
    setSelectedPageMap(new Map());
    setNewPageNumber('');
    tempRepairId.current = `repair-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  // 페이지교체 시 상품 선택은 1개만
  const toggleItem = (itemId: string, maxQty: number) => {
    if (isPageReplace) {
      // 페이지교체 시 단일 선택 - 다른 아이템 해제
      setSelectedItems((prev) => {
        const current = prev[itemId];
        if (current?.selected) {
          const next = { ...prev };
          delete next[itemId];
          return next;
        }
        // 기존 선택 모두 해제 후 새 아이템 선택
        return { [itemId]: { selected: true, quantity: maxQty } };
      });
      // 상품 변경 시 페이지 선택 초기화
      setSelectedPageMap(new Map());
    } else {
      setSelectedItems((prev) => {
        const current = prev[itemId];
        if (current?.selected) {
          const next = { ...prev };
          delete next[itemId];
          return next;
        }
        return { ...prev, [itemId]: { selected: true, quantity: maxQty } };
      });
    }
  };

  const updateQuantity = (itemId: string, qty: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: qty },
    }));
  };

  const selectedCount = Object.values(selectedItems).filter((v) => v.selected).length;

  // === 썸네일 기반 페이지 선택 ===

  const handleTogglePage = (fileIndex: number) => {
    if (!activeItem?.files) return;
    const file = activeItem.files[fileIndex];
    if (!file) return;

    if (isSpread) {
      // 압축앨범: 파일 단위 선택 (좌/우 페이지 함께)
      const pagesInFile: number[] = [];
      for (let p = file.pageStart; p <= file.pageEnd; p++) {
        pagesInFile.push(p);
      }
      const isCurrentlySelected = pagesInFile.some((p) => selectedPageMap.has(p));
      setSelectedPageMap((prev) => {
        const next = new Map(prev);
        if (isCurrentlySelected) {
          pagesInFile.forEach((p) => next.delete(p));
        } else {
          // 스프레드: 모든 페이지를 같은 엔트리로 (업로드는 pageStart 기준 1회)
          pagesInFile.forEach((p) => {
            next.set(p, {
              pageNumber: p,
              fileIndex,
              isCompanion: false,
              uploading: false,
              progress: 0,
            });
          });
        }
        return next;
      });
    } else if (isDoubleSided) {
      // 화보앨범: 페이지 선택 + 반대면 자동 페어링
      const clickedPage = file.pageStart;
      const [front, back] = getPagePairForSheet(clickedPage);
      const totalPages = activeItem.pages || 0;

      const isCurrentlySelected = selectedPageMap.has(clickedPage);
      setSelectedPageMap((prev) => {
        const next = new Map(prev);
        if (isCurrentlySelected) {
          next.delete(front);
          next.delete(back);
        } else {
          // 클릭한 페이지: 교체 대상 (업로드 필요)
          const clickedFileIdx = activeItem.files!.findIndex(
            (f) => clickedPage >= f.pageStart && clickedPage <= f.pageEnd,
          );
          next.set(clickedPage, {
            pageNumber: clickedPage,
            fileIndex: clickedFileIdx >= 0 ? clickedFileIdx : fileIndex,
            isCompanion: false,
            uploading: false,
            progress: 0,
          });

          // 반대면: 자동 포함 (원본 파일 참조)
          const companionPage = clickedPage === front ? back : front;
          if (companionPage <= totalPages && companionPage >= 1) {
            const companionFileIdx = activeItem.files!.findIndex(
              (f) => companionPage >= f.pageStart && companionPage <= f.pageEnd,
            );
            const companionFile = companionFileIdx >= 0 ? activeItem.files![companionFileIdx] : undefined;
            next.set(companionPage, {
              pageNumber: companionPage,
              fileIndex: companionFileIdx >= 0 ? companionFileIdx : 0,
              isCompanion: true,
              originalFileUrl: companionFile?.fileUrl,
              originalThumbnailUrl: companionFile?.thumbnailUrl,
              uploading: false,
              progress: 0,
            });
          }
        }
        return next;
      });
    }
  };

  // === 수동 페이지 추가 (fallback) ===

  const addRepairPageManual = () => {
    const num = parseInt(newPageNumber, 10);
    if (isNaN(num) || num < 1) {
      toast({ title: '유효한 페이지 번호를 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (selectedPageMap.has(num)) {
      toast({ title: `${num}페이지는 이미 추가되었습니다.`, variant: 'destructive' });
      return;
    }
    setSelectedPageMap((prev) => {
      const next = new Map(prev);
      next.set(num, {
        pageNumber: num,
        fileIndex: -1,
        isCompanion: false,
        uploading: false,
        progress: 0,
      });
      return next;
    });
    setNewPageNumber('');
  };

  const removeRepairPage = (pageNumber: number) => {
    setSelectedPageMap((prev) => {
      const next = new Map(prev);
      // 화보앨범: 페어링된 페이지도 함께 제거
      if (isDoubleSided) {
        const [front, back] = getPagePairForSheet(pageNumber);
        next.delete(front);
        next.delete(back);
      } else if (isSpread && activeItem?.files) {
        // 스프레드: 같은 파일의 모든 페이지 제거
        const entry = next.get(pageNumber);
        if (entry && entry.fileIndex >= 0) {
          const file = activeItem.files[entry.fileIndex];
          if (file) {
            for (let p = file.pageStart; p <= file.pageEnd; p++) {
              next.delete(p);
            }
          }
        }
      } else {
        next.delete(pageNumber);
      }
      return next;
    });
  };

  // === 파일 업로드 ===

  const handleRepairFileSelect = async (pageNumber: number, file: File) => {
    // 스프레드의 경우 같은 파일의 모든 페이지 업데이트
    const updatePages = (updater: (entry: RepairPageEntry) => RepairPageEntry) => {
      setSelectedPageMap((prev) => {
        const next = new Map(prev);
        const entry = prev.get(pageNumber);
        if (isSpread && entry && entry.fileIndex >= 0 && activeItem?.files) {
          const f = activeItem.files[entry.fileIndex];
          if (f) {
            for (let p = f.pageStart; p <= f.pageEnd; p++) {
              const e = next.get(p);
              if (e && !e.isCompanion) next.set(p, updater(e));
            }
            return next;
          }
        }
        const e = next.get(pageNumber);
        if (e) next.set(pageNumber, updater(e));
        return next;
      });
    };

    updatePages((e) => ({ ...e, file, uploading: true, progress: 0, error: undefined }));

    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken')
          : null;
      const result = await uploadRepairFile(file, tempRepairId.current, pageNumber, token, (percent) => {
        updatePages((e) => ({ ...e, progress: percent }));
      });
      updatePages((e) => ({ ...e, uploading: false, progress: 100, result }));
    } catch (err: any) {
      updatePages((e) => ({ ...e, uploading: false, error: err?.message || '업로드 실패' }));
    }
  };

  // === 제출 ===

  const repairPageEntries = useMemo(
    () => Array.from(selectedPageMap.values()).sort((a, b) => a.pageNumber - b.pageNumber),
    [selectedPageMap],
  );

  // 업로드가 필요한 엔트리들 (companion 제외, 스프레드는 대표 페이지만)
  const uploadRequiredEntries = useMemo(() => {
    const seen = new Set<number>();
    return repairPageEntries.filter((e) => {
      if (e.isCompanion) return false;
      if (isSpread && activeItem?.files && e.fileIndex >= 0) {
        // 스프레드: 파일별 1회만
        if (seen.has(e.fileIndex)) return false;
        seen.add(e.fileIndex);
      }
      return true;
    });
  }, [repairPageEntries, isSpread, activeItem]);

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: '사유를 선택해주세요.', variant: 'destructive' });
      return;
    }
    if (selectedCount === 0) {
      toast({ title: '대상 상품을 선택해주세요.', variant: 'destructive' });
      return;
    }

    if (isPageReplace) {
      if (selectedPageMap.size === 0) {
        toast({ title: '교체할 페이지를 선택해주세요.', variant: 'destructive' });
        return;
      }
      const incompleteUploads = uploadRequiredEntries.filter((e) => !e.result);
      if (incompleteUploads.length > 0) {
        toast({
          title: `${incompleteUploads.map((e) => `${e.pageNumber}p`).join(', ')}의 파일을 업로드해주세요.`,
          variant: 'destructive',
        });
        return;
      }
    }

    const returnItems = Object.entries(selectedItems)
      .filter(([, v]) => v.selected)
      .map(([orderItemId, v]) => ({
        orderItemId,
        quantity: v.quantity,
      }));

    // 교체페이지 정보 구성
    const repairPagesData = isPageReplace
      ? repairPageEntries.map((e) => {
          if (e.isCompanion) {
            return {
              pageNumber: e.pageNumber,
              fileName: e.originalFileUrl?.split('/').pop() || '',
              fileUrl: e.originalFileUrl || '',
              thumbnailUrl: e.originalThumbnailUrl,
              isCompanion: true,
            };
          }
          // 스프레드: 같은 파일의 여러 페이지는 같은 업로드 결과 참조
          const result = e.result;
          if (!result) return null;
          return {
            pageNumber: e.pageNumber,
            fileName: result.fileName,
            fileUrl: result.fileUrl,
            thumbnailUrl: result.thumbnailUrl,
            isCompanion: false,
          };
        }).filter(Boolean)
      : undefined;

    try {
      await createReturn.mutateAsync({
        orderId,
        data: {
          type,
          reason,
          reasonDetail: reasonDetail || undefined,
          items: returnItems,
          repairPages: repairPagesData as any,
        },
      });
      toast({ title: `${RETURN_TYPE_LABELS[type]} 신청이 완료되었습니다.` });
      handleClose(false);
    } catch (err: any) {
      toast({
        title: `${RETURN_TYPE_LABELS[type]} 신청 실패`,
        description: err?.message || '오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const reasonOptions = Object.entries(REPAIR_REASON_LABELS);
  const now = new Date();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-normal">
            앨범수리(재발송) 신청 - {orderNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 신청 날짜/시간 */}
          <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-gray-50 rounded-md px-3 py-2">
            <Calendar className="h-3.5 w-3.5" />
            <span>신청일시: {format(now, 'yyyy-MM-dd (EEE) HH:mm', { locale: ko })}</span>
          </div>

          {/* 신청 유형 */}
          <div className="space-y-1.5">
            <Label className="text-[13px]">신청 유형</Label>
            <div className="text-[13px] h-8 flex items-center px-3 border rounded-md bg-gray-50">
              앨범수리(재발송)
            </div>
          </div>

          {/* 사유 선택 */}
          <div className="space-y-1.5">
            <Label className="text-[13px]">사유 선택</Label>
            <Select value={reason} onValueChange={(v) => {
              setReason(v);
              // 사유 변경 시 페이지 선택 초기화
              if (v !== 'page_replace') {
                setSelectedPageMap(new Map());
              }
            }}>
              <SelectTrigger className="text-[13px] h-8">
                <SelectValue placeholder="사유를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value} className="text-[11px]">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 상세 사유 */}
          <div className="space-y-1.5">
            <Label className="text-[13px]">상세 사유 (선택)</Label>
            <Textarea
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              placeholder="상세 사유를 입력해주세요"
              rows={3}
              className="text-[11px]"
            />
          </div>

          {/* 대상 상품 선택 */}
          <div className="space-y-1.5">
            <Label className="text-[13px]">수리 대상 상품</Label>
            {isPageReplace && (
              <p className="text-[10px] text-gray-500">페이지교체는 한 번에 하나의 상품만 선택할 수 있습니다.</p>
            )}
            <div className="border rounded-md divide-y">
              {enrichedItems.map((item) => {
                const sel = selectedItems[item.id];
                const isSelected = sel?.selected || false;
                return (
                  <div key={item.id} className="p-2.5 flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleItem(item.id, item.quantity)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-black truncate text-center">{item.productName}</p>
                      <p className="text-[12px] text-gray-500 text-center">
                        {item.size && `${item.size} / `}
                        {item.pages && `${item.pages}p / `}
                        {item.quantity}부
                        {item.printMethod && ` / ${item.printMethod}`}
                        {item.bindingType && ` / ${item.bindingType}`}
                      </p>
                    </div>
                    {isSelected && item.quantity > 1 && (
                      <div className="flex items-center gap-1">
                        <Label className="text-[10px] text-gray-500">수량:</Label>
                        <select
                          value={sel.quantity}
                          onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                          className="text-[11px] border rounded px-1.5 py-0.5 h-6"
                          title="수량 선택"
                        >
                          {Array.from({ length: item.quantity }, (_, i) => i + 1).map((q) => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 페이지교체 UI - 썸네일 기반 선택 */}
          {isPageReplace && activeItem && (
            <div className="space-y-3 border rounded-md p-3 bg-blue-50/50">
              <Label className="text-[13px] font-medium">교체 페이지 선택</Label>

              {/* 앨범 타입 안내 */}
              {isSpread && (
                <p className="text-[10px] text-blue-600">
                  압축앨범: 좌/우 페이지가 한 장이므로 펼침면 단위로 선택됩니다.
                </p>
              )}
              {isDoubleSided && (
                <p className="text-[10px] text-blue-600">
                  화보앨범: 양면 인쇄이므로 선택 시 반대면이 자동으로 포함됩니다.
                </p>
              )}

              {/* 썸네일 그리드 또는 수동 입력 fallback */}
              {hasNoFiles ? (
                // Fallback: 원본 파일 없을 때 수동 입력
                <div className="space-y-2">
                  <p className="text-[10px] text-orange-600">
                    원본 파일이 삭제되어 썸네일을 표시할 수 없습니다. 페이지 번호를 직접 입력해주세요.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      placeholder="페이지 번호"
                      value={newPageNumber}
                      onChange={(e) => setNewPageNumber(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addRepairPageManual();
                        }
                      }}
                      className="text-[11px] h-8 w-28"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-[11px] h-8"
                      onClick={addRepairPageManual}
                    >
                      페이지 추가
                    </Button>
                  </div>
                </div>
              ) : (
                // 썸네일 그리드
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-500">교체할 페이지를 클릭하세요.</p>
                  <div className="max-h-[280px] overflow-y-auto border rounded-md p-2 bg-white">
                    <div className="flex flex-wrap gap-2">
                      {activeItem.files!.sort((a, b) => a.sortOrder - b.sortOrder).map((file, idx) => {
                        const totalFiles = activeItem.files!.length;
                        const pageLabel = getSpreadPageLabel(
                          idx,
                          totalFiles,
                          activeItem.pageLayout,
                          activeItem.bindingDirection,
                        );
                        const isFileSelected = (() => {
                          for (let p = file.pageStart; p <= file.pageEnd; p++) {
                            if (selectedPageMap.has(p)) return true;
                          }
                          return false;
                        })();
                        // 컴패니언으로만 선택된 경우 (화보앨범)
                        const isCompanionOnly = (() => {
                          for (let p = file.pageStart; p <= file.pageEnd; p++) {
                            const entry = selectedPageMap.get(p);
                            if (entry && !entry.isCompanion) return false;
                            if (entry && entry.isCompanion) return true;
                          }
                          return false;
                        })();

                        return (
                          <button
                            key={file.id}
                            type="button"
                            className={cn(
                              'relative rounded-md overflow-hidden border-2 transition-all cursor-pointer group',
                              isSpread ? 'w-[calc(25%-6px)]' : 'w-[calc(16.666%-7px)]',
                              isFileSelected && !isCompanionOnly
                                ? 'border-blue-500 ring-1 ring-blue-300'
                                : isCompanionOnly
                                  ? 'border-blue-300 border-dashed'
                                  : 'border-gray-200 hover:border-gray-400',
                            )}
                            onClick={() => handleTogglePage(idx)}
                          >
                            {/* 썸네일 이미지 */}
                            <div className={cn('bg-gray-100', isSpread ? 'aspect-[2/1]' : 'aspect-[3/4]')}>
                              {file.thumbnailUrl ? (
                                <img
                                  src={file.thumbnailUrl}
                                  alt={`${pageLabel}p`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-[10px] text-gray-400">{pageLabel}p</span>
                                </div>
                              )}
                            </div>

                            {/* 페이지 번호 라벨 */}
                            <div className="text-center py-0.5 bg-gray-50">
                              <span className="text-[9px] text-gray-600">{pageLabel}p</span>
                            </div>

                            {/* 선택 인디케이터 */}
                            {isFileSelected && !isCompanionOnly && (
                              <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <Check className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                            {isCompanionOnly && (
                              <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-blue-300 rounded-full flex items-center justify-center">
                                <Link2 className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 선택된 페이지 업로드 영역 */}
              {uploadRequiredEntries.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-[11px] text-gray-700">선택된 교체 페이지 ({uploadRequiredEntries.length}건)</Label>
                  {uploadRequiredEntries.map((entry) => {
                    const file = activeItem.files?.[entry.fileIndex];
                    const pageLabel = isSpread && file
                      ? `${file.pageStart}-${file.pageEnd}`
                      : `${entry.pageNumber}`;

                    // 화보앨범: 컴패니언 페이지 정보
                    const companionEntry = isDoubleSided
                      ? (() => {
                          const [front, back] = getPagePairForSheet(entry.pageNumber);
                          const companionPage = entry.pageNumber === front ? back : front;
                          return selectedPageMap.get(companionPage);
                        })()
                      : null;

                    return (
                      <div key={entry.pageNumber} className="border rounded-md bg-white">
                        {/* 교체 대상 페이지 */}
                        <div className="p-2.5 flex items-center gap-3">
                          {/* 원본 썸네일 */}
                          <div className="flex-shrink-0 w-12 h-12 rounded bg-gray-100 overflow-hidden">
                            {file?.thumbnailUrl ? (
                              <img
                                src={file.thumbnailUrl}
                                alt={`${pageLabel}p`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-[10px] text-gray-500">{pageLabel}p</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-black font-medium">
                              {pageLabel}p {isSpread ? '(펼침면)' : '(교체 대상)'}
                            </p>
                            {entry.result ? (
                              <p className="text-[10px] text-green-600 truncate">
                                {entry.result.originalName} ({(entry.result.size / 1024 / 1024).toFixed(1)}MB)
                              </p>
                            ) : entry.uploading ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 transition-all"
                                    style={{ width: `${entry.progress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-gray-500">{entry.progress}%</span>
                              </div>
                            ) : entry.error ? (
                              <p className="text-[10px] text-red-500">{entry.error}</p>
                            ) : (
                              <p className="text-[10px] text-gray-400">교체 파일을 업로드해주세요</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!entry.uploading && (
                              <>
                                <input
                                  ref={(el) => { fileInputRefs.current[entry.pageNumber] = el; }}
                                  type="file"
                                  accept="image/*"
                                  title={`${pageLabel}p 파일 선택`}
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleRepairFileSelect(entry.pageNumber, f);
                                    e.target.value = '';
                                  }}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="text-[10px] h-7 px-2"
                                  onClick={() => fileInputRefs.current[entry.pageNumber]?.click()}
                                >
                                  <Upload className="h-3 w-3 mr-1" />
                                  {entry.result ? '재업로드' : '업로드'}
                                </Button>
                              </>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                              onClick={() => removeRepairPage(entry.pageNumber)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* 화보앨범: 컴패니언 페이지 표시 */}
                        {companionEntry && (
                          <div className="border-t p-2.5 flex items-center gap-3 bg-blue-50/30">
                            <div className="flex-shrink-0 w-12 h-12 rounded bg-gray-100 overflow-hidden">
                              {companionEntry.originalThumbnailUrl ? (
                                <img
                                  src={companionEntry.originalThumbnailUrl}
                                  alt={`${companionEntry.pageNumber}p`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-[10px] text-gray-500">{companionEntry.pageNumber}p</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-gray-600">
                                {companionEntry.pageNumber}p (반대면 - 원본 자동 포함)
                              </p>
                              <p className="text-[10px] text-blue-500">
                                <Link2 className="h-3 w-3 inline mr-0.5" />
                                양면 인쇄를 위해 자동으로 포함됩니다
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 비용 안내 */}
          {reason && (
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-[11px] text-gray-600">
                {REPAIR_REASON_PAID[reason] ? (
                  <>
                    <span className="text-red-600 font-medium">페이지교체</span>는{' '}
                    <span className="text-red-600">유상 수리</span>입니다. 수리 비용이 별도 청구됩니다.
                    {isPageReplace && selectedPageMap.size > 0 && (
                      <span className="block mt-1 text-gray-500">
                        교체 페이지: {uploadRequiredEntries.map((e) => {
                          if (isSpread && activeItem?.files?.[e.fileIndex]) {
                            const f = activeItem.files[e.fileIndex];
                            return `${f.pageStart}-${f.pageEnd}p`;
                          }
                          return `${e.pageNumber}p`;
                        }).join(', ')}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-green-600 font-medium">
                      {REPAIR_REASON_LABELS[reason]?.replace(/ \(무상\)/, '')}
                    </span>
                    은(는) <span className="text-green-600">무상 수리</span>로 진행됩니다.
                  </>
                )}
              </p>
            </div>
          )}

          {/* 제출 */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-[11px] h-8"
              onClick={() => handleClose(false)}
            >
              취소
            </Button>
            <Button
              size="sm"
              className="text-[11px] h-8"
              onClick={handleSubmit}
              disabled={
                createReturn.isPending ||
                !reason ||
                selectedCount === 0 ||
                (isPageReplace && repairPageEntries.some((e) => e.uploading))
              }
            >
              {createReturn.isPending
                ? '신청 중...'
                : `${RETURN_TYPE_LABELS[type]} 신청`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

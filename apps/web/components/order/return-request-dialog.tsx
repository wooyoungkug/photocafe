'use client';

import { useState, useRef } from 'react';
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
import { uploadRepairFile, type RepairFileResult } from '@/lib/file-upload';
import { Upload, X, FileImage, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

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

  // 앨범수리 - 페이지교체 관련
  const [repairPages, setRepairPages] = useState<RepairPageEntry[]>([]);
  const [newPageNumber, setNewPageNumber] = useState<string>('');
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const tempRepairId = useRef<string>(`repair-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const createReturn = useCreateReturnRequest();
  const isRepair = type === 'album_repair';
  const isPageReplace = isRepair && reason === 'page_replace';

  const resetForm = () => {
    setType('album_repair');
    setReason('');
    setReasonDetail('');
    setSelectedItems({});
    setRepairPages([]);
    setNewPageNumber('');
    tempRepairId.current = `repair-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  // type은 album_repair 고정

  const toggleItem = (itemId: string, maxQty: number) => {
    setSelectedItems((prev) => {
      const current = prev[itemId];
      if (current?.selected) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: { selected: true, quantity: maxQty } };
    });
  };

  const updateQuantity = (itemId: string, qty: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: qty },
    }));
  };

  const selectedCount = Object.values(selectedItems).filter((v) => v.selected).length;

  // === 페이지교체 관련 함수 ===

  const addRepairPage = () => {
    const num = parseInt(newPageNumber, 10);
    if (isNaN(num) || num < 1) {
      toast({ title: '유효한 페이지 번호를 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (repairPages.some((p) => p.pageNumber === num)) {
      toast({ title: `${num}페이지는 이미 추가되었습니다.`, variant: 'destructive' });
      return;
    }
    setRepairPages((prev) => [...prev, { pageNumber: num, uploading: false, progress: 0 }].sort((a, b) => a.pageNumber - b.pageNumber));
    setNewPageNumber('');
  };

  const removeRepairPage = (pageNumber: number) => {
    setRepairPages((prev) => prev.filter((p) => p.pageNumber !== pageNumber));
  };

  const handleRepairFileSelect = async (pageNumber: number, file: File) => {
    setRepairPages((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNumber
          ? { ...p, file, uploading: true, progress: 0, error: undefined }
          : p,
      ),
    );

    try {
      const token = typeof window !== 'undefined'
        ? (sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken'))
        : null;
      const result = await uploadRepairFile(
        file,
        tempRepairId.current,
        pageNumber,
        token,
        (percent) => {
          setRepairPages((prev) =>
            prev.map((p) =>
              p.pageNumber === pageNumber ? { ...p, progress: percent } : p,
            ),
          );
        },
      );

      setRepairPages((prev) =>
        prev.map((p) =>
          p.pageNumber === pageNumber
            ? { ...p, uploading: false, progress: 100, result }
            : p,
        ),
      );
    } catch (err: any) {
      setRepairPages((prev) =>
        prev.map((p) =>
          p.pageNumber === pageNumber
            ? { ...p, uploading: false, error: err?.message || '업로드 실패' }
            : p,
        ),
      );
    }
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: '사유를 선택해주세요.', variant: 'destructive' });
      return;
    }
    if (selectedCount === 0) {
      toast({ title: '대상 상품을 선택해주세요.', variant: 'destructive' });
      return;
    }

    // 페이지교체 시 검증
    if (isPageReplace) {
      if (repairPages.length === 0) {
        toast({ title: '교체할 페이지를 추가해주세요.', variant: 'destructive' });
        return;
      }
      const incompletePages = repairPages.filter((p) => !p.result);
      if (incompletePages.length > 0) {
        toast({
          title: `${incompletePages.map((p) => p.pageNumber).join(', ')}페이지의 파일을 업로드해주세요.`,
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

    // 교체페이지 정보
    const repairPagesData = isPageReplace
      ? repairPages
          .filter((p) => p.result)
          .map((p) => ({
            pageNumber: p.pageNumber,
            fileName: p.result!.fileName,
            fileUrl: p.result!.fileUrl,
            thumbnailUrl: p.result!.thumbnailUrl,
          }))
      : undefined;

    try {
      await createReturn.mutateAsync({
        orderId,
        data: {
          type,
          reason,
          reasonDetail: reasonDetail || undefined,
          items: returnItems,
          repairPages: repairPagesData,
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

  // 사유 옵션 - 앨범수리 사유만
  const reasonOptions = Object.entries(REPAIR_REASON_LABELS);

  // 현재 날짜/시간
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

          {/* 신청 유형 (앨범수리 고정) */}
          <div className="space-y-1.5">
            <Label className="text-[11px]">신청 유형</Label>
            <div className="text-[11px] h-8 flex items-center px-3 border rounded-md bg-gray-50">
              앨범수리(재발송)
            </div>
          </div>

          {/* 사유 선택 */}
          <div className="space-y-1.5">
            <Label className="text-[11px]">사유 선택</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="text-[11px] h-8">
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
            <Label className="text-[11px]">상세 사유 (선택)</Label>
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
            <Label className="text-[11px]">수리 대상 상품</Label>
            <div className="border rounded-md divide-y">
              {items.map((item) => {
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

          {/* 페이지교체 UI - 교체페이지 등록 + 파일 업로드 */}
          {isPageReplace && (
            <div className="space-y-3 border rounded-md p-3 bg-blue-50/50">
              <Label className="text-[11px] font-medium">교체 페이지 등록</Label>
              <p className="text-[10px] text-gray-500">
                교체할 페이지 번호를 입력하고 교체 데이터 파일을 업로드해주세요.
              </p>

              {/* 페이지 번호 추가 */}
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
                      addRepairPage();
                    }
                  }}
                  className="text-[11px] h-8 w-28"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-[11px] h-8"
                  onClick={addRepairPage}
                >
                  페이지 추가
                </Button>
              </div>

              {/* 등록된 페이지 목록 */}
              {repairPages.length > 0 && (
                <div className="space-y-2">
                  {repairPages.map((page) => (
                    <div
                      key={page.pageNumber}
                      className="border rounded-md p-2.5 bg-white flex items-center gap-3"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                        {page.result ? (
                          <FileImage className="h-5 w-5 text-green-600" />
                        ) : (
                          <span className="text-[11px] text-gray-600 font-medium">
                            {page.pageNumber}p
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-black">
                          {page.pageNumber}페이지
                        </p>
                        {page.result ? (
                          <p className="text-[10px] text-green-600 truncate">
                            {page.result.originalName} ({(page.result.size / 1024 / 1024).toFixed(1)}MB)
                          </p>
                        ) : page.uploading ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${page.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500">{page.progress}%</span>
                          </div>
                        ) : page.error ? (
                          <p className="text-[10px] text-red-500">{page.error}</p>
                        ) : (
                          <p className="text-[10px] text-gray-400">파일을 업로드해주세요</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!page.uploading && (
                          <>
                            <input
                              ref={(el) => { fileInputRefs.current[page.pageNumber] = el; }}
                              type="file"
                              accept="image/*"
                              title={`${page.pageNumber}페이지 파일 선택`}
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleRepairFileSelect(page.pageNumber, file);
                                e.target.value = '';
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-7 px-2"
                              onClick={() => fileInputRefs.current[page.pageNumber]?.click()}
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              {page.result ? '재업로드' : '업로드'}
                            </Button>
                          </>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                          onClick={() => removeRepairPage(page.pageNumber)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 비용 안내 */}
          {reason && (
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-[16px] text-gray-600">
                {REPAIR_REASON_PAID[reason] ? (
                  <>
                    <span className="text-red-600 font-medium">페이지교체</span>는{' '}
                    <span className="text-red-600">유상 수리</span>입니다. 수리 비용이 별도 청구됩니다.
                    {isPageReplace && repairPages.length > 0 && (
                      <span className="block mt-1 text-gray-500">
                        교체 페이지: {repairPages.map((p) => `${p.pageNumber}p`).join(', ')}
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
                (isPageReplace && repairPages.some((p) => p.uploading))
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

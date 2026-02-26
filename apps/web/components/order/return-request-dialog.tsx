'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  RETURN_REASON_LABELS,
  RETURN_TYPE_LABELS,
} from '@/hooks/use-return-requests';

interface OrderItemForReturn {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  size?: string;
}

interface ReturnRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  items: OrderItemForReturn[];
}

export function ReturnRequestDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  items,
}: ReturnRequestDialogProps) {
  const [type, setType] = useState<string>('return');
  const [reason, setReason] = useState<string>('');
  const [reasonDetail, setReasonDetail] = useState('');
  const [selectedItems, setSelectedItems] = useState<
    Record<string, { selected: boolean; quantity: number }>
  >({});

  const createReturn = useCreateReturnRequest();

  const resetForm = () => {
    setType('return');
    setReason('');
    setReasonDetail('');
    setSelectedItems({});
  };

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

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

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: '반품 사유를 선택해주세요.', variant: 'destructive' });
      return;
    }
    if (selectedCount === 0) {
      toast({ title: '반품할 상품을 선택해주세요.', variant: 'destructive' });
      return;
    }

    const returnItems = Object.entries(selectedItems)
      .filter(([, v]) => v.selected)
      .map(([orderItemId, v]) => ({
        orderItemId,
        quantity: v.quantity,
      }));

    try {
      await createReturn.mutateAsync({
        orderId,
        data: {
          type,
          reason,
          reasonDetail: reasonDetail || undefined,
          items: returnItems,
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

  const reasonOptions = Object.entries(RETURN_REASON_LABELS);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-normal">
            반품/교환 신청 - {orderNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 타입 선택 */}
          <div className="space-y-1.5">
            <Label className="text-[11px]">신청 유형</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="text-[11px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="return" className="text-[11px]">반품 (환불)</SelectItem>
                <SelectItem value="exchange" className="text-[11px]">교환 (재발송)</SelectItem>
              </SelectContent>
            </Select>
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
                    {(value === 'defect' || value === 'wrong_item' || value === 'damaged') && (
                      <span className="text-green-600 ml-1">(무료반송)</span>
                    )}
                    {value === 'customer_change' && (
                      <span className="text-red-600 ml-1">(배송비 고객부담)</span>
                    )}
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

          {/* 상품 선택 */}
          <div className="space-y-1.5">
            <Label className="text-[11px]">반품 상품 선택</Label>
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
                      <p className="text-[11px] text-black truncate">{item.productName}</p>
                      <p className="text-[10px] text-gray-500">
                        {item.size && `${item.size} / `}
                        {item.quantity}부 / {Number(item.totalPrice).toLocaleString()}원
                      </p>
                    </div>
                    {isSelected && item.quantity > 1 && (
                      <div className="flex items-center gap-1">
                        <Label className="text-[10px] text-gray-500">수량:</Label>
                        <select
                          value={sel.quantity}
                          onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                          className="text-[11px] border rounded px-1.5 py-0.5 h-6"
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

          {/* 배송비 안내 */}
          {reason && (
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-[11px] text-gray-600">
                {reason === 'customer_change' ? (
                  <>
                    <span className="text-red-600 font-medium">고객 변심</span>으로 인한 반품은 왕복 배송비가 고객 부담입니다.
                  </>
                ) : reason === 'other' ? (
                  <>
                    <span className="text-gray-700 font-medium">기타</span> 사유는 관리자 검토 후 배송비 부담자가 결정됩니다.
                  </>
                ) : (
                  <>
                    <span className="text-green-600 font-medium">
                      {RETURN_REASON_LABELS[reason]}
                    </span>
                    {' '}사유로 반품 배송비는 회사 부담(무료)입니다.
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
              disabled={createReturn.isPending || !reason || selectedCount === 0}
            >
              {createReturn.isPending ? '신청 중...' : `${RETURN_TYPE_LABELS[type]} 신청`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

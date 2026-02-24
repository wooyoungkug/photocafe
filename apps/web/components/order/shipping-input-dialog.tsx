'use client';

import { useState, useEffect } from 'react';
import { Truck, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateShipping } from '@/hooks/use-orders';
import { useCourierList } from '@/hooks/use-delivery-tracking';
import { TrackingTimeline } from './tracking-timeline';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  currentCourierCode?: string;
  currentTrackingNumber?: string;
}

export function ShippingInputDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  currentCourierCode,
  currentTrackingNumber,
}: Props) {
  const [courierCode, setCourierCode] = useState(currentCourierCode ?? '');
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber ?? '');
  const [showTracking, setShowTracking] = useState(false);

  const { data: couriers = [] } = useCourierList();
  const updateShipping = useUpdateShipping();

  // dialog 열릴 때 기존 값 초기화
  useEffect(() => {
    if (open) {
      setCourierCode(currentCourierCode ?? '');
      setTrackingNumber(currentTrackingNumber ?? '');
      setShowTracking(!!currentCourierCode && !!currentTrackingNumber);
    }
  }, [open, currentCourierCode, currentTrackingNumber]);

  const handleSave = () => {
    if (!courierCode || !trackingNumber.trim()) {
      toast({ title: '택배사와 운송장 번호를 모두 입력해주세요.', variant: 'destructive' });
      return;
    }

    updateShipping.mutate(
      { orderId, courierCode, trackingNumber: trackingNumber.trim() },
      {
        onSuccess: () => {
          toast({ title: '송장이 저장되었습니다.' });
          setShowTracking(true);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : '송장 저장에 실패했습니다.';
          toast({ title: msg, variant: 'destructive' });
        },
      },
    );
  };

  const hasChanges =
    courierCode !== (currentCourierCode ?? '') ||
    trackingNumber.trim() !== (currentTrackingNumber ?? '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            송장 입력 — {orderNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 택배사 선택 */}
          <div className="space-y-1.5">
            <Label>택배사</Label>
            <Select value={courierCode} onValueChange={setCourierCode}>
              <SelectTrigger>
                <SelectValue placeholder="택배사 선택" />
              </SelectTrigger>
              <SelectContent>
                {couriers.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 운송장 번호 */}
          <div className="space-y-1.5">
            <Label>운송장 번호</Label>
            <Input
              placeholder="운송장 번호 입력"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          {/* 배송 추적 결과 */}
          {showTracking && courierCode && trackingNumber && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <TrackingTimeline
                courierCode={showTracking && !hasChanges ? courierCode : ''}
                trackingNumber={showTracking && !hasChanges ? trackingNumber : ''}
              />
            </div>
          )}

          {!showTracking && currentCourierCode && currentTrackingNumber && (
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
              onClick={() => setShowTracking(true)}
            >
              <Package className="h-3.5 w-3.5" />
              배송 현황 보기
            </button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateShipping.isPending || !hasChanges}
          >
            {updateShipping.isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

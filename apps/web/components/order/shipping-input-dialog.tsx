'use client';

import { useState, useEffect } from 'react';
import { Truck, Zap, Loader2, ExternalLink } from 'lucide-react';
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
import { useLogenStatus, useGenerateLogenTracking } from '@/hooks/use-logen';

/** 택배사 코드 → 직접 조회 URL */
const DIRECT_TRACKING_URLS: Record<string, (no: string) => string> = {
  '01': (no) => `https://service.epost.go.kr/trace.RetrieveDomRi498.postal?sid1=${no}`,
  '04': (no) => `https://trace.cjlogistics.com/next/tracking.html?wblNo=${no}`,
  '05': (no) => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?wblnumText2=${no}`,
  '06': (no) => `https://www.ilogen.com/web/personal/trace/${no}`,
  '08': (no) => `https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=${no}`,
};
import { toast } from '@/hooks/use-toast';

function speakTracking(trackingNumber: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance('운송장 저장완료');
  utter.lang = 'ko-KR';
  utter.rate = 0.95;
  window.speechSynthesis.speak(utter);
}

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
  const [courierCode, setCourierCode] = useState(currentCourierCode ?? '06'); // 기본: 로젠택배
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber ?? '');

  const { data: couriers = [] } = useCourierList();
  const updateShipping = useUpdateShipping();
  const { data: logenStatus } = useLogenStatus();
  const generateLogen = useGenerateLogenTracking();

  // dialog 열릴 때 기존 값 초기화
  useEffect(() => {
    if (open) {
      setCourierCode(currentCourierCode ?? '06'); // 기본: 로젠택배
      setTrackingNumber(currentTrackingNumber ?? '');
    }
  }, [open, currentCourierCode, currentTrackingNumber]);

  const handleSave = () => {
    if (!courierCode || !trackingNumber.trim()) {
      toast({ title: '택배사와 운송장 번호를 모두 입력해주세요.', variant: 'destructive' });
      return;
    }

    const trimmed = trackingNumber.trim();
    updateShipping.mutate(
      { orderId, courierCode, trackingNumber: trimmed },
      {
        onSuccess: () => {
          toast({ title: '송장이 저장되었습니다.' });
          speakTracking(trimmed);
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : '송장 저장에 실패했습니다.';
          toast({ title: msg, variant: 'destructive' });
        },
      },
    );
  };

  const handleLogenGenerate = async () => {
    if (!logenStatus?.configured) {
      toast({ title: '로젠택배 API가 설정되지 않았습니다. (.env에 LOGEN_USER_ID, LOGEN_CUST_CD를 입력해주세요)', variant: 'destructive' });
      return;
    }
    try {
      const result = await generateLogen.mutateAsync(orderId);
      const msg = result.alreadyExists
        ? `이미 송장번호가 있습니다: ${result.trackingNumber}`
        : `로젠택배 송장 발급 완료: ${result.trackingNumber}`;
      toast({ title: msg });
      speakTracking(result.trackingNumber);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '송장 자동발급에 실패했습니다.';
      toast({ title: msg, variant: 'destructive' });
    }
  };

  const hasChanges =
    courierCode !== (currentCourierCode ?? '') ||
    trackingNumber.trim() !== (currentTrackingNumber ?? '');

  const showAutoGenerate = !currentTrackingNumber;

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
          {/* 로젠 자동발급 버튼 */}
          {showAutoGenerate && (
            <Button
              variant="outline"
              className="w-full border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
              onClick={handleLogenGenerate}
              disabled={generateLogen.isPending}
            >
              {generateLogen.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {generateLogen.isPending ? '발급 중...' : '로젠택배 자동발급'}
            </Button>
          )}

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

          {/* 배송 추적: 택배사 직접 조회 링크 */}
          {courierCode && trackingNumber && (
            <div className="border rounded-lg p-3 bg-gray-50 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                배송추적
              </span>
              {DIRECT_TRACKING_URLS[courierCode] ? (
                <a
                  href={DIRECT_TRACKING_URLS[courierCode](trackingNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  택배사에서 직접 조회
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">조회 URL 없음</span>
              )}
            </div>
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

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ScanBarcode, Loader2, AlertCircle, Package, Truck, Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBarcodeScan, useGenerateLabel, useDownloadLabel } from '@/hooks/use-shipping-mgmt';
import { useUpdateShipping, ORDER_STATUS_LABELS } from '@/hooks/use-orders';
import { useCourierList } from '@/hooks/use-delivery-tracking';
import { toast } from '@/hooks/use-toast';

// 바코드 스캔 상태
type ScanState = 'idle' | 'scanning' | 'found' | 'not-found' | 'error';

// 상태별 배지 스타일
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending_receipt: { label: '접수대기', className: 'bg-orange-100 text-orange-700' },
  receipt_completed: { label: '접수완료', className: 'bg-blue-100 text-blue-700' },
  in_production: { label: '생산진행', className: 'bg-purple-100 text-purple-700' },
  ready_for_shipping: { label: '배송준비', className: 'bg-indigo-100 text-indigo-700' },
  shipped: { label: '배송완료', className: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소', className: 'bg-gray-100 text-gray-500' },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderFound?: (order: any) => void;
}

export function BarcodeScanner({ open, onOpenChange, onOrderFound }: Props) {
  const [barcode, setBarcode] = useState('');
  const [searchBarcode, setSearchBarcode] = useState('');
  const [scanState, setScanState] = useState<ScanState>('idle');

  // 송장 입력 폼
  const [courierCode, setCourierCode] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { data: scanResult, isLoading: isScanLoading, error: scanError } = useBarcodeScan(searchBarcode);
  const { data: couriers = [] } = useCourierList();
  const updateShipping = useUpdateShipping();
  const generateLabel = useGenerateLabel();
  const downloadLabel = useDownloadLabel();

  // 스캔 결과 처리
  useEffect(() => {
    if (!searchBarcode) {
      setScanState('idle');
      return;
    }
    if (isScanLoading) {
      setScanState('scanning');
      return;
    }
    if (scanError) {
      setScanState('not-found');
      return;
    }
    if (scanResult?.order) {
      setScanState('found');
      // 기존 배송 정보로 폼 초기화
      const shipping = scanResult.order.shipping;
      if (shipping?.courierCode) setCourierCode(shipping.courierCode);
      if (shipping?.trackingNumber) setTrackingNumber(shipping.trackingNumber);
      onOrderFound?.(scanResult.order);
    }
  }, [searchBarcode, isScanLoading, scanError, scanResult, onOrderFound]);

  // 다이얼로그 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setBarcode('');
      setSearchBarcode('');
      setScanState('idle');
      setCourierCode('');
      setTrackingNumber('');
      // 자동 포커스
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // 바코드 입력 처리 (엔터 또는 스캐너 자동 입력)
  const handleScan = useCallback(() => {
    const trimmed = barcode.trim();
    if (!trimmed) return;
    setSearchBarcode(trimmed);
  }, [barcode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan();
    }
  };

  // 송장 저장
  const handleSaveTracking = () => {
    if (!scanResult?.order?.id) return;
    if (!courierCode || !trackingNumber.trim()) {
      toast({ title: '택배사와 운송장 번호를 모두 입력해주세요.', variant: 'destructive' });
      return;
    }

    updateShipping.mutate(
      {
        orderId: scanResult.order.id,
        courierCode,
        trackingNumber: trackingNumber.trim(),
      },
      {
        onSuccess: () => {
          toast({ title: '송장이 저장되었습니다.' });
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : '송장 저장에 실패했습니다.';
          toast({ title: msg, variant: 'destructive' });
        },
      }
    );
  };

  // 운송장 출력
  const handlePrintLabel = async () => {
    if (!scanResult?.order?.id) return;
    try {
      await generateLabel.mutateAsync(scanResult.order.id);
      await downloadLabel.mutateAsync(scanResult.order.id);
      toast({ title: '운송장이 생성되었습니다.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '운송장 생성에 실패했습니다.';
      toast({ title: msg, variant: 'destructive' });
    }
  };

  // 다음 스캔 준비
  const handleNextScan = () => {
    setBarcode('');
    setSearchBarcode('');
    setScanState('idle');
    setCourierCode('');
    setTrackingNumber('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const order = scanResult?.order;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            바코드 스캔
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 바코드 입력 */}
          <div className="space-y-1.5">
            <Label>바코드 / 주문번호</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="바코드를 스캔하거나 주문번호를 입력하세요"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <Button onClick={handleScan} disabled={!barcode.trim() || isScanLoading}>
                {isScanLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '조회'
                )}
              </Button>
            </div>
          </div>

          {/* 스캐닝 중 */}
          {scanState === 'scanning' && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              주문을 조회하고 있습니다...
            </div>
          )}

          {/* 주문을 찾지 못함 */}
          {scanState === 'not-found' && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <p className="font-medium text-red-700">주문을 찾을 수 없습니다</p>
                <p className="text-sm text-red-600 mt-0.5">
                  바코드 &quot;{searchBarcode}&quot;에 해당하는 주문이 없습니다.
                </p>
              </div>
            </div>
          )}

          {/* 주문 정보 표시 */}
          {scanState === 'found' && order && (
            <div className="space-y-4">
              {/* 주문 요약 카드 */}
              <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-slate-500" />
                    <span className="font-semibold text-sm">{order.orderNumber}</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      STATUS_BADGE[order.status]?.className ?? 'bg-gray-100 text-gray-600'
                    }
                  >
                    {STATUS_BADGE[order.status]?.label ??
                      ORDER_STATUS_LABELS[order.status] ??
                      order.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">거래처:</span>{' '}
                    <span className="font-medium">{order.client?.clientName ?? '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">수령인:</span>{' '}
                    <span className="font-medium">{order.shipping?.recipientName ?? '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">상품:</span>{' '}
                    <span className="font-medium">
                      {order.items?.map((i: any) => i.productName).join(', ') || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 송장 입력 폼 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-500" />
                  <Label className="text-sm font-semibold">송장 정보</Label>
                </div>

                <div className="space-y-2">
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

                  <Input
                    placeholder="운송장 번호 입력"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveTracking();
                      }
                    }}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveTracking}
                    disabled={
                      updateShipping.isPending ||
                      !courierCode ||
                      !trackingNumber.trim()
                    }
                    className="flex-1"
                  >
                    {updateShipping.isPending ? '저장 중...' : '송장 저장'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePrintLabel}
                    disabled={generateLabel.isPending || downloadLabel.isPending}
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    운송장 출력
                  </Button>
                </div>
              </div>

              {/* 다음 스캔 */}
              <Button
                variant="secondary"
                onClick={handleNextScan}
                className="w-full"
              >
                <ScanBarcode className="h-4 w-4 mr-1.5" />
                다음 바코드 스캔
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

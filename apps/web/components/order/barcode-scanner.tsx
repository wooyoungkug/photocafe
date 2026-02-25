'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ScanBarcode,
  Loader2,
  AlertCircle,
  Package,
  Truck,
  Printer,
  Settings,
  CheckCircle2,
  Zap,
} from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
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
import { useGenerateLogenTracking, useLogenStatus } from '@/hooks/use-logen';
import { usePrinter, type LabelFormat } from '@/hooks/use-printer';
import { speak } from '@/lib/tts';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScanState = 'idle' | 'scanning' | 'found' | 'not-found' | 'error';

/** 자동모드 처리 단계 */
type AutoStep = 'idle' | 'scanning' | 'logen' | 'generating' | 'printing' | 'done' | 'error';

const AUTO_STEP_LABELS: Record<AutoStep, string> = {
  idle: '대기',
  scanning: '주문 조회 중...',
  logen: '로젠 송장 발급 중...',
  generating: '라벨 PDF 생성 중...',
  printing: '출력 중...',
  done: '완료! 다음 스캔 대기...',
  error: '오류 발생',
};

const AUTO_STEPS: AutoStep[] = ['scanning', 'logen', 'generating', 'printing', 'done'];

function getStepIndex(step: AutoStep): number {
  return AUTO_STEPS.indexOf(step);
}

/** 상태별 배지 스타일 */
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending_receipt: { label: '접수대기', className: 'bg-orange-100 text-orange-700' },
  receipt_completed: { label: '접수완료', className: 'bg-blue-100 text-blue-700' },
  in_production: { label: '생산진행', className: 'bg-purple-100 text-purple-700' },
  ready_for_shipping: { label: '배송준비', className: 'bg-indigo-100 text-indigo-700' },
  shipped: { label: '배송완료', className: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소', className: 'bg-gray-100 text-gray-500' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderFound?: (order: any) => void;
}

export function BarcodeScanner({ open, onOpenChange, onOrderFound }: Props) {
  const [barcode, setBarcode] = useState('');
  const [searchBarcode, setSearchBarcode] = useState('');
  const [scanState, setScanState] = useState<ScanState>('idle');

  // 송장 입력 폼 (수동모드)
  const [courierCode, setCourierCode] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  // 자동모드 상태
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoStep, setAutoStep] = useState<AutoStep>('idle');
  const [autoError, setAutoError] = useState<string | undefined>();
  const [processedCount, setProcessedCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const autoProcessingRef = useRef(false);

  // Hooks
  const { data: scanResult, isLoading: isScanLoading, error: scanError } = useBarcodeScan(searchBarcode);
  const { data: couriers = [] } = useCourierList();
  const updateShipping = useUpdateShipping();
  const generateLabel = useGenerateLabel();
  const downloadLabel = useDownloadLabel();
  const generateLogen = useGenerateLogenTracking();
  const { data: logenStatus } = useLogenStatus();
  const { printLabel, isPrinting, preferences, updatePreferences } = usePrinter();

  // ---------------------------------------------------------------------------
  // Auto-process pipeline
  // ---------------------------------------------------------------------------

  const runAutoProcess = useCallback(
    async (order: any) => {
      if (autoProcessingRef.current) return;
      autoProcessingRef.current = true;

      const orderId = order.id;
      const shipping = order.shipping;

      try {
        // Step 1: 로젠 송장 발급 (미발급 시)
        if (!shipping?.trackingNumber) {
          setAutoStep('logen');
          speak('송장 발급 중');

          if (!shipping?.address) {
            throw new Error('수령인 주소가 누락되었습니다.');
          }

          if (!logenStatus?.configured) {
            throw new Error('로젠택배 API가 설정되지 않았습니다.');
          }

          const logenResult = await generateLogen.mutateAsync(orderId);
          if (logenResult.alreadyExists) {
            speak('기존 송장번호 사용');
          } else {
            speak(`송장 ${logenResult.trackingNumber} 발급 완료`);
          }
        } else {
          speak('기존 송장번호 사용');
        }

        // Step 2: 라벨 PDF 생성
        setAutoStep('generating');
        speak('라벨 생성 중');
        await generateLabel.mutateAsync({
          orderId,
          format: preferences.labelFormat,
        });

        // Step 3: 자동 출력
        setAutoStep('printing');
        speak('출력 중');
        await printLabel(orderId);

        // Step 4: 완료
        setAutoStep('done');
        speak('출력 완료');
        setProcessedCount((c) => c + 1);

        // 1.5초 후 다음 스캔 준비
        setTimeout(() => {
          handleNextScan();
          setAutoStep('idle');
          setAutoError(undefined);
          autoProcessingRef.current = false;
        }, 1500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '자동 처리 실패';
        speak(msg);
        setAutoStep('error');
        setAutoError(msg);
        toast({ title: msg, variant: 'destructive' });
        autoProcessingRef.current = false;
      }
    },
    [generateLogen, generateLabel, printLabel, preferences.labelFormat, logenStatus],
  );

  // ---------------------------------------------------------------------------
  // Scan result handler
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!searchBarcode) {
      setScanState('idle');
      return;
    }
    if (isScanLoading) {
      setScanState('scanning');
      if (autoEnabled) setAutoStep('scanning');
      return;
    }
    if (scanError) {
      setScanState('not-found');
      if (autoEnabled) {
        setAutoStep('error');
        setAutoError('주문을 찾을 수 없습니다.');
        speak('주문을 찾을 수 없습니다');
        autoProcessingRef.current = false;
      }
      return;
    }
    if (scanResult?.order) {
      setScanState('found');
      const shipping = scanResult.order.shipping;
      if (shipping?.courierCode) setCourierCode(shipping.courierCode);
      if (shipping?.trackingNumber) setTrackingNumber(shipping.trackingNumber);
      onOrderFound?.(scanResult.order);

      // 자동모드: 파이프라인 시작
      if (autoEnabled) {
        runAutoProcess(scanResult.order);
      }
    }
  }, [searchBarcode, isScanLoading, scanError, scanResult, onOrderFound, autoEnabled, runAutoProcess]);

  // ---------------------------------------------------------------------------
  // Dialog lifecycle
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (open) {
      setBarcode('');
      setSearchBarcode('');
      setScanState('idle');
      setCourierCode('');
      setTrackingNumber('');
      setAutoStep('idle');
      setAutoError(undefined);
      autoProcessingRef.current = false;
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // ---------------------------------------------------------------------------
  // Manual mode handlers
  // ---------------------------------------------------------------------------

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
        onSuccess: () => toast({ title: '송장이 저장되었습니다.' }),
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : '송장 저장에 실패했습니다.';
          toast({ title: msg, variant: 'destructive' });
        },
      },
    );
  };

  const handlePrintLabel = async () => {
    if (!scanResult?.order?.id) return;
    try {
      await generateLabel.mutateAsync({
        orderId: scanResult.order.id,
        format: preferences.labelFormat,
      });
      if (preferences.autoPrint) {
        await printLabel(scanResult.order.id);
        speak('출력 완료');
      } else {
        await downloadLabel.mutateAsync(scanResult.order.id);
      }
      toast({ title: '운송장이 생성되었습니다.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '운송장 생성에 실패했습니다.';
      toast({ title: msg, variant: 'destructive' });
    }
  };

  const handleNextScan = useCallback(() => {
    setBarcode('');
    setSearchBarcode('');
    setScanState('idle');
    setCourierCode('');
    setTrackingNumber('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const order = scanResult?.order;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5" />
              바코드 스캔
              {autoEnabled && (
                <Badge className="bg-green-100 text-green-700 text-xs">자동모드</Badge>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setShowSettings((s) => !s)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1.5">
                <Label htmlFor="auto-mode" className="text-xs text-muted-foreground">
                  자동
                </Label>
                <Switch
                  id="auto-mode"
                  checked={autoEnabled}
                  onCheckedChange={(checked) => {
                    setAutoEnabled(checked);
                    setAutoStep('idle');
                    setAutoError(undefined);
                    autoProcessingRef.current = false;
                  }}
                />
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* 설정 패널 */}
          {showSettings && (
            <div className="border rounded-lg p-3 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">라벨 크기</Label>
                <Select
                  value={preferences.labelFormat}
                  onValueChange={(val) =>
                    updatePreferences({ labelFormat: val as LabelFormat })
                  }
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thermal_100x150">100x150mm (감열지)</SelectItem>
                    <SelectItem value="a5">A5 (148x210mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">자동 출력</Label>
                <Switch
                  checked={preferences.autoPrint}
                  onCheckedChange={(checked) =>
                    updatePreferences({ autoPrint: checked })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                PS100 감열 프린터 사용 시 100x150mm을 선택하세요.
                Chrome에서 --kiosk-printing 플래그를 설정하면 인쇄 대화상자 없이 바로 출력됩니다.
              </p>
            </div>
          )}

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
                disabled={autoProcessingRef.current}
                autoFocus
              />
              <Button
                onClick={handleScan}
                disabled={!barcode.trim() || isScanLoading || autoProcessingRef.current}
              >
                {isScanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '조회'}
              </Button>
            </div>
          </div>

          {/* 자동모드 진행 표시 */}
          {autoEnabled && autoStep !== 'idle' && autoStep !== 'error' && (
            <div className="border rounded-lg p-4 bg-blue-50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                {autoStep === 'done' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {autoStep === 'done' ? '처리 완료!' : '자동 처리 중...'}
              </div>
              {/* 프로그레스 바 */}
              <div className="flex gap-1">
                {AUTO_STEPS.map((step, i) => (
                  <div
                    key={step}
                    className={cn(
                      'h-1.5 flex-1 rounded-full transition-colors',
                      getStepIndex(autoStep) >= i ? 'bg-blue-500' : 'bg-blue-200',
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-blue-600">{AUTO_STEP_LABELS[autoStep]}</p>
            </div>
          )}

          {/* 자동모드 에러 */}
          {autoEnabled && autoStep === 'error' && (
            <div className="border rounded-lg p-4 bg-red-50 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-700 font-medium">자동 처리 오류</p>
              </div>
              <p className="text-xs text-red-600">{autoError}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAutoStep('idle');
                  setAutoError(undefined);
                  autoProcessingRef.current = false;
                  handleNextScan();
                }}
              >
                다시 스캔
              </Button>
            </div>
          )}

          {/* 스캐닝 중 (수동모드에서만 표시) */}
          {!autoEnabled && scanState === 'scanning' && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              주문을 조회하고 있습니다...
            </div>
          )}

          {/* 주문을 찾지 못함 (수동모드) */}
          {!autoEnabled && scanState === 'not-found' && (
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
                  {order.shipping?.trackingNumber && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">송장:</span>{' '}
                      <span className="font-mono font-medium">
                        {order.shipping.trackingNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 수동모드: 송장 입력 폼 */}
              {!autoEnabled && (
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
                      disabled={
                        generateLabel.isPending || downloadLabel.isPending || isPrinting
                      }
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      운송장 출력
                    </Button>
                  </div>
                </div>
              )}

              {/* 다음 스캔 (수동모드) */}
              {!autoEnabled && (
                <Button variant="secondary" onClick={handleNextScan} className="w-full">
                  <ScanBarcode className="h-4 w-4 mr-1.5" />
                  다음 바코드 스캔
                </Button>
              )}
            </div>
          )}

          {/* 세션 카운터 (자동모드) */}
          {autoEnabled && processedCount > 0 && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Zap className="h-3 w-3" />
              이번 세션 처리 완료: {processedCount}건
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

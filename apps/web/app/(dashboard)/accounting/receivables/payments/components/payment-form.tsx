'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Building2,
  FileCheck2,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useSalesLedgers, useAddSalesReceipt, useClientDetail } from '@/hooks/use-sales-ledger';
import { toast } from '@/hooks/use-toast';
import type { ClientSalesSummary } from '@/lib/types/sales-ledger';

import {
  paymentFormSchema,
  type PaymentFormValues,
  PAYMENT_METHOD_LABELS,
  BANK_OPTIONS,
} from './payment-form-schema';
import { LedgerAllocationList } from './ledger-allocation-list';
import { PaymentHistoryTimeline } from './payment-history-timeline';

interface PaymentFormProps {
  client: ClientSalesSummary;
  /** 모바일에서 뒤로가기 버튼 표시 */
  onBack?: () => void;
  /** 처리 완료 후 콜백 */
  onComplete?: () => void;
}

const PAYMENT_METHODS = [
  {
    value: 'bank_transfer' as const,
    label: '계좌이체',
    icon: Building2,
  },
  {
    value: 'cash' as const,
    label: '현금',
    icon: Banknote,
  },
  {
    value: 'card' as const,
    label: '카드',
    icon: CreditCard,
  },
  {
    value: 'check' as const,
    label: '수표',
    icon: FileCheck2,
  },
];

export function PaymentForm({ client, onBack, onComplete }: PaymentFormProps) {
  const [selectedLedgerIds, setSelectedLedgerIds] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Data fetching
  const { data: clientDetail, isLoading: isDetailLoading } = useClientDetail(
    client.clientId
  );
  const { data: ledgerData, isLoading: isLedgerLoading } = useSalesLedgers({
    clientId: client.clientId,
    paymentStatus: 'unpaid',
    limit: 100,
  });
  // Also fetch partial ledgers
  const { data: partialLedgerData } = useSalesLedgers({
    clientId: client.clientId,
    paymentStatus: 'partial',
    limit: 100,
  });

  const addReceipt = useAddSalesReceipt();

  // Combine unpaid and partial ledgers
  const allUnpaidLedgers = [
    ...(ledgerData?.data || []),
    ...(partialLedgerData?.data || []),
  ];

  // Form setup
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      paymentMethod: 'bank_transfer',
      bankName: '',
      depositorName: '',
      note: '',
    },
  });

  const watchedMethod = form.watch('paymentMethod');
  const watchedAmount = form.watch('amount');

  // Reset form when client changes
  useEffect(() => {
    form.reset({
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      paymentMethod: 'bank_transfer',
      bankName: '',
      depositorName: '',
      note: '',
    });
    setSelectedLedgerIds([]);
  }, [client.clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quick amount buttons
  const handleQuickAmount = useCallback(
    (type: 'full' | 'half' | 'custom') => {
      if (type === 'full') {
        form.setValue('amount', client.outstanding, { shouldValidate: true });
      } else if (type === 'half') {
        form.setValue('amount', Math.round(client.outstanding / 2), {
          shouldValidate: true,
        });
      } else {
        form.setValue('amount', 0, { shouldValidate: false });
        // Focus the amount input
        const el = document.getElementById('payment-amount');
        el?.focus();
      }
    },
    [client.outstanding, form]
  );

  // Handle form submission -> show confirmation dialog
  const handleSubmitClick = () => {
    form.trigger().then((isValid) => {
      if (isValid) {
        const amount = form.getValues('amount');
        if (amount > client.outstanding) {
          form.setError('amount', {
            message: `미입금 잔액(${client.outstanding.toLocaleString()}원)을 초과할 수 없습니다.`,
          });
          return;
        }
        setIsConfirmOpen(true);
      }
    });
  };

  // Process payment
  const handleConfirmPayment = async () => {
    const values = form.getValues();

    if (selectedLedgerIds.length === 0) {
      toast({
        title: '입금 대상 전표를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // FIFO 순서로 건별 입금 처리
      let remainingAmount = values.amount;

      for (const ledgerId of selectedLedgerIds) {
        if (remainingAmount <= 0) break;

        const ledger = allUnpaidLedgers.find((l) => l.id === ledgerId);
        if (!ledger) continue;

        const outstanding = Number(ledger.outstandingAmount);
        const allocatedAmount = Math.min(remainingAmount, outstanding);

        await addReceipt.mutateAsync({
          salesLedgerId: ledgerId,
          data: {
            receiptDate: values.paymentDate,
            amount: allocatedAmount,
            paymentMethod: values.paymentMethod,
            bankName: values.bankName || undefined,
            depositorName: values.depositorName || undefined,
            note: values.note || undefined,
          },
        });

        remainingAmount -= allocatedAmount;
      }

      toast({ title: '입금 처리가 완료되었습니다.' });
      setIsConfirmOpen(false);
      form.reset({
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        amount: 0,
        paymentMethod: 'bank_transfer',
        bankName: '',
        depositorName: '',
        note: '',
      });
      setSelectedLedgerIds([]);
      onComplete?.();
    } catch (error) {
      toast({
        title: '입금 처리에 실패했습니다.',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      });
    }
  };

  // Calculate post-payment expected balance
  const expectedBalance = client.outstanding - (watchedAmount || 0);

  // Payment history from client detail
  const paymentHistory = clientDetail?.paymentHistory || [];

  return (
    <div className="space-y-4">
      {/* Client Info Header */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-8 w-8 flex-shrink-0"
                aria-label="목록으로 돌아가기"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base truncate">
                  {client.clientName}
                </h3>
                <Badge variant="outline" className="text-[10px] flex-shrink-0">
                  {client.clientCode}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm">
                <span className="text-muted-foreground">
                  미입금{' '}
                  <span className="font-bold text-orange-600">
                    {client.outstanding.toLocaleString()}원
                  </span>
                </span>
                <span className="text-muted-foreground">
                  거래 {client.orderCount}건
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">입금 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 입금일자 */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-date" className="text-sm">
              입금일자
            </Label>
            <Input
              id="payment-date"
              type="date"
              {...form.register('paymentDate')}
              className="h-9"
            />
            {form.formState.errors.paymentDate && (
              <p className="text-xs text-destructive">
                {form.formState.errors.paymentDate.message}
              </p>
            )}
          </div>

          {/* 입금액 */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-amount" className="text-sm">
              입금액
            </Label>
            <div className="relative">
              <Input
                id="payment-amount"
                type="text"
                placeholder="0"
                value={watchedAmount ? watchedAmount.toLocaleString() : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, '');
                  const numValue = value === '' ? 0 : Number(value);
                  if (!isNaN(numValue)) {
                    form.setValue('amount', numValue, { shouldValidate: true });
                  }
                }}
                className="h-9 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                원
              </span>
            </div>
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => handleQuickAmount('full')}
              >
                전액
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => handleQuickAmount('half')}
              >
                50%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => handleQuickAmount('custom')}
              >
                직접입력
              </Button>
            </div>
          </div>

          {/* 입금 방법 */}
          <div className="space-y-1.5">
            <Label className="text-sm">입금 방법</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isActive = watchedMethod === method.value;
                return (
                  <button
                    key={method.value}
                    type="button"
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-slate-200 text-muted-foreground hover:bg-slate-50'
                    }`}
                    onClick={() =>
                      form.setValue('paymentMethod', method.value, {
                        shouldValidate: true,
                      })
                    }
                    aria-pressed={isActive}
                    aria-label={`입금 방법: ${method.label}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 은행명 (계좌이체 선택 시) */}
          {watchedMethod === 'bank_transfer' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="bank-name" className="text-sm">
                  은행명
                </Label>
                <Select
                  value={form.watch('bankName') || ''}
                  onValueChange={(v) =>
                    form.setValue('bankName', v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="h-9" id="bank-name">
                    <SelectValue placeholder="은행 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_OPTIONS.map((bank) => (
                      <SelectItem key={bank.value} value={bank.value}>
                        {bank.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="depositor-name" className="text-sm">
                  입금자명
                </Label>
                <Input
                  id="depositor-name"
                  placeholder="입금자명 입력"
                  {...form.register('depositorName')}
                  className="h-9"
                />
              </div>
            </>
          )}

          {/* 적요/메모 */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-note" className="text-sm">
              적요/메모
            </Label>
            <Textarea
              id="payment-note"
              placeholder="입금 내용을 입력하세요 (선택)"
              {...form.register('note')}
              className="min-h-[60px] resize-none"
              maxLength={200}
            />
            {form.formState.errors.note && (
              <p className="text-xs text-destructive">
                {form.formState.errors.note.message}
              </p>
            )}
          </div>

          <Separator />

          {/* 미수 건별 배분 */}
          <div>
            <Label className="text-sm mb-2 block">미수 건별 내역</Label>
            <LedgerAllocationList
              ledgers={allUnpaidLedgers}
              isLoading={isLedgerLoading}
              selectedIds={selectedLedgerIds}
              onSelectionChange={setSelectedLedgerIds}
              paymentAmount={watchedAmount}
            />
          </div>

          {/* 처리 후 예상 잔액 */}
          {watchedAmount > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">현재 미입금</span>
                <span className="font-medium">
                  {client.outstanding.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">입금액</span>
                <span className="font-medium text-green-600">
                  -{(watchedAmount || 0).toLocaleString()}원
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-sm">
                <span className="font-medium">처리 후 예상 잔액</span>
                <span
                  className={`font-bold ${
                    expectedBalance <= 0 ? 'text-green-600' : 'text-orange-600'
                  }`}
                >
                  {Math.max(0, expectedBalance).toLocaleString()}원
                  {expectedBalance <= 0 && ' (완납)'}
                </span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="button"
            className="w-full h-10"
            disabled={!watchedAmount || watchedAmount <= 0 || addReceipt.isPending}
            onClick={handleSubmitClick}
          >
            {addReceipt.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                처리 중...
              </>
            ) : (
              '입금 처리'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Payment History */}
      <PaymentHistoryTimeline
        entries={paymentHistory}
        isLoading={isDetailLoading}
      />

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>입금 처리 확인</DialogTitle>
            <DialogDescription>
              아래 내용을 확인하고 입금 처리를 진행하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">거래처</span>
                <span className="font-medium">{client.clientName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">입금일자</span>
                <span className="font-medium">
                  {form.getValues('paymentDate')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">입금액</span>
                <span className="font-bold text-lg text-green-600">
                  {(form.getValues('amount') || 0).toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">입금 방법</span>
                <span className="font-medium">
                  {PAYMENT_METHOD_LABELS[form.getValues('paymentMethod')]}
                </span>
              </div>
              {form.getValues('bankName') && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">은행명</span>
                  <span>{form.getValues('bankName')}</span>
                </div>
              )}
              {form.getValues('depositorName') && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">입금자명</span>
                  <span>{form.getValues('depositorName')}</span>
                </div>
              )}
              {form.getValues('note') && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">적요</span>
                  <span className="text-right max-w-[200px] truncate">
                    {form.getValues('note')}
                  </span>
                </div>
              )}
            </div>

            {/* 배분 내역 */}
            <div className="p-3 border rounded-lg">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                배분 내역 ({selectedLedgerIds.length}건)
              </div>
              <div className="space-y-1">
                {selectedLedgerIds.map((id) => {
                  const ledger = allUnpaidLedgers.find((l) => l.id === id);
                  if (!ledger) return null;
                  return (
                    <div
                      key={id}
                      className="flex justify-between text-xs text-muted-foreground"
                    >
                      <span className="font-mono">{ledger.ledgerNumber}</span>
                      <span>
                        {Number(ledger.outstandingAmount).toLocaleString()}원
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 처리 후 예상 */}
            <div className="text-center p-3 bg-primary/5 rounded-lg">
              <span className="text-sm text-muted-foreground">
                처리 후 예상 미입금:{' '}
              </span>
              <span
                className={`font-bold ${
                  expectedBalance <= 0 ? 'text-green-600' : 'text-orange-600'
                }`}
              >
                {Math.max(0, expectedBalance).toLocaleString()}원
              </span>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={addReceipt.isPending}
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={addReceipt.isPending}
            >
              {addReceipt.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                '확인 및 처리'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

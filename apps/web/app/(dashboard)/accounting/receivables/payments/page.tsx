'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, Receipt, Download } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

import {
  useClientSalesSummary,
  useSalesLedgerSummary,
  useDueDateSummary,
} from '@/hooks/use-sales-ledger';
import type { ClientSalesSummary } from '@/lib/types/sales-ledger';

import { ReceivableSummaryCards } from './components/receivable-summary-cards';
import { ClientReceivableList } from './components/client-receivable-list';
import { PaymentForm } from './components/payment-form';

export default function PaymentProcessingPage() {
  const [selectedClient, setSelectedClient] =
    useState<ClientSalesSummary | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Data fetching
  const { data: clientSummary, isLoading: isClientLoading } =
    useClientSalesSummary();
  const { data: summary } = useSalesLedgerSummary();
  const { data: dueDateData } = useDueDateSummary();

  // Handle client selection - responsive behavior
  const handleClientSelect = useCallback((client: ClientSalesSummary) => {
    setSelectedClient(client);
    // On tablet, open sheet (we detect this via media query in the component rendering)
    setIsSheetOpen(true);
  }, []);

  // Handle filter from summary cards
  const handleFilterClick = useCallback((_filter: string) => {
    // Future enhancement: apply filter to the client list
  }, []);

  // Handle mobile back navigation
  const handleMobileBack = useCallback(() => {
    setSelectedClient(null);
  }, []);

  // Handle payment complete
  const handlePaymentComplete = useCallback(() => {
    // Sheet will remain open showing updated data
    // TanStack Query will auto-refresh via invalidation
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href="/accounting/receivables">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="미수금 관리로 돌아가기">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">입금 처리</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              거래처별 미수금 수금 처리
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/accounting/receivables">
            <Button variant="outline" size="sm" className="h-8">
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">미수금 현황</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <ReceivableSummaryCards
        summary={summary}
        dueDateToday={dueDateData?.today}
        dueDateThisWeek={dueDateData?.thisWeek}
        onFilterClick={handleFilterClick}
      />

      {/* ===== Desktop Layout (lg+): Side-by-side ===== */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6">
        {/* Left: Client list */}
        <div className="lg:col-span-5 xl:col-span-5">
          <ClientReceivableList
            data={clientSummary}
            isLoading={isClientLoading}
            selectedClientId={selectedClient?.clientId || null}
            onSelect={setSelectedClient}
          />
        </div>

        {/* Right: Payment form */}
        <div className="lg:col-span-7 xl:col-span-7">
          {selectedClient ? (
            <PaymentForm
              client={selectedClient}
              onComplete={handlePaymentComplete}
            />
          ) : (
            <div className="flex items-center justify-center h-[400px] border-2 border-dashed border-slate-200 rounded-lg">
              <div className="text-center">
                <Receipt className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-muted-foreground text-sm">
                  좌측에서 거래처를 선택하세요
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  거래처를 클릭하면 입금 처리 폼이 표시됩니다
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Tablet Layout (md~lg): Table + Sheet ===== */}
      <div className="hidden md:block lg:hidden">
        <ClientReceivableList
          data={clientSummary}
          isLoading={isClientLoading}
          selectedClientId={selectedClient?.clientId || null}
          onSelect={handleClientSelect}
        />

        <Sheet open={isSheetOpen && !!selectedClient} onOpenChange={setIsSheetOpen}>
          <SheetContent
            side="right"
            className="w-[480px] sm:max-w-lg overflow-y-auto"
          >
            <SheetHeader className="mb-4">
              <SheetTitle>입금 처리</SheetTitle>
              <SheetDescription>
                {selectedClient?.clientName} 미수금 수금
              </SheetDescription>
            </SheetHeader>
            {selectedClient && (
              <PaymentForm
                client={selectedClient}
                onComplete={() => {
                  handlePaymentComplete();
                }}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>

      {/* ===== Mobile Layout (<md): Full-screen switch ===== */}
      <div className="md:hidden">
        {!selectedClient ? (
          <ClientReceivableList
            data={clientSummary}
            isLoading={isClientLoading}
            selectedClientId={null}
            onSelect={setSelectedClient}
          />
        ) : (
          <PaymentForm
            client={selectedClient}
            onBack={handleMobileBack}
            onComplete={handlePaymentComplete}
          />
        )}
      </div>

      {/* Live region for accessibility */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="payment-status" />
    </div>
  );
}

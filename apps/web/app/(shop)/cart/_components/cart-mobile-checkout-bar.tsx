'use client';

import { useState } from 'react';
import { ChevronUp, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface CartMobileCheckoutBarProps {
  selectedCount: number;
  selectedTotal: number;
  totalShippingFee: number;
  onCheckout: () => void;
}

export function CartMobileCheckoutBar({
  selectedCount,
  selectedTotal,
  totalShippingFee,
  onCheckout,
}: CartMobileCheckoutBarProps) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations('cart');
  const grandTotal = selectedTotal + totalShippingFee;

  return (
    <div className="bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] safe-area-inset">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 py-2.5 flex items-center justify-between text-sm">
            <span className="text-gray-500">{t('totalPayment')}</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-primary">
                {grandTotal.toLocaleString()}원
              </span>
              <ChevronUp
                className={cn(
                  'w-4 h-4 text-gray-400 transition-transform duration-200',
                  expanded && 'rotate-180'
                )}
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-2 space-y-2 border-t">
            <div className="flex justify-between text-sm pt-2">
              <span className="text-gray-500">
                {t('selectedAmount')} ({selectedCount})
              </span>
              <span className="font-medium">{selectedTotal.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('shippingFee')}</span>
              <span className={cn('font-medium', totalShippingFee === 0 && 'text-green-600')}>
                {totalShippingFee === 0 ? t('free') : `+${totalShippingFee.toLocaleString()}원`}
              </span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="px-4 pb-3 pt-1">
        <Button
          size="lg"
          className="w-full h-12 text-base font-semibold gradient-primary text-white"
          onClick={onCheckout}
          disabled={selectedCount === 0}
        >
          <ShoppingBag className="h-5 w-5 mr-2" />
          {t('checkout')} ({selectedCount})
        </Button>
      </div>
    </div>
  );
}

'use client';

import { Truck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { FolderShippingSection } from '@/components/album-upload/folder-shipping-section';
import type { FolderShippingInfo } from '@/stores/multi-folder-upload-store';
import type { CompanyShippingInfo, OrdererShippingInfo } from '@/hooks/use-shipping-data';
import type { DeliveryPricing } from '@/hooks/use-delivery-pricing';
import { useTranslations } from 'next-intl';

interface CartGlobalShippingProps {
  companyInfo: CompanyShippingInfo | null;
  clientInfo: OrdererShippingInfo | null;
  pricingMap: Record<string, DeliveryPricing>;
  onGlobalShippingChange: (shipping: FolderShippingInfo) => void;
}

export function CartGlobalShipping({
  companyInfo,
  clientInfo,
  pricingMap,
  onGlobalShippingChange,
}: CartGlobalShippingProps) {
  const t = useTranslations('cart');

  return (
    <Card className="overflow-hidden max-sm:rounded-none max-sm:border-x-0 max-sm:-mx-4">
      <Accordion type="single" collapsible>
        <AccordionItem value="global-shipping" className="border-0">
          <AccordionTrigger className="px-4 py-3 hover:bg-blue-50/50 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Truck className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-blue-700">{t('globalShipping')}</span>
              <span className="text-xs text-gray-500 hidden sm:inline">{t('globalShippingDesc')}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0">
            <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
              <FolderShippingSection
                shippingInfo={undefined}
                companyInfo={companyInfo}
                clientInfo={clientInfo}
                pricingMap={pricingMap}
                onChange={onGlobalShippingChange}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

'use client';

import Link from 'next/link';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export function CartEmptyState() {
  const t = useTranslations('cart');

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingCart className="w-16 h-16 text-primary/30" />
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary/10 rounded-full" />
          <div className="absolute -bottom-1 -left-3 w-4 h-4 bg-primary/5 rounded-full" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          {t('empty')}
        </h1>
        <p className="text-gray-500 mb-8 text-sm sm:text-base leading-relaxed">
          {t('emptyDescription')}
        </p>

        <Link href="/">
          <Button
            size="lg"
            className="gradient-primary text-white px-8 py-3 h-auto text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('continueShopping')}
          </Button>
        </Link>
      </div>
    </div>
  );
}

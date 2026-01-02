'use client';

import { ShopHeader } from '@/components/shop/shop-header';
import { CategoryNav } from '@/components/shop/category-nav';
import { ShopFooter } from '@/components/shop/shop-footer';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <ShopHeader />
      <CategoryNav />
      <main className="flex-1">
        {children}
      </main>
      <ShopFooter />
    </div>
  );
}

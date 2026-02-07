'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Sparkles, Truck, Shield, Clock } from 'lucide-react';
import { useCategoryTree } from '@/hooks/use-categories';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Category } from '@/lib/types/category';
import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedName } from '@/lib/utils';

export default function HomePage() {
  const { data: categories, isLoading } = useCategoryTree();
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const tcat = useTranslations('category');
  const locale = useLocale();

  const topCategories = categories?.filter(c => c.isTopMenu && c.isVisible) || [];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary/90 to-primary text-white">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              {t('heroTitle')}
            </h1>
            <p className="text-lg md:text-xl opacity-90 mb-8 whitespace-pre-line">
              {t('heroDescription')}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/category/all">
                <Button size="lg" variant="secondary" className="font-semibold">
                  {t('viewAllProducts')}
                </Button>
              </Link>
              <Link href="/guide">
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                  {t('usageGuide')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">{t('featureQuality')}</p>
                <p className="text-sm text-gray-500">{t('featureQualityDesc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Truck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold">{t('featureDelivery')}</p>
                <p className="text-sm text-gray-500">{t('featureDeliveryDesc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold">{t('featureGuarantee')}</p>
                <p className="text-sm text-gray-500">{t('featureGuaranteeDesc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold">{t('featureOnline')}</p>
                <p className="text-sm text-gray-500">{t('featureOnlineDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Showcase */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">{t('categoryProducts')}</h2>
          <Link href="/category/all" className="text-primary hover:underline flex items-center gap-1">
            {tc('viewAll')} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {topCategories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </section>

      {/* Sub Categories */}
      {topCategories.map((category) => (
        category.children && category.children.length > 0 && (
          <section key={category.id} className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{getLocalizedName(category, locale)}</h3>
              <Link
                href={`/category/${category.id}`}
                className="text-primary hover:underline flex items-center gap-1 text-sm"
              >
                {tc('more')} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {category.children
                .filter(c => c.isVisible)
                .slice(0, 6)
                .map((child) => (
                  <Link
                    key={child.id}
                    href={`/category/${child.id}`}
                    className="bg-white rounded-lg border p-4 text-center hover:border-primary hover:shadow-md transition-all"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <span className="text-xl">
                        {getCategoryEmoji(child.categoryType)}
                      </span>
                    </div>
                    <p className="font-medium text-sm">{getLocalizedName(child, locale)}</p>
                    {child._count && (
                      <p className="text-xs text-gray-500 mt-1">
                        {tcat('productCount', { count: child._count.products + child._count.halfProducts })}
                      </p>
                    )}
                  </Link>
                ))}
            </div>
          </section>
        )
      ))}

      {/* CTA Section */}
      <section className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {t('ctaTitle')}
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            {t('ctaDescription')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="font-semibold">
                {t('freeRegister')}
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                {tc('login')}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const productCount = category._count
    ? category._count.products + category._count.halfProducts
    : 0;
  const tcat = useTranslations('category');
  const locale = useLocale();

  return (
    <Link href={`/category/${category.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
        <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 relative flex items-center justify-center">
          <span className="text-6xl group-hover:scale-110 transition-transform">
            {getCategoryEmoji(category.categoryType)}
          </span>
          {category.children && category.children.length > 0 && (
            <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {tcat('subcategories', { count: category.children.length })}
            </span>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
            {getLocalizedName(category, locale)}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {productCount > 0 ? tcat('productCount', { count: productCount }) : tcat('preparingProducts')}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function getCategoryEmoji(categoryType: string): string {
  switch (categoryType) {
    case 'POD':
      return '📚';
    case 'EDITOR':
      return '🖼️';
    case 'HALF':
      return '📄';
    case 'HTML':
    default:
      return '📦';
  }
}

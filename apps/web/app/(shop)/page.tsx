'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, Truck, Shield, Clock, Quote } from 'lucide-react';
import { useCategoryTree } from '@/hooks/use-categories';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Category } from '@/lib/types/category';
import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedName } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export default function HomePage() {
  const { data: categories, isLoading } = useCategoryTree();
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const tcat = useTranslations('category');
  const locale = useLocale();
  const { isAuthenticated } = useAuthStore();

  const topCategories = categories?.filter(c => c.isTopMenu && c.isVisible) || [];

  const testimonials = [
    { text: t('testimonial1'), author: t('testimonialAuthor1') },
    { text: t('testimonial2'), author: t('testimonialAuthor2') },
    { text: t('testimonial3'), author: t('testimonialAuthor3') },
  ];

  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-neutral-900 text-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent to-amber-600/40" />

        <div className="relative container mx-auto px-4 py-20 md:py-32 lg:py-40 text-center">
          <p className="text-gold tracking-[0.3em] uppercase text-xs md:text-sm mb-6 font-medium">
            {t('heroSubtitle')}
          </p>
          <h1 className="shop-heading text-4xl md:text-6xl lg:text-7xl font-light mb-6 leading-[1.1] tracking-tight">
            {t('heroTitle')}
          </h1>
          <p className="text-neutral-400 text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed whitespace-pre-line">
            {t('heroDescription')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/category/all">
              <Button
                size="lg"
                className="bg-gold hover:bg-gold text-white px-8 h-12 text-sm tracking-widest uppercase rounded-none font-medium hover:opacity-90 transition-opacity"
              >
                {t('viewAllProducts')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            {!isAuthenticated && (
              <Link href="/register">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-neutral-600 text-neutral-300 hover:bg-white/5 hover:text-white px-8 h-12 text-sm tracking-widest uppercase rounded-none font-medium"
                >
                  {t('getStarted')}
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-amber-600/40 to-transparent" />
      </section>

      {/* Features Strip */}
      <section className="border-b border-neutral-200">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4">
            <div className="flex items-center justify-center gap-3 py-6 md:py-8 border-r border-neutral-200 last:border-r-0">
              <Sparkles className="h-5 w-5 text-gold flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-neutral-900">{t('featureQuality')}</p>
                <p className="text-xs text-neutral-500">{t('featureQualityDesc')}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 py-6 md:py-8 border-r border-neutral-200 md:border-r last:border-r-0">
              <Truck className="h-5 w-5 text-gold flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-neutral-900">{t('featureDelivery')}</p>
                <p className="text-xs text-neutral-500">{t('featureDeliveryDesc')}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 py-6 md:py-8 border-r border-neutral-200 last:border-r-0">
              <Shield className="h-5 w-5 text-gold flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-neutral-900">{t('featureGuarantee')}</p>
                <p className="text-xs text-neutral-500">{t('featureGuaranteeDesc')}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 py-6 md:py-8">
              <Clock className="h-5 w-5 text-gold flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-neutral-900">{t('featureOnline')}</p>
                <p className="text-xs text-neutral-500">{t('featureOnlineDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Categories */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <p className="text-gold tracking-[0.2em] uppercase text-xs mb-3 font-medium">
              {t('ourProducts')}
            </p>
            <h2 className="shop-heading text-3xl md:text-4xl font-light text-neutral-900">
              {t('categoryProducts')}
            </h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-1.5">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-1.5">
              {topCategories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Link href="/category/all">
              <Button
                variant="outline"
                className="rounded-none border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white px-10 h-11 text-sm tracking-widest uppercase transition-all"
              >
                {tc('viewAll')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Subcategories - compact sections */}
      {topCategories.map((category) => (
        category.children && category.children.filter(c => c.isVisible).length > 0 && (
          <section key={category.id} className="border-t border-neutral-100">
            <div className="container mx-auto px-4 py-12">
              <div className="flex items-center justify-between mb-8">
                <h3 className="shop-heading text-xl md:text-2xl font-light text-neutral-900">
                  {getLocalizedName(category, locale)}
                </h3>
                <Link
                  href={`/category/${category.id}`}
                  className="text-gold hover:underline flex items-center gap-1 text-sm tracking-wide"
                >
                  {tc('more')} <ArrowRight className="h-3 w-3" />
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
                      className="group border border-neutral-200 p-5 text-center hover:border-gold transition-all duration-300"
                    >
                      <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center">
                        <span className="text-2xl group-hover:scale-110 transition-transform">
                          {getCategoryEmoji(child.categoryType)}
                        </span>
                      </div>
                      <p className="font-medium text-sm text-neutral-900 group-hover:text-gold transition-colors">
                        {getLocalizedName(child, locale)}
                      </p>
                      {child._count && (
                        <p className="text-xs text-neutral-400 mt-1">
                          {tcat('productCount', { count: child._count.products + child._count.halfProducts })}
                        </p>
                      )}
                    </Link>
                  ))}
              </div>
            </div>
          </section>
        )
      ))}

      {/* Testimonials */}
      <section className="bg-neutral-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Quote className="h-8 w-8 text-gold mx-auto mb-8 opacity-60" />
            <div className="relative min-h-[120px] flex items-center justify-center">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-700 ${
                    index === activeTestimonial ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <p className="shop-heading text-lg md:text-2xl font-light text-neutral-700 italic leading-relaxed mb-6">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  <p className="text-sm text-gold tracking-widest uppercase font-medium">
                    {testimonial.author}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveTestimonial(index)}
                  aria-label={`Testimonial ${index + 1}`}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === activeTestimonial ? 'bg-gold w-6' : 'bg-neutral-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="bg-neutral-900 text-white">
          <div className="container mx-auto px-4 py-16 md:py-24 text-center">
            <p className="text-gold tracking-[0.2em] uppercase text-xs mb-4 font-medium">
              {t('ctaSubtitle')}
            </p>
            <h2 className="shop-heading text-2xl md:text-4xl font-light mb-4">
              {t('ctaTitle')}
            </h2>
            <p className="text-neutral-400 mb-10 max-w-lg mx-auto text-sm leading-relaxed">
              {t('ctaDescription')}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-gold hover:bg-gold hover:opacity-90 text-white px-10 h-12 text-sm tracking-widest uppercase rounded-none font-medium transition-opacity"
                >
                  {t('freeRegister')}
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-neutral-600 text-neutral-300 hover:bg-white/5 hover:text-white px-10 h-12 text-sm tracking-widest uppercase rounded-none font-medium"
                >
                  {tc('login')}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const productCount = category._count
    ? category._count.products + category._count.halfProducts
    : 0;
  const tcat = useTranslations('category');
  const locale = useLocale();

  const gradients: Record<string, string> = {
    POD: 'from-stone-800 to-stone-900',
    EDITOR: 'from-zinc-700 to-zinc-900',
    HALF: 'from-neutral-700 to-neutral-900',
    HTML: 'from-slate-700 to-slate-900',
  };

  const gradient = gradients[category.categoryType] || 'from-neutral-700 to-neutral-900';

  return (
    <Link href={`/category/${category.id}`} className="group relative">
      <div className={`aspect-[4/3] bg-gradient-to-br ${gradient} relative overflow-hidden`}>
        {/* Subtle overlay pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Center emoji/icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl md:text-6xl opacity-30 group-hover:opacity-50 group-hover:scale-110 transition-all duration-500">
            {getCategoryEmoji(category.categoryType)}
          </span>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500" />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
          <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <h3 className="text-white font-medium text-base md:text-lg mb-1">
              {getLocalizedName(category, locale)}
            </h3>
            <p className="text-white/60 text-xs md:text-sm">
              {productCount > 0
                ? tcat('productCount', { count: productCount })
                : tcat('preparingProducts')}
            </p>
          </div>
        </div>

        {/* Subcategory badge */}
        {category.children && category.children.length > 0 && (
          <span className="absolute top-3 right-3 text-gold text-[10px] tracking-wider uppercase font-medium">
            {tcat('subcategories', { count: category.children.length })}
          </span>
        )}
      </div>
    </Link>
  );
}

function getCategoryEmoji(categoryType: string): string {
  switch (categoryType) {
    case 'POD':
      return '\uD83D\uDCDA';
    case 'EDITOR':
      return '\uD83D\uDDBC\uFE0F';
    case 'HALF':
      return '\uD83D\uDCC4';
    case 'HTML':
    default:
      return '\uD83D\uDCE6';
  }
}

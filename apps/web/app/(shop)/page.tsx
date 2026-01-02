'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Sparkles, Truck, Shield, Clock } from 'lucide-react';
import { useCategoryTree } from '@/hooks/use-categories';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Category } from '@/lib/types/category';

export default function HomePage() {
  const { data: categories, isLoading } = useCategoryTree();

  const topCategories = categories?.filter(c => c.isTopMenu && c.isVisible) || [];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary/90 to-primary text-white">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              고품질 인쇄 서비스
            </h1>
            <p className="text-lg md:text-xl opacity-90 mb-8">
              포토북, 앨범, 출력물 전문 인쇄업체<br />
              최상의 품질과 빠른 배송으로 고객님께 감동을 드립니다.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/category/all">
                <Button size="lg" variant="secondary" className="font-semibold">
                  전체 상품 보기
                </Button>
              </Link>
              <Link href="/guide">
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                  이용 안내
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
                <p className="font-semibold">최상의 품질</p>
                <p className="text-sm text-gray-500">프리미엄 인쇄</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Truck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold">빠른 배송</p>
                <p className="text-sm text-gray-500">전국 당일발송</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold">품질 보증</p>
                <p className="text-sm text-gray-500">100% 만족보장</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold">24시간 접수</p>
                <p className="text-sm text-gray-500">온라인 주문</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Showcase */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">카테고리별 상품</h2>
          <Link href="/category/all" className="text-primary hover:underline flex items-center gap-1">
            전체보기 <ChevronRight className="h-4 w-4" />
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
              <h3 className="text-xl font-bold">{category.name}</h3>
              <Link
                href={`/category/${category.id}`}
                className="text-primary hover:underline flex items-center gap-1 text-sm"
              >
                더보기 <ChevronRight className="h-4 w-4" />
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
                    <p className="font-medium text-sm">{child.name}</p>
                    {child._count && (
                      <p className="text-xs text-gray-500 mt-1">
                        {child._count.products + child._count.halfProducts}개 상품
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
            지금 바로 시작하세요
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            회원가입 후 다양한 혜택과 할인을 받으실 수 있습니다.
            지금 가입하시면 첫 주문 10% 할인!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="font-semibold">
                무료 회원가입
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                로그인
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

  return (
    <Link href={`/category/${category.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
        <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 relative flex items-center justify-center">
          <span className="text-6xl group-hover:scale-110 transition-transform">
            {getCategoryEmoji(category.categoryType)}
          </span>
          {category.children && category.children.length > 0 && (
            <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {category.children.length}개 하위 카테고리
            </span>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
            {category.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {productCount > 0 ? `${productCount}개 상품` : '상품 준비중'}
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

'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Grid3X3, List, ShoppingCart } from 'lucide-react';
import { useState, Suspense } from 'react';
import { useCategory } from '@/hooks/use-categories';
import { useCategoryProducts } from '@/hooks/use-products';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCartStore } from '@/stores/cart-store';
import { cn, getLocalizedName } from '@/lib/utils';
import { API_URL, API_BASE_URL } from '@/lib/api';

const normalizeImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.replace(/\/api\/v1\/api\/v1\//g, '/api/v1/');
  }
  if (url.startsWith('/api/v1/')) {
    return `${API_BASE_URL}${url}`;
  }
  if (url.startsWith('/upload')) {
    return `${API_URL}${url}`;
  }
  if (url.startsWith('/api/')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
};
import type { Product } from '@/lib/types';
import { useLocale } from 'next-intl';

export default function CategoryPage() {
  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryPageContent />
    </Suspense>
  );
}

function CategoryPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryId = params.id as string;
  const isAllProducts = categoryId === 'all';

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const page = parseInt(searchParams.get('page') || '1');
  const sortBy = searchParams.get('sort') || 'sortOrder';
  const locale = useLocale();

  const { data: category, isLoading: categoryLoading } = useCategory(isAllProducts ? '' : categoryId);
  const { data: productsData, isLoading: productsLoading } = useCategoryProducts(isAllProducts ? '' : categoryId, {
    page,
    limit: 20,
  });

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    router.push(`/category/${categoryId}?${params.toString()}`);
  };

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', value);
    params.set('page', '1');
    router.push(`/category/${categoryId}?${params.toString()}`);
  };

  if (!isAllProducts && !categoryLoading && !category) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="shop-heading text-2xl font-light mb-4 text-neutral-900">카테고리를 찾을 수 없습니다</h1>
        <p className="text-neutral-500 mb-8 text-sm">요청하신 카테고리가 존재하지 않거나 삭제되었습니다.</p>
        <Link href="/">
          <Button className="rounded-none bg-neutral-900 hover:bg-neutral-800 text-white px-8 h-11 text-sm tracking-widest uppercase">
            홈으로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  const products = productsData?.data || [];
  const meta = productsData?.meta;
  const hasChildren = category?.children && category.children.length > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="border-b border-neutral-200">
        <div className="container mx-auto px-4 py-3">
          {categoryLoading && !isAllProducts ? (
            <Skeleton className="h-4 w-48" />
          ) : (
            <nav className="flex items-center gap-2 text-xs tracking-wide text-neutral-400">
              <Link href="/" className="hover:text-gold transition-colors">홈</Link>
              <ChevronRight className="h-3 w-3" />
              {!isAllProducts && category?.parent && (
                <>
                  <Link href={`/category/${category.parent.id}`} className="hover:text-gold transition-colors">
                    {getLocalizedName(category.parent, locale)}
                  </Link>
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
              <span className="text-neutral-900 font-medium">
                {isAllProducts ? '전체 상품' : getLocalizedName(category, locale)}
              </span>
            </nav>
          )}
        </div>
      </div>

      {/* Category Header */}
      <section className="relative bg-neutral-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
        <div className="relative container mx-auto px-4 py-12 md:py-16 text-center">
          {categoryLoading && !isAllProducts ? (
            <>
              <Skeleton className="h-4 w-32 mx-auto mb-4 bg-white/10" />
              <Skeleton className="h-10 w-64 mx-auto mb-2 bg-white/10" />
              <Skeleton className="h-4 w-96 mx-auto bg-white/10" />
            </>
          ) : (
            <>
              <p className="text-gold tracking-[0.3em] uppercase text-xs mb-4 font-medium">
                {isAllProducts ? 'ALL PRODUCTS' : (category?.categoryType || 'COLLECTION')}
              </p>
              <h1 className="shop-heading text-3xl md:text-4xl lg:text-5xl font-light mb-3 leading-tight tracking-tight">
                {isAllProducts ? '전체 상품' : getLocalizedName(category, locale)}
              </h1>
              {isAllProducts ? (
                <p className="text-neutral-400 text-sm md:text-base max-w-xl mx-auto">
                  모든 상품을 한눈에 확인하세요
                </p>
              ) : category?.htmlContent && (
                <div
                  className="text-neutral-400 text-sm md:text-base max-w-xl mx-auto"
                  dangerouslySetInnerHTML={{ __html: category.htmlContent }}
                />
              )}
            </>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
      </section>

      {/* Sub Categories */}
      {!isAllProducts && !categoryLoading && hasChildren && (
        <div className="border-b border-neutral-200">
          <div className="container mx-auto px-4 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/category/${category!.id}`}
                className="px-5 py-2 bg-neutral-900 text-white text-xs tracking-widest uppercase font-medium transition-all"
              >
                전체
              </Link>
              {category!.children!
                .filter(c => c.isVisible)
                .map((child) => (
                  <Link
                    key={child.id}
                    href={`/category/${child.id}`}
                    className="px-5 py-2 border border-neutral-300 text-neutral-600 text-xs tracking-wide font-medium hover:border-gold hover:text-gold transition-all"
                  >
                    {getLocalizedName(child, locale)}
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Products Section */}
      <div className="container mx-auto px-4 py-10 md:py-14">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-100">
          <p className="text-neutral-500 text-sm">
            총 <span className="font-medium text-gold">{meta?.total || 0}</span>개 상품
          </p>
          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[140px] rounded-none border-neutral-300 text-xs tracking-wide h-9">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sortOrder">추천순</SelectItem>
                <SelectItem value="createdAt">최신순</SelectItem>
                <SelectItem value="priceAsc">가격낮은순</SelectItem>
                <SelectItem value="priceDesc">가격높은순</SelectItem>
                <SelectItem value="name">이름순</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center border border-neutral-300">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === 'grid' ? "bg-neutral-900 text-white" : "text-neutral-400 hover:text-neutral-600"
                )}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === 'list' ? "bg-neutral-900 text-white" : "text-neutral-400 hover:text-neutral-600"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Products */}
        {productsLoading ? (
          <ProductGridSkeleton />
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 mx-auto mb-6 border border-neutral-200 flex items-center justify-center">
              <span className="text-3xl opacity-40">📦</span>
            </div>
            <h3 className="shop-heading text-xl font-light text-neutral-900 mb-2">등록된 상품이 없습니다</h3>
            <p className="text-neutral-400 text-sm">이 카테고리에는 아직 상품이 등록되지 않았습니다.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1 md:gap-1.5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <ProductListItem key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex justify-center gap-1 mt-12">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="rounded-none border-neutral-300 text-xs tracking-wide h-9 px-4"
            >
              이전
            </Button>
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(page - 2, meta.totalPages - 4)) + i;
              if (pageNum > meta.totalPages) return null;
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  onClick={() => handlePageChange(pageNum)}
                  className={cn(
                    "rounded-none h-9 w-9 p-0 text-xs",
                    pageNum === page
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "border-neutral-300 text-neutral-600 hover:border-gold hover:text-gold"
                  )}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              disabled={page >= meta.totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="rounded-none border-neutral-300 text-xs tracking-wide h-9 px-4"
            >
              다음
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCartStore();
  const [imageError, setImageError] = useState(false);
  const locale = useLocale();

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      productType: 'product',
      name: product.productName,
      thumbnailUrl: product.thumbnailUrl,
      basePrice: product.basePrice,
      quantity: 1,
      options: [],
      totalPrice: product.basePrice,
    });
  };

  return (
    <Link href={`/product/${product.id}`} className="group">
      <div className="bg-white overflow-hidden">
        {/* Image */}
        <div className="aspect-square bg-neutral-100 relative overflow-hidden">
          {product.thumbnailUrl && !imageError ? (
            <img
              src={normalizeImageUrl(product.thumbnailUrl)}
              alt={product.productName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isNew && (
              <span className="bg-gold text-white text-[10px] tracking-wider uppercase font-medium px-2 py-0.5">
                NEW
              </span>
            )}
            {product.isBest && (
              <span className="bg-neutral-900 text-white text-[10px] tracking-wider uppercase font-medium px-2 py-0.5">
                BEST
              </span>
            )}
          </div>
          {/* Quick Add Button */}
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-3 right-3 bg-white/90 hover:bg-white p-2.5 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <ShoppingCart className="h-4 w-4 text-neutral-700" />
          </button>
        </div>
        {/* Content */}
        <div className="p-3 md:p-4">
          <p className="text-[10px] tracking-wider uppercase text-gold mb-1 font-medium">
            {getLocalizedName(product.category, locale)}
          </p>
          <h3 className="font-medium text-sm text-neutral-900 line-clamp-2 mb-1.5 group-hover:text-gold transition-colors">
            {product.productName}
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-neutral-400 mb-2">
            <span>조회 {(product.viewCount || 0).toLocaleString()}</span>
            <span>·</span>
            <span>주문 {(product.orderCount || 0).toLocaleString()}</span>
          </div>
          <p className="font-medium text-sm text-neutral-900">
            {product.basePrice.toLocaleString()}원
          </p>
        </div>
      </div>
    </Link>
  );
}

function ProductListItem({ product }: { product: Product }) {
  const { addItem } = useCartStore();
  const [imageError, setImageError] = useState(false);
  const locale = useLocale();

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      productType: 'product',
      name: product.productName,
      thumbnailUrl: product.thumbnailUrl,
      basePrice: product.basePrice,
      quantity: 1,
      options: [],
      totalPrice: product.basePrice,
    });
  };

  return (
    <Link href={`/product/${product.id}`} className="group">
      <div className="flex border-b border-neutral-100 pb-3 hover:bg-neutral-50/50 transition-colors">
        <div className="w-28 h-28 md:w-36 md:h-36 bg-neutral-100 flex-shrink-0 relative overflow-hidden">
          {product.thumbnailUrl && !imageError ? (
            <img
              src={normalizeImageUrl(product.thumbnailUrl)}
              alt={product.productName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {(product.isNew || product.isBest) && (
            <div className="absolute top-2 left-2 flex gap-1">
              {product.isNew && (
                <span className="bg-gold text-white text-[10px] tracking-wider uppercase font-medium px-2 py-0.5">
                  NEW
                </span>
              )}
              {product.isBest && (
                <span className="bg-neutral-900 text-white text-[10px] tracking-wider uppercase font-medium px-2 py-0.5">
                  BEST
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex-1 px-4 md:px-6 py-2 flex flex-col justify-between">
          <div>
            <p className="text-[10px] tracking-wider uppercase text-gold mb-1 font-medium">
              {getLocalizedName(product.category, locale)}
            </p>
            <h3 className="font-medium text-sm md:text-base text-neutral-900 mb-1 group-hover:text-gold transition-colors">
              {product.productName}
            </h3>
            {product.description && (
              <p className="text-xs text-neutral-400 line-clamp-2">{product.description}</p>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="font-medium text-neutral-900">
              {product.basePrice.toLocaleString()}원
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleQuickAdd}
              className="rounded-none border-neutral-300 text-xs tracking-wide h-8 hover:border-gold hover:text-gold"
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
              담기
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CategoryPageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-neutral-200">
        <div className="container mx-auto px-4 py-3">
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="bg-neutral-900">
        <div className="container mx-auto px-4 py-12 md:py-16 text-center">
          <Skeleton className="h-4 w-32 mx-auto mb-4 bg-white/10" />
          <Skeleton className="h-10 w-64 mx-auto mb-2 bg-white/10" />
          <Skeleton className="h-4 w-96 mx-auto bg-white/10" />
        </div>
      </div>
      <div className="container mx-auto px-4 py-10">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1 md:gap-1.5">
      {[...Array(10)].map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-square w-full" />
          <div className="p-3">
            <Skeleton className="h-2.5 w-16 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Grid3X3, List, SlidersHorizontal, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useCategory } from '@/hooks/use-categories';
import { useCategoryProducts } from '@/hooks/use-products';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCartStore } from '@/stores/cart-store';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

export default function CategoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryId = params.id as string;

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const page = parseInt(searchParams.get('page') || '1');
  const sortBy = searchParams.get('sort') || 'sortOrder';

  const { data: category, isLoading: categoryLoading } = useCategory(categoryId);
  const { data: productsData, isLoading: productsLoading } = useCategoryProducts(categoryId, {
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

  // 카테고리 정보가 없으면 에러 표시 (로딩은 스켈레톤으로 표시)
  if (!categoryLoading && !category) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">카테고리를 찾을 수 없습니다</h1>
        <p className="text-gray-500 mb-8">요청하신 카테고리가 존재하지 않거나 삭제되었습니다.</p>
        <Link href="/">
          <Button>홈으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  const products = productsData?.data || [];
  const meta = productsData?.meta;
  const hasChildren = category?.children && category.children.length > 0;

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          {categoryLoading ? (
            <Skeleton className="h-4 w-48" />
          ) : (
            <nav className="flex items-center gap-2 text-sm text-gray-500">
              <Link href="/" className="hover:text-primary">홈</Link>
              <ChevronRight className="h-4 w-4" />
              {category?.parent && (
                <>
                  <Link href={`/category/${category.parent.id}`} className="hover:text-primary">
                    {category.parent.name}
                  </Link>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
              <span className="text-gray-900 font-medium">{category?.name}</span>
            </nav>
          )}
        </div>
      </div>

      {/* Category Header */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-50">
        <div className="container mx-auto px-4 py-8">
          {categoryLoading ? (
            <>
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-2">{category?.name}</h1>
              {category?.htmlContent && (
                <div
                  className="text-gray-600 max-w-2xl"
                  dangerouslySetInnerHTML={{ __html: category.htmlContent }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Sub Categories */}
      {!categoryLoading && hasChildren && (
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/category/${category!.id}`}
                className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium"
              >
                전체
              </Link>
              {category!.children!
                .filter(c => c.isVisible)
                .map((child) => (
                  <Link
                    key={child.id}
                    href={`/category/${child.id}`}
                    className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium transition-colors"
                  >
                    {child.name}
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Products Section */}
      <div className="container mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            총 <span className="font-semibold text-primary">{meta?.total || 0}</span>개 상품
          </p>
          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[140px]">
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
            <div className="flex items-center border rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === 'grid' ? "bg-gray-100" : "hover:bg-gray-50"
                )}
              >
                <Grid3X3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === 'list' ? "bg-gray-100" : "hover:bg-gray-50"
                )}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Products */}
        {productsLoading ? (
          <ProductGridSkeleton />
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2">등록된 상품이 없습니다</h3>
            <p className="text-gray-500">이 카테고리에는 아직 상품이 등록되지 않았습니다.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <ProductListItem key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
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
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              disabled={page >= meta.totalPages}
              onClick={() => handlePageChange(page + 1)}
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
    <Link href={`/product/${product.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow group h-full">
        <div className="aspect-square bg-gray-100 relative">
          {product.thumbnailUrl && !imageError ? (
            <img
              src={product.thumbnailUrl}
              alt={product.productName}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isNew && (
              <Badge className="bg-green-500">NEW</Badge>
            )}
            {product.isBest && (
              <Badge className="bg-red-500">BEST</Badge>
            )}
          </div>
          {/* Quick Add Button */}
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-2 right-2 bg-white/90 hover:bg-white p-2 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
        </div>
        <CardContent className="p-3">
          <p className="text-xs text-gray-500 mb-1">{product.category?.name}</p>
          <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.productName}
          </h3>
          <p className="font-bold text-primary">
            {product.basePrice.toLocaleString()}원
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function ProductListItem({ product }: { product: Product }) {
  const { addItem } = useCartStore();
  const [imageError, setImageError] = useState(false);

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
    <Link href={`/product/${product.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="flex">
          <div className="w-32 h-32 bg-gray-100 flex-shrink-0 relative">
            {product.thumbnailUrl && !imageError ? (
              <img
                src={product.thumbnailUrl}
                alt={product.productName}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            {(product.isNew || product.isBest) && (
              <div className="absolute top-1 left-1 flex gap-1">
                {product.isNew && (
                  <Badge className="bg-green-500 text-xs">NEW</Badge>
                )}
                {product.isBest && (
                  <Badge className="bg-red-500 text-xs">BEST</Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">{product.category?.name}</p>
              <h3 className="font-medium mb-2 hover:text-primary transition-colors">
                {product.productName}
              </h3>
              {product.description && (
                <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="font-bold text-lg text-primary">
                {product.basePrice.toLocaleString()}원
              </p>
              <Button size="sm" variant="outline" onClick={handleQuickAdd}>
                <ShoppingCart className="h-4 w-4 mr-1" />
                담기
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function CategoryPageSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {[...Array(10)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-square w-full" />
          <CardContent className="p-3">
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-5 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

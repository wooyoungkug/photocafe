'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ShoppingCart } from 'lucide-react';
import { useProducts } from '@/hooks/use-products';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/stores/cart-store';
import type { Product } from '@/lib/types';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const { data: productsData, isLoading } = useProducts({
    search: query,
    isActive: true,
    limit: 50,
  });

  const products = productsData?.data || [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Search className="h-6 w-6 text-gray-400" />
            <h1 className="text-2xl font-bold">
              "{query}" 검색 결과
            </h1>
          </div>
          <p className="text-gray-500 mt-2">
            {isLoading ? '검색 중...' : `${products.length}개의 상품을 찾았습니다`}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
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
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">검색 결과가 없습니다</h3>
            <p className="text-gray-500 mb-8">
              다른 검색어로 다시 시도해보세요.
            </p>
            <Link href="/">
              <Button>홈으로 돌아가기</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCartStore();

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
          {product.thumbnailUrl ? (
            <img
              src={product.thumbnailUrl}
              alt={product.productName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">
              📦
            </div>
          )}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isNew && (
              <Badge className="bg-green-500">NEW</Badge>
            )}
            {product.isBest && (
              <Badge className="bg-red-500">BEST</Badge>
            )}
          </div>
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

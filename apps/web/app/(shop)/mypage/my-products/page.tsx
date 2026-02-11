'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, Trash2, ExternalLink, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth-store';
import { useMyProductsByClient, useDeleteMyProduct, type MyProduct } from '@/hooks/use-my-products';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL, API_URL } from '@/lib/api';

const normalizeImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/api/v1/')) return `${API_BASE_URL}${url}`;
  if (url.startsWith('/upload')) return `${API_URL}${url}`;
  if (url.startsWith('/api/')) return `${API_BASE_URL}${url}`;
  return url;
};

export default function MyProductsPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { data: myProducts, isLoading } = useMyProductsByClient(user?.id);
  const deleteMyProduct = useDeleteMyProduct();

  const [deleteTarget, setDeleteTarget] = useState<MyProduct | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMyProduct.mutateAsync(deleteTarget.id);
      toast({ title: '마이상품이 삭제되었습니다.' });
      setDeleteTarget(null);
    } catch {
      toast({ title: '삭제에 실패했습니다.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">마이상품</h1>
        <span className="text-sm text-muted-foreground">
          ({myProducts?.length || 0}개)
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        자주 주문하는 상품을 마이상품으로 저장하면 빠르게 주문할 수 있습니다.
      </p>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : !myProducts || myProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-2">저장된 마이상품이 없습니다.</p>
            <p className="text-sm text-gray-400 mb-4">상품 상세 페이지에서 마이상품 저장 버튼을 눌러주세요.</p>
            <Link href="/">
              <Button variant="outline" size="sm">상품 둘러보기</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myProducts.map((mp) => {
            const imgUrl = normalizeImageUrl(mp.thumbnailUrl || mp.product?.thumbnailUrl);
            return (
              <Card key={mp.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex gap-3 p-4">
                  {/* 썸네일 */}
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt={mp.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{mp.name}</h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {mp.product?.productName}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {mp.options.specificationName && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">{mp.options.specificationName}</Badge>
                      )}
                      {mp.options.bindingName && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">{mp.options.bindingName}</Badge>
                      )}
                      {mp.options.paperName && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">{mp.options.paperName}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Link href={`/product/${mp.productId}`}>
                        <Button variant="outline" size="sm" className="h-6 text-[10px] px-2">
                          <ExternalLink className="h-3 w-3 mr-0.5" />
                          주문하기
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2 text-red-500 hover:text-red-700"
                        onClick={() => setDeleteTarget(mp)}
                      >
                        <Trash2 className="h-3 w-3 mr-0.5" />
                        삭제
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 삭제 확인 Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>마이상품 삭제</DialogTitle>
            <DialogDescription>
              &quot;{deleteTarget?.name}&quot;을(를) 마이상품에서 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMyProduct.isPending}>
              {deleteMyProduct.isPending ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

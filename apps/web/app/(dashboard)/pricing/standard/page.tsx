'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts } from '@/hooks/use-pricing';
import { useCategories } from '@/hooks/use-categories';
import { Search, AlertCircle, DollarSign } from 'lucide-react';

export default function StandardPricingPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data: productsData, isLoading, error } = useProducts({
    page,
    limit: 20,
    search: search || undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
  });

  const { data: categoriesData } = useCategories();

  // 대분류만 필터링
  const largeCategories = categoriesData?.filter(c => c.depth === 0) || [];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="표준단가 관리"
        description="상품의 기본 판매 가격을 관리합니다. 모든 거래처에 적용되는 기준 가격입니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '가격관리', href: '/pricing' },
          { label: '표준단가' },
        ]}
      />

      {/* 가격 우선순위 안내 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">가격 적용 우선순위</p>
              <p className="text-blue-700 mt-1">
                거래처 개별단가 → 그룹단가 → 그룹 할인율 → <strong>표준단가</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>상품별 표준단가</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 필터 영역 */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="상품명, 상품코드 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 카테고리</SelectItem>
                {largeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 테이블 */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              데이터를 불러오는데 실패했습니다.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>상품코드</TableHead>
                    <TableHead>상품명</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead className="text-right">표준단가</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        등록된 상품이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    productsData?.data?.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono">{product.productCode}</TableCell>
                        <TableCell className="font-medium">{product.productName}</TableCell>
                        <TableCell>
                          {product.categoryLarge?.name || '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPrice(product.basePrice)}
                        </TableCell>
                        <TableCell>
                          {product.status === 'active' ? (
                            <Badge variant="default">판매중</Badge>
                          ) : (
                            <Badge variant="secondary">판매중지</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* 페이지네이션 */}
              {productsData?.meta && productsData.meta.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    이전
                  </Button>
                  <span className="flex items-center px-4 text-sm">
                    {page} / {productsData.meta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === productsData.meta.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    다음
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

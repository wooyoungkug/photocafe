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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientGroups } from '@/hooks/use-clients';
import {
  useGroupProductPrices,
  useProducts,
  useSetGroupProductPrice,
  useDeleteGroupProductPrice,
} from '@/hooks/use-pricing';
import {
  Plus,
  Search,
  Trash2,
  AlertCircle,
  Loader2,
  DollarSign,
  Users,
} from 'lucide-react';

export default function GroupPricingPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ groupId: string; productId: string; productName: string } | null>(null);

  const { data: groupsData, isLoading: groupsLoading } = useClientGroups({ limit: 100 });
  const { data: groupPrices, isLoading: pricesLoading } = useGroupProductPrices(selectedGroupId);
  const { data: productsData } = useProducts({ limit: 100 });

  const setGroupPrice = useSetGroupProductPrice();
  const deleteGroupPrice = useDeleteGroupProductPrice();

  const selectedGroup = groupsData?.data?.find(g => g.id === selectedGroupId);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price);
  };

  const handleAddPrice = async () => {
    if (!selectedGroupId || !selectedProductId || !price) return;

    await setGroupPrice.mutateAsync({
      groupId: selectedGroupId,
      productId: selectedProductId,
      price: parseFloat(price),
    });

    setIsDialogOpen(false);
    setSelectedProductId('');
    setPrice('');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    await deleteGroupPrice.mutateAsync({
      groupId: deleteConfirm.groupId,
      productId: deleteConfirm.productId,
    });

    setDeleteConfirm(null);
  };

  // 이미 가격이 설정된 상품 ID 목록
  const existingProductIds = new Set(groupPrices?.map(p => p.productId) || []);

  // 가격 설정 가능한 상품 목록 (이미 설정된 상품 제외)
  const availableProducts = productsData?.data?.filter(
    p => !existingProductIds.has(p.id)
  ) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="그룹단가 관리"
        description="거래처 그룹별 특별 가격을 설정합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '가격관리', href: '/pricing' },
          { label: '그룹단가' },
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
                거래처 개별단가 → <strong>그룹단가</strong> → 그룹 할인율 → 표준단가
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 그룹 선택 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            거래처 그룹 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groupsLoading ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="그룹을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {groupsData?.data?.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.groupName}
                    {group.discountRate > 0 && (
                      <span className="text-muted-foreground ml-2">
                        (기본 {100 - group.discountRate}% 할인)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedGroup && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">그룹코드:</span>
                  <span className="ml-2 font-medium">{selectedGroup.groupCode}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">기본 할인율:</span>
                  <span className="ml-2 font-medium">
                    {selectedGroup.discountRate > 0
                      ? `${100 - selectedGroup.discountRate}%`
                      : '없음'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">소속 거래처:</span>
                  <span className="ml-2 font-medium">
                    {selectedGroup._count?.clients || 0}개
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 그룹 가격 목록 */}
      {selectedGroupId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>그룹 특별단가 목록</CardTitle>
            <Button onClick={() => setIsDialogOpen(true)} disabled={availableProducts.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              가격 추가
            </Button>
          </CardHeader>
          <CardContent>
            {/* 검색 */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="상품명 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {pricesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>상품코드</TableHead>
                    <TableHead>상품명</TableHead>
                    <TableHead className="text-right">표준단가</TableHead>
                    <TableHead className="text-right">그룹단가</TableHead>
                    <TableHead className="text-right">할인율</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupPrices?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        설정된 그룹단가가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupPrices
                      ?.filter(gp =>
                        !search ||
                        gp.product?.productName?.toLowerCase().includes(search.toLowerCase())
                      )
                      .map((gp) => {
                        const standardPrice = gp.product?.basePrice || 0;
                        const discountPercent = standardPrice > 0
                          ? ((standardPrice - gp.price) / standardPrice * 100).toFixed(1)
                          : '0';

                        return (
                          <TableRow key={gp.id}>
                            <TableCell className="font-mono">
                              {gp.product?.productCode || '-'}
                            </TableCell>
                            <TableCell className="font-medium">
                              {gp.product?.productName || '-'}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatPrice(standardPrice)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-primary">
                              {formatPrice(gp.price)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">
                                {discountPercent}% 할인
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setDeleteConfirm({
                                    groupId: selectedGroupId,
                                    productId: gp.productId,
                                    productName: gp.product?.productName || '',
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 가격 추가 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>그룹 특별단가 추가</DialogTitle>
            <DialogDescription>
              {selectedGroup?.groupName} 그룹에 적용할 특별 가격을 설정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>상품 선택</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="상품을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.productName} ({formatPrice(product.basePrice)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">그룹 특별가격 (원)</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="50000"
              />
            </div>

            {selectedProductId && price && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p>
                  표준단가:{' '}
                  {formatPrice(
                    productsData?.data?.find(p => p.id === selectedProductId)?.basePrice || 0
                  )}
                </p>
                <p>
                  그룹단가: {formatPrice(parseFloat(price) || 0)}
                </p>
                <p className="text-primary font-medium">
                  할인율:{' '}
                  {(() => {
                    const standard = productsData?.data?.find(p => p.id === selectedProductId)?.basePrice || 0;
                    const group = parseFloat(price) || 0;
                    return standard > 0
                      ? ((standard - group) / standard * 100).toFixed(1)
                      : '0';
                  })()}
                  %
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleAddPrice}
              disabled={!selectedProductId || !price || setGroupPrice.isPending}
            >
              {setGroupPrice.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>그룹단가 삭제</DialogTitle>
            <DialogDescription>
              &apos;{deleteConfirm?.productName}&apos; 상품의 그룹단가를 삭제하시겠습니까?
              <br />
              삭제 후에는 표준단가 또는 그룹 기본 할인율이 적용됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteGroupPrice.isPending}
            >
              {deleteGroupPrice.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

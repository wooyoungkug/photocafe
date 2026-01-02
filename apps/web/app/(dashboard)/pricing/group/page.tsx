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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientGroups } from '@/hooks/use-clients';
import {
  useGroupProductPrices,
  useGroupHalfProductPrices,
  useProducts,
  useHalfProducts,
  useSetGroupProductPrice,
  useDeleteGroupProductPrice,
  useSetGroupHalfProductPrice,
  useDeleteGroupHalfProductPrice,
} from '@/hooks/use-pricing';
import {
  Plus,
  Search,
  Trash2,
  Loader2,
  DollarSign,
  Users,
  Package,
  Layers,
} from 'lucide-react';

export default function GroupPricingPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'products' | 'half-products'>('products');
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedHalfProductId, setSelectedHalfProductId] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ groupId: string; productId: string; productName: string } | null>(null);
  const [deleteHalfConfirm, setDeleteHalfConfirm] = useState<{ groupId: string; halfProductId: string; name: string } | null>(null);

  const { data: groupsData, isLoading: groupsLoading } = useClientGroups({ limit: 100 });
  const { data: groupPrices, isLoading: pricesLoading } = useGroupProductPrices(selectedGroupId);
  const { data: groupHalfPrices, isLoading: halfPricesLoading } = useGroupHalfProductPrices(selectedGroupId);
  const { data: productsData } = useProducts({ limit: 100 });
  const { data: halfProductsData } = useHalfProducts({ limit: 100 });

  const setGroupPrice = useSetGroupProductPrice();
  const deleteGroupPrice = useDeleteGroupProductPrice();
  const setGroupHalfPrice = useSetGroupHalfProductPrice();
  const deleteGroupHalfPrice = useDeleteGroupHalfProductPrice();

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

  const handleAddHalfPrice = async () => {
    if (!selectedGroupId || !selectedHalfProductId || !price) return;

    await setGroupHalfPrice.mutateAsync({
      groupId: selectedGroupId,
      halfProductId: selectedHalfProductId,
      price: parseFloat(price),
    });

    setIsDialogOpen(false);
    setSelectedHalfProductId('');
    setPrice('');
  };

  const handleDeleteHalf = async () => {
    if (!deleteHalfConfirm) return;

    await deleteGroupHalfPrice.mutateAsync({
      groupId: deleteHalfConfirm.groupId,
      halfProductId: deleteHalfConfirm.halfProductId,
    });

    setDeleteHalfConfirm(null);
  };

  // 이미 가격이 설정된 상품 ID 목록
  const existingProductIds = new Set(groupPrices?.map(p => p.productId) || []);

  // 가격 설정 가능한 상품 목록 (이미 설정된 상품 제외)
  const availableProducts = productsData?.data?.filter(
    p => !existingProductIds.has(p.id)
  ) || [];

  // 이미 가격이 설정된 반제품 ID 목록
  const existingHalfProductIds = new Set(groupHalfPrices?.map(p => p.halfProductId) || []);

  // 가격 설정 가능한 반제품 목록
  const availableHalfProducts = halfProductsData?.data?.filter(
    p => !existingHalfProductIds.has(p.id)
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

      {/* 그룹 가격 목록 - 탭 */}
      {selectedGroupId && (
        <Card>
          <CardHeader>
            <CardTitle>그룹 특별단가 관리</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'products' | 'half-products')}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="products" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    완제품
                  </TabsTrigger>
                  <TabsTrigger value="half-products" className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    반제품
                  </TabsTrigger>
                </TabsList>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  disabled={
                    activeTab === 'products'
                      ? availableProducts.length === 0
                      : availableHalfProducts.length === 0
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  가격 추가
                </Button>
              </div>

              {/* 검색 */}
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={activeTab === 'products' ? '상품명 검색...' : '반제품명 검색...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 완제품 탭 */}
              <TabsContent value="products">
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
              </TabsContent>

              {/* 반제품 탭 */}
              <TabsContent value="half-products">
                {halfPricesLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>코드</TableHead>
                        <TableHead>반제품명</TableHead>
                        <TableHead className="text-right">표준단가</TableHead>
                        <TableHead className="text-right">그룹단가</TableHead>
                        <TableHead className="text-right">할인율</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupHalfPrices?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            설정된 반제품 그룹단가가 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        groupHalfPrices
                          ?.filter(gp =>
                            !search ||
                            gp.halfProduct?.name?.toLowerCase().includes(search.toLowerCase())
                          )
                          .map((gp) => {
                            const standardPrice = gp.halfProduct?.basePrice || 0;
                            const discountPercent = standardPrice > 0
                              ? ((standardPrice - gp.price) / standardPrice * 100).toFixed(1)
                              : '0';

                            return (
                              <TableRow key={gp.id}>
                                <TableCell className="font-mono">
                                  {gp.halfProduct?.code || '-'}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {gp.halfProduct?.name || '-'}
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
                                      setDeleteHalfConfirm({
                                        groupId: selectedGroupId,
                                        halfProductId: gp.halfProductId,
                                        name: gp.halfProduct?.name || '',
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* 가격 추가 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeTab === 'products' ? '완제품' : '반제품'} 그룹단가 추가
            </DialogTitle>
            <DialogDescription>
              {selectedGroup?.groupName} 그룹에 적용할 특별 가격을 설정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {activeTab === 'products' ? (
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
            ) : (
              <div className="space-y-2">
                <Label>반제품 선택</Label>
                <Select value={selectedHalfProductId} onValueChange={setSelectedHalfProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="반제품을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableHalfProducts.map((hp) => (
                      <SelectItem key={hp.id} value={hp.id}>
                        {hp.name} ({formatPrice(hp.basePrice)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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

            {activeTab === 'products' && selectedProductId && price && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p>
                  표준단가:{' '}
                  {formatPrice(
                    productsData?.data?.find(p => p.id === selectedProductId)?.basePrice || 0
                  )}
                </p>
                <p>그룹단가: {formatPrice(parseFloat(price) || 0)}</p>
                <p className="text-primary font-medium">
                  할인율:{' '}
                  {(() => {
                    const standard = productsData?.data?.find(p => p.id === selectedProductId)?.basePrice || 0;
                    const group = parseFloat(price) || 0;
                    return standard > 0 ? ((standard - group) / standard * 100).toFixed(1) : '0';
                  })()}%
                </p>
              </div>
            )}

            {activeTab === 'half-products' && selectedHalfProductId && price && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p>
                  표준단가:{' '}
                  {formatPrice(
                    halfProductsData?.data?.find(p => p.id === selectedHalfProductId)?.basePrice || 0
                  )}
                </p>
                <p>그룹단가: {formatPrice(parseFloat(price) || 0)}</p>
                <p className="text-primary font-medium">
                  할인율:{' '}
                  {(() => {
                    const standard = halfProductsData?.data?.find(p => p.id === selectedHalfProductId)?.basePrice || 0;
                    const group = parseFloat(price) || 0;
                    return standard > 0 ? ((standard - group) / standard * 100).toFixed(1) : '0';
                  })()}%
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={activeTab === 'products' ? handleAddPrice : handleAddHalfPrice}
              disabled={
                activeTab === 'products'
                  ? !selectedProductId || !price || setGroupPrice.isPending
                  : !selectedHalfProductId || !price || setGroupHalfPrice.isPending
              }
            >
              {(setGroupPrice.isPending || setGroupHalfPrice.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 상품 삭제 확인 다이얼로그 */}
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

      {/* 반제품 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteHalfConfirm} onOpenChange={() => setDeleteHalfConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반제품 그룹단가 삭제</DialogTitle>
            <DialogDescription>
              &apos;{deleteHalfConfirm?.name}&apos; 반제품의 그룹단가를 삭제하시겠습니까?
              <br />
              삭제 후에는 표준단가 또는 그룹 기본 할인율이 적용됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteHalfConfirm(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteHalf}
              disabled={deleteGroupHalfPrice.isPending}
            >
              {deleteGroupHalfPrice.isPending && (
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

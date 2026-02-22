'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import { ProductEditor } from '@/components/ui/product-editor';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/hooks/use-products';
import { useCategories } from '@/hooks/use-categories';
import { useToast } from '@/hooks/use-toast';
import { normalizeImageUrl } from '@/lib/utils';
import type { Product, CreateProductDto } from '@/lib/types';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  Package,
  Image as ImageIcon,
  Copy,
  ExternalLink,
} from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);

  const { data: productsData, isLoading, error } = useProducts({
    page,
    limit: 20,
    search: search || undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
  });

  const { data: categoriesData } = useCategories();
  const { toast } = useToast();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [formData, setFormData] = useState<CreateProductDto>({
    productCode: '',
    productName: '',
    categoryId: '',
    basePrice: 0,
    isActive: true,
    isNew: false,
    isBest: false,
    memberType: 'all',
    thumbnailUrl: '',
    description: '',
    sortOrder: 0,
  });

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        productCode: product.productCode,
        productName: product.productName,
        categoryId: product.categoryId,
        basePrice: Number(product.basePrice),
        isActive: product.isActive,
        isNew: product.isNew,
        isBest: product.isBest,
        memberType: product.memberType,
        thumbnailUrl: product.thumbnailUrl || '',
        description: product.description || '',
        sortOrder: product.sortOrder,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        productCode: '',
        productName: '',
        categoryId: '',
        basePrice: 0,
        isActive: true,
        isNew: false,
        isBest: false,
        memberType: 'all',
        thumbnailUrl: '',
        description: '',
        sortOrder: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, data: formData });
        toast({ title: '상품이 수정되었습니다.' });
      } else {
        await createProduct.mutateAsync(formData);
        toast({ title: formData.productCode.includes('_복사') ? '상품이 복사되었습니다.' : '상품이 추가되었습니다.' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: error instanceof Error ? error.message : '상품 저장에 실패했습니다.',
      });
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      try {
        await deleteProduct.mutateAsync(deleteConfirm.id);
        setDeleteConfirm(null);
        toast({ title: '상품이 삭제되었습니다.' });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '삭제 실패',
          description: error instanceof Error ? error.message : '상품 삭제에 실패했습니다.',
        });
      }
    }
  };

  const handleCopy = (product: Product) => {
    // 상품 코드에 '_복사' 추가
    const copiedProductCode = `${product.productCode}_복사`;

    setEditingProduct(null);
    setFormData({
      productCode: copiedProductCode,
      productName: `${product.productName} (복사)`,
      categoryId: product.categoryId,
      basePrice: Number(product.basePrice),
      isActive: product.isActive,
      isNew: product.isNew,
      isBest: product.isBest,
      memberType: product.memberType,
      thumbnailUrl: product.thumbnailUrl || '',
      description: product.description || '',
      sortOrder: product.sortOrder,
    });
    setIsDialogOpen(true);
  };

  const formatPrice = (price: number | string) => {
    return Number(price).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="상품 관리"
        description="완제품 상품을 관리합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '상품관리' },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            상품 목록
          </CardTitle>
          <Button onClick={() => router.push('/products/new')} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            상품 추가
          </Button>
        </CardHeader>
        <CardContent>
          {/* 필터 영역 */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="상품명, 코드 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 sm:gap-4">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="flex-1 sm:w-48">
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 카테고리</SelectItem>
                  {categoriesData?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 sm:w-32">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 sm:w-20 text-center">이미지</TableHead>
                    <TableHead className="text-center">상품명</TableHead>
                    <TableHead className="hidden md:table-cell text-center">카테고리</TableHead>
                    <TableHead className="text-center">기본가격</TableHead>
                    <TableHead className="hidden lg:table-cell text-center">태그</TableHead>
                    <TableHead className="hidden sm:table-cell text-center">상태</TableHead>
                    <TableHead className="text-center">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        등록된 상품이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    productsData?.data?.map((product) => (
                      <TableRow key={product.id} className="group">
                        <TableCell
                          className="text-center cursor-pointer"
                          onClick={() => window.open(`/product/${product.id}`, '_blank')}
                          title="상품 주문 페이지 열기"
                        >
                          <div className="flex justify-center">
                            {product.thumbnailUrl ? (
                              <img
                                src={normalizeImageUrl(product.thumbnailUrl)}
                                alt={product.productName}
                                className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded hover:ring-2 hover:ring-primary transition-all"
                              />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded flex items-center justify-center hover:ring-2 hover:ring-primary transition-all">
                                <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell
                          className="text-center font-medium cursor-pointer hover:text-primary transition-colors"
                          onClick={() => window.open(`/product/${product.id}`, '_blank')}
                          title="상품 주문 페이지 열기"
                        >
                          <div className="flex flex-col items-center">
                            <span className="truncate max-w-[120px] sm:max-w-none flex items-center gap-1">
                              {product.productName}
                              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                            </span>
                            <span className="md:hidden text-xs text-muted-foreground">{product.category?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                          <Badge variant="outline">{product.category?.name || '-'}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {formatPrice(product.basePrice)}원
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-center">
                          <div className="flex gap-1 justify-center">
                            {product.isNew && <Badge className="bg-green-500">NEW</Badge>}
                            {product.isBest && <Badge className="bg-orange-500">BEST</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-center">
                          <Badge variant={product.isActive ? 'default' : 'secondary'}>
                            {product.isActive ? '활성' : '비활성'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1 sm:gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/products/${product.id}/edit`)}
                              title="수정"
                              className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(product)}
                              title="복사"
                              className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                            >
                              <Copy className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(product)}
                              title="삭제"
                              className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
                </div>
              </div>

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
                    {page} / {productsData.meta.totalPages} (총 {productsData.meta.total}건)
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

      {/* 상품 추가/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? '상품 수정' : formData.productCode.includes('_복사') ? '상품 복사' : '상품 추가'}
            </DialogTitle>
            <DialogDescription>
              {formData.productCode.includes('_복사')
                ? '복사된 상품 정보를 확인하고 필요한 항목을 수정하세요.'
                : '상품 정보를 입력하세요.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="productCode">상품 코드 *</Label>
              <Input
                id="productCode"
                value={formData.productCode}
                onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                placeholder="PB-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productName">상품명 *</Label>
              <Input
                id="productName"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="프리미엄 포토북 A4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryId">카테고리 *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesData?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="basePrice">기본 가격 *</Label>
              <Input
                id="basePrice"
                type="number"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                placeholder="50000"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="thumbnailUrl">썸네일 URL</Label>
              <Input
                id="thumbnailUrl"
                value={formData.thumbnailUrl}
                onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>상품 설명</Label>
              <ProductEditor
                value={formData.description || ''}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="상품에 대한 설명을 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberType">회원 유형</Label>
              <Select
                value={formData.memberType}
                onValueChange={(v) => setFormData({ ...formData, memberType: v as 'all' | 'member_only' | 'specific_groups' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 공개</SelectItem>
                  <SelectItem value="member_only">회원 전용</SelectItem>
                  <SelectItem value="specific_groups">특정 그룹</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">정렬 순서</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-4 sm:gap-6 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
                />
                <label htmlFor="isActive" className="text-sm cursor-pointer">활성화</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isNew"
                  checked={formData.isNew}
                  onCheckedChange={(checked) => setFormData({ ...formData, isNew: checked as boolean })}
                />
                <label htmlFor="isNew" className="text-sm cursor-pointer">NEW 태그</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isBest"
                  checked={formData.isBest}
                  onCheckedChange={(checked) => setFormData({ ...formData, isBest: checked as boolean })}
                />
                <label htmlFor="isBest" className="text-sm cursor-pointer">BEST 태그</label>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createProduct.isPending || updateProduct.isPending}
              className="w-full sm:w-auto"
            >
              {(createProduct.isPending || updateProduct.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingProduct ? '수정' : formData.productCode.includes('_복사') ? '복사하여 추가' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>상품 삭제</DialogTitle>
            <DialogDescription>
              &apos;{deleteConfirm?.productName}&apos; 상품을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="w-full sm:w-auto">
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteProduct.isPending}
              className="w-full sm:w-auto"
            >
              {deleteProduct.isPending && (
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

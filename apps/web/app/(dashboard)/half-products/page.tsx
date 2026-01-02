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
import { Checkbox } from '@/components/ui/checkbox';
import {
  useHalfProducts,
  useCreateHalfProduct,
  useUpdateHalfProduct,
  useDeleteHalfProduct,
} from '@/hooks/use-half-products';
import { useCategories } from '@/hooks/use-categories';
import type { HalfProduct, CreateHalfProductDto } from '@/lib/types';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';

export default function HalfProductsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<HalfProduct | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<HalfProduct | null>(null);

  const { data: productsData, isLoading, error } = useHalfProducts({
    page,
    limit: 20,
    search: search || undefined,
    categoryLargeId: categoryFilter !== 'all' ? categoryFilter : undefined,
    status: statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'inactive'),
  });

  const { data: categoriesData } = useCategories();
  const createProduct = useCreateHalfProduct();
  const updateProduct = useUpdateHalfProduct();
  const deleteProduct = useDeleteHalfProduct();

  // 대분류 카테고리만 필터링 (반제품은 대분류에만 연결)
  const largeCategories = categoriesData?.filter(c => c.level === 'large') || [];

  const [formData, setFormData] = useState<CreateHalfProductDto>({
    code: '',
    name: '',
    categoryLargeId: '',
    basePrice: 0,
    isPriceAdditive: true,
    memberType: 'all',
    requiredFileCount: 0,
    thumbnailUrl: '',
    status: 'active',
    sortOrder: 0,
  });

  const handleOpenDialog = (product?: HalfProduct) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        code: product.code,
        name: product.name,
        categoryLargeId: product.categoryLargeId,
        basePrice: Number(product.basePrice),
        isPriceAdditive: product.isPriceAdditive,
        memberType: product.memberType,
        requiredFileCount: product.requiredFileCount,
        thumbnailUrl: product.thumbnailUrl || '',
        status: product.status,
        sortOrder: product.sortOrder,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        code: '',
        name: '',
        categoryLargeId: '',
        basePrice: 0,
        isPriceAdditive: true,
        memberType: 'all',
        requiredFileCount: 0,
        thumbnailUrl: '',
        status: 'active',
        sortOrder: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, data: formData });
    } else {
      await createProduct.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteProduct.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const formatPrice = (price: number | string) => {
    return Number(price).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="반제품 관리"
        description="반제품(출력물, 부자재 등)을 관리합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '상품관리' },
          { label: '반제품' },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            반제품 목록
          </CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            반제품 추가
          </Button>
        </CardHeader>
        <CardContent>
          {/* 필터 영역 */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="반제품명, 코드 검색..."
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
                {largeCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
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
                    <TableHead className="w-20">이미지</TableHead>
                    <TableHead>코드</TableHead>
                    <TableHead>반제품명</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead className="text-right">기본가격</TableHead>
                    <TableHead className="text-center">규격</TableHead>
                    <TableHead className="text-center">옵션</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        등록된 반제품이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    productsData?.data?.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {product.thumbnailUrl ? (
                            <img
                              src={product.thumbnailUrl}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{product.code}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {product.categoryLarge?.name || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatPrice(product.basePrice)}원
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {product._count?.specifications || 0}개
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {product._count?.options || 0}개
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                            {product.status === 'active' ? '활성' : '비활성'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(product)}
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

      {/* 반제품 추가/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? '반제품 수정' : '반제품 추가'}
            </DialogTitle>
            <DialogDescription>
              반제품 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">반제품 코드 *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="HP-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">반제품명 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="인화지 출력"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryLargeId">카테고리 (대분류) *</Label>
              <Select
                value={formData.categoryLargeId}
                onValueChange={(v) => setFormData({ ...formData, categoryLargeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {largeCategories.map((category) => (
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
                placeholder="1000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberType">회원 유형</Label>
              <Select
                value={formData.memberType}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    memberType: v as 'all' | 'member_only' | 'specific_groups',
                  })
                }
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
              <Label htmlFor="requiredFileCount">필수 파일 수</Label>
              <Input
                id="requiredFileCount"
                type="number"
                value={formData.requiredFileCount}
                onChange={(e) =>
                  setFormData({ ...formData, requiredFileCount: Number(e.target.value) })
                }
                min={0}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="thumbnailUrl">썸네일 URL</Label>
              <Input
                id="thumbnailUrl"
                value={formData.thumbnailUrl}
                onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">상태</Label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  setFormData({ ...formData, status: v as 'active' | 'inactive' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
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
            <div className="col-span-2 flex items-center space-x-2 pt-2">
              <Checkbox
                id="isPriceAdditive"
                checked={formData.isPriceAdditive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isPriceAdditive: checked as boolean })
                }
              />
              <Label htmlFor="isPriceAdditive" className="cursor-pointer">
                가격 가산 방식 (옵션 가격을 기본가격에 더함)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createProduct.isPending || updateProduct.isPending}
            >
              {(createProduct.isPending || updateProduct.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingProduct ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반제품 삭제</DialogTitle>
            <DialogDescription>
              &apos;{deleteConfirm?.name}&apos; 반제품을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteProduct.isPending}
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

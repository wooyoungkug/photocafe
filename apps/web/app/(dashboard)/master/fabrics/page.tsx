'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Scissors,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from '@/hooks/use-toast';
import {
  useFabrics,
  useFabricSuppliers,
  useCreateFabric,
  useUpdateFabric,
  useDeleteFabric,
  Fabric,
  CreateFabricDto,
  FabricCategory,
  FabricMaterial,
  FabricUnitType,
  FABRIC_CATEGORY_LABELS,
  FABRIC_MATERIAL_LABELS,
  FABRIC_UNIT_LABELS,
  FABRIC_CATEGORY_COLORS,
} from '@/hooks/use-fabrics';

// 초기 폼 데이터
const initialFormData: CreateFabricDto = {
  code: '',
  name: '',
  category: 'leather',
  material: 'pu_leather',
  colorCode: '',
  colorName: '',
  widthCm: undefined,
  thickness: undefined,
  weight: undefined,
  supplierId: undefined,
  basePrice: 0,
  unitType: 'm',
  discountRate: 0,
  stockQuantity: 0,
  minStockLevel: 0,
  forAlbumCover: true,
  forBoxCover: false,
  forFrameCover: false,
  forOther: false,
  description: '',
  memo: '',
  sortOrder: 0,
  isActive: true,
};

export default function FabricsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMaterial, setFilterMaterial] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFabric, setEditingFabric] = useState<Fabric | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // 폼 데이터
  const [formData, setFormData] = useState<CreateFabricDto>(initialFormData);

  // API 훅
  const { data: fabricsData, isLoading: isFabricsLoading } = useFabrics({
    search: searchTerm || undefined,
    category: filterCategory !== 'all' ? filterCategory : undefined,
    material: filterMaterial !== 'all' ? filterMaterial : undefined,
    page,
    limit,
  });

  const { data: suppliers } = useFabricSuppliers();
  const createFabric = useCreateFabric();
  const updateFabric = useUpdateFabric();
  const deleteFabric = useDeleteFabric();

  const fabrics = fabricsData?.data || [];
  const meta = fabricsData?.meta;
  const isLoading = createFabric.isPending || updateFabric.isPending || deleteFabric.isPending;

  // 다이얼로그 열기
  const openDialog = (fabric?: Fabric) => {
    if (fabric) {
      setEditingFabric(fabric);
      setFormData({
        code: fabric.code,
        name: fabric.name,
        category: fabric.category,
        material: fabric.material,
        colorCode: fabric.colorCode || '',
        colorName: fabric.colorName || '',
        widthCm: fabric.widthCm,
        thickness: fabric.thickness,
        weight: fabric.weight,
        supplierId: fabric.supplierId,
        basePrice: fabric.basePrice,
        unitType: fabric.unitType,
        discountRate: fabric.discountRate,
        discountPrice: fabric.discountPrice,
        stockQuantity: fabric.stockQuantity,
        minStockLevel: fabric.minStockLevel,
        forAlbumCover: fabric.forAlbumCover,
        forBoxCover: fabric.forBoxCover,
        forFrameCover: fabric.forFrameCover,
        forOther: fabric.forOther,
        imageUrl: fabric.imageUrl,
        thumbnailUrl: fabric.thumbnailUrl,
        description: fabric.description || '',
        memo: fabric.memo || '',
        sortOrder: fabric.sortOrder,
        isActive: fabric.isActive,
      });
    } else {
      setEditingFabric(null);
      const autoCode = `FAB${Date.now().toString(36).toUpperCase()}`;
      setFormData({ ...initialFormData, code: autoCode });
    }
    setDialogOpen(true);
  };

  // 저장
  const handleSubmit = async () => {
    if (!formData.name?.trim()) {
      toast({
        variant: 'destructive',
        title: '원단명을 입력해주세요.',
      });
      return;
    }

    try {
      if (editingFabric) {
        await updateFabric.mutateAsync({
          id: editingFabric.id,
          dto: formData,
        });
        toast({ title: '원단이 수정되었습니다.' });
      } else {
        await createFabric.mutateAsync(formData);
        toast({ title: '원단이 등록되었습니다.' });
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: error?.response?.data?.message || '저장에 실패했습니다.',
      });
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteFabric.mutateAsync(deleteId);
      toast({ title: '원단이 삭제되었습니다.' });
      setDeleteId(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: error?.response?.data?.message || '삭제에 실패했습니다.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="표지원단 관리"
        description="앨범 커버 등에 사용되는 표지원단을 관리합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '기초정보', href: '/settings/basic' },
          { label: '표지원단정보' },
        ]}
      />

      {/* 필터 영역 */}
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="원단명, 코드, 색상 검색..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 bg-white"
            />
          </div>
          <Select
            value={filterCategory}
            onValueChange={(v) => {
              setFilterCategory(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[130px] bg-white">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 카테고리</SelectItem>
              {Object.entries(FABRIC_CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterMaterial}
            onValueChange={(v) => {
              setFilterMaterial(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[130px] bg-white">
              <SelectValue placeholder="소재" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 소재</SelectItem>
              {Object.entries(FABRIC_MATERIAL_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button onClick={() => openDialog()} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            원단 추가
          </Button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[100px]">코드</TableHead>
              <TableHead>원단명</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead>색상</TableHead>
              <TableHead>소재</TableHead>
              <TableHead>폭 (cm)</TableHead>
              <TableHead className="text-right">단가 (원)</TableHead>
              <TableHead className="text-right">재고</TableHead>
              <TableHead>공급처</TableHead>
              <TableHead className="text-center">상태</TableHead>
              <TableHead className="w-[80px] text-center">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFabricsLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(11)].map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : fabrics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12">
                  <div className="text-muted-foreground">
                    <Scissors className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    등록된 원단이 없습니다
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              fabrics.map((fabric) => (
                <TableRow key={fabric.id} className="hover:bg-slate-50">
                  <TableCell className="font-mono text-sm">{fabric.code}</TableCell>
                  <TableCell className="font-medium">{fabric.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={FABRIC_CATEGORY_COLORS[fabric.category] || ''}
                    >
                      {FABRIC_CATEGORY_LABELS[fabric.category] || fabric.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {fabric.colorCode && (
                        <div
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: fabric.colorCode }}
                        />
                      )}
                      {fabric.colorName || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {FABRIC_MATERIAL_LABELS[fabric.material] || fabric.material}
                  </TableCell>
                  <TableCell>{fabric.widthCm ? `${fabric.widthCm}cm` : '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(fabric.basePrice).toLocaleString()}원/{FABRIC_UNIT_LABELS[fabric.unitType] || 'm'}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        fabric.stockQuantity <= fabric.minStockLevel
                          ? 'text-red-600 font-medium'
                          : ''
                      }
                    >
                      {fabric.stockQuantity}
                    </span>
                  </TableCell>
                  <TableCell>{fabric.supplier?.name || '-'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={fabric.isActive ? 'default' : 'outline'} className="text-xs">
                      {fabric.isActive ? '활성' : '비활성'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openDialog(fabric)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => setDeleteId(fabric.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            전체 {meta.total}개 중 {fabrics.length}개 표시
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {!meta && !isFabricsLoading && (
        <div className="text-sm text-muted-foreground text-center">
          전체 {fabrics.length}개 표시
        </div>
      )}

      {/* 원단 등록/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFabric ? '원단 수정' : '원단 등록'}</DialogTitle>
            <DialogDescription>원단 정보를 입력하세요.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 border-b pb-2">기본 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>원단 코드</Label>
                  <Input
                    value={formData.code}
                    placeholder="FAB001"
                    className="bg-slate-100 cursor-not-allowed"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>원단명 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="블랙 PU가죽"
                  />
                </div>
                <div className="space-y-2">
                  <Label>카테고리</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v as FabricCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FABRIC_CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>소재</Label>
                  <Select
                    value={formData.material}
                    onValueChange={(v) => setFormData({ ...formData, material: v as FabricMaterial })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FABRIC_MATERIAL_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 색상 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 border-b pb-2">색상 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>색상명</Label>
                  <Input
                    value={formData.colorName}
                    onChange={(e) => setFormData({ ...formData, colorName: e.target.value })}
                    placeholder="블랙, 아이보리 등"
                  />
                </div>
                <div className="space-y-2">
                  <Label>색상 코드</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.colorCode || '#000000'}
                      onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.colorCode}
                      onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 규격 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 border-b pb-2">규격 정보</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>폭 (cm)</Label>
                  <Input
                    type="number"
                    value={formData.widthCm || ''}
                    onChange={(e) => setFormData({ ...formData, widthCm: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="140"
                  />
                </div>
                <div className="space-y-2">
                  <Label>두께 (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.thickness || ''}
                    onChange={(e) => setFormData({ ...formData, thickness: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="1.2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>중량 (g/m²)</Label>
                  <Input
                    type="number"
                    value={formData.weight || ''}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="450"
                  />
                </div>
              </div>
            </div>

            {/* 가격/재고 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 border-b pb-2">가격/재고 정보</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>단가 (원)</Label>
                  <Input
                    type="number"
                    value={formData.basePrice || ''}
                    onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                    placeholder="15000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>단위</Label>
                  <Select
                    value={formData.unitType}
                    onValueChange={(v) => setFormData({ ...formData, unitType: v as FabricUnitType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FABRIC_UNIT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>할인율 (%)</Label>
                  <Input
                    type="number"
                    value={formData.discountRate || ''}
                    onChange={(e) => setFormData({ ...formData, discountRate: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>재고 수량</Label>
                  <Input
                    type="number"
                    value={formData.stockQuantity || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, stockQuantity: Number(e.target.value) })
                    }
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>최소 재고</Label>
                  <Input
                    type="number"
                    value={formData.minStockLevel || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, minStockLevel: Number(e.target.value) })
                    }
                    placeholder="20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>공급업체</Label>
                  <Select
                    value={formData.supplierId || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, supplierId: v === 'none' ? undefined : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="공급업체 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안함</SelectItem>
                      {suppliers?.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 용도 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 border-b pb-2">용도</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.forAlbumCover}
                    onCheckedChange={(v) => setFormData({ ...formData, forAlbumCover: v })}
                  />
                  <Label className="text-sm">앨범 커버용</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.forBoxCover}
                    onCheckedChange={(v) => setFormData({ ...formData, forBoxCover: v })}
                  />
                  <Label className="text-sm">박스 커버용</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.forFrameCover}
                    onCheckedChange={(v) => setFormData({ ...formData, forFrameCover: v })}
                  />
                  <Label className="text-sm">액자 커버용</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.forOther}
                    onCheckedChange={(v) => setFormData({ ...formData, forOther: v })}
                  />
                  <Label className="text-sm">기타 용도</Label>
                </div>
              </div>
            </div>

            {/* 추가 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 border-b pb-2">추가 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>설명</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="원단에 대한 설명"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>관리자 메모</Label>
                  <Textarea
                    value={formData.memo}
                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    placeholder="관리자 메모"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
              />
              <Label>활성화</Label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingFabric ? '수정' : '등록'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>원단 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 원단을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

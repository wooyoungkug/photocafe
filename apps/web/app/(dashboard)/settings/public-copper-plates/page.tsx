'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  usePublicCopperPlates,
  useCreatePublicCopperPlate,
  useUpdatePublicCopperPlate,
  useDeletePublicCopperPlate,
  type PublicCopperPlate,
  type CreatePublicCopperPlateDto,
} from '@/hooks/use-public-copper-plates';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Stamp,
  RefreshCw,
} from 'lucide-react';

export default function PublicCopperPlatesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = usePublicCopperPlates({
    page,
    limit: 20,
    search: search || undefined,
    status: 'active',
  });

  const createMutation = useCreatePublicCopperPlate();
  const updateMutation = useUpdatePublicCopperPlate();
  const deleteMutation = useDeletePublicCopperPlate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlate, setEditingPlate] = useState<PublicCopperPlate | null>(null);
  const [formData, setFormData] = useState<CreatePublicCopperPlateDto>({
    plateName: '',
    plateType: 'copper',
    status: 'active',
  });

  const handleOpenCreate = () => {
    setEditingPlate(null);
    setFormData({
      plateName: '',
      plateType: 'copper',
      status: 'active',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (plate: PublicCopperPlate) => {
    setEditingPlate(plate);
    setFormData({
      plateName: plate.plateName,
      plateCode: plate.plateCode || undefined,
      plateType: plate.plateType,
      widthMm: plate.widthMm || undefined,
      heightMm: plate.heightMm || undefined,
      storageLocation: plate.storageLocation || undefined,
      imageUrl: plate.imageUrl || undefined,
      description: plate.description || undefined,
      defaultEngravingText: plate.defaultEngravingText || undefined,
      status: plate.status,
      sortOrder: plate.sortOrder,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.plateName) {
      toast({ variant: 'destructive', title: '동판명을 입력해주세요' });
      return;
    }

    try {
      if (editingPlate) {
        await updateMutation.mutateAsync({ id: editingPlate.id, data: formData });
        toast({ variant: 'success', title: '저장되었습니다' });
      } else {
        await createMutation.mutateAsync(formData);
        toast({ variant: 'success', title: '등록되었습니다' });
      }
      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: editingPlate ? '저장 실패' : '등록 실패',
        description: error instanceof Error ? error.message : '오류가 발생했습니다',
      });
    }
  };

  const handleDelete = async (plate: PublicCopperPlate) => {
    if (!confirm(`"${plate.plateName}" 동판을 삭제하시겠습니까?`)) return;

    try {
      await deleteMutation.mutateAsync(plate.id);
      toast({ variant: 'success', title: '삭제되었습니다' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '오류가 발생했습니다',
      });
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="공용동판 관리"
        description="회사 로고 등 공용으로 사용하는 각인 동판을 관리합니다. 박색상과 박위치는 주문 시 고객이 선택합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '기초정보', href: '/settings' },
          { label: '공용동판 관리' },
        ]}
        actions={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            새 동판 등록
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          {/* 검색 */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="동판명 또는 코드 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* 테이블 */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-24">코드</TableHead>
                    <TableHead>동판명</TableHead>
                    <TableHead>타입</TableHead>
                    <TableHead>각인문구</TableHead>
                    <TableHead>크기</TableHead>
                    <TableHead>보관위치</TableHead>
                    <TableHead className="text-center">사용</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        <Stamp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>등록된 동판이 없습니다</p>
                        <p className="text-xs mt-1">새 동판 등록 버튼을 눌러 추가하세요</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.data?.map((plate) => (
                      <TableRow key={plate.id}>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {plate.plateCode}
                        </TableCell>
                        <TableCell className="font-medium">{plate.plateName}</TableCell>
                        <TableCell className="text-sm">
                          {plate.plateType === 'copper' ? '동판' : '연판'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {plate.defaultEngravingText || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {plate.widthMm && plate.heightMm
                            ? `${plate.widthMm}×${plate.heightMm}mm`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {plate.storageLocation || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{plate.usageCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEdit(plate)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-red-50"
                              onClick={() => handleDelete(plate)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 페이지네이션 */}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                이전
              </Button>
              <span className="flex items-center px-3 text-sm">
                {page} / {data.meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === data.meta.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stamp className="h-5 w-5 text-amber-600" />
              {editingPlate ? '공용동판 수정' : '공용동판 등록'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>동판명 <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.plateName}
                  onChange={(e) => setFormData(prev => ({ ...prev, plateName: e.target.value }))}
                  placeholder="회사로고, 심볼마크 등"
                />
              </div>
              <div className="space-y-2">
                <Label>타입</Label>
                <Select
                  value={formData.plateType}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, plateType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="copper">동판</SelectItem>
                    <SelectItem value="soft">연판</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>가로(mm)</Label>
                <Input
                  type="number"
                  value={formData.widthMm || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, widthMm: Number(e.target.value) || undefined }))}
                  placeholder="50"
                />
              </div>
              <div className="space-y-2">
                <Label>세로(mm)</Label>
                <Input
                  type="number"
                  value={formData.heightMm || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, heightMm: Number(e.target.value) || undefined }))}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>각인문구</Label>
              <Textarea
                value={formData.defaultEngravingText || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, defaultEngravingText: e.target.value }))}
                placeholder="동판에 새겨질 기본 문구 (상품별로 변경 가능)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>보관위치</Label>
              <Input
                value={formData.storageLocation || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, storageLocation: e.target.value }))}
                placeholder="A동 1열 3번"
              />
            </div>

            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="참고사항 입력"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingPlate ? '저장' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

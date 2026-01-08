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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '@/hooks/use-staff';
import { Department, CreateDepartmentRequest } from '@/lib/types/staff';
import {
  Plus,
  Edit,
  Trash2,
  Building,
  Loader2,
  AlertCircle,
  Users,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DepartmentsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null);

  const { data: departments, isLoading, error } = useDepartments();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const [formData, setFormData] = useState<CreateDepartmentRequest>({
    code: '',
    name: '',
    description: '',
    sortOrder: 0,
    isActive: true,
  });

  const handleOpenDialog = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({
        code: dept.code,
        name: dept.name,
        description: dept.description || '',
        sortOrder: dept.sortOrder,
        isActive: dept.isActive,
      });
    } else {
      setEditingDept(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        sortOrder: 0,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast({
        title: '오류',
        description: '부서코드와 부서명을 입력해주세요',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingDept) {
        await updateDept.mutateAsync({ id: editingDept.id, data: formData });
        toast({
          title: '성공',
          description: '부서가 수정되었습니다',
        });
      } else {
        await createDept.mutateAsync(formData);
        toast({
          title: '성공',
          description: '부서가 등록되었습니다',
        });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '오류가 발생했습니다',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteDept.mutateAsync(deleteConfirm.id);
      toast({
        title: '성공',
        description: '부서가 삭제되었습니다',
      });
      setDeleteConfirm(null);
    } catch (error) {
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="부서 관리"
        description="부서 정보를 관리합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '회사정보', href: '/company' },
          { label: '부서 관리' },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            부서 목록
          </CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            부서 등록
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              데이터를 불러오는데 실패했습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">부서코드</TableHead>
                  <TableHead>부서명</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead className="text-center w-24">직원수</TableHead>
                  <TableHead className="text-center w-24">정렬순서</TableHead>
                  <TableHead className="text-center w-20">상태</TableHead>
                  <TableHead className="text-right w-24">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      등록된 부서가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  departments?.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-mono">{dept.code}</TableCell>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {dept.description || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Users className="h-3 w-3" />
                          {dept._count?.staff || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{dept.sortOrder}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={dept.isActive ? 'default' : 'secondary'}>
                          {dept.isActive ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(dept)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(dept)}
                            disabled={dept._count?.staff ? dept._count.staff > 0 : false}
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
          )}
        </CardContent>
      </Card>

      {/* 부서 추가/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? '부서 수정' : '부서 등록'}</DialogTitle>
            <DialogDescription>
              {editingDept ? '부서 정보를 수정합니다.' : '새 부서를 등록합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">부서 코드 *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="DEV"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">부서명 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="개발팀"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="부서 설명"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">정렬 순서</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createDept.isPending || updateDept.isPending}
            >
              {(createDept.isPending || updateDept.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingDept ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>부서 삭제</DialogTitle>
            <DialogDescription>
              &apos;{deleteConfirm?.name}&apos; 부서를 삭제하시겠습니까?
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
              disabled={deleteDept.isPending}
            >
              {deleteDept.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

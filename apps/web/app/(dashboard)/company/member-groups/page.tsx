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
import { Textarea } from '@/components/ui/textarea';
import {
  useClientGroups,
  useCreateClientGroup,
  useUpdateClientGroup,
  useDeleteClientGroup,
} from '@/hooks/use-clients';
import { ClientGroup, CreateClientGroupDto } from '@/lib/types/client';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function MemberGroupsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClientGroup | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ClientGroup | null>(null);

  const { data: groupsData, isLoading, error } = useClientGroups({
    page,
    limit: 20,
    search: search || undefined,
    isActive: statusFilter !== 'all' ? statusFilter === 'active' : undefined,
  });

  const createGroup = useCreateClientGroup();
  const updateGroup = useUpdateClientGroup();
  const deleteGroup = useDeleteClientGroup();

  const [formData, setFormData] = useState<CreateClientGroupDto>({
    groupCode: '',
    groupName: '',
    discountRate: 0,
    description: '',
    isActive: true,
  });

  const handleOpenDialog = (group?: ClientGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        groupCode: group.groupCode,
        groupName: group.groupName,
        discountRate: group.generalDiscount || 0,
        description: group.description || '',
        isActive: group.isActive,
      });
    } else {
      setEditingGroup(null);
      setFormData({
        groupCode: '',
        groupName: '',
        discountRate: 0,
        description: '',
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingGroup) {
      await updateGroup.mutateAsync({ id: editingGroup.id, data: formData });
    } else {
      await createGroup.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteGroup.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="회원 그룹 관리"
        description="회원 그룹을 관리하고 할인율을 설정합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '회사정보', href: '/company' },
          { label: '회원 그룹' },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>회원 그룹 목록</CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            그룹 추가
          </Button>
        </CardHeader>
        <CardContent>
          {/* 필터 영역 */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="그룹명, 코드 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
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
                    <TableHead>그룹코드</TableHead>
                    <TableHead>그룹명</TableHead>
                    <TableHead>일반 할인율</TableHead>
                    <TableHead>프리미엄 할인율</TableHead>
                    <TableHead>수입 할인율</TableHead>
                    <TableHead>회원수</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupsData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        등록된 그룹이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupsData?.data?.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-mono">{group.groupCode}</TableCell>
                        <TableCell className="font-medium">{group.groupName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50">
                            {group.generalDiscount}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-purple-50">
                            {group.premiumDiscount}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-amber-50">
                            {group.importedDiscount}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {group._count?.clients || 0}명
                          </span>
                        </TableCell>
                        <TableCell>
                          {group.isActive ? (
                            <Badge variant="default">활성</Badge>
                          ) : (
                            <Badge variant="secondary">비활성</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(group)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(group)}
                              disabled={(group._count?.clients || 0) > 0}
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
              {groupsData?.meta && groupsData.meta.totalPages > 1 && (
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
                    {page} / {groupsData.meta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === groupsData.meta.totalPages}
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

      {/* 그룹 추가/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? '회원 그룹 수정' : '회원 그룹 추가'}
            </DialogTitle>
            <DialogDescription>
              그룹 정보를 입력하세요. 그룹별 할인율을 적용할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="groupCode">그룹 코드 *</Label>
              <Input
                id="groupCode"
                value={formData.groupCode}
                onChange={(e) => setFormData({ ...formData, groupCode: e.target.value })}
                placeholder="G001"
                disabled={!!editingGroup}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupName">그룹명 *</Label>
              <Input
                id="groupName"
                value={formData.groupName}
                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                placeholder="VIP 회원"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountRate">기본 할인율 (%)</Label>
              <Input
                id="discountRate"
                type="number"
                min={0}
                max={100}
                value={formData.discountRate}
                onChange={(e) => setFormData({ ...formData, discountRate: parseInt(e.target.value) || 0 })}
                placeholder="10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="그룹에 대한 설명을 입력하세요"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="isActive">상태</Label>
              <Select
                value={formData.isActive ? 'active' : 'inactive'}
                onValueChange={(v) => setFormData({ ...formData, isActive: v === 'active' })}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createGroup.isPending || updateGroup.isPending}
            >
              {(createGroup.isPending || updateGroup.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingGroup ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원 그룹 삭제</DialogTitle>
            <DialogDescription>
              &apos;{deleteConfirm?.groupName}&apos; 그룹을 삭제하시겠습니까?
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
              disabled={deleteGroup.isPending}
            >
              {deleteGroup.isPending && (
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

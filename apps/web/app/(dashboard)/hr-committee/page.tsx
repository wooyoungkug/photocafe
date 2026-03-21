'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  UserPlus,
  UserMinus,
  Loader2,
  Gavel,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  useHrCommittees,
  useHrCommittee,
  useCreateHrCommittee,
  useUpdateHrCommittee,
  useDeleteHrCommittee,
  useAddCommitteeMember,
  useRemoveCommitteeMember,
} from '@/hooks/use-hr-committee';
import type { HrCommittee, HrCommitteeMember } from '@/hooks/use-hr-committee';
import { useStaffList } from '@/hooks/use-staff';

// ==================== 상수 ====================

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
};

// ==================== 페이지 컴포넌트 ====================

export default function HrCommitteePage() {
  const { toast } = useToast();

  // 상태
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HrCommittee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HrCommittee | null>(null);
  const [memberTarget, setMemberTarget] = useState<HrCommittee | null>(null);
  const [addMemberStaffId, setAddMemberStaffId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<'CHAIRMAN' | 'MEMBER'>('MEMBER');

  // 폼 상태
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Queries
  const { data: committeesData, isLoading } = useHrCommittees(
    statusFilter !== 'all' ? { status: statusFilter as 'ACTIVE' | 'INACTIVE' } : undefined,
  );
  const committees = committeesData?.data || [];

  // 멤버 관리용 상세 조회
  const { data: committeeDetail } = useHrCommittee(memberTarget?.id || '');

  // 직원 목록 (멤버 추가용)
  const { data: staffData } = useStaffList({ limit: 200 });
  const staffList = staffData?.data || [];

  // Mutations
  const createMutation = useCreateHrCommittee();
  const updateMutation = useUpdateHrCommittee();
  const deleteMutation = useDeleteHrCommittee();
  const addMemberMutation = useAddCommitteeMember();
  const removeMemberMutation = useRemoveCommitteeMember();

  // 생성 다이얼로그 열기
  const handleOpenCreate = () => {
    setFormName('');
    setFormDescription('');
    setIsCreateOpen(true);
  };

  // 수정 다이얼로그 열기
  const handleOpenEdit = (committee: HrCommittee) => {
    setFormName(committee.name);
    setFormDescription(committee.description || '');
    setEditTarget(committee);
  };

  // 생성 처리
  const handleCreate = async () => {
    if (!formName.trim()) {
      toast({ title: '오류', description: '위원회명을 입력하세요.', variant: 'destructive' });
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
      });
      toast({ title: '생성 완료', description: '인사위원회가 생성되었습니다.' });
      setIsCreateOpen(false);
    } catch {
      toast({ title: '생성 실패', variant: 'destructive' });
    }
  };

  // 수정 처리
  const handleUpdate = async () => {
    if (!editTarget || !formName.trim()) return;
    try {
      await updateMutation.mutateAsync({
        id: editTarget.id,
        data: {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
        },
      });
      toast({ title: '수정 완료', description: '인사위원회가 수정되었습니다.' });
      setEditTarget(null);
    } catch {
      toast({ title: '수정 실패', variant: 'destructive' });
    }
  };

  // 삭제 처리
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: '삭제 완료', description: '인사위원회가 삭제되었습니다.' });
      setDeleteTarget(null);
    } catch {
      toast({ title: '삭제 실패', variant: 'destructive' });
    }
  };

  // 멤버 추가
  const handleAddMember = async () => {
    if (!memberTarget || !addMemberStaffId) return;
    try {
      await addMemberMutation.mutateAsync({
        committeeId: memberTarget.id,
        staffId: addMemberStaffId,
        role: addMemberRole,
      });
      toast({ title: '추가 완료', description: '위원이 추가되었습니다.' });
      setAddMemberStaffId('');
      setAddMemberRole('MEMBER');
    } catch {
      toast({ title: '추가 실패', variant: 'destructive' });
    }
  };

  // 멤버 제거
  const handleRemoveMember = async (memberId: string) => {
    if (!memberTarget) return;
    try {
      await removeMemberMutation.mutateAsync({
        committeeId: memberTarget.id,
        memberId,
      });
      toast({ title: '제거 완료', description: '위원이 제거되었습니다.' });
    } catch {
      toast({ title: '제거 실패', variant: 'destructive' });
    }
  };

  const members: HrCommitteeMember[] = committeeDetail?.members || memberTarget?.members || [];

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="인사위원회 관리"
        breadcrumbs={[
          { label: '인사위원회', href: '/hr-committee' },
          { label: '위원회 관리' },
        ]}
        actions={
          <Button onClick={handleOpenCreate} className="text-[14px]">
            <Plus className="h-4 w-4 mr-1.5" />
            위원회 생성
          </Button>
        }
      />

      {/* 필터 */}
      <Card className="mb-4">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-[14px] text-black font-normal whitespace-nowrap">상태</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="ACTIVE">활성</SelectItem>
                  <SelectItem value="INACTIVE">비활성</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 테이블 */}
      <Card className="flex-1">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : committees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Gavel className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-[14px] text-black font-normal">등록된 인사위원회가 없습니다.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[14px]">위원회명</TableHead>
                  <TableHead className="text-[14px]">상태</TableHead>
                  <TableHead className="text-[14px]">위원 수</TableHead>
                  <TableHead className="text-[14px]">생성일</TableHead>
                  <TableHead className="text-[14px] text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {committees.map((committee) => (
                  <TableRow
                    key={committee.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      setMemberTarget(committee);
                    }}
                  >
                    <TableCell className="text-[14px] text-black font-normal">
                      {committee.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={committee.status === 'ACTIVE' ? 'default' : 'secondary'}
                        className={
                          committee.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                        }
                      >
                        {STATUS_LABELS[committee.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {committee.members?.length ?? 0}명
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {format(new Date(committee.createdAt), 'yyyy.MM.dd', { locale: ko })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="위원 관리"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemberTarget(committee);
                          }}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="수정"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(committee);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                          title="삭제"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(committee);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 생성 다이얼로그 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">인사위원회 생성</DialogTitle>
            <DialogDescription className="text-[14px]">
              새로운 인사위원회를 생성합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[14px] text-black font-normal">위원회명 *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="위원회명을 입력하세요"
                className="mt-1 text-[14px]"
              />
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">설명</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="위원회 설명을 입력하세요"
                className="mt-1 text-[14px]"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="text-[14px]"
            >
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="text-[14px]"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">인사위원회 수정</DialogTitle>
            <DialogDescription className="text-[14px]">
              위원회 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[14px] text-black font-normal">위원회명 *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="위원회명을 입력하세요"
                className="mt-1 text-[14px]"
              />
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">설명</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="위원회 설명을 입력하세요"
                className="mt-1 text-[14px]"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              className="text-[14px]"
            >
              취소
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              className="text-[14px]"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              수정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">인사위원회 삭제</DialogTitle>
            <DialogDescription className="text-[14px]">
              <span className="font-medium text-black">{deleteTarget?.name}</span> 위원회를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="text-[14px]"
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-[14px]"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 위원 관리 다이얼로그 */}
      <Dialog open={!!memberTarget} onOpenChange={(open) => !open && setMemberTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">
              위원 관리 - {memberTarget?.name}
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              위원을 추가하거나 제거합니다.
            </DialogDescription>
          </DialogHeader>

          {/* 위원 추가 */}
          <div className="border rounded-lg p-3 space-y-3">
            <p className="text-[14px] text-black font-bold">위원 추가</p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-[14px] text-black font-normal">직원 선택</Label>
                <Select value={addMemberStaffId} onValueChange={setAddMemberStaffId}>
                  <SelectTrigger className="mt-1 text-[14px]">
                    <SelectValue placeholder="직원을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name} ({staff.staffId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[120px]">
                <Label className="text-[14px] text-black font-normal">역할</Label>
                <Select value={addMemberRole} onValueChange={(v) => setAddMemberRole(v as 'CHAIRMAN' | 'MEMBER')}>
                  <SelectTrigger className="mt-1 text-[14px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHAIRMAN">위원장</SelectItem>
                    <SelectItem value="MEMBER">위원</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddMember}
                disabled={!addMemberStaffId || addMemberMutation.isPending}
                size="sm"
                className="text-[14px]"
              >
                {addMemberMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* 현재 위원 목록 */}
          <div className="space-y-2">
            <p className="text-[14px] text-black font-bold">현재 위원 ({members.length}명)</p>
            {members.length === 0 ? (
              <p className="text-[14px] text-black font-normal text-center py-4">
                등록된 위원이 없습니다.
              </p>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] text-black font-normal">
                        {member.staff?.name || '알 수 없음'}
                      </span>
                      {member.staff?.position && (
                        <span className="text-[14px] text-black font-normal">
                          ({member.staff.position})
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          member.role === 'CHAIRMAN'
                            ? 'border-blue-300 text-blue-700'
                            : 'border-gray-300 text-gray-600'
                        }
                      >
                        {member.role === 'CHAIRMAN' ? '위원장' : '위원'}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-700"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removeMemberMutation.isPending}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMemberTarget(null)}
              className="text-[14px]"
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Plus,
  Trash2,
  Award,
  Loader2,
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
  useDisciplineRecords,
  useCreateDisciplineRecord,
  useDeleteDisciplineRecord,
} from '@/hooks/use-hr-committee';
import type { DisciplineRecord } from '@/hooks/use-hr-committee';
import { useStaffList } from '@/hooks/use-staff';

// ==================== 상수 ====================

const TYPE_LABELS: Record<string, string> = {
  REWARD: '포상',
  PENALTY: '징계',
};

const TYPE_COLORS: Record<string, string> = {
  REWARD: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  PENALTY: 'bg-red-100 text-red-800 hover:bg-red-100',
};

// ==================== 페이지 컴포넌트 ====================

export default function DisciplinePage() {
  const { toast } = useToast();

  // 필터 상태
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');

  // 생성 다이얼로그
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formStaffId, setFormStaffId] = useState('');
  const [formType, setFormType] = useState<string>('');
  const [formCategory, setFormCategory] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEffectiveDate, setFormEffectiveDate] = useState('');

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<DisciplineRecord | null>(null);

  // Queries
  const { data: recordsData, isLoading } = useDisciplineRecords({
    type: typeFilter !== 'all' ? (typeFilter as 'REWARD' | 'PENALTY') : undefined,
    staffId: staffFilter !== 'all' ? staffFilter : undefined,
  });
  const records = recordsData?.data || [];

  const { data: staffData } = useStaffList({ limit: 200 });
  const staffList = staffData?.data || [];

  // Mutations
  const createMutation = useCreateDisciplineRecord();
  const deleteMutation = useDeleteDisciplineRecord();

  const handleOpenCreate = () => {
    setFormStaffId('');
    setFormType('');
    setFormCategory('');
    setFormTitle('');
    setFormDescription('');
    setFormEffectiveDate('');
    setIsCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!formStaffId || !formType || !formCategory.trim() || !formTitle.trim() || !formEffectiveDate) {
      toast({ title: '오류', description: '필수 항목을 입력하세요.', variant: 'destructive' });
      return;
    }
    try {
      await createMutation.mutateAsync({
        staffId: formStaffId,
        type: formType as 'REWARD' | 'PENALTY',
        category: formCategory.trim(),
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        effectiveDate: formEffectiveDate,
        createdBy: '',
      });
      toast({ title: '등록 완료', description: '포상/징계 기록이 등록되었습니다.' });
      setIsCreateOpen(false);
    } catch {
      toast({ title: '등록 실패', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: '삭제 완료', description: '기록이 삭제되었습니다.' });
      setDeleteTarget(null);
    } catch {
      toast({ title: '삭제 실패', variant: 'destructive' });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="포상/징계 기록"
        breadcrumbs={[
          { label: '인사위원회', href: '/hr-committee' },
          { label: '포상/징계 기록' },
        ]}
        actions={
          <Button onClick={handleOpenCreate} className="text-[14px]">
            <Plus className="h-4 w-4 mr-1.5" />
            기록 등록
          </Button>
        }
      />

      {/* 필터 */}
      <Card className="mb-4">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-[14px] text-black font-normal whitespace-nowrap">구분</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px] text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="REWARD">포상</SelectItem>
                  <SelectItem value="PENALTY">징계</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[14px] text-black font-normal whitespace-nowrap">직원</Label>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="w-[160px] text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {staffList.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name} ({staff.staffId})
                    </SelectItem>
                  ))}
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
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Award className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-[14px] text-black font-normal">등록된 포상/징계 기록이 없습니다.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[14px]">직원명</TableHead>
                  <TableHead className="text-[14px]">구분</TableHead>
                  <TableHead className="text-[14px]">분류</TableHead>
                  <TableHead className="text-[14px]">제목</TableHead>
                  <TableHead className="text-[14px]">시행일</TableHead>
                  <TableHead className="text-[14px] text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-[14px] text-black font-normal">
                      {record.staff?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={TYPE_COLORS[record.type]}
                      >
                        {TYPE_LABELS[record.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {record.category}
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {record.title}
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {format(new Date(record.effectiveDate), 'yyyy.MM.dd', { locale: ko })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                        title="삭제"
                        onClick={() => setDeleteTarget(record)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 기록 등록 다이얼로그 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">포상/징계 기록 등록</DialogTitle>
            <DialogDescription className="text-[14px]">
              새로운 포상 또는 징계 기록을 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[14px] text-black font-normal">직원 *</Label>
              <Select value={formStaffId} onValueChange={setFormStaffId}>
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
            <div>
              <Label className="text-[14px] text-black font-normal">구분 *</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="mt-1 text-[14px]">
                  <SelectValue placeholder="구분을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REWARD">포상</SelectItem>
                  <SelectItem value="PENALTY">징계</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">분류 *</Label>
              <Input
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="예: 우수사원, 근태불량, 성과포상"
                className="mt-1 text-[14px]"
              />
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">제목 *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="기록 제목을 입력하세요"
                className="mt-1 text-[14px]"
              />
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">설명</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="상세 내용을 입력하세요"
                className="mt-1 text-[14px]"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">시행일 *</Label>
              <Input
                type="date"
                value={formEffectiveDate}
                onChange={(e) => setFormEffectiveDate(e.target.value)}
                className="mt-1 text-[14px] w-[200px]"
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
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">기록 삭제</DialogTitle>
            <DialogDescription className="text-[14px]">
              <span className="font-medium text-black">{deleteTarget?.title}</span> 기록을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
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
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Plus,
  FileText,
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
  useHrAgendas,
  useHrCommittees,
  useCreateHrAgenda,
} from '@/hooks/use-hr-committee';
import type { HrAgenda } from '@/hooks/use-hr-committee';
import { useStaffList } from '@/hooks/use-staff';

// ==================== 상수 ====================

const AGENDA_TYPE_LABELS: Record<string, string> = {
  REWARD: '포상',
  PENALTY: '징계',
  PROMOTION: '승진',
  TRANSFER: '전보',
  DISMISSAL: '해임',
  OTHER: '기타',
};

const AGENDA_TYPE_COLORS: Record<string, string> = {
  REWARD: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  PENALTY: 'bg-red-100 text-red-800 hover:bg-red-100',
  PROMOTION: 'bg-green-100 text-green-800 hover:bg-green-100',
  TRANSFER: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  DISMISSAL: 'bg-red-100 text-red-800 hover:bg-red-100',
  OTHER: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
};

const AGENDA_STATUS_LABELS: Record<string, string> = {
  DRAFT: '초안',
  SUBMITTED: '제출됨',
  IN_REVIEW: '심의중',
  VOTED: '투표완료',
  CLOSED: '종결',
};

const AGENDA_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
  SUBMITTED: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  IN_REVIEW: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  VOTED: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  CLOSED: 'bg-green-100 text-green-800 hover:bg-green-100',
};

const ALL_TYPES = ['REWARD', 'PENALTY', 'PROMOTION', 'TRANSFER', 'DISMISSAL', 'OTHER'] as const;
const ALL_STATUSES = ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'VOTED', 'CLOSED'] as const;

// ==================== 페이지 컴포넌트 ====================

export default function AgendasPage() {
  const router = useRouter();
  const { toast } = useToast();

  // 필터 상태
  const [committeeFilter, setCommitteeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 생성 다이얼로그
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formCommitteeId, setFormCommitteeId] = useState('');
  const [formType, setFormType] = useState<string>('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTargetStaffId, setFormTargetStaffId] = useState('');
  const [formEvidence, setFormEvidence] = useState('');

  // Queries
  const { data: agendasData, isLoading } = useHrAgendas({
    committeeId: committeeFilter !== 'all' ? committeeFilter : undefined,
    type: typeFilter !== 'all' ? (typeFilter as HrAgenda['type']) : undefined,
    status: statusFilter !== 'all' ? (statusFilter as HrAgenda['status']) : undefined,
  });
  const agendas = agendasData?.data || [];

  const { data: committeesData } = useHrCommittees();
  const committees = committeesData?.data || [];

  const { data: staffData } = useStaffList({ limit: 200 });
  const staffList = staffData?.data || [];

  // Mutations
  const createMutation = useCreateHrAgenda();

  const handleOpenCreate = () => {
    setFormCommitteeId('');
    setFormType('');
    setFormTitle('');
    setFormDescription('');
    setFormTargetStaffId('');
    setFormEvidence('');
    setIsCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!formCommitteeId || !formType || !formTitle.trim()) {
      toast({ title: '오류', description: '필수 항목을 입력하세요.', variant: 'destructive' });
      return;
    }
    try {
      await createMutation.mutateAsync({
        committeeId: formCommitteeId,
        type: formType as HrAgenda['type'],
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        targetStaffId: formTargetStaffId || undefined,
        evidence: formEvidence.trim() || undefined,
        createdBy: '',
      });
      toast({ title: '생성 완료', description: '안건이 생성되었습니다.' });
      setIsCreateOpen(false);
    } catch {
      toast({ title: '생성 실패', variant: 'destructive' });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="안건 목록"
        breadcrumbs={[
          { label: '인사위원회', href: '/hr-committee' },
          { label: '안건 목록' },
        ]}
        actions={
          <Button onClick={handleOpenCreate} className="text-[14px]">
            <Plus className="h-4 w-4 mr-1.5" />
            안건 등록
          </Button>
        }
      />

      {/* 필터 */}
      <Card className="mb-4">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-[14px] text-black font-normal whitespace-nowrap">위원회</Label>
              <Select value={committeeFilter} onValueChange={setCommitteeFilter}>
                <SelectTrigger className="w-[160px] text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {committees.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[14px] text-black font-normal whitespace-nowrap">유형</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px] text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {ALL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {AGENDA_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[14px] text-black font-normal whitespace-nowrap">상태</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {ALL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {AGENDA_STATUS_LABELS[s]}
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
          ) : agendas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FileText className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-[14px] text-black font-normal">등록된 안건이 없습니다.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[14px]">제목</TableHead>
                  <TableHead className="text-[14px]">유형</TableHead>
                  <TableHead className="text-[14px]">대상 직원</TableHead>
                  <TableHead className="text-[14px]">상태</TableHead>
                  <TableHead className="text-[14px]">투표</TableHead>
                  <TableHead className="text-[14px]">등록일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agendas.map((agenda) => (
                  <TableRow
                    key={agenda.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/hr-committee/agendas/${agenda.id}`)}
                  >
                    <TableCell className="text-[14px] text-black font-normal">
                      {agenda.title}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={AGENDA_TYPE_COLORS[agenda.type]}
                      >
                        {AGENDA_TYPE_LABELS[agenda.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {agenda.targetStaff?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={AGENDA_STATUS_COLORS[agenda.status]}
                      >
                        {AGENDA_STATUS_LABELS[agenda.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {agenda.votes?.length ?? 0}건
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {format(new Date(agenda.createdAt), 'yyyy.MM.dd', { locale: ko })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 안건 생성 다이얼로그 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">안건 등록</DialogTitle>
            <DialogDescription className="text-[14px]">
              새로운 안건을 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[14px] text-black font-normal">위원회 *</Label>
              <Select value={formCommitteeId} onValueChange={setFormCommitteeId}>
                <SelectTrigger className="mt-1 text-[14px]">
                  <SelectValue placeholder="위원회를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {committees.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">유형 *</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="mt-1 text-[14px]">
                  <SelectValue placeholder="유형을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {AGENDA_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">제목 *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="안건 제목을 입력하세요"
                className="mt-1 text-[14px]"
              />
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">설명</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="안건 설명을 입력하세요"
                className="mt-1 text-[14px]"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">대상 직원</Label>
              <Select value={formTargetStaffId} onValueChange={setFormTargetStaffId}>
                <SelectTrigger className="mt-1 text-[14px]">
                  <SelectValue placeholder="대상 직원을 선택하세요" />
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
              <Label className="text-[14px] text-black font-normal">증빙자료</Label>
              <Textarea
                value={formEvidence}
                onChange={(e) => setFormEvidence(e.target.value)}
                placeholder="증빙자료 내용 또는 링크를 입력하세요"
                className="mt-1 text-[14px]"
                rows={2}
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
    </div>
  );
}

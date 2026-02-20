'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  MessageSquare,
  Plus,
  Search,
  ChevronDown,
  AlertCircle,
  Loader2,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useConsultations,
  useConsultationCategories,
  useDeleteConsultation,
  useUpdateConsultationStatus,
} from '@/hooks/use-cs';
import { ConsultationStatus, ConsultationPriority } from '@/lib/types/cs';
import Link from 'next/link';

// 비회원 internalMemo에서 이름/연락처 파싱
function parseNonMemberInfo(internalMemo?: string | null) {
  if (!internalMemo?.includes('[비회원 고객 정보]')) return null;
  const nameMatch = internalMemo.match(/이름:\s*(.+)/);
  const phoneMatch = internalMemo.match(/연락처:\s*(.+)/);
  return {
    name: nameMatch?.[1]?.trim() || '',
    phone: phoneMatch?.[1]?.trim() || '',
  };
}

export default function ConsultationsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ConsultationPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  const { data: categories } = useConsultationCategories();
  const { data: consultationsData, isLoading, error } = useConsultations({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
  });

  const deleteConsultation = useDeleteConsultation();
  const updateStatus = useUpdateConsultationStatus();

  const statusLabels: Record<string, string> = {
    open: '접수',
    in_progress: '처리중',
    resolved: '해결',
    closed: '종료',
  };

  const statusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700 border-blue-200',
    in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    resolved: 'bg-green-100 text-green-700 border-green-200',
    closed: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  // 상태 순서 정의
  const statusOrder: ConsultationStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

  // 현재 상태까지의 모든 상태 목록 반환 (이전 상태는 disabled로 표시)
  const getAllStatusesUpTo = (currentStatus: ConsultationStatus): { status: ConsultationStatus; selectable: boolean }[] => {
    const currentIndex = statusOrder.indexOf(currentStatus);
    return statusOrder.map((status, index) => ({
      status,
      selectable: index > currentIndex, // 현재 상태 이후만 선택 가능
    }));
  };

  const priorityLabels: Record<string, string> = {
    low: '낮음',
    normal: '보통',
    high: '높음',
    urgent: '긴급',
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600',
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteConsultation.mutateAsync(deleteConfirm.id);
      toast({ title: '상담이 삭제되었습니다.' });
      setDeleteConfirm(null);
    } catch (error) {
      toast({ title: '삭제에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (id: string, status: ConsultationStatus) => {
    try {
      // TODO: 실제 로그인한 사용자 이름 사용
      await updateStatus.mutateAsync({ id, status, updatedBy: '상담원' });
      toast({ title: '상태가 변경되었습니다.' });
    } catch (error) {
      toast({ title: '상태 변경에 실패했습니다.', variant: 'destructive' });
    }
  };

  // 상태별 담당자와 일시 정보 가져오기
  const getStatusHistory = (consultation: any, status: ConsultationStatus) => {
    switch (status) {
      case 'open':
        return {
          date: consultation.openedAt || consultation.consultedAt,
          by: consultation.openedBy || consultation.counselorName,
        };
      case 'in_progress':
        return {
          date: consultation.inProgressAt,
          by: consultation.inProgressBy,
        };
      case 'resolved':
        return {
          date: consultation.resolvedAt,
          by: consultation.resolvedBy,
        };
      case 'closed':
        return {
          date: consultation.closedAt,
          by: consultation.closedBy,
        };
      default:
        return { date: null, by: null };
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            상담 관리
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            고객 상담 내역을 조회하고 관리합니다
          </p>
        </div>
        <Link href="/cs/consultations/new">
          <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
            <Plus className="h-4 w-4 mr-2" />
            상담 등록
          </Button>
        </Link>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-4 p-4 bg-slate-50/50 rounded-xl border">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="상담번호, 제목, 고객명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ConsultationStatus | 'all')}>
          <SelectTrigger className="w-32 bg-white">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="open">접수</SelectItem>
            <SelectItem value="in_progress">처리중</SelectItem>
            <SelectItem value="resolved">해결</SelectItem>
            <SelectItem value="closed">종료</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as ConsultationPriority | 'all')}>
          <SelectTrigger className="w-32 bg-white">
            <SelectValue placeholder="우선순위" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 우선순위</SelectItem>
            <SelectItem value="urgent">긴급</SelectItem>
            <SelectItem value="high">높음</SelectItem>
            <SelectItem value="normal">보통</SelectItem>
            <SelectItem value="low">낮음</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="분류" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 분류</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 테이블 */}
      <div className="rounded-xl border overflow-hidden bg-white">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-destructive">
            <AlertCircle className="h-5 w-5 mr-2" />
            데이터를 불러오는데 실패했습니다.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="whitespace-nowrap">상담번호</TableHead>
                <TableHead className="whitespace-nowrap">고객</TableHead>
                <TableHead className="whitespace-nowrap">전화번호</TableHead>
                <TableHead className="whitespace-nowrap">제목</TableHead>
                <TableHead className="whitespace-nowrap">분류</TableHead>
                <TableHead className="whitespace-nowrap">담당자</TableHead>
                <TableHead className="whitespace-nowrap">접수일자</TableHead>
                <TableHead className="whitespace-nowrap">상태</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultationsData?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    등록된 상담이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                consultationsData?.data?.map((consultation) => (
                  <TableRow key={consultation.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {consultation.consultNumber}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {consultation.client?.clientName ? (
                        <span className="text-sm font-medium">{consultation.client.clientName}</span>
                      ) : (() => {
                        const nm = parseNonMemberInfo(consultation.internalMemo);
                        return nm?.name ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-orange-600 border-orange-300 bg-orange-50">비회원</Badge>
                            <span className="text-sm font-medium">{nm.name}</span>
                          </div>
                        ) : <span className="text-muted-foreground text-sm">-</span>;
                      })()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {consultation.client
                        ? (consultation.client.mobile || consultation.client.phone || '-')
                        : (() => {
                            const nm = parseNonMemberInfo(consultation.internalMemo);
                            return nm?.phone || '-';
                          })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* 우선순위 표시 - 높음/긴급만 */}
                        {(consultation.priority === 'high' || consultation.priority === 'urgent') && (
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              consultation.priority === 'urgent' ? 'bg-red-500' : 'bg-orange-500'
                            }`}
                            title={priorityLabels[consultation.priority]}
                          />
                        )}
                        <Link
                          href={`/cs/consultations/${consultation.id}`}
                          className="font-medium hover:text-blue-600 hover:underline"
                        >
                          {consultation.title || <span className="text-muted-foreground text-sm">(제목 없음)</span>}
                        </Link>
                        {(consultation._count?.followUps ?? 0) > 0 && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            +{consultation._count!.followUps}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          backgroundColor: consultation.category?.colorCode ? `${consultation.category.colorCode}15` : undefined,
                          borderColor: consultation.category?.colorCode,
                          color: consultation.category?.colorCode,
                        }}
                      >
                        {consultation.category?.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="text-sm">{consultation.counselorName || '-'}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(consultation.consultedAt), 'yy/MM/dd HH:mm', { locale: ko })}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 px-2 text-xs ${statusColors[consultation.status]}`}
                          >
                            {statusLabels[consultation.status]}
                            {consultation.status !== 'closed' && (
                              <ChevronDown className="h-3 w-3 ml-0.5" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[220px]">
                          {getAllStatusesUpTo(consultation.status).map(({ status, selectable }) => {
                            const history = getStatusHistory(consultation, status);
                            const isPast = !selectable && status !== consultation.status;
                            const isCurrent = status === consultation.status;

                            return (
                              <DropdownMenuItem
                                key={status}
                                onClick={() => selectable && handleStatusChange(consultation.id, status)}
                                disabled={!selectable}
                                className={!selectable ? 'opacity-70 cursor-default' : ''}
                              >
                                <div className="flex items-center justify-between w-full gap-2">
                                  <div className="flex items-center">
                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                      status === 'open' ? 'bg-blue-500' :
                                      status === 'in_progress' ? 'bg-yellow-500' :
                                      status === 'resolved' ? 'bg-green-500' : 'bg-gray-500'
                                    }`} />
                                    <span>{statusLabels[status]}</span>
                                  </div>
                                  {isPast && history.date && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {history.by || '-'} · {format(new Date(history.date), 'MM/dd HH:mm')}
                                    </span>
                                  )}
                                  {isCurrent && (
                                    <span className="text-[10px] text-blue-600 font-medium">현재</span>
                                  )}
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/cs/consultations/${consultation.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              상세보기
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/cs/consultations/${consultation.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              수정
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteConfirm({
                              id: consultation.id,
                              title: consultation.title || '(제목 없음)',
                            })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 페이지네이션 */}
      {consultationsData?.meta && consultationsData.meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            이전
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            {page} / {consultationsData.meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === consultationsData.meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            다음
          </Button>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              상담 삭제
            </DialogTitle>
            <DialogDescription>
              '{deleteConfirm?.title}' 상담을 삭제하시겠습니까?
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
              disabled={deleteConsultation.isPending}
            >
              {deleteConsultation.isPending && (
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

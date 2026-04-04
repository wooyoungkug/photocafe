'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  Loader2,
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
  useQuotations,
  useQuotationStats,
  useDeleteQuotation,
  useUpdateQuotationStatus,
} from '@/hooks/use-quotation';
import {
  QuotationStatus,
  QuotationType,
  QUOTATION_STATUS_LABELS,
  QUOTATION_STATUS_COLORS,
  QUOTATION_TYPE_LABELS,
} from '@/lib/types/quotation';
import Link from 'next/link';

export default function QuotationsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  const { data, isLoading } = useQuotations({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    quotationType: typeFilter !== 'all' ? typeFilter : undefined,
  });

  const { data: stats } = useQuotationStats();
  const deleteMutation = useDeleteQuotation();
  const statusMutation = useUpdateQuotationStatus();

  const quotations = data?.data || [];
  const pagination = data?.pagination;

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      toast({ title: '견적이 삭제되었습니다.' });
      setDeleteConfirm(null);
    } catch {
      toast({ title: '삭제에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await statusMutation.mutateAsync({ id, status });
      toast({ title: `상태가 '${QUOTATION_STATUS_LABELS[status as QuotationStatus] || status}'(으)로 변경되었습니다.` });
    } catch {
      toast({ title: '상태 변경에 실패했습니다.', variant: 'destructive' });
    }
  };

  const formatAmount = (amount: number | string) => {
    return Number(amount).toLocaleString('ko-KR');
  };

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] text-black font-normal flex items-center gap-2">
            <FileText className="h-7 w-7" />
            견적 관리
          </h1>
          <p className="text-[14px] text-black font-normal mt-1">
            견적서를 작성하고 관리합니다
          </p>
        </div>
        <Link href="/cs/quotations/new">
          <Button className="bg-pink-500 hover:bg-pink-600">
            <Plus className="mr-2 h-4 w-4" />
            견적 작성
          </Button>
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {(['draft', 'sent', 'confirmed', 'rejected', 'expired', 'ordered'] as QuotationStatus[]).map((status) => (
          <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}>
            <CardContent className="p-4">
              <p className="text-[14px] text-black font-normal">{QUOTATION_STATUS_LABELS[status]}</p>
              <p className="text-[18px] text-black font-bold mt-1">
                {stats?.byStatus?.[status] || 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="견적번호, 제목, 고객명 검색..."
                className="pl-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                {Object.entries(QUOTATION_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="분류" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 분류</SelectItem>
                {Object.entries(QUOTATION_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 목록 테이블 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : quotations.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="text-[14px] text-black font-normal mt-4">견적이 없습니다</p>
              <Link href="/cs/quotations/new">
                <Button className="mt-4 bg-pink-500 hover:bg-pink-600">
                  <Plus className="mr-2 h-4 w-4" />
                  첫 견적 작성하기
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">견적번호</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead className="w-[120px]">분류</TableHead>
                  <TableHead className="w-[120px]">고객</TableHead>
                  <TableHead className="w-[100px]">상태</TableHead>
                  <TableHead className="w-[120px] text-right">최종금액</TableHead>
                  <TableHead className="w-[100px]">담당자</TableHead>
                  <TableHead className="w-[110px]">작성일</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((q) => (
                  <TableRow key={q.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell className="text-[14px] font-mono">
                      <Link href={`/cs/quotations/${q.id}`} className="text-blue-600 hover:underline">
                        {q.quotationNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      <Link href={`/cs/quotations/${q.id}`} className="hover:underline">
                        {q.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[12px]">
                        {QUOTATION_TYPE_LABELS[q.quotationType as QuotationType] || q.quotationType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {q.client?.clientName || q.clientName || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={QUOTATION_STATUS_COLORS[q.status as QuotationStatus] || 'bg-gray-100 text-gray-700'}>
                        {QUOTATION_STATUS_LABELS[q.status as QuotationStatus] || q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal text-right">
                      {formatAmount(q.finalAmount)}원
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {q.staff?.name || '-'}
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {format(new Date(q.createdAt), 'yyyy-MM-dd', { locale: ko })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/cs/quotations/${q.id}`}>
                              <Eye className="mr-2 h-4 w-4" /> 상세보기
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/cs/quotations/${q.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" /> 수정
                            </Link>
                          </DropdownMenuItem>
                          {q.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(q.id, 'sent')}>
                              <Send className="mr-2 h-4 w-4" /> 발송
                            </DropdownMenuItem>
                          )}
                          {q.status === 'sent' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(q.id, 'confirmed')}>
                              <CheckCircle className="mr-2 h-4 w-4" /> 확정
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteConfirm({ id: q.id, title: q.title })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> 삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* 페이지네이션 */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-[14px] text-black font-normal">
                총 {pagination.total}건 (페이지 {pagination.page}/{pagination.totalPages})
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>견적 삭제</DialogTitle>
            <DialogDescription>
              "{deleteConfirm?.title}" 견적을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>취소</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

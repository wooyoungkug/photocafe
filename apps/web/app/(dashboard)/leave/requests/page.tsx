'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ClipboardList,
  Search,
  Loader2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  useLeaveTypes,
  useLeaveRequests,
  usePendingApprovals,
  useApproveLeaveRequest,
  type LeaveRequest,
  type LeaveRequestQuery,
} from '@/hooks/use-leave';
import { useStaffList } from '@/hooks/use-staff';
import { useDepartments } from '@/hooks/use-staff';

// ==================== 상태 배지 ====================

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: '승인대기', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  TEAM_APPROVED: { label: '팀장승인', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  APPROVED: { label: '승인완료', className: 'bg-green-50 text-green-700 border-green-200' },
  REJECTED: { label: '반려', className: 'bg-red-50 text-red-700 border-red-200' },
  CANCELLED: { label: '취소', className: 'bg-gray-50 text-gray-500 border-gray-200' },
};

function LeaveStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <Badge variant="outline" className={cn('text-[12px]', config.className)}>
      {config.label}
    </Badge>
  );
}

// ==================== 페이지 컴포넌트 ====================

export default function LeaveRequestsPage() {
  const { toast } = useToast();

  // 필터 상태
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // 다이얼로그 상태
  const [detailTarget, setDetailTarget] = useState<LeaveRequest | null>(null);
  const [approvalTarget, setApprovalTarget] = useState<{ request: LeaveRequest; action: 'APPROVED' | 'REJECTED' } | null>(null);
  const [approvalComment, setApprovalComment] = useState('');

  // 현재 탭
  const [activeTab, setActiveTab] = useState('all');

  // 검색 디바운스
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 데이터 조회
  const { data: leaveTypes } = useLeaveTypes();
  const { data: departments } = useDepartments();

  const requestQuery: LeaveRequestQuery = {
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? (statusFilter as LeaveRequest['status']) : undefined,
    departmentId: departmentFilter !== 'all' ? departmentFilter : undefined,
  };
  const { data: requestsData, isLoading: requestsLoading } = useLeaveRequests(requestQuery);
  const requests = requestsData?.data || [];
  const totalPages = requestsData?.meta?.totalPages || 1;

  const { data: pendingApprovals, isLoading: pendingLoading } = usePendingApprovals();
  const approveMutation = useApproveLeaveRequest();

  const handleApproval = async () => {
    if (!approvalTarget) return;
    try {
      await approveMutation.mutateAsync({
        requestId: approvalTarget.request.id,
        status: approvalTarget.action,
        comment: approvalComment || undefined,
      });
      toast({
        title: approvalTarget.action === 'APPROVED' ? '승인 완료' : '반려 완료',
      });
      setApprovalTarget(null);
      setApprovalComment('');
    } catch (err: any) {
      toast({ title: '처리 실패', description: err.message, variant: 'destructive' });
    }
  };

  const getLeaveTypeName = (code: string) => {
    return leaveTypes?.find((t) => t.code === code)?.name || code;
  };

  const renderRequestTable = (data: LeaveRequest[], showActions: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-[14px]">직원</TableHead>
          <TableHead className="text-[14px]">부서</TableHead>
          <TableHead className="text-[14px]">휴가유형</TableHead>
          <TableHead className="text-[14px]">기간</TableHead>
          <TableHead className="text-[14px]">일수</TableHead>
          <TableHead className="text-[14px]">상태</TableHead>
          <TableHead className="text-[14px]">신청일</TableHead>
          {showActions && <TableHead className="text-[14px]">작업</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showActions ? 8 : 7} className="text-center py-8">
              <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-2" />
              <p className="text-[14px] text-gray-400">데이터가 없습니다</p>
            </TableCell>
          </TableRow>
        ) : (
          data.map((req) => (
            <TableRow
              key={req.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => setDetailTarget(req)}
            >
              <TableCell className="text-[14px] text-black font-normal">
                {req.staff?.name || '-'}
              </TableCell>
              <TableCell className="text-[14px] text-black font-normal">
                {req.staff?.department?.name || '-'}
              </TableCell>
              <TableCell className="text-[14px] text-black font-normal">
                {getLeaveTypeName(req.leaveTypeCode)}
              </TableCell>
              <TableCell className="text-[14px] text-black font-normal">
                {format(new Date(req.startDate), 'MM.dd')} ~ {format(new Date(req.endDate), 'MM.dd')}
              </TableCell>
              <TableCell className="text-[14px] text-black font-normal">
                {req.days}일
              </TableCell>
              <TableCell>
                <LeaveStatusBadge status={req.status} />
              </TableCell>
              <TableCell className="text-[14px] text-black font-normal">
                {format(new Date(req.createdAt), 'yyyy.MM.dd')}
              </TableCell>
              {showActions && (
                <TableCell>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setApprovalTarget({ request: req, action: 'APPROVED' })}
                      className="text-[12px] text-green-600 hover:text-green-700"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      승인
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setApprovalTarget({ request: req, action: 'REJECTED' })}
                      className="text-[12px] text-red-500 hover:text-red-700"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      반려
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-gray-700" />
        <h1 className="text-[24px] text-black font-normal">휴가신청 관리</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="text-[14px]">전체 목록</TabsTrigger>
          <TabsTrigger value="pending" className="text-[14px]">
            결재 대기
            {pendingApprovals && pendingApprovals.length > 0 && (
              <Badge className="ml-1.5 bg-red-500 text-white text-[11px] px-1.5 py-0">
                {pendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 전체 목록 탭 */}
        <TabsContent value="all" className="space-y-4">
          {/* 필터 */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="직원명 검색"
                      className="pl-9 text-[14px]"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] text-[14px]">
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[140px] text-[14px]">
                    <SelectValue placeholder="부서" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 부서</SelectItem>
                    {departments?.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 테이블 */}
          <Card>
            <CardContent className="p-0">
              {requestsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                renderRequestTable(requests, false)
              )}
            </CardContent>
          </Card>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-[14px]"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-[14px] text-black font-normal">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="text-[14px]"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* 결재 대기 탭 */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[18px] text-black font-bold">내 결재 대기 목록</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pendingLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                renderRequestTable(pendingApprovals || [], true)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 상세 다이얼로그 */}
      <Dialog open={!!detailTarget} onOpenChange={(open) => !open && setDetailTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">휴가 신청 상세</DialogTitle>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[12px] text-gray-500 mb-0.5">신청자</p>
                  <p className="text-[14px] text-black font-normal">{detailTarget.staff?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-[12px] text-gray-500 mb-0.5">부서</p>
                  <p className="text-[14px] text-black font-normal">{detailTarget.staff?.department?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-[12px] text-gray-500 mb-0.5">휴가유형</p>
                  <p className="text-[14px] text-black font-normal">{getLeaveTypeName(detailTarget.leaveTypeCode)}</p>
                </div>
                <div>
                  <p className="text-[12px] text-gray-500 mb-0.5">상태</p>
                  <LeaveStatusBadge status={detailTarget.status} />
                </div>
                <div>
                  <p className="text-[12px] text-gray-500 mb-0.5">기간</p>
                  <p className="text-[14px] text-black font-normal">
                    {format(new Date(detailTarget.startDate), 'yyyy.MM.dd')} ~ {format(new Date(detailTarget.endDate), 'yyyy.MM.dd')}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-gray-500 mb-0.5">일수</p>
                  <p className="text-[14px] text-black font-normal">{detailTarget.days}일</p>
                </div>
              </div>
              {detailTarget.reason && (
                <div>
                  <p className="text-[12px] text-gray-500 mb-0.5">사유</p>
                  <p className="text-[14px] text-black font-normal">{detailTarget.reason}</p>
                </div>
              )}

              {/* 승인 이력 */}
              {detailTarget.approvals && detailTarget.approvals.length > 0 && (
                <div>
                  <p className="text-[12px] text-gray-500 mb-2">승인 이력</p>
                  <div className="space-y-2">
                    {detailTarget.approvals.map((approval) => (
                      <div
                        key={approval.id}
                        className="flex items-center justify-between border rounded-lg p-2"
                      >
                        <div>
                          <span className="text-[14px] text-black font-normal">
                            {approval.step}단계: {approval.approver?.name || '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <LeaveStatusBadge status={approval.status} />
                          {approval.decidedAt && (
                            <span className="text-[12px] text-gray-400">
                              {format(new Date(approval.decidedAt), 'MM.dd HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTarget(null)} className="text-[14px]">
              닫기
            </Button>
            {detailTarget && (detailTarget.status === 'PENDING' || detailTarget.status === 'TEAM_APPROVED') && (
              <>
                <Button
                  onClick={() => {
                    setApprovalTarget({ request: detailTarget, action: 'APPROVED' });
                    setDetailTarget(null);
                  }}
                  className="text-[14px] bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  승인
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setApprovalTarget({ request: detailTarget, action: 'REJECTED' });
                    setDetailTarget(null);
                  }}
                  className="text-[14px]"
                >
                  <X className="h-4 w-4 mr-1" />
                  반려
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 승인/반려 다이얼로그 */}
      <Dialog open={!!approvalTarget} onOpenChange={(open) => { if (!open) { setApprovalTarget(null); setApprovalComment(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">
              {approvalTarget?.action === 'APPROVED' ? '휴가 승인' : '휴가 반려'}
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              <span className="font-medium text-black">{approvalTarget?.request.staff?.name}</span>님의
              휴가 신청을 {approvalTarget?.action === 'APPROVED' ? '승인' : '반려'}합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">코멘트 (선택)</Label>
              <Textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder={approvalTarget?.action === 'REJECTED' ? '반려 사유를 입력해주세요' : '코멘트를 입력해주세요'}
                className="text-[14px]"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setApprovalTarget(null); setApprovalComment(''); }}
              className="text-[14px]"
            >
              취소
            </Button>
            <Button
              onClick={handleApproval}
              disabled={approveMutation.isPending}
              className={cn(
                'text-[14px]',
                approvalTarget?.action === 'APPROVED'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              )}
            >
              {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {approvalTarget?.action === 'APPROVED' ? '승인' : '반려'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

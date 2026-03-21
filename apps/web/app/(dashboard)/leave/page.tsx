'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  CalendarDays,
  Plus,
  Loader2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import {
  useLeaveTypes,
  useLeaveBalances,
  useLeaveRequests,
  useCreateLeaveRequest,
  useCancelLeaveRequest,
  type LeaveRequest,
  type LeaveRequestQuery,
} from '@/hooks/use-leave';

// ==================== 상태 배지 ====================

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
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

export default function LeaveDashboardPage() {
  const { toast } = useToast();
  const currentUser = useAuthStore((state) => state.user);
  const currentYear = new Date().getFullYear();

  // 다이얼로그 상태
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);

  // 폼 상태
  const [formLeaveTypeCode, setFormLeaveTypeCode] = useState('');
  const [formStartDate, setFormStartDate] = useState<Date | undefined>();
  const [formEndDate, setFormEndDate] = useState<Date | undefined>();
  const [formReason, setFormReason] = useState('');

  // 데이터 조회
  const { data: leaveTypes, isLoading: typesLoading } = useLeaveTypes();
  const { data: balances, isLoading: balancesLoading } = useLeaveBalances({
    staffId: currentUser?.id,
    year: currentYear,
  });

  const requestQuery: LeaveRequestQuery = {
    staffId: currentUser?.id,
    limit: 10,
  };
  const { data: requestsData, isLoading: requestsLoading } = useLeaveRequests(requestQuery);
  const requests = requestsData?.data || [];

  // Mutations
  const createMutation = useCreateLeaveRequest();
  const cancelMutation = useCancelLeaveRequest();

  // 일수 계산
  const calculateDays = useMemo(() => {
    if (!formStartDate || !formEndDate) return 0;
    const diffTime = formEndDate.getTime() - formStartDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    // 반차인 경우 0.5일
    const selectedType = leaveTypes?.find((t) => t.code === formLeaveTypeCode);
    if (selectedType && selectedType.deductDays < 1) {
      return selectedType.deductDays;
    }
    return diffDays > 0 ? diffDays : 0;
  }, [formStartDate, formEndDate, formLeaveTypeCode, leaveTypes]);

  const handleCreate = async () => {
    if (!formLeaveTypeCode || !formStartDate || !formEndDate) {
      toast({ title: '필수 항목을 입력해주세요', variant: 'destructive' });
      return;
    }
    try {
      await createMutation.mutateAsync({
        leaveTypeCode: formLeaveTypeCode,
        startDate: format(formStartDate, 'yyyy-MM-dd'),
        endDate: format(formEndDate, 'yyyy-MM-dd'),
        days: calculateDays,
        reason: formReason || undefined,
      });
      toast({ title: '휴가 신청 완료' });
      setCreateOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: '신청 실패', description: err.message, variant: 'destructive' });
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync(cancelTarget.id);
      toast({ title: '휴가 신청이 취소되었습니다' });
      setCancelTarget(null);
    } catch (err: any) {
      toast({ title: '취소 실패', description: err.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormLeaveTypeCode('');
    setFormStartDate(undefined);
    setFormEndDate(undefined);
    setFormReason('');
  };

  const isLoading = typesLoading || balancesLoading || requestsLoading;

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-gray-700" />
          <h1 className="text-[24px] text-black font-normal">내 휴가현황</h1>
        </div>
        <Button
          onClick={() => { resetForm(); setCreateOpen(true); }}
          className="text-[14px]"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          휴가 신청
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* 잔여일수 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {balances && balances.length > 0 ? (
              balances.map((balance) => {
                const total = balance.totalDays + balance.adjustedDays;
                const remaining = total - balance.usedDays;
                const percent = total > 0 ? (balance.usedDays / total) * 100 : 0;
                return (
                  <Card key={balance.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[14px] text-black font-bold">
                        {leaveTypes?.find((t) => t.code === balance.leaveTypeCode)?.name || balance.leaveTypeCode}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[14px] text-black font-normal">
                          <span>잔여</span>
                          <span className="font-bold">{remaining}일 / {total}일</span>
                        </div>
                        <Progress value={percent} className="h-2" />
                        <div className="flex justify-between text-[12px] text-gray-500">
                          <span>사용 {balance.usedDays}일</span>
                          {balance.adjustedDays !== 0 && (
                            <span>조정 {balance.adjustedDays > 0 ? '+' : ''}{balance.adjustedDays}일</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center">
                  <p className="text-[14px] text-gray-400">
                    {currentYear}년 휴가 잔여일수가 없습니다.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 최근 휴가 신청 내역 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[18px] text-black font-bold">최근 휴가 신청</CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-[14px] text-gray-400">휴가 신청 내역이 없습니다</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[14px]">휴가유형</TableHead>
                      <TableHead className="text-[14px]">기간</TableHead>
                      <TableHead className="text-[14px]">일수</TableHead>
                      <TableHead className="text-[14px]">상태</TableHead>
                      <TableHead className="text-[14px]">신청일</TableHead>
                      <TableHead className="text-[14px]">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="text-[14px] text-black font-normal">
                          {leaveTypes?.find((t) => t.code === req.leaveTypeCode)?.name || req.leaveTypeCode}
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
                        <TableCell>
                          {req.status === 'PENDING' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCancelTarget(req)}
                              className="text-[14px] text-red-500 hover:text-red-700"
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              취소
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 휴가 신청 다이얼로그 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">휴가 신청</DialogTitle>
            <DialogDescription className="text-[14px]">
              휴가 유형과 기간을 선택해주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 휴가 유형 */}
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">휴가 유형</Label>
              <Select value={formLeaveTypeCode} onValueChange={setFormLeaveTypeCode}>
                <SelectTrigger className="text-[14px]">
                  <SelectValue placeholder="선택해주세요" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes
                    ?.filter((t) => t.isActive)
                    .map((t) => (
                      <SelectItem key={t.code} value={t.code}>
                        {t.name} ({t.deductDays}일 차감)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* 시작일 */}
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">시작일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left text-[14px]',
                      !formStartDate && 'text-gray-400'
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formStartDate ? format(formStartDate, 'yyyy.MM.dd (EEE)', { locale: ko }) : '날짜 선택'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formStartDate}
                    onSelect={(d) => {
                      setFormStartDate(d);
                      if (!formEndDate || (d && formEndDate < d)) {
                        setFormEndDate(d);
                      }
                    }}
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 종료일 */}
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">종료일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left text-[14px]',
                      !formEndDate && 'text-gray-400'
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formEndDate ? format(formEndDate, 'yyyy.MM.dd (EEE)', { locale: ko }) : '날짜 선택'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formEndDate}
                    onSelect={setFormEndDate}
                    disabled={(d) => formStartDate ? d < formStartDate : false}
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 사용일수 표시 */}
            {calculateDays > 0 && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-[14px] text-blue-700">
                  사용 일수: <span className="font-bold">{calculateDays}일</span>
                </p>
              </div>
            )}

            {/* 사유 */}
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">사유 (선택)</Label>
              <Textarea
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="휴가 사유를 입력해주세요"
                className="text-[14px]"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="text-[14px]">
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formLeaveTypeCode || !formStartDate || !formEndDate}
              className="text-[14px]"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              신청
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 취소 확인 다이얼로그 */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">휴가 신청 취소</DialogTitle>
            <DialogDescription className="text-[14px]">
              이 휴가 신청을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)} className="text-[14px]">
              닫기
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="text-[14px]"
            >
              {cancelMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              취소하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

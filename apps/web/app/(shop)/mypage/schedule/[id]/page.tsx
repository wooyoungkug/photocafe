'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ArrowLeft,
  Camera,
  Calendar,
  MapPin,
  User,
  Building2,
  Star,
  Send,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  useShooting,
  useUpdateShootingStatus,
  useDeleteShooting,
} from '@/hooks/use-shooting';
import type { ShootingStatus } from '@/hooks/use-shooting';
import { SHOOTING_STATUS_LABELS } from '@/hooks/use-shooting';
import { ShootingStatusBadge } from '@/components/shooting/shooting-status-badge';
import { ShootingTypeBadge } from '@/components/shooting/shooting-type-badge';

// ==================== 상태 전이 규칙 ====================

const STATUS_TRANSITIONS: Record<ShootingStatus, ShootingStatus[]> = {
  draft: ['recruiting', 'cancelled'],
  recruiting: ['bidding', 'cancelled'],
  bidding: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const STATUS_ACTION_LABELS: Record<ShootingStatus, string> = {
  draft: '초안',
  recruiting: '모집 시작',
  bidding: '응찰 시작',
  confirmed: '작가 확정',
  in_progress: '촬영 시작',
  completed: '촬영 완료',
  cancelled: '취소',
};

// ==================== 페이지 컴포넌트 ====================

export default function ScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const shootingId = params.id as string;

  // 상태
  const [statusNote, setStatusNote] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ShootingStatus | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 데이터 조회
  const { data: shooting, isLoading, error } = useShooting(shootingId);
  const updateStatusMutation = useUpdateShootingStatus();
  const deleteMutation = useDeleteShooting();

  // 가능한 상태 전이
  const availableTransitions = useMemo(() => {
    if (!shooting) return [];
    return STATUS_TRANSITIONS[shooting.status] || [];
  }, [shooting]);

  // 상태 변경 핸들러
  const handleStatusChange = useCallback((newStatus: ShootingStatus) => {
    setPendingStatus(newStatus);
    setStatusNote('');
    setStatusDialogOpen(true);
  }, []);

  const confirmStatusChange = useCallback(async () => {
    if (!pendingStatus || !shooting) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: shooting.id,
        status: pendingStatus,
        reason: statusNote || undefined,
      });

      toast({
        title: '상태 변경 완료',
        description: `${SHOOTING_STATUS_LABELS[pendingStatus]}(으)로 변경되었습니다.`,
      });

      setStatusDialogOpen(false);
      setPendingStatus(null);
      setStatusNote('');
    } catch {
      toast({
        title: '상태 변경 실패',
        description: '상태를 변경하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  }, [pendingStatus, shooting, statusNote, updateStatusMutation, toast]);

  const handleDelete = useCallback(async () => {
    if (!shooting) return;
    try {
      await deleteMutation.mutateAsync(shooting.id);
      toast({ title: '삭제 완료', description: '촬영 일정이 삭제되었습니다.' });
      router.push('/mypage/schedule');
    } catch {
      toast({ title: '삭제 실패', description: '삭제 중 오류가 발생했습니다.', variant: 'destructive' });
    }
    setDeleteDialogOpen(false);
  }, [shooting, deleteMutation, toast, router]);

  // 로딩
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // 에러
  if (error || !shooting) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-10 w-10 text-gray-300" />
        <p className="text-[14px] text-gray-500">촬영 정보를 불러올 수 없습니다.</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/mypage/schedule')}>
          목록으로
        </Button>
      </div>
    );
  }

  const shootingDate = parseISO(shooting.shootingDate);
  const bidCount = shooting._count?.bids ?? 0;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push('/mypage/schedule')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-[18px] text-black font-bold">
              {shooting.clientName} - {shooting.venueName}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ShootingTypeBadge type={shooting.shootingType} />
              <ShootingStatusBadge status={shooting.status} />
            </div>
          </div>
        </div>

        {/* 수정 & 상태 변경 & 삭제 버튼 */}
        <div className="flex items-center gap-2">
          {!['completed', 'cancelled'].includes(shooting.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/mypage/schedule/${shooting.id}/edit`)}
              className="text-[13px]"
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              수정
            </Button>
          )}
          {['draft', 'cancelled'].includes(shooting.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-[13px] text-red-500 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              삭제
            </Button>
          )}
          {availableTransitions.map((nextStatus) => (
            <Button
              key={nextStatus}
              variant={nextStatus === 'cancelled' ? 'outline' : 'default'}
              size="sm"
              onClick={() => handleStatusChange(nextStatus)}
              className={cn(
                'text-[13px]',
                nextStatus === 'cancelled' && 'text-red-500 border-red-200 hover:bg-red-50'
              )}
            >
              {STATUS_ACTION_LABELS[nextStatus]}
            </Button>
          ))}
        </div>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[14px] text-black font-bold">촬영 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 날짜/시간 */}
            <div className="flex items-start gap-2.5">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[12px] text-gray-500">촬영일시</p>
                <p className="text-[14px] text-black font-normal">
                  {format(shootingDate, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
                </p>
                <p className="text-[14px] text-black font-normal">
                  {format(shootingDate, 'HH:mm')}
                  {shooting.duration && ` (약 ${shooting.duration}분)`}
                </p>
              </div>
            </div>

            {/* 장소 */}
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[12px] text-gray-500">장소</p>
                <p className="text-[14px] text-black font-normal">
                  {shooting.venueName || '-'}
                  {(shooting.venueFloor || shooting.venueHall) && (
                    <span className="text-gray-500">
                      {' '}({[shooting.venueFloor, shooting.venueHall].filter(Boolean).join(' ')})
                    </span>
                  )}
                </p>
                {shooting.venueAddress && (
                  <p className="text-[12px] text-gray-500">{shooting.venueAddress}</p>
                )}
              </div>
            </div>

            {/* 고객 */}
            <div className="flex items-start gap-2.5">
              <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[12px] text-gray-500">고객</p>
                <p className="text-[14px] text-black font-normal">
                  {shooting.clientName || '-'}
                </p>
              </div>
            </div>

            {/* 작가 */}
            <div className="flex items-start gap-2.5">
              <Camera className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[12px] text-gray-500">배정 작가</p>
                <p className="text-[14px] text-black font-normal">
                  {shooting.assignedStaff?.name || '미배정'}
                </p>
              </div>
            </div>

            {/* 등록 업체 / 담당자 */}
            {shooting.creator && (
              <div className="flex items-start gap-2.5 sm:col-span-2">
                <Building2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[12px] text-gray-500">등록자</p>
                  <p className="text-[14px] text-black font-normal">
                    {shooting.creator.memberType === 'business' && shooting.creator.representative
                      ? `${shooting.creator.clientName}(${shooting.creator.representative})`
                      : shooting.creator.clientName}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 메모 */}
          {shooting.notes && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-[12px] text-gray-500 mb-1">메모</p>
                <p className="text-[14px] text-black font-normal whitespace-pre-wrap">
                  {shooting.notes}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 응찰 현황 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[14px] text-black font-bold">
            응찰 현황
            {bidCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-[11px]">
                {bidCount}건
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <User className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-[13px] text-gray-400">아직 응찰자가 없습니다.</p>
            <p className="text-[12px] text-gray-400 mt-1">
              모집 시작 후 작가들이 응찰할 수 있습니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 고객 리뷰 */}
      {shooting.status === 'completed' && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[14px] text-black font-bold flex items-center gap-1.5">
                <Star className="h-4 w-4" />
                고객 리뷰
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="text-[12px]"
                onClick={() => {
                  toast({
                    title: '설문 발송',
                    description: '고객에게 설문 링크가 발송되었습니다.',
                  });
                }}
              >
                <Send className="h-3 w-3 mr-1" />
                설문 발송
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <Star className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-[13px] text-gray-400">아직 리뷰가 없습니다.</p>
              <p className="text-[12px] text-gray-400 mt-1">
                촬영 완료 후 고객에게 설문을 발송하세요.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 상태 변경 확인 다이얼로그 */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">상태 변경</DialogTitle>
            <DialogDescription className="text-[14px]">
              {pendingStatus && (
                <>
                  상태를{' '}
                  <span className="font-medium text-black">
                    {SHOOTING_STATUS_LABELS[pendingStatus]}
                  </span>
                  (으)로 변경합니다.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label className="text-[14px] text-black font-normal">메모 (선택)</Label>
            <Textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="상태 변경 사유를 입력해주세요"
              rows={3}
              className="text-[14px]"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              className="text-[14px]"
            >
              취소
            </Button>
            <Button
              onClick={confirmStatusChange}
              disabled={updateStatusMutation.isPending}
              className={cn(
                'text-[14px]',
                pendingStatus === 'cancelled' && 'bg-red-600 hover:bg-red-700'
              )}
            >
              {updateStatusMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">일정 삭제</DialogTitle>
            <DialogDescription className="text-[14px]">
              이 촬영 일정을 삭제하면 복구할 수 없습니다. 정말 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
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
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

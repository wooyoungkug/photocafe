'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ArrowLeft,
  Camera,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  MessageSquare,
  Navigation,
  Star,
  Send,
  Loader2,
  AlertCircle,
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
import { useAuthStore } from '@/stores/auth-store';
import {
  useShooting,
  useUpdateShootingStatus,
} from '@/hooks/use-shooting';
import type { ShootingStatus } from '@/hooks/use-shooting';
import { SHOOTING_STATUS_LABELS } from '@/hooks/use-shooting';
import { ShootingStatusBadge } from '@/components/shooting/shooting-status-badge';
import { ShootingTypeBadge } from '@/components/shooting/shooting-type-badge';
import { BidCard, type ShootingBid } from '@/components/shooting/bid-card';
import { StarRating } from '@/components/shooting/star-rating';

// ==================== 상태 전이 규칙 ====================

const STATUS_TRANSITIONS: Record<ShootingStatus, ShootingStatus[]> = {
  draft: ['published', 'cancelled'],
  published: ['bidding', 'cancelled'],
  bidding: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const STATUS_ACTION_LABELS: Record<ShootingStatus, string> = {
  draft: '초안',
  published: '공고 발행',
  bidding: '응찰 시작',
  confirmed: '작가 확정',
  in_progress: '촬영 시작',
  completed: '촬영 완료',
  cancelled: '취소',
};

// ==================== 페이지 컴포넌트 ====================

export default function ShootingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();
  const shootingId = params.id as string;

  // 상태
  const [statusNote, setStatusNote] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ShootingStatus | null>(null);

  // 데이터 조회
  const { data: shooting, isLoading, error } = useShooting(shootingId);
  const updateStatusMutation = useUpdateShootingStatus();

  // 가능한 상태 전이
  const availableTransitions = useMemo(() => {
    if (!shooting) return [];
    return STATUS_TRANSITIONS[shooting.status] || [];
  }, [shooting]);

  // 상태 변경 핸들러
  const handleStatusChange = useCallback(
    (newStatus: ShootingStatus) => {
      setPendingStatus(newStatus);
      setStatusNote('');
      setStatusDialogOpen(true);
    },
    []
  );

  const confirmStatusChange = useCallback(async () => {
    if (!pendingStatus || !shooting) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: shooting.id,
        status: pendingStatus,
        note: statusNote || undefined,
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
        <Button variant="outline" onClick={() => router.push('/shooting')}>
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/shooting')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-[24px] text-black font-normal">{shooting.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <ShootingTypeBadge type={shooting.type} />
              <ShootingStatusBadge status={shooting.status} />
            </div>
          </div>
        </div>

        {/* 상태 변경 버튼 */}
        <div className="flex items-center gap-2">
          {availableTransitions.map((nextStatus) => (
            <Button
              key={nextStatus}
              variant={nextStatus === 'cancelled' ? 'outline' : 'default'}
              onClick={() => handleStatusChange(nextStatus)}
              className={cn(
                'text-[14px]',
                nextStatus === 'cancelled' && 'text-red-500 border-red-200 hover:bg-red-50'
              )}
            >
              {STATUS_ACTION_LABELS[nextStatus]}
            </Button>
          ))}
          {shooting.status === 'completed' && (
            <Button
              variant="outline"
              onClick={() => {
                // 설문 발송 기능
                toast({
                  title: '설문 발송',
                  description: '고객에게 설문 링크가 발송되었습니다.',
                });
              }}
              className="text-[14px]"
            >
              <Send className="h-4 w-4 mr-1.5" />
              설문 발송
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 기본 정보 + GPS 로그 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[18px] text-black font-bold">촬영 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 날짜/시간 */}
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[12px] text-gray-500">촬영일시</p>
                    <p className="text-[14px] text-black font-normal">
                      {format(parseISO(shooting.scheduledDate), 'yyyy년 M월 d일 (EEEE)', {
                        locale: ko,
                      })}
                    </p>
                    {shooting.scheduledTime && (
                      <p className="text-[14px] text-black font-normal">
                        {shooting.scheduledTime.substring(0, 5)}
                        {shooting.estimatedDuration &&
                          ` (약 ${shooting.estimatedDuration}분)`}
                      </p>
                    )}
                  </div>
                </div>

                {/* 장소 */}
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[12px] text-gray-500">장소</p>
                    <p className="text-[14px] text-black font-normal">
                      {shooting.location || '-'}
                    </p>
                    {shooting.locationAddress && (
                      <p className="text-[12px] text-gray-500">{shooting.locationAddress}</p>
                    )}
                  </div>
                </div>

                {/* 고객 */}
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[12px] text-gray-500">고객</p>
                    <p className="text-[14px] text-black font-normal">
                      {shooting.clientName || '-'}
                    </p>
                  </div>
                </div>

                {/* 작가 */}
                <div className="flex items-start gap-3">
                  <Camera className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[12px] text-gray-500">배정 작가</p>
                    <p className="text-[14px] text-black font-normal">
                      {shooting.photographerName || '미배정'}
                    </p>
                  </div>
                </div>

                {/* 예산 */}
                {shooting.budget !== undefined && shooting.budget > 0 && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[12px] text-gray-500">예산</p>
                      <p className="text-[14px] text-black font-normal">
                        {new Intl.NumberFormat('ko-KR').format(shooting.budget)}원
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 설명 */}
              {shooting.description && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-[12px] text-gray-500 mb-1">설명</p>
                    <p className="text-[14px] text-black font-normal whitespace-pre-wrap">
                      {shooting.description}
                    </p>
                  </div>
                </>
              )}

              {/* 요구사항 */}
              {shooting.requirements && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-[12px] text-gray-500 mb-1">요구사항</p>
                    <p className="text-[14px] text-black font-normal whitespace-pre-wrap">
                      {shooting.requirements}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* GPS 위치 로그 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                GPS 위치 로그
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GpsLogTable shootingId={shootingId} />
            </CardContent>
          </Card>
        </div>

        {/* 우측: 응찰자 목록 + 리뷰 */}
        <div className="space-y-6">
          {/* 응찰자 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[18px] text-black font-bold">
                응찰 현황
                {shooting.bidCount !== undefined && shooting.bidCount > 0 && (
                  <Badge variant="secondary" className="ml-2 text-[11px]">
                    {shooting.bidCount}건
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BidList shootingId={shootingId} />
            </CardContent>
          </Card>

          {/* 고객 리뷰 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
                <Star className="h-5 w-5" />
                고객 리뷰
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewSection shootingId={shootingId} />
            </CardContent>
          </Card>
        </div>
      </div>

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
    </div>
  );
}

// ==================== GPS 로그 서브컴포넌트 ====================

function GpsLogTable({ shootingId }: { shootingId: string }) {
  // TODO: useShootingLocation(shootingId) 훅 연결
  // 임시 빈 상태 표시
  return (
    <div className="text-center py-6">
      <Navigation className="h-8 w-8 text-gray-200 mx-auto mb-2" />
      <p className="text-[14px] text-gray-400">기록된 위치 로그가 없습니다.</p>
      <p className="text-[12px] text-gray-400 mt-1">
        촬영 진행 중 작가의 GPS 위치가 자동으로 기록됩니다.
      </p>
    </div>
  );
}

// ==================== 응찰자 목록 서브컴포넌트 ====================

function BidList({ shootingId }: { shootingId: string }) {
  // TODO: useShootingBids(shootingId) 훅 연결
  // 임시 빈 상태 표시
  return (
    <div className="text-center py-6">
      <User className="h-8 w-8 text-gray-200 mx-auto mb-2" />
      <p className="text-[14px] text-gray-400">아직 응찰자가 없습니다.</p>
      <p className="text-[12px] text-gray-400 mt-1">
        공고 발행 후 작가들이 응찰할 수 있습니다.
      </p>
    </div>
  );
}

// ==================== 리뷰 서브컴포넌트 ====================

function ReviewSection({ shootingId }: { shootingId: string }) {
  // TODO: useShootingReview(shootingId) 훅 연결
  // 임시 빈 상태 표시
  return (
    <div className="text-center py-6">
      <Star className="h-8 w-8 text-gray-200 mx-auto mb-2" />
      <p className="text-[14px] text-gray-400">아직 리뷰가 없습니다.</p>
      <p className="text-[12px] text-gray-400 mt-1">
        촬영 완료 후 고객에게 설문을 발송하세요.
      </p>
    </div>
  );
}

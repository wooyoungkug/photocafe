'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Clock,
  MapPin,
  Wallet,
  User,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Send,
  Globe,
  Lock,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
  Link2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import { useRecruitment, usePublishPrivate, useGoPublic } from '@/hooks/use-recruitment';
import { useRecruitmentBids, useCreateBid, useSelectBid, useRejectBid } from '@/hooks/use-recruitment-bid';
import { useRecruitmentNotifications, useResendNotifications } from '@/hooks/use-photographer-profile';
import {
  SHOOTING_TYPE_LABELS,
  RECRUITMENT_STATUS_LABELS,
  URGENCY_LABELS,
  URGENCY_COLORS,
} from '@/lib/types/recruitment';
import type { RecruitmentBid } from '@/lib/types/recruitment';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// 상태 배지 스타일
const STATUS_BADGE_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  private_recruiting: 'bg-blue-100 text-blue-700',
  public_recruiting: 'bg-green-100 text-green-700',
  filled: 'bg-purple-100 text-purple-700',
  expired: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-500',
};

// 긴급도 배지 스타일
const URGENCY_BADGE_STYLES: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-600',
  urgent: 'bg-orange-100 text-orange-700',
  emergency: 'bg-red-100 text-red-700',
};

// 응찰 상태 배지
const BID_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: '대기중', className: 'bg-yellow-100 text-yellow-700' },
  selected: { label: '확정', className: 'bg-green-100 text-green-700' },
  rejected: { label: '거절', className: 'bg-red-100 text-red-500' },
};

const DEADLINE_OPTIONS = [
  { value: 0, label: '즉시 (공개 모집)' },
  { value: 6, label: '6시간' },
  { value: 12, label: '12시간' },
  { value: 24, label: '24시간' },
  { value: 48, label: '48시간' },
];

export default function RecruitmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { user } = useAuthStore();

  // 데이터 조회
  const { data: recruitment, isLoading } = useRecruitment(id);
  const { data: bids, isLoading: isBidsLoading } = useRecruitmentBids(id);
  const { data: notificationData } = useRecruitmentNotifications(id);

  // 뮤테이션
  const publishPrivateMutation = usePublishPrivate();
  const goPublicMutation = useGoPublic();
  const resendMutation = useResendNotifications(id);
  const createBidMutation = useCreateBid();
  const selectBidMutation = useSelectBid();
  const rejectBidMutation = useRejectBid();

  // 전속 모집 시작 관련
  const [privateDeadlineHours, setPrivateDeadlineHours] = useState(24);

  // 응찰 폼
  const [bidMessage, setBidMessage] = useState('');
  const [bidBudget, setBidBudget] = useState('');

  // 거절 다이얼로그
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; bidId: string; bidderName: string }>({
    open: false,
    bidId: '',
    bidderName: '',
  });
  const [rejectReason, setRejectReason] = useState('');

  // 확정 다이얼로그
  const [selectDialog, setSelectDialog] = useState<{ open: boolean; bidId: string; bidderName: string }>({
    open: false,
    bidId: '',
    bidderName: '',
  });

  // 소유자 판별
  const isOwner = recruitment?.clientId === user?.clientId;

  // 이미 응찰했는지 확인
  const myBid = bids?.find((b) => b.bidderId === user?.clientId);

  // 확정된 응찰자
  const selectedBid = bids?.find((b) => b.status === 'selected');

  // 전속 모집 시작
  const handlePublishPrivate = async () => {
    try {
      await publishPrivateMutation.mutateAsync({
        id,
        privateDeadlineHours,
      });
      toast({
        title: '전속 모집 시작',
        description: `${privateDeadlineHours}시간 동안 전속 모집이 진행됩니다.`,
      });
    } catch (error: any) {
      toast({
        title: '모집 시작 실패',
        description: error?.message || '전속 모집 시작 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 공개 전환
  const handleGoPublic = async () => {
    try {
      await goPublicMutation.mutateAsync(id);
      toast({
        title: '공개 전환 완료',
        description: '공개 구인방으로 전환되었습니다.',
      });
    } catch (error: any) {
      toast({
        title: '공개 전환 실패',
        description: error?.message || '공개 전환 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 응찰 제출
  const handleSubmitBid = async () => {
    try {
      await createBidMutation.mutateAsync({
        recruitmentId: id,
        data: {
          message: bidMessage || undefined,
          proposedBudget: bidBudget ? Number(bidBudget) : undefined,
        },
      });
      toast({
        title: '응찰 완료',
        description: '응찰이 성공적으로 제출되었습니다.',
      });
      setBidMessage('');
      setBidBudget('');
    } catch (error: any) {
      toast({
        title: '응찰 실패',
        description: error?.message || '응찰 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 응찰 확정
  const handleSelectBid = async () => {
    try {
      await selectBidMutation.mutateAsync({
        recruitmentId: id,
        bidId: selectDialog.bidId,
      });
      toast({
        title: '작가 확정',
        description: `${selectDialog.bidderName}님을 촬영 작가로 확정했습니다.`,
      });
      setSelectDialog({ open: false, bidId: '', bidderName: '' });
    } catch (error: any) {
      toast({
        title: '확정 실패',
        description: error?.message || '작가 확정 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 응찰 거절
  const handleRejectBid = async () => {
    try {
      await rejectBidMutation.mutateAsync({
        recruitmentId: id,
        bidId: rejectDialog.bidId,
        reason: rejectReason || undefined,
      });
      toast({
        title: '응찰 거절',
        description: `${rejectDialog.bidderName}님의 응찰을 거절했습니다.`,
      });
      setRejectDialog({ open: false, bidId: '', bidderName: '' });
      setRejectReason('');
    } catch (error: any) {
      toast({
        title: '거절 실패',
        description: error?.message || '응찰 거절 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!recruitment) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-[18px] text-black font-bold">구인 정보</h2>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-[16px] font-medium text-gray-900 mb-2">구인 정보를 찾을 수 없습니다</h3>
            <p className="text-[13px] text-gray-500 mb-4">삭제되었거나 잘못된 접근입니다</p>
            <Button variant="outline" onClick={() => router.push('/mypage/recruitment')}>
              목록으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Briefcase className="h-5 w-5 text-gray-700" />
        <h2 className="text-[18px] text-black font-bold">구인 상세</h2>
      </div>

      {/* 구인 정보 카드 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <Badge className={cn('text-[11px]', STATUS_BADGE_STYLES[recruitment.status])}>
              {RECRUITMENT_STATUS_LABELS[recruitment.status]}
            </Badge>
            <Badge className={cn('text-[11px]', URGENCY_BADGE_STYLES[recruitment.urgencyLevel])}>
              {URGENCY_LABELS[recruitment.urgencyLevel]}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {SHOOTING_TYPE_LABELS[recruitment.shootingType]}
            </Badge>
            {recruitment.recruitmentPhase === 'private' && (
              <Badge variant="outline" className="text-[11px] border-blue-300 text-blue-600">
                <Lock className="h-3 w-3 mr-0.5" />
                전속
              </Badge>
            )}
            {recruitment.recruitmentPhase === 'public' && (
              <Badge variant="outline" className="text-[11px] border-green-300 text-green-600">
                <Globe className="h-3 w-3 mr-0.5" />
                공개
              </Badge>
            )}
          </div>
          <CardTitle className="text-[18px] text-black font-bold">
            {recruitment.title}
          </CardTitle>
          <p className="text-[12px] text-gray-400 mt-1">
            등록: {format(new Date(recruitment.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
            {' | '}등록자: {recruitment.client?.clientName}
          </p>
          {/* 일정관리 연동 배지 */}
          {recruitment.linkedShootingId && (
            <div className="flex items-center gap-1.5 mt-2 text-[12px] text-blue-600">
              <Link2 className="h-3.5 w-3.5" />
              <span>일정관리 연동됨</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 기본 정보 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] text-gray-500">촬영일</p>
                <p className="text-[14px] text-black font-normal">
                  {format(new Date(recruitment.shootingDate), 'yyyy.MM.dd (EEE)', { locale: ko })}
                </p>
              </div>
            </div>
            {recruitment.shootingTime && (
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] text-gray-500">촬영시간</p>
                  <p className="text-[14px] text-black font-normal">
                    {recruitment.shootingTime.substring(0, 5)}
                    {recruitment.duration ? ` (${recruitment.duration}분)` : ''}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] text-gray-500">장소</p>
                <p className="text-[14px] text-black font-normal">{recruitment.venueName}</p>
                {recruitment.venueAddress && (
                  <p className="text-[12px] text-gray-500">{recruitment.venueAddress}</p>
                )}
              </div>
            </div>
            {recruitment.budget != null && recruitment.budget > 0 && (
              <div className="flex items-start gap-2">
                <Wallet className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] text-gray-500">보수</p>
                  <p className="text-[14px] text-black font-bold">
                    {Number(recruitment.budget).toLocaleString()}원
                  </p>
                </div>
              </div>
            )}
            {recruitment.customerName && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] text-gray-500">고객명</p>
                  <p className="text-[14px] text-black font-normal">{recruitment.customerName}</p>
                </div>
              </div>
            )}
          </div>

          {/* 설명 / 요구사항 */}
          {recruitment.description && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                  <p className="text-[13px] font-medium text-gray-700">상세설명</p>
                </div>
                <p className="text-[14px] text-black font-normal whitespace-pre-wrap leading-relaxed">
                  {recruitment.description}
                </p>
              </div>
            </>
          )}
          {recruitment.requirements && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                  <p className="text-[13px] font-medium text-gray-700">요구사항</p>
                </div>
                <p className="text-[14px] text-black font-normal whitespace-pre-wrap leading-relaxed">
                  {recruitment.requirements}
                </p>
              </div>
            </>
          )}

          {/* 전속 마감 시간 */}
          {recruitment.privateDeadline && (
            <>
              <Separator />
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                <p className="text-[13px] text-gray-600">
                  전속 모집 마감:{' '}
                  <span className="font-medium text-black">
                    {format(new Date(recruitment.privateDeadline), 'yyyy.MM.dd HH:mm', { locale: ko })}
                  </span>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 소유자: 액션 영역 */}
      {isOwner && (
        <>
          {/* draft 상태: 모집 시작 버튼 */}
          {recruitment.status === 'draft' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[14px] font-bold">모집 시작</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium">전속 모집 마감 시간</Label>
                    <Select
                      value={String(privateDeadlineHours)}
                      onValueChange={(v) => setPrivateDeadlineHours(Number(v))}
                    >
                      <SelectTrigger className="text-[14px] w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEADLINE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePublishPrivate}
                    disabled={publishPrivateMutation.isPending}
                    className="text-[13px]"
                  >
                    {publishPrivateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4 mr-1" />
                    )}
                    전속 모집 시작
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGoPublic}
                    disabled={goPublicMutation.isPending}
                    className="text-[13px]"
                  >
                    {goPublicMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Globe className="h-4 w-4 mr-1" />
                    )}
                    바로 공개
                  </Button>
                </div>
                <p className="text-[12px] text-gray-500">
                  * 전속 모집: 기존 거래 작가에게만 구인 노출. 마감 시간 후 자동 공개 전환됩니다.
                </p>
              </CardContent>
            </Card>
          )}

          {/* private/public_recruiting: 응찰자 목록 */}
          {(recruitment.status === 'private_recruiting' || recruitment.status === 'public_recruiting') && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[14px] font-bold flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    응찰자 목록 ({bids?.length ?? 0}명)
                  </CardTitle>
                  {recruitment.status === 'private_recruiting' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGoPublic}
                      disabled={goPublicMutation.isPending}
                      className="text-[12px]"
                    >
                      {goPublicMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Globe className="h-3.5 w-3.5 mr-1" />
                      )}
                      공개 전환
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isBidsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : bids && bids.length > 0 ? (
                  <div className="space-y-3">
                    {bids.map((bid) => (
                      <BidCard
                        key={bid.id}
                        bid={bid}
                        onSelect={() =>
                          setSelectDialog({
                            open: true,
                            bidId: bid.id,
                            bidderName: bid.bidder?.clientName || '알 수 없음',
                          })
                        }
                        onReject={() =>
                          setRejectDialog({
                            open: true,
                            bidId: bid.id,
                            bidderName: bid.bidder?.clientName || '알 수 없음',
                          })
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-gray-200 mb-2" />
                    <p className="text-[13px] text-gray-400">아직 응찰자가 없습니다</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 알림 발송 현황 (public_recruiting 이상) */}
          {notificationData && notificationData.summary.total > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[14px] font-bold flex items-center gap-1.5">
                    <Send className="h-4 w-4" />
                    알림 발송 현황
                  </CardTitle>
                  {(recruitment.status === 'public_recruiting') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resendMutation.mutate()}
                      disabled={resendMutation.isPending}
                      className="text-[12px]"
                    >
                      {resendMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5 mr-1" />
                      )}
                      재발송
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] text-black font-bold">총 발송</span>
                    <span className="text-[14px] text-black font-bold">{notificationData.summary.total}명</span>
                  </div>
                  <div className="space-y-1 ml-4">
                    {notificationData.summary.tier1Count > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] text-black font-normal">├ 1순위 지역</span>
                        <span className="text-[14px] text-black font-normal">{notificationData.summary.tier1Count}명</span>
                      </div>
                    )}
                    {notificationData.summary.tier2Count > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] text-black font-normal">├ 2순위 지역</span>
                        <span className="text-[14px] text-black font-normal">{notificationData.summary.tier2Count}명</span>
                      </div>
                    )}
                    {notificationData.summary.tier3Count > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] text-black font-normal">└ 3순위 지역</span>
                        <span className="text-[14px] text-black font-normal">{notificationData.summary.tier3Count}명</span>
                      </div>
                    )}
                  </div>
                  {notificationData.summary.failedCount > 0 && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[14px] text-red-600">발송 실패</span>
                      <span className="text-[14px] text-red-600">{notificationData.summary.failedCount}명</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* filled: 확정된 작가 정보 */}
          {recruitment.status === 'filled' && selectedBid && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[14px] font-bold flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  확정된 작가
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center">
                      <User className="h-5 w-5 text-green-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] text-black font-bold">
                        {selectedBid.bidder?.clientName}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {selectedBid.bidder?.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-[12px] text-gray-600">{selectedBid.bidder.phone}</span>
                          </div>
                        )}
                        {selectedBid.bidder?.mobile && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-[12px] text-gray-600">{selectedBid.bidder.mobile}</span>
                          </div>
                        )}
                        {selectedBid.bidder?.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="text-[12px] text-gray-600">{selectedBid.bidder.email}</span>
                          </div>
                        )}
                      </div>
                      {selectedBid.proposedBudget != null && (
                        <p className="text-[13px] text-green-700 font-medium mt-1">
                          제안 금액: {Number(selectedBid.proposedBudget).toLocaleString()}원
                        </p>
                      )}
                      {selectedBid.message && (
                        <p className="text-[13px] text-gray-600 mt-1">{selectedBid.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* 방문자(비소유자): 응찰 영역 */}
      {!isOwner && (recruitment.status === 'private_recruiting' || recruitment.status === 'public_recruiting') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] font-bold flex items-center gap-1.5">
              <Send className="h-4 w-4" />
              {myBid ? '내 응찰 정보' : '응찰하기'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myBid ? (
              // 이미 응찰한 경우: 상태 표시
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-medium text-gray-700">응찰 상태</p>
                  <Badge className={cn('text-[11px]', BID_STATUS_STYLES[myBid.status].className)}>
                    {BID_STATUS_STYLES[myBid.status].label}
                  </Badge>
                </div>
                {myBid.proposedBudget != null && (
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[12px] text-gray-500">제안 금액</p>
                    <p className="text-[14px] text-black font-medium">
                      {Number(myBid.proposedBudget).toLocaleString()}원
                    </p>
                  </div>
                )}
                {myBid.message && (
                  <div className="mt-2">
                    <p className="text-[12px] text-gray-500 mb-1">메시지</p>
                    <p className="text-[13px] text-gray-700 whitespace-pre-wrap">{myBid.message}</p>
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-2">
                  응찰일: {format(new Date(myBid.bidAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                </p>
              </div>
            ) : (
              // 응찰 폼
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">메시지</Label>
                  <Textarea
                    value={bidMessage}
                    onChange={(e) => setBidMessage(e.target.value)}
                    placeholder="자기소개 및 촬영 경력 등을 입력해주세요"
                    rows={4}
                    className="text-[14px] resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">제안 금액 (원)</Label>
                  <Input
                    type="number"
                    value={bidBudget}
                    onChange={(e) => setBidBudget(e.target.value)}
                    placeholder="희망 보수를 입력해주세요"
                    className="text-[14px]"
                  />
                </div>
                <Button
                  onClick={handleSubmitBid}
                  disabled={createBidMutation.isPending}
                  className="text-[13px] w-full"
                >
                  {createBidMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      응찰 중...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      응찰하기
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 방문자: filled 상태에서 자신이 확정된 경우 */}
      {!isOwner && recruitment.status === 'filled' && myBid?.status === 'selected' && (
        <Card>
          <CardContent className="py-6 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
            <h3 className="text-[16px] font-bold text-green-700 mb-1">축하합니다!</h3>
            <p className="text-[14px] text-gray-600">촬영 작가로 확정되었습니다.</p>
          </CardContent>
        </Card>
      )}

      {/* 확정 다이얼로그 */}
      <Dialog open={selectDialog.open} onOpenChange={(open) => setSelectDialog({ ...selectDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>작가 확정</DialogTitle>
            <DialogDescription>
              <strong>{selectDialog.bidderName}</strong>님을 촬영 작가로 확정하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <p className="text-[12px] text-gray-500">
            * 확정 후에는 다른 응찰은 자동으로 거절 처리되며, 구인 상태가 "확정"으로 변경됩니다.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectDialog({ open: false, bidId: '', bidderName: '' })}
              disabled={selectBidMutation.isPending}
            >
              취소
            </Button>
            <Button onClick={handleSelectBid} disabled={selectBidMutation.isPending}>
              {selectBidMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  확정 중...
                </>
              ) : (
                '확정'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 거절 다이얼로그 */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>응찰 거절</DialogTitle>
            <DialogDescription>
              <strong>{rejectDialog.bidderName}</strong>님의 응찰을 거절하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">거절 사유 (선택)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 입력해주세요"
              rows={3}
              className="text-[14px] resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog({ open: false, bidId: '', bidderName: '' });
                setRejectReason('');
              }}
              disabled={rejectBidMutation.isPending}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectBid}
              disabled={rejectBidMutation.isPending}
            >
              {rejectBidMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  거절 중...
                </>
              ) : (
                '거절'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 응찰자 카드 컴포넌트
function BidCard({
  bid,
  onSelect,
  onReject,
}: {
  bid: RecruitmentBid;
  onSelect: () => void;
  onReject: () => void;
}) {
  const statusStyle = BID_STATUS_STYLES[bid.status];

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-gray-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[14px] text-black font-bold truncate">
                {bid.bidder?.clientName || '알 수 없음'}
              </p>
              <Badge className={cn('text-[10px] shrink-0', statusStyle.className)}>
                {statusStyle.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {bid.bidder?.phone && (
                <span className="text-[11px] text-gray-500">{bid.bidder.phone}</span>
              )}
              {bid.bidder?.mobile && (
                <span className="text-[11px] text-gray-500">{bid.bidder.mobile}</span>
              )}
            </div>
          </div>
        </div>

        {/* 액션 버튼 (pending 상태일 때만) */}
        {bid.status === 'pending' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={onSelect}
              className="text-[12px] h-8 px-3"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              확정
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              className="text-[12px] h-8 px-3 text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              거절
            </Button>
          </div>
        )}
      </div>

      {/* 제안금액 + 메시지 */}
      <div className="mt-2 ml-12">
        {bid.proposedBudget != null && (
          <p className="text-[13px] text-blue-700 font-medium">
            제안 금액: {Number(bid.proposedBudget).toLocaleString()}원
          </p>
        )}
        {bid.message && (
          <p className="text-[13px] text-gray-600 mt-1 whitespace-pre-wrap">{bid.message}</p>
        )}
        <p className="text-[11px] text-gray-400 mt-1">
          {format(new Date(bid.bidAt), 'MM.dd HH:mm', { locale: ko })}
        </p>
      </div>
    </div>
  );
}

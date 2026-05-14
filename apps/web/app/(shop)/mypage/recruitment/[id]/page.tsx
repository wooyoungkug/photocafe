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
  Award,
  TrendingUp,
  Sparkles,
  Heart,
  Copy,
  Star,
  MessageSquare,
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
  CREW_SIZE_LABELS,
} from '@/lib/types/recruitment';
import type { RecruitmentBid, RecruitmentCrewSize } from '@/lib/types/recruitment';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BidChatPanel } from '@/components/recruitment/bid-chat-panel';
import { useChatUnread } from '@/hooks/use-recruitment-chat';

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

// 응찰 메시지 빠른입력 프리셋 (그룹별)
const BID_PRESETS: { group: string; items: { label: string; text: string }[] }[] = [
  {
    group: '경력',
    items: [
      { label: '경력 3년+', text: '본식/스냅 촬영 경력 3년 이상입니다.' },
      { label: '경력 5년+', text: '결혼/리허설 촬영 경력 5년 이상의 베테랑입니다.' },
      { label: '경력 10년+', text: '10년 이상 다수의 본식 촬영을 진행해온 전문가입니다.' },
      { label: '본식 100건+', text: '본식 100건 이상 촬영 경험이 있습니다.' },
    ],
  },
  {
    group: '장비',
    items: [
      { label: '풀프레임 보유', text: '풀프레임 미러리스 및 단렌즈 다수 보유.' },
      { label: '4K 동영상', text: '4K 동영상 촬영 가능합니다.' },
      { label: '드론 보유', text: '드론 촬영 가능합니다 (옥외/허가 구역).' },
      { label: '조명 장비', text: '실내 보조 조명 장비 지참합니다.' },
      { label: '백업 장비', text: '바디 2대 + 예비 렌즈 백업 장비 항시 지참.' },
    ],
  },
  {
    group: '스타일',
    items: [
      { label: '자연광 위주', text: '자연광 위주의 따뜻한 분위기로 촬영합니다.' },
      { label: '감성 스냅', text: '감성적인 스냅 스타일로 자연스럽게 담아드립니다.' },
      { label: '클래식 정통', text: '클래식한 정통 본식 컷 위주로 촬영합니다.' },
      { label: '다큐멘터리', text: '다큐멘터리 스타일로 현장감 있게 촬영합니다.' },
    ],
  },
  {
    group: '서비스',
    items: [
      { label: '당일 미리보기', text: '촬영 당일 셀렉 미리보기 30컷 제공 가능합니다.' },
      { label: '빠른 보정 (2주)', text: '보정본 2주 이내 납품 가능합니다.' },
      { label: '원본 전체 제공', text: '원본 전체 + 보정본 제공 가능합니다.' },
      { label: '재촬영 보장', text: '결과물 미흡 시 재촬영을 보장해드립니다.' },
    ],
  },
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
  const [bidCrewSize, setBidCrewSize] = useState<RecruitmentCrewSize | ''>('');

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

  // 채팅 패널
  const [chatBidId, setChatBidId] = useState<string | null>(null);
  const [chatBidderName, setChatBidderName] = useState('');

  // 소유자 판별
  const isOwner = recruitment?.clientId === user?.clientId;

  // 이미 응찰했는지 확인
  const myBid = bids?.find((b) => b.bidderId === user?.clientId);

  // 확정된 응찰자
  const selectedBid = bids?.find((b) => b.status === 'selected');

  // 비오너(응찰자) 입장에서 내 응찰 채팅 미읽음 여부
  const myBidUnread = useChatUnread(myBid?.id ?? null, user?.clientId ?? '');

  // 촬영일(예식일)이 지났는지 — 날짜 단위 비교, 당일은 허용
  const isPastShootingDate = (() => {
    if (!recruitment?.shootingDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shootingDay = new Date(recruitment.shootingDate);
    shootingDay.setHours(0, 0, 0, 0);
    return shootingDay.getTime() < today.getTime();
  })();

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
        description: '공개 촬영파트너로 전환되었습니다.',
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
    const allowedSizes = (recruitment?.crewSizes ?? []) as RecruitmentCrewSize[];
    let crewSize: RecruitmentCrewSize | undefined;
    if (allowedSizes.length === 1) {
      crewSize = allowedSizes[0];
    } else if (allowedSizes.length > 1) {
      if (!bidCrewSize) {
        toast({
          title: '옵션 선택 필요',
          description: '1인/2인 촬영 중 응찰할 옵션을 선택해주세요.',
          variant: 'destructive',
        });
        return;
      }
      crewSize = bidCrewSize;
    }
    try {
      await createBidMutation.mutateAsync({
        recruitmentId: id,
        data: {
          message: bidMessage || undefined,
          proposedBudget: bidBudget ? Number(bidBudget) : undefined,
          crewSize,
        },
      });
      toast({
        title: '응찰 완료',
        description: '응찰이 성공적으로 제출되었습니다.',
      });
      setBidMessage('');
      setBidBudget('');
      setBidCrewSize('');
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
            {(() => {
              const sizes = (recruitment.crewSizes ?? []) as RecruitmentCrewSize[];
              const hasSplit =
                sizes.length > 0 &&
                ((sizes.includes('solo') && recruitment.budgetSolo != null) ||
                  (sizes.includes('duo') && recruitment.budgetDuo != null));
              if (hasSplit) {
                return (
                  <div className="flex items-start gap-2">
                    <Wallet className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-[12px] text-gray-500">보수</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {sizes.includes('solo') && recruitment.budgetSolo != null && (
                          <p className="text-[14px] text-black font-bold">
                            1인 {Number(recruitment.budgetSolo).toLocaleString()}원
                          </p>
                        )}
                        {sizes.includes('duo') && recruitment.budgetDuo != null && (
                          <p className="text-[14px] text-black font-bold">
                            2인 {Number(recruitment.budgetDuo).toLocaleString()}원
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              if (recruitment.budget != null && recruitment.budget > 0) {
                return (
                  <div className="flex items-start gap-2">
                    <Wallet className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[12px] text-gray-500">보수</p>
                      <p className="text-[14px] text-black font-bold">
                        {Number(recruitment.budget).toLocaleString()}원
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
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
                        myClientId={user?.clientId ?? ''}
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
                        onChat={() => {
                          setChatBidId(bid.id);
                          setChatBidderName(bid.bidder?.clientName || '작가');
                        }}
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
              {myBid ? '내 응찰 정보' : isPastShootingDate ? '응찰 마감' : '응찰하기'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!myBid && isPastShootingDate ? (
              // 촬영일 경과: 응찰 불가 안내
              <div className="p-4 bg-gray-50 rounded-lg border text-center">
                <AlertCircle className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p className="text-[14px] text-black font-medium mb-1">
                  촬영일이 지나 응찰할 수 없습니다
                </p>
                <p className="text-[12px] text-gray-500">
                  촬영일: {format(new Date(recruitment.shootingDate), 'yyyy.MM.dd (EEE)', { locale: ko })}
                </p>
              </div>
            ) : myBid ? (
              // 이미 응찰한 경우: 1행으로 요약 표시
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center flex-wrap gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] text-gray-500">응찰자</p>
                    <p className="text-[13px] text-black font-medium">
                      {myBid.bidder?.clientName || '-'}
                    </p>
                    {myBid.bidderStats?.tier && (
                      <Badge className={cn('text-[10px] px-1.5 py-0', {
                        'bg-gray-100 text-gray-600': myBid.bidderStats.tier === 'NEW',
                        'bg-orange-100 text-orange-700': myBid.bidderStats.tier === 'BRONZE',
                        'bg-slate-100 text-slate-600': myBid.bidderStats.tier === 'SILVER',
                        'bg-amber-100 text-amber-700': myBid.bidderStats.tier === 'GOLD',
                        'bg-violet-100 text-violet-700': myBid.bidderStats.tier === 'PLATINUM',
                      })}>
                        {myBid.bidderStats.tier === 'NEW' ? '신규' :
                         myBid.bidderStats.tier === 'BRONZE' ? '브론즈' :
                         myBid.bidderStats.tier === 'SILVER' ? '실버' :
                         myBid.bidderStats.tier === 'GOLD' ? '골드' : '플래티넘'} 작가
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] text-gray-500">상태</p>
                    <Badge className={cn('text-[11px]', BID_STATUS_STYLES[myBid.status].className)}>
                      {BID_STATUS_STYLES[myBid.status].label}
                    </Badge>
                  </div>
                  {myBid.crewSize && (
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] text-gray-500">인원</p>
                      <Badge className="text-[11px] bg-red-50 text-red-700 border border-red-200">
                        {CREW_SIZE_LABELS[myBid.crewSize]}
                      </Badge>
                    </div>
                  )}
                  {myBid.proposedBudget != null && (
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] text-gray-500">제안 금액</p>
                      <p className="text-[13px] text-black font-medium">
                        {Number(myBid.proposedBudget).toLocaleString()}원
                      </p>
                    </div>
                  )}
                  {myBid.bidderStats && (
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-gray-400">선택</span>
                      <span className="text-black font-medium">{myBid.bidderStats.selectedCount}회</span>
                      <span className="text-gray-300 mx-0.5">·</span>
                      <span className="text-gray-400">응찰</span>
                      <span className="text-black font-medium">{myBid.bidderStats.totalBids}회</span>
                      {myBid.bidderStats.totalBids > 0 && (
                        <>
                          <span className="text-gray-300 mx-0.5">·</span>
                          <span className="text-gray-400">채택률</span>
                          <span className="text-black font-medium">
                            {Math.round((myBid.bidderStats.selectedCount / myBid.bidderStats.totalBids) * 100)}%
                          </span>
                        </>
                      )}
                      <span className="text-gray-300 mx-0.5">·</span>
                      <span className="text-gray-400">좋아요</span>
                      <span className="text-black font-medium">{myBid.bidderStats.likedCount}개</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 ml-auto">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] text-gray-500">응찰일</p>
                      <p className="text-[12px] text-gray-600">
                        {format(new Date(myBid.bidAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                      </p>
                    </div>
                    <div className="relative inline-flex">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'text-[12px] h-7 px-2.5',
                          myBidUnread && 'border-red-400 text-red-600',
                        )}
                        onClick={() => {
                          setChatBidId(myBid.id);
                          setChatBidderName(recruitment.client?.clientName || '스튜디오');
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        채팅
                      </Button>
                      {myBidUnread && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none z-10">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {myBid.message && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-[12px] text-gray-500 mb-1">메시지</p>
                    <p className="text-[13px] text-gray-700 whitespace-pre-wrap">{myBid.message}</p>
                  </div>
                )}
              </div>
            ) : (
              // 응찰 폼
              <div className="space-y-4">
                {(() => {
                  const sizes = (recruitment.crewSizes ?? []) as RecruitmentCrewSize[];
                  if (sizes.length === 0) return null;
                  return (
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">촬영 인원 선택</Label>
                      {sizes.length === 1 ? (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-gray-50">
                          <Badge className="bg-red-50 text-red-700 border-red-200 text-[12px]">
                            {CREW_SIZE_LABELS[sizes[0]]}
                          </Badge>
                          <span className="text-[12px] text-gray-500">
                            보수 {(sizes[0] === 'solo'
                              ? recruitment.budgetSolo
                              : recruitment.budgetDuo
                            )?.toLocaleString() ?? '-'}
                            원
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {sizes.map((s) => {
                            const isSelected = bidCrewSize === s;
                            const budget =
                              s === 'solo' ? recruitment.budgetSolo : recruitment.budgetDuo;
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setBidCrewSize(s)}
                                className={cn(
                                  'flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors',
                                  isSelected
                                    ? 'border-red-600 bg-red-50'
                                    : 'border-gray-200 hover:border-gray-300',
                                )}
                              >
                                <span className="text-[13px] font-medium text-black">
                                  {CREW_SIZE_LABELS[s]}
                                </span>
                                <span className="text-[12px] text-gray-500">
                                  보수 {budget?.toLocaleString() ?? '-'}원
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[13px] font-medium">자기소개 메시지</Label>
                    {bidMessage && (
                      <button
                        type="button"
                        onClick={() => setBidMessage('')}
                        className="text-[11px] text-gray-400 hover:text-gray-600"
                      >
                        지우기
                      </button>
                    )}
                  </div>

                  {/* 빠른입력 프리셋 (숨고 스타일) */}
                  <div className="rounded-lg border bg-gradient-to-br from-gray-50 to-white p-2.5 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" />
                      <p className="text-[11px] font-bold text-gray-700">
                        빠른 자기소개 — 태그를 클릭하면 자동 입력됩니다
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {BID_PRESETS.map((group) => (
                        <div key={group.group} className="flex items-start gap-2">
                          <span className="text-[10px] font-bold text-gray-400 shrink-0 w-10 pt-1">
                            {group.group}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {group.items.map((p) => {
                              const alreadyIncluded = bidMessage.includes(p.text);
                              return (
                                <button
                                  key={p.label}
                                  type="button"
                                  onClick={() => {
                                    if (alreadyIncluded) {
                                      const removed = bidMessage
                                        .split('\n')
                                        .filter((line) => line.trim() !== p.text.trim())
                                        .join('\n')
                                        .trim();
                                      setBidMessage(removed);
                                    } else {
                                      const newText = bidMessage
                                        ? `${bidMessage}\n${p.text}`
                                        : p.text;
                                      setBidMessage(newText);
                                    }
                                  }}
                                  className={cn(
                                    'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                                    alreadyIncluded
                                      ? 'bg-red-600 text-white border-red-600'
                                      : 'bg-white text-gray-700 border-gray-200 hover:border-red-400 hover:text-red-600',
                                  )}
                                >
                                  {alreadyIncluded ? '✓ ' : '+ '}
                                  {p.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Textarea
                    value={bidMessage}
                    onChange={(e) => setBidMessage(e.target.value)}
                    placeholder="태그를 클릭하거나 직접 입력해주세요"
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
            * 다른 응찰자의 응찰은 자동으로 거절처리되며, 구인 상태가 "확정"으로 변경됩니다.
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

      {/* 채팅 패널 */}
      <BidChatPanel
        open={!!chatBidId}
        onClose={() => setChatBidId(null)}
        bidId={chatBidId ?? ''}
        bidderName={chatBidderName}
        myClientId={user?.clientId ?? ''}
      />

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

// 응찰자 카드 컴포넌트 (숨고 스타일)
function BidCard({
  bid,
  myClientId,
  onSelect,
  onReject,
  onChat,
}: {
  bid: RecruitmentBid;
  myClientId: string;
  onSelect: () => void;
  onReject: () => void;
  onChat: () => void;
}) {
  const { toast } = useToast();
  const hasUnread = useChatUnread(bid.id, myClientId);
  const statusStyle = BID_STATUS_STYLES[bid.status];
  const stats = bid.bidderStats;
  const selectedCount = stats?.selectedCount ?? 0;
  const totalBids = stats?.totalBids ?? 0;
  const rejectedCount = stats?.rejectedCount ?? 0;
  const cancelledCount = stats?.cancelledCount ?? 0;
  const likedCount = stats?.likedCount ?? 0;

  const copyReviewUrl = () => {
    if (!bid.review?.reviewToken) return;
    const url = `${window.location.origin}/bid-review/${bid.review.reviewToken}`;
    navigator.clipboard.writeText(url);
    toast({
      title: '리뷰 링크 복사됨',
      description: '신랑신부님께 이 링크를 전달해주세요',
    });
  };

  // 신뢰도 등급 산정 (선택 횟수 기준)
  const tier = (() => {
    if (selectedCount >= 30) return { label: '플래티넘 작가', cls: 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white', hasStar: true };
    if (selectedCount >= 10) return { label: '골드 작가', cls: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white', hasStar: true };
    if (selectedCount >= 3) return { label: '실버 작가', cls: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white', hasStar: true };
    if (selectedCount >= 1) return { label: '브론즈 작가', cls: 'bg-gradient-to-r from-orange-300 to-orange-400 text-white', hasStar: true };
    return { label: '신규 작가', cls: 'bg-gray-100 text-gray-600', hasStar: false };
  })();

  return (
    <div className="p-4 border rounded-xl hover:border-gray-300 hover:shadow-sm transition-all bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* 프로필 이미지 */}
          <div className="relative h-12 w-12 shrink-0">
            {bid.bidder?.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bid.bidder.profileImage}
                alt={bid.bidder.clientName}
                className="h-12 w-12 rounded-full object-cover border"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <User className="h-5 w-5 text-gray-400" />
              </div>
            )}
            {tier?.hasStar && (
              <div
                className={cn(
                  'absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow',
                  tier.cls,
                )}
                title={`${tier.label} 등급`}
              >
                ★
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* 이름 + 상태 + 인원 */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[15px] text-black font-bold truncate">
                {bid.bidder?.clientName || '알 수 없음'}
              </p>
              <Badge className={cn('text-[10px] shrink-0', statusStyle.className)}>
                {statusStyle.label}
              </Badge>
              {bid.crewSize && (
                <Badge className="text-[10px] shrink-0 bg-red-50 text-red-700 border border-red-200">
                  {CREW_SIZE_LABELS[bid.crewSize]}
                </Badge>
              )}
              {tier && (
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0', tier.cls)}>
                  {tier.label}
                </span>
              )}
            </div>

            {/* 신뢰도 통계 (숨고 스타일) */}
            {stats && (
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1 text-[12px]">
                  <Award className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-gray-500">선택</span>
                  <span className="text-black font-bold">{selectedCount}</span>
                  <span className="text-gray-500">회</span>
                </div>
                <div className="flex items-center gap-1 text-[12px]">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-gray-500">응찰</span>
                  <span className="text-black font-bold">{totalBids}</span>
                  <span className="text-gray-500">회</span>
                </div>
                <div className="flex items-center gap-1 text-[12px]">
                  <Heart className="h-3.5 w-3.5 text-pink-500 fill-pink-500" />
                  <span className="text-gray-500">좋아요</span>
                  <span className="text-black font-bold">{likedCount}</span>
                </div>
                <div className="flex items-center gap-1 text-[12px]">
                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-gray-500">거절</span>
                  <span className="text-black font-bold">{rejectedCount}</span>
                  <span className="text-gray-500">회</span>
                </div>
                <div className="flex items-center gap-1 text-[12px]">
                  <XCircle className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-gray-500">취소</span>
                  <span className="text-black font-bold">{cancelledCount}</span>
                  <span className="text-gray-500">회</span>
                </div>
                {totalBids > 0 && (
                  <div className="flex items-center gap-1 text-[12px]">
                    <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" />
                    <span className="text-gray-500">채택률</span>
                    <span className="text-black font-bold">
                      {Math.round((selectedCount / totalBids) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 연락처 */}
            <div className="flex items-center gap-3 mt-1.5">
              {bid.bidder?.mobile && (
                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {bid.bidder.mobile}
                </span>
              )}
              {bid.bidder?.phone && !bid.bidder?.mobile && (
                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {bid.bidder.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative inline-flex">
            <Button
              variant="outline"
              size="sm"
              onClick={onChat}
              className={cn(
                'text-[12px] h-8 px-3',
                hasUnread && 'border-red-400 text-red-600',
              )}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              채팅
            </Button>
            {hasUnread && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none z-10">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            )}
          </div>
          {bid.status === 'pending' && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* 제안금액 + 메시지 */}
      {(bid.proposedBudget != null || bid.message) && (
        <div className="mt-3 pt-3 border-t border-gray-100 ml-15 pl-1">
          {bid.proposedBudget != null && (
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-[13px] text-emerald-700 font-bold">
                제안 금액 {Number(bid.proposedBudget).toLocaleString()}원
              </p>
            </div>
          )}
          {bid.message && (
            <p className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed">
              {bid.message}
            </p>
          )}
        </div>
      )}

      {/* 선택된 응찰 - 고객 리뷰 영역 */}
      {bid.status === 'selected' && bid.review && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {bid.review.isCompleted ? (
            // 리뷰 완료
            <div className="p-3 rounded-lg bg-gradient-to-br from-pink-50 to-fuchsia-50 border border-pink-100">
              <div className="flex items-start gap-2">
                <Heart className="h-4 w-4 text-pink-500 fill-pink-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[12px] font-bold text-pink-700">
                      신랑신부 후기
                    </p>
                    {bid.review.rating != null && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn(
                              'h-3 w-3',
                              n <= (bid.review!.rating ?? 0)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-200',
                            )}
                          />
                        ))}
                      </div>
                    )}
                    {bid.review.reviewerName && (
                      <span className="text-[11px] text-gray-500">
                        — {bid.review.reviewerName}
                      </span>
                    )}
                  </div>
                  {bid.review.comment && (
                    <p className="text-[12px] text-gray-700 mt-1 whitespace-pre-wrap">
                      {bid.review.comment}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // 리뷰 미완료 - URL 복사 버튼
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-1.5 min-w-0">
                <Heart className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                <p className="text-[12px] text-gray-700 truncate">
                  신랑신부 리뷰 대기 중
                </p>
              </div>
              <button
                type="button"
                onClick={copyReviewUrl}
                className="flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-100 px-2 py-1 rounded shrink-0"
              >
                <Copy className="h-3 w-3" />
                리뷰 링크 복사
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-400 mt-2 text-right">
        {format(new Date(bid.bidAt), 'MM.dd HH:mm', { locale: ko })}
      </p>
    </div>
  );
}

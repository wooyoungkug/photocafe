'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ArrowLeft,
  Send,
  Vote,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  FileText,
  Gavel,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
  useHrAgenda,
  useSubmitHrAgenda,
  useCastVote,
  useMakeDecision,
} from '@/hooks/use-hr-committee';

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

const VOTE_LABELS: Record<string, string> = {
  APPROVE: '찬성',
  REJECT: '반대',
  ABSTAIN: '기권',
};

const VOTE_ICONS: Record<string, typeof CheckCircle2> = {
  APPROVE: CheckCircle2,
  REJECT: XCircle,
  ABSTAIN: MinusCircle,
};

const VOTE_COLORS: Record<string, string> = {
  APPROVE: 'text-green-600',
  REJECT: 'text-red-600',
  ABSTAIN: 'text-gray-500',
};

// ==================== 페이지 컴포넌트 ====================

export default function AgendaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const agendaId = params.id as string;

  // 투표 다이얼로그
  const [isVoteOpen, setIsVoteOpen] = useState(false);
  const [voteValue, setVoteValue] = useState<string>('');
  const [voteComment, setVoteComment] = useState('');

  // 의결 폼
  const [decisionResult, setDecisionResult] = useState<string>('');
  const [decisionSummary, setDecisionSummary] = useState('');
  const [decisionEffectiveDate, setDecisionEffectiveDate] = useState('');

  // Query
  const { data: agenda, isLoading } = useHrAgenda(agendaId);

  // Mutations
  const submitMutation = useSubmitHrAgenda();
  const voteMutation = useCastVote();
  const decisionMutation = useMakeDecision();

  // 제출 처리
  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync(agendaId);
      toast({ title: '제출 완료', description: '안건이 제출되었습니다.' });
    } catch {
      toast({ title: '제출 실패', variant: 'destructive' });
    }
  };

  // 투표 처리
  const handleVote = async () => {
    if (!voteValue) {
      toast({ title: '오류', description: '투표를 선택하세요.', variant: 'destructive' });
      return;
    }
    try {
      await voteMutation.mutateAsync({
        agendaId,
        vote: voteValue as 'APPROVE' | 'REJECT' | 'ABSTAIN',
        comment: voteComment.trim() || undefined,
      });
      toast({ title: '투표 완료', description: '투표가 등록되었습니다.' });
      setIsVoteOpen(false);
      setVoteValue('');
      setVoteComment('');
    } catch {
      toast({ title: '투표 실패', variant: 'destructive' });
    }
  };

  // 의결 처리
  const handleDecision = async () => {
    if (!decisionResult) {
      toast({ title: '오류', description: '의결 결과를 선택하세요.', variant: 'destructive' });
      return;
    }
    try {
      await decisionMutation.mutateAsync({
        agendaId,
        decision: decisionResult as 'APPROVED' | 'REJECTED',
        summary: decisionSummary.trim() || undefined,
        effectiveDate: decisionEffectiveDate || undefined,
      });
      toast({ title: '의결 완료', description: '최종 의결이 등록되었습니다.' });
    } catch {
      toast({ title: '의결 실패', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!agenda) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FileText className="h-12 w-12 text-gray-300 mb-3" />
        <p className="text-[14px] text-black font-normal">안건을 찾을 수 없습니다.</p>
        <Button
          variant="outline"
          onClick={() => router.push('/hr-committee/agendas')}
          className="mt-4 text-[14px]"
        >
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const votes = agenda.votes || [];
  const approveCount = votes.filter((v) => v.vote === 'APPROVE').length;
  const rejectCount = votes.filter((v) => v.vote === 'REJECT').length;
  const abstainCount = votes.filter((v) => v.vote === 'ABSTAIN').length;

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="안건 상세"
        breadcrumbs={[
          { label: '인사위원회', href: '/hr-committee' },
          { label: '안건 목록', href: '/hr-committee/agendas' },
          { label: agenda.title },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/hr-committee/agendas')}
            className="text-[14px]"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            목록
          </Button>
        }
      />

      <div className="space-y-4">
        {/* 안건 정보 카드 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[18px] text-black font-bold">{agenda.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={AGENDA_TYPE_COLORS[agenda.type]}>
                  {AGENDA_TYPE_LABELS[agenda.type]}
                </Badge>
                <Badge variant="secondary" className={AGENDA_STATUS_COLORS[agenda.status]}>
                  {AGENDA_STATUS_LABELS[agenda.status]}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {agenda.description && (
              <div>
                <p className="text-[14px] text-black font-bold mb-1">설명</p>
                <p className="text-[14px] text-black font-normal whitespace-pre-wrap">
                  {agenda.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[14px] text-black font-bold mb-1">대상 직원</p>
                <p className="text-[14px] text-black font-normal">
                  {agenda.targetStaff?.name || '-'}
                </p>
              </div>
              <div>
                <p className="text-[14px] text-black font-bold mb-1">위원회</p>
                <p className="text-[14px] text-black font-normal">
                  {agenda.committee?.name || '-'}
                </p>
              </div>
              <div>
                <p className="text-[14px] text-black font-bold mb-1">등록일</p>
                <p className="text-[14px] text-black font-normal">
                  {format(new Date(agenda.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                </p>
              </div>
            </div>

            {agenda.evidence && (
              <div>
                <p className="text-[14px] text-black font-bold mb-1">증빙자료</p>
                <p className="text-[14px] text-black font-normal whitespace-pre-wrap">
                  {agenda.evidence}
                </p>
              </div>
            )}

            {/* 제출 버튼 (DRAFT 상태에서만) */}
            {agenda.status === 'DRAFT' && (
              <div className="pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="text-[14px]"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-1.5" />
                  )}
                  안건 제출
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 투표 섹션 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[18px] text-black font-bold">투표 현황</CardTitle>
              {['SUBMITTED', 'IN_REVIEW'].includes(agenda.status) && (
                <Button
                  onClick={() => setIsVoteOpen(true)}
                  variant="outline"
                  className="text-[14px]"
                >
                  <Vote className="h-4 w-4 mr-1.5" />
                  투표하기
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* 투표 집계 */}
            <div className="flex items-center gap-6 mb-4">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-[14px] text-black font-normal">찬성 {approveCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-[14px] text-black font-normal">반대 {rejectCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MinusCircle className="h-4 w-4 text-gray-500" />
                <span className="text-[14px] text-black font-normal">기권 {abstainCount}</span>
              </div>
            </div>

            <Separator className="mb-3" />

            {/* 투표 목록 */}
            {votes.length === 0 ? (
              <p className="text-[14px] text-black font-normal text-center py-6">
                아직 투표가 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {votes.map((vote) => {
                  const VoteIcon = VOTE_ICONS[vote.vote];
                  return (
                    <div
                      key={vote.id}
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-start gap-2">
                        <VoteIcon className={`h-5 w-5 mt-0.5 ${VOTE_COLORS[vote.vote]}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] text-black font-bold">
                              {vote.voter?.name || '알 수 없음'}
                            </span>
                            <Badge variant="outline" className="text-[12px]">
                              {VOTE_LABELS[vote.vote]}
                            </Badge>
                          </div>
                          {vote.comment && (
                            <p className="text-[14px] text-black font-normal mt-1">
                              {vote.comment}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[14px] text-black font-normal whitespace-nowrap">
                        {format(new Date(vote.votedAt), 'MM.dd HH:mm')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 의결 섹션 */}
        {agenda.status === 'VOTED' && !agenda.decision && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[18px] text-black font-bold">
                <div className="flex items-center gap-2">
                  <Gavel className="h-5 w-5" />
                  최종 의결
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[14px] text-black font-normal">의결 결과 *</Label>
                <Select value={decisionResult} onValueChange={setDecisionResult}>
                  <SelectTrigger className="mt-1 text-[14px]">
                    <SelectValue placeholder="의결 결과를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVED">가결 (승인)</SelectItem>
                    <SelectItem value="REJECTED">부결 (반려)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[14px] text-black font-normal">의결 요약</Label>
                <Textarea
                  value={decisionSummary}
                  onChange={(e) => setDecisionSummary(e.target.value)}
                  placeholder="의결 내용을 요약하세요"
                  className="mt-1 text-[14px]"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-[14px] text-black font-normal">시행일</Label>
                <Input
                  type="date"
                  value={decisionEffectiveDate}
                  onChange={(e) => setDecisionEffectiveDate(e.target.value)}
                  className="mt-1 text-[14px] w-[200px]"
                />
              </div>
              <Button
                onClick={handleDecision}
                disabled={decisionMutation.isPending}
                className="text-[14px]"
              >
                {decisionMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                )}
                최종 의결 등록
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 종결된 안건 - 의결 결과 표시 */}
        {agenda.status === 'CLOSED' && agenda.decision && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[18px] text-black font-bold">
                <div className="flex items-center gap-2">
                  <Gavel className="h-5 w-5" />
                  최종 의결 결과
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className={
                    agenda.decision.decision === 'APPROVED'
                      ? 'bg-green-100 text-green-800 hover:bg-green-100'
                      : 'bg-red-100 text-red-800 hover:bg-red-100'
                  }
                >
                  {agenda.decision.decision === 'APPROVED' ? '가결 (승인)' : '부결 (반려)'}
                </Badge>
                {agenda.decision.effectiveDate && (
                  <span className="text-[14px] text-black font-normal">
                    시행일: {format(new Date(agenda.decision.effectiveDate), 'yyyy.MM.dd', { locale: ko })}
                  </span>
                )}
              </div>
              {agenda.decision.summary && (
                <div>
                  <p className="text-[14px] text-black font-bold mb-1">의결 요약</p>
                  <p className="text-[14px] text-black font-normal whitespace-pre-wrap">
                    {agenda.decision.summary}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[14px] text-black font-normal">
                  의결일: {format(new Date(agenda.decision.decidedAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 투표 다이얼로그 */}
      <Dialog open={isVoteOpen} onOpenChange={setIsVoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">투표</DialogTitle>
            <DialogDescription className="text-[14px]">
              안건에 대한 의견을 투표하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[14px] text-black font-normal">투표 *</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={voteValue === 'APPROVE' ? 'default' : 'outline'}
                  onClick={() => setVoteValue('APPROVE')}
                  className={`flex-1 text-[14px] ${voteValue === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  찬성
                </Button>
                <Button
                  type="button"
                  variant={voteValue === 'REJECT' ? 'default' : 'outline'}
                  onClick={() => setVoteValue('REJECT')}
                  className={`flex-1 text-[14px] ${voteValue === 'REJECT' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  반대
                </Button>
                <Button
                  type="button"
                  variant={voteValue === 'ABSTAIN' ? 'default' : 'outline'}
                  onClick={() => setVoteValue('ABSTAIN')}
                  className={`flex-1 text-[14px] ${voteValue === 'ABSTAIN' ? 'bg-gray-600 hover:bg-gray-700' : ''}`}
                >
                  <MinusCircle className="h-4 w-4 mr-1.5" />
                  기권
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">의견</Label>
              <Textarea
                value={voteComment}
                onChange={(e) => setVoteComment(e.target.value)}
                placeholder="투표 의견을 입력하세요 (선택)"
                className="mt-1 text-[14px]"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsVoteOpen(false)}
              className="text-[14px]"
            >
              취소
            </Button>
            <Button
              onClick={handleVote}
              disabled={voteMutation.isPending || !voteValue}
              className="text-[14px]"
            >
              {voteMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              투표하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  MessageSquare,
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Tag,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Plus,
  Send,
  Lightbulb,
  ThumbsUp,
  Loader2,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  useConsultation,
  useUpdateConsultationStatus,
  useResolveConsultation,
  useDeleteConsultation,
  useAddFollowUp,
  useRecommendedGuides,
  useMarkGuideUsed,
  useMarkGuideHelpful,
  useAutoTagConsultation,
  useConsultationTags,
  useAddTagsToConsultation,
} from '@/hooks/use-cs';
import { ConsultationStatus, FollowUpActionType } from '@/lib/types/cs';
import Link from 'next/link';

export default function ConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const consultationId = params.id as string;

  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  const [followUpContent, setFollowUpContent] = useState('');
  const [followUpActionType, setFollowUpActionType] = useState<FollowUpActionType>('phone');

  const { data: consultation, isLoading, error } = useConsultation(consultationId);
  const { data: recommendedGuides } = useRecommendedGuides(consultationId);
  const { data: allTags } = useConsultationTags();

  const updateStatus = useUpdateConsultationStatus();
  const resolveConsultation = useResolveConsultation();
  const deleteConsultation = useDeleteConsultation();
  const addFollowUp = useAddFollowUp();
  const markGuideUsed = useMarkGuideUsed();
  const markGuideHelpful = useMarkGuideHelpful();
  const autoTag = useAutoTagConsultation();
  const addTags = useAddTagsToConsultation();

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

  const actionTypeLabels: Record<string, string> = {
    phone: '전화',
    visit: '방문',
    email: '이메일',
    kakao: '카카오톡',
    other: '기타',
  };

  const handleStatusChange = async (status: ConsultationStatus) => {
    try {
      await updateStatus.mutateAsync({ id: consultationId, status });
      toast({ title: '상태가 변경되었습니다.' });
    } catch (error) {
      toast({ title: '상태 변경에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleResolve = async () => {
    if (!resolution.trim()) {
      toast({ title: '처리 내용을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      await resolveConsultation.mutateAsync({
        id: consultationId,
        resolution,
        resolvedBy: 'staff-1', // TODO: 실제 로그인한 직원
      });
      toast({ title: '상담이 해결 처리되었습니다.' });
      setIsResolveDialogOpen(false);
      setResolution('');
    } catch (error) {
      toast({ title: '처리에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleAddFollowUp = async () => {
    if (!followUpContent.trim()) {
      toast({ title: '후속 조치 내용을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      await addFollowUp.mutateAsync({
        consultationId,
        data: {
          content: followUpContent,
          actionType: followUpActionType,
          staffId: 'staff-1', // TODO: 실제 로그인한 직원
          staffName: '상담원', // TODO: 실제 로그인한 직원명
        },
      });
      toast({ title: '후속 조치가 등록되었습니다.' });
      setIsFollowUpDialogOpen(false);
      setFollowUpContent('');
    } catch (error) {
      toast({ title: '등록에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteConsultation.mutateAsync(consultationId);
      toast({ title: '상담이 삭제되었습니다.' });
      router.push('/cs/consultations');
    } catch (error) {
      toast({ title: '삭제에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleAutoTag = async () => {
    try {
      await autoTag.mutateAsync(consultationId);
      toast({ title: '자동 태깅이 완료되었습니다.' });
    } catch (error) {
      toast({ title: '자동 태깅에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleUseGuide = async (guideId: string) => {
    try {
      await markGuideUsed.mutateAsync(guideId);
      toast({ title: '가이드 사용이 기록되었습니다.' });
    } catch (error) {
      // 조용히 실패
    }
  };

  const handleGuideHelpful = async (guideId: string) => {
    try {
      await markGuideHelpful.mutateAsync(guideId);
      toast({ title: '감사합니다! 피드백이 기록되었습니다.' });
    } catch (error) {
      // 조용히 실패
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12 text-destructive">
          <AlertCircle className="h-5 w-5 mr-2" />
          상담 내역을 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className={priorityColors[consultation.priority]}>
                {priorityLabels[consultation.priority]}
              </Badge>
              <Badge variant="outline" className={statusColors[consultation.status]}>
                {statusLabels[consultation.status]}
              </Badge>
              <span className="text-sm text-muted-foreground font-mono">
                {consultation.consultNumber}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{consultation.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {consultation.status !== 'resolved' && consultation.status !== 'closed' && (
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setIsResolveDialogOpen(true)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              해결 처리
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                상태 변경 <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(statusLabels).map(([key, label]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleStatusChange(key as ConsultationStatus)}
                  disabled={key === consultation.status}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href={`/cs/consultations/${consultationId}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Button>
          </Link>
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 메인 콘텐츠 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 상담 내용 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                상담 내용
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 whitespace-pre-wrap">
                {consultation.content}
              </div>

              {consultation.resolution && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      처리 결과
                    </h4>
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200 whitespace-pre-wrap">
                      {consultation.resolution}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      해결: {consultation.resolvedAt && format(new Date(consultation.resolvedAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                    </p>
                  </div>
                </>
              )}

              {consultation.internalMemo && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-orange-700 mb-2">내부 메모</h4>
                    <div className="p-4 rounded-lg bg-orange-50 border border-orange-200 whitespace-pre-wrap text-sm">
                      {consultation.internalMemo}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 후속 조치 이력 */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  후속 조치 이력
                  <Badge variant="outline">{consultation.followUps?.length || 0}</Badge>
                </CardTitle>
                <Button size="sm" onClick={() => setIsFollowUpDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  조치 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {consultation.followUps && consultation.followUps.length > 0 ? (
                <div className="space-y-4">
                  {consultation.followUps.map((followUp) => (
                    <div
                      key={followUp.id}
                      className="p-4 rounded-lg border bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {actionTypeLabels[followUp.actionType]}
                          </Badge>
                          <span className="text-sm font-medium">{followUp.staffName}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(followUp.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{followUp.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  후속 조치 기록이 없습니다
                </div>
              )}
            </CardContent>
          </Card>

          {/* 추천 가이드 */}
          {recommendedGuides && recommendedGuides.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  추천 대처 가이드
                </CardTitle>
                <CardDescription>
                  상담 내용에 기반한 추천 가이드입니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recommendedGuides.map((guide) => (
                    <div
                      key={guide.id}
                      className="p-4 rounded-lg border bg-yellow-50/50 hover:bg-yellow-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{guide.title}</h4>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUseGuide(guide.id)}
                          >
                            사용
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGuideHelpful(guide.id)}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{guide.problem}</p>
                      <div className="p-3 rounded bg-white border">
                        <p className="text-sm font-medium text-green-700 mb-1">해결 방법</p>
                        <p className="text-sm">{guide.solution}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 사이드바 */}
        <div className="space-y-6">
          {/* 고객 정보 */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  고객 정보
                </CardTitle>
                <Link href={`/cs/clients/${consultation.clientId}/timeline`}>
                  <Button variant="ghost" size="sm">
                    360° 뷰 <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-lg">{consultation.client.clientName}</span>
                  <Badge variant="outline">{consultation.client.clientCode}</Badge>
                </div>
              </div>
              {consultation.client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {consultation.client.phone}
                </div>
              )}
              {consultation.client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {consultation.client.email}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 상담 정보 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                상담 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">분류</span>
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: consultation.category?.colorCode ? `${consultation.category.colorCode}20` : undefined,
                    borderColor: consultation.category?.colorCode,
                    color: consultation.category?.colorCode,
                  }}
                >
                  {consultation.category?.name}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">상담자</span>
                <span>{consultation.counselorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">상담일시</span>
                <span>{format(new Date(consultation.consultedAt), 'yyyy.MM.dd HH:mm', { locale: ko })}</span>
              </div>
              {consultation.orderNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">관련 주문</span>
                  <span className="font-mono">{consultation.orderNumber}</span>
                </div>
              )}
              {consultation.followUpDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">후속 조치일</span>
                  <span>{format(new Date(consultation.followUpDate), 'yyyy.MM.dd', { locale: ko })}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 태그 */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5 text-indigo-600" />
                  태그
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoTag}
                  disabled={autoTag.isPending}
                >
                  {autoTag.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    '자동 태깅'
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {consultation.tags && consultation.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {consultation.tags.map((tagMapping) => (
                    <Badge
                      key={tagMapping.id}
                      style={{
                        backgroundColor: tagMapping.tag.colorCode || undefined,
                      }}
                    >
                      {tagMapping.tag.name}
                      {tagMapping.isAutoTagged && (
                        <span className="ml-1 text-xs opacity-75">AI</span>
                      )}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  등록된 태그가 없습니다
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 해결 처리 다이얼로그 */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              상담 해결 처리
            </DialogTitle>
            <DialogDescription>
              처리 결과를 입력하고 상담을 해결 상태로 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resolution">처리 내용 *</Label>
              <Textarea
                id="resolution"
                placeholder="고객에게 어떻게 해결해 드렸는지 상세히 기록해주세요"
                rows={6}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
              취소
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleResolve}
              disabled={resolveConsultation.isPending}
            >
              {resolveConsultation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              해결 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 후속 조치 추가 다이얼로그 */}
      <Dialog open={isFollowUpDialogOpen} onOpenChange={setIsFollowUpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700">
              <Plus className="h-5 w-5" />
              후속 조치 추가
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>조치 유형</Label>
              <Select
                value={followUpActionType}
                onValueChange={(v) => setFollowUpActionType(v as FollowUpActionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(actionTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="followUpContent">조치 내용 *</Label>
              <Textarea
                id="followUpContent"
                placeholder="수행한 후속 조치 내용을 기록해주세요"
                rows={4}
                value={followUpContent}
                onChange={(e) => setFollowUpContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFollowUpDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleAddFollowUp}
              disabled={addFollowUp.isPending}
            >
              {addFollowUp.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              상담 삭제
            </DialogTitle>
            <DialogDescription>
              이 상담을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
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

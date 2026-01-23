'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  User,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building,
  Clock,
  MessageSquare,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Heart,
  Star,
  RefreshCw,
  Calendar,
  ChevronDown,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClientTimeline, useCustomerHealthScore, useCalculateHealthScore } from '@/hooks/use-cs';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ClientTimelinePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const clientId = params.clientId as string;

  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState<string>('all');

  const { data: timeline, isLoading } = useClientTimeline(clientId, {
    page,
    limit: 20,
    eventTypes: eventFilter !== 'all' ? [eventFilter] : undefined,
  });

  const { data: healthScore } = useCustomerHealthScore(clientId);
  const calculateHealth = useCalculateHealthScore();

  const handleRecalculateHealth = async () => {
    try {
      await calculateHealth.mutateAsync(clientId);
      toast({ title: '건강 점수가 재계산되었습니다.' });
    } catch (error) {
      toast({ title: '재계산에 실패했습니다.', variant: 'destructive' });
    }
  };

  const gradeColors: Record<string, string> = {
    A: 'bg-green-500',
    B: 'bg-blue-500',
    C: 'bg-yellow-500',
    D: 'bg-orange-500',
    F: 'bg-red-500',
  };

  const statusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-700',
    pending: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  const client = timeline?.client;
  const stats = timeline?.stats;

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6 text-blue-600" />
            고객 360° 뷰
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            고객의 모든 이력을 타임라인으로 확인합니다
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 사이드바 - 고객 정보 */}
        <div className="space-y-6">
          {/* 고객 프로필 */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">고객 정보</CardTitle>
                <Badge variant="outline">{client?.clientCode}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center pb-4 border-b">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                  {client?.clientName?.charAt(0)}
                </div>
                <h2 className="text-xl font-bold">{client?.clientName}</h2>
                {client?.group && (
                  <Badge variant="outline" className="mt-2">
                    {client.group.groupName}
                  </Badge>
                )}
              </div>

              <div className="space-y-3 text-sm">
                {client?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client?.mobile && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{client.mobile}</span>
                  </div>
                )}
                {client?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{client.email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 건강 점수 */}
          <Card className={healthScore?.isAtRisk ? 'border-red-200 bg-red-50/50' : ''}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-600" />
                  건강 점수
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRecalculateHealth}
                  disabled={calculateHealth.isPending}
                >
                  {calculateHealth.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
                  gradeColors[healthScore?.grade || 'C']
                }`}>
                  {healthScore?.grade || '-'}
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{healthScore?.totalScore || 0}</p>
                  <p className="text-sm text-muted-foreground">/ 100점</p>
                </div>
              </div>

              {healthScore?.isAtRisk && (
                <div className="p-3 rounded-lg bg-red-100 border border-red-200">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium text-sm">이탈 위험</span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">{healthScore.riskReason}</p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>클레임 점수</span>
                    <span className="font-medium">{healthScore?.claimScore || 0}</span>
                  </div>
                  <Progress value={healthScore?.claimScore || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>만족도</span>
                    <span className="font-medium">{healthScore?.satisfactionScore || 0}</span>
                  </div>
                  <Progress value={healthScore?.satisfactionScore || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>충성도</span>
                    <span className="font-medium">{healthScore?.loyaltyScore || 0}</span>
                  </div>
                  <Progress value={healthScore?.loyaltyScore || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>소통</span>
                    <span className="font-medium">{healthScore?.communicationScore || 0}</span>
                  </div>
                  <Progress value={healthScore?.communicationScore || 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 요약 통계 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                활동 요약
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-blue-50">
                  <p className="text-2xl font-bold text-blue-700">{stats?.totalOrders || 0}</p>
                  <p className="text-xs text-muted-foreground">총 주문</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-purple-50">
                  <p className="text-2xl font-bold text-purple-700">{stats?.totalConsultations || 0}</p>
                  <p className="text-xs text-muted-foreground">총 상담</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50">
                  <p className="text-2xl font-bold text-red-700">{stats?.claimCount || 0}</p>
                  <p className="text-xs text-muted-foreground">클레임</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-50">
                  <p className="text-sm font-medium text-green-700">
                    {stats?.lastOrderDate
                      ? format(new Date(stats.lastOrderDate), 'yy.MM.dd')
                      : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">마지막 주문</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 메인 - 타임라인 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  활동 타임라인
                </CardTitle>
                <Tabs value={eventFilter} onValueChange={setEventFilter}>
                  <TabsList>
                    <TabsTrigger value="all">전체</TabsTrigger>
                    <TabsTrigger value="consultation">상담</TabsTrigger>
                    <TabsTrigger value="order">주문</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {timeline?.timeline && timeline.timeline.length > 0 ? (
                <div className="relative">
                  {/* 타임라인 라인 */}
                  <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" />

                  <div className="space-y-6">
                    {timeline.timeline.map((event, index) => (
                      <div key={event.id} className="relative flex gap-4">
                        {/* 아이콘 */}
                        <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${
                          event.type === 'consultation'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {event.type === 'consultation' ? (
                            <MessageSquare className="h-5 w-5" />
                          ) : (
                            <ShoppingCart className="h-5 w-5" />
                          )}
                        </div>

                        {/* 콘텐츠 */}
                        <div className="flex-1 pb-6">
                          <div className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={statusColors[event.status] || ''}>
                                    {event.status === 'open' ? '접수' :
                                     event.status === 'in_progress' ? '처리중' :
                                     event.status === 'resolved' ? '해결' :
                                     event.status === 'closed' ? '종료' :
                                     event.status === 'pending' ? '대기' :
                                     event.status === 'completed' ? '완료' :
                                     event.status === 'cancelled' ? '취소' : event.status}
                                  </Badge>
                                  {event.priority && (
                                    <Badge className={
                                      event.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                                      event.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                                      'bg-gray-100 text-gray-600'
                                    }>
                                      {event.priority === 'urgent' ? '긴급' :
                                       event.priority === 'high' ? '높음' :
                                       event.priority === 'normal' ? '보통' : '낮음'}
                                    </Badge>
                                  )}
                                  {event.category && (
                                    <Badge
                                      variant="outline"
                                      style={{
                                        backgroundColor: event.category.colorCode ? `${event.category.colorCode}20` : undefined,
                                        borderColor: event.category.colorCode,
                                        color: event.category.colorCode,
                                      }}
                                    >
                                      {event.category.name}
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="font-medium">{event.title}</h4>
                              </div>
                              <div className="text-right text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {format(new Date(event.date), 'yyyy.MM.dd HH:mm', { locale: ko })}
                                </div>
                              </div>
                            </div>

                            {event.type === 'consultation' && event.data.content && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {event.data.content}
                              </p>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="text-xs text-muted-foreground">
                                {event.type === 'consultation' && event.data.counselorName && (
                                  <span>상담: {event.data.counselorName}</span>
                                )}
                                {event.type === 'order' && event.data.finalAmount && (
                                  <span>금액: {Number(event.data.finalAmount).toLocaleString()}원</span>
                                )}
                              </div>
                              <Link
                                href={event.type === 'consultation'
                                  ? `/cs/consultations/${event.id}`
                                  : `/orders/${event.id}`}
                              >
                                <Button variant="ghost" size="sm">
                                  상세보기 <ExternalLink className="h-3.5 w-3.5 ml-1" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  활동 이력이 없습니다
                </div>
              )}

              {/* 페이지네이션 */}
              {timeline?.meta && timeline.meta.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6 pt-6 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    이전
                  </Button>
                  <span className="flex items-center px-4 text-sm text-muted-foreground">
                    {page} / {timeline.meta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === timeline.meta.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    다음
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

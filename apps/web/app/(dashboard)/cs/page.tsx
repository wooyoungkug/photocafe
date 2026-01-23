'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Headphones,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  Bell,
  Heart,
  Star,
  Phone,
  Mail,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useCSDashboard, useAlerts, useAtRiskCustomers, useConsultations } from '@/hooks/use-cs';
import Link from 'next/link';

export default function CSDashboardPage() {
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: dashboard, isLoading: isDashboardLoading, refetch } = useCSDashboard(dateRange);
  const { data: alertsData } = useAlerts({ limit: 5, isResolved: false });
  const { data: atRiskCustomers } = useAtRiskCustomers();
  const { data: recentConsultations } = useConsultations({ limit: 5, status: 'open' });

  const stats = dashboard?.summary;
  const surveyStats = dashboard?.surveyStats;

  const statusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-700',
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600',
  };

  const alertLevelColors: Record<string, string> = {
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    critical: 'bg-red-50 border-red-200 text-red-700',
  };

  if (isDashboardLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Headphones className="h-6 w-6 text-blue-600" />
            CS 통합 관리
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            고객 상담 현황 및 분석 대시보드
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-36 h-8 text-sm"
            />
            <span className="text-muted-foreground">~</span>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-36 h-8 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">총 상담</p>
                <p className="text-3xl font-bold text-blue-700">{stats?.totalCount ?? 0}</p>
                <p className="text-xs text-blue-600 mt-1">
                  오늘 {stats?.todayCount ?? 0}건
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">처리 대기</p>
                <p className="text-3xl font-bold text-orange-700">
                  {(stats?.openCount ?? 0) + (stats?.inProgressCount ?? 0)}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  긴급 {stats?.urgentCount ?? 0}건
                </p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">해결 완료</p>
                <p className="text-3xl font-bold text-green-700">
                  {(stats?.resolvedCount ?? 0) + (stats?.closedCount ?? 0)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  평균 {stats?.avgResolutionTime ?? 0}분
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">주의 필요</p>
                <p className="text-3xl font-bold text-red-700">{stats?.unreadAlerts ?? 0}</p>
                <p className="text-xs text-red-600 mt-1">
                  이탈위험 {stats?.atRiskCustomers ?? 0}명
                </p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 보조 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">평균 만족도</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{surveyStats?.avgSatisfaction ?? 0}</span>
                  <span className="text-sm text-muted-foreground">/ 5.0</span>
                </div>
              </div>
            </div>
            <Progress value={(surveyStats?.avgSatisfaction ?? 0) * 20} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Heart className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">추천 의향</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{surveyStats?.recommendRate ?? 0}</span>
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>
            <Progress value={surveyStats?.recommendRate ?? 0} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-teal-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">설문 응답</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{surveyStats?.count ?? 0}</span>
                  <span className="text-sm text-muted-foreground">건</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 대기 상담 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                처리 대기 상담
              </CardTitle>
              <Link href="/cs/consultations">
                <Button variant="ghost" size="sm">
                  전체보기 <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentConsultations?.data && recentConsultations.data.length > 0 ? (
              <div className="space-y-3">
                {recentConsultations.data.map((consultation) => (
                  <Link
                    key={consultation.id}
                    href={`/cs/consultations/${consultation.id}`}
                    className="block p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={priorityColors[consultation.priority]}>
                            {consultation.priority === 'urgent' ? '긴급' :
                             consultation.priority === 'high' ? '높음' :
                             consultation.priority === 'normal' ? '보통' : '낮음'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {consultation.consultNumber}
                          </span>
                        </div>
                        <p className="font-medium truncate">{consultation.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {consultation.client.clientName} · {consultation.category?.name}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {format(new Date(consultation.consultedAt), 'MM/dd HH:mm', { locale: ko })}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                대기 중인 상담이 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* 알림 목록 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-600" />
                알림
                {(stats?.unreadAlerts ?? 0) > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {stats?.unreadAlerts}
                  </Badge>
                )}
              </CardTitle>
              <Link href="/cs/alerts">
                <Button variant="ghost" size="sm">
                  전체보기 <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {alertsData?.data && alertsData.data.length > 0 ? (
              <div className="space-y-3">
                {alertsData.data.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${alertLevelColors[alert.alertLevel]}`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
                        alert.alertLevel === 'critical' ? 'text-red-600' :
                        alert.alertLevel === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <p className="text-xs mt-1 line-clamp-2">{alert.message}</p>
                        <p className="text-xs mt-2 opacity-70">
                          {format(new Date(alert.createdAt), 'MM/dd HH:mm', { locale: ko })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                새로운 알림이 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 하단 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 카테고리별 통계 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5 text-indigo-600" />
              분류별 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard?.byCategory && dashboard.byCategory.length > 0 ? (
              <div className="space-y-3">
                {dashboard.byCategory.map((item) => (
                  <div key={item.categoryId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.category?.colorCode || '#6B7280' }}
                      />
                      <span className="text-sm">{item.category?.name || '미분류'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{
                            width: `${Math.min((item.count / (stats?.totalCount || 1)) * 100, 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{item.count}건</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* 이탈 위험 고객 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-red-600" />
                이탈 위험 고객
              </CardTitle>
              <Link href="/cs/at-risk">
                <Button variant="ghost" size="sm">
                  전체보기 <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {atRiskCustomers && atRiskCustomers.length > 0 ? (
              <div className="space-y-3">
                {atRiskCustomers.slice(0, 5).map((score) => (
                  <Link
                    key={score.id}
                    href={`/cs/clients/${score.clientId}/timeline`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                        score.grade === 'F' ? 'bg-red-500' :
                        score.grade === 'D' ? 'bg-orange-500' : 'bg-yellow-500'
                      }`}>
                        {score.grade}
                      </div>
                      <div>
                        <p className="font-medium">{score.client.clientName}</p>
                        <p className="text-xs text-muted-foreground">{score.riskReason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">{score.totalScore}점</p>
                      <p className="text-xs text-muted-foreground">건강점수</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                이탈 위험 고객이 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 빠른 메뉴 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/cs/consultations/new">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="font-medium">상담 등록</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/cs/guides">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="font-medium">상담 가이드</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/cs/tags">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Filter className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="font-medium">태그 관리</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/cs/settings">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="font-medium">SLA 설정</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

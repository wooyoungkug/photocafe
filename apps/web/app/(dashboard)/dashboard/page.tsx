"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboardSummary } from "@/hooks/use-statistics";
import {
  useBusinessUpgradeRequests,
  useProcessBusinessUpgrade,
  useClientBusinessCertUrl,
  type BusinessUpgradeRequest,
} from "@/hooks/use-admin-business-upgrade";
import { useCSDashboard, useConsultations } from "@/hooks/use-cs";
import {
  ShoppingCart,
  Factory,
  Truck,
  TrendingUp,
  Users,
  Package,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Building2,
  Check,
  X,
  FileText,
  ExternalLink,
  ArrowRight,
  Headphones,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export default function DashboardPage() {
  return <DashboardContent />;
}

const MEMBER_TYPE_LABEL: Record<string, string> = {
  individual: '개인',
  business: '사업자',
};
const OAUTH_LABEL: Record<string, string> = {
  naver: '네이버',
  kakao: '카카오',
  google: '구글',
};

function NewMembersSection({ summary }: { summary: any }) {
  const newClients = summary?.newClients;
  if (!newClients) return null;
  const recent: any[] = newClients.recent ?? [];

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-800 text-sm sm:text-base">
            <Users className="h-4 w-4 text-indigo-500" />
            신규회원 가입현황
          </CardTitle>
          <a href="/company/members" className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-800 transition-colors">
            전체보기 <ArrowRight className="h-3 w-3" />
          </a>
        </div>
        {/* 요약 배지 */}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[12px] text-slate-500">오늘 <strong className="text-indigo-600">{newClients.today}명</strong></span>
          <span className="text-slate-300">|</span>
          <span className="text-[12px] text-slate-500">이번 주 <strong className="text-indigo-600">{newClients.week}명</strong></span>
          <span className="text-slate-300">|</span>
          <span className="text-[12px] text-slate-500">이번 달 <strong className="text-indigo-600">{newClients.month}명</strong></span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {recent.length === 0 ? (
          <div className="py-8 text-center text-[14px] text-slate-400">
            <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            최근 신규가입 회원이 없습니다.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[13px]">회원명</TableHead>
                <TableHead className="text-[13px]">아이디/이메일</TableHead>
                <TableHead className="text-[13px]">연락처</TableHead>
                <TableHead className="text-[13px]">구분</TableHead>
                <TableHead className="text-[13px]">가입경로</TableHead>
                <TableHead className="text-[13px]">가입일시</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="text-[14px] font-medium">{c.clientName || '-'}</TableCell>
                  <TableCell className="text-[13px] text-slate-500">{c.email || '-'}</TableCell>
                  <TableCell className="text-[13px]">{c.mobile || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px]">
                      {MEMBER_TYPE_LABEL[c.memberType] ?? c.memberType ?? '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[13px]">
                    {c.oauthProvider ? (
                      <span className="text-indigo-600">{OAUTH_LABEL[c.oauthProvider] ?? c.oauthProvider}</span>
                    ) : '직접가입'}
                  </TableCell>
                  <TableCell className="text-[13px] text-slate-500">
                    {c.createdAt ? new Date(c.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function BusinessUpgradeSection() {
  const { data: requests, isLoading } = useBusinessUpgradeRequests('pending');
  const processUpgrade = useProcessBusinessUpgrade();
  const certUrl = useClientBusinessCertUrl();
  const [rejectTarget, setRejectTarget] = useState<BusinessUpgradeRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const list = requests ?? [];

  const handleApprove = async (id: string) => {
    setActionError(null);
    try {
      await processUpgrade.mutateAsync({ id, action: 'approve' });
    } catch {
      setActionError('승인 처리에 실패했습니다.');
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionError(null);
    try {
      await processUpgrade.mutateAsync({ id: rejectTarget.id, action: 'reject', rejectReason: rejectReason.trim() || undefined });
      setRejectTarget(null);
      setRejectReason('');
    } catch {
      setActionError('반려 처리에 실패했습니다.');
    }
  };

  const handleViewCert = async (id: string) => {
    try {
      const res = await certUrl.mutateAsync(id);
      window.open(res.url, '_blank', 'noopener');
    } catch {
      setActionError('등록증을 불러오지 못했습니다.');
    }
  };

  if (isLoading) return null;
  if (list.length === 0) return null;

  return (
    <>
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-white border-b pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-slate-800 text-sm sm:text-base">
              <Building2 className="h-4 w-4 text-amber-500" />
              사업자 전환 신청
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[11px] px-1.5 py-0">
                {list.length}건
              </Badge>
            </CardTitle>
            <a href="/company/members/business-upgrades" className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-800 transition-colors">
              전체보기 <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {actionError && (
            <div className="flex items-center gap-2 px-4 py-2 text-[13px] text-red-800 bg-red-50 border-b border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{actionError}</span>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[13px]">회원명</TableHead>
                <TableHead className="text-[13px]">사업자등록번호</TableHead>
                <TableHead className="text-[13px]">대표자</TableHead>
                <TableHead className="text-[13px]">신청일</TableHead>
                <TableHead className="text-[13px]">등록증</TableHead>
                <TableHead className="text-[13px] text-right">처리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="text-[14px] font-medium">{req.clientName || '-'}</TableCell>
                  <TableCell className="text-[14px]">{req.businessNumber || '-'}</TableCell>
                  <TableCell className="text-[14px]">{req.representative || '-'}</TableCell>
                  <TableCell className="text-[14px]">
                    {req.submittedAt ? new Date(req.submittedAt).toLocaleDateString('ko-KR') : '-'}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="h-7 text-[12px]"
                      onClick={() => handleViewCert(req.id)} disabled={certUrl.isPending}>
                      <FileText className="h-3 w-3 mr-1" />보기
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" className="h-7 text-[12px] bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApprove(req.id)} disabled={processUpgrade.isPending}>
                        <Check className="h-3 w-3 mr-1" />승인
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[12px] border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => { setRejectTarget(req); setRejectReason(''); }} disabled={processUpgrade.isPending}>
                        <X className="h-3 w-3 mr-1" />반려
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">신청 반려</DialogTitle>
            <DialogDescription className="text-[14px] text-black font-normal">
              {rejectTarget?.clientName ? `${rejectTarget.clientName} 회원의 ` : ''}사업자 전환 신청을 반려합니다.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
            placeholder="반려 사유 (예: 사업자등록증 식별 불가)" className="text-[14px] min-h-[80px]" />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={processUpgrade.isPending}>취소</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processUpgrade.isPending}>반려</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const CS_STATUS_LABEL: Record<string, string> = {
  open: '접수',
  in_progress: '진행중',
  resolved: '해결',
  closed: '종료',
};
const CS_STATUS_CLASS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-700',
};
const CS_PRIORITY_LABEL: Record<string, string> = {
  low: '낮음',
  normal: '보통',
  high: '높음',
  urgent: '긴급',
};
const CS_PRIORITY_CLASS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
};

function CSReceptionSection() {
  const { data: dashboard } = useCSDashboard();
  const { data: recentOpen } = useConsultations({ limit: 5, status: 'open' });
  const summary = dashboard?.summary;
  const recent: any[] = (recentOpen as any)?.data ?? [];

  const csStatCards = [
    {
      title: '오늘 접수',
      value: summary?.todayCount ?? 0,
      icon: Headphones,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: '미해결',
      value: summary?.openCount ?? 0,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      title: '진행중',
      value: summary?.inProgressCount ?? 0,
      icon: RefreshCw,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
    },
    {
      title: '긴급',
      value: summary?.urgentCount ?? 0,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
  ];

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-sky-50 to-white border-b pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-800 text-sm sm:text-base">
            <Headphones className="h-4 w-4 text-sky-500" />
            CS 접수 현황
          </CardTitle>
          <a href="/cs" className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-800 transition-colors">
            전체보기 <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* 요약 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100 border-b">
          {csStatCards.map((s) => (
            <div key={s.title} className="bg-white px-4 py-3 flex items-center gap-3">
              <div className={`p-1.5 ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] text-slate-500">{s.title}</p>
                <p className="text-[18px] font-bold text-slate-800">{s.value}건</p>
              </div>
            </div>
          ))}
        </div>

        {/* 최근 미해결 상담 */}
        {recent.length === 0 ? (
          <div className="py-8 text-center text-[14px] text-slate-400">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            미해결 상담이 없습니다.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[13px]">접수번호</TableHead>
                <TableHead className="text-[13px]">거래처</TableHead>
                <TableHead className="text-[13px]">제목</TableHead>
                <TableHead className="text-[13px]">분류</TableHead>
                <TableHead className="text-[13px]">상태</TableHead>
                <TableHead className="text-[13px]">우선순위</TableHead>
                <TableHead className="text-[13px]">접수일시</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="text-[13px] font-mono text-slate-600">
                    <a href={`/cs/consultations/${c.id}`} className="text-indigo-600 hover:underline">
                      {c.consultNumber || '-'}
                    </a>
                  </TableCell>
                  <TableCell className="text-[14px]">{c.client?.clientName || '-'}</TableCell>
                  <TableCell className="text-[14px] max-w-[260px] truncate">{c.title || '-'}</TableCell>
                  <TableCell className="text-[13px]">
                    {c.category?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[11px] border-0 ${CS_STATUS_CLASS[c.status] ?? ''}`}>
                      {CS_STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[11px] border-0 ${CS_PRIORITY_CLASS[c.priority] ?? ''}`}>
                      {CS_PRIORITY_LABEL[c.priority] ?? c.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[13px] text-slate-500">
                    {c.consultedAt ? new Date(c.consultedAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardContent() {
  const { data: summary, isPending, isError, error, refetch, isFetching } = useDashboardSummary();

  // 성장률 포맷팅
  const formatGrowthRate = (rate: number) => {
    const safeRate = Number(rate) || 0;
    const sign = safeRate >= 0 ? "+" : "";
    return `${sign}${safeRate.toFixed(1)}%`;
  };

  const statCards = [
    {
      title: "오늘 접수",
      value: `${summary?.today?.orderCount ?? 0}건`,
      icon: ShoppingCart,
      description: "신규 주문",
      trend: formatGrowthRate(summary?.thisMonth?.growthRate ?? 0),
      trendUp: (summary?.thisMonth?.growthRate ?? 0) >= 0,
      gradient: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      title: "생산중",
      value: `${summary?.orders?.inProduction ?? 0}건`,
      icon: Factory,
      description: "진행 중인 작업",
      trend: null,
      trendUp: false,
      gradient: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
    },
    {
      title: "접수대기",
      value: `${summary?.orders?.pending ?? 0}건`,
      icon: Truck,
      description: "처리 대기",
      trend: null,
      trendUp: false,
      gradient: "from-emerald-500 to-teal-500",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      title: "이번달 매출",
      value: `₩${(summary?.thisMonth?.revenue ?? 0).toLocaleString()}`,
      icon: TrendingUp,
      description: "누적 매출액",
      trend: formatGrowthRate(summary?.thisMonth?.growthRate ?? 0),
      trendUp: (summary?.thisMonth?.growthRate ?? 0) >= 0,
      gradient: "from-indigo-500 to-purple-600",
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-500",
    },
  ];

  const subStatCards = [
    {
      title: "총 거래처",
      value: `${summary?.clients?.total ?? 0}개`,
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "활성 거래처",
      value: `${summary?.clients?.active ?? 0}개`,
      icon: Package,
      gradient: "from-emerald-500 to-green-500",
    },
    {
      title: "오늘 매출",
      value: `₩${(summary?.today?.revenue ?? 0).toLocaleString()}`,
      icon: Calendar,
      gradient: "from-orange-500 to-amber-500",
    },
  ];

  // 로딩 상태
  if (isPending) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="대시보드"
          description="인쇄업 ERP 시스템 현황을 한눈에 확인하세요."
          breadcrumbs={[{ label: "홈", href: "/" }, { label: "대시보드" }]}
        />
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 sm:h-8 w-20 sm:w-24 mb-2" />
                <Skeleton className="h-3 w-24 sm:w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // 에러 상태
  if (isError) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="대시보드"
          description="인쇄업 ERP 시스템 현황을 한눈에 확인하세요."
          breadcrumbs={[{ label: "홈", href: "/" }, { label: "대시보드" }]}
        />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center gap-3 sm:gap-4 py-6 sm:py-8 text-red-600 px-4">
            <div className="flex items-center gap-2 text-center">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">통계 데이터를 불러오는데 실패했습니다.</span>
            </div>
            <p className="text-xs sm:text-sm text-red-500 text-center">
              {error?.message || "알 수 없는 오류가 발생했습니다."}
            </p>
            <div className="text-xs text-gray-500 text-center">
              백엔드 서버가 실행 중인지 확인해주세요 (Port 3001)
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-2"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? '다시 시도 중...' : '다시 시도'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="대시보드"
        description="인쇄업 ERP 시스템 현황을 한눈에 확인하세요."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "대시보드" }]}
      />

      {/* 주요 통계 카드 */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <div className={`p-1.5 sm:p-2 ${stat.iconBg}`}>
                <stat.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-slate-800 truncate">{stat.value}</div>
              <div className="flex items-center text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">
                <span className="truncate">{stat.description}</span>
                {stat.trend && (
                  <span
                    className={`ml-1 sm:ml-2 flex items-center font-medium flex-shrink-0 ${stat.trendUp ? "text-emerald-500" : "text-red-500"
                      }`}
                  >
                    {stat.trendUp ? (
                      <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    ) : (
                      <ArrowDownRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    )}
                    {stat.trend}
                  </span>
                )}
              </div>
              {/* 하단 그라데이션 바 */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 보조 통계 */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        {subStatCards.map((stat) => (
          <Card key={stat.title} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
              <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center bg-gradient-to-br ${stat.gradient} text-white shadow-lg flex-shrink-0`}>
                <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-500">
                  {stat.title}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-slate-800 truncate">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 신규회원 가입현황 */}
      <NewMembersSection summary={summary} />

      {/* CS 접수 현황 */}
      <CSReceptionSection />

      {/* 사업자 전환 신청 대기 */}
      <BusinessUpgradeSection />

      {/* 최근 활동 */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
            <CardTitle className="flex items-center gap-2 text-slate-800 text-sm sm:text-base">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              최근 주문
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-slate-400 py-8 sm:py-12">
              <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-slate-300" />
              <p className="text-sm">최근 주문 내역이 없습니다.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
            <CardTitle className="flex items-center gap-2 text-slate-800 text-sm sm:text-base">
              <Factory className="h-4 w-4 text-amber-500" />
              생산 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-slate-400 py-8 sm:py-12">
              <Factory className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-slate-300" />
              <p className="text-sm">진행 중인 생산이 없습니다.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary } from "@/hooks/use-statistics";
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
} from "lucide-react";

export default function DashboardPage() {
  const { data: summary, isLoading, error } = useDashboardSummary();

  // 성장률 포맷팅
  const formatGrowthRate = (rate: number) => {
    const sign = rate >= 0 ? "+" : "";
    return `${sign}${rate.toFixed(1)}%`;
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
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="대시보드"
          description="인쇄업 ERP 시스템 현황을 한눈에 확인하세요."
          breadcrumbs={[{ label: "홈", href: "/" }, { label: "대시보드" }]}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="대시보드"
          description="인쇄업 ERP 시스템 현황을 한눈에 확인하세요."
          breadcrumbs={[{ label: "홈", href: "/" }, { label: "대시보드" }]}
        />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 py-8 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>통계 데이터를 불러오는데 실패했습니다.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="대시보드"
        description="인쇄업 ERP 시스템 현황을 한눈에 확인하세요."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "대시보드" }]}
      />

      {/* 주요 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-xl ${stat.iconBg}`}>
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
              <div className="flex items-center text-xs text-slate-500 mt-1">
                <span>{stat.description}</span>
                {stat.trend && (
                  <span
                    className={`ml-2 flex items-center font-medium ${stat.trendUp ? "text-emerald-500" : "text-red-500"
                      }`}
                  >
                    {stat.trendUp ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
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
      <div className="grid gap-4 md:grid-cols-3">
        {subStatCards.map((stat) => (
          <Card key={stat.title} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 최근 활동 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              최근 주문
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-slate-400 py-12">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>최근 주문 내역이 없습니다.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Factory className="h-4 w-4 text-amber-500" />
              생산 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-slate-400 py-12">
              <Factory className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>진행 중인 생산이 없습니다.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


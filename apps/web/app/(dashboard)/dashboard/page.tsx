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
    },
    {
      title: "생산중",
      value: `${summary?.orders?.inProduction ?? 0}건`,
      icon: Factory,
      description: "진행 중인 작업",
      trend: null,
      trendUp: false,
    },
    {
      title: "접수대기",
      value: `${summary?.orders?.pending ?? 0}건`,
      icon: Truck,
      description: "처리 대기",
      trend: null,
      trendUp: false,
    },
    {
      title: "이번달 매출",
      value: `₩${(summary?.thisMonth?.revenue ?? 0).toLocaleString()}`,
      icon: TrendingUp,
      description: "누적 매출액",
      trend: formatGrowthRate(summary?.thisMonth?.growthRate ?? 0),
      trendUp: (summary?.thisMonth?.growthRate ?? 0) >= 0,
    },
  ];

  const subStatCards = [
    {
      title: "총 거래처",
      value: `${summary?.clients?.total ?? 0}개`,
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "활성 거래처",
      value: `${summary?.clients?.active ?? 0}개`,
      icon: Package,
      color: "text-green-500",
    },
    {
      title: "오늘 매출",
      value: `₩${(summary?.today?.revenue ?? 0).toLocaleString()}`,
      icon: Calendar,
      color: "text-orange-500",
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
            <Card key={i}>
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
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-destructive">
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
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <span>{stat.description}</span>
                {stat.trend && (
                  <span
                    className={`ml-2 flex items-center ${
                      stat.trendUp ? "text-green-500" : "text-red-500"
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 보조 통계 */}
      <div className="grid gap-4 md:grid-cols-3">
        {subStatCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-full bg-muted p-3 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 최근 활동 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>최근 주문</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              최근 주문 내역이 없습니다.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>생산 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              진행 중인 생산이 없습니다.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

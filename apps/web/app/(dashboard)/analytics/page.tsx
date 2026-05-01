'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  Globe,
  Monitor,
  MapPin,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Activity,
  RefreshCw,
  Shield,
  Network,
  ShoppingCart,
  Factory,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useDashboardSummary,
  useMonthlyTrend,
  useClientStatistics,
  useProductStatistics,
  useProcessDashboard,
} from '@/hooks/use-statistics';
import {
  useAnalyticsStats,
  useTopPages,
  useOsStats,
  useGeoStats,
  useAnalyticsTrend,
  useIpStats,
  type AnalyticsPeriod,
  type TrendGranularity,
} from '@/hooks/use-analytics';
import { useCreateSuspiciousIp } from '@/hooks/use-suspicious-ip';
import { toast } from 'sonner';
import { formatPrice, formatNumber, cn } from '@/lib/utils';

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  today: '오늘',
  '7d': '최근 7일',
  '30d': '최근 30일',
  '90d': '최근 90일',
};

const OS_COLORS: Record<string, string> = {
  Windows: '#3b82f6',
  macOS: '#8b5cf6',
  Android: '#10b981',
  iOS: '#f59e0b',
  Linux: '#ef4444',
  '알 수 없음': '#94a3b8',
};

const KOREA_CITY_LABELS: Record<string, string> = {
  Seoul: '서울',
  Busan: '부산',
  Incheon: '인천',
  Daegu: '대구',
  Daejeon: '대전',
  Gwangju: '광주',
  Ulsan: '울산',
  Suwon: '수원',
  Seongnam: '성남',
  Goyang: '고양',
  Yongin: '용인',
  Changwon: '창원',
  Jeonju: '전주',
  Cheongju: '청주',
  Cheonan: '천안',
  Pohang: '포항',
  Ansan: '안산',
  Bucheon: '부천',
  Anyang: '안양',
  Uijeongbu: '의정부',
  Gimpo: '김포',
  Hwaseong: '화성',
  Namyangju: '남양주',
  Pyeongtaek: '평택',
  Paju: '파주',
  Siheung: '시흥',
  Gimhae: '김해',
  Jeju: '제주',
};

const COUNTRY_LABELS: Record<string, string> = {
  US: '미국',
  JP: '일본',
  CN: '중국',
  DE: '독일',
  GB: '영국',
  AU: '호주',
  CA: '캐나다',
  FR: '프랑스',
  SG: '싱가포르',
  TW: '대만',
  HK: '홍콩',
  VN: '베트남',
  TH: '태국',
  IN: '인도',
  RU: '러시아',
  NL: '네덜란드',
  SE: '스웨덴',
  BR: '브라질',
  MX: '멕시코',
  PH: '필리핀',
};

function getKoreaCityLabel(city: string): string {
  return KOREA_CITY_LABELS[city] || city;
}

function getCountryLabel(country: string): string {
  return COUNTRY_LABELS[country] || country;
}

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': '대시보드',
  '/orders': '주문 관리',
  '/products': '상품 관리',
  '/accounting/sales': '매출원장',
  '/accounting/dashboard': '회계 대시보드',
  '/statistics': '통계',
  '/company': '거래처',
  '/settings': '설정',
  '/analytics': '접속 통계',
};

function getPageLabel(path: string): string {
  return PAGE_LABELS[path] || path;
}

const GRANULARITY_LABELS: Record<TrendGranularity, string> = {
  daily: '일별',
  monthly: '월별',
  yearly: '년도별',
};

// 공정 상태 매핑
const PROCESS_STATUS_MAP: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  pending_receipt: { label: '접수대기', color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
  received: { label: '접수완료', color: 'text-blue-700', bg: 'bg-blue-50', icon: ShoppingCart },
  in_production: { label: '생산진행', color: 'text-violet-700', bg: 'bg-violet-50', icon: Factory },
  shipping_ready: { label: '배송준비', color: 'text-cyan-700', bg: 'bg-cyan-50', icon: Network },
  shipped: { label: '발송완료', color: 'text-green-700', bg: 'bg-green-50', icon: TrendingUp },
};

const PROCESS_STATUS_ORDER: Array<keyof typeof PROCESS_STATUS_MAP> = [
  'pending_receipt',
  'received',
  'in_production',
  'shipping_ready',
  'shipped',
];

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

type ActiveTab = 'business' | 'overview' | 'ip';

// 거래처/상품 통계 응답 타입
interface ClientStatItem {
  clientName: string;
  orderCount: number;
  revenue: number;
}

interface ProductStatItem {
  productName: string;
  orderCount: number;
  quantity: number;
  revenue: number;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [granularity, setGranularity] = useState<TrendGranularity>('daily');
  const [activeTab, setActiveTab] = useState<ActiveTab>('business');

  // 비즈니스 현황 데이터
  const {
    data: dashboardSummary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useDashboardSummary();
  const { data: monthlyTrend, isLoading: monthlyLoading, refetch: refetchMonthly } =
    useMonthlyTrend(12);
  const {
    data: clientStatsRaw,
    isLoading: clientStatsLoading,
    refetch: refetchClient,
  } = useClientStatistics();
  const {
    data: productStatsRaw,
    isLoading: productStatsLoading,
    refetch: refetchProduct,
  } = useProductStatistics();
  const {
    data: processData,
    isLoading: processLoading,
    refetch: refetchProcess,
  } = useProcessDashboard();

  // 접속 통계 데이터
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAnalyticsStats(period);
  const { data: topPages, isLoading: pagesLoading } = useTopPages(period, 10);
  const { data: osStats, isLoading: osLoading } = useOsStats(period);
  const { data: geoStats, isLoading: geoLoading } = useGeoStats(period);
  const { data: trend, isLoading: trendLoading } = useAnalyticsTrend(period, granularity);
  const { data: ipStats, isLoading: ipLoading, refetch: refetchIp } = useIpStats(period, 50);

  const createSuspiciousIp = useCreateSuspiciousIp();

  const isAnalyticsLoading =
    statsLoading || pagesLoading || osLoading || geoLoading || trendLoading;

  const isBusinessLoading =
    summaryLoading || monthlyLoading || clientStatsLoading || productStatsLoading || processLoading;

  // 새로고침
  function handleRefreshAll() {
    if (activeTab === 'business') {
      refetchSummary();
      refetchMonthly();
      refetchClient();
      refetchProduct();
      refetchProcess();
    } else {
      refetchStats();
      refetchIp();
    }
  }

  // 거래처/상품 통계: API가 { data: [...], totals: {...} } 형태로 반환
  const clientStats = ((clientStatsRaw as any)?.data as ClientStatItem[] | undefined) ?? [];
  const productStats = ((productStatsRaw as any)?.data as ProductStatItem[] | undefined) ?? [];

  // 비즈니스 KPI 카드
  const growthRate = dashboardSummary?.thisMonth.growthRate ?? 0;
  const isGrowthPositive = growthRate >= 0;

  const businessKpis = [
    {
      title: '오늘 매출',
      value: dashboardSummary ? formatPrice(dashboardSummary.today.revenue) : '—',
      subtitle: dashboardSummary
        ? `오늘 ${dashboardSummary.today.orderCount}건`
        : '로딩 중...',
      icon: ShoppingCart,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-50',
    },
    {
      title: '이번달 매출',
      value: dashboardSummary ? formatPrice(dashboardSummary.thisMonth.revenue) : '—',
      subtitle: dashboardSummary
        ? `성장률 ${growthRate.toFixed(1)}%`
        : '로딩 중...',
      icon: isGrowthPositive ? TrendingUp : TrendingDown,
      iconColor: isGrowthPositive ? 'text-green-500' : 'text-red-500',
      iconBg: isGrowthPositive ? 'bg-green-50' : 'bg-red-50',
      growthHighlight: true,
    },
    {
      title: '접수대기',
      value: dashboardSummary ? `${formatNumber(dashboardSummary.orders.pending)}건` : '—',
      subtitle: dashboardSummary
        ? `거래처 ${dashboardSummary.clients.active}개 활성`
        : '로딩 중...',
      icon: Clock,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50',
    },
    {
      title: '생산진행',
      value: dashboardSummary ? `${formatNumber(dashboardSummary.orders.inProduction)}건` : '—',
      subtitle: dashboardSummary
        ? `전체 ${dashboardSummary.clients.total}개 거래처`
        : '로딩 중...',
      icon: Factory,
      iconColor: 'text-violet-500',
      iconBg: 'bg-violet-50',
    },
  ];

  // 12개월 매출 추이 데이터
  const monthlyChartData = (monthlyTrend ?? []).map((item) => ({
    ...item,
    monthLabel: item.month.slice(5) + '월',
  }));

  // 거래처 Top5 도넛 데이터
  const top5Clients = clientStats.slice(0, 5);
  const clientPieData = top5Clients.map((c, idx) => ({
    name: c.clientName,
    value: c.revenue,
    orderCount: c.orderCount,
    fill: PIE_COLORS[idx % PIE_COLORS.length],
  }));

  // 상품별 매출 Top10
  const top10Products = productStats.slice(0, 10).map((p) => ({
    ...p,
    productNameShort:
      p.productName.length > 15 ? p.productName.slice(0, 15) + '…' : p.productName,
  }));

  // 접속 통계 KPI
  const analyticsKpis = [
    {
      title: '총 방문',
      value: (stats?.totalViews ?? 0).toLocaleString(),
      icon: Eye,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      description: '페이지 뷰 합계',
    },
    {
      title: '국내 접속',
      value: (stats?.koreaViews ?? 0).toLocaleString(),
      icon: MapPin,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      description: '대한민국 IP',
    },
    {
      title: '해외 접속',
      value: (stats?.overseasViews ?? 0).toLocaleString(),
      icon: Globe,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      description: '해외 IP',
    },
    {
      title: '유니크 세션',
      value: (stats?.uniqueSessions ?? 0).toLocaleString(),
      icon: Users,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
      description: '순방문자 수',
    },
  ];

  const osChartData = (osStats ?? []).map((item) => ({
    ...item,
    fill: OS_COLORS[item.os] ?? '#94a3b8',
  }));

  const koreaCitiesData = (geoStats?.topKoreaCities ?? []).map((item) => ({
    name: getKoreaCityLabel(item.city ?? '알 수 없음'),
    count: item.count,
  }));

  const overseasCountriesData = (geoStats?.topOverseasCountries ?? []).map((item) => ({
    name: getCountryLabel(item.country ?? '알 수 없음'),
    count: item.count,
  }));

  const trendTickFormatter = (v: string) => {
    if (granularity === 'daily') return v.slice(5);
    if (granularity === 'monthly') return v.slice(2);
    return v;
  };

  async function handleRegisterSuspicious(ip: string, visitCount: number) {
    try {
      await createSuspiciousIp.mutateAsync({ ip, visitCount, action: 'monitor' });
      toast.success(`${ip} 를 의심 IP(모니터링)로 등록했습니다.`);
    } catch {
      toast.error('이미 등록된 IP이거나 등록에 실패했습니다.');
    }
  }

  async function handleBlockIp(ip: string, visitCount: number) {
    try {
      await createSuspiciousIp.mutateAsync({
        ip,
        visitCount,
        action: 'block',
        reason: 'IP 통계에서 직접 차단',
      });
      toast.success(`${ip} 를 차단했습니다.`);
    } catch {
      toast.error('이미 등록된 IP이거나 차단에 실패했습니다.');
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] text-black font-normal">통합 현황</h1>
          <p className="text-[14px] text-black font-normal mt-1">
            매출 · 주문 · 공정 · 접속 분석
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-700">실시간</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isBusinessLoading || isAnalyticsLoading || ipLoading}
            className="gap-2"
          >
            <RefreshCw
              className={cn(
                'h-4 w-4',
                (isBusinessLoading || isAnalyticsLoading || ipLoading) && 'animate-spin',
              )}
            />
            새로고침
          </Button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('business')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'business'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700',
          )}
        >
          <span className="flex items-center gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" />
            비즈니스 현황
          </span>
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700',
          )}
        >
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            접속 통계
          </span>
        </button>
        <button
          onClick={() => setActiveTab('ip')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'ip'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700',
          )}
        >
          <span className="flex items-center gap-1.5">
            <Network className="h-3.5 w-3.5" />
            IP 관리
          </span>
        </button>
      </div>

      {/* ============================== 비즈니스 현황 탭 ============================== */}
      {activeTab === 'business' && (
        <>
          {/* 비즈니스 KPI 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {businessKpis.map((card) => (
              <Card
                key={card.title}
                className="border-0 shadow-md hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
                        card.iconBg,
                      )}
                    >
                      <card.icon className={cn('h-6 w-6', card.iconColor)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500 mb-1">
                        {card.title}
                      </p>
                      <p className="text-[18px] text-black font-bold truncate">
                        {summaryLoading ? '—' : card.value}
                      </p>
                      <p
                        className={cn(
                          'text-xs mt-1 truncate',
                          card.growthHighlight
                            ? isGrowthPositive
                              ? 'text-green-600 font-medium'
                              : 'text-red-600 font-medium'
                            : 'text-slate-500',
                        )}
                      >
                        {summaryLoading ? '로딩 중...' : card.subtitle}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 12개월 매출 추이 */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[18px] text-black font-bold">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                12개월 매출 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyLoading ? (
                <div className="h-72 flex items-center justify-center text-slate-400">
                  로딩 중...
                </div>
              ) : monthlyChartData.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-slate-400">
                  데이터 없음
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={11} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(value: number) =>
                        value === 0 ? '0' : `${Math.round(value / 10000)}만`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                      formatter={(value: any, name: any) => {
                        const v = Number(value ?? 0);
                        if (name === 'revenue') {
                          return [formatPrice(v), '매출'];
                        }
                        if (name === 'count') {
                          return [`${v}건`, '주문건수'];
                        }
                        return [v, name];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="transparent"
                      fill="transparent"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* 공정 현황 + 거래처 Top5 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 공정 현황 */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-[18px] text-black font-bold">
                  <Factory className="h-5 w-5 text-violet-500" />
                  공정 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                {processLoading ? (
                  <div className="h-48 flex items-center justify-center text-slate-400">
                    로딩 중...
                  </div>
                ) : !processData ? (
                  <div className="h-48 flex items-center justify-center text-slate-400">
                    데이터 없음
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 상태 흐름 */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {PROCESS_STATUS_ORDER.map((statusKey, idx) => {
                        const cfg = PROCESS_STATUS_MAP[statusKey];
                        const count = processData.statusCounts[statusKey] ?? 0;
                        const Icon = cfg.icon;
                        return (
                          <div key={statusKey} className="flex items-center flex-1 min-w-[100px]">
                            <div
                              className={cn(
                                'flex flex-col items-center gap-1.5 p-3 rounded-lg w-full',
                                cfg.bg,
                              )}
                            >
                              <Icon className={cn('h-5 w-5', cfg.color)} />
                              <p className={cn('text-xs font-medium', cfg.color)}>
                                {cfg.label}
                              </p>
                              <Badge
                                variant="secondary"
                                className={cn('text-sm font-bold', cfg.bg, cfg.color)}
                              >
                                {count}
                              </Badge>
                            </div>
                            {idx < PROCESS_STATUS_ORDER.length - 1 && (
                              <div className="hidden md:block w-2 h-px bg-slate-200 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* 긴급 주문 */}
                    {processData.urgentOrders && processData.urgentOrders.length > 0 && (
                      <div className="border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <p className="text-sm font-semibold text-red-600">긴급 주문</p>
                          <Badge variant="destructive" className="text-xs">
                            {processData.urgentOrders.length}
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          {processData.urgentOrders.slice(0, 3).map((order) => (
                            <div
                              key={order.id}
                              className="flex items-center justify-between p-2 rounded bg-red-50 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-mono font-medium text-red-700">
                                  {order.orderNumber}
                                </span>
                                <span className="text-slate-600 ml-2">{order.clientName}</span>
                              </div>
                              {order.requestedDeliveryDate && (
                                <span className="text-red-600 font-medium flex-shrink-0">
                                  {new Date(order.requestedDeliveryDate).toLocaleDateString(
                                    'ko-KR',
                                    { month: '2-digit', day: '2-digit' },
                                  )}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 거래처 Top5 도넛 */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-[18px] text-black font-bold">
                  <Users className="h-5 w-5 text-blue-500" />
                  거래처 Top 5
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clientStatsLoading ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    로딩 중...
                  </div>
                ) : clientPieData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    데이터 없음
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={clientPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                        >
                          {clientPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [formatPrice(Number(value ?? 0)), '매출']}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {clientPieData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.fill }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-700 truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-slate-500">{formatPrice(item.value)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 상품별 매출 순위 */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[18px] text-black font-bold">
                <Activity className="h-5 w-5 text-violet-500" />
                상품별 매출 순위 (Top 10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productStatsLoading ? (
                <div className="h-80 flex items-center justify-center text-slate-400">
                  로딩 중...
                </div>
              ) : top10Products.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-slate-400">
                  데이터 없음
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(300, top10Products.length * 36)}>
                  <BarChart
                    data={top10Products}
                    layout="vertical"
                    margin={{ left: 16, right: 32, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(value: number) =>
                        value === 0 ? '0' : `${Math.round(value / 10000)}만`
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="productNameShort"
                      stroke="#64748b"
                      fontSize={11}
                      width={120}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => {
                        const v = Number(value ?? 0);
                        if (name === 'revenue') return [formatPrice(v), '매출'];
                        return [v, name];
                      }}
                      labelFormatter={(label: any, payload: any) => {
                        const item = payload && payload[0]?.payload;
                        return item?.productName ?? label;
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ============================== 접속 통계 탭 ============================== */}
      {activeTab === 'overview' && (
        <>
          {/* 기간 선택 */}
          <div className="flex gap-2">
            {(Object.keys(PERIOD_LABELS) as AnalyticsPeriod[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </Button>
            ))}
          </div>

          {/* 접속 KPI 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {analyticsKpis.map((card) => (
              <Card
                key={card.title}
                className="border-0 shadow-md hover:shadow-lg transition-shadow"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-slate-600">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-slate-800">
                    {statsLoading ? '—' : card.value}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{card.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 인기 페이지 + OS 분포 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-blue-500" />
                  인기 페이지 Top 10
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pagesLoading ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    로딩 중...
                  </div>
                ) : (topPages ?? []).length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    데이터 없음
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={(topPages ?? []).map((p) => ({
                        name: getPageLabel(p.path),
                        count: p.count,
                        path: p.path,
                      }))}
                      layout="vertical"
                      margin={{ left: 16, right: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#64748b" fontSize={11} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#64748b"
                        fontSize={11}
                        width={90}
                        tickFormatter={(v: string) =>
                          v.length > 10 ? v.slice(0, 10) + '…' : v
                        }
                      />
                      <Tooltip
                        formatter={(value: number | undefined) => [
                          `${(value ?? 0).toLocaleString()}회`,
                          '방문 수',
                        ]}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Monitor className="h-4 w-4 text-purple-500" />
                  OS 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                {osLoading ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    로딩 중...
                  </div>
                ) : osChartData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    데이터 없음
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={osChartData}
                          dataKey="count"
                          nameKey="os"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(props: any) => `${props.os} ${props.percentage}%`}
                          labelLine={false}
                        >
                          {osChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number | undefined) => [
                            `${(value ?? 0).toLocaleString()}회`,
                            '방문 수',
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2">
                      {osChartData.map((item) => (
                        <div
                          key={item.os}
                          className="flex items-center gap-2 p-2 rounded-lg"
                          style={{ backgroundColor: `${item.fill}15` }}
                        >
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.fill }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{item.os}</p>
                            <p className="text-xs text-slate-500">{item.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 국내 시별 + 해외 국가별 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  국내 접속 — 시별
                </CardTitle>
              </CardHeader>
              <CardContent>
                {geoLoading ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    로딩 중...
                  </div>
                ) : koreaCitiesData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    {geoStats?.korea.count === 0 ? '국내 접속 없음' : '도시 정보 없음 (로컬 환경)'}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={koreaCitiesData} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={64} />
                      <Tooltip
                        formatter={(value: number | undefined) => [
                          `${(value ?? 0).toLocaleString()}회`,
                          '방문 수',
                        ]}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4 text-orange-500" />
                  해외 접속 — 국가별
                </CardTitle>
              </CardHeader>
              <CardContent>
                {geoLoading ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    로딩 중...
                  </div>
                ) : overseasCountriesData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    해외 접속 없음
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={overseasCountriesData} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={64} />
                      <Tooltip
                        formatter={(value: number | undefined) => [
                          `${(value ?? 0).toLocaleString()}회`,
                          '방문 수',
                        ]}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 방문 추이 */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  방문 추이
                </CardTitle>
                <div className="flex gap-1">
                  {(Object.keys(GRANULARITY_LABELS) as TrendGranularity[]).map((g) => (
                    <Button
                      key={g}
                      variant={granularity === g ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 px-3 text-xs"
                      onClick={() => setGranularity(g)}
                    >
                      {GRANULARITY_LABELS[g]}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  로딩 중...
                </div>
              ) : (trend ?? []).length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  데이터 없음
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trend} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={10}
                      tickFormatter={trendTickFormatter}
                    />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number | undefined) => [
                        `${(value ?? 0).toLocaleString()}회`,
                        '방문 수',
                      ]}
                      labelFormatter={(label) =>
                        `${GRANULARITY_LABELS[granularity]}: ${label}`
                      }
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#10b981' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ============================== IP 관리 탭 ============================== */}
      {activeTab === 'ip' && (
        <>
          {/* 기간 선택 */}
          <div className="flex gap-2">
            {(Object.keys(PERIOD_LABELS) as AnalyticsPeriod[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </Button>
            ))}
          </div>

          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Network className="h-4 w-4 text-blue-500" />
                  IP별 방문 통계 (상위 50)
                </CardTitle>
                <a
                  href="/analytics/suspicious-ips"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Shield className="h-3.5 w-3.5" />
                  의심 IP 관리 →
                </a>
              </div>
            </CardHeader>
            <CardContent>
              {ipLoading ? (
                <div className="h-48 flex items-center justify-center text-slate-400">
                  로딩 중...
                </div>
              ) : (ipStats ?? []).length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400">
                  데이터 없음
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th className="text-left py-2 pr-3 font-medium">#</th>
                        <th className="text-left py-2 pr-3 font-medium">IP</th>
                        <th className="text-left py-2 pr-3 font-medium">위치</th>
                        <th className="text-right py-2 pr-3 font-medium">방문수</th>
                        <th className="text-left py-2 pr-3 font-medium">OS / 브라우저</th>
                        <th className="text-left py-2 pr-3 font-medium">마지막 접속</th>
                        <th className="text-left py-2 pr-3 font-medium">상태</th>
                        <th className="text-right py-2 font-medium">조치</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ipStats ?? []).map((row, idx) => (
                        <tr
                          key={row.ip}
                          className={cn(
                            'border-b border-slate-100 hover:bg-slate-50 transition-colors',
                            row.suspicious?.action === 'block' && 'bg-red-50',
                          )}
                        >
                          <td className="py-2 pr-3 text-xs text-slate-400">{idx + 1}</td>
                          <td className="py-2 pr-3 font-mono text-xs text-slate-700">{row.ip}</td>
                          <td className="py-2 pr-3 text-xs text-slate-600">
                            {row.country
                              ? `${COUNTRY_LABELS[row.country] || row.country}${row.city ? ` · ${KOREA_CITY_LABELS[row.city] || row.city}` : ''}`
                              : '—'}
                          </td>
                          <td className="py-2 pr-3 text-right font-semibold text-slate-800">
                            {row.count.toLocaleString()}
                          </td>
                          <td className="py-2 pr-3 text-xs text-slate-500">
                            {[row.os, row.browser].filter(Boolean).join(' / ') || '—'}
                          </td>
                          <td className="py-2 pr-3 text-xs text-slate-500">
                            {row.lastVisit
                              ? new Date(row.lastVisit).toLocaleString('ko-KR', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="py-2 pr-3">
                            {row.suspicious ? (
                              row.suspicious.action === 'block' ? (
                                <Badge variant="destructive" className="text-xs">
                                  차단
                                </Badge>
                              ) : (
                                <Badge className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-100">
                                  모니터링
                                </Badge>
                              )
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2 text-right">
                            {!row.suspicious ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                                  onClick={() => handleRegisterSuspicious(row.ip, row.count)}
                                  disabled={createSuspiciousIp.isPending}
                                >
                                  모니터링
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleBlockIp(row.ip, row.count)}
                                  disabled={createSuspiciousIp.isPending}
                                >
                                  차단
                                </Button>
                              </div>
                            ) : (
                              <a
                                href="/analytics/suspicious-ips"
                                className="text-xs text-blue-500 hover:underline"
                              >
                                관리 →
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

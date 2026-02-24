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
} from 'recharts';
import {
  Globe,
  Monitor,
  MapPin,
  TrendingUp,
  Users,
  Eye,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useAnalyticsStats,
  useTopPages,
  useOsStats,
  useGeoStats,
  useAnalyticsTrend,
  type AnalyticsPeriod,
  type TrendGranularity,
} from '@/hooks/use-analytics';

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

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [granularity, setGranularity] = useState<TrendGranularity>('daily');

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAnalyticsStats(period);
  const { data: topPages, isLoading: pagesLoading } = useTopPages(period, 10);
  const { data: osStats, isLoading: osLoading } = useOsStats(period);
  const { data: geoStats, isLoading: geoLoading } = useGeoStats(period);
  const { data: trend, isLoading: trendLoading } = useAnalyticsTrend(period, granularity);

  const isLoading = statsLoading || pagesLoading || osLoading || geoLoading || trendLoading;

  const kpiCards = [
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
    if (granularity === 'daily') return v.slice(5); // MM-DD
    if (granularity === 'monthly') return v.slice(2); // YY-MM
    return v; // YYYY
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">접속 통계</h1>
          <p className="text-sm text-slate-500 mt-1">페이지 방문, OS, 접속 지역 분석</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchStats()}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

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

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <Card key={card.title} className="border-0 shadow-md hover:shadow-lg transition-shadow">
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
        {/* 인기 페이지 */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-blue-500" />
              인기 페이지 Top 10
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pagesLoading ? (
              <div className="h-64 flex items-center justify-center text-slate-400">로딩 중...</div>
            ) : (topPages ?? []).length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400">데이터 없음</div>
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
                    tickFormatter={(v: string) => (v.length > 10 ? v.slice(0, 10) + '…' : v)}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString()}회`, '방문 수']}
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

        {/* OS 분포 */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Monitor className="h-4 w-4 text-purple-500" />
              OS 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            {osLoading ? (
              <div className="h-64 flex items-center justify-center text-slate-400">로딩 중...</div>
            ) : osChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400">데이터 없음</div>
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
                      formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString()}회`, '방문 수']}
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
        {/* 국내 접속 - 시별 */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-emerald-500" />
              국내 접속 — 시별
            </CardTitle>
          </CardHeader>
          <CardContent>
            {geoLoading ? (
              <div className="h-64 flex items-center justify-center text-slate-400">로딩 중...</div>
            ) : koreaCitiesData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400">
                {geoStats?.korea.count === 0 ? '국내 접속 없음' : '도시 정보 없음 (로컬 환경)'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={koreaCitiesData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    width={64}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString()}회`, '방문 수']}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 해외 접속 - 국가별 */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-orange-500" />
              해외 접속 — 국가별
            </CardTitle>
          </CardHeader>
          <CardContent>
            {geoLoading ? (
              <div className="h-64 flex items-center justify-center text-slate-400">로딩 중...</div>
            ) : overseasCountriesData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400">해외 접속 없음</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={overseasCountriesData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    width={64}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString()}회`, '방문 수']}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 방문 추이 (일별/월별/년도별) */}
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
            <div className="h-64 flex items-center justify-center text-slate-400">로딩 중...</div>
          ) : (trend ?? []).length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400">데이터 없음</div>
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
                  formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString()}회`, '방문 수']}
                  labelFormatter={(label) => `${GRANULARITY_LABELS[granularity]}: ${label}`}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
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
    </div>
  );
}

---
name: dashboard-patterns
description: 대시보드 UI 패턴. KPI 카드, 차트, 통계, 실시간 현황 등 대시보드 컴포넌트 작업 시 사용합니다.
---

# 대시보드 UI 패턴 스킬

인쇄업 ERP 대시보드 UI 패턴 가이드입니다.

## 대시보드 레이아웃

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 대시보드                                              2024-12-28 (토)   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐│
│  │ 오늘 매출     │ │ 신규 주문     │ │ 생산 진행     │ │ 배송 대기     ││
│  │ ₩1,250,000   │ │    15건      │ │    8건       │ │    12건      ││
│  │ ▲ 12%       │ │ ▲ 5건        │ │              │ │              ││
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘│
│                                                                         │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────┐│
│  │ 주간 매출 추이                       │ │ 주문 상태 분포              ││
│  │                                     │ │                            ││
│  │     📊 차트 영역                    │ │     🥧 파이 차트            ││
│  │                                     │ │                            ││
│  │                                     │ │                            ││
│  └─────────────────────────────────────┘ └─────────────────────────────┘│
│                                                                         │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────┐│
│  │ 최근 주문                           │ │ 오늘 생산 일정              ││
│  │                                     │ │                            ││
│  │ ORD-001 | A업체 | 압축앨범 | 접수대기│ │ 09:00 출력 | ORD-001      ││
│  │ ORD-002 | B업체 | 포토북  | 생산중  │ │ 11:00 제본 | ORD-002      ││
│  │ ORD-003 | C업체 | 액자    | 배송준비│ │ 14:00 포장 | ORD-003      ││
│  │                                     │ │                            ││
│  └─────────────────────────────────────┘ └─────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. KPI 카드 패턴

### 기본 KPI 카드

```tsx
interface KpiCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
}

export function KpiCard({ title, value, change, icon: Icon, trend }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {change && (
              <p className={cn(
                'text-sm mt-1 flex items-center',
                change.type === 'increase' ? 'text-green-600' : 'text-red-600'
              )}>
                {change.type === 'increase' ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {change.value}%
              </p>
            )}
          </div>
          {Icon && (
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### KPI 그리드

```tsx
export function KpiGrid() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KpiCard
        title="오늘 매출"
        value={formatCurrency(stats?.todaySales)}
        change={{ value: 12, type: 'increase' }}
        icon={DollarSign}
      />
      <KpiCard
        title="신규 주문"
        value={`${stats?.newOrders}건`}
        change={{ value: 5, type: 'increase' }}
        icon={ShoppingCart}
      />
      <KpiCard
        title="생산 진행"
        value={`${stats?.inProduction}건`}
        icon={Factory}
      />
      <KpiCard
        title="배송 대기"
        value={`${stats?.pendingShipment}건`}
        icon={Truck}
      />
    </div>
  );
}
```

### 미니 KPI (인라인)

```tsx
export function MiniKpi({ label, value, suffix }: MiniKpiProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold">
        {value}
        {suffix && <span className="text-gray-400 ml-0.5">{suffix}</span>}
      </span>
    </div>
  );
}
```

---

## 2. 차트 패턴

### 차트 라이브러리: Recharts

```bash
npm install recharts
```

### 라인 차트 (매출 추이)

```tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function SalesChart({ data }: { data: SalesData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>주간 매출 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '매출']}
                labelFormatter={(label) => `${label}`}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 바 차트 (상품별 매출)

```tsx
import { BarChart, Bar } from 'recharts';

export function ProductSalesChart({ data }: { data: ProductSalesData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>상품별 매출</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `${v / 10000}만`} />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="sales" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 파이/도넛 차트 (주문 상태 분포)

```tsx
import { PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'];

export function OrderStatusChart({ data }: { data: StatusData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>주문 상태 분포</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}  // 도넛 모양
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 영역 차트 (주문량 추이)

```tsx
import { AreaChart, Area } from 'recharts';

export function OrderTrendChart({ data }: { data: TrendData[] }) {
  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis hide />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="orders"
            stroke="#3b82f6"
            fill="url(#colorOrders)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## 3. 목록/테이블 위젯

### 최근 주문 목록

```tsx
export function RecentOrdersWidget() {
  const { data: orders } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => fetchOrders({ limit: 5, sort: '-createdAt' }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>최근 주문</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/orders">
            전체보기 <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {orders?.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{order.orderNo}</p>
                  <p className="text-sm text-gray-500">{order.client.name}</p>
                </div>
              </div>
              <div className="text-right">
                <StatusBadge status={order.status} />
                <p className="text-sm text-gray-500 mt-1">
                  {formatCurrency(order.total)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 오늘 일정 위젯

```tsx
export function TodayScheduleWidget() {
  const { data: schedules } = useQuery({
    queryKey: ['today-schedule'],
    queryFn: fetchTodaySchedule,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          오늘 생산 일정
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* 타임라인 */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

          <div className="space-y-4">
            {schedules?.map((schedule, index) => (
              <div key={index} className="flex items-start gap-4 pl-8 relative">
                {/* 타임라인 점 */}
                <div
                  className={cn(
                    'absolute left-2.5 w-3 h-3 rounded-full border-2 border-white',
                    schedule.status === 'completed'
                      ? 'bg-green-500'
                      : schedule.status === 'in_progress'
                      ? 'bg-blue-500'
                      : 'bg-gray-300'
                  )}
                />

                {/* 시간 */}
                <span className="text-sm font-medium text-gray-500 w-12">
                  {schedule.time}
                </span>

                {/* 내용 */}
                <div className="flex-1">
                  <p className="font-medium">{schedule.title}</p>
                  <p className="text-sm text-gray-500">{schedule.orderNo}</p>
                </div>

                {/* 상태 */}
                <StatusBadge status={schedule.status} />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 4. 진행률/게이지

### 프로그레스 바

```tsx
export function ProgressBar({
  value,
  max,
  label,
  showPercent = true,
}: ProgressBarProps) {
  const percent = Math.round((value / max) * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">
          {value}/{max}
          {showPercent && <span className="text-gray-400 ml-1">({percent}%)</span>}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
```

### 원형 프로그레스

```tsx
export function CircularProgress({
  value,
  max,
  size = 120,
  strokeWidth = 10,
  label,
}: CircularProgressProps) {
  const percent = (value / max) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* 배경 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* 진행 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-2xl font-bold">{Math.round(percent)}%</span>
        {label && <p className="text-xs text-gray-500">{label}</p>}
      </div>
    </div>
  );
}
```

### 공정 진행률 표시

```tsx
export function ProductionProgress({ jobs }: { jobs: ProductionJob[] }) {
  const completed = jobs.filter(j => j.status === 'COMPLETED').length;
  const total = jobs.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>오늘 생산 진행률</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <CircularProgress value={completed} max={total} label="완료" />
        <div className="flex-1 space-y-3">
          <ProgressBar value={8} max={20} label="출력" />
          <ProgressBar value={6} max={20} label="후가공" />
          <ProgressBar value={4} max={20} label="제본" />
          <ProgressBar value={2} max={20} label="검수" />
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 5. 알림/활동 피드

### 활동 피드

```tsx
export function ActivityFeed() {
  const { data: activities } = useQuery({
    queryKey: ['activities'],
    queryFn: fetchRecentActivities,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 활동</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities?.map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={activity.user.avatar} />
                <AvatarFallback>{activity.user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.user.name}</span>
                  {' '}{activity.action}{' '}
                  <span className="font-medium">{activity.target}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {formatRelativeTime(activity.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 알림 드롭다운

```tsx
export function NotificationDropdown() {
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  });

  const unreadCount = notifications?.filter(n => !n.read).length ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>알림</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications?.slice(0, 5).map((notification) => (
          <DropdownMenuItem key={notification.id} className="p-3">
            <div className="flex gap-3">
              <div className={cn(
                'w-2 h-2 rounded-full mt-2',
                notification.read ? 'bg-gray-300' : 'bg-blue-500'
              )} />
              <div>
                <p className="text-sm">{notification.message}</p>
                <p className="text-xs text-gray-500">
                  {formatRelativeTime(notification.createdAt)}
                </p>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center">
          <Link href="/notifications">전체 알림 보기</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 6. 실시간 업데이트

### 자동 새로고침

```tsx
export function RealtimeDashboard() {
  const { data, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000,  // 30초마다 자동 새로고침
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1>대시보드</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          실시간 업데이트
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {/* 대시보드 콘텐츠 */}
    </div>
  );
}
```

---

## 7. 대시보드 그리드 레이아웃

### 반응형 그리드

```tsx
export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* KPI 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="오늘 매출" value="₩1,250,000" />
        <KpiCard title="신규 주문" value="15건" />
        <KpiCard title="생산 진행" value="8건" />
        <KpiCard title="배송 대기" value="12건" />
      </div>

      {/* 차트 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart />
        <OrderStatusChart />
      </div>

      {/* 목록 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentOrdersWidget />
        <TodayScheduleWidget />
      </div>

      {/* 전체 너비 */}
      <ProductionProgress />
    </div>
  );
}
```

---

## 체크리스트

대시보드 구현 시 확인사항:

- [ ] KPI 카드 (매출, 주문, 생산, 배송)
- [ ] 매출 추이 차트 (일별/주별/월별)
- [ ] 주문 상태 분포 차트
- [ ] 최근 주문 목록
- [ ] 오늘 생산 일정
- [ ] 생산 진행률 표시
- [ ] 실시간 데이터 새로고침
- [ ] 반응형 그리드 레이아웃
- [ ] 로딩 스켈레톤
- [ ] 빈 상태 처리

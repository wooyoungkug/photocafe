# Day 4 프롬프트: 대시보드 및 리포트 구현

---

## 🎯 목표
미수금 대시보드, 거래처별 채권 명세서, 수금 예정 캘린더 구현

---

## 📋 Backend 요구사항

### 1. 대시보드 데이터 API

**GET /api/v1/accounting/dashboard/receivables**

**Controller**: apps/api/src/modules/accounting/controllers/dashboard.controller.ts

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('Dashboard')
@Controller('accounting/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('receivables')
  @ApiOperation({ summary: '미수금 대시보드 데이터' })
  getReceivablesDashboard() {
    return this.dashboardService.getReceivablesDashboard();
  }
}
```

**Service**: dashboard.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getReceivablesDashboard() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. 총 미수금 (전체, 30일 이내, 연체)
    const allReceivables = await this.prisma.receivable.findMany({
      where: { balance: { gt: 0 } }
    });

    const totalAmount = allReceivables.reduce((sum, r) => sum + Number(r.balance), 0);

    const within30Days = allReceivables.filter(r => {
      const days = Math.floor(
        (now.getTime() - r.issueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return days <= 30;
    }).reduce((sum, r) => sum + Number(r.balance), 0);

    const overdue = allReceivables.filter(r => {
      return r.dueDate && r.dueDate < now;
    });

    const overdueAmount = overdue.reduce((sum, r) => sum + Number(r.balance), 0);
    const overdueCount = overdue.length;

    // 2. 금주 수금액
    const weekPayments = await this.prisma.receivablePayment.findMany({
      where: {
        paymentDate: { gte: startOfWeek }
      }
    });
    const weekTotal = weekPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // 3. 금월 수금액
    const monthPayments = await this.prisma.receivablePayment.findMany({
      where: {
        paymentDate: { gte: startOfMonth }
      }
    });
    const monthTotal = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // 4. 거래처별 미수금 Top 10
    const summary = await this.prisma.receivable.groupBy({
      by: ['clientId'],
      where: { balance: { gt: 0 } },
      _sum: { balance: true },
      _count: true,
      orderBy: { _sum: { balance: 'desc' } },
      take: 10
    });

    const topClients = await Promise.all(
      summary.map(async (item) => {
        const client = await this.prisma.client.findUnique({
          where: { id: item.clientId },
          select: { name: true }
        });
        return {
          clientId: item.clientId,
          clientName: client?.name || '알 수 없음',
          balance: Number(item._sum.balance || 0),
          count: item._count
        };
      })
    );

    // 5. 월별 수금 추이 (최근 12개월)
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const payments = await this.prisma.receivablePayment.findMany({
        where: {
          paymentDate: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      });

      const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

      months.push({
        month: monthStart.toISOString().slice(0, 7), // YYYY-MM
        amount: total,
        count: payments.length
      });
    }

    return {
      summary: {
        totalAmount,
        within30Days,
        overdueAmount,
        overdueCount,
        weekTotal,
        monthTotal
      },
      topClients,
      monthlyTrend: months
    };
  }
}
```

### 2. 거래처별 채권 명세서 API

**GET /api/v1/accounting/reports/receivable-statement/:clientId**

**DTO**: query-statement.dto.ts

```typescript
import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryStatementDto {
  @ApiProperty({ description: '시작일' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: '종료일' })
  @IsDateString()
  endDate: string;
}
```

**Controller**: reports.controller.ts

```typescript
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { ReportsService } from '../services/reports.service';
import { QueryStatementDto } from '../dto/query-statement.dto';

@ApiTags('Reports')
@Controller('accounting/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('receivable-statement/:clientId')
  getReceivableStatement(
    @Param('clientId') clientId: string,
    @Query() query: QueryStatementDto
  ) {
    return this.reportsService.getReceivableStatement(clientId, query);
  }
}
```

**Service**: reports.service.ts

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { QueryStatementDto } from '../dto/query-statement.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getReceivableStatement(clientId: string, query: QueryStatementDto) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      throw new NotFoundException('거래처를 찾을 수 없습니다.');
    }

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    // 기초잔액 (시작일 이전 발생분)
    const beforeReceivables = await this.prisma.receivable.findMany({
      where: {
        clientId,
        issueDate: { lt: startDate }
      }
    });

    const openingBalance = beforeReceivables.reduce(
      (sum, r) => sum + Number(r.balance),
      0
    );

    // 당기 발생 내역
    const receivables = await this.prisma.receivable.findMany({
      where: {
        clientId,
        issueDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        payments: true
      },
      orderBy: { issueDate: 'asc' }
    });

    // 상세 내역
    const transactions = [];

    receivables.forEach(r => {
      // 발생
      transactions.push({
        date: r.issueDate,
        description: r.description || '매출 발생',
        debit: Number(r.originalAmount), // 발생액
        credit: 0,
        balance: 0 // 나중에 계산
      });

      // 수금
      r.payments.forEach(p => {
        transactions.push({
          date: p.paymentDate,
          description: p.description || '수금',
          debit: 0,
          credit: Number(p.amount), // 수금액
          balance: 0
        });
      });
    });

    // 일자순 정렬 및 잔액 계산
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = openingBalance;
    transactions.forEach(t => {
      runningBalance += t.debit - t.credit;
      t.balance = runningBalance;
    });

    // 합계
    const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
    const closingBalance = openingBalance + totalDebit - totalCredit;

    return {
      client: {
        id: client.id,
        name: client.name
      },
      period: {
        startDate: query.startDate,
        endDate: query.endDate
      },
      openingBalance,
      totalDebit,
      totalCredit,
      closingBalance,
      transactions
    };
  }
}
```

### 3. 수금 예정 일정 API

**GET /api/v1/accounting/receivables/due-schedule**

**DTO**: query-due-schedule.dto.ts

```typescript
import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QueryDueScheduleDto {
  @ApiProperty({ description: '년도' })
  @Type(() => Number)
  @IsInt()
  year: number;

  @ApiProperty({ description: '월 (1-12)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}
```

**Service 메서드 추가** (receivables.service.ts):

```typescript
async getDueSchedule(query: QueryDueScheduleDto) {
  const { year, month } = query;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // 월 마지막 일

  const receivables = await this.prisma.receivable.findMany({
    where: {
      balance: { gt: 0 },
      dueDate: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      client: { select: { name: true } }
    },
    orderBy: { dueDate: 'asc' }
  });

  // 일자별 집계
  const schedule = {};

  receivables.forEach(r => {
    const dateKey = r.dueDate.toISOString().split('T')[0];
    if (!schedule[dateKey]) {
      schedule[dateKey] = {
        date: dateKey,
        totalAmount: 0,
        count: 0,
        items: []
      };
    }

    schedule[dateKey].totalAmount += Number(r.balance);
    schedule[dateKey].count += 1;
    schedule[dateKey].items.push({
      id: r.id,
      clientName: r.client.name,
      amount: Number(r.balance)
    });
  });

  return Object.values(schedule);
}
```

---

## 📋 Frontend 요구사항

### 1. 대시보드 페이지

**apps/web/app/(dashboard)/accounting/dashboard/page.tsx**

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReceivablesKPI } from './components/receivables-kpi';
import { TopClientsChart } from './components/top-clients-chart';
import { MonthlyCollectionChart } from './components/monthly-collection-chart';

export default function AccountingDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'receivables'],
    queryFn: () => api.get('/accounting/dashboard/receivables'),
    refetchInterval: 1000 * 60 * 5 // 5분마다 자동 갱신
  });

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">회계 대시보드</h1>
        <p className="text-muted-foreground">미수금 현황 및 통계</p>
      </div>

      {/* KPI 카드 */}
      <ReceivablesKPI data={data?.summary} />

      {/* 차트 */}
      <div className="grid gap-6 md:grid-cols-2">
        <TopClientsChart data={data?.topClients} />
        <MonthlyCollectionChart data={data?.monthlyTrend} />
      </div>
    </div>
  );
}
```

### 2. KPI 컴포넌트

**components/receivables-kpi.tsx**

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ReceivablesKPIProps {
  data: {
    totalAmount: number;
    within30Days: number;
    overdueAmount: number;
    overdueCount: number;
    weekTotal: number;
    monthTotal: number;
  };
}

export function ReceivablesKPI({ data }: ReceivablesKPIProps) {
  const kpis = [
    {
      title: '총 미수금',
      value: data.totalAmount,
      subtext: `30일 이내: ${formatCurrency(data.within30Days)}`,
      trend: null
    },
    {
      title: '연체 금액',
      value: data.overdueAmount,
      subtext: `${data.overdueCount}건`,
      trend: 'down',
      trendColor: 'text-red-500'
    },
    {
      title: '금주 수금액',
      value: data.weekTotal,
      subtext: '이번 주',
      trend: 'up',
      trendColor: 'text-green-500'
    },
    {
      title: '금월 수금액',
      value: data.monthTotal,
      subtext: '이번 달',
      trend: 'up',
      trendColor: 'text-green-500'
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {kpis.map((kpi, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(kpi.value)}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {kpi.trend === 'up' && (
                <ArrowUpIcon className={`h-3 w-3 ${kpi.trendColor}`} />
              )}
              {kpi.trend === 'down' && (
                <ArrowDownIcon className={`h-3 w-3 ${kpi.trendColor}`} />
              )}
              <span>{kpi.subtext}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### 3. Top 거래처 차트

**components/top-clients-chart.tsx**

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface TopClientsChartProps {
  data: Array<{
    clientName: string;
    balance: number;
    count: number;
  }>;
}

export function TopClientsChart({ data }: TopClientsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>거래처별 미수금 Top 10</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis
              dataKey="clientName"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              labelStyle={{ color: '#000' }}
            />
            <Bar dataKey="balance" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### 4. 월별 수금 추이 차트

**components/monthly-collection-chart.tsx**

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface MonthlyCollectionChartProps {
  data: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
}

export function MonthlyCollectionChart({ data }: MonthlyCollectionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>월별 수금 추이 (최근 12개월)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              labelStyle={{ color: '#000' }}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### 5. 거래처별 명세서 페이지

**apps/web/app/(dashboard)/accounting/reports/receivable-statement/[clientId]/page.tsx**

```tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { StatementTable } from './components/statement-table';
import { PrintIcon, DownloadIcon } from 'lucide-react';

export default function ReceivableStatementPage() {
  const params = useParams();
  const clientId = params.clientId as string;

  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });

  const { data, isLoading } = useQuery({
    queryKey: ['receivable-statement', clientId, dateRange],
    queryFn: () =>
      api.get(`/accounting/reports/receivable-statement/${clientId}`, {
        params: {
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString()
        }
      }),
    enabled: !!dateRange.from && !!dateRange.to
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">거래처별 채권 명세서</h1>
          <p className="text-muted-foreground">{data?.client.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <PrintIcon className="h-4 w-4 mr-2" />
            인쇄
          </Button>
          <Button variant="outline">
            <DownloadIcon className="h-4 w-4 mr-2" />
            PDF 다운로드
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </CardContent>
      </Card>

      {isLoading ? (
        <div>로딩 중...</div>
      ) : (
        <StatementTable data={data} />
      )}
    </div>
  );
}
```

---

## ✅ 완료 조건

1. **Backend API 3개 동작 확인**
   - GET /dashboard/receivables
   - GET /reports/receivable-statement/:clientId
   - GET /receivables/due-schedule

2. **Frontend 대시보드**
   - KPI 카드 4개 표시
   - Top 거래처 차트 렌더링
   - 월별 수금 추이 차트 렌더링

3. **리포트**
   - 거래처별 명세서 조회
   - 인쇄 기능 동작

---

## 📝 Claude에게 요청할 내용

```
미수금 관리 Day 4 작업을 진행해주세요.

Backend:
1. DashboardController, DashboardService 생성
2. ReportsController, ReportsService 생성
3. DTO 생성 (QueryStatementDto, QueryDueScheduleDto)
4. 3개 API 엔드포인트 구현

Frontend:
1. app/(dashboard)/accounting/dashboard/page.tsx 생성
2. 대시보드 컴포넌트 4개 생성:
   - ReceivablesKPI.tsx
   - TopClientsChart.tsx
   - MonthlyCollectionChart.tsx
3. 명세서 페이지: reports/receivable-statement/[clientId]/page.tsx
4. recharts 라이브러리 설치 및 차트 구현

모든 코드에 타입 안전성, 반응형 레이아웃 포함해주세요.
완료 후 대시보드 및 리포트 페이지 동작 테스트를 실행해주세요.
```

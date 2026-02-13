# Day 2 프롬프트: 조회 API 및 Frontend 목록 구현

---

## 🎯 목표
거래처별 미수금 현황, Aging 분석 API 구현 및 Frontend 목록 페이지 완성

---

## 📋 Backend 요구사항

### 1. 거래처별 미수금 요약 API

**GET /api/v1/accounting/receivables/summary**

**DTO**: query-receivables-summary.dto.ts
```typescript
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryReceivablesSummaryDto {
  @ApiPropertyOptional({ description: '거래처 ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
```

**Service 메서드**:
```typescript
async getSummary(query: QueryReceivablesSummaryDto) {
  const where = {
    ...(query.clientId && { clientId: query.clientId }),
    ...(query.startDate && {
      issueDate: { gte: new Date(query.startDate) }
    }),
    ...(query.endDate && {
      issueDate: { lte: new Date(query.endDate) }
    })
  };

  const receivables = await this.prisma.receivable.findMany({
    where,
    include: {
      client: {
        select: { id: true, name: true }
      }
    },
    orderBy: { balance: 'desc' }
  });

  // 거래처별 집계
  const summary = receivables.reduce((acc, r) => {
    const existing = acc.find(item => item.clientId === r.clientId);
    if (existing) {
      existing.totalOriginal += Number(r.originalAmount);
      existing.totalPaid += Number(r.paidAmount);
      existing.totalBalance += Number(r.balance);
      existing.count += 1;
    } else {
      acc.push({
        clientId: r.clientId,
        clientName: r.client.name,
        totalOriginal: Number(r.originalAmount),
        totalPaid: Number(r.paidAmount),
        totalBalance: Number(r.balance),
        count: 1
      });
    }
    return acc;
  }, []);

  return summary.sort((a, b) => b.totalBalance - a.totalBalance);
}
```

**응답 예시**:
```json
[
  {
    "clientId": "client1",
    "clientName": "A사진관",
    "totalOriginal": 5000000,
    "totalPaid": 2000000,
    "totalBalance": 3000000,
    "count": 5
  }
]
```

### 2. Aging 분석 API

**GET /api/v1/accounting/receivables/aging**

**DTO**: query-receivables-aging.dto.ts
```typescript
import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryReceivablesAgingDto {
  @ApiPropertyOptional({ description: '기준일 (미지정 시 오늘)' })
  @IsOptional()
  @IsDateString()
  baseDate?: string;
}
```

**Service 메서드**:
```typescript
async getAging(query: QueryReceivablesAgingDto) {
  const baseDate = query.baseDate ? new Date(query.baseDate) : new Date();

  const receivables = await this.prisma.receivable.findMany({
    where: { balance: { gt: 0 } },
    include: { client: true }
  });

  const aging = {
    current: { count: 0, amount: 0 },      // 30일 이내
    days30: { count: 0, amount: 0 },       // 31-60일
    days60: { count: 0, amount: 0 },       // 61-90일
    days90Plus: { count: 0, amount: 0 }    // 90일 초과
  };

  receivables.forEach(r => {
    const daysOverdue = Math.floor(
      (baseDate.getTime() - new Date(r.issueDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const balance = Number(r.balance);

    if (daysOverdue <= 30) {
      aging.current.count++;
      aging.current.amount += balance;
    } else if (daysOverdue <= 60) {
      aging.days30.count++;
      aging.days30.amount += balance;
    } else if (daysOverdue <= 90) {
      aging.days60.count++;
      aging.days60.amount += balance;
    } else {
      aging.days90Plus.count++;
      aging.days90Plus.amount += balance;
    }
  });

  return aging;
}
```

**응답 예시**:
```json
{
  "current": { "count": 15, "amount": 5000000 },
  "days30": { "count": 8, "amount": 3000000 },
  "days60": { "count": 3, "amount": 1500000 },
  "days90Plus": { "count": 2, "amount": 800000 }
}
```

### 3. 통계 API

**GET /api/v1/accounting/receivables/stats**

**Service 메서드**:
```typescript
async getStats() {
  // 총 미수금
  const totalReceivables = await this.prisma.receivable.aggregate({
    where: { balance: { gt: 0 } },
    _sum: { balance: true },
    _count: true
  });

  // 거래처 수
  const uniqueClients = await this.prisma.receivable.groupBy({
    by: ['clientId'],
    where: { balance: { gt: 0 } }
  });

  // 평균 회수기간 계산
  const receivables = await this.prisma.receivable.findMany({
    where: { balance: { eq: 0 } },
    include: { payments: true }
  });

  const avgCollectionDays = receivables.length > 0
    ? receivables.reduce((acc, r) => {
        if (r.payments.length > 0) {
          const lastPayment = r.payments.sort(
            (a, b) => b.paymentDate.getTime() - a.paymentDate.getTime()
          )[0];
          const days = Math.floor(
            (lastPayment.paymentDate.getTime() - r.issueDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          return acc + days;
        }
        return acc;
      }, 0) / receivables.length
    : 0;

  // Top 5 거래처
  const summary = await this.getSummary({});
  const topClients = summary.slice(0, 5);

  return {
    totalAmount: Number(totalReceivables._sum.balance || 0),
    totalCount: totalReceivables._count,
    clientCount: uniqueClients.length,
    avgCollectionDays: Math.round(avgCollectionDays),
    topClients
  };
}
```

### 4. Controller 업데이트

```typescript
@Controller('accounting/receivables')
export class ReceivablesController {
  // ... 기존 메서드들

  @Get('summary')
  getSummary(@Query() query: QueryReceivablesSummaryDto) {
    return this.receivablesService.getSummary(query);
  }

  @Get('aging')
  getAging(@Query() query: QueryReceivablesAgingDto) {
    return this.receivablesService.getAging(query);
  }

  @Get('stats')
  getStats() {
    return this.receivablesService.getStats();
  }
}
```

---

## 📋 Frontend 요구사항

### 1. TanStack Query Hooks

**apps/web/hooks/use-receivables.ts**

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// 미수금 목록
export function useReceivables(filters?: {
  clientId?: string;
  startDate?: string;
  endDate?: string;
  status?: 'pending' | 'paid';
}) {
  return useQuery({
    queryKey: ['receivables', filters],
    queryFn: () => api.get('/accounting/receivables', { params: filters }),
    staleTime: 1000 * 60 * 5 // 5분
  });
}

// 거래처별 요약
export function useReceivablesSummary(filters?: {
  clientId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['receivables', 'summary', filters],
    queryFn: () => api.get('/accounting/receivables/summary', { params: filters })
  });
}

// Aging 분석
export function useReceivablesAging(baseDate?: string) {
  return useQuery({
    queryKey: ['receivables', 'aging', baseDate],
    queryFn: () => api.get('/accounting/receivables/aging', {
      params: { baseDate }
    })
  });
}

// 통계
export function useReceivablesStats() {
  return useQuery({
    queryKey: ['receivables', 'stats'],
    queryFn: () => api.get('/accounting/receivables/stats'),
    refetchInterval: 1000 * 60 * 10 // 10분마다 자동 갱신
  });
}
```

### 2. 페이지 레이아웃

**apps/web/app/(dashboard)/accounting/receivables/page.tsx**

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReceivablesTable } from './components/receivables-table';
import { AgingAnalysis } from './components/aging-analysis';
import { ReceivablesFilters } from './components/receivables-filters';
import { useReceivablesSummary, useReceivablesStats } from '@/hooks/use-receivables';

export default function ReceivablesPage() {
  const [filters, setFilters] = useState({});
  const { data: summary, isLoading } = useReceivablesSummary(filters);
  const { data: stats } = useReceivablesStats();

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold">미수금 현황</h1>
        <p className="text-muted-foreground">거래처별 매출채권 관리</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 미수금</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₩{stats?.totalAmount.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">미수 건수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">거래처 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.clientCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">평균 회수기간</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgCollectionDays || 0}일</div>
          </CardContent>
        </Card>
      </div>

      {/* Aging 분석 */}
      <AgingAnalysis />

      {/* 필터 */}
      <ReceivablesFilters onFilterChange={setFilters} />

      {/* 테이블 */}
      <ReceivablesTable data={summary} isLoading={isLoading} />
    </div>
  );
}
```

### 3. 테이블 컴포넌트

**components/receivables-table.tsx**

```tsx
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ReceivablesTableProps {
  data: any[];
  isLoading: boolean;
}

export function ReceivablesTable({ data, isLoading }: ReceivablesTableProps) {
  if (isLoading) return <div>로딩 중...</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>거래처</TableHead>
          <TableHead className="text-right">발생금액</TableHead>
          <TableHead className="text-right">수금액</TableHead>
          <TableHead className="text-right">잔액</TableHead>
          <TableHead className="text-right">건수</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.map((item) => (
          <TableRow key={item.clientId}>
            <TableCell className="font-medium">{item.clientName}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(item.totalOriginal)}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(item.totalPaid)}
            </TableCell>
            <TableCell className="text-right font-bold">
              {formatCurrency(item.totalBalance)}
            </TableCell>
            <TableCell className="text-right">
              <Badge variant="secondary">{item.count}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### 4. Aging 분석 컴포넌트

**components/aging-analysis.tsx**

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useReceivablesAging } from '@/hooks/use-receivables';
import { formatCurrency } from '@/lib/utils';

export function AgingAnalysis() {
  const { data: aging } = useReceivablesAging();

  const segments = [
    { label: '30일 이내', key: 'current', color: 'bg-green-500' },
    { label: '31-60일', key: 'days30', color: 'bg-yellow-500' },
    { label: '61-90일', key: 'days60', color: 'bg-orange-500' },
    { label: '90일 초과', key: 'days90Plus', color: 'bg-red-500' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging 분석</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          {segments.map((segment) => (
            <div key={segment.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${segment.color}`} />
                <span className="text-sm font-medium">{segment.label}</span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {formatCurrency(aging?.[segment.key]?.amount || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {aging?.[segment.key]?.count || 0}건
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5. 필터 컴포넌트

**components/receivables-filters.tsx**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReceivablesFiltersProps {
  onFilterChange: (filters: any) => void;
}

export function ReceivablesFilters({ onFilterChange }: ReceivablesFiltersProps) {
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [clientId, setClientId] = useState('');

  const handleApply = () => {
    onFilterChange({
      startDate: dateRange.from?.toISOString(),
      endDate: dateRange.to?.toISOString(),
      clientId: clientId || undefined
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder="기간 선택"
          />
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="거래처 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체</SelectItem>
              {/* 거래처 목록 로드 */}
            </SelectContent>
          </Select>
          <Button onClick={handleApply}>조회</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## ✅ 완료 조건

1. **Backend API 3개 동작 확인**
   - GET /receivables/summary
   - GET /receivables/aging
   - GET /receivables/stats

2. **Frontend 페이지 렌더링**
   - 통계 카드 4개 표시
   - Aging 분석 표시
   - 거래처별 미수금 테이블 표시

3. **필터 기능**
   - 기간 필터 적용
   - 거래처 필터 적용
   - 실시간 데이터 반영

---

## 📝 Claude에게 요청할 내용

```
미수금 관리 Day 2 작업을 진행해주세요.

Backend:
1. ReceivablesService에 summary, aging, stats 메서드 추가
2. 3개 DTO 생성 (QueryReceivablesSummaryDto, QueryReceivablesAgingDto)
3. ReceivablesController에 3개 엔드포인트 추가

Frontend:
1. use-receivables.ts 훅 파일 생성 (4개 훅)
2. app/(dashboard)/accounting/receivables/page.tsx 생성
3. components/ 디렉토리에 4개 컴포넌트 생성:
   - receivables-table.tsx
   - aging-analysis.tsx
   - receivables-filters.tsx
4. shadcn/ui 컴포넌트 사용 (Table, Card, Badge, DateRangePicker, Select)

모든 코드에 타입 안전성, 에러 처리, 로딩 상태 포함해주세요.
완료 후 페이지 접속 및 데이터 조회 테스트를 실행해주세요.
```

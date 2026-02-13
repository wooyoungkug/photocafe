# Day 2 추가: 영업담당자별 집계 및 수금 리스트

**이 문서는 Day 2 작업에 추가로 진행할 영업담당자별 기능입니다.**

---

## 🎯 목표
영업담당자별 미수금 현황, 수금 실적, 성과 분석 기능 추가

---

## 📋 Backend 요구사항

### 1. Prisma 스키마 수정

**Client 모델에 영업담당자 필드 추가**

```prisma
model Client {
  // ... 기존 필드들

  // 영업담당자 추가
  salesStaffId        String?
  salesStaff          Staff?        @relation("SalesStaff", fields: [salesStaffId], references: [id])

  // ... 기존 관계들
  receivables         Receivable[]
  salesLedger         SalesLedger[]

  @@index([salesStaffId])
}

model Staff {
  // ... 기존 필드들

  // 담당 고객 추가
  managedClients      Client[]      @relation("SalesStaff")
}
```

**마이그레이션**:
```bash
cd /c/dev/printing114/apps/api
npx prisma db push
```

### 2. 영업담당자별 미수금 요약 API

**GET /api/v1/accounting/receivables/summary-by-staff**

**DTO**: query-receivables-by-staff.dto.ts

```typescript
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryReceivablesByStaffDto {
  @ApiPropertyOptional({ description: '영업담당자 ID' })
  @IsOptional()
  @IsString()
  staffId?: string;

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

**Service 메서드** (receivables.service.ts):

```typescript
async getSummaryByStaff(query: QueryReceivablesByStaffDto) {
  const where = {
    ...(query.startDate && {
      issueDate: { gte: new Date(query.startDate) }
    }),
    ...(query.endDate && {
      issueDate: { lte: new Date(query.endDate) }
    })
  };

  // 영업담당자별 집계
  const receivables = await this.prisma.receivable.findMany({
    where: {
      ...where,
      balance: { gt: 0 },
      client: {
        salesStaffId: query.staffId ? query.staffId : { not: null }
      }
    },
    include: {
      client: {
        include: {
          salesStaff: {
            select: { id: true, name: true, staffId: true }
          }
        }
      }
    }
  });

  // 담당자별 그룹화
  const summaryMap = new Map();

  receivables.forEach(r => {
    const staffId = r.client.salesStaff?.id;
    if (!staffId) return;

    if (!summaryMap.has(staffId)) {
      summaryMap.set(staffId, {
        staffId: staffId,
        staffName: r.client.salesStaff.name,
        staffCode: r.client.salesStaff.staffId,
        totalOriginal: 0,
        totalPaid: 0,
        totalBalance: 0,
        clientCount: new Set(),
        receivableCount: 0
      });
    }

    const summary = summaryMap.get(staffId);
    summary.totalOriginal += Number(r.originalAmount);
    summary.totalPaid += Number(r.paidAmount);
    summary.totalBalance += Number(r.balance);
    summary.clientCount.add(r.client.id);
    summary.receivableCount += 1;
  });

  // Set을 숫자로 변환
  const result = Array.from(summaryMap.values()).map(item => ({
    ...item,
    clientCount: item.clientCount.size
  }));

  // 잔액 많은 순으로 정렬
  return result.sort((a, b) => b.totalBalance - a.totalBalance);
}
```

**Controller 엔드포인트 추가**:

```typescript
@Get('summary-by-staff')
@ApiOperation({ summary: '영업담당자별 미수금 요약' })
getSummaryByStaff(@Query() query: QueryReceivablesByStaffDto) {
  return this.receivablesService.getSummaryByStaff(query);
}
```

**응답 예시**:
```json
[
  {
    "staffId": "staff-1",
    "staffName": "김영업",
    "staffCode": "S001",
    "totalOriginal": 15000000,
    "totalPaid": 8000000,
    "totalBalance": 7000000,
    "clientCount": 12,
    "receivableCount": 25
  },
  {
    "staffId": "staff-2",
    "staffName": "이담당",
    "staffCode": "S002",
    "totalOriginal": 10000000,
    "totalPaid": 5000000,
    "totalBalance": 5000000,
    "clientCount": 8,
    "receivableCount": 18
  }
]
```

### 3. 영업담당자별 수금 실적 API

**GET /api/v1/accounting/receivables/collection-by-staff**

**Service 메서드**:

```typescript
async getCollectionByStaff(query: QueryReceivablesByStaffDto) {
  const where = {
    ...(query.startDate && {
      paymentDate: { gte: new Date(query.startDate) }
    }),
    ...(query.endDate && {
      paymentDate: { lte: new Date(query.endDate) }
    })
  };

  // 수금 이력 조회
  const payments = await this.prisma.receivablePayment.findMany({
    where,
    include: {
      receivable: {
        include: {
          client: {
            include: {
              salesStaff: {
                select: { id: true, name: true, staffId: true }
              }
            }
          }
        }
      }
    }
  });

  // 담당자별 그룹화
  const collectionMap = new Map();

  payments.forEach(p => {
    const staffId = p.receivable.client.salesStaff?.id;
    if (!staffId) return;

    if (!collectionMap.has(staffId)) {
      collectionMap.set(staffId, {
        staffId: staffId,
        staffName: p.receivable.client.salesStaff.name,
        staffCode: p.receivable.client.salesStaff.staffId,
        totalAmount: 0,
        count: 0,
        cashAmount: 0,
        bankAmount: 0,
        cardAmount: 0
      });
    }

    const collection = collectionMap.get(staffId);
    collection.totalAmount += Number(p.amount);
    collection.count += 1;

    // 수금 방법별 집계
    if (p.paymentMethod === 'CASH') {
      collection.cashAmount += Number(p.amount);
    } else if (p.paymentMethod === 'BANK_TRANSFER') {
      collection.bankAmount += Number(p.amount);
    } else if (p.paymentMethod === 'CARD') {
      collection.cardAmount += Number(p.amount);
    }
  });

  const result = Array.from(collectionMap.values());
  return result.sort((a, b) => b.totalAmount - a.totalAmount);
}
```

**Controller 엔드포인트**:

```typescript
@Get('collection-by-staff')
@ApiOperation({ summary: '영업담당자별 수금 실적' })
getCollectionByStaff(@Query() query: QueryReceivablesByStaffDto) {
  return this.receivablesService.getCollectionByStaff(query);
}
```

### 4. 영업담당자별 상세 미수금 목록 API

**GET /api/v1/accounting/receivables/by-staff/:staffId**

**Service 메서드**:

```typescript
async getReceivablesByStaff(staffId: string, query: QueryReceivablesDto) {
  const where = {
    client: { salesStaffId: staffId },
    ...(query.startDate && {
      issueDate: { gte: new Date(query.startDate) }
    }),
    ...(query.endDate && {
      issueDate: { lte: new Date(query.endDate) }
    }),
    ...(query.status === 'pending' && { balance: { gt: 0 } }),
    ...(query.status === 'paid' && { balance: { eq: 0 } })
  };

  const receivables = await this.prisma.receivable.findMany({
    where,
    include: {
      client: {
        select: { id: true, clientName: true }
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        take: 1
      }
    },
    orderBy: [
      { balance: 'desc' },
      { issueDate: 'desc' }
    ]
  });

  return receivables.map(r => ({
    ...r,
    lastPaymentDate: r.payments[0]?.paymentDate,
    daysOverdue: r.dueDate
      ? Math.floor((new Date().getTime() - r.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : null
  }));
}
```

**Controller 엔드포인트**:

```typescript
@Get('by-staff/:staffId')
@ApiOperation({ summary: '영업담당자별 미수금 상세 목록' })
getReceivablesByStaff(
  @Param('staffId') staffId: string,
  @Query() query: QueryReceivablesDto
) {
  return this.receivablesService.getReceivablesByStaff(staffId, query);
}
```

---

## 📋 Frontend 요구사항

### 1. TanStack Query Hooks

**apps/web/hooks/use-receivables-by-staff.ts**

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// 영업담당자별 요약
export function useReceivablesSummaryByStaff(filters?: {
  staffId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['receivables', 'summary-by-staff', filters],
    queryFn: () => api.get('/accounting/receivables/summary-by-staff', { params: filters }),
    staleTime: 1000 * 60 * 5
  });
}

// 영업담당자별 수금 실적
export function useCollectionByStaff(filters?: {
  staffId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['receivables', 'collection-by-staff', filters],
    queryFn: () => api.get('/accounting/receivables/collection-by-staff', { params: filters }),
    staleTime: 1000 * 60 * 5
  });
}

// 영업담당자별 미수금 목록
export function useReceivablesByStaff(staffId: string, filters?: {
  startDate?: string;
  endDate?: string;
  status?: 'pending' | 'paid';
}) {
  return useQuery({
    queryKey: ['receivables', 'by-staff', staffId, filters],
    queryFn: () => api.get(`/accounting/receivables/by-staff/${staffId}`, { params: filters }),
    enabled: !!staffId
  });
}

// 영업담당자 목록
export function useSalesStaffList() {
  return useQuery({
    queryKey: ['staff', 'sales'],
    queryFn: () => api.get('/staff', {
      params: { departmentCode: 'SALES' } // 영업부서 코드
    })
  });
}
```

### 2. 영업담당자별 현황 페이지

**apps/web/app/(dashboard)/accounting/receivables/by-staff/page.tsx**

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StaffSummaryTable } from './components/staff-summary-table';
import { CollectionByStaffChart } from './components/collection-by-staff-chart';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useReceivablesSummaryByStaff, useCollectionByStaff } from '@/hooks/use-receivables-by-staff';

export default function ReceivablesByStaffPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });

  const { data: summary, isLoading: summaryLoading } = useReceivablesSummaryByStaff({
    startDate: dateRange.from?.toISOString(),
    endDate: dateRange.to?.toISOString()
  });

  const { data: collection, isLoading: collectionLoading } = useCollectionByStaff({
    startDate: dateRange.from?.toISOString(),
    endDate: dateRange.to?.toISOString()
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">영업담당자별 미수금 현황</h1>
        <p className="text-muted-foreground">영업담당자별 매출채권 및 수금 실적</p>
      </div>

      {/* 기간 선택 */}
      <Card>
        <CardContent className="pt-6">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </CardContent>
      </Card>

      {/* 영업담당자별 미수금 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>영업담당자별 미수금 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffSummaryTable data={summary} isLoading={summaryLoading} />
        </CardContent>
      </Card>

      {/* 영업담당자별 수금 실적 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>영업담당자별 수금 실적</CardTitle>
        </CardHeader>
        <CardContent>
          <CollectionByStaffChart data={collection} isLoading={collectionLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3. 영업담당자별 요약 테이블

**components/staff-summary-table.tsx**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { ChevronRightIcon } from 'lucide-react';

interface StaffSummaryTableProps {
  data: Array<{
    staffId: string;
    staffName: string;
    staffCode: string;
    totalOriginal: number;
    totalPaid: number;
    totalBalance: number;
    clientCount: number;
    receivableCount: number;
  }>;
  isLoading: boolean;
}

export function StaffSummaryTable({ data, isLoading }: StaffSummaryTableProps) {
  const router = useRouter();

  if (isLoading) return <div>로딩 중...</div>;

  // 합계 계산
  const totals = data?.reduce(
    (acc, item) => ({
      totalOriginal: acc.totalOriginal + item.totalOriginal,
      totalPaid: acc.totalPaid + item.totalPaid,
      totalBalance: acc.totalBalance + item.totalBalance,
      clientCount: acc.clientCount + item.clientCount,
      receivableCount: acc.receivableCount + item.receivableCount
    }),
    { totalOriginal: 0, totalPaid: 0, totalBalance: 0, clientCount: 0, receivableCount: 0 }
  );

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>담당자</TableHead>
            <TableHead>사번</TableHead>
            <TableHead className="text-right">발생금액</TableHead>
            <TableHead className="text-right">수금액</TableHead>
            <TableHead className="text-right">미수잔액</TableHead>
            <TableHead className="text-center">담당 고객</TableHead>
            <TableHead className="text-center">미수 건수</TableHead>
            <TableHead className="text-right">수금률</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((item) => {
            const collectionRate = item.totalOriginal > 0
              ? ((item.totalPaid / item.totalOriginal) * 100).toFixed(1)
              : '0.0';

            return (
              <TableRow key={item.staffId}>
                <TableCell className="font-medium">{item.staffName}</TableCell>
                <TableCell>
                  <Badge variant="outline">{item.staffCode}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.totalOriginal)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.totalPaid)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatCurrency(item.totalBalance)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{item.clientCount}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{item.receivableCount}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={Number(collectionRate) >= 80 ? 'default' : 'destructive'}
                  >
                    {collectionRate}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      router.push(`/accounting/receivables/by-staff/${item.staffId}`)
                    }
                  >
                    상세
                    <ChevronRightIcon className="h-4 w-4 ml-1" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}

          {/* 합계 행 */}
          {data?.length > 0 && (
            <TableRow className="bg-muted/50 font-bold">
              <TableCell colSpan={2}>합계</TableCell>
              <TableCell className="text-right">
                {formatCurrency(totals.totalOriginal)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(totals.totalPaid)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(totals.totalBalance)}
              </TableCell>
              <TableCell className="text-center">{totals.clientCount}</TableCell>
              <TableCell className="text-center">{totals.receivableCount}</TableCell>
              <TableCell className="text-right">
                {totals.totalOriginal > 0
                  ? ((totals.totalPaid / totals.totalOriginal) * 100).toFixed(1)
                  : '0.0'}
                %
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {data?.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          데이터가 없습니다.
        </div>
      )}
    </div>
  );
}
```

### 4. 수금 실적 차트

**components/collection-by-staff-chart.tsx**

```tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface CollectionByStaffChartProps {
  data: Array<{
    staffName: string;
    totalAmount: number;
    cashAmount: number;
    bankAmount: number;
    cardAmount: number;
    count: number;
  }>;
  isLoading: boolean;
}

export function CollectionByStaffChart({ data, isLoading }: CollectionByStaffChartProps) {
  if (isLoading) return <div>로딩 중...</div>;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <XAxis
          dataKey="staffName"
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
        <Legend />
        <Bar dataKey="cashAmount" name="현금" fill="#10b981" stackId="a" />
        <Bar dataKey="bankAmount" name="계좌이체" fill="#3b82f6" stackId="a" />
        <Bar dataKey="cardAmount" name="카드" fill="#f59e0b" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### 5. 담당자별 상세 미수금 목록 페이지

**apps/web/app/(dashboard)/accounting/receivables/by-staff/[staffId]/page.tsx**

```tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReceivablesDetailTable } from './components/receivables-detail-table';
import { useReceivablesByStaff, useSalesStaffList } from '@/hooks/use-receivables-by-staff';

export default function StaffReceivablesDetailPage() {
  const params = useParams();
  const staffId = params.staffId as string;

  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), 0, 1), // 올해 1월 1일
    to: new Date()
  });
  const [status, setStatus] = useState<'all' | 'pending' | 'paid'>('pending');

  const { data: staffList } = useSalesStaffList();
  const { data: receivables, isLoading } = useReceivablesByStaff(staffId, {
    startDate: dateRange.from?.toISOString(),
    endDate: dateRange.to?.toISOString(),
    status: status === 'all' ? undefined : status
  });

  const currentStaff = staffList?.find((s) => s.id === staffId);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          {currentStaff?.name} 담당 미수금 현황
        </h1>
        <p className="text-muted-foreground">
          사번: {currentStaff?.staffId}
        </p>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">미수</SelectItem>
                <SelectItem value="paid">완납</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 상세 목록 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>미수금 상세 내역</CardTitle>
            <Badge variant="secondary">
              총 {receivables?.length || 0}건
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ReceivablesDetailTable data={receivables} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## ✅ 완료 조건

1. **DB 스키마 업데이트**
   - Client 모델에 salesStaffId 필드 추가
   - Staff 관계 설정
   - `npx prisma db push` 성공

2. **Backend API 3개 동작 확인**
   - GET /receivables/summary-by-staff
   - GET /receivables/collection-by-staff
   - GET /receivables/by-staff/:staffId

3. **Frontend 페이지 2개**
   - 영업담당자별 현황 페이지
   - 담당자별 상세 목록 페이지

4. **기능 동작 확인**
   - 영업담당자별 집계 정확성
   - 수금 실적 차트 렌더링
   - 상세 목록 필터링 동작

---

## 📝 Claude에게 요청할 내용

```
미수금 관리 Day 2에 영업담당자별 집계 기능을 추가해주세요.

1. Prisma Schema 수정:
   - Client 모델에 salesStaffId 필드 추가
   - Staff와 관계 설정
   - npx prisma db push 실행

2. Backend API 3개 추가:
   - GET /receivables/summary-by-staff (영업담당자별 요약)
   - GET /receivables/collection-by-staff (영업담당자별 수금 실적)
   - GET /receivables/by-staff/:staffId (담당자별 상세 목록)

3. Frontend:
   - use-receivables-by-staff.ts 훅 파일 생성
   - app/(dashboard)/accounting/receivables/by-staff/page.tsx 생성
   - components/staff-summary-table.tsx 생성
   - components/collection-by-staff-chart.tsx 생성
   - app/(dashboard)/accounting/receivables/by-staff/[staffId]/page.tsx 생성

4. 기능:
   - 영업담당자별 미수금 집계 (발생액, 수금액, 잔액)
   - 담당 고객 수, 미수 건수 표시
   - 수금률 계산 및 표시 (80% 이상 녹색, 미만 빨간색)
   - 수금 방법별 집계 (현금/계좌이체/카드)
   - recharts 스택 바 차트로 시각화

모든 코드에 타입 안전성, 반응형 레이아웃, 에러 처리 포함해주세요.
완료 후 영업담당자별 현황 페이지 접속 및 데이터 확인 테스트를 실행해주세요.
```

'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, BarChart3, Clock, ListOrdered } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCSTimeSeries } from '@/hooks/use-cs';
import type { CSTimeSeriesPeriod } from '@/lib/types/cs';

const PERIOD_LABELS: Record<CSTimeSeriesPeriod, string> = {
  daily: '일별',
  monthly: '월별',
  yearly: '연도별',
};

const STATUS_COLORS = {
  open: '#3b82f6',
  in_progress: '#eab308',
  resolved: '#22c55e',
  closed: '#64748b',
};

export function CSTimeSeriesSection() {
  const [period, setPeriod] = useState<CSTimeSeriesPeriod>('daily');
  const { data, isLoading } = useCSTimeSeries(period);

  const buckets = data?.buckets ?? [];
  const topCategories = data?.topCategories ?? [];

  const periodSuffix = period === 'daily' ? '일' : period === 'monthly' ? '개월' : '년';
  const rangeLabel =
    period === 'daily' ? '최근 30일' : period === 'monthly' ? '최근 12개월' : '최근 5년';

  return (
    <div className="space-y-4">
      {/* 섹션 헤더 + 기간 토글 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[24px] text-black font-normal">통계</h2>
          <p className="text-[14px] text-black font-normal mt-0.5">
            {rangeLabel} · {PERIOD_LABELS[period]} 기준
          </p>
        </div>
        <div className="flex gap-1">
          {(Object.keys(PERIOD_LABELS) as CSTimeSeriesPeriod[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              className="h-8 px-3 text-[14px]"
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. 신규 접수 추이 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              신규 접수 건수
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[280px] flex items-center justify-center text-slate-400 text-[14px]">
                로딩 중...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={buckets} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    formatter={(v: number) => [`${v}건`, '신규 접수']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="newCount"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#3b82f6' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 2. 상태별 누적 막대 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-yellow-600" />
              상태별 처리 건수
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[280px] flex items-center justify-center text-slate-400 text-[14px]">
                로딩 중...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={buckets} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="openCount" name="접수" stackId="s" fill={STATUS_COLORS.open} />
                  <Bar
                    dataKey="inProgressCount"
                    name="처리중"
                    stackId="s"
                    fill={STATUS_COLORS.in_progress}
                  />
                  <Bar
                    dataKey="resolvedCount"
                    name="해결"
                    stackId="s"
                    fill={STATUS_COLORS.resolved}
                  />
                  <Bar
                    dataKey="closedCount"
                    name="종료"
                    stackId="s"
                    fill={STATUS_COLORS.closed}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 3. 평균 해결 시간 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              평균 해결 시간 (분)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[280px] flex items-center justify-center text-slate-400 text-[14px]">
                로딩 중...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={buckets} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    formatter={(v: number) => [`${v}분`, '평균 해결시간']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgResolutionMin"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#22c55e' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 4. 분류 Top 5 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-indigo-600" />
              분류별 Top 5
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[280px] flex items-center justify-center text-slate-400 text-[14px]">
                로딩 중...
              </div>
            ) : topCategories.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-slate-400 text-[14px]">
                데이터 없음
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={topCategories}
                  layout="vertical"
                  margin={{ left: 16, right: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    width={100}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v}건`, '상담 수']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {topCategories.map((c) => (
                      <Cell key={c.categoryId} fill={c.colorCode} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-[12px] text-slate-400 text-right">
        ※ 표시 기간: {rangeLabel} ({buckets.length}{periodSuffix})
      </p>
    </div>
  );
}

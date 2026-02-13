'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MonthlyTrendData {
  month: string;
  sales: number;
  received: number;
  outstanding: number;
  count: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyTrendData[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const formatCurrency = (value: number) => {
    return `₩${value.toLocaleString('ko-KR')}`;
  };

  const formatMonth = (month: string) => {
    // YYYY-MM 형식을 MM월로 변환
    const [, m] = month.split('-');
    return `${parseInt(m)}월`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>월별 거래 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickFormatter={formatMonth} />
            <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`} />
            <Tooltip
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  sales: '매출',
                  received: '수금',
                  outstanding: '미수금',
                };
                return [formatCurrency(value), labels[name] || name];
              }}
              labelFormatter={formatMonth}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  sales: '매출',
                  received: '수금',
                  outstanding: '미수금',
                };
                return labels[value] || value;
              }}
            />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="received"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="outstanding"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* 통계 요약 */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="text-xs text-blue-600 mb-1">평균 매출</div>
            <div className="text-lg font-bold text-blue-900">
              {formatCurrency(data.reduce((sum, d) => sum + d.sales, 0) / data.length)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="text-xs text-green-600 mb-1">평균 수금</div>
            <div className="text-lg font-bold text-green-900">
              {formatCurrency(data.reduce((sum, d) => sum + d.received, 0) / data.length)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
            <div className="text-xs text-orange-600 mb-1">평균 미수금</div>
            <div className="text-lg font-bold text-orange-900">
              {formatCurrency(data.reduce((sum, d) => sum + d.outstanding, 0) / data.length)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

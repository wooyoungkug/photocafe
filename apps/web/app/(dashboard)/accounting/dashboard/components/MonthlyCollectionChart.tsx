'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyData {
  month: string;
  received: number;
  count: number;
}

interface MonthlyCollectionChartProps {
  data: MonthlyData[];
}

export default function MonthlyCollectionChart({ data }: MonthlyCollectionChartProps) {
  const chartData = data.map(item => ({
    month: item.month,
    입금액: item.received,
    건수: item.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>월별 입금 추이 (최근 6개월)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip
              formatter={(value: any, name: any) => {
                if (name === '입금액') {
                  return `${Number(value).toLocaleString()}원`;
                }
                return value;
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="입금액"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="건수"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* 요약 */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-muted-foreground">총 입금액</p>
            <p className="text-lg font-bold text-green-600">
              {data.reduce((sum, d) => sum + d.received, 0).toLocaleString()}원
            </p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-muted-foreground">총 건수</p>
            <p className="text-lg font-bold text-blue-600">
              {data.reduce((sum, d) => sum + d.count, 0).toLocaleString()}건
            </p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-muted-foreground">평균 입금액</p>
            <p className="text-lg font-bold text-purple-600">
              {data.length > 0
                ? Math.round(data.reduce((sum, d) => sum + d.received, 0) / data.length).toLocaleString()
                : 0}
              원
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

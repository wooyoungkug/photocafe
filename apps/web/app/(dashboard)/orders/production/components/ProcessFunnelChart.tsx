'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ProcessFunnelChartProps {
  data: Record<string, number> | undefined;
  isLoading: boolean;
}

const PROCESS_LABELS: Record<string, string> = {
  receipt_pending: '접수대기',
  post_processing: '후가공',
  binding: '제본',
  inspection: '검수',
  completed: '완료',
  unknown: '미분류',
};

const PROCESS_COLORS: Record<string, string> = {
  receipt_pending: '#64748b',
  post_processing: '#3b82f6',
  binding: '#8b5cf6',
  inspection: '#f59e0b',
  completed: '#10b981',
  unknown: '#9ca3af',
};

const PROCESS_ORDER = ['receipt_pending', 'post_processing', 'binding', 'inspection', 'completed'];

export default function ProcessFunnelChart({ data, isLoading }: ProcessFunnelChartProps) {
  const chartData = PROCESS_ORDER.map(key => ({
    key,
    name: PROCESS_LABELS[key],
    건수: data?.[key] ?? 0,
    fill: PROCESS_COLORS[key],
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-[18px] font-bold text-black">공정 단계별 현황</CardTitle>
        <p className="text-[13px] text-gray-500">생산진행 중인 주문의 공정 단계 분포</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center text-gray-400 text-[14px]">
            불러오는 중...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={60}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [`${value}건`, '주문 수']}
              />
              <Bar dataKey="건수" radius={[0, 4, 4, 0]}>
                {chartData.map(entry => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

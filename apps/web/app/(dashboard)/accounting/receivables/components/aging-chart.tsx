'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AgingAnalysis } from '@/hooks/use-sales-ledger';

interface AgingChartProps {
  data: AgingAnalysis;
}

export function AgingChart({ data }: AgingChartProps) {
  const chartData = [
    { name: '30일 이내', value: data.under30, fill: '#3b82f6' },
    { name: '31-60일', value: data.days30to60, fill: '#eab308' },
    { name: '61-90일', value: data.days60to90, fill: '#f97316' },
    { name: '90일 초과', value: data.over90, fill: '#ef4444' },
  ];

  const formatCurrency = (value: number) => {
    return `₩${value.toLocaleString('ko-KR')}`;
  };

  const total = data.under30 + data.days30to60 + data.days60to90 + data.over90;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging 분석 차트</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`} />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), '미수금']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* 통계 요약 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {chartData.map((item, index) => {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
            return (
              <div key={index} className="p-3 rounded-lg" style={{ backgroundColor: `${item.fill}15` }}>
                <div className="text-xs text-muted-foreground mb-1">{item.name}</div>
                <div className="text-lg font-bold" style={{ color: item.fill }}>
                  {formatCurrency(item.value)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{percentage}%</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

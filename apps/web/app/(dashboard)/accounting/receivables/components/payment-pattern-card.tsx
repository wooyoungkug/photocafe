'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { PaymentPattern } from '@/hooks/use-sales-ledger';

interface PaymentPatternCardProps {
  data: PaymentPattern;
}

export function PaymentPatternCard({ data }: PaymentPatternCardProps) {
  const formatCurrency = (value: number) => {
    return `₩${value.toLocaleString('ko-KR')}`;
  };

  // 도넛 차트 데이터
  const pieData = [
    { name: '정시 결제', value: data.onTimePaymentRate, color: '#22c55e' },
    { name: '지연 결제', value: data.delayedPaymentRate, color: '#f97316' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>수금 패턴 분석</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 평균 결제일 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-600 mb-2">평균 결제일</div>
            <div className="text-3xl font-bold text-blue-900">{data.avgPaymentDays}일</div>
            <div className="text-xs text-blue-600 mt-1">수금예정일 기준</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border">
            <div className="text-sm text-muted-foreground mb-2">중위값 결제일</div>
            <div className="text-3xl font-bold">{data.medianPaymentDays}일</div>
            <div className="text-xs text-muted-foreground mt-1">수금예정일 기준</div>
          </div>
        </div>

        {/* 정시 결제율 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">정시 결제율</span>
            <span className="text-lg font-bold text-green-600">{data.onTimePaymentRate}%</span>
          </div>
          <Progress value={data.onTimePaymentRate} className="h-3" />
          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
            <span>지연 결제율: {data.delayedPaymentRate}%</span>
          </div>
        </div>

        {/* 도넛 차트 */}
        <div>
          <div className="text-sm font-medium mb-3">결제 비율</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 월별 패턴 */}
        {data.seasonality.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-3">월별 평균 결제일</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.seasonality}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickFormatter={(val) => `${val}월`} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}일`, '평균 결제일']}
                  labelFormatter={(val) => `${val}월`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="avgPaymentDays" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 요일별 패턴 */}
        {data.weekdayPattern.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-3">요일별 수금 패턴</div>
            <div className="space-y-2">
              {data.weekdayPattern.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium w-8">{item.weekday}</span>
                    <span className="text-xs text-muted-foreground">{item.count}건</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(item.avgAmount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

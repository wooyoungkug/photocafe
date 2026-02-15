'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TopClient {
  clientId: string;
  clientName: string;
  clientCode: string;
  outstanding: number;
  ledgerCount: number;
}

interface TopClientsChartProps {
  data: TopClient[];
}

export default function TopClientsChart({ data }: TopClientsChartProps) {
  const chartData = data.map(client => ({
    name: client.clientName.length > 8 ? client.clientName.substring(0, 8) + '...' : client.clientName,
    fullName: client.clientName,
    미입금: client.outstanding,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>상위 미입금 거래처 (Top 10)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 차트 */}
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value: any) => [`${Number(value).toLocaleString()}원`, '미입금']}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.name === label);
                  return item?.fullName || label;
                }}
              />
              <Bar dataKey="미입금" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>

          {/* 목록 */}
          <div className="space-y-2">
            {data.slice(0, 5).map((client, index) => (
              <div
                key={client.clientId}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center p-0">
                    {index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium">{client.clientName}</p>
                    <p className="text-xs text-muted-foreground">{client.clientCode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-bold text-orange-600">
                      {client.outstanding.toLocaleString()}원
                    </p>
                    <p className="text-xs text-muted-foreground">{client.ledgerCount}건</p>
                  </div>
                  <Link href={`/accounting/receivables/${client.clientId}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

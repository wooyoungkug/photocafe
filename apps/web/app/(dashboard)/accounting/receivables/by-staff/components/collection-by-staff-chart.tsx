'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { StaffCollectionSummary } from '@/hooks/use-receivables-by-staff';

interface CollectionByStaffChartProps {
  data: StaffCollectionSummary[];
  isLoading: boolean;
}

export default function CollectionByStaffChart({ data, isLoading }: CollectionByStaffChartProps) {
  // 차트 데이터 포맷팅
  const chartData = data.map(staff => ({
    name: staff.staffName,
    현금: staff.byMethod.cash,
    계좌이체: staff.byMethod.bankTransfer,
    카드: staff.byMethod.card,
    수표: staff.byMethod.check,
  }));

  return (
    <div className="space-y-4">
      {/* 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>영업담당자별 입금 실적 (입금방법별)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-80">
              로딩 중...
            </div>
          ) : !data.length ? (
            <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
              <BarChart3 className="h-16 w-16 mb-4 opacity-20" />
              <p>입금 실적 데이터가 없습니다.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => `${Number(value).toLocaleString()}원`}
                />
                <Legend />
                <Bar dataKey="현금" stackId="a" fill="#10b981" />
                <Bar dataKey="계좌이체" stackId="a" fill="#3b82f6" />
                <Bar dataKey="카드" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="수표" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 상세 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>입금방법별 상세 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>담당자</TableHead>
                <TableHead className="text-right">총 입금액</TableHead>
                <TableHead className="text-center">입금 건수</TableHead>
                <TableHead className="text-right">현금</TableHead>
                <TableHead className="text-right">계좌이체</TableHead>
                <TableHead className="text-right">카드</TableHead>
                <TableHead className="text-right">수표</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : !data.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    입금 실적 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((staff) => (
                  <TableRow key={staff.staffId} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{staff.staffName}</div>
                        <div className="text-xs text-muted-foreground">{staff.staffCode}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {staff.totalReceived.toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{staff.receiptCount}건</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {staff.byMethod.cash > 0 ? (
                        <span className="text-green-600">{staff.byMethod.cash.toLocaleString()}원</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {staff.byMethod.bankTransfer > 0 ? (
                        <span className="text-blue-600">{staff.byMethod.bankTransfer.toLocaleString()}원</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {staff.byMethod.card > 0 ? (
                        <span className="text-purple-600">{staff.byMethod.card.toLocaleString()}원</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {staff.byMethod.check > 0 ? (
                        <span className="text-orange-600">{staff.byMethod.check.toLocaleString()}원</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

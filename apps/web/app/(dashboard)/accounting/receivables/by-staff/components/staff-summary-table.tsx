'use client';

import Link from 'next/link';
import { Users, ArrowRight } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { StaffSummary } from '@/hooks/use-receivables-by-staff';

interface StaffSummaryTableProps {
  data: StaffSummary[];
  isLoading: boolean;
}

export default function StaffSummaryTable({ data, isLoading }: StaffSummaryTableProps) {
  const getCollectionRateBadge = (rate: number) => {
    if (rate >= 80) {
      return <Badge className="bg-green-100 text-green-700">우수 {rate}%</Badge>;
    } else if (rate >= 60) {
      return <Badge className="bg-blue-100 text-blue-700">양호 {rate}%</Badge>;
    } else if (rate >= 40) {
      return <Badge className="bg-yellow-100 text-yellow-700">주의 {rate}%</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-700">부진 {rate}%</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>영업담당자별 미수금 현황</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>담당자</TableHead>
              <TableHead className="text-center">담당 고객</TableHead>
              <TableHead className="text-right">총 매출</TableHead>
              <TableHead className="text-right">수금액</TableHead>
              <TableHead className="text-right">미수금</TableHead>
              <TableHead className="text-center">수금률</TableHead>
              <TableHead className="text-center">거래 건수</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : !data.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  영업담당자 데이터가 없습니다.
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
                  <TableCell className="text-center">
                    <Badge variant="outline">{staff.clientCount}개</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {staff.totalSales.toLocaleString()}원
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {staff.totalReceived.toLocaleString()}원
                  </TableCell>
                  <TableCell className="text-right font-bold text-orange-600">
                    {staff.outstanding.toLocaleString()}원
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Progress
                        value={staff.collectionRate}
                        className="w-20 h-2"
                      />
                      {getCollectionRateBadge(Math.round(staff.collectionRate))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{staff.ledgerCount}건</Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/accounting/receivables/by-staff/${staff.staffId}`}>
                      <Button variant="ghost" size="sm">
                        상세
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

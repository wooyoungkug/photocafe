'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, FileText, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLedgersByStaff } from '@/hooks/use-receivables-by-staff';

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.staffId as string;

  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useLedgersByStaff(staffId, {
    paymentStatus: paymentStatusFilter === 'all' ? undefined : paymentStatusFilter,
    page,
    limit: 20,
  });

  const ledgers = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 0 };

  // 요약 정보 계산
  const summary = ledgers.reduce(
    (acc, ledger) => ({
      totalSales: acc.totalSales + Number(ledger.totalAmount),
      totalReceived: acc.totalReceived + Number(ledger.receivedAmount),
      outstanding: acc.outstanding + Number(ledger.outstandingAmount),
    }),
    { totalSales: 0, totalReceived: 0, outstanding: 0 }
  );

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      paid: { label: '완납', color: 'bg-green-100 text-green-700' },
      partial: { label: '부분수금', color: 'bg-blue-100 text-blue-700' },
      unpaid: { label: '미수', color: 'bg-orange-100 text-orange-700' },
      overdue: { label: '연체', color: 'bg-red-100 text-red-700' },
    };
    const config = configs[status] || configs.unpaid;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">영업담당자별 상세</h1>
            <p className="text-muted-foreground">
              {ledgers[0]?.client ? `담당 고객: ${ledgers.length > 0 ? '여러 거래처' : ''}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">총 매출</p>
                <p className="text-2xl font-bold text-blue-900">
                  {summary.totalSales.toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">수금액</p>
                <p className="text-2xl font-bold text-green-900">
                  {summary.totalReceived.toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-green-500 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">미수금</p>
                <p className="text-2xl font-bold text-orange-900">
                  {summary.outstanding.toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="결제상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="unpaid">미수</SelectItem>
                <SelectItem value="partial">부분수금</SelectItem>
                <SelectItem value="paid">완납</SelectItem>
                <SelectItem value="overdue">연체</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 매출원장 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>매출원장 목록 ({meta.total}건)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>전표번호</TableHead>
                <TableHead>거래처</TableHead>
                <TableHead>주문번호</TableHead>
                <TableHead>매출일</TableHead>
                <TableHead className="text-right">총액</TableHead>
                <TableHead className="text-right">수금액</TableHead>
                <TableHead className="text-right">미수금</TableHead>
                <TableHead className="text-center">결제상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : !ledgers.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    매출원장 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                ledgers.map((ledger: any) => (
                  <TableRow key={ledger.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm">{ledger.ledgerNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{ledger.clientName}</div>
                        <div className="text-xs text-muted-foreground">
                          {ledger.client?.clientCode}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{ledger.orderNumber}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(ledger.ledgerDate), 'yyyy-MM-dd')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(ledger.totalAmount).toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {Number(ledger.receivedAmount).toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right font-bold text-orange-600">
                      {Number(ledger.outstandingAmount).toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(ledger.paymentStatus)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                이전
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

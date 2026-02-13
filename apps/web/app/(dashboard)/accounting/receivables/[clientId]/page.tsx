'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useClientDetail } from '@/hooks/use-sales-ledger';
import { format } from 'date-fns';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  const { data, isLoading } = useClientDetail(clientId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">거래처 정보를 찾을 수 없습니다.</p>
          <Button onClick={() => router.back()} className="mt-4">
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{data.client.clientName}</h1>
          <p className="text-muted-foreground">
            {data.client.clientCode} • {data.client.phone || '-'}
          </p>
        </div>
      </div>

      {/* 거래처 정보 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>거래처 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">사업자번호</div>
              <div className="font-medium">{data.client.businessNumber || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">이메일</div>
              <div className="font-medium">{data.client.email || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">주소</div>
              <div className="font-medium">{data.client.address || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">신용등급</div>
              <Badge>{data.client.creditGrade || 'B'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 요약 통계 카드 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">총 매출</p>
                <p className="text-2xl font-bold text-blue-900">
                  {data.summary.totalSales.toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">총 수금</p>
                <p className="text-2xl font-bold text-green-900">
                  {data.summary.totalReceived.toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-green-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
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
                  {data.summary.outstanding.toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">평균 결제일</p>
                <p className="text-2xl font-bold text-purple-900">{data.summary.avgPaymentDays}일</p>
                <p className="text-xs text-purple-600 mt-1">
                  정시 결제율 {data.summary.onTimePaymentRate}%
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 거래내역 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 거래내역 (최근 100건)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>전표번호</TableHead>
                <TableHead>전표일자</TableHead>
                <TableHead className="text-right">공급가액</TableHead>
                <TableHead className="text-right">부가세</TableHead>
                <TableHead className="text-right">합계</TableHead>
                <TableHead className="text-right">미수금</TableHead>
                <TableHead className="text-center">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    거래내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                data.transactions.map((tx: any) => (
                  <TableRow key={tx.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm">{tx.ledgerNumber}</TableCell>
                    <TableCell>{format(new Date(tx.ledgerDate), 'yyyy-MM-dd')}</TableCell>
                    <TableCell className="text-right">
                      {Number(tx.supplyAmount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{Number(tx.vatAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(tx.totalAmount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                      {Number(tx.outstandingAmount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          tx.paymentStatus === 'paid'
                            ? 'default'
                            : tx.paymentStatus === 'overdue'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {tx.paymentStatus === 'paid'
                          ? '완납'
                          : tx.paymentStatus === 'partial'
                            ? '부분수금'
                            : tx.paymentStatus === 'overdue'
                              ? '연체'
                              : '미수'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 수금 이력 */}
      <Card>
        <CardHeader>
          <CardTitle>수금 이력 (최근 50건)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">수금 이력이 없습니다.</div>
            ) : (
              data.paymentHistory.map((receipt: any) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                >
                  <div>
                    <div className="font-medium">{receipt.receiptNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(receipt.receiptDate), 'yyyy-MM-dd')} • {receipt.paymentMethod}
                      {receipt.bankName && ` • ${receipt.bankName}`}
                    </div>
                    {receipt.note && (
                      <div className="text-sm text-muted-foreground mt-1">{receipt.note}</div>
                    )}
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    +{Number(receipt.amount).toLocaleString()}원
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

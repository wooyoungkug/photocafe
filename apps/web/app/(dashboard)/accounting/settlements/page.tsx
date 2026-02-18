'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Plus,
  Download,
  TrendingUp,
  TrendingDown,
  Filter,
  CheckCircle,
  Clock,
  BarChart3,
  Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useSettlements,
  useAccountingSummary,
  useDailySummary,
  useCreateSettlement,
  useConfirmSettlement,
} from '@/hooks/use-accounting';
import { toast } from '@/hooks/use-toast';

export default function SettlementsPage() {
  const [periodType, setPeriodType] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dailyDate, setDailyDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSettlement, setNewSettlement] = useState({
    periodType: 'monthly',
    periodStart: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    periodEnd: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  // 선택된 연도 기준 날짜 범위
  const yearStart = `${selectedYear}-01-01`;
  const yearEnd = `${selectedYear}-12-31`;

  const { data: settlementsData, isLoading } = useSettlements({
    periodType: periodType === 'yearly' ? undefined : periodType,
    startDate: yearStart,
    endDate: yearEnd,
  });
  const { data: summary } = useAccountingSummary();
  const { data: dailySummary } = useDailySummary(dailyDate);
  const createSettlement = useCreateSettlement();
  const confirmSettlement = useConfirmSettlement();

  // API에서 받은 정산 데이터 (배열)
  const settlements: any[] = Array.isArray(settlementsData) ? settlementsData : [];

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      draft: { label: '초안', color: 'bg-gray-100 text-gray-700', icon: Clock },
      confirmed: { label: '확정', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      closed: { label: '마감', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    };
    const config = configs[status] || configs.draft;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-xs flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleCreateSettlement = async () => {
    try {
      await createSettlement.mutateAsync(newSettlement);
      toast({ title: '정산이 생성되었습니다.' });
      setIsDialogOpen(false);
    } catch {
      toast({ title: '정산 생성에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleConfirmSettlement = async (id: string) => {
    try {
      await confirmSettlement.mutateAsync(id);
      toast({ title: '정산이 확정되었습니다.' });
    } catch {
      toast({ title: '정산 확정에 실패했습니다.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">정산 관리</h1>
          <p className="text-muted-foreground">기간별 매출/매입 정산을 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            보고서 다운로드
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            정산 생성
          </Button>
        </div>
      </div>

      {/* 오늘 요약 */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">당월 매출</p>
                <p className="text-2xl font-bold text-blue-900">
                  {(summary?.totalSales || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">당월 매입</p>
                <p className="text-2xl font-bold text-red-900">
                  {(summary?.totalPurchases || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-red-500 rounded-xl flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">당월 순이익</p>
                <p className="text-2xl font-bold text-green-900">
                  {(summary?.netCashFlow || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-green-500 rounded-xl flex items-center justify-center">
                <Wallet className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">채권/채무 차액</p>
                <p className="text-2xl font-bold text-purple-900">
                  {((summary?.receivablesBalance || 0) - (summary?.payablesBalance || 0)).toLocaleString()}원
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-2 text-xs text-purple-600">
              미입금 - 미지급금
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 */}
      <Tabs defaultValue="monthly" className="space-y-4" onValueChange={setPeriodType}>
        <TabsList>
          <TabsTrigger value="daily">일별</TabsTrigger>
          <TabsTrigger value="monthly">월별</TabsTrigger>
          <TabsTrigger value="yearly">연간</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          {/* 일별 필터 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Input
                  type="date"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                  className="w-[160px]"
                />
                <Button variant="outline" size="sm" onClick={() => setDailyDate(format(new Date(), 'yyyy-MM-dd'))}>
                  <Filter className="h-4 w-4 mr-1" />
                  오늘
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 일별 요약 */}
          <Card>
            <CardHeader>
              <CardTitle>오늘 거래 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">매출</p>
                  <p className="text-xl font-bold text-blue-900">
                    {(dailySummary?.totalSales || 0).toLocaleString()}원
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">매입</p>
                  <p className="text-xl font-bold text-red-900">
                    {(dailySummary?.totalExpenses || 0).toLocaleString()}원
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">입금</p>
                  <p className="text-xl font-bold text-green-900">
                    {(dailySummary?.totalIncome || 0).toLocaleString()}원
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-600">출금</p>
                  <p className="text-xl font-bold text-orange-900">
                    {(dailySummary?.totalOutcome || 0).toLocaleString()}원
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          {/* 월별 필터 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">2026년</SelectItem>
                    <SelectItem value="2025">2025년</SelectItem>
                    <SelectItem value="2024">2024년</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  조회
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 월별 정산 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>월별 정산 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>기간</TableHead>
                    <TableHead className="text-right">매출</TableHead>
                    <TableHead className="text-right">매입</TableHead>
                    <TableHead className="text-right">순이익</TableHead>
                    <TableHead className="text-center">이익률</TableHead>
                    <TableHead className="text-center">상태</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        불러오는 중...
                      </TableCell>
                    </TableRow>
                  ) : settlements.filter(s => s.periodType === 'monthly').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        정산 내역이 없습니다. '정산 생성' 버튼으로 새 정산을 생성해주세요.
                      </TableCell>
                    </TableRow>
                  ) : (
                    settlements.filter(s => s.periodType === 'monthly').map((item) => {
                      const sales = Number(item.totalSales || 0);
                      const purchases = Number(item.totalPurchases || 0);
                      const profit = Number(item.netProfit || 0);
                      const profitRate = sales > 0 ? Math.round((profit / sales) * 100) : 0;
                      return (
                        <TableRow key={item.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium">
                            {format(new Date(item.periodStart), 'yyyy년 MM월', { locale: ko })}
                          </TableCell>
                          <TableCell className="text-right text-blue-600 font-medium">
                            {sales.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {purchases.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {profit.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {profitRate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(item.status)}
                          </TableCell>
                          <TableCell>
                            {item.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => handleConfirmSettlement(item.id)}
                              >
                                확정
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yearly" className="space-y-4">
          {/* 연간 필터 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">2026년</SelectItem>
                    <SelectItem value="2025">2025년</SelectItem>
                    <SelectItem value="2024">2024년</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 연간 요약 */}
          <Card>
            <CardHeader>
              <CardTitle>연간 실적 요약</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const yearSales = settlements.reduce((sum, s) => sum + Number(s.totalSales || 0), 0);
                const yearPurchases = settlements.reduce((sum, s) => sum + Number(s.totalPurchases || 0), 0);
                const yearProfit = settlements.reduce((sum, s) => sum + Number(s.netProfit || 0), 0);
                const avgProfitRate = yearSales > 0 ? Math.round((yearProfit / yearSales) * 100 * 10) / 10 : 0;

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-6 bg-blue-50 rounded-xl">
                      <p className="text-sm text-blue-600 mb-2">연간 매출</p>
                      <p className="text-3xl font-bold text-blue-900">{yearSales.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-6 bg-red-50 rounded-xl">
                      <p className="text-sm text-red-600 mb-2">연간 매입</p>
                      <p className="text-3xl font-bold text-red-900">{yearPurchases.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-xl">
                      <p className="text-sm text-green-600 mb-2">연간 순이익</p>
                      <p className="text-3xl font-bold text-green-900">{yearProfit.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-6 bg-purple-50 rounded-xl">
                      <p className="text-sm text-purple-600 mb-2">평균 이익률</p>
                      <p className="text-3xl font-bold text-purple-900">{avgProfitRate}%</p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 정산 생성 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>정산 생성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>정산 유형</Label>
              <Select
                value={newSettlement.periodType}
                onValueChange={(v) => setNewSettlement((prev) => ({ ...prev, periodType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">일별</SelectItem>
                  <SelectItem value="weekly">주별</SelectItem>
                  <SelectItem value="monthly">월별</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>시작일</Label>
                <Input
                  type="date"
                  value={newSettlement.periodStart}
                  onChange={(e) => setNewSettlement((prev) => ({ ...prev, periodStart: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>종료일</Label>
                <Input
                  type="date"
                  value={newSettlement.periodEnd}
                  onChange={(e) => setNewSettlement((prev) => ({ ...prev, periodEnd: e.target.value }))}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                선택한 기간의 모든 거래를 집계하여 정산을 생성합니다.
              </p>
              <p className="text-xs text-muted-foreground">
                * 정산 생성 후 '확정' 처리하면 수정할 수 없습니다.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreateSettlement}>
              정산 생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Plus,
  Search,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  MoreHorizontal,
  CheckCircle,
  Clock,
  BarChart3,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
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
} from '@/hooks/use-accounting';
import { toast } from '@/hooks/use-toast';

export default function SettlementsPage() {
  const [periodType, setPeriodType] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: settlementsData, isLoading } = useSettlements({ periodType });
  const { data: summary } = useAccountingSummary();
  const { data: dailySummary } = useDailySummary();

  // 월별 데이터 (샘플)
  const monthlyData = [
    { month: '2026-01', sales: 12500000, purchases: 4200000, profit: 8300000 },
    { month: '2025-12', sales: 11800000, purchases: 3900000, profit: 7900000 },
    { month: '2025-11', sales: 10500000, purchases: 3500000, profit: 7000000 },
    { month: '2025-10', sales: 9800000, purchases: 3200000, profit: 6600000 },
    { month: '2025-09', sales: 8900000, purchases: 2900000, profit: 6000000 },
    { month: '2025-08', sales: 9200000, purchases: 3100000, profit: 6100000 },
  ];

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
      toast({ title: '정산이 생성되었습니다.' });
      setIsDialogOpen(false);
    } catch {
      toast({ title: '정산 생성에 실패했습니다.', variant: 'destructive' });
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
            <div className="mt-2 flex items-center text-xs text-blue-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              전월 대비 +5.9%
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
            <div className="mt-2 flex items-center text-xs text-red-600">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              전월 대비 -2.3%
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
            <div className="mt-2 flex items-center text-xs text-green-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              전월 대비 +8.1%
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
              미수금 - 미지급금
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
                  defaultValue={format(new Date(), 'yyyy-MM-dd')}
                  className="w-[160px]"
                />
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  조회
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
                  {monthlyData.map((item) => {
                    const profitRate = item.sales > 0 ? Math.round((item.profit / item.sales) * 100) : 0;
                    return (
                      <TableRow key={item.month} className="hover:bg-slate-50">
                        <TableCell className="font-medium">
                          {format(new Date(item.month + '-01'), 'yyyy년 MM월', { locale: ko })}
                        </TableCell>
                        <TableCell className="text-right text-blue-600 font-medium">
                          {item.sales.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {item.purchases.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {item.profit.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {profitRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(item.month === '2026-01' ? 'draft' : 'confirmed')}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-6 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-600 mb-2">연간 매출</p>
                  <p className="text-3xl font-bold text-blue-900">125,800,000</p>
                  <p className="text-xs text-blue-500 mt-1">전년 대비 +15.2%</p>
                </div>
                <div className="text-center p-6 bg-red-50 rounded-xl">
                  <p className="text-sm text-red-600 mb-2">연간 매입</p>
                  <p className="text-3xl font-bold text-red-900">42,100,000</p>
                  <p className="text-xs text-red-500 mt-1">전년 대비 +8.5%</p>
                </div>
                <div className="text-center p-6 bg-green-50 rounded-xl">
                  <p className="text-sm text-green-600 mb-2">연간 순이익</p>
                  <p className="text-3xl font-bold text-green-900">83,700,000</p>
                  <p className="text-xs text-green-500 mt-1">전년 대비 +18.3%</p>
                </div>
                <div className="text-center p-6 bg-purple-50 rounded-xl">
                  <p className="text-sm text-purple-600 mb-2">평균 이익률</p>
                  <p className="text-3xl font-bold text-purple-900">66.5%</p>
                  <p className="text-xs text-purple-500 mt-1">전년 대비 +2.1%p</p>
                </div>
              </div>
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
              <Select defaultValue="monthly">
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
                  defaultValue={format(startOfMonth(new Date()), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-2">
                <Label>종료일</Label>
                <Input
                  type="date"
                  defaultValue={format(endOfMonth(new Date()), 'yyyy-MM-dd')}
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

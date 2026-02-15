'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Search,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Filter,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  useClientLedgers,
  useClientLedgerStats,
  ClientLedgerItem,
} from '@/hooks/use-client-ledger';

export default function ClientLedgerPage() {
  const router = useRouter();

  // ===== 필터 상태 =====
  const [searchTerm, setSearchTerm] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState<'ALL' | 'SALES' | 'PURCHASE'>('ALL');
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [page, setPage] = useState(1);
  const limit = 20;

  // ===== 데이터 조회 =====
  const { data: statsData } = useClientLedgerStats({
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
  });

  const { data: ledgerData, isLoading } = useClientLedgers({
    clientType: clientTypeFilter !== 'ALL' ? clientTypeFilter : undefined,
    search: searchTerm || undefined,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
    page,
    limit,
  });

  // ===== 목록 데이터 =====
  const ledgers = ledgerData?.data || [];
  const meta = ledgerData?.meta;
  const totalPages = meta?.totalPages || 1;

  // ===== 행 클릭 -> 상세 페이지 =====
  const handleRowClick = (item: ClientLedgerItem) => {
    router.push(`/accounting/client-ledger/${item.clientId}`);
  };

  // ===== 필터 초기화 =====
  const resetFilters = () => {
    setSearchTerm('');
    setClientTypeFilter('ALL');
    setDateRange({
      start: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    });
    setPage(1);
  };

  // ===== 금액 포맷 =====
  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString()}`;
  };

  // ===== 잔액 Badge =====
  const getBalanceBadge = (amount: number, type: 'receivable' | 'payable') => {
    if (amount === 0) {
      return (
        <Badge className="bg-green-100 text-green-700 text-xs">
          0
        </Badge>
      );
    }
    if (amount > 0) {
      return (
        <Badge className={`${type === 'receivable' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'} text-xs`}>
          {formatAmount(amount)}
        </Badge>
      );
    }
    return (
      <span className="text-xs text-muted-foreground">{formatAmount(amount)}</span>
    );
  };

  return (
    <div className="space-y-4">
      {/* 헤더: 제목 + 필터 인라인 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold flex items-center gap-2 shrink-0">
          <Building2 className="h-5 w-5" />
          거래처원장
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={clientTypeFilter}
            onValueChange={(v) => {
              setClientTypeFilter(v as 'ALL' | 'SALES' | 'PURCHASE');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="거래처유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체</SelectItem>
              <SelectItem value="SALES">매출거래처</SelectItem>
              <SelectItem value="PURCHASE">매입거래처</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) => {
              setDateRange({ ...dateRange, start: e.target.value });
              setPage(1);
            }}
            className="w-[140px] h-9 text-xs"
          />
          <span className="text-muted-foreground text-sm">~</span>
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => {
              setDateRange({ ...dateRange, end: e.target.value });
              setPage(1);
            }}
            className="w-[140px] h-9 text-xs"
          />
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="거래처명, 코드 검색..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={resetFilters}>
            <Filter className="h-3.5 w-3.5 mr-1" />
            초기화
          </Button>
        </div>
      </div>

      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 매출거래처 수 */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium">매출거래처 수</p>
                <p className="text-xl font-bold text-blue-900">
                  {(statsData?.salesClientCount || 0).toLocaleString()}곳
                </p>
              </div>
              <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-blue-600">
              당월 매출 {(statsData?.currentMonthSales || 0).toLocaleString()}원
            </p>
          </CardContent>
        </Card>

        {/* 매입거래처 수 */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-medium">매입거래처 수</p>
                <p className="text-xl font-bold text-purple-900">
                  {(statsData?.purchaseClientCount || 0).toLocaleString()}곳
                </p>
              </div>
              <div className="h-10 w-10 bg-purple-500 rounded-xl flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-purple-600">
              당월 매입 {(statsData?.currentMonthPurchases || 0).toLocaleString()}원
            </p>
          </CardContent>
        </Card>

        {/* 총 매출미수잔액 */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 font-medium">총 매출미수잔액</p>
                <p className="text-xl font-bold text-orange-900">
                  {(statsData?.totalSalesBalance || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-10 w-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-orange-600">
              당월 수금 {(statsData?.currentMonthReceived || 0).toLocaleString()}원
            </p>
          </CardContent>
        </Card>

        {/* 총 매입미지급잔액 */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-medium">총 매입미지급잔액</p>
                <p className="text-xl font-bold text-red-900">
                  {(statsData?.totalPurchaseBalance || 0).toLocaleString()}원
                </p>
              </div>
              <div className="h-10 w-10 bg-red-500 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-red-600">
              당월 지급 {(statsData?.currentMonthPaid || 0).toLocaleString()}원
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 조회결과 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          조회결과 : <b className="text-foreground">{meta?.total || ledgers.length}</b> 건
        </span>
      </div>

      {/* 거래처원장 테이블 */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      ) : ledgers.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="w-[100px] text-xs">거래처코드</TableHead>
                  <TableHead className="w-[140px] text-xs">거래처명</TableHead>
                  <TableHead className="text-right w-[110px] text-xs">매출합계</TableHead>
                  <TableHead className="text-right w-[110px] text-xs">수금합계</TableHead>
                  <TableHead className="text-right w-[120px] text-xs">매출미수잔액</TableHead>
                  <TableHead className="text-right w-[110px] text-xs">매입합계</TableHead>
                  <TableHead className="text-right w-[110px] text-xs">지급합계</TableHead>
                  <TableHead className="text-right w-[120px] text-xs">매입미지급잔액</TableHead>
                  <TableHead className="text-right w-[110px] text-xs">순잔액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgers.map((item) => (
                  <TableRow
                    key={item.clientId}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => handleRowClick(item)}
                  >
                    <TableCell className="font-mono text-xs text-blue-600 font-medium py-2 whitespace-nowrap">
                      {item.clientCode}
                    </TableCell>
                    <TableCell className="text-xs font-medium py-2 whitespace-nowrap">
                      {item.clientName}
                    </TableCell>
                    <TableCell className="text-right text-xs py-2 whitespace-nowrap">
                      {formatAmount(item.totalSales)}
                    </TableCell>
                    <TableCell className="text-right text-xs py-2 whitespace-nowrap text-green-600">
                      {formatAmount(item.totalReceived)}
                    </TableCell>
                    <TableCell className="text-right text-xs py-2 whitespace-nowrap">
                      {getBalanceBadge(item.salesBalance, 'receivable')}
                    </TableCell>
                    <TableCell className="text-right text-xs py-2 whitespace-nowrap">
                      {formatAmount(item.totalPurchases)}
                    </TableCell>
                    <TableCell className="text-right text-xs py-2 whitespace-nowrap text-green-600">
                      {formatAmount(item.totalPaid)}
                    </TableCell>
                    <TableCell className="text-right text-xs py-2 whitespace-nowrap">
                      {getBalanceBadge(item.purchaseBalance, 'payable')}
                    </TableCell>
                    <TableCell className="text-right text-xs py-2 whitespace-nowrap font-bold">
                      <span className={item.netBalance > 0 ? 'text-red-600' : item.netBalance < 0 ? 'text-blue-600' : 'text-green-600'}>
                        {formatAmount(item.netBalance)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/40 font-bold">
                  <TableCell colSpan={2} className="text-right text-xs">합계</TableCell>
                  <TableCell className="text-right text-xs">
                    {formatAmount(ledgers.reduce((sum, l) => sum + l.totalSales, 0))}
                  </TableCell>
                  <TableCell className="text-right text-xs text-green-600">
                    {formatAmount(ledgers.reduce((sum, l) => sum + l.totalReceived, 0))}
                  </TableCell>
                  <TableCell className="text-right text-xs text-red-600">
                    {formatAmount(ledgers.reduce((sum, l) => sum + l.salesBalance, 0))}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {formatAmount(ledgers.reduce((sum, l) => sum + l.totalPurchases, 0))}
                  </TableCell>
                  <TableCell className="text-right text-xs text-green-600">
                    {formatAmount(ledgers.reduce((sum, l) => sum + l.totalPaid, 0))}
                  </TableCell>
                  <TableCell className="text-right text-xs text-orange-600">
                    {formatAmount(ledgers.reduce((sum, l) => sum + l.purchaseBalance, 0))}
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold">
                    {(() => {
                      const net = ledgers.reduce((sum, l) => sum + l.netBalance, 0);
                      return (
                        <span className={net > 0 ? 'text-red-600' : net < 0 ? 'text-blue-600' : 'text-green-600'}>
                          {formatAmount(net)}
                        </span>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              거래처원장 데이터가 없습니다
            </h3>
            <p className="text-gray-500 text-sm">
              조건에 맞는 거래처 데이터가 없습니다.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
              // 현재 페이지 주변을 보여줌
              let pageNum: number;
              if (totalPages <= 10) {
                pageNum = i + 1;
              } else if (page <= 5) {
                pageNum = i + 1;
              } else if (page >= totalPages - 4) {
                pageNum = totalPages - 9 + i;
              } else {
                pageNum = page - 4 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 text-xs p-0"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

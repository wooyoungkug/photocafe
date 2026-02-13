'use client';

import { useState, useMemo } from 'react';
import { Search, Receipt, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClientSalesSummary } from '@/lib/types/sales-ledger';

interface ClientReceivableListProps {
  data: ClientSalesSummary[] | undefined;
  isLoading: boolean;
  selectedClientId: string | null;
  onSelect: (client: ClientSalesSummary) => void;
}

type SortField = 'outstanding' | 'collectionRate' | 'clientName';
type SortDirection = 'asc' | 'desc';

function getStatusInfo(outstanding: number, totalReceived: number) {
  if (outstanding === 0) {
    return { label: '완납', className: 'bg-green-100 text-green-700' };
  }
  if (totalReceived > 0) {
    return { label: '부분수금', className: 'bg-blue-100 text-blue-700' };
  }
  return { label: '미수', className: 'bg-orange-100 text-orange-700' };
}

export function ClientReceivableList({
  data,
  isLoading,
  selectedClientId,
  onSelect,
}: ClientReceivableListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('outstanding');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredData = useMemo(() => {
    if (!data) return [];

    let items = data.filter((item) => item.outstanding > 0);

    // 검색 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(
        (item) =>
          item.clientName.toLowerCase().includes(term) ||
          item.clientCode.toLowerCase().includes(term)
      );
    }

    // 상태 필터
    if (statusFilter !== 'all') {
      items = items.filter((item) => {
        const status = item.totalReceived > 0 ? 'partial' : 'outstanding';
        return status === statusFilter;
      });
    }

    // 정렬
    items.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'outstanding':
          comparison = a.outstanding - b.outstanding;
          break;
        case 'collectionRate': {
          const rateA = a.totalSales > 0 ? a.totalReceived / a.totalSales : 0;
          const rateB = b.totalSales > 0 ? b.totalReceived / b.totalSales : 0;
          comparison = rateA - rateB;
          break;
        }
        case 'clientName':
          comparison = a.clientName.localeCompare(b.clientName);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return items;
  }, [data, searchTerm, statusFilter, sortField, sortDirection]);

  const totalOutstanding = filteredData.reduce(
    (sum, item) => sum + item.outstanding,
    0
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">거래처별 미수금</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="거래처명/코드 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
              aria-label="거래처 검색"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[120px] h-9" aria-label="상태 필터">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="outstanding">미수</SelectItem>
              <SelectItem value="partial">부분수금</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto pt-0">
        {/* Desktop Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[140px]">
                  <button
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort('clientName')}
                  >
                    거래처
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right w-[110px]">
                  <button
                    className="flex items-center gap-1 ml-auto hover:text-foreground"
                    onClick={() => handleSort('outstanding')}
                  >
                    미수금
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-center w-[90px]">
                  <button
                    className="flex items-center gap-1 mx-auto hover:text-foreground"
                    onClick={() => handleSort('collectionRate')}
                  >
                    수금률
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-center w-[70px]">상태</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12 mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-14 mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-7 w-12" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-muted-foreground"
                  >
                    {searchTerm
                      ? '검색 결과가 없습니다.'
                      : '미수금 내역이 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => {
                  const rate =
                    item.totalSales > 0
                      ? Math.round((item.totalReceived / item.totalSales) * 100)
                      : 0;
                  const status = getStatusInfo(item.outstanding, item.totalReceived);
                  const isSelected = selectedClientId === item.clientId;

                  return (
                    <TableRow
                      key={item.clientId}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/5 border-l-4 border-l-primary'
                          : 'hover:bg-slate-50'
                      }`}
                      onClick={() => onSelect(item)}
                      role="button"
                      tabIndex={0}
                      aria-selected={isSelected}
                      aria-label={`${item.clientName} 미수금 ${item.outstanding.toLocaleString()}원`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelect(item);
                        }
                      }}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm truncate max-w-[120px]">
                            {item.clientName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.clientCode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-sm text-orange-600">
                          {item.outstanding.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          <Progress value={rate} className="w-10 h-1.5" />
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {rate}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-[10px] px-1.5 py-0 ${status.className}`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(item);
                          }}
                          aria-label={`${item.clientName} 수금 처리`}
                        >
                          <Receipt className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="p-3 border rounded-lg space-y-2"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {searchTerm ? '검색 결과가 없습니다.' : '미수금 내역이 없습니다.'}
            </div>
          ) : (
            filteredData.map((item) => {
              const rate =
                item.totalSales > 0
                  ? Math.round((item.totalReceived / item.totalSales) * 100)
                  : 0;
              const status = getStatusInfo(item.outstanding, item.totalReceived);
              const isSelected = selectedClientId === item.clientId;

              return (
                <div
                  key={item.clientId}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => onSelect(item)}
                  role="button"
                  tabIndex={0}
                  aria-selected={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(item);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">{item.clientName}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.clientCode}
                      </div>
                    </div>
                    <Badge className={`text-[10px] px-1.5 py-0 ${status.className}`}>
                      {status.label}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-orange-600">
                      {item.outstanding.toLocaleString()}원
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(item);
                      }}
                    >
                      <Receipt className="h-3 w-3 mr-1" />
                      수금
                    </Button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress value={rate} className="flex-1 h-1.5" />
                    <span className="text-xs text-muted-foreground">{rate}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {!isLoading && filteredData.length > 0 && (
          <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>{filteredData.length}개 거래처</span>
            <span className="font-medium text-orange-600">
              합계 {totalOutstanding.toLocaleString()}원
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

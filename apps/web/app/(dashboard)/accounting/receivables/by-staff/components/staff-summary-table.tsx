'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, ArrowRight, ChevronDown, ChevronRight, Building2 } from 'lucide-react';
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
import { useStaffClientsSummary } from '@/hooks/use-receivables-by-staff';

interface StaffSummaryTableProps {
  data: StaffSummary[];
  isLoading: boolean;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export default function StaffSummaryTable({ data, isLoading, dateRange }: StaffSummaryTableProps) {
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

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

  const handleStaffClick = (staffId: string) => {
    setExpandedStaffId(expandedStaffId === staffId ? null : staffId);
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
              <TableHead className="w-[40px]"></TableHead>
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
                <TableCell colSpan={9} className="text-center py-8">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : !data.length ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  영업담당자 데이터가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.map((staff) => (
                <StaffRow
                  key={staff.staffId}
                  staff={staff}
                  isExpanded={expandedStaffId === staff.staffId}
                  onToggle={() => handleStaffClick(staff.staffId)}
                  dateRange={dateRange}
                  getCollectionRateBadge={getCollectionRateBadge}
                />
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface StaffRowProps {
  staff: StaffSummary;
  isExpanded: boolean;
  onToggle: () => void;
  dateRange?: { startDate: string; endDate: string };
  getCollectionRateBadge: (rate: number) => JSX.Element;
}

function StaffRow({ staff, isExpanded, onToggle, dateRange, getCollectionRateBadge }: StaffRowProps) {
  const { data: clients, isLoading: isLoadingClients } = useStaffClientsSummary(
    staff.staffId,
    isExpanded ? dateRange : undefined
  );

  return (
    <>
      <TableRow className="hover:bg-slate-50">
        <TableCell>
          <button
            type="button"
            onClick={onToggle}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
            aria-label={isExpanded ? '접기' : '펼치기'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-600" />
            )}
          </button>
        </TableCell>
        <TableCell>
          <button
            type="button"
            onClick={onToggle}
            className="text-left hover:underline cursor-pointer"
          >
            <div className="font-medium">{staff.staffName}</div>
            <div className="text-xs text-muted-foreground">{staff.staffCode}</div>
          </button>
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

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={9} className="bg-slate-50 p-0">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-slate-600" />
                <h4 className="text-sm font-semibold text-slate-700">거래처별 미수금 상세</h4>
              </div>
              {isLoadingClients ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  로딩 중...
                </div>
              ) : !clients || clients.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  거래처 데이터가 없습니다.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white border-b">
                      <TableHead className="text-left">거래처</TableHead>
                      <TableHead className="text-right">총 매출</TableHead>
                      <TableHead className="text-right">수금액</TableHead>
                      <TableHead className="text-right">미수금</TableHead>
                      <TableHead className="text-center">수금률</TableHead>
                      <TableHead className="text-center">거래 건수</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => {
                      const collectionRate = client.totalSales > 0
                        ? Math.round((client.totalReceived / client.totalSales) * 100)
                        : 0;
                      return (
                        <TableRow key={client.clientId} className="bg-white hover:bg-slate-50">
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{client.clientName}</div>
                              <div className="text-xs text-muted-foreground">{client.clientCode}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {client.totalSales.toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-right text-sm text-green-600">
                            {client.totalReceived.toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm text-orange-600">
                            {client.outstanding.toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Progress
                                value={collectionRate}
                                className="w-16 h-1.5"
                              />
                              <span className="text-xs text-muted-foreground">
                                {collectionRate}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {client.ledgerCount}건
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

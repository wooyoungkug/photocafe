'use client';

import { useState, useMemo, Fragment } from 'react';
import { format } from 'date-fns';
import {
  Search,
  FileText,
  Filter,
  ChevronDown,
  ChevronRight,
  Trash2,
  BookOpen,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useJournals, useDeleteJournal } from '@/hooks/use-accounting';
import { toast } from '@/hooks/use-toast';

// ===== 타입 =====
interface JournalEntry {
  id: string;
  accountId: string;
  account: { id: string; code: string; name: string; type: string };
  transactionType: 'DEBIT' | 'CREDIT';
  amount: number;
  description?: string;
}

interface Journal {
  id: string;
  voucherNo: string;
  voucherType: 'RECEIPT' | 'PAYMENT' | 'TRANSFER';
  journalDate: string;
  clientId?: string;
  clientName?: string;
  description?: string;
  totalAmount: number;
  sourceType?: string;
  sourceId?: string;
  entries: JournalEntry[];
  createdBy: string;
  createdAt: string;
}

// ===== 라벨/색상 매핑 =====
const VOUCHER_TYPE_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  RECEIPT: { label: '입금전표', color: 'bg-green-100 text-green-700' },
  PAYMENT: { label: '출금전표', color: 'bg-red-100 text-red-700' },
  TRANSFER: { label: '대체전표', color: 'bg-blue-100 text-blue-700' },
};

const SOURCE_TYPE_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  SALES: { label: '매출', color: 'bg-indigo-100 text-indigo-700' },
  RECEIPT: { label: '입금', color: 'bg-emerald-100 text-emerald-700' },
  PURCHASE: { label: '매입', color: 'bg-amber-100 text-amber-700' },
  PAYMENT: { label: '지급', color: 'bg-rose-100 text-rose-700' },
  MANUAL: { label: '수동', color: 'bg-gray-100 text-gray-700' },
};

const ITEMS_PER_PAGE = 20;

export default function JournalsPage() {
  // ===== 필터 상태 =====
  const [searchTerm, setSearchTerm] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('all');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [currentPage, setCurrentPage] = useState(1);

  // ===== 행 확장 상태 =====
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // ===== 삭제 확인 Dialog =====
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // ===== 데이터 조회 =====
  const { data: journalsData, isLoading } = useJournals({
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
    voucherType: voucherTypeFilter !== 'all' ? voucherTypeFilter : undefined,
    search: searchTerm || undefined,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const deleteJournal = useDeleteJournal();

  // ===== 타입 캐스팅 =====
  const journals: Journal[] = (journalsData?.data as Journal[]) || [];
  const meta = journalsData?.meta as
    | { total: number; page: number; limit: number; totalPages: number }
    | undefined;
  const totalPages = meta?.totalPages || 1;
  const totalCount = meta?.total || 0;

  // ===== 소스타입 필터링 (클라이언트 사이드) =====
  const filteredJournals = useMemo(() => {
    if (sourceTypeFilter === 'all') return journals;
    return journals.filter((j) => j.sourceType === sourceTypeFilter);
  }, [journals, sourceTypeFilter]);

  // ===== 행 토글 =====
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ===== 삭제 처리 =====
  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteJournal.mutateAsync(deleteTargetId);
      toast({ title: '전표가 삭제되었습니다.' });
      setDeleteTargetId(null);
    } catch {
      toast({ title: '전표 삭제에 실패했습니다.', variant: 'destructive' });
    }
  };

  // ===== 필터 초기화 =====
  const resetFilters = () => {
    setSearchTerm('');
    setVoucherTypeFilter('all');
    setSourceTypeFilter('all');
    setDateRange({
      start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    });
    setCurrentPage(1);
  };

  // ===== 금액 계산 헬퍼 =====
  const getDebitTotal = (entries: JournalEntry[]) =>
    entries
      .filter((e) => e.transactionType === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0);

  const getCreditTotal = (entries: JournalEntry[]) =>
    entries
      .filter((e) => e.transactionType === 'CREDIT')
      .reduce((sum, e) => sum + e.amount, 0);

  // ===== 금액 포맷 =====
  const formatAmount = (amount: number) =>
    amount.toLocaleString('ko-KR') + '원';

  // ===== Badge 렌더링 =====
  const getVoucherTypeBadge = (type: string) => {
    const config = VOUCHER_TYPE_CONFIG[type];
    if (!config) return <Badge className="bg-gray-100 text-gray-700 text-xs">{type}</Badge>;
    return <Badge className={`${config.color} text-xs`}>{config.label}</Badge>;
  };

  const getSourceTypeBadge = (sourceType?: string) => {
    if (!sourceType) return <span className="text-muted-foreground text-xs">-</span>;
    const config = SOURCE_TYPE_CONFIG[sourceType];
    if (!config)
      return (
        <Badge className="bg-gray-100 text-gray-700 text-xs">{sourceType}</Badge>
      );
    return <Badge className={`${config.color} text-xs`}>{config.label}</Badge>;
  };

  // ===== 페이지네이션 =====
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-500 rounded-xl flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">전표관리 (분개장)</h1>
            <p className="text-muted-foreground">
              전표를 조회하고 분개 내역을 확인합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* 검색 */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="전표번호, 거래처, 적요 검색..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* 전표유형 */}
            <Select
              value={voucherTypeFilter}
              onValueChange={(v) => {
                setVoucherTypeFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="전표유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 유형</SelectItem>
                <SelectItem value="RECEIPT">입금전표</SelectItem>
                <SelectItem value="PAYMENT">출금전표</SelectItem>
                <SelectItem value="TRANSFER">대체전표</SelectItem>
              </SelectContent>
            </Select>

            {/* 원천유형 */}
            <Select
              value={sourceTypeFilter}
              onValueChange={(v) => {
                setSourceTypeFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="원천" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 원천</SelectItem>
                <SelectItem value="SALES">매출</SelectItem>
                <SelectItem value="RECEIPT">입금</SelectItem>
                <SelectItem value="PURCHASE">매입</SelectItem>
                <SelectItem value="PAYMENT">지급</SelectItem>
                <SelectItem value="MANUAL">수동</SelectItem>
              </SelectContent>
            </Select>

            {/* 날짜 범위 */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange({ ...dateRange, start: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-[150px]"
              />
              <span className="text-muted-foreground">~</span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange({ ...dateRange, end: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-[150px]"
              />
            </div>

            {/* 초기화 */}
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <Filter className="h-4 w-4 mr-1" />
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 전표 테이블 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>전표 목록</CardTitle>
            <span className="text-sm text-muted-foreground">
              총 {totalCount.toLocaleString()}건
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[150px]">전표번호</TableHead>
                <TableHead className="w-[100px] text-center">전표유형</TableHead>
                <TableHead className="w-[110px]">전표일자</TableHead>
                <TableHead>거래처</TableHead>
                <TableHead>적요</TableHead>
                <TableHead className="text-right w-[130px]">차변합계</TableHead>
                <TableHead className="text-right w-[130px]">대변합계</TableHead>
                <TableHead className="text-center w-[80px]">원천</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : !filteredJournals.length ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    전표 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredJournals.map((journal) => {
                  const isExpanded = expandedRows.has(journal.id);
                  const debitTotal = getDebitTotal(journal.entries || []);
                  const creditTotal = getCreditTotal(journal.entries || []);

                  return (
                    <Fragment key={journal.id}>
                      {/* 메인 행 */}
                      <TableRow
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => toggleRow(journal.id)}
                      >
                        <TableCell className="px-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-blue-600 font-medium">
                          {journal.voucherNo}
                        </TableCell>
                        <TableCell className="text-center">
                          {getVoucherTypeBadge(journal.voucherType)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(journal.journalDate), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {journal.clientName || '-'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {journal.description || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatAmount(debitTotal)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatAmount(creditTotal)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getSourceTypeBadge(journal.sourceType)}
                        </TableCell>
                        <TableCell>
                          {journal.sourceType === 'MANUAL' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTargetId(journal.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* 확장 행 - 분개 내역 */}
                      {isExpanded && journal.entries && journal.entries.length > 0 && (
                        <TableRow className="bg-slate-50/50">
                          <TableCell colSpan={10} className="p-0">
                            <div className="px-6 py-4 ml-8 border-l-2 border-indigo-200">
                              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                                분개 내역
                              </p>
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-slate-100/80 hover:bg-slate-100/80">
                                    <TableHead className="w-[120px] text-xs">계정코드</TableHead>
                                    <TableHead className="text-xs">계정명</TableHead>
                                    <TableHead className="text-center w-[80px] text-xs">
                                      구분
                                    </TableHead>
                                    <TableHead className="text-right w-[140px] text-xs">
                                      금액
                                    </TableHead>
                                    <TableHead className="text-xs">적요</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {journal.entries.map((entry) => (
                                    <TableRow
                                      key={entry.id}
                                      className="hover:bg-slate-100/50"
                                    >
                                      <TableCell className="font-mono text-xs text-muted-foreground">
                                        {entry.account?.code || '-'}
                                      </TableCell>
                                      <TableCell className="text-sm font-medium">
                                        {entry.account?.name || '-'}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {entry.transactionType === 'DEBIT' ? (
                                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                                            차변
                                          </Badge>
                                        ) : (
                                          <Badge className="bg-orange-100 text-orange-700 text-xs">
                                            대변
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right font-medium tabular-nums text-sm">
                                        {formatAmount(entry.amount)}
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {entry.description || '-'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  {/* 합계 행 */}
                                  <TableRow className="bg-slate-100 font-semibold hover:bg-slate-100">
                                    <TableCell colSpan={2} className="text-right text-xs">
                                      합계
                                    </TableCell>
                                    <TableCell className="text-center text-xs">
                                      <Badge className="bg-blue-100 text-blue-700 text-xs">
                                        차변
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-sm">
                                      {formatAmount(debitTotal)}
                                    </TableCell>
                                    <TableCell></TableCell>
                                  </TableRow>
                                  <TableRow className="bg-slate-100 font-semibold hover:bg-slate-100">
                                    <TableCell colSpan={2} className="text-right text-xs">
                                      합계
                                    </TableCell>
                                    <TableCell className="text-center text-xs">
                                      <Badge className="bg-orange-100 text-orange-700 text-xs">
                                        대변
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-sm">
                                      {formatAmount(creditTotal)}
                                    </TableCell>
                                    <TableCell></TableCell>
                                  </TableRow>
                                  {debitTotal !== creditTotal && (
                                    <TableRow className="bg-red-50 hover:bg-red-50">
                                      <TableCell
                                        colSpan={5}
                                        className="text-center text-xs text-red-600 font-medium"
                                      >
                                        차변과 대변의 합계가 일치하지 않습니다. (차액:{' '}
                                        {formatAmount(Math.abs(debitTotal - creditTotal))})
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {/* 확장 상태인데 entries가 없는 경우 */}
                      {isExpanded &&
                        (!journal.entries || journal.entries.length === 0) && (
                          <TableRow className="bg-slate-50/50">
                            <TableCell
                              colSpan={10}
                              className="text-center py-6 text-muted-foreground text-sm"
                            >
                              분개 내역이 없습니다.
                            </TableCell>
                          </TableRow>
                        )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                처음
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                이전
              </Button>

              {pageNumbers.map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="min-w-[36px]"
                >
                  {page}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                다음
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                마지막
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 삭제 확인 Dialog */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>전표 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 전표를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteJournal.isPending ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

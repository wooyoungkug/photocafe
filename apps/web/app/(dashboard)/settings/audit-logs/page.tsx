'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuditLogs } from '@/hooks/use-audit-log';
import { AuditLog, AuditLogQuery } from '@/lib/types/staff';
import {
  History,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  create: '생성',
  update: '수정',
  delete: '삭제',
  status_change: '상태변경',
  password_reset: '비밀번호초기화',
  bulk_import: '일괄등록',
};

const ENTITY_LABELS: Record<string, string> = {
  staff: '직원',
  department: '부서',
  team: '팀',
};

export default function AuditLogsPage() {
  const [query, setQuery] = useState<AuditLogQuery>({
    page: 1,
    limit: 30,
  });
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [performerSearch, setPerformerSearch] = useState('');
  const [debouncedPerformer, setDebouncedPerformer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  // 검색 디바운스
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPerformer(performerSearch), 300);
    return () => clearTimeout(timer);
  }, [performerSearch]);

  // 필터 변경 시 쿼리 갱신
  useEffect(() => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
      action: actionFilter !== 'all' ? actionFilter : undefined,
      performedBy: debouncedPerformer || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }));
  }, [entityTypeFilter, actionFilter, debouncedPerformer, startDate, endDate]);

  const { data, isLoading, error } = useAuditLogs(query);

  return (
    <div className="space-y-6">
      <PageHeader
        title="감사 로그"
        description="시스템 변경 이력을 조회합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '설정', href: '/settings' },
          { label: '감사 로그' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[11px] text-black font-normal">
            <History className="h-5 w-5" />
            <span className="text-base font-semibold">변경 이력</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 필터 */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 유형</SelectItem>
                <SelectItem value="staff">직원</SelectItem>
                <SelectItem value="department">부서</SelectItem>
                <SelectItem value="team">팀</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="액션" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 액션</SelectItem>
                <SelectItem value="create">생성</SelectItem>
                <SelectItem value="update">수정</SelectItem>
                <SelectItem value="delete">삭제</SelectItem>
                <SelectItem value="status_change">상태변경</SelectItem>
                <SelectItem value="password_reset">비밀번호초기화</SelectItem>
                <SelectItem value="bulk_import">일괄등록</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="수행자 검색..."
                value={performerSearch}
                onChange={(e) => setPerformerSearch(e.target.value)}
                className="pl-10 w-44"
              />
            </div>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
              placeholder="시작일"
            />
            <span className="self-center text-[11px] text-black font-normal">~</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
              placeholder="종료일"
            />
          </div>

          {/* 테이블 */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-destructive text-[11px]">
              <AlertCircle className="h-5 w-5 mr-2" />
              데이터를 불러오는데 실패했습니다.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">시각</TableHead>
                    <TableHead className="text-[11px]">유형</TableHead>
                    <TableHead className="text-[11px]">액션</TableHead>
                    <TableHead className="text-[11px]">수행자</TableHead>
                    <TableHead className="text-[11px]">대상 ID</TableHead>
                    <TableHead className="text-[11px]">변경내용</TableHead>
                    <TableHead className="text-[11px] text-right">상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-[11px]">
                        감사 로그가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.data?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-[11px] text-black font-normal whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('ko-KR', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {ENTITY_LABELS[log.entityType] || log.entityType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.action === 'create' ? 'default' :
                              log.action === 'delete' ? 'destructive' :
                              'secondary'
                            }
                            className="text-[10px]"
                          >
                            {ACTION_LABELS[log.action] || log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] text-black font-normal">
                          {log.performerName}
                        </TableCell>
                        <TableCell className="text-[11px] font-mono text-gray-500">
                          {log.entityId.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-[11px] text-black font-normal max-w-48 truncate">
                          {log.changes
                            ? Object.keys(log.changes).join(', ')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* 페이지네이션 */}
              {data?.meta && data.meta.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(query.page || 1) === 1}
                    onClick={() => setQuery((p) => ({ ...p, page: (p.page || 1) - 1 }))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    이전
                  </Button>
                  <span className="text-[11px] text-black font-normal px-4">
                    {query.page || 1} / {data.meta.totalPages} (총 {data.meta.total}건)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(query.page || 1) === data.meta.totalPages}
                    onClick={() => setQuery((p) => ({ ...p, page: (p.page || 1) + 1 }))}
                  >
                    다음
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 상세 다이얼로그 */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              감사 로그 상세
            </DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-gray-500">시각</div>
                  <div className="text-[11px] text-black font-normal">
                    {new Date(detailLog.createdAt).toLocaleString('ko-KR')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">수행자</div>
                  <div className="text-[11px] text-black font-normal">{detailLog.performerName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">유형</div>
                  <Badge variant="outline" className="text-[10px]">
                    {ENTITY_LABELS[detailLog.entityType] || detailLog.entityType}
                  </Badge>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">액션</div>
                  <Badge variant="secondary" className="text-[10px]">
                    {ACTION_LABELS[detailLog.action] || detailLog.action}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-gray-500">대상 ID</div>
                  <div className="text-[11px] font-mono text-black">{detailLog.entityId}</div>
                </div>
                {detailLog.ipAddress && (
                  <div className="col-span-2">
                    <div className="text-[10px] text-gray-500">IP 주소</div>
                    <div className="text-[11px] font-mono text-black">{detailLog.ipAddress}</div>
                  </div>
                )}
              </div>

              {detailLog.changes && Object.keys(detailLog.changes).length > 0 && (
                <div>
                  <div className="text-[10px] text-gray-500 mb-2">변경 내용</div>
                  <div className="bg-muted rounded-lg p-3 space-y-2">
                    {Object.entries(detailLog.changes).map(([key, change]: [string, any]) => (
                      <div key={key} className="text-[11px]">
                        <span className="font-medium text-black">{key}</span>
                        <div className="ml-4 flex items-center gap-2">
                          <span className="text-red-500 line-through text-[10px]">
                            {String(change.old ?? '(없음)')}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600 text-[10px]">
                            {String(change.new ?? '(없음)')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailLog.metadata && Object.keys(detailLog.metadata).length > 0 && (
                <div>
                  <div className="text-[10px] text-gray-500 mb-2">메타데이터</div>
                  <pre className="bg-muted rounded-lg p-3 text-[10px] text-black whitespace-pre-wrap overflow-auto">
                    {JSON.stringify(detailLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

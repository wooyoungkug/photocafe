"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuditLogs } from "@/hooks/use-audit-log";
import type { AuditLog } from "@/lib/types/staff";
import { Download, History, RefreshCw } from "lucide-react";

const ACTION_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "file_access_url_issued", label: "원본 접근 URL 발급" },
  { value: "create", label: "생성" },
  { value: "update", label: "수정" },
  { value: "delete", label: "삭제" },
  { value: "status_change", label: "상태변경" },
  { value: "password_reset", label: "비밀번호초기화" },
];

function actionLabel(action: string): string {
  const found = ACTION_OPTIONS.find((a) => a.value === action);
  return found?.label || action;
}

function actionVariant(action: string): "default" | "destructive" | "secondary" | "outline" {
  if (action === "create") return "default";
  if (action === "delete") return "destructive";
  if (action === "file_access_url_issued") return "outline";
  return "secondary";
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("file_access_url_issued");
  const [onlyOriginalView, setOnlyOriginalView] = useState(true);
  const [performedBy, setPerformedBy] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const query = useMemo(
    () => ({
      page,
      limit: 50,
      action: action !== "all" ? action : undefined,
      performedBy: performedBy.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [page, action, performedBy, startDate, endDate],
  );

  const { data, isLoading, isFetching, refetch, error } = useAuditLogs(query);
  const today = new Date().toISOString().slice(0, 10);
  const { data: accessTodayData } = useAuditLogs({
    page: 1,
    limit: 1,
    action: "file_access_url_issued",
    startDate: today,
    endDate: today,
  });
  const rows = data?.data || [];
  const meta = data?.meta;
  const pageB2Count = rows.filter((r) => r.action === "file_access_url_issued" && r.metadata?.source === "b2-presigned").length;
  const pageLocalCount = rows.filter((r) => r.action === "file_access_url_issued" && r.metadata?.source === "local").length;

  const buildCsv = (logs: AuditLog[]) => {
    const header = [
      "createdAt",
      "action",
      "entityType",
      "entityId",
      "performedBy",
      "performerName",
      "source",
      "orderNumber",
      "fileName",
      "ipAddress",
      "userAgent",
    ];
    const escape = (value: unknown) => {
      const s = String(value ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = logs.map((log) =>
      [
        log.createdAt,
        log.action,
        log.entityType,
        log.entityId,
        log.performedBy,
        log.performerName,
        log.metadata?.source ?? "",
        log.metadata?.orderNumber ?? "",
        log.metadata?.fileName ?? "",
        log.ipAddress ?? "",
        log.userAgent ?? "",
      ].map(escape).join(","),
    );
    return [header.join(","), ...lines].join("\n");
  };

  const downloadCsv = async () => {
    setIsExporting(true);
    try {
      const current = {
        limit: 200,
        action: action !== "all" ? action : undefined,
        performedBy: performedBy.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const first = await api.get<{ data: AuditLog[]; meta: { totalPages: number } }>(
        "/audit-logs",
        { ...current, page: 1 },
      );
      const allLogs: AuditLog[] = [...(first.data || [])];
      const totalPages = first.meta?.totalPages || 1;
      for (let p = 2; p <= totalPages; p++) {
        const next = await api.get<{ data: AuditLog[] }>("/audit-logs", { ...current, page: p });
        allLogs.push(...(next.data || []));
      }
      const csv = buildCsv(allLogs);
      const bom = "\uFEFF";
      const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const todayStamp = new Date().toISOString().slice(0, 10);
      const actionPart = action === "all" ? "all" : action;
      a.href = url;
      a.download = `audit-logs_${actionPart}_${todayStamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="감사로그"
        description="운영 활동(원본 접근 URL 발급 포함)을 검색하고 추적합니다."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[18px] text-black font-bold">필터</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-[14px] text-black font-normal">이벤트</Label>
              <Select
                value={action}
                onValueChange={(v) => {
                  setAction(v);
                  setOnlyOriginalView(v === "file_access_url_issued");
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[14px] text-black font-normal">수행자 ID</Label>
              <Input
                value={performedBy}
                onChange={(e) => {
                  setPerformedBy(e.target.value);
                  setPage(1);
                }}
                placeholder="staff id"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[14px] text-black font-normal">시작일</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[14px] text-black font-normal">종료일</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="h-9"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant={onlyOriginalView ? "default" : "outline"}
                className="h-9"
                onClick={() => {
                  const next = !onlyOriginalView;
                  setOnlyOriginalView(next);
                  setAction(next ? "file_access_url_issued" : "all");
                  setPage(1);
                }}
              >
                원본 접근만
              </Button>
              <Button
                variant="outline"
                className="h-9"
                onClick={() => {
                  setAction("all");
                  setOnlyOriginalView(false);
                  setPerformedBy("");
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
              >
                초기화
              </Button>
              <Button
                className="h-9"
                variant="secondary"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
                새로고침
              </Button>
              <Button
                className="h-9"
                variant="outline"
                onClick={downloadCsv}
                disabled={isExporting || isFetching}
              >
                <Download className={`h-4 w-4 mr-1 ${isExporting ? "animate-pulse" : ""}`} />
                {isExporting ? "CSV 생성 중..." : "CSV 내보내기"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-[14px] text-gray-500">조회 결과 총 건수</div>
            <div className="text-[24px] text-black font-normal mt-1">{meta?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-[14px] text-gray-500">오늘 원본 접근 URL 발급</div>
            <div className="text-[24px] text-black font-normal mt-1">{accessTodayData?.meta?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-[14px] text-gray-500">현재 페이지 B2/Local</div>
            <div className="text-[24px] text-black font-normal mt-1">
              {pageB2Count} / {pageLocalCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
            <History className="h-5 w-5" />
            감사 이벤트
            {meta && <span className="text-[14px] text-gray-500 font-normal">총 {meta.total}건</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-[14px] text-red-600">
              감사로그를 불러오지 못했습니다. 권한을 확인해 주세요.
            </div>
          ) : isLoading ? (
            <div className="text-[14px] text-gray-500">불러오는 중...</div>
          ) : (
            <>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>시각</TableHead>
                      <TableHead>이벤트</TableHead>
                      <TableHead>엔티티</TableHead>
                      <TableHead>수행자</TableHead>
                      <TableHead>상세</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-[14px] text-gray-500 py-8">
                          조회된 로그가 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((log: AuditLog) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-[12px]">
                            {new Date(log.createdAt).toLocaleString("ko-KR")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={actionVariant(log.action)} className="text-[10px]">
                              {actionLabel(log.action)}
                            </Badge>
                            {log.metadata?.source && (
                              <Badge variant="outline" className="text-[10px] ml-1">
                                {String(log.metadata.source)}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-[12px]">
                            {log.entityType} / {log.entityId}
                          </TableCell>
                          <TableCell className="text-[12px]">
                            <div>{log.performerName}</div>
                            <div className="text-gray-500">{log.performedBy}</div>
                          </TableCell>
                          <TableCell className="text-[12px]">
                            <div className="space-y-0.5">
                              {log.metadata?.orderNumber && <div>주문: {String(log.metadata.orderNumber)}</div>}
                              {log.metadata?.fileName && <div>파일: {String(log.metadata.fileName)}</div>}
                              {log.ipAddress && <div>IP: {log.ipAddress}</div>}
                              {log.userAgent && (
                                <div className="truncate max-w-[320px]" title={log.userAgent}>
                                  UA: {log.userAgent}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="text-[12px] text-gray-500">
                  페이지 {meta?.page || 1} / {meta?.totalPages || 1}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!meta || meta.page <= 1 || isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    이전
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!meta || meta.page >= meta.totalPages || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    다음
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

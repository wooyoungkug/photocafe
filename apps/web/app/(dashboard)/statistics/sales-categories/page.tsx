"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  Calendar,
  Folder,
  FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import {
  useSalesCategoryTreeStatistics,
  type SalesCategoryStatItem,
} from "@/hooks/use-statistics";
import { cn } from "@/lib/utils";

// 숫자 포맷팅 함수
function formatNumber(num: number): string {
  return new Intl.NumberFormat("ko-KR").format(num);
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(num);
}

// 비율 계산 함수
function calcPercentage(value: number, total: number): string {
  if (total === 0) return "0.0";
  return ((value / total) * 100).toFixed(1);
}

// 통계 카드 컴포넌트
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: number;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            {trend !== undefined && (
              <div
                className={cn(
                  "flex items-center text-xs font-medium",
                  trend >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                <TrendingUp
                  className={cn("h-3 w-3 mr-1", trend < 0 && "rotate-180")}
                />
                {Math.abs(trend).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 트리 테이블 행 컴포넌트
function TreeTableRow({
  item,
  totalRevenue,
  expandedIds,
  toggleExpand,
  level = 0,
}: {
  item: SalesCategoryStatItem;
  totalRevenue: number;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  level?: number;
}) {
  const isExpanded = expandedIds.has(item.id);
  const hasChildren = item.children && item.children.length > 0;
  const isParent = item.depth === 1;
  const percentage = calcPercentage(item.revenue, totalRevenue);

  return (
    <>
      <TableRow
        className={cn(
          "cursor-pointer transition-colors",
          isParent ? "bg-muted/30 font-medium" : "hover:bg-muted/20",
          level > 0 && "text-sm"
        )}
        onClick={() => hasChildren && toggleExpand(item.id)}
      >
        <TableCell className="w-[300px]">
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${level * 24}px` }}
          >
            {hasChildren ? (
              <button className="p-1 rounded hover:bg-muted">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <span className="w-6" />
            )}
            {isExpanded ? (
              <FolderOpen
                className={cn(
                  "h-4 w-4",
                  isParent ? "text-blue-500" : "text-purple-500"
                )}
              />
            ) : (
              <Folder
                className={cn(
                  "h-4 w-4",
                  isParent ? "text-blue-500" : "text-purple-500"
                )}
              />
            )}
            <span>{item.name}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-xs ml-1",
                isParent
                  ? "bg-blue-50 text-blue-600 border-blue-200"
                  : "bg-purple-50 text-purple-600 border-purple-200"
              )}
            >
              {isParent ? "대분류" : "소분류"}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="text-right font-mono">
          {formatNumber(item.orderCount)}
        </TableCell>
        <TableCell className="text-right font-mono">
          {formatNumber(item.quantity)}
        </TableCell>
        <TableCell className="text-right font-mono font-medium">
          {formatCurrency(item.revenue)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  isParent ? "bg-blue-500" : "bg-purple-500"
                )}
                style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground w-12 text-right">
              {percentage}%
            </span>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded &&
        hasChildren &&
        item.children?.map((child) => (
          <TreeTableRow
            key={child.id}
            item={child}
            totalRevenue={totalRevenue}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            level={level + 1}
          />
        ))}
    </>
  );
}

export default function SalesCategoryStatisticsPage() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const queryParams = useMemo(() => {
    const params: { startDate?: string; endDate?: string } = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return Object.keys(params).length > 0 ? params : undefined;
  }, [startDate, endDate]);

  const { data, isLoading, error } = useSalesCategoryTreeStatistics(queryParams);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (data?.data) {
      const allIds = data.data.map((item) => item.id);
      setExpandedIds(new Set(allIds));
    }
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleSearch = () => {
    // 쿼리 파라미터가 변경되면 자동으로 리페치됨
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
  };

  // 이번 달로 설정
  const setThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  };

  // 지난 달로 설정
  const setLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  };

  // 올해로 설정
  const setThisYear = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1);
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(now.toISOString().split("T")[0]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="품목분류별 통계"
        description="매출품목분류별 주문 및 매출 통계를 확인합니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "통계", href: "/statistics" },
          { label: "품목분류별" },
        ]}
      />

      {/* 기간 필터 */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            기간 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <div>
                <Label htmlFor="startDate" className="text-xs">
                  시작일
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <span className="text-muted-foreground mt-5">~</span>
              <div>
                <Label htmlFor="endDate" className="text-xs">
                  종료일
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={setThisMonth}>
                이번 달
              </Button>
              <Button variant="outline" size="sm" onClick={setLastMonth}>
                지난 달
              </Button>
              <Button variant="outline" size="sm" onClick={setThisYear}>
                올해
              </Button>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={handleReset}>
                초기화
              </Button>
              <Button size="sm" onClick={handleSearch}>
                조회
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 요약 카드 */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="총 분류 수"
            value={formatNumber(data.totals.categoryCount)}
            icon={Folder}
            description="대분류 + 소분류"
          />
          <StatCard
            title="총 주문 건수"
            value={formatNumber(data.totals.orderCount)}
            icon={ShoppingCart}
          />
          <StatCard
            title="총 수량"
            value={formatNumber(data.totals.quantity)}
            icon={Package}
          />
          <StatCard
            title="총 매출"
            value={formatCurrency(data.totals.revenue)}
            icon={BarChart3}
          />
        </div>
      ) : null}

      {/* 상세 테이블 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-base">품목분류별 상세</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              모두 펼치기
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              모두 접기
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-500">
              데이터를 불러오는데 실패했습니다.
            </div>
          ) : !data?.data || data.data.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="데이터가 없습니다"
              description="선택한 기간에 해당하는 통계 데이터가 없습니다."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[300px]">품목분류</TableHead>
                  <TableHead className="text-right w-[120px]">주문 건수</TableHead>
                  <TableHead className="text-right w-[120px]">수량</TableHead>
                  <TableHead className="text-right w-[150px]">매출</TableHead>
                  <TableHead className="text-right w-[150px]">비율</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((item) => (
                  <TreeTableRow
                    key={item.id}
                    item={item}
                    totalRevenue={data.totals.revenue}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                  />
                ))}
                {/* 합계 행 */}
                <TableRow className="bg-primary/5 font-bold border-t-2">
                  <TableCell>합계</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(data.totals.orderCount)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(data.totals.quantity)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(data.totals.revenue)}
                  </TableCell>
                  <TableCell className="text-right">100.0%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Play,
  Loader2,
  Database,
  CheckCircle2,
  XCircle,
  PlayCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// API 함수 타입
interface ApiFunction {
  id: string;
  name: string;
  code: string;
  description: string;
  endpoint: string;
  method: "GET" | "POST";
  requiresAuth: boolean;
}

// 카테고리별 API 함수 그룹
interface ApiCategory {
  id: string;
  name: string;
  description: string;
  functions: ApiFunction[];
}

// 실행 결과 타입
interface ExecutionResult {
  functionId: string;
  name: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  itemCount?: number;
}

// API 카테고리 정의
const API_CATEGORIES: ApiCategory[] = [
  {
    id: "system",
    name: "시스템",
    description: "시스템 설정 및 상태 관리",
    functions: [
      {
        id: "sys_settings",
        name: "시스템 설정",
        code: "system_settings",
        description: "시스템 전체 설정 조회",
        endpoint: "/api/v1/system-settings",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "sys_paper_group",
        name: "용지그룹 설정",
        code: "paper_group_settings",
        description: "용지그룹 관련 설정",
        endpoint: "/api/v1/system-settings?category=paper_group",
        method: "GET",
        requiresAuth: false,
      },
    ],
  },
  {
    id: "category",
    name: "카테고리",
    description: "상품 카테고리 및 분류 관리",
    functions: [
      {
        id: "cat_list",
        name: "카테고리 목록",
        code: "categories",
        description: "전체 카테고리 목록 조회",
        endpoint: "/api/v1/categories",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "cat_tree",
        name: "카테고리 트리",
        code: "categories_tree",
        description: "계층형 카테고리 트리 조회",
        endpoint: "/api/v1/categories/tree",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "sales_cat",
        name: "매출품목분류",
        code: "sales_categories",
        description: "매출 통계용 품목 분류",
        endpoint: "/api/v1/sales-categories",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "sales_cat_tree",
        name: "매출분류 트리",
        code: "sales_categories_tree",
        description: "매출품목분류 트리 구조",
        endpoint: "/api/v1/sales-categories/tree",
        method: "GET",
        requiresAuth: false,
      },
    ],
  },
  {
    id: "product",
    name: "상품",
    description: "상품 및 반제품 관리",
    functions: [
      {
        id: "prod_list",
        name: "상품 목록",
        code: "products",
        description: "전체 상품 목록 조회",
        endpoint: "/api/v1/products",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "half_prod_list",
        name: "반제품 목록",
        code: "half_products",
        description: "반제품 목록 조회",
        endpoint: "/api/v1/half-products",
        method: "GET",
        requiresAuth: true,
      },
    ],
  },
  {
    id: "specification",
    name: "규격",
    description: "제품 규격(사이즈) 관리",
    functions: [
      {
        id: "spec_list",
        name: "규격 목록",
        code: "specifications",
        description: "전체 규격 목록 조회",
        endpoint: "/api/v1/specifications",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "spec_indigo",
        name: "인디고 규격",
        code: "specifications_indigo",
        description: "인디고 출력용 규격",
        endpoint: "/api/v1/specifications/usage/indigo",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "spec_inkjet",
        name: "잉크젯 규격",
        code: "specifications_inkjet",
        description: "잉크젯 출력용 규격",
        endpoint: "/api/v1/specifications/usage/inkjet",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "spec_album",
        name: "앨범 규격",
        code: "specifications_album",
        description: "앨범용 규격",
        endpoint: "/api/v1/specifications/usage/album",
        method: "GET",
        requiresAuth: false,
      },
    ],
  },
  {
    id: "paper",
    name: "용지",
    description: "용지, 제지사, 대리점 관리",
    functions: [
      {
        id: "paper_list",
        name: "용지 목록",
        code: "papers",
        description: "전체 용지 목록 조회",
        endpoint: "/api/v1/papers",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "paper_roll",
        name: "롤 용지",
        code: "papers_roll",
        description: "롤 타입 용지 목록",
        endpoint: "/api/v1/papers/type/roll",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "paper_sheet",
        name: "시트 용지",
        code: "papers_sheet",
        description: "시트 타입 용지 목록",
        endpoint: "/api/v1/papers/type/sheet",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "paper_mfr",
        name: "제지사",
        code: "paper_manufacturers",
        description: "제지사 목록 조회",
        endpoint: "/api/v1/paper-manufacturers",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "paper_supplier",
        name: "용지대리점",
        code: "paper_suppliers",
        description: "용지대리점 목록 조회",
        endpoint: "/api/v1/paper-suppliers",
        method: "GET",
        requiresAuth: false,
      },
    ],
  },
  {
    id: "production",
    name: "생산",
    description: "생산 설정 및 그룹 관리",
    functions: [
      {
        id: "prod_groups",
        name: "생산그룹 목록",
        code: "production_groups",
        description: "생산그룹 전체 목록",
        endpoint: "/api/v1/production/groups",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "prod_groups_tree",
        name: "생산그룹 트리",
        code: "production_groups_tree",
        description: "생산그룹 계층 구조",
        endpoint: "/api/v1/production/groups/tree",
        method: "GET",
        requiresAuth: false,
      },
    ],
  },
  {
    id: "client",
    name: "거래처",
    description: "거래처 및 그룹 관리",
    functions: [
      {
        id: "client_list",
        name: "거래처 목록",
        code: "clients",
        description: "전체 거래처 목록 조회",
        endpoint: "/api/v1/clients",
        method: "GET",
        requiresAuth: true,
      },
      {
        id: "client_groups",
        name: "거래처 그룹",
        code: "client_groups",
        description: "거래처 그룹 목록 조회",
        endpoint: "/api/v1/client-groups",
        method: "GET",
        requiresAuth: true,
      },
    ],
  },
  {
    id: "staff",
    name: "직원",
    description: "직원 및 부서 관리",
    functions: [
      {
        id: "staff_list",
        name: "직원 목록",
        code: "staff",
        description: "전체 직원 목록 조회",
        endpoint: "/api/v1/staff",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "dept_list",
        name: "부서 목록",
        code: "departments",
        description: "전체 부서 목록 조회",
        endpoint: "/api/v1/departments",
        method: "GET",
        requiresAuth: false,
      },
    ],
  },
  {
    id: "order",
    name: "주문",
    description: "주문 관리",
    functions: [
      {
        id: "order_list",
        name: "주문 목록",
        code: "orders",
        description: "주문 목록 조회",
        endpoint: "/api/v1/orders",
        method: "GET",
        requiresAuth: true,
      },
      {
        id: "order_status",
        name: "주문 상태별 건수",
        code: "orders_status_counts",
        description: "주문 상태별 통계",
        endpoint: "/api/v1/orders/status-counts",
        method: "GET",
        requiresAuth: true,
      },
    ],
  },
  {
    id: "statistics",
    name: "통계",
    description: "각종 통계 데이터",
    functions: [
      {
        id: "stat_dashboard",
        name: "대시보드 요약",
        code: "statistics_dashboard",
        description: "대시보드 요약 통계",
        endpoint: "/api/v1/statistics/dashboard",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "stat_sales",
        name: "매출 통계",
        code: "statistics_sales",
        description: "매출 통계 데이터",
        endpoint: "/api/v1/statistics/sales",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "stat_clients",
        name: "거래처별 통계",
        code: "statistics_clients",
        description: "거래처별 매출 통계",
        endpoint: "/api/v1/statistics/clients",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "stat_bindings",
        name: "제본방법별 통계",
        code: "statistics_bindings",
        description: "제본방법별 통계",
        endpoint: "/api/v1/statistics/bindings",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "stat_products",
        name: "상품별 통계",
        code: "statistics_products",
        description: "상품별 매출 통계",
        endpoint: "/api/v1/statistics/products",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "stat_monthly",
        name: "월별 추이",
        code: "statistics_monthly",
        description: "월별 매출 추이",
        endpoint: "/api/v1/statistics/monthly-trend",
        method: "GET",
        requiresAuth: false,
      },
      {
        id: "stat_categories",
        name: "카테고리별 통계",
        code: "statistics_categories",
        description: "카테고리별 통계",
        endpoint: "/api/v1/statistics/categories",
        method: "GET",
        requiresAuth: false,
      },
    ],
  },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function FunctionsPage() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(API_CATEGORIES.map(c => c.id))
  );
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [isExecutingAll, setIsExecutingAll] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<ExecutionResult | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [isBatchResultDialogOpen, setIsBatchResultDialogOpen] = useState(false);
  const [resultData, setResultData] = useState<any[] | null>(null);
  const [resultColumns, setResultColumns] = useState<string[]>([]);

  // 토큰 가져오기
  const getAuthToken = (): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("accessToken") || localStorage.getItem("token");
    }
    return null;
  };

  // 카테고리 토글
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // 모든 카테고리 펼치기/접기
  const toggleAllCategories = (expand: boolean) => {
    if (expand) {
      setExpandedCategories(new Set(API_CATEGORIES.map((c) => c.id)));
    } else {
      setExpandedCategories(new Set());
    }
  };

  // 단일 API 실행
  const handleExecute = async (func: ApiFunction, showDialog: boolean = true): Promise<ExecutionResult> => {
    const startTime = Date.now();
    setExecutingId(func.id);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (func.requiresAuth) {
        const token = getAuthToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      const response = await fetch(`${API_BASE_URL}${func.endpoint}`, {
        method: func.method,
        headers,
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // 데이터 배열 추출
      let items: any[] = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data;
      } else if (data.items && Array.isArray(data.items)) {
        items = data.items;
      } else {
        items = [data];
      }

      const result: ExecutionResult = {
        functionId: func.id,
        name: func.name,
        success: true,
        data: items,
        duration,
        itemCount: items.length,
      };

      if (showDialog) {
        // 컬럼 추출
        if (items.length > 0) {
          const cols = Object.keys(items[0]).filter(
            (key) => !["createdAt", "updatedAt", "deletedAt"].includes(key)
          );
          setResultColumns(cols.slice(0, 6));
        } else {
          setResultColumns([]);
        }

        setResultData(items);
        setSelectedResult(result);
        setIsResultDialogOpen(true);
        toast({ variant: "success", title: `${items.length}개 데이터 조회 (${duration}ms)` });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: ExecutionResult = {
        functionId: func.id,
        name: func.name,
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
        duration,
      };

      if (showDialog) {
        toast({
          variant: "destructive",
          title: "실행 실패",
          description: result.error,
        });
      }

      return result;
    } finally {
      setExecutingId(null);
    }
  };

  // 전체 실행
  const handleExecuteAll = async () => {
    setIsExecutingAll(true);
    setExecutionProgress(0);
    setExecutionResults([]);

    const allFunctions = API_CATEGORIES.flatMap((cat) => cat.functions);
    const results: ExecutionResult[] = [];

    for (let i = 0; i < allFunctions.length; i++) {
      const func = allFunctions[i];
      const result = await handleExecute(func, false);
      results.push(result);
      setExecutionResults([...results]);
      setExecutionProgress(((i + 1) / allFunctions.length) * 100);
    }

    setIsExecutingAll(false);
    setIsBatchResultDialogOpen(true);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    toast({
      variant: failCount > 0 ? "destructive" : "success",
      title: `전체 실행 완료`,
      description: `성공: ${successCount}개, 실패: ${failCount}개`,
    });
  };

  // 셀 값 포맷팅
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Y" : "N";
    if (typeof value === "object") return JSON.stringify(value).slice(0, 50);
    if (typeof value === "string" && value.length > 50) return value.slice(0, 50) + "...";
    return String(value);
  };

  // 함수 개수 계산
  const totalFunctions = API_CATEGORIES.reduce((sum, cat) => sum + cat.functions.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="내부함수 관리"
        description={`API 엔드포인트를 테스트하고 관리합니다. (총 ${totalFunctions}개 함수)`}
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "기초정보", href: "/settings/basic" },
          { label: "내부함수" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAllCategories(true)}
            >
              모두 펼치기
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAllCategories(false)}
            >
              모두 접기
            </Button>
            <Button
              onClick={handleExecuteAll}
              disabled={isExecutingAll}
              className="gap-2"
            >
              {isExecutingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  실행 중... ({Math.round(executionProgress)}%)
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  전체 실행
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* 실행 진행률 */}
      {isExecutingAll && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>전체 실행 진행률</span>
                <span>{Math.round(executionProgress)}%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${executionProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 카테고리별 API 함수 목록 */}
      <div className="space-y-4">
        {API_CATEGORIES.map((category) => (
          <Card key={category.id}>
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
              onClick={() => toggleCategory(category.id)}
            >
              <div className="flex items-center gap-3">
                {expandedCategories.has(category.id) ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {category.name}
                    <Badge variant="secondary">{category.functions.length}</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">{category.description}</CardDescription>
                </div>
              </div>
            </CardHeader>

            {expandedCategories.has(category.id) && (
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {/* 헤더 */}
                  <div className="grid grid-cols-[180px_1fr_50px_50px] gap-2 px-3 py-2 bg-muted rounded-lg text-xs font-medium text-muted-foreground">
                    <span>함수명</span>
                    <span>엔드포인트</span>
                    <span className="text-center">인증</span>
                    <span className="text-center">실행</span>
                  </div>

                  {/* 함수 목록 */}
                  {category.functions.map((func) => {
                    const result = executionResults.find((r) => r.functionId === func.id);
                    return (
                      <div
                        key={func.id}
                        className={cn(
                          "grid grid-cols-[180px_1fr_50px_50px] gap-2 px-3 py-2 rounded-lg border transition-colors",
                          "hover:bg-muted/50",
                          result?.success === true && "border-green-200 bg-green-50/50",
                          result?.success === false && "border-red-200 bg-red-50/50"
                        )}
                      >
                        {/* 함수명 */}
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-sm">{func.name}</span>
                          {result && (
                            result.success ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )
                          )}
                        </div>

                        {/* 엔드포인트 */}
                        <div className="flex items-center overflow-hidden">
                          <code className="text-xs text-muted-foreground truncate">
                            {func.endpoint}
                          </code>
                        </div>

                        {/* 인증 */}
                        <div className="flex items-center justify-center">
                          <span className={cn("text-xs", func.requiresAuth ? "text-primary font-medium" : "text-muted-foreground")}>
                            {func.requiresAuth ? "Y" : "N"}
                          </span>
                        </div>

                        {/* 실행 버튼 */}
                        <div className="flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleExecute(func)}
                            disabled={executingId === func.id || isExecutingAll}
                          >
                            {executingId === func.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* 단일 실행 결과 다이얼로그 */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {selectedResult?.name} 조회 결과
            </DialogTitle>
            <DialogDescription>
              {resultData && (
                <Badge variant="secondary">
                  {resultData.length}건
                </Badge>
              )}
              {selectedResult && (
                <span className="ml-2 text-xs">({selectedResult.duration}ms)</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="h-[400px] overflow-auto rounded-md border">
            {resultData && resultData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {resultColumns.map((col) => (
                      <TableHead key={col} className="whitespace-nowrap">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultData.slice(0, 100).map((item, idx) => (
                    <TableRow key={idx}>
                      {resultColumns.map((col) => (
                        <TableCell key={col} className="whitespace-nowrap">
                          {formatCellValue(item[col])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                데이터가 없습니다.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setIsResultDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 전체 실행 결과 다이얼로그 */}
      <Dialog open={isBatchResultDialogOpen} onOpenChange={setIsBatchResultDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              전체 실행 결과
            </DialogTitle>
            <DialogDescription>
              <div className="flex gap-4 mt-2">
                <Badge variant="default" className="bg-green-500">
                  성공: {executionResults.filter((r) => r.success).length}개
                </Badge>
                <Badge variant="destructive">
                  실패: {executionResults.filter((r) => !r.success).length}개
                </Badge>
                <Badge variant="secondary">
                  총 소요시간: {executionResults.reduce((sum, r) => sum + r.duration, 0)}ms
                </Badge>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="h-[400px] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">상태</TableHead>
                  <TableHead>함수명</TableHead>
                  <TableHead className="text-right">건수</TableHead>
                  <TableHead className="text-right">소요시간</TableHead>
                  <TableHead>결과</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executionResults.map((result) => (
                  <TableRow key={result.functionId}>
                    <TableCell>
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{result.name}</TableCell>
                    <TableCell className="text-right">
                      {result.itemCount !== undefined ? `${result.itemCount}건` : "-"}
                    </TableCell>
                    <TableCell className="text-right">{result.duration}ms</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {result.success ? (
                        <span className="text-green-600">성공</span>
                      ) : (
                        <span className="text-red-600">{result.error}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExecutionResults([])}>
              결과 초기화
            </Button>
            <Button onClick={() => setIsBatchResultDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

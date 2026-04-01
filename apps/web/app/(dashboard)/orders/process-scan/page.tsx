"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ScanBarcode,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Clock,
  RotateCcw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRODUCT_TYPES,
  DEPARTMENTS,
  DEFAULT_PROCESS_TEMPLATES,
  type ProductType,
  type ProcessStep,
} from "@/hooks/use-process-templates";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScanMode = "start" | "complete";

interface ScanResult {
  id: string;
  time: string;
  barcode: string;
  orderNumber: string;
  productName: string;
  stepName: string;
  mode: ScanMode;
  status: "success" | "warning" | "error";
  message: string;
}

// 시뮬레이션용 주문 공정 상태
interface OrderProcess {
  orderNumber: string;
  productType: ProductType;
  productName: string;
  steps: (ProcessStep & { status: "pending" | "in_progress" | "completed" })[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProcessScanPage() {
  const [scanMode, setScanMode] = useState<ScanMode>("start");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 시뮬레이션용: 현재 조회된 주문 공정 정보
  const [currentOrder, setCurrentOrder] = useState<OrderProcess | null>(null);

  // 자동 포커스
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 포커스 잃으면 재포커스 (물리 스캐너 호환)
  const handleBlur = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // 바코드 스캔 처리
  const handleScan = useCallback(() => {
    const trimmed = barcodeInput.trim();
    if (!trimmed) return;

    // 바코드 형식 파싱: {주문번호}-{항목순번}-{공정순서}
    // 예: 260401-001-01-03
    const parts = trimmed.split("-");
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // 간단한 데모: 바코드에서 정보 추출 시뮬레이션
    // 실제 구현에서는 POST /barcode-scan/scan API 호출
    if (parts.length < 3) {
      const result: ScanResult = {
        id: crypto.randomUUID(),
        time: timeStr,
        barcode: trimmed,
        orderNumber: "-",
        productName: "-",
        stepName: "-",
        mode: scanMode,
        status: "error",
        message: "유효하지 않은 바코드 형식입니다.",
      };
      setLastResult(result);
      setRecentScans((prev) => [result, ...prev].slice(0, 20));
    } else {
      const orderNumber = parts.slice(0, -2).join("-");
      const stepOrder = parseInt(parts[parts.length - 1], 10);
      const productType = "compressed_album" as ProductType; // 데모용 기본값

      const template = DEFAULT_PROCESS_TEMPLATES[productType];
      const step = template?.find((s) => s.stepOrder === stepOrder);

      if (!step) {
        const result: ScanResult = {
          id: crypto.randomUUID(),
          time: timeStr,
          barcode: trimmed,
          orderNumber,
          productName: PRODUCT_TYPES[productType],
          stepName: `공정 #${stepOrder}`,
          mode: scanMode,
          status: "error",
          message: `공정 순서 ${stepOrder}에 해당하는 공정을 찾을 수 없습니다.`,
        };
        setLastResult(result);
        setRecentScans((prev) => [result, ...prev].slice(0, 20));
      } else {
        // 시뮬레이션: 공정 상태 업데이트
        const steps = template.map((s) => ({
          ...s,
          status: s.stepOrder < stepOrder
            ? ("completed" as const)
            : s.stepOrder === stepOrder
              ? scanMode === "start"
                ? ("in_progress" as const)
                : ("completed" as const)
              : ("pending" as const),
        }));

        const nextStep = steps.find((s) => s.status === "pending");

        setCurrentOrder({
          orderNumber,
          productType,
          productName: PRODUCT_TYPES[productType],
          steps,
        });

        const result: ScanResult = {
          id: crypto.randomUUID(),
          time: timeStr,
          barcode: trimmed,
          orderNumber,
          productName: PRODUCT_TYPES[productType],
          stepName: step.stepName,
          mode: scanMode,
          status: "success",
          message:
            scanMode === "start"
              ? `"${step.stepName}" 작업을 시작합니다.`
              : `"${step.stepName}" 작업이 완료되었습니다.${nextStep ? ` 다음: ${nextStep.stepName}` : " (모든 공정 완료!)"}`,
        };
        setLastResult(result);
        setRecentScans((prev) => [result, ...prev].slice(0, 20));
        setSessionCount((c) => c + 1);
      }
    }

    setBarcodeInput("");
    inputRef.current?.focus();
  }, [barcodeInput, scanMode]);

  // Enter 키 핸들러
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan();
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-[24px] text-black font-normal">공정 바코드 스캔</h1>
        <p className="text-[14px] text-gray-500">
          바코드를 스캔하여 공정 시작/완료를 기록합니다. 물리 스캐너 또는 직접 입력이 가능합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 스캔 입력 + 결과 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 스캔 모드 토글 */}
          <div className="flex gap-2">
            <Button
              size="lg"
              className={cn(
                "flex-1 h-14 text-[16px] font-bold transition-all",
                scanMode === "start"
                  ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
              onClick={() => setScanMode("start")}
            >
              <PlayCircle className="h-6 w-6 mr-2" />
              작업 시작
            </Button>
            <Button
              size="lg"
              className={cn(
                "flex-1 h-14 text-[16px] font-bold transition-all",
                scanMode === "complete"
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
              onClick={() => setScanMode("complete")}
            >
              <CheckCircle2 className="h-6 w-6 mr-2" />
              작업 완료
            </Button>
          </div>

          {/* 바코드 입력 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    ref={inputRef}
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder="바코드를 스캔하거나 입력하세요..."
                    className="pl-10 h-14 text-[18px] text-center font-mono"
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleScan}
                  disabled={!barcodeInput.trim()}
                  className="h-14 px-6 text-[14px]"
                >
                  스캔
                </Button>
              </div>
              <p className="text-[12px] text-gray-400 mt-2 text-center">
                물리 스캐너: 자동으로 Enter가 전송됩니다 | 형식: 주문번호-항목번호-공정순서
              </p>
            </CardContent>
          </Card>

          {/* 마지막 스캔 결과 */}
          {lastResult && (
            <Card
              className={cn(
                "border-2 transition-all",
                lastResult.status === "success" && "border-green-300 bg-green-50",
                lastResult.status === "warning" && "border-amber-300 bg-amber-50",
                lastResult.status === "error" && "border-red-300 bg-red-50"
              )}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-1">
                    {lastResult.status === "success" && (
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    )}
                    {lastResult.status === "warning" && (
                      <AlertTriangle className="h-8 w-8 text-amber-600" />
                    )}
                    {lastResult.status === "error" && (
                      <XCircle className="h-8 w-8 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-bold text-black">
                      {lastResult.message}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-[13px] text-gray-600">
                      <span>주문: <span className="font-mono font-bold">{lastResult.orderNumber}</span></span>
                      <span>상품: {lastResult.productName}</span>
                      <span>공정: {lastResult.stepName}</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[11px]",
                          lastResult.mode === "start"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        )}
                      >
                        {lastResult.mode === "start" ? "시작" : "완료"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 공정 타임라인 */}
          {currentOrder && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[14px] font-bold flex items-center gap-2">
                  <span className="font-mono">{currentOrder.orderNumber}</span>
                  <Badge variant="secondary" className="text-[11px]">
                    {currentOrder.productName}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 flex-wrap">
                  {currentOrder.steps.map((step, i) => (
                    <div key={step.stepCode + "-" + i} className="flex items-center gap-1">
                      <div
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium border transition-all",
                          step.status === "completed" &&
                            "bg-green-100 border-green-300 text-green-700",
                          step.status === "in_progress" &&
                            "bg-blue-100 border-blue-400 text-blue-700 ring-2 ring-blue-200 animate-pulse",
                          step.status === "pending" &&
                            "bg-gray-50 border-gray-200 text-gray-400"
                        )}
                      >
                        {step.status === "completed" && (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        {step.status === "in_progress" && (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        {step.stepName}
                      </div>
                      {i < currentOrder.steps.length - 1 && (
                        <ArrowRight
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            step.status === "completed"
                              ? "text-green-400"
                              : "text-gray-300"
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 최근 스캔 이력 */}
          {recentScans.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[14px] font-bold">최근 스캔 이력</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[12px]"
                    onClick={() => {
                      setRecentScans([]);
                      setSessionCount(0);
                      setLastResult(null);
                      setCurrentOrder(null);
                    }}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    초기화
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[12px] w-20">시간</TableHead>
                      <TableHead className="text-[12px]">바코드</TableHead>
                      <TableHead className="text-[12px]">주문</TableHead>
                      <TableHead className="text-[12px]">공정</TableHead>
                      <TableHead className="text-[12px] w-16">모드</TableHead>
                      <TableHead className="text-[12px]">결과</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentScans.map((scan) => (
                      <TableRow key={scan.id}>
                        <TableCell className="text-[12px] font-mono">{scan.time}</TableCell>
                        <TableCell className="text-[12px] font-mono">{scan.barcode}</TableCell>
                        <TableCell className="text-[12px]">{scan.orderNumber}</TableCell>
                        <TableCell className="text-[12px]">{scan.stepName}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              scan.mode === "start"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            )}
                          >
                            {scan.mode === "start" ? "시작" : "완료"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              scan.status === "success" && "bg-green-100 text-green-700",
                              scan.status === "warning" && "bg-amber-100 text-amber-700",
                              scan.status === "error" && "bg-red-100 text-red-700"
                            )}
                          >
                            {scan.status === "success" ? "성공" : scan.status === "warning" ? "경고" : "오류"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 우측: 정보 카드 */}
        <div className="space-y-4">
          {/* 세션 통계 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] font-bold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                세션 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-[24px] font-bold text-green-600">{sessionCount}</p>
                  <p className="text-[12px] text-green-600">처리 건수</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-[24px] font-bold text-blue-600">{recentScans.length}</p>
                  <p className="text-[12px] text-blue-600">총 스캔</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 바코드 형식 안내 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] font-bold">바코드 형식 안내</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg font-mono text-[13px] text-center">
                <span className="text-blue-600">260401-001</span>
                <span className="text-gray-400">-</span>
                <span className="text-purple-600">01</span>
                <span className="text-gray-400">-</span>
                <span className="text-green-600">03</span>
              </div>
              <div className="space-y-1 text-[12px]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-100" />
                  <span className="text-gray-600">주문번호 (YYMMDD-NNN)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-purple-100" />
                  <span className="text-gray-600">항목 순번 (2자리)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-100" />
                  <span className="text-gray-600">공정 순서 (2자리)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 사용법 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] font-bold">사용법</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-[13px] text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-[11px] font-bold text-gray-500 shrink-0 mt-0.5">1</span>
                  <span><span className="font-bold text-green-600">작업 시작</span> 또는 <span className="font-bold text-blue-600">작업 완료</span> 모드를 선택합니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-[11px] font-bold text-gray-500 shrink-0 mt-0.5">2</span>
                  <span>해당 공정의 바코드를 스캐너로 스캔합니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-[11px] font-bold text-gray-500 shrink-0 mt-0.5">3</span>
                  <span>공정 상태가 자동으로 업데이트되고 결과가 표시됩니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-[11px] font-bold text-gray-500 shrink-0 mt-0.5">4</span>
                  <span>모든 공정 완료 시 주문 상태가 자동 전환됩니다.</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

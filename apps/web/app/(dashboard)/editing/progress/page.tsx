"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Search, PlayCircle, User, FileImage, CheckCircle, Clock, PauseCircle } from "lucide-react";

// 임시 샘플 데이터
const sampleOrders = [
  {
    id: "1",
    orderNumber: "ORD-2026-0004",
    productionNumber: "P-2026-0004-01",
    clientName: "스튜디오 해피",
    productName: "프리미엄 웨딩앨범 10x10",
    pages: 30,
    quantity: 1,
    startedAt: "2026-01-28 15:00",
    editor: "김편집",
    progress: 75,
    fileCount: 32,
    completedFiles: 24,
    status: "editing",
  },
  {
    id: "2",
    orderNumber: "ORD-2026-0005",
    productionNumber: "P-2026-0005-01",
    clientName: "스냅샷 스튜디오",
    productName: "포토북 A4 소프트커버",
    pages: 20,
    quantity: 3,
    startedAt: "2026-01-28 11:30",
    editor: "박디자인",
    progress: 40,
    fileCount: 22,
    completedFiles: 9,
    status: "editing",
  },
  {
    id: "3",
    orderNumber: "ORD-2026-0006",
    productionNumber: "P-2026-0006-01",
    clientName: "메모리 포토",
    productName: "베이비앨범 8x8",
    pages: 24,
    quantity: 2,
    startedAt: "2026-01-28 09:45",
    editor: "이작업",
    progress: 90,
    fileCount: 26,
    completedFiles: 23,
    status: "reviewing",
  },
];

export default function EditingProgressPage() {
  const [search, setSearch] = useState("");

  const filteredOrders = sampleOrders.filter((order) =>
    order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    order.clientName.toLowerCase().includes(search.toLowerCase()) ||
    order.productName.toLowerCase().includes(search.toLowerCase()) ||
    order.editor.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string, progress: number) => {
    if (status === "reviewing") {
      return <Badge className="bg-purple-500">검토중</Badge>;
    }
    if (progress >= 80) {
      return <Badge className="bg-green-500">거의완료</Badge>;
    }
    if (progress >= 50) {
      return <Badge className="bg-blue-500">진행중</Badge>;
    }
    return <Badge className="bg-yellow-500">시작</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PlayCircle className="h-6 w-6" />
          편집진행
        </h1>
        <p className="text-muted-foreground">
          현재 편집 작업이 진행 중인 주문 목록입니다.
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">진행중</p>
                <p className="text-2xl font-bold">{sampleOrders.length}건</p>
              </div>
              <Pencil className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">검토중</p>
                <p className="text-2xl font-bold text-purple-600">
                  {sampleOrders.filter((o) => o.status === "reviewing").length}건
                </p>
              </div>
              <PauseCircle className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">평균 진행률</p>
                <p className="text-2xl font-bold">
                  {Math.round(sampleOrders.reduce((sum, o) => sum + o.progress, 0) / sampleOrders.length)}%
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">완료된 파일</p>
                <p className="text-2xl font-bold">
                  {sampleOrders.reduce((sum, o) => sum + o.completedFiles, 0)}/
                  {sampleOrders.reduce((sum, o) => sum + o.fileCount, 0)}
                </p>
              </div>
              <FileImage className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 영역 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">검색</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="주문번호, 거래처, 상품명, 담당자로 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 주문 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">편집진행 목록</CardTitle>
          <CardDescription>
            총 {filteredOrders.length}건의 주문이 편집 진행 중입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>주문번호</TableHead>
                <TableHead>거래처</TableHead>
                <TableHead>상품</TableHead>
                <TableHead>담당자</TableHead>
                <TableHead className="text-center">진행률</TableHead>
                <TableHead className="text-center">파일</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    편집 진행 중인 주문이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">{order.productionNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {order.clientName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="max-w-[180px] truncate" title={order.productName}>
                          {order.productName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.pages}p / {order.quantity}부
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.editor}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="w-32 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span>{order.progress}%</span>
                        </div>
                        <Progress value={order.progress} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <FileImage className="h-4 w-4 text-muted-foreground" />
                        {order.completedFiles}/{order.fileCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(order.status, order.progress)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline">
                          상세보기
                        </Button>
                        <Button size="sm" className="gap-1">
                          <CheckCircle className="h-4 w-4" />
                          완료
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Search, User, FileImage, Calendar, ArrowRight, Download, Eye } from "lucide-react";

// 임시 샘플 데이터
const sampleOrders = [
  {
    id: "1",
    orderNumber: "ORD-2026-0010",
    productionNumber: "P-2026-0010-01",
    clientName: "웨딩스튜디오 로맨스",
    productName: "프리미엄 웨딩앨범 12x12",
    pages: 40,
    quantity: 1,
    editor: "김편집",
    startedAt: "2026-01-27 09:00",
    completedAt: "2026-01-28 17:30",
    fileCount: 42,
    status: "approved",
  },
  {
    id: "2",
    orderNumber: "ORD-2026-0011",
    productionNumber: "P-2026-0011-01",
    clientName: "포토그래피 아트",
    productName: "아트프린트 A3",
    pages: 1,
    quantity: 20,
    editor: "박디자인",
    startedAt: "2026-01-27 14:00",
    completedAt: "2026-01-28 11:00",
    fileCount: 20,
    status: "approved",
  },
  {
    id: "3",
    orderNumber: "ORD-2026-0012",
    productionNumber: "P-2026-0012-01",
    clientName: "스냅스 스튜디오",
    productName: "포토북 A4 하드커버",
    pages: 50,
    quantity: 2,
    editor: "이작업",
    startedAt: "2026-01-26 10:00",
    completedAt: "2026-01-28 16:00",
    fileCount: 52,
    status: "printing",
  },
  {
    id: "4",
    orderNumber: "ORD-2026-0013",
    productionNumber: "P-2026-0013-01",
    clientName: "메모리즈 포토",
    productName: "캔버스 액자 50x70",
    pages: 1,
    quantity: 5,
    editor: "김편집",
    startedAt: "2026-01-27 11:00",
    completedAt: "2026-01-27 15:00",
    fileCount: 5,
    status: "approved",
  },
];

export default function EditingCompletedPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const filteredOrders = sampleOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.clientName.toLowerCase().includes(search.toLowerCase()) ||
      order.productName.toLowerCase().includes(search.toLowerCase()) ||
      order.editor.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">승인완료</Badge>;
      case "printing":
        return <Badge className="bg-blue-500">인쇄중</Badge>;
      case "rejected":
        return <Badge variant="destructive">반려</Badge>;
      default:
        return <Badge variant="secondary">대기</Badge>;
    }
  };

  // 작업 시간 계산
  const calculateWorkTime = (started: string, completed: string) => {
    const start = new Date(started);
    const end = new Date(completed);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      const hours = diffHours % 24;
      return `${days}일 ${hours}시간`;
    }
    return `${diffHours}시간 ${diffMins}분`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6" />
          편집완료
        </h1>
        <p className="text-muted-foreground">
          편집 작업이 완료된 주문 목록입니다.
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">오늘 완료</p>
                <p className="text-2xl font-bold">{sampleOrders.length}건</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">승인완료</p>
                <p className="text-2xl font-bold text-green-600">
                  {sampleOrders.filter((o) => o.status === "approved").length}건
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">인쇄중</p>
                <p className="text-2xl font-bold text-blue-600">
                  {sampleOrders.filter((o) => o.status === "printing").length}건
                </p>
              </div>
              <ArrowRight className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 파일</p>
                <p className="text-2xl font-bold">
                  {sampleOrders.reduce((sum, o) => sum + o.fileCount, 0)}개
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
          <CardTitle className="text-base">검색 및 필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="주문번호, 거래처, 상품명, 담당자로 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="approved">승인완료</SelectItem>
                <SelectItem value="printing">인쇄중</SelectItem>
                <SelectItem value="rejected">반려</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="기간" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="today">오늘</SelectItem>
                <SelectItem value="week">이번 주</SelectItem>
                <SelectItem value="month">이번 달</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 주문 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">편집완료 목록</CardTitle>
          <CardDescription>
            총 {filteredOrders.length}건의 주문이 편집 완료되었습니다.
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
                <TableHead className="text-center">파일수</TableHead>
                <TableHead>완료일시</TableHead>
                <TableHead className="text-center">작업시간</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    편집 완료된 주문이 없습니다.
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
                        <div className="max-w-[150px] truncate" title={order.productName}>
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
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FileImage className="h-4 w-4 text-muted-foreground" />
                        {order.fileCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {order.completedAt}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {calculateWorkTime(order.startedAt, order.completedAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="gap-1">
                          <Eye className="h-4 w-4" />
                          보기
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1">
                          <Download className="h-4 w-4" />
                          다운로드
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

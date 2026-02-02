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
import { Pencil, Search, Clock, FileImage, User, Calendar, ArrowRight, AlertCircle } from "lucide-react";

// 임시 샘플 데이터
const sampleOrders = [
  {
    id: "1",
    orderNumber: "ORD-2026-0001",
    productionNumber: "P-2026-0001-01",
    clientName: "홍길동 사진관",
    productName: "프리미엄 웨딩앨범 12x12",
    pages: 40,
    quantity: 2,
    requestedDate: "2026-01-30",
    orderedAt: "2026-01-28 14:30",
    status: "pending",
    priority: "normal",
    fileCount: 42,
  },
  {
    id: "2",
    orderNumber: "ORD-2026-0002",
    productionNumber: "P-2026-0002-01",
    clientName: "스튜디오 봄",
    productName: "포토북 A4 하드커버",
    pages: 30,
    quantity: 5,
    requestedDate: "2026-01-29",
    orderedAt: "2026-01-28 10:15",
    status: "pending",
    priority: "urgent",
    fileCount: 32,
  },
  {
    id: "3",
    orderNumber: "ORD-2026-0003",
    productionNumber: "P-2026-0003-01",
    clientName: "갤러리 포토",
    productName: "캔버스 액자 30x40",
    pages: 1,
    quantity: 10,
    requestedDate: "2026-01-31",
    orderedAt: "2026-01-28 09:00",
    status: "pending",
    priority: "normal",
    fileCount: 10,
  },
];

export default function EditingPendingPage() {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const filteredOrders = sampleOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.clientName.toLowerCase().includes(search.toLowerCase()) ||
      order.productName.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6" />
          편집대기
        </h1>
        <p className="text-muted-foreground">
          편집 작업이 필요한 주문 목록입니다.
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">전체 대기</p>
                <p className="text-2xl font-bold">{sampleOrders.length}건</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">긴급</p>
                <p className="text-2xl font-bold text-red-600">
                  {sampleOrders.filter((o) => o.priority === "urgent").length}건
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">오늘 마감</p>
                <p className="text-2xl font-bold">1건</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
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
                placeholder="주문번호, 거래처, 상품명으로 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="우선순위" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="urgent">긴급</SelectItem>
                <SelectItem value="normal">일반</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 주문 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">편집대기 목록</CardTitle>
          <CardDescription>
            총 {filteredOrders.length}건의 주문이 편집 대기 중입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>주문번호</TableHead>
                <TableHead>거래처</TableHead>
                <TableHead>상품</TableHead>
                <TableHead className="text-center">페이지/수량</TableHead>
                <TableHead className="text-center">파일수</TableHead>
                <TableHead>마감일</TableHead>
                <TableHead className="text-center">우선순위</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    편집 대기 중인 주문이 없습니다.
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
                      <div className="max-w-[200px] truncate" title={order.productName}>
                        {order.productName}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {order.pages}p / {order.quantity}부
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FileImage className="h-4 w-4 text-muted-foreground" />
                        {order.fileCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{order.requestedDate}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      {order.priority === "urgent" ? (
                        <Badge variant="destructive">긴급</Badge>
                      ) : (
                        <Badge variant="secondary">일반</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="gap-1">
                        <Pencil className="h-4 w-4" />
                        편집시작
                        <ArrowRight className="h-4 w-4" />
                      </Button>
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

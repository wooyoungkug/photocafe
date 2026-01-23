"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FileText, Download, Send } from "lucide-react";

export default function TaxInvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // 샘플 데이터
  const taxInvoices = [
    {
      id: "1",
      invoiceNumber: "20260122-001",
      date: "2026-01-22",
      type: "sales",
      clientName: "포토스튜디오A",
      businessNumber: "123-45-67890",
      supplyAmount: 500000,
      taxAmount: 50000,
      totalAmount: 550000,
      status: "issued",
    },
    {
      id: "2",
      invoiceNumber: "20260121-003",
      date: "2026-01-21",
      type: "purchase",
      clientName: "용지공급사",
      businessNumber: "234-56-78901",
      supplyAmount: 300000,
      taxAmount: 30000,
      totalAmount: 330000,
      status: "received",
    },
    {
      id: "3",
      invoiceNumber: "20260120-002",
      date: "2026-01-20",
      type: "sales",
      clientName: "웨딩스튜디오B",
      businessNumber: "345-67-89012",
      supplyAmount: 1200000,
      taxAmount: 120000,
      totalAmount: 1320000,
      status: "pending",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "issued":
        return <Badge className="bg-green-500">발행완료</Badge>;
      case "received":
        return <Badge className="bg-blue-500">수신완료</Badge>;
      case "pending":
        return <Badge variant="outline">발행대기</Badge>;
      case "cancelled":
        return <Badge variant="destructive">취소</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === "sales" ? (
      <Badge className="bg-indigo-500">매출</Badge>
    ) : (
      <Badge className="bg-orange-500">매입</Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  // 통계 계산
  const stats = {
    totalSales: taxInvoices
      .filter((inv) => inv.type === "sales")
      .reduce((sum, inv) => sum + inv.supplyAmount, 0),
    totalPurchases: taxInvoices
      .filter((inv) => inv.type === "purchase")
      .reduce((sum, inv) => sum + inv.supplyAmount, 0),
    pendingCount: taxInvoices.filter((inv) => inv.status === "pending").length,
    issuedCount: taxInvoices.filter((inv) => inv.status === "issued").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">세금계산서관리</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            엑셀 다운로드
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            세금계산서 발행
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              매출 세금계산서
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {formatCurrency(stats.totalSales)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              매입 세금계산서
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.totalPurchases)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              발행완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.issuedCount}건
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              발행대기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingCount}건
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="거래처명, 사업자번호 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="sales">매출</SelectItem>
            <SelectItem value="purchase">매입</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="issued">발행완료</SelectItem>
            <SelectItem value="received">수신완료</SelectItem>
            <SelectItem value="pending">발행대기</SelectItem>
            <SelectItem value="cancelled">취소</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 테이블 */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>발행번호</TableHead>
              <TableHead>발행일</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>거래처</TableHead>
              <TableHead>사업자번호</TableHead>
              <TableHead className="text-right">공급가액</TableHead>
              <TableHead className="text-right">세액</TableHead>
              <TableHead className="text-right">합계</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-center">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taxInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    {invoice.invoiceNumber}
                  </div>
                </TableCell>
                <TableCell>{invoice.date}</TableCell>
                <TableCell>{getTypeBadge(invoice.type)}</TableCell>
                <TableCell>{invoice.clientName}</TableCell>
                <TableCell>{invoice.businessNumber}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(invoice.supplyAmount)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(invoice.taxAmount)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(invoice.totalAmount)}
                </TableCell>
                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1">
                    <Button variant="ghost" size="sm">
                      <FileText className="w-4 h-4" />
                    </Button>
                    {invoice.status === "pending" && (
                      <Button variant="ghost" size="sm">
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

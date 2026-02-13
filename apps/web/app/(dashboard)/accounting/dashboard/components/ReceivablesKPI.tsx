'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  FileText,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  CheckCircle,
  BarChart3,
} from 'lucide-react';
import type { ReceivablesDashboard } from '@/hooks/use-dashboard';

interface ReceivablesKPIProps {
  data: ReceivablesDashboard;
}

export default function ReceivablesKPI({ data }: ReceivablesKPIProps) {
  const { summary } = data;

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* 총 미수금 */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">총 미수금</p>
              <p className="text-2xl font-bold text-orange-900">
                {summary.totalReceivables.toLocaleString()}원
              </p>
              <p className="text-xs text-orange-600 mt-1">
                {summary.receivableCount}건 · {summary.clientCount}개 거래처
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 연체금액 */}
      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">연체금액</p>
              <p className="text-2xl font-bold text-red-900">
                {summary.overdueAmount.toLocaleString()}원
              </p>
              <p className="text-xs text-red-600 mt-1">{summary.overdueCount}건 연체</p>
            </div>
            <div className="h-12 w-12 bg-red-500 rounded-xl flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 당월 매출/수금 */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">당월 매출</p>
              <p className="text-2xl font-bold text-blue-900">
                {summary.monthlySales.toLocaleString()}원
              </p>
              <p className="text-xs text-green-600 mt-1">
                수금 {summary.monthlyReceived.toLocaleString()}원 (
                {summary.monthlySales > 0
                  ? Math.round((summary.monthlyReceived / summary.monthlySales) * 100)
                  : 0}
                %)
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 당월 수금 예정 */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">당월 수금 예정</p>
              <p className="text-2xl font-bold text-purple-900">
                {summary.dueThisMonth.toLocaleString()}원
              </p>
              <p className="text-xs text-purple-600 mt-1">{summary.dueThisMonthCount}건</p>
            </div>
            <div className="h-12 w-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

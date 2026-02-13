'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, TrendingUp, RefreshCw } from 'lucide-react';
import type { CreditScoreResult } from '@/hooks/use-sales-ledger';

interface CreditScoreCardProps {
  clientId: string;
  clientName: string;
  creditScore?: CreditScoreResult;
  isLoading?: boolean;
  onCalculate: () => void;
}

export function CreditScoreCard({ clientId, clientName, creditScore, isLoading, onCalculate }: CreditScoreCardProps) {
  if (!creditScore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>신용도 평가</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              신용도 평가를 실행하여 거래처의 신용등급과 신용한도를 확인하세요.
            </p>
            <Button onClick={onCalculate} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              신용도 평가 실행
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getGradeBadgeVariant = (grade: string) => {
    if (grade === 'A') return 'default';
    if (grade === 'B') return 'secondary';
    if (grade === 'C') return 'outline';
    return 'destructive';
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'A') return '#22c55e';
    if (grade === 'B') return '#3b82f6';
    if (grade === 'C') return '#eab308';
    return '#ef4444';
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    if (riskLevel === 'low') return 'default';
    if (riskLevel === 'medium') return 'secondary';
    return 'destructive';
  };

  const getRiskText = (riskLevel: string) => {
    if (riskLevel === 'low') return '낮음';
    if (riskLevel === 'medium') return '중간';
    return '높음';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>신용도 평가</CardTitle>
        <Button variant="outline" size="sm" onClick={onCalculate} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          재평가
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 신용점수 게이지 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">신용점수</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold" style={{ color: getGradeColor(creditScore.grade) }}>
                {creditScore.score}
              </span>
              <span className="text-muted-foreground">/100</span>
            </div>
          </div>
          <Progress value={creditScore.score} className="h-3" />
        </div>

        {/* 등급 및 리스크 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-2">신용등급</div>
            <Badge variant={getGradeBadgeVariant(creditScore.grade)} className="text-lg px-4 py-1">
              {creditScore.grade}등급
            </Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-2">리스크 수준</div>
            <Badge variant={getRiskBadgeVariant(creditScore.riskLevel)}>
              {getRiskText(creditScore.riskLevel)}
            </Badge>
          </div>
        </div>

        {/* 신용한도 */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-blue-600 mb-1">신용한도</div>
              <div className="text-2xl font-bold text-blue-900">
                {creditScore.creditLimit.toLocaleString()}원
              </div>
              <div className="text-xs text-blue-600 mt-1">
                월평균 매출: {creditScore.monthlyAvgSales.toLocaleString()}원
              </div>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        {/* 평가 지표 */}
        <div className="space-y-3">
          <div className="text-sm font-medium mb-2">평가 지표</div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>결제 이행률 (40%)</span>
              <span className="font-medium">{creditScore.metrics.paymentComplianceRate}%</span>
            </div>
            <Progress value={creditScore.metrics.paymentComplianceRate} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>미수금 회전율 (30%)</span>
              <span className="font-medium">{creditScore.metrics.receivablesTurnoverScore.toFixed(1)}</span>
            </div>
            <Progress value={creditScore.metrics.receivablesTurnoverScore} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>연체 이력 (30%)</span>
              <span className="font-medium">{creditScore.metrics.overdueHistoryScore.toFixed(1)}</span>
            </div>
            <Progress value={creditScore.metrics.overdueHistoryScore} className="h-2" />
          </div>
        </div>

        {/* 연체 정보 */}
        {creditScore.overdueCount > 0 && (
          <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-orange-900">연체 건수</div>
              <div className="text-xs text-orange-700">{creditScore.overdueCount}건의 연체 내역이 있습니다</div>
            </div>
          </div>
        )}

        {/* 리스크 경고 */}
        {creditScore.riskLevel === 'high' && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-red-900">고위험 거래처</div>
              <div className="text-xs text-red-700">신용거래 제한을 권장합니다</div>
            </div>
          </div>
        )}

        {/* 권장사항 */}
        <div className="p-4 bg-slate-50 rounded-lg border">
          <div className="text-sm font-medium mb-2">권장사항</div>
          <p className="text-sm text-muted-foreground">{creditScore.recommendation}</p>
        </div>
      </CardContent>
    </Card>
  );
}

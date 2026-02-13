'use client';

import { FileText, AlertTriangle, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { SalesLedgerSummary } from '@/lib/types/sales-ledger';

interface ReceivableSummaryCardsProps {
  summary: SalesLedgerSummary | undefined;
  dueDateToday?: number;
  dueDateThisWeek?: number;
  onFilterClick?: (filter: string) => void;
}

interface SummaryCardProps {
  label: string;
  value: number;
  subText?: string;
  icon: React.ElementType;
  gradient: string;
  textColor: string;
  iconBg: string;
  filterKey?: string;
  onClick?: () => void;
}

function SummaryCard({
  label,
  value,
  subText,
  icon: Icon,
  gradient,
  textColor,
  iconBg,
  onClick,
}: SummaryCardProps) {
  return (
    <Card
      className={`${gradient} cursor-pointer transition-shadow hover:shadow-md`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${value.toLocaleString()}원`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <CardContent className="pt-4 pb-4 px-4 sm:pt-6 sm:pb-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className={`text-xs sm:text-sm ${textColor} font-medium truncate`}>
              {label}
            </p>
            <p className={`text-lg sm:text-2xl font-bold ${textColor.replace('600', '900')} truncate`}>
              {value.toLocaleString()}원
            </p>
            {subText && (
              <p className={`mt-1 text-xs ${textColor} truncate`}>{subText}</p>
            )}
          </div>
          <div
            className={`h-10 w-10 sm:h-12 sm:w-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0 ml-2`}
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReceivableSummaryCards({
  summary,
  dueDateToday = 0,
  dueDateThisWeek = 0,
  onFilterClick,
}: ReceivableSummaryCardsProps) {
  const cards: SummaryCardProps[] = [
    {
      label: '총 미수금',
      value: summary?.totalOutstanding || 0,
      subText: `${summary?.clientCount || 0}개 거래처`,
      icon: FileText,
      gradient: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200',
      textColor: 'text-orange-600',
      iconBg: 'bg-orange-500',
      filterKey: 'all',
    },
    {
      label: '연체금액',
      value: summary?.totalOverdue || 0,
      subText: `${summary?.overdueClientCount || 0}개 거래처`,
      icon: AlertTriangle,
      gradient: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
      textColor: 'text-red-600',
      iconBg: 'bg-red-500',
      filterKey: 'overdue',
    },
    {
      label: '오늘 수금예정',
      value: dueDateToday,
      icon: Calendar,
      gradient: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
      textColor: 'text-blue-600',
      iconBg: 'bg-blue-500',
      filterKey: 'today',
    },
    {
      label: '이번주 수금예정',
      value: dueDateThisWeek,
      icon: TrendingUp,
      gradient: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
      textColor: 'text-green-600',
      iconBg: 'bg-green-500',
      filterKey: 'week',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => (
        <SummaryCard
          key={card.filterKey}
          {...card}
          onClick={() => onFilterClick?.(card.filterKey || 'all')}
        />
      ))}
    </div>
  );
}

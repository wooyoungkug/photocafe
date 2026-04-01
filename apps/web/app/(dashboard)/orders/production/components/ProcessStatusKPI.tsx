'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Clock,
  CheckCircle2,
  Factory,
  Package,
  Truck,
  XCircle,
} from 'lucide-react';

interface ProcessStatusKPIProps {
  data: Record<string, number> | undefined;
  isLoading: boolean;
}

const STATUS_CONFIG = [
  {
    key: 'pending_receipt',
    label: '접수대기',
    icon: Clock,
    bg: 'from-slate-50 to-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-600',
    bold: 'text-slate-900',
    iconBg: 'bg-slate-500',
  },
  {
    key: 'receipt_completed',
    label: '접수완료',
    icon: CheckCircle2,
    bg: 'from-blue-50 to-blue-100',
    border: 'border-blue-200',
    text: 'text-blue-600',
    bold: 'text-blue-900',
    iconBg: 'bg-blue-500',
  },
  {
    key: 'in_production',
    label: '생산진행',
    icon: Factory,
    bg: 'from-amber-50 to-amber-100',
    border: 'border-amber-200',
    text: 'text-amber-600',
    bold: 'text-amber-900',
    iconBg: 'bg-amber-500',
  },
  {
    key: 'ready_for_shipping',
    label: '배송준비',
    icon: Package,
    bg: 'from-emerald-50 to-emerald-100',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    bold: 'text-emerald-900',
    iconBg: 'bg-emerald-500',
  },
  {
    key: 'shipped',
    label: '배송완료',
    icon: Truck,
    bg: 'from-teal-50 to-teal-100',
    border: 'border-teal-200',
    text: 'text-teal-600',
    bold: 'text-teal-900',
    iconBg: 'bg-teal-500',
  },
  {
    key: 'cancelled',
    label: '취소',
    icon: XCircle,
    bg: 'from-red-50 to-red-100',
    border: 'border-red-200',
    text: 'text-red-600',
    bold: 'text-red-900',
    iconBg: 'bg-red-500',
  },
] as const;

export default function ProcessStatusKPI({ data, isLoading }: ProcessStatusKPIProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {STATUS_CONFIG.map(({ key, label, icon: Icon, bg, border, text, bold, iconBg }) => (
        <Card key={key} className={`bg-gradient-to-br ${bg} ${border}`}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[13px] font-medium ${text}`}>{label}</p>
                <p className={`text-[24px] font-bold ${bold} leading-tight mt-0.5`}>
                  {isLoading ? '—' : (data?.[key] ?? 0).toLocaleString()}
                </p>
                <p className={`text-[12px] ${text} mt-0.5`}>건</p>
              </div>
              <div className={`h-10 w-10 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

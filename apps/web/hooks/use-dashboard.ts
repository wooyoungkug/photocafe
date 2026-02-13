import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ===== 미수금 대시보드 =====
export interface ReceivablesDashboard {
  summary: {
    totalReceivables: number;
    receivableCount: number;
    overdueAmount: number;
    overdueCount: number;
    clientCount: number;
    monthlySales: number;
    monthlyReceived: number;
    yearlySales: number;
    yearlyReceived: number;
    dueThisMonth: number;
    dueThisMonthCount: number;
  };
  aging: {
    under30: number;
    days30to60: number;
    days60to90: number;
    over90: number;
  };
  topClients: Array<{
    clientId: string;
    clientName: string;
    clientCode: string;
    outstanding: number;
    ledgerCount: number;
  }>;
  monthlyCollection: Array<{
    month: string;
    received: number;
    count: number;
  }>;
}

export function useReceivablesDashboard() {
  return useQuery({
    queryKey: ['receivables-dashboard'],
    queryFn: () => api.get<ReceivablesDashboard>('/dashboard/receivables'),
    staleTime: 60_000, // 1분
  });
}

// ===== 거래처별 미수금 명세서 =====
export interface ReceivableStatement {
  client: {
    id: string;
    clientCode: string;
    clientName: string;
    businessNumber?: string;
    representative?: string;
    phone?: string;
    mobile?: string;
    email?: string;
    postalCode?: string;
    address?: string;
    addressDetail?: string;
    creditEnabled: boolean;
    creditPeriodDays?: number;
    creditPaymentDay?: number;
    paymentTerms: number;
    creditGrade: string;
  };
  summary: {
    totalSales: number;
    totalReceived: number;
    totalOutstanding: number;
    ledgerCount: number;
    paidCount: number;
    unpaidCount: number;
    partialCount: number;
    overdueCount: number;
  };
  ledgers: any[];
  receipts: any[];
}

export function useReceivableStatement(clientId: string, params?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['receivable-statement', clientId, params],
    queryFn: async () => {
      const queryParams: Record<string, string | undefined> = {};
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      return api.get<ReceivableStatement>(`/reports/receivable-statement/${clientId}`, queryParams);
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });
}

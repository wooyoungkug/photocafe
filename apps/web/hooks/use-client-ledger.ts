import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const CLIENT_LEDGER_API = '/client-ledger';

// ===== Types =====

export interface ClientLedgerItem {
  clientId: string;
  clientCode: string;
  clientName: string;
  totalSales: number;
  totalReceived: number;
  salesBalance: number;
  totalPurchases: number;
  totalPaid: number;
  purchaseBalance: number;
  netBalance: number;
  salesCount: number;
  purchaseCount: number;
  lastTransactionDate: string;
}

export interface ClientLedgerStats {
  salesClientCount: number;
  purchaseClientCount: number;
  totalSalesBalance: number;
  totalPurchaseBalance: number;
  netBalance: number;
  currentMonthSales: number;
  currentMonthPurchases: number;
  currentMonthReceived: number;
  currentMonthPaid: number;
}

export interface LedgerTransaction {
  date: string;
  type: 'SALES' | 'RECEIPT' | 'PURCHASE' | 'PAYMENT';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  referenceNo: string;
}

export interface ClientLedgerDetail {
  client: {
    id: string;
    clientCode: string;
    clientName: string;
    businessNumber: string;
    phone: string;
    email: string;
  };
  openingBalance: number;
  closingBalance: number;
  transactions: LedgerTransaction[];
  summary: {
    totalDebit: number;
    totalCredit: number;
  };
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PeriodSummaryItem {
  period: string;
  sales: number;
  received: number;
  purchases: number;
  paid: number;
  salesBalance: number;
  purchaseBalance: number;
  netBalance: number;
}

export interface ClientLedgerSummary {
  openingBalance: {
    salesBalance: number;
    purchaseBalance: number;
    netBalance: number;
  };
  periods: PeriodSummaryItem[];
  closingBalance: {
    salesBalance: number;
    purchaseBalance: number;
    netBalance: number;
  };
}

// ===== Hooks =====

// 거래처원장 목록 조회
export function useClientLedgers(params?: {
  clientType?: 'SALES' | 'PURCHASE' | 'ALL';
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['client-ledgers', params],
    queryFn: async () => {
      const queryParams: Record<string, string | number | boolean | undefined> = {};
      if (params?.clientType) queryParams.clientType = params.clientType;
      if (params?.search) queryParams.search = params.search;
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      if (params?.page) queryParams.page = params.page;
      if (params?.limit) queryParams.limit = params.limit;

      return api.get<{
        data: ClientLedgerItem[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>(CLIENT_LEDGER_API, queryParams);
    },
  });
}

// 거래처원장 통계
export function useClientLedgerStats(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['client-ledger-stats', params],
    queryFn: async () => {
      const queryParams: Record<string, string | undefined> = {};
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      return api.get<ClientLedgerStats>(`${CLIENT_LEDGER_API}/stats`, queryParams);
    },
    staleTime: 30_000,
  });
}

// 거래처별 상세 원장
export function useClientLedgerDetail(
  clientId: string,
  params?: {
    startDate?: string;
    endDate?: string;
    periodUnit?: 'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    page?: number;
    limit?: number;
  },
) {
  return useQuery({
    queryKey: ['client-ledger-detail', clientId, params],
    queryFn: async () => {
      const queryParams: Record<string, string | number | undefined> = {};
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      if (params?.periodUnit) queryParams.periodUnit = params.periodUnit;
      if (params?.page) queryParams.page = params.page;
      if (params?.limit) queryParams.limit = params.limit;
      return api.get<ClientLedgerDetail>(`${CLIENT_LEDGER_API}/${clientId}`, queryParams);
    },
    enabled: !!clientId,
  });
}

// 거래처별 기간 요약
export function useClientLedgerSummary(
  clientId: string,
  params?: {
    startDate?: string;
    endDate?: string;
    periodUnit?: 'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  },
) {
  return useQuery({
    queryKey: ['client-ledger-summary', clientId, params],
    queryFn: async () => {
      const queryParams: Record<string, string | undefined> = {};
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      if (params?.periodUnit) queryParams.periodUnit = params.periodUnit;
      return api.get<ClientLedgerSummary>(`${CLIENT_LEDGER_API}/${clientId}/summary`, queryParams);
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });
}

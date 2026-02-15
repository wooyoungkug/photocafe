import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const CLIENT_LEDGER_API = '/client-ledger';

// ===== Types =====
export interface ClientLedgerItem {
  clientId: string;
  clientCode: string;
  clientName: string;
  businessNumber: string | null;
  phone: string | null;
  totalSales: number;
  totalReceived: number;
  salesOutstanding: number;
  salesCount: number;
  lastSalesDate: string | null;
  totalPurchases: number;
  totalPaid: number;
  purchaseOutstanding: number;
  purchaseCount: number;
  lastPurchaseDate: string | null;
}

export interface ClientLedgerSummary {
  clientCount: number;
  totalSales: number;
  totalReceived: number;
  totalSalesOutstanding: number;
  totalPurchases: number;
  totalPaid: number;
  totalPurchaseOutstanding: number;
}

export interface ClientLedgerListResponse {
  data: ClientLedgerItem[];
  summary: ClientLedgerSummary;
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface LedgerTransaction {
  date: string;
  type: 'sales' | 'receipt' | 'purchase' | 'payment';
  ledgerNumber: string;
  orderNumber: string;
  description: string;
  productName?: string;
  title?: string;
  debit: number;
  credit: number;
  balance: number;
  salesType?: string;
  purchaseType?: string;
  paymentMethod?: string;
  paymentStatus?: string;
}

export interface PeriodSummaryItem {
  period: string;
  debit: number;
  credit: number;
  balance: number;
  count: number;
  description: string;
}

export interface ClientLedgerDetailResponse {
  client: {
    id: string;
    clientCode: string;
    clientName: string;
    businessNumber: string | null;
    representative: string | null;
    businessType: string | null;
    businessCategory: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    addressDetail: string | null;
    creditGrade: string;
    paymentTerms: number;
  };
  carryForward: {
    salesBalance: number;
    purchaseBalance: number;
    netBalance: number;
  };
  transactions: LedgerTransaction[];
  periodSummary: PeriodSummaryItem[];
  totals: {
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
  };
  period: {
    startDate: string;
    endDate: string;
    periodType: string;
  };
}

// ===== 거래처원장 목록 =====
export function useClientLedgers(params?: {
  clientType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['client-ledgers', params],
    queryFn: async () => {
      const queryParams: Record<string, string | number | boolean | undefined> = {};
      if (params?.clientType) queryParams.clientType = params.clientType;
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      if (params?.search) queryParams.search = params.search;
      if (params?.page) queryParams.page = params.page;
      if (params?.limit) queryParams.limit = params.limit;

      return api.get<ClientLedgerListResponse>(CLIENT_LEDGER_API, queryParams);
    },
  });
}

// ===== 거래처원장 상세 =====
export function useClientLedgerDetail(
  clientId: string,
  params?: {
    startDate?: string;
    endDate?: string;
    periodType?: string;
  },
) {
  return useQuery({
    queryKey: ['client-ledger-detail', clientId, params],
    queryFn: async () => {
      const queryParams: Record<string, string | undefined> = {};
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      if (params?.periodType) queryParams.periodType = params.periodType;

      return api.get<ClientLedgerDetailResponse>(
        `${CLIENT_LEDGER_API}/${clientId}`,
        queryParams,
      );
    },
    enabled: !!clientId,
  });
}

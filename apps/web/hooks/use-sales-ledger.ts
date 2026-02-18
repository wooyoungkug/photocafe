import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  SalesLedger,
  SalesLedgerSummary,
  ClientSalesSummary,
  MonthlyTrend,
  CreateSalesReceiptDto,
} from '@/lib/types/sales-ledger';

const SALES_LEDGER_API = '/sales-ledger';

// ===== 매출원장 목록 조회 =====
export function useSalesLedgers(params?: {
  startDate?: string;
  endDate?: string;
  clientId?: string;
  salesType?: string;
  paymentStatus?: string;
  salesStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['sales-ledgers', params],
    queryFn: async () => {
      const queryParams: Record<string, string | number | boolean | undefined> = {};
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      if (params?.clientId) queryParams.clientId = params.clientId;
      if (params?.salesType) queryParams.salesType = params.salesType;
      if (params?.paymentStatus) queryParams.paymentStatus = params.paymentStatus;
      if (params?.salesStatus) queryParams.salesStatus = params.salesStatus;
      if (params?.search) queryParams.search = params.search;
      if (params?.page) queryParams.page = params.page;
      if (params?.limit) queryParams.limit = params.limit;

      return api.get<{
        data: SalesLedger[];
        meta: { total: number; page: number; limit: number; totalPages: number };
        summary?: {
          carryForwardBalance: number;
          totalDebit: number;
          totalCredit: number;
          closingBalance: number;
        };
      }>(SALES_LEDGER_API, queryParams);
    },
  });
}

// ===== 전월이월 잔액 조회 =====
export function useCarryOverBalance(params?: { clientId?: string; beforeDate?: string }) {
  return useQuery({
    queryKey: ['carry-over-balance', params],
    queryFn: async () => {
      const queryParams: Record<string, string | undefined> = {};
      if (params?.clientId) queryParams.clientId = params.clientId;
      if (params?.beforeDate) queryParams.beforeDate = params.beforeDate;
      return api.get<{ totalDebit: number; totalCredit: number; balance: number }>(
        `${SALES_LEDGER_API}/carry-over`,
        queryParams,
      );
    },
    enabled: !!params?.clientId && !!params?.beforeDate,
  });
}

// ===== 매출원장 상세 =====
export function useSalesLedger(id: string) {
  return useQuery({
    queryKey: ['sales-ledger', id],
    queryFn: () => api.get<SalesLedger>(`${SALES_LEDGER_API}/${id}`),
    enabled: !!id,
  });
}

// ===== 매출원장 요약 (대시보드) =====
export function useSalesLedgerSummary() {
  return useQuery({
    queryKey: ['sales-ledger-summary'],
    queryFn: () => api.get<SalesLedgerSummary>(`${SALES_LEDGER_API}/summary`),
    staleTime: 30_000,
  });
}

// ===== 거래처별 매출 집계 =====
export function useClientSalesSummary(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['client-sales-summary', params],
    queryFn: async () => {
      const queryParams: Record<string, string | undefined> = {};
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      return api.get<ClientSalesSummary[]>(`${SALES_LEDGER_API}/client-summary`, queryParams);
    },
    staleTime: 30_000,
  });
}

// ===== 월별 매출 추이 =====
export function useMonthlyTrend(months: number = 12) {
  return useQuery({
    queryKey: ['sales-monthly-trend', months],
    queryFn: () => api.get<MonthlyTrend[]>(`${SALES_LEDGER_API}/monthly-trend`, { months }),
    staleTime: 60_000,
  });
}

// ===== 입금 처리 =====
export function useAddSalesReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ salesLedgerId, data }: { salesLedgerId: string; data: CreateSalesReceiptDto }) => {
      return api.post<SalesLedger>(`${SALES_LEDGER_API}/${salesLedgerId}/receipts`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['sales-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['sales-ledger-summary'] });
      queryClient.invalidateQueries({ queryKey: ['client-sales-summary'] });
    },
  });
}

// ===== 매출 확정 =====
export function useConfirmSales() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (salesLedgerId: string) => {
      return api.post<SalesLedger>(`${SALES_LEDGER_API}/${salesLedgerId}/confirm`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['sales-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['sales-ledger-summary'] });
    },
  });
}

// ===== 매출 취소 =====
export function useCancelSales() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (salesLedgerId: string) => {
      return api.post<SalesLedger>(`${SALES_LEDGER_API}/${salesLedgerId}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['sales-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['sales-ledger-summary'] });
    },
  });
}

// ===== Aging 분석 (실 데이터) =====
export interface AgingAnalysis {
  under30: number;
  under30ClientCount: number;
  days30to60: number;
  days30to60ClientCount: number;
  days60to90: number;
  days60to90ClientCount: number;
  over90: number;
  over90ClientCount: number;
  breakdown: Array<{
    clientId: string;
    clientName: string;
    under30: number;
    days30to60: number;
    days60to90: number;
    over90: number;
  }>;
}

export function useAgingAnalysis(clientId?: string) {
  return useQuery({
    queryKey: ['aging-analysis', clientId],
    queryFn: async () => {
      const queryParams: Record<string, string | undefined> = {};
      if (clientId) queryParams.clientId = clientId;
      return api.get<AgingAnalysis>(`${SALES_LEDGER_API}/aging-analysis`, queryParams);
    },
    staleTime: 60_000, // 1분
  });
}

// ===== 거래처별 상세 분석 =====
export interface ClientDetail {
  client: any;
  summary: {
    totalSales: number;
    totalReceived: number;
    outstanding: number;
    avgPaymentDays: number;
    onTimePaymentRate: number;
    overdueCount: number;
    lastPaymentDate: string | null;
  };
  monthlyTrend: Array<{
    month: string;
    sales: number;
    received: number;
    outstanding: number;
    count: number;
  }>;
  transactions: any[];
  paymentHistory: any[];
}

export function useClientDetail(clientId: string) {
  return useQuery({
    queryKey: ['client-detail', clientId],
    queryFn: () => api.get<ClientDetail>(`${SALES_LEDGER_API}/client/${clientId}/detail`),
    enabled: !!clientId,
    staleTime: 60_000,
  });
}

// ===== 입금예정일 집계 =====
export interface DueDateSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  overdue: number;
  byDate: Array<{
    dueDate: string;
    count: number;
    amount: number;
    clients: Array<{
      clientId: string;
      clientName: string;
      amount: number;
    }>;
  }>;
}

export function useDueDateSummary(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['due-date-summary', params],
    queryFn: async () => {
      const queryParams: Record<string, string | undefined> = {};
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      return api.get<DueDateSummary>(`${SALES_LEDGER_API}/due-date-summary`, queryParams);
    },
    staleTime: 60_000,
  });
}

// ===== 신용도 자동 평가 =====
export interface CreditScoreResult {
  clientId: string;
  clientName: string;
  score: number;
  grade: string;
  creditLimit: number;
  riskLevel: 'low' | 'medium' | 'high';
  metrics: {
    paymentComplianceRate: number;
    receivablesTurnoverScore: number;
    overdueHistoryScore: number;
  };
  overdueCount: number;
  monthlyAvgSales: number;
  recommendation: string;
}

export function useCalculateCreditScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      return api.post<CreditScoreResult>(`${SALES_LEDGER_API}/client/${clientId}/calculate-credit-score`, {});
    },
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({ queryKey: ['client-detail', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-sales-summary'] });
    },
  });
}

// ===== 입금 패턴 분석 =====
export interface PaymentPattern {
  avgPaymentDays: number;
  medianPaymentDays: number;
  onTimePaymentRate: number;
  delayedPaymentRate: number;
  seasonality: Array<{
    month: number;
    avgPaymentDays: number;
  }>;
  weekdayPattern: Array<{
    weekday: string;
    count: number;
    avgAmount: number;
  }>;
}

export function usePaymentPattern(params?: { clientId?: string; months?: number }) {
  return useQuery({
    queryKey: ['payment-pattern', params],
    queryFn: async () => {
      const queryParams: Record<string, string | number | undefined> = {};
      if (params?.clientId) queryParams.clientId = params.clientId;
      if (params?.months) queryParams.months = params.months;
      return api.get<PaymentPattern>(`${SALES_LEDGER_API}/payment-pattern`, queryParams);
    },
    staleTime: 60_000,
  });
}

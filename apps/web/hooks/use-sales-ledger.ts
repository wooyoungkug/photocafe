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
      }>(SALES_LEDGER_API, queryParams);
    },
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
  });
}

// ===== 월별 매출 추이 =====
export function useMonthlyTrend(months: number = 12) {
  return useQuery({
    queryKey: ['sales-monthly-trend', months],
    queryFn: () => api.get<MonthlyTrend[]>(`${SALES_LEDGER_API}/monthly-trend`, { months }),
  });
}

// ===== 수금 처리 =====
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

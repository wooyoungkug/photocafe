import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const SALES_LEDGER_API = '/sales-ledger';

// ===== 영업담당자별 미수금 요약 =====
export interface StaffSummary {
  staffId: string;
  staffName: string;
  staffCode: string;
  totalSales: number;
  totalReceived: number;
  outstanding: number;
  clientCount: number;
  ledgerCount: number;
  collectionRate: number;
}

export function useSummaryByStaff(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['summary-by-staff', params],
    queryFn: async () => {
      const queryParams: Record<string, string | undefined> = {};
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      return api.get<StaffSummary[]>(`${SALES_LEDGER_API}/summary-by-staff`, queryParams);
    },
    staleTime: 30_000, // 30초
  });
}

// ===== 영업담당자별 수금 실적 =====
export interface StaffCollectionSummary {
  staffId: string;
  staffName: string;
  staffCode: string;
  totalReceived: number;
  receiptCount: number;
  byMethod: {
    cash: number;
    bankTransfer: number;
    card: number;
    check: number;
  };
}

export function useCollectionByStaff(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['collection-by-staff', params],
    queryFn: async () => {
      const queryParams: Record<string, string | undefined> = {};
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      return api.get<StaffCollectionSummary[]>(`${SALES_LEDGER_API}/collection-by-staff`, queryParams);
    },
    staleTime: 30_000,
  });
}

// ===== 영업담당자별 상세 매출원장 목록 =====
export function useLedgersByStaff(staffId: string, params?: {
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['ledgers-by-staff', staffId, params],
    queryFn: async () => {
      const queryParams: Record<string, string | number | undefined> = {};
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      if (params?.paymentStatus) queryParams.paymentStatus = params.paymentStatus;
      if (params?.page) queryParams.page = params.page;
      if (params?.limit) queryParams.limit = params.limit;
      return api.get<{
        data: any[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>(`${SALES_LEDGER_API}/by-staff/${staffId}`, queryParams);
    },
    enabled: !!staffId,
    staleTime: 30_000,
  });
}

// ===== 영업담당자별 거래처 미수금 집계 =====
export interface StaffClientSummary {
  clientId: string;
  clientName: string;
  clientCode: string;
  totalSales: number;
  totalReceived: number;
  outstanding: number;
  ledgerCount: number;
  lastLedgerDate: string;
}

export function useStaffClientsSummary(staffId: string, params?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['staff-clients-summary', staffId, params],
    queryFn: async () => {
      const queryParams: Record<string, string | undefined> = {};
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      return api.get<StaffClientSummary[]>(`${SALES_LEDGER_API}/by-staff/${staffId}/clients`, queryParams);
    },
    enabled: !!staffId,
    staleTime: 30_000,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

// ===== Types =====

export interface DepositRecord {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  amount: number;
  paymentMethod: string;
  bankName: string | null;
  depositorName: string | null;
  note: string | null;
  salesLedger: {
    clientId: string;
    clientName: string;
    ledgerNumber: string;
    orderNumber: string;
  };
}

export interface DepositSummary {
  totalAmount: number;
  totalCount: number;
}

export interface DepositsResponse {
  data: DepositRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: DepositSummary;
}

export interface DepositsQueryParams {
  startDate?: string;
  endDate?: string;
  clientId?: string;
  paymentMethod?: string;
  page?: number;
  limit?: number;
}

export interface CreateDepositDto {
  salesLedgerId: string;
  receiptDate: string;
  amount: number;
  paymentMethod: string;
  bankName?: string;
  depositorName?: string;
  note?: string;
}

export interface UpdateDepositDto {
  receiptDate?: string;
  amount?: number;
  paymentMethod?: string;
  bankName?: string;
  depositorName?: string;
  note?: string;
}

// ===== 일자별/월별 합계 Types =====

export interface DailyDepositSummary {
  date: string;
  clientId: string;
  clientName: string;
  count: number;
  totalDepositAmount: number;
  totalOrderAmount: number;
}

export interface DailySummaryResponse {
  data: DailyDepositSummary[];
  summary: {
    totalClients: number;
    totalDays: number;
    totalCount: number;
    totalDepositAmount: number;
    totalOrderAmount: number;
    averagePerDay: number;
  };
}

export interface DailySummaryParams {
  startDate: string;
  endDate: string;
  clientId?: string;
  paymentMethod?: string;
}

export interface MonthlyDepositSummary {
  month: string;
  clientId: string;
  clientName: string;
  count: number;
  totalDepositAmount: number;
  totalOrderAmount: number;
}

export interface MonthlySummaryResponse {
  data: MonthlyDepositSummary[];
  summary: {
    totalClients: number;
    totalMonths: number;
    totalCount: number;
    totalDepositAmount: number;
    totalOrderAmount: number;
  };
}

export interface MonthlySummaryParams {
  year: string;
  clientId?: string;
}

export interface DetailDepositsParams {
  startDate: string;
  endDate: string;
  clientId?: string;
  paymentMethod?: string;
}

// Backend DepositResponseDto와 매칭
export interface DepositDetail {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  orderNumber: string;
  orderId: string;
  clientId: string;
  clientName: string;
  orderAmount: number;
  depositAmount: number;
  receivedAmount: number;
  outstandingAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  bankName?: string;
  depositorName?: string;
  note?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface DepositsDetailResponse {
  data: DepositDetail[];
  summary: {
    totalCount: number;
    totalAmount: number;
    totalOrderAmount: number;
  };
}

// ===== Query Key =====

const DEPOSITS_KEY = 'deposits';

// ===== Hooks =====

/**
 * 입금내역 조회 Hook
 * @param params 조회 파라미터 (날짜 범위, 거래처, 결제방법, 페이지네이션)
 * @returns TanStack Query 결과
 */
export function useDeposits(params?: DepositsQueryParams) {
  return useQuery({
    queryKey: [DEPOSITS_KEY, params],
    queryFn: async () => {
      const queryParams: Record<string, string | number> = {};

      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      if (params?.clientId) queryParams.clientId = params.clientId;
      if (params?.paymentMethod) queryParams.paymentMethod = params.paymentMethod;
      if (params?.page) queryParams.page = params.page;
      if (params?.limit) queryParams.limit = params.limit;

      return api.get<DepositsResponse>('/sales-ledger/receipts', queryParams);
    },
    staleTime: 30_000, // 30초 캐시
  });
}

// ===== Helper Functions =====

/**
 * 날짜 프리셋 헬퍼 함수
 * @returns 금일, 당월 날짜 범위 객체
 */
export const getDatePresets = () => {
  const today = new Date();

  return {
    today: {
      startDate: format(startOfDay(today), 'yyyy-MM-dd'),
      endDate: format(endOfDay(today), 'yyyy-MM-dd'),
    },
    thisMonth: {
      startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(today), 'yyyy-MM-dd'),
    },
  };
};

/**
 * 결제방법 라벨 변환
 * @param method 결제방법 코드
 * @returns 한글 라벨
 */
export const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    cash: '현금',
    bank_transfer: '계좌이체',
    card: '카드',
    check: '수표',
  };
  return labels[method] || method;
};

/**
 * 입금 상세 조회
 */
export function useDeposit(id: string) {
  return useQuery({
    queryKey: [DEPOSITS_KEY, id],
    queryFn: () => api.get<DepositRecord>(`/deposits/${id}`),
    enabled: !!id,
  });
}

/**
 * 입금 등록
 */
export function useCreateDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDepositDto) => {
      return api.post<any>('/deposits', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DEPOSITS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['sales-ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['sales-ledger-summary'] });
    },
  });
}

/**
 * 입금 수정
 */
export function useUpdateDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepositDto }) => {
      return api.put<any>(`/deposits/${id}`, data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [DEPOSITS_KEY] });
      queryClient.invalidateQueries({ queryKey: [DEPOSITS_KEY, id] });
      queryClient.invalidateQueries({ queryKey: ['sales-ledgers'] });
    },
  });
}

/**
 * 입금 삭제
 */
export function useDeleteDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      return api.delete(`/deposits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DEPOSITS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['sales-ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['sales-ledger-summary'] });
    },
  });
}

// ===== 일자별/월별 합계 조회 Hooks =====

/**
 * 일자별 합계 조회 Hook (거래처별 일자별 집계)
 * @param params 조회 파라미터 (startDate, endDate, clientId, paymentMethod)
 * @returns TanStack Query 결과
 */
export function useDailySummary(params: DailySummaryParams) {
  return useQuery({
    queryKey: [DEPOSITS_KEY, 'daily-summary', params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {
        startDate: params.startDate,
        endDate: params.endDate,
      };

      if (params.clientId) queryParams.clientId = params.clientId;
      if (params.paymentMethod) queryParams.paymentMethod = params.paymentMethod;

      return api.get<DailySummaryResponse>('/deposits/summary/daily', queryParams);
    },
    staleTime: 60_000, // 1분 캐시
  });
}

/**
 * 월별 합계 조회 Hook (거래처별 월별 집계)
 * @param params 조회 파라미터 (year, clientId)
 * @returns TanStack Query 결과
 */
export function useMonthlySummary(params: MonthlySummaryParams) {
  return useQuery({
    queryKey: [DEPOSITS_KEY, 'monthly-summary', params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {
        year: params.year,
      };

      if (params.clientId) queryParams.clientId = params.clientId;

      return api.get<MonthlySummaryResponse>('/deposits/summary/monthly', queryParams);
    },
    staleTime: 60_000, // 1분 캐시
  });
}

/**
 * 건별 상세 조회 Hook (드릴다운용)
 * enabled: false로 설정하여 수동 호출
 * @param params 조회 파라미터 (startDate, endDate, clientId, paymentMethod)
 * @returns TanStack Query 결과
 */
export function useDepositDetails(params: DetailDepositsParams) {
  return useQuery({
    queryKey: [DEPOSITS_KEY, 'details', params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {
        startDate: params.startDate,
        endDate: params.endDate,
      };

      if (params.clientId) queryParams.clientId = params.clientId;
      if (params.paymentMethod) queryParams.paymentMethod = params.paymentMethod;

      return api.get<DepositsDetailResponse>('/deposits', queryParams);
    },
    enabled: !!params.startDate && !!params.endDate,
    staleTime: 30_000,
  });
}

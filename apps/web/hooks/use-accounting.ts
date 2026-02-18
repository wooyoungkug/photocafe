import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Transaction,
  Payment,
  Receivable,
  Payable,
  BankAccount,
  TransactionSummary,
  CreateTransactionDto,
  CreatePaymentDto,
} from '@/lib/types/accounting';

// API 엔드포인트 기본 경로
const ACCOUNTING_API = '/accounting';

// 샘플 데이터 (백엔드 API 연동 전까지 사용)
const sampleTransactions: Transaction[] = [
  {
    id: '1',
    transactionCode: 'TR-2026-0001',
    type: 'income',
    category: 'sales',
    amount: 500000,
    tax: 50000,
    totalAmount: 550000,
    description: '포토북 인쇄 대금',
    transactionDate: '2026-01-20',
    status: 'completed',
    paymentMethod: 'bank_transfer',
    clientId: '1',
    clientName: '웨딩스튜디오',
    orderCode: 'ORD-2026-0001',
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-01-20T10:00:00Z',
  },
  {
    id: '2',
    transactionCode: 'TR-2026-0002',
    type: 'expense',
    category: 'purchase',
    amount: 200000,
    tax: 20000,
    totalAmount: 220000,
    description: '용지 구입',
    transactionDate: '2026-01-19',
    status: 'completed',
    paymentMethod: 'bank_transfer',
    createdAt: '2026-01-19T14:00:00Z',
    updatedAt: '2026-01-19T14:00:00Z',
  },
  {
    id: '3',
    transactionCode: 'TR-2026-0003',
    type: 'income',
    category: 'sales',
    amount: 300000,
    tax: 30000,
    totalAmount: 330000,
    description: '앨범 인쇄 대금',
    transactionDate: '2026-01-18',
    dueDate: '2026-02-18',
    status: 'pending',
    paymentMethod: 'credit',
    clientId: '2',
    clientName: '베이비스튜디오',
    createdAt: '2026-01-18T09:00:00Z',
    updatedAt: '2026-01-18T09:00:00Z',
  },
];

const sampleReceivables: Receivable[] = [
  {
    id: '1',
    clientId: '1',
    clientName: '웨딩스튜디오',
    clientCode: 'C001',
    totalAmount: 1500000,
    paidAmount: 500000,
    remainingAmount: 1000000,
    dueDate: '2026-02-15',
    status: 'partial',
    relatedTransactions: [],
    payments: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-20T00:00:00Z',
  },
  {
    id: '2',
    clientId: '2',
    clientName: '베이비스튜디오',
    clientCode: 'C002',
    totalAmount: 800000,
    paidAmount: 0,
    remainingAmount: 800000,
    dueDate: '2026-01-25',
    overdueDays: 0,
    status: 'outstanding',
    relatedTransactions: [],
    payments: [],
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-01-10T00:00:00Z',
  },
];

const samplePayables: Payable[] = [
  {
    id: '1',
    supplierId: '1',
    supplierName: '대한용지',
    supplierCode: 'S001',
    totalAmount: 500000,
    paidAmount: 200000,
    remainingAmount: 300000,
    dueDate: '2026-01-30',
    status: 'partial',
    relatedTransactions: [],
    payments: [],
    createdAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
];

const samplePayments: Payment[] = [
  {
    id: '1',
    paymentCode: 'PAY-2026-0001',
    type: 'income',
    amount: 500000,
    paymentDate: '2026-01-20',
    paymentMethod: 'bank_transfer',
    clientId: '1',
    clientName: '웨딩스튜디오',
    accountName: '기업은행',
    description: '포토북 대금 입금',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: '2',
    paymentCode: 'PAY-2026-0002',
    type: 'expense',
    amount: 200000,
    paymentDate: '2026-01-19',
    paymentMethod: 'bank_transfer',
    supplierName: '대한용지',
    accountName: '기업은행',
    description: '용지대금 지급',
    createdAt: '2026-01-19T14:00:00Z',
  },
];

const sampleAccounts: BankAccount[] = [
  {
    id: '1',
    accountName: '기업은행 (주거래)',
    bankName: 'IBK기업은행',
    accountNumber: '123-456789-01-001',
    accountHolder: '(주)프린팅114',
    balance: 15000000,
    isDefault: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-01-20T00:00:00Z',
  },
  {
    id: '2',
    accountName: '국민은행',
    bankName: 'KB국민은행',
    accountNumber: '987-654321-00-001',
    accountHolder: '(주)프린팅114',
    balance: 5000000,
    isDefault: false,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
];

// ===== 거래 내역 =====
export function useTransactions(params?: {
  type?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      // TODO: 실제 API 연동
      // const { data } = await api.get('/accounting/transactions', { params });
      // return data;

      // 샘플 데이터 필터링
      let filtered = [...sampleTransactions];
      if (params?.type) {
        filtered = filtered.filter((t) => t.type === params.type);
      }
      if (params?.category) {
        filtered = filtered.filter((t) => t.category === params.category);
      }
      if (params?.status) {
        filtered = filtered.filter((t) => t.status === params.status);
      }
      return { data: filtered, meta: { total: filtered.length } };
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTransactionDto) => {
      // TODO: 실제 API 연동
      // const { data: result } = await api.post('/accounting/transactions', data);
      // return result;
      return { id: Date.now().toString(), ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// ===== 매출 관리 =====
// 매출원장 시스템으로 이전됨 - use-sales-ledger.ts 사용
// 기존 useSalesTransactions는 deprecated

// ===== 매입 관리 =====
export function usePurchaseTransactions(params?: {
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['purchase-transactions', params],
    queryFn: async () => {
      const filtered = sampleTransactions.filter((t) => t.type === 'expense');
      return { data: filtered, meta: { total: filtered.length } };
    },
  });
}

// ===== 미수금 관리 =====
export function useReceivables(params?: {
  status?: string;
  clientId?: string;
  overdue?: boolean;
}) {
  return useQuery({
    queryKey: ['receivables', params],
    queryFn: async () => {
      try {
        const queryParams: Record<string, string | number | boolean | undefined> = {};
        if (params?.status) queryParams.status = params.status;
        if (params?.clientId) queryParams.clientId = params.clientId;
        if (params?.overdue !== undefined) queryParams.overdue = params.overdue;

        const data = await api.get<{ data: Receivable[]; meta: { total: number } }>(`${ACCOUNTING_API}/receivables`, queryParams);
        return data;
      } catch (error) {
        // API 실패 시 샘플 데이터 사용
        let filtered = [...sampleReceivables];
        if (params?.status) {
          filtered = filtered.filter((r) => r.status === params.status);
        }
        if (params?.overdue) {
          filtered = filtered.filter((r) => r.status === 'overdue');
        }
        return { data: filtered, meta: { total: filtered.length } };
      }
    },
  });
}

export function useReceivableSummary() {
  return useQuery({
    queryKey: ['receivables-summary'],
    queryFn: async () => {
      try {
        const data = await api.get<{
          totalReceivables: number;
          overdueAmount: number;
          clientCount: number;
          aging: { under30: number; days30to60: number; days60to90: number; over90: number };
        }>(`${ACCOUNTING_API}/receivables/summary`);
        return data;
      } catch (error) {
        // API 실패 시 샘플 데이터 사용
        const total = sampleReceivables.reduce((sum, r) => sum + r.remainingAmount, 0);
        const overdue = sampleReceivables
          .filter((r) => r.status === 'overdue')
          .reduce((sum, r) => sum + r.remainingAmount, 0);
        return {
          totalReceivables: total,
          overdueAmount: overdue,
          clientCount: sampleReceivables.length,
          aging: {
            under30: total * 0.4,
            days30to60: total * 0.25,
            days60to90: total * 0.2,
            over90: total * 0.15,
          },
        };
      }
    },
  });
}

// ===== 미지급금 관리 =====
export function usePayables(params?: {
  status?: string;
  supplierId?: string;
  overdue?: boolean;
}) {
  return useQuery({
    queryKey: ['payables', params],
    queryFn: async () => {
      try {
        const queryParams: Record<string, string | number | boolean | undefined> = {};
        if (params?.status) queryParams.status = params.status;
        if (params?.supplierId) queryParams.supplierId = params.supplierId;
        if (params?.overdue !== undefined) queryParams.overdue = params.overdue;

        const data = await api.get<{ data: Payable[]; meta: { total: number } }>(`${ACCOUNTING_API}/payables`, queryParams);
        return data;
      } catch (error) {
        // API 실패 시 샘플 데이터 사용
        let filtered = [...samplePayables];
        if (params?.status) {
          filtered = filtered.filter((p) => p.status === params.status);
        }
        return { data: filtered, meta: { total: filtered.length } };
      }
    },
  });
}

export function usePayableSummary() {
  return useQuery({
    queryKey: ['payables-summary'],
    queryFn: async () => {
      try {
        const data = await api.get<{
          totalPayables: number;
          supplierCount: number;
        }>(`${ACCOUNTING_API}/payables/summary`);
        return data;
      } catch (error) {
        // API 실패 시 샘플 데이터 사용
        const total = samplePayables.reduce((sum, p) => sum + p.remainingAmount, 0);
        return {
          totalPayables: total,
          supplierCount: samplePayables.length,
        };
      }
    },
  });
}

// ===== 입출금 내역 =====
export function usePayments(params?: {
  type?: 'income' | 'expense';
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: async () => {
      let filtered = [...samplePayments];
      if (params?.type) {
        filtered = filtered.filter((p) => p.type === params.type);
      }
      return { data: filtered, meta: { total: filtered.length } };
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePaymentDto) => {
      // TODO: 실제 API 연동
      return { id: Date.now().toString(), paymentCode: `PAY-${Date.now()}`, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['payables'] });
    },
  });
}

// ===== 계좌 관리 =====
export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      return { data: sampleAccounts };
    },
  });
}

// ===== 정산 =====
export function useSettlements(params?: {
  periodType?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['settlements', params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {};
      if (params?.periodType) queryParams.periodType = params.periodType;
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      if (params?.status) queryParams.status = params.status;

      const data = await api.get<any[]>(`${ACCOUNTING_API}/settlements`, queryParams);
      return data;
    },
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { periodType: string; periodStart: string; periodEnd: string }) => {
      const response = await api.post<any>(`${ACCOUNTING_API}/settlements`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
    },
  });
}

export function useConfirmSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<any>(`${ACCOUNTING_API}/settlements/${id}/confirm`, {});
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
  });
}

export function useDailySummary(date?: string) {
  return useQuery({
    queryKey: ['daily-summary', date],
    queryFn: async () => {
      const queryParams: Record<string, string> = {};
      if (date) queryParams.date = date;

      const data = await api.get<{
        date: string;
        totalSales: number;
        totalExpenses: number;
        totalIncome: number;
        totalOutcome: number;
        netCashFlow: number;
      }>(`${ACCOUNTING_API}/daily-summary`, queryParams);
      return data;
    },
  });
}

// ===== 통계 요약 =====
export function useAccountingSummary() {
  return useQuery({
    queryKey: ['accounting-summary'],
    queryFn: async (): Promise<TransactionSummary> => {
      const data = await api.get<TransactionSummary>(`${ACCOUNTING_API}/summary`);
      return data;
    },
    staleTime: 30_000,
  });
}

// ===== 전표 관리 =====
export function useJournals(params?: {
  startDate?: string;
  endDate?: string;
  voucherType?: string;
  clientId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['journals', params],
    queryFn: async () => {
      try {
        const queryParams: Record<string, string | number | boolean | undefined> = {};
        if (params?.startDate) queryParams.startDate = params.startDate;
        if (params?.endDate) queryParams.endDate = params.endDate;
        if (params?.voucherType) queryParams.voucherType = params.voucherType;
        if (params?.clientId) queryParams.clientId = params.clientId;
        if (params?.search) queryParams.search = params.search;
        if (params?.page) queryParams.page = params.page;
        if (params?.limit) queryParams.limit = params.limit;

        const data = await api.get<{ data: unknown[]; meta: { total: number } }>(`${ACCOUNTING_API}/journals`, queryParams);
        return data;
      } catch (error) {
        return { data: [], meta: { total: 0 } };
      }
    },
  });
}

export function useCreateJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      voucherType: string;
      journalDate: string;
      clientId?: string;
      clientName?: string;
      description?: string;
      totalAmount: number;
      entries: Array<{
        accountId: string;
        transactionType: string;
        amount: number;
        description?: string;
      }>;
    }) => {
      const response = await api.post<unknown>(`${ACCOUNTING_API}/journals`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
    },
  });
}

export function useJournalDetail(id: string | null) {
  return useQuery({
    queryKey: ['journal-detail', id],
    queryFn: async () => {
      if (!id) return null;
      const data = await api.get<unknown>(`${ACCOUNTING_API}/journals/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useDeleteJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${ACCOUNTING_API}/journals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
    },
  });
}

// ===== 입금/지급 처리 =====
export function useAddReceivablePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ receivableId, data }: { receivableId: string; data: {
      amount: number;
      paymentDate: string;
      paymentMethod?: string;
      description?: string;
    }}) => {
      const response = await api.post<unknown>(`${ACCOUNTING_API}/receivables/${receivableId}/payments`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['receivables-summary'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
    },
  });
}

export function useAddPayablePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ payableId, data }: { payableId: string; data: {
      amount: number;
      paymentDate: string;
      paymentMethod?: string;
      description?: string;
    }}) => {
      const response = await api.post<unknown>(`${ACCOUNTING_API}/payables/${payableId}/payments`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payables'] });
      queryClient.invalidateQueries({ queryKey: ['payables-summary'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
    },
  });
}

// ===== 계정과목 목록 조회 =====
export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      try {
        const data = await api.get<Array<{
          id: string;
          code: string;
          name: string;
          type: string;
          isActive: boolean;
          sortOrder: number;
        }>>(`${ACCOUNTING_API}/accounts`);
        return data;
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5분 캐시
  });
}

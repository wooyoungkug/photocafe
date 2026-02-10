import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ===== 타입 정의 =====

export interface PurchaseLedgerItem {
  id: string;
  itemName: string;
  specification?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  purchaseType: string;
  accountCode?: string;
  remark?: string;
}

export interface PurchasePayment {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  bankName?: string;
  accountNumber?: string;
  journalId?: string;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface PurchaseLedger {
  id: string;
  ledgerNumber: string;
  ledgerDate: string;
  confirmDate?: string;
  supplierId: string;
  supplierName: string;
  supplierBizNo?: string;
  purchaseType: string;
  taxType: string;
  accountCode: string;
  supplyAmount: number;
  vatAmount: number;
  adjustmentAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  dueDate?: string;
  purchaseStatus: string;
  description?: string;
  adminMemo?: string;
  createdBy: string;
  confirmedBy?: string;
  confirmedAt?: string;
  items: PurchaseLedgerItem[];
  payments: PurchasePayment[];
  supplier?: {
    id: string;
    clientCode: string;
    clientName: string;
    businessNumber?: string;
    phone?: string;
    email?: string;
    address?: string;
    addressDetail?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseLedgerSummary {
  totalPurchases: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  ledgerCount: number;
  supplierCount: number;
}

export interface CreatePurchaseLedgerDto {
  supplierId: string;
  purchaseType?: string;
  taxType?: string;
  accountCode?: string;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  dueDate?: string;
  description?: string;
  items: Array<{
    itemName: string;
    specification?: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    supplyAmount: number;
    vatAmount: number;
    totalAmount: number;
    purchaseType?: string;
    accountCode?: string;
    remark?: string;
  }>;
}

export interface CreatePurchasePaymentDto {
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  bankName?: string;
  accountNumber?: string;
  note?: string;
}

// ===== 상수 =====

const PURCHASE_LEDGER_API = '/purchase-ledger';

export const PURCHASE_TYPE_OPTIONS = [
  { value: 'RAW_MATERIAL', label: '원재료', color: 'bg-blue-100 text-blue-700' },
  { value: 'MERCHANDISE', label: '상품', color: 'bg-green-100 text-green-700' },
  { value: 'SUPPLIES', label: '저장품/소모품', color: 'bg-teal-100 text-teal-700' },
  { value: 'OUTSOURCING', label: '외주가공', color: 'bg-purple-100 text-purple-700' },
  { value: 'EQUIPMENT', label: '설비/장비', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'SERVICE', label: '용역', color: 'bg-orange-100 text-orange-700' },
  { value: 'OTHER', label: '기타', color: 'bg-gray-100 text-gray-700' },
];

export const PURCHASE_STATUS_OPTIONS = [
  { value: 'REGISTERED', label: '접수', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'CONFIRMED', label: '확정', color: 'bg-green-100 text-green-700' },
  { value: 'CANCELLED', label: '취소', color: 'bg-red-100 text-red-700' },
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'unpaid', label: '미지급', color: 'bg-red-100 text-red-700' },
  { value: 'partial', label: '부분지급', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'paid', label: '지급완료', color: 'bg-green-100 text-green-700' },
  { value: 'overdue', label: '연체', color: 'bg-rose-100 text-rose-700' },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'bank_transfer', label: '계좌이체' },
  { value: 'cash', label: '현금' },
  { value: 'card', label: '카드' },
  { value: 'check', label: '수표' },
  { value: 'prepaid', label: '선불' },
  { value: 'postpaid', label: '후불' },
];

// ===== Hooks =====

// 매입원장 목록 조회
export function usePurchaseLedgers(params?: {
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  purchaseType?: string;
  paymentStatus?: string;
  purchaseStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['purchase-ledgers', params],
    queryFn: async () => {
      const queryParams: Record<string, string | number | boolean | undefined> = {};
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      if (params?.supplierId) queryParams.supplierId = params.supplierId;
      if (params?.purchaseType) queryParams.purchaseType = params.purchaseType;
      if (params?.paymentStatus) queryParams.paymentStatus = params.paymentStatus;
      if (params?.purchaseStatus) queryParams.purchaseStatus = params.purchaseStatus;
      if (params?.search) queryParams.search = params.search;
      if (params?.page) queryParams.page = params.page;
      if (params?.limit) queryParams.limit = params.limit;

      return api.get<{
        data: PurchaseLedger[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>(PURCHASE_LEDGER_API, queryParams);
    },
  });
}

// 매입원장 상세
export function usePurchaseLedger(id: string) {
  return useQuery({
    queryKey: ['purchase-ledger', id],
    queryFn: () => api.get<PurchaseLedger>(`${PURCHASE_LEDGER_API}/${id}`),
    enabled: !!id,
  });
}

// 매입원장 요약 (대시보드)
export function usePurchaseLedgerSummary() {
  return useQuery({
    queryKey: ['purchase-ledger-summary'],
    queryFn: () => api.get<PurchaseLedgerSummary>(`${PURCHASE_LEDGER_API}/summary`),
  });
}

// 매입처별 매입 집계
export function useSupplierPurchaseSummary(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['supplier-purchase-summary', params],
    queryFn: async () => {
      const queryParams: Record<string, string | undefined> = {};
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      return api.get<unknown[]>(`${PURCHASE_LEDGER_API}/supplier-summary`, queryParams);
    },
  });
}

// 매입원장 등록
export function useCreatePurchaseLedger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePurchaseLedgerDto) => {
      return api.post<PurchaseLedger>(PURCHASE_LEDGER_API, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-ledger-summary'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-purchase-summary'] });
    },
  });
}

// 지급 처리
export function useAddPurchasePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ purchaseLedgerId, data }: { purchaseLedgerId: string; data: CreatePurchasePaymentDto }) => {
      return api.post<PurchaseLedger>(`${PURCHASE_LEDGER_API}/${purchaseLedgerId}/payments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-ledger-summary'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-purchase-summary'] });
    },
  });
}

// 매입 확정
export function useConfirmPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (purchaseLedgerId: string) => {
      return api.post<PurchaseLedger>(`${PURCHASE_LEDGER_API}/${purchaseLedgerId}/confirm`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-ledger-summary'] });
    },
  });
}

// 매입 취소
export function useCancelPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (purchaseLedgerId: string) => {
      return api.post<PurchaseLedger>(`${PURCHASE_LEDGER_API}/${purchaseLedgerId}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-ledger-summary'] });
    },
  });
}

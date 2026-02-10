// ===== 매출원장 타입 정의 (더존/SAP 벤치마킹) =====

// 매출유형
export type SalesType = 'ALBUM' | 'PRINT' | 'FRAME' | 'GOODS' | 'BINDING' | 'DESIGN' | 'SHIPPING' | 'OTHER';

// 과세유형
export type TaxType = 'TAXABLE' | 'ZERO_RATED' | 'EXEMPT';

// 매출 인식 상태 (K-IFRS 1115)
export type SalesStatus = 'REGISTERED' | 'CONFIRMED' | 'CANCELLED';

// 결제 상태
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

// 매출원장 라인아이템
export interface SalesLedgerItem {
  id: string;
  salesLedgerId: string;
  orderItemId?: string;
  itemName: string;
  specification?: string;
  quantity: number;
  unitPrice: number;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  salesType: SalesType;
  productId?: string;
  sortOrder: number;
  remark?: string;
}

// 수금 이력
export interface SalesReceipt {
  id: string;
  salesLedgerId: string;
  receiptNumber: string;
  receiptDate: string;
  amount: number;
  paymentMethod: string;
  bankName?: string;
  depositorName?: string;
  journalId?: string;
  note?: string;
  createdBy: string;
  createdAt: string;
}

// 매출원장 엔트리
export interface SalesLedger {
  id: string;
  ledgerNumber: string;
  ledgerDate: string;
  salesDate?: string;

  clientId: string;
  clientName: string;
  clientBizNo?: string;
  client?: {
    id: string;
    clientCode: string;
    clientName: string;
    businessNumber?: string;
    phone?: string;
    email?: string;
    address?: string;
    addressDetail?: string;
  };

  orderId: string;
  orderNumber: string;

  salesType: SalesType;
  taxType: TaxType;

  supplyAmount: number;
  vatAmount: number;
  shippingFee: number;
  adjustmentAmount: number;
  totalAmount: number;

  receivedAmount: number;
  outstandingAmount: number;

  paymentMethod: string;
  paymentStatus: PaymentStatus;
  dueDate?: string;

  salesStatus: SalesStatus;

  description?: string;
  adminMemo?: string;

  createdBy: string;
  confirmedBy?: string;
  confirmedAt?: string;

  items: SalesLedgerItem[];
  receipts: SalesReceipt[];

  createdAt: string;
  updatedAt: string;
}

// 매출원장 요약
export interface SalesLedgerSummary {
  totalSales: number;
  totalReceived: number;
  totalOutstanding: number;
  totalOverdue: number;
  ledgerCount: number;
  clientCount: number;
}

// 거래처별 매출 집계
export interface ClientSalesSummary {
  clientId: string;
  clientName: string;
  clientCode: string;
  totalSales: number;
  totalReceived: number;
  outstanding: number;
  orderCount: number;
  lastOrderDate: string;
}

// 월별 매출 추이
export interface MonthlyTrend {
  month: string;
  sales: number;
  received: number;
  outstanding: number;
  count: number;
}

// 수금 등록 DTO
export interface CreateSalesReceiptDto {
  receiptDate: string;
  amount: number;
  paymentMethod: string;
  bankName?: string;
  depositorName?: string;
  note?: string;
}

// 상수 옵션들
export const SALES_TYPE_OPTIONS = [
  { value: 'ALBUM', label: '앨범' },
  { value: 'PRINT', label: '출력물' },
  { value: 'FRAME', label: '액자' },
  { value: 'GOODS', label: '굿즈' },
  { value: 'BINDING', label: '제본' },
  { value: 'DESIGN', label: '디자인' },
  { value: 'SHIPPING', label: '배송비' },
  { value: 'OTHER', label: '기타' },
] as const;

export const TAX_TYPE_OPTIONS = [
  { value: 'TAXABLE', label: '과세 (10%)' },
  { value: 'ZERO_RATED', label: '영세율' },
  { value: 'EXEMPT', label: '면세' },
] as const;

export const SALES_STATUS_OPTIONS = [
  { value: 'REGISTERED', label: '접수등록', color: 'bg-blue-100 text-blue-800' },
  { value: 'CONFIRMED', label: '매출확정', color: 'bg-green-100 text-green-800' },
  { value: 'CANCELLED', label: '취소', color: 'bg-red-100 text-red-800' },
] as const;

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'unpaid', label: '미수', color: 'bg-orange-100 text-orange-800' },
  { value: 'partial', label: '부분수금', color: 'bg-blue-100 text-blue-800' },
  { value: 'paid', label: '수금완료', color: 'bg-green-100 text-green-800' },
  { value: 'overdue', label: '연체', color: 'bg-red-100 text-red-800' },
] as const;

export const RECEIPT_METHOD_OPTIONS = [
  { value: 'bank_transfer', label: '계좌이체' },
  { value: 'card', label: '카드' },
  { value: 'cash', label: '현금' },
  { value: 'check', label: '수표' },
] as const;

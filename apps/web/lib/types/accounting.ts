// ===== 계정과목 체계 (더존/SERP ERP 벤치마킹) =====

// 계정과목 대분류
export type AccountClass = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

// 계정과목
export interface AccountCode {
  code: string; // 계정코드 (예: 101, 201, 401)
  name: string; // 계정명
  class: AccountClass; // 대분류
  parentCode?: string; // 상위 계정코드
  level: number; // 계층 레벨 (1: 대분류, 2: 중분류, 3: 소분류)
  isActive: boolean;
  description?: string;
}

// 표준 계정과목 (인쇄업 특화)
export const ACCOUNT_CODES: AccountCode[] = [
  // 자산 (1xx)
  { code: '100', name: '자산', class: 'asset', level: 1, isActive: true },
  { code: '101', name: '현금', class: 'asset', parentCode: '100', level: 2, isActive: true },
  { code: '102', name: '보통예금', class: 'asset', parentCode: '100', level: 2, isActive: true },
  { code: '103', name: '당좌예금', class: 'asset', parentCode: '100', level: 2, isActive: true },
  { code: '108', name: '외상매출금', class: 'asset', parentCode: '100', level: 2, isActive: true, description: '미수금' },
  { code: '109', name: '받을어음', class: 'asset', parentCode: '100', level: 2, isActive: true },
  { code: '110', name: '선급금', class: 'asset', parentCode: '100', level: 2, isActive: true },
  { code: '120', name: '재고자산', class: 'asset', parentCode: '100', level: 2, isActive: true },
  { code: '121', name: '원재료(용지)', class: 'asset', parentCode: '120', level: 3, isActive: true },
  { code: '122', name: '원재료(원단)', class: 'asset', parentCode: '120', level: 3, isActive: true },
  { code: '123', name: '부재료', class: 'asset', parentCode: '120', level: 3, isActive: true },

  // 부채 (2xx)
  { code: '200', name: '부채', class: 'liability', level: 1, isActive: true },
  { code: '201', name: '외상매입금', class: 'liability', parentCode: '200', level: 2, isActive: true, description: '미지급금' },
  { code: '202', name: '지급어음', class: 'liability', parentCode: '200', level: 2, isActive: true },
  { code: '203', name: '미지급금', class: 'liability', parentCode: '200', level: 2, isActive: true },
  { code: '204', name: '예수금', class: 'liability', parentCode: '200', level: 2, isActive: true },
  { code: '205', name: '부가세예수금', class: 'liability', parentCode: '200', level: 2, isActive: true },
  { code: '206', name: '선수금', class: 'liability', parentCode: '200', level: 2, isActive: true },

  // 자본 (3xx)
  { code: '300', name: '자본', class: 'equity', level: 1, isActive: true },
  { code: '301', name: '자본금', class: 'equity', parentCode: '300', level: 2, isActive: true },
  { code: '310', name: '이익잉여금', class: 'equity', parentCode: '300', level: 2, isActive: true },

  // 수익 (4xx)
  { code: '400', name: '매출', class: 'revenue', level: 1, isActive: true },
  { code: '401', name: '제품매출', class: 'revenue', parentCode: '400', level: 2, isActive: true },
  { code: '402', name: '포토북매출', class: 'revenue', parentCode: '401', level: 3, isActive: true },
  { code: '403', name: '앨범매출', class: 'revenue', parentCode: '401', level: 3, isActive: true },
  { code: '404', name: '액자매출', class: 'revenue', parentCode: '401', level: 3, isActive: true },
  { code: '405', name: '출력물매출', class: 'revenue', parentCode: '401', level: 3, isActive: true },
  { code: '406', name: '굿즈매출', class: 'revenue', parentCode: '401', level: 3, isActive: true },
  { code: '410', name: '용역매출', class: 'revenue', parentCode: '400', level: 2, isActive: true },
  { code: '420', name: '기타수익', class: 'revenue', parentCode: '400', level: 2, isActive: true },

  // 비용 (5xx)
  { code: '500', name: '매출원가', class: 'expense', level: 1, isActive: true },
  { code: '501', name: '원재료비', class: 'expense', parentCode: '500', level: 2, isActive: true },
  { code: '502', name: '용지비', class: 'expense', parentCode: '501', level: 3, isActive: true },
  { code: '503', name: '원단비', class: 'expense', parentCode: '501', level: 3, isActive: true },
  { code: '504', name: '잉크비', class: 'expense', parentCode: '501', level: 3, isActive: true },
  { code: '510', name: '외주가공비', class: 'expense', parentCode: '500', level: 2, isActive: true },
  { code: '520', name: '노무비', class: 'expense', parentCode: '500', level: 2, isActive: true },

  // 판매관리비 (6xx)
  { code: '600', name: '판매관리비', class: 'expense', level: 1, isActive: true },
  { code: '601', name: '급여', class: 'expense', parentCode: '600', level: 2, isActive: true },
  { code: '602', name: '복리후생비', class: 'expense', parentCode: '600', level: 2, isActive: true },
  { code: '603', name: '임차료', class: 'expense', parentCode: '600', level: 2, isActive: true },
  { code: '604', name: '통신비', class: 'expense', parentCode: '600', level: 2, isActive: true },
  { code: '605', name: '수도광열비', class: 'expense', parentCode: '600', level: 2, isActive: true },
  { code: '606', name: '세금과공과', class: 'expense', parentCode: '600', level: 2, isActive: true },
  { code: '607', name: '감가상각비', class: 'expense', parentCode: '600', level: 2, isActive: true },
  { code: '608', name: '소모품비', class: 'expense', parentCode: '600', level: 2, isActive: true },
  { code: '609', name: '운반비(택배)', class: 'expense', parentCode: '600', level: 2, isActive: true },
  { code: '610', name: '광고선전비', class: 'expense', parentCode: '600', level: 2, isActive: true },
  { code: '611', name: '접대비', class: 'expense', parentCode: '600', level: 2, isActive: true },
  { code: '612', name: '차량유지비', class: 'expense', parentCode: '600', level: 2, isActive: true },
  { code: '620', name: '지급수수료', class: 'expense', parentCode: '600', level: 2, isActive: true },
  { code: '621', name: '카드수수료', class: 'expense', parentCode: '620', level: 3, isActive: true },
  { code: '630', name: '잡손실', class: 'expense', parentCode: '600', level: 2, isActive: true },
];

// 거래 유형
export type TransactionType = 'income' | 'expense' | 'transfer';

// 거래 상태
export type TransactionStatus = 'pending' | 'completed' | 'cancelled';

// 결제 방법
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'check' | 'credit' | 'other';

// 거래 분류
export type TransactionCategory =
  | 'sales' // 매출
  | 'purchase' // 매입
  | 'salary' // 급여
  | 'rent' // 임대료
  | 'utility' // 공과금
  | 'supplies' // 소모품
  | 'equipment' // 장비
  | 'marketing' // 마케팅
  | 'tax' // 세금
  | 'interest' // 이자
  | 'refund' // 환불
  | 'other'; // 기타

// 세금계산서 상태
export type TaxInvoiceStatus = 'draft' | 'issued' | 'cancelled';

// 기본 거래 내역
export interface Transaction {
  id: string;
  transactionCode: string; // 거래번호
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  tax: number; // 부가세
  totalAmount: number; // 합계 (amount + tax)
  description: string;
  transactionDate: string;
  dueDate?: string; // 결제 예정일
  paidDate?: string; // 실제 결제일
  status: TransactionStatus;
  paymentMethod?: PaymentMethod;

  // 관련 정보
  clientId?: string;
  clientName?: string;
  orderId?: string;
  orderCode?: string;

  // 계좌 정보
  accountId?: string;
  accountName?: string;

  // 세금계산서
  taxInvoiceNumber?: string;
  taxInvoiceStatus?: TaxInvoiceStatus;

  memo?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// 매출 내역
export interface SalesRecord extends Transaction {
  type: 'income';
  productItems?: SalesItem[];
}

export interface SalesItem {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  amount: number;
}

// 매입 내역
export interface PurchaseRecord extends Transaction {
  type: 'expense';
  supplierId?: string;
  supplierName?: string;
  purchaseItems?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// 미수금 (받을 돈)
export interface Receivable {
  id: string;
  clientId: string;
  clientName: string;
  clientCode?: string;

  totalAmount: number; // 총 미수금
  paidAmount: number; // 입금액
  remainingAmount: number; // 잔액

  dueDate?: string;
  overdueDays?: number; // 연체일수

  relatedTransactions: Transaction[];
  payments: Payment[];

  status: 'outstanding' | 'partial' | 'paid' | 'overdue';
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

// 미지급금 (줄 돈)
export interface Payable {
  id: string;
  supplierId?: string;
  supplierName: string;
  supplierCode?: string;

  totalAmount: number; // 총 미지급금
  paidAmount: number; // 지급액
  remainingAmount: number; // 잔액

  dueDate?: string;
  overdueDays?: number;

  relatedTransactions: Transaction[];
  payments: Payment[];

  status: 'outstanding' | 'partial' | 'paid' | 'overdue';
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

// 입출금 내역
export interface Payment {
  id: string;
  paymentCode: string;
  type: 'income' | 'expense'; // 입금 / 출금
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;

  // 관련 정보
  clientId?: string;
  clientName?: string;
  supplierId?: string;
  supplierName?: string;
  receivableId?: string;
  payableId?: string;

  // 계좌 정보
  accountId?: string;
  accountName?: string;
  bankName?: string;
  accountNumber?: string;

  description?: string;
  memo?: string;
  createdAt: string;
  createdBy?: string;
}

// 계좌 정보
export interface BankAccount {
  id: string;
  accountName: string; // 계좌 별칭
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  balance: number;
  isDefault: boolean;
  isActive: boolean;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

// 일별/월별 정산
export interface Settlement {
  id: string;
  settlementDate: string;
  periodType: 'daily' | 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;

  // 매출
  totalSales: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  creditSales: number;

  // 매입/비용
  totalExpenses: number;
  purchaseExpenses: number;
  operatingExpenses: number;

  // 입출금
  totalIncome: number; // 실제 입금액
  totalOutcome: number; // 실제 출금액

  // 미수/미지급
  receivablesAmount: number;
  payablesAmount: number;

  // 순이익
  netProfit: number;

  status: 'draft' | 'confirmed' | 'closed';
  confirmedAt?: string;
  confirmedBy?: string;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

// 거래 요약 통계
export interface TransactionSummary {
  totalSales: number;
  totalPurchases: number;
  totalIncome: number;
  totalExpense: number;
  receivablesBalance: number;
  payablesBalance: number;
  netCashFlow: number;
}

// DTO 타입들
export interface CreateTransactionDto {
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  tax?: number;
  description: string;
  transactionDate: string;
  dueDate?: string;
  paymentMethod?: PaymentMethod;
  clientId?: string;
  orderId?: string;
  accountId?: string;
  memo?: string;
}

export interface CreatePaymentDto {
  type: 'income' | 'expense';
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  clientId?: string;
  clientName?: string;
  supplierId?: string;
  supplierName?: string;
  receivableId?: string;
  payableId?: string;
  accountId?: string;
  description?: string;
  memo?: string;
}

// 결제방법 옵션
export const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: '현금' },
  { value: 'card', label: '카드' },
  { value: 'bank_transfer', label: '계좌이체' },
  { value: 'check', label: '수표' },
  { value: 'credit', label: '외상' },
  { value: 'other', label: '기타' },
] as const;

// 거래 분류 옵션
export const TRANSACTION_CATEGORY_OPTIONS = [
  { value: 'sales', label: '매출', type: 'income' },
  { value: 'purchase', label: '매입', type: 'expense' },
  { value: 'salary', label: '급여', type: 'expense' },
  { value: 'rent', label: '임대료', type: 'expense' },
  { value: 'utility', label: '공과금', type: 'expense' },
  { value: 'supplies', label: '소모품', type: 'expense' },
  { value: 'equipment', label: '장비', type: 'expense' },
  { value: 'marketing', label: '마케팅', type: 'expense' },
  { value: 'tax', label: '세금', type: 'expense' },
  { value: 'interest', label: '이자', type: 'both' },
  { value: 'refund', label: '환불', type: 'both' },
  { value: 'other', label: '기타', type: 'both' },
] as const;

// 상태 옵션
export const TRANSACTION_STATUS_OPTIONS = [
  { value: 'pending', label: '대기', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'completed', label: '완료', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: '취소', color: 'bg-red-100 text-red-800' },
] as const;

export const RECEIVABLE_STATUS_OPTIONS = [
  { value: 'outstanding', label: '미수', color: 'bg-orange-100 text-orange-800' },
  { value: 'partial', label: '부분입금', color: 'bg-blue-100 text-blue-800' },
  { value: 'paid', label: '완료', color: 'bg-green-100 text-green-800' },
  { value: 'overdue', label: '연체', color: 'bg-red-100 text-red-800' },
] as const;

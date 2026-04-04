export interface QuotationItem {
  id: string;
  quotationId: string;
  itemName: string;
  specification?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  albumType?: string | null;
  compressedType?: string | null;
  coverType?: string | null;
  coverMaterial?: string | null;
  coverPrice?: number | null;
  printMethod?: string | null;
  pages?: number | null;
  printPrice?: number | null;
  innerPageThickness?: string | null;
  bindingType?: string | null;
  bindingPrice?: number | null;
  paperType?: string | null;
  colorType?: string | null;
  finishing?: string | null;
  memo?: string | null;
  sortOrder: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  title: string;
  quotationType: string;
  subType?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  staffId?: string | null;
  status: string;
  totalAmount: number;
  tax: number;
  finalAmount: number;
  validUntil?: string | null;
  memo?: string | null;
  orderId?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    clientName: string;
    clientCode: string;
    phone?: string;
    email?: string;
  } | null;
  staff?: {
    id: string;
    name: string;
  } | null;
  items?: QuotationItem[];
  _count?: {
    items: number;
  };
}

export interface QuotationQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  quotationType?: string;
  clientId?: string;
  staffId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateQuotationItemDto {
  itemName: string;
  specification?: string;
  quantity: number;
  unitPrice: number;
  albumType?: string;
  compressedType?: string;
  coverType?: string;
  coverMaterial?: string;
  coverPrice?: number;
  printMethod?: string;
  pages?: number;
  printPrice?: number;
  innerPageThickness?: string;
  bindingType?: string;
  bindingPrice?: number;
  paperType?: string;
  colorType?: string;
  finishing?: string;
  memo?: string;
  sortOrder?: number;
}

export interface CreateQuotationDto {
  title: string;
  quotationType: string;
  subType?: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  staffId?: string;
  validUntil?: string;
  memo?: string;
  items?: CreateQuotationItemDto[];
}

export interface UpdateQuotationDto extends Partial<CreateQuotationDto> {
  status?: string;
}

export type QuotationStatus = 'draft' | 'sent' | 'confirmed' | 'rejected' | 'expired' | 'ordered';
export type QuotationType = 'offset_print' | 'digital_print' | 'album' | 'digital_output' | 'single_product';

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: '작성중',
  sent: '발송됨',
  confirmed: '확정',
  rejected: '거절',
  expired: '만료',
  ordered: '주문전환',
};

export const QUOTATION_STATUS_COLORS: Record<QuotationStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-yellow-100 text-yellow-700',
  ordered: 'bg-purple-100 text-purple-700',
};

export const QUOTATION_TYPE_LABELS: Record<QuotationType, string> = {
  offset_print: '인쇄(옵셋)',
  digital_print: '디지털인쇄',
  album: '앨범',
  digital_output: '디지털출력',
  single_product: '단일상품',
};

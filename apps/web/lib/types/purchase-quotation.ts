// 매입처 견적관리 타입

export interface PurchaseQuotationFile {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

export interface PurchaseQuotationStaff {
  id: string;
  name: string;
  staffId: string | null;
}

export interface PurchaseQuotation {
  id: string;
  vendorName: string;
  receivedAt: string; // ISO datetime
  manager: string | null;
  department: string | null;
  title: string | null;
  note: string | null;
  files: PurchaseQuotationFile[];
  staffId: string | null;
  staff: PurchaseQuotationStaff | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseQuotationListResponse {
  data: PurchaseQuotation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PurchaseQuotationQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreatePurchaseQuotationDto {
  vendorName: string;
  receivedAt: string; // YYYY-MM-DD
  manager?: string;
  department?: string;
  title?: string;
  note?: string;
  files?: PurchaseQuotationFile[];
}

export type UpdatePurchaseQuotationDto = Partial<CreatePurchaseQuotationDto>;

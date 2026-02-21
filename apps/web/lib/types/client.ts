// 거래처 그룹
export interface ClientGroup {
  id: string;
  groupCode: string;
  groupName: string;
  branchId: string;
  branch?: {
    id: string;
    branchName: string;
  };
  generalDiscount: number;
  premiumDiscount: number;
  importedDiscount: number;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    clients: number;
  };
}

// 거래처
export interface Client {
  id: string;
  clientCode: string;
  clientName: string;
  businessNumber?: string;
  representative?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  groupId?: string;
  group?: ClientGroup;
  memberType?: 'individual' | 'business';
  shippingType?: 'conditional' | 'free' | 'prepaid' | 'cod';
  freeShippingThreshold?: number;
  creditGrade?: 'A' | 'B' | 'C' | 'D';
  paymentTerms?: number;
  paymentCondition?: '당월말' | '익월말' | '2개월여신';
  creditPaymentDay?: number;
  duplicateCheckMonths?: number;
  fileRetentionMonths?: number;
  assignedManager?: string;
  practicalManagerName?: string;
  practicalManagerPhone?: string;
  approvalManagerName?: string;
  approvalManagerPhone?: string;
  adminMemo?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  assignedStaff?: Array<{
    id: string;
    isPrimary: boolean;
    staff: { id: string; name: string };
  }>;
  _count?: {
    consultations: number;
    openConsultations: number;
  };
}

// 거래처 생성 DTO
export interface CreateClientDto {
  clientCode: string;
  clientName: string;
  businessNumber?: string;
  representative?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  groupId?: string;
  memberType?: 'individual' | 'business';
  shippingType?: string;
  freeShippingThreshold?: number;
  creditGrade?: 'A' | 'B' | 'C' | 'D';
  paymentTerms?: number;
  paymentCondition?: '당월말' | '익월말' | '2개월여신';
  creditPaymentDay?: number;
  assignedManager?: string | null;
  practicalManagerName?: string;
  practicalManagerPhone?: string;
  approvalManagerName?: string;
  approvalManagerPhone?: string;
  adminMemo?: string;
  status?: 'active' | 'inactive' | 'suspended';
  duplicateCheckMonths?: number;
  fileRetentionMonths?: number;
}

// 거래처 수정 DTO
export type UpdateClientDto = Partial<CreateClientDto>;

// 거래처 그룹 생성 DTO
export interface CreateClientGroupDto {
  groupCode: string;
  groupName: string;
  generalDiscount?: number;
  premiumDiscount?: number;
  importedDiscount?: number;
  description?: string;
  isActive?: boolean;
  branchId?: string;
}

// 거래처 그룹 수정 DTO
export type UpdateClientGroupDto = Partial<CreateClientGroupDto>;

// 거래처 앨범 선호 설정
export interface ClientAlbumPreference {
  id: string;
  clientId: string;
  preferredEditStyle?: string;
  preferredBinding?: string;
  preferredAlbumSizes?: { width: number; height: number; label: string }[];
  outfitGrouping?: string;
  colorGroupEnabled: boolean;
  preferredFabricId?: string;
  preferredCoatingId?: string;
  editorNotes?: string;
  specialInstructions?: string;
  totalOrders: number;
  lastOrderDate?: string;
  mostUsedSize?: string;
  averagePageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertClientAlbumPreferenceDto {
  preferredEditStyle?: string;
  preferredBinding?: string;
  preferredAlbumSizes?: { width: number; height: number; label: string }[];
  outfitGrouping?: string;
  colorGroupEnabled?: boolean;
  preferredFabricId?: string;
  preferredCoatingId?: string;
  editorNotes?: string;
  specialInstructions?: string;
}

// 페이지네이션 응답
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 반제품 규격
export interface HalfProductSpecification {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  price: number;
  isDefault: boolean;
  sortOrder: number;
}

// 반제품 가격 단계
export interface HalfProductPriceTier {
  id: string;
  minQuantity: number;
  maxQuantity?: number;
  discountRate: number;
  sortOrder: number;
}

// 반제품 옵션 값
export interface HalfProductOptionValue {
  name: string;
  price: number;
  isDefault?: boolean;
}

// 반제품 옵션
export interface HalfProductOption {
  id: string;
  name: string;
  type: 'select' | 'checkbox';
  values: HalfProductOptionValue[];
  quantityType: 'auto' | 'manual';
  sortOrder: number;
}

// 반제품
export interface HalfProduct {
  id: string;
  code: string;
  name: string;
  categoryLargeId: string;
  categoryLarge?: {
    id: string;
    name: string;
    code: string;
  };
  basePrice: number;
  isPriceAdditive: boolean;
  memberType: 'all' | 'member_only' | 'specific_groups';
  requiredFileCount: number;
  thumbnailUrl?: string;
  detailImages: string[];
  status: 'active' | 'inactive';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;

  // Relations
  specifications?: HalfProductSpecification[];
  priceTiers?: HalfProductPriceTier[];
  options?: HalfProductOption[];

  _count?: {
    specifications: number;
    priceTiers: number;
    options: number;
  };
}

// 반제품 쿼리 파라미터
export interface HalfProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryLargeId?: string;
  status?: 'active' | 'inactive';
}

// 반제품 목록 응답
export interface HalfProductListResponse {
  data: HalfProduct[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 반제품 생성 DTO
export interface CreateHalfProductDto {
  code: string;
  name: string;
  categoryLargeId: string;
  basePrice: number;
  isPriceAdditive?: boolean;
  memberType?: 'all' | 'member_only' | 'specific_groups';
  requiredFileCount?: number;
  thumbnailUrl?: string;
  detailImages?: string[];
  status?: 'active' | 'inactive';
  sortOrder?: number;
  specifications?: Omit<HalfProductSpecification, 'id'>[];
  priceTiers?: Omit<HalfProductPriceTier, 'id'>[];
  options?: Omit<HalfProductOption, 'id'>[];
}

// 반제품 수정 DTO
export type UpdateHalfProductDto = Partial<CreateHalfProductDto>;

// 상품 (간략)
export interface ProductSummary {
  id: string;
  productCode: string;
  productName: string;
  basePrice: number;
  status: string;
  categoryLarge?: {
    id: string;
    name: string;
  };
}

// 반제품 (간략)
export interface HalfProductSummary {
  id: string;
  code: string;
  name: string;
  basePrice: number;
  status: string;
}

// 그룹 가격
export interface GroupProductPrice {
  id: string;
  groupId: string;
  productId: string;
  price: number;
  product?: ProductSummary;
}

export interface GroupHalfProductPrice {
  id: string;
  groupId: string;
  halfProductId: string;
  price: number;
  halfProduct?: HalfProductSummary;
}

// 가격 설정 DTO
export interface SetGroupProductPriceDto {
  groupId: string;
  productId: string;
  price: number;
}

export interface SetGroupHalfProductPriceDto {
  groupId: string;
  halfProductId: string;
  price: number;
}

// 가격 계산 요청
export interface OptionSelection {
  type: 'specification' | 'binding' | 'paper' | 'cover' | 'foil' | 'finishing';
  optionId: string;
}

export interface CalculateProductPriceDto {
  productId: string;
  clientId?: string;
  quantity: number;
  options?: OptionSelection[];
}

export interface CalculateHalfProductPriceDto {
  halfProductId: string;
  clientId?: string;
  quantity: number;
  specificationId?: string;
  optionSelections?: { optionId: string; value: string }[];
}

// 가격 계산 결과
export interface PriceCalculationResult {
  basePrice: number;
  optionPrice: number;
  unitPrice: number;
  quantity: number;
  discountRate: number;
  discountAmount: number;
  finalUnitPrice: number;
  totalPrice: number;
  appliedPolicy?: string;
}

// 가격 우선순위
export type PriceType = 'CLIENT' | 'GROUP' | 'GROUP_DISCOUNT' | 'STANDARD';

// 가격 정보
export interface PriceInfo {
  unitPrice: number;
  priceType: PriceType;
  discountRate?: number;
  amount: number;
}

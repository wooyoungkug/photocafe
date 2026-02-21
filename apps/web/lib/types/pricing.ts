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

// 그룹 생산설정 단가
export interface GroupProductionSettingPrice {
  id: string;
  clientGroupId: string;
  productionSettingId: string;
  specificationId?: string;
  minQuantity?: number;
  maxQuantity?: number;
  weight?: number;
  price: number;
  singleSidedPrice?: number;
  doubleSidedPrice?: number;
  fourColorSinglePrice?: number;
  fourColorDoublePrice?: number;
  sixColorSinglePrice?: number;
  sixColorDoublePrice?: number;
  basePages?: number;
  basePrice?: number;
  pricePerPage?: number;
  rangePrices?: Record<string, number>;
  productionSetting?: {
    id: string;
    codeName?: string;
    settingName?: string;
    pricingType: string;
    printMethod?: string;
  };
}

export interface GroupProductionSettingPriceDto {
  specificationId?: string;
  minQuantity?: number;
  maxQuantity?: number;
  weight?: number;
  price?: number;
  singleSidedPrice?: number;
  doubleSidedPrice?: number;
  fourColorSinglePrice?: number;
  fourColorDoublePrice?: number;
  sixColorSinglePrice?: number;
  sixColorDoublePrice?: number;
  basePages?: number;
  basePrice?: number;
  pricePerPage?: number;
  rangePrices?: Record<string, number>;
}

export interface SetGroupProductionSettingPricesDto {
  clientGroupId: string;
  productionSettingId: string;
  prices: GroupProductionSettingPriceDto[];
}
<<<<<<< Updated upstream

// 거래처 개별 생산설정 단가
export interface ClientProductionSettingPrice {
  id: string;
  clientId: string;
  productionSettingId: string;
  specificationId?: string;
  priceGroupId?: string;
  minQuantity?: number;
  maxQuantity?: number;
  weight?: number;
  price: number;
  singleSidedPrice?: number;
  doubleSidedPrice?: number;
  fourColorSinglePrice?: number;
  fourColorDoublePrice?: number;
  sixColorSinglePrice?: number;
  sixColorDoublePrice?: number;
  basePages?: number;
  basePrice?: number;
  pricePerPage?: number;
  rangePrices?: Record<string, number>;
  productionSetting?: {
    id: string;
    codeName?: string;
    settingName?: string;
    pricingType: string;
    printMethod?: string;
    group?: {
      id: string;
      name: string;
    };
  };
}

export interface ClientProductionSettingPriceDto {
  specificationId?: string;
  priceGroupId?: string;
  minQuantity?: number;
  maxQuantity?: number;
  weight?: number;
  price?: number;
  singleSidedPrice?: number;
  doubleSidedPrice?: number;
  fourColorSinglePrice?: number;
  fourColorDoublePrice?: number;
  sixColorSinglePrice?: number;
  sixColorDoublePrice?: number;
  basePages?: number;
  basePrice?: number;
  pricePerPage?: number;
  rangePrices?: Record<string, number>;
}

export interface SetClientProductionSettingPricesDto {
  clientId: string;
  productionSettingId: string;
  prices: ClientProductionSettingPriceDto[];
}

// 거래처 개별 단가 설정 요약 (마킹용)
export interface ClientProductionSettingSummary {
  productionSettingId: string;
  id: string;
  codeName?: string;
  settingName?: string;
  pricingType: string;
  printMethod?: string;
  group?: {
    id: string;
    name: string;
    parentId?: string;
    parent?: {
      id: string;
      name: string;
    };
  };
}
=======
>>>>>>> Stashed changes

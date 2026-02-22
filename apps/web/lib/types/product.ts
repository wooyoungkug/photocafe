export interface ProductSpecification {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  price: number;
  isDefault: boolean;
  sortOrder: number;
  forIndigo?: boolean;
  forInkjet?: boolean;
  specificationId?: string;
}

export interface ProductBinding {
  id: string;
  name: string;
  price: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface ProductPaper {
  id: string;
  paperId?: string;
  name: string;
  type: 'normal' | 'premium' | 'imported';
  printMethod?: 'indigo' | 'inkjet' | 'offset';
  grammage?: number;
  frontCoating?: string;
  grade?: number;
  price: number;
  isDefault: boolean;
  isActive: boolean;
  isActive4: boolean;
  isActive6: boolean;
  sortOrder: number;
}

export interface ProductCover {
  id: string;
  name: string;
  materialCode?: string;
  price: number;
  imageUrl?: string;
  isDefault: boolean;
  sortOrder: number;
}

export interface ProductFoil {
  id: string;
  name: string;
  color?: string;
  price: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface FinishingSettingPrice {
  id: string;
  specificationId: string | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  price: number;
}

export interface FinishingSetting {
  id: string;
  settingName: string | null;
  codeName: string | null;
  pricingType: string;
  settingFee: number;
  basePrice: number;
  sortOrder: number;
  isActive: boolean;
  prices?: FinishingSettingPrice[];
}

export interface ProductFinishing {
  id: string;
  name: string;
  productionGroupId?: string;
  price: number;
  isDefault: boolean;
  sortOrder: number;
  productionGroup?: {
    id: string;
    name: string;
    settings?: FinishingSetting[];
  };
}

export interface CustomOption {
  id: string;
  name: string;
  type: 'select' | 'checkbox' | 'input';
  values?: Array<{ name: string; price: number; isDefault?: boolean }>;
  price: number;
  isRequired: boolean;
  sortOrder: number;
}

// 공용동판
export interface PublicCopperPlate {
  id: string;
  plateName: string;
  plateCode: string | null;
  plateType: string;
  widthMm: number | null;
  heightMm: number | null;
  storageLocation: string | null;
  imageUrl: string | null;
  aiFileUrl: string | null;
  designFileUrl: string | null;
  description: string | null;
  defaultEngravingText: string | null;
  status: string;
  sortOrder: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// 상품-공용동판 연결
export interface ProductPublicCopperPlate {
  id: string;
  productId: string;
  publicCopperPlateId: string;
  engravingText?: string;
  isDefault: boolean;
  sortOrder: number;
  publicCopperPlate: PublicCopperPlate;
}

export interface Product {
  id: string;
  productCode: string;
  productName: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    level: string;
  };
  isActive: boolean;
  isNew: boolean;
  isBest: boolean;
  memberType: 'all' | 'member_only' | 'specific_groups';
  basePrice: number;
  thumbnailUrl?: string;
  detailImages: string[];
  description?: string;
  sortOrder: number;
  viewCount: number;
  orderCount?: number;
  outputPriceSettings?: any[];
  productType?: string;
  createdAt: string;
  updatedAt: string;

  // Options
  specifications?: ProductSpecification[];
  bindings?: ProductBinding[];
  papers?: ProductPaper[];
  covers?: ProductCover[];
  foils?: ProductFoil[];
  finishings?: ProductFinishing[];
  customOptions?: CustomOption[];
  halfProducts?: Array<{
    halfProduct: {
      id: string;
      code: string;
      name: string;
      basePrice: number;
    };
    isRequired: boolean;
  }>;
  publicCopperPlates?: ProductPublicCopperPlate[];
  fabrics?: Array<{
    fabricId: string;
    sortOrder: number;
    fabric: {
      id: string;
      name: string;
      category: string;
      colorCode?: string | null;
      colorName?: string | null;
      thumbnailUrl?: string | null;
      basePrice?: number;
      isActive: boolean;
    };
  }>;

  _count?: {
    specifications: number;
    bindings: number;
    papers: number;
  };
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  isNew?: boolean;
  isBest?: boolean;
}

export interface ProductListResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateProductSpecificationDto {
  name: string;
  widthMm: number;
  heightMm: number;
  price?: number;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface CreateProductBindingDto {
  name: string;
  price?: number;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface CreateProductPaperDto {
  name: string;
  type: string;
  price?: number;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateProductCoverDto {
  name: string;
  materialCode?: string;
  price?: number;
  imageUrl?: string;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface CreateProductFoilDto {
  name: string;
  color?: string;
  price?: number;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface CreateProductFinishingDto {
  name: string;
  productionGroupId?: string;
  price?: number;
  isDefault?: boolean;
  sortOrder?: number;
}

// 공정 프로세스 템플릿
export interface ProcessTemplateStep {
  stepOrder: number;
  stepCode: string;
  stepName: string;
  stepNameEn?: string;
  department?: string;
  estimatedHours?: number;
  isCheckpoint?: boolean;
  description?: string;
}

// 상품 유형 정보
export interface ProductTypeInfo {
  value: string;
  label: string;
  stepCount: number;
}

// 상품 유형별 옵션 매트릭스
export interface ProductTypeOptions {
  printType: 'single' | 'double' | null;
  bindingDirection: 'left' | 'right' | 'customer' | null;
  specFilterType: 'indigoAlbum' | 'inkjet' | 'frame' | 'booklet' | null;
  defaultBinding: string | null;
  showSpecification: boolean;
  showBinding: boolean;
  showPaper: boolean;
  showCover: boolean;
  showFoil: boolean;
  showFabric: boolean;
  showFinishing: boolean;
  showOutputPrice: boolean;
  showCopperPlate: boolean;
  showBindingDirection: boolean;
  paperPrintMethod: 'indigo' | 'inkjet' | null;
}

export interface CreateProductDto {
  productType?: string;
  productCode: string;
  productName: string;
  categoryId: string;
  basePrice: number;
  isActive?: boolean;
  isNew?: boolean;
  isBest?: boolean;
  memberType?: 'all' | 'member_only' | 'specific_groups';
  thumbnailUrl?: string;
  detailImages?: string[];
  description?: string;
  sortOrder?: number;
  specifications?: CreateProductSpecificationDto[];
  bindings?: CreateProductBindingDto[];
  papers?: CreateProductPaperDto[];
  covers?: CreateProductCoverDto[];
  foils?: CreateProductFoilDto[];
  finishings?: CreateProductFinishingDto[];
  fabricIds?: string[];
}

export type UpdateProductDto = Partial<CreateProductDto>;

export interface ProductSpecification {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  price: number;
  isDefault: boolean;
  sortOrder: number;
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

export interface FinishingSetting {
  id: string;
  settingName: string | null;
  codeName: string | null;
  pricingType: string;
  settingFee: number;
  basePrice: number;
  sortOrder: number;
  isActive: boolean;
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
  outputPriceSettings?: any[];
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

export interface CreateProductDto {
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
}

export type UpdateProductDto = Partial<CreateProductDto>;

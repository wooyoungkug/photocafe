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
  name: string;
  type: 'normal' | 'premium' | 'imported';
  price: number;
  isDefault: boolean;
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

export interface ProductFinishing {
  id: string;
  name: string;
  price: number;
  isDefault: boolean;
  sortOrder: number;
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

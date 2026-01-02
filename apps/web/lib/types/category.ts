export type CategoryLevel = 'large' | 'medium' | 'small';
export type CategoryType = 'HTML' | 'POD' | 'EDITOR' | 'HALF';
export type LoginVisibility = 'always' | 'logged_in' | 'logged_out';
export type ProductionFormType = 'digital_print' | 'output_only' | 'album_only' | 'frame_only' | 'goods_only';
export type PricingUnit = 'paper_based' | 'size_based' | 'per_item';

export interface Category {
  id: string;
  code: string | null;
  name: string;
  level: CategoryLevel;
  depth: number;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  isVisible: boolean;
  isTopMenu: boolean;
  loginVisibility: LoginVisibility;
  categoryType: CategoryType;
  productionForm: ProductionFormType | null;
  isOutsourced: boolean;
  pricingUnit: PricingUnit | null;
  description: string | null;
  linkUrl: string | null;
  htmlContent: string | null;
  createdAt: string;
  updatedAt: string;
  parent?: {
    id: string;
    name: string;
    level: CategoryLevel;
    code: string | null;
  } | null;
  children?: Category[];
  _count?: {
    products: number;
    halfProducts: number;
  };
}

export interface CreateCategoryInput {
  code?: string;
  name: string;
  level: CategoryLevel;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
  isVisible?: boolean;
  isTopMenu?: boolean;
  loginVisibility?: LoginVisibility;
  categoryType?: CategoryType;
  productionForm?: ProductionFormType;
  isOutsourced?: boolean;
  pricingUnit?: PricingUnit;
  description?: string;
  linkUrl?: string;
  htmlContent?: string;
}

export interface UpdateCategoryInput {
  code?: string;
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
  isVisible?: boolean;
  isTopMenu?: boolean;
  loginVisibility?: LoginVisibility;
  categoryType?: CategoryType;
  productionForm?: ProductionFormType | null;
  isOutsourced?: boolean;
  pricingUnit?: PricingUnit | null;
  description?: string | null;
  linkUrl?: string | null;
  htmlContent?: string | null;
}

export interface MoveCategoryInput {
  newParentId?: string | null;
  newSortOrder?: number;
}

export interface VisibilityInput {
  isVisible?: boolean;
  isTopMenu?: boolean;
  loginVisibility?: LoginVisibility;
}

export interface CategoryQueryParams {
  level?: CategoryLevel;
  parentId?: string;
  isActive?: boolean;
  isVisible?: boolean;
  isTopMenu?: boolean;
  categoryType?: CategoryType;
  search?: string;
}

export const CATEGORY_LEVEL_LABELS: Record<CategoryLevel, string> = {
  large: '대분류',
  medium: '중분류',
  small: '소분류',
};

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  HTML: 'HTML',
  POD: 'POD상품',
  EDITOR: '편집상품',
  HALF: '반제품상품',
};

export const LOGIN_VISIBILITY_LABELS: Record<LoginVisibility, string> = {
  always: '항상노출',
  logged_in: '로그인시 노출',
  logged_out: '비로그인시 노출',
};

export const PRODUCTION_FORM_LABELS: Record<ProductionFormType, string> = {
  digital_print: '디지털인쇄',
  output_only: '출력전용',
  album_only: '앨범전용',
  frame_only: '액자전용',
  goods_only: '굿즈전용',
};

export const PRICING_UNIT_LABELS: Record<PricingUnit, string> = {
  paper_based: '용지별출력단가',
  size_based: '규격별출력단가',
  per_item: '권당단가',
};

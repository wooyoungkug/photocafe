export type CategoryLevel = 'large' | 'medium' | 'small';
export type CategoryType = 'HTML' | 'POD' | 'EDITOR' | 'HALF';
export type LoginVisibility = 'always' | 'logged_in' | 'logged_out';
export type ProductionFormType = 'digital_print' | 'compressed_album' | 'photobook' | 'frame' | 'business_card' | 'booklet' | 'poster' | 'menu';
export type PricingUnit = 'paper_based' | 'size_based' | 'per_item';
export type SalesCategory = 'album' | 'print' | 'frame' | 'goods' | 'canvas' | 'calendar' | 'etc';

export interface Category {
  id: string;
  code: string | null;
  name: string;
  nameEn: string | null;
  nameJa: string | null;
  nameZh: string | null;
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
  salesCategoryId: string | null;
  salesCategoryRef?: {
    id: string;
    code: string;
    name: string;
  } | null;
  iconUrl: string | null;
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
  salesCategoryId?: string;
  iconUrl?: string;
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
  salesCategoryId?: string | null;
  iconUrl?: string | null;
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
  digital_print: '디지털출력',
  compressed_album: '압축앨범',
  photobook: '화보',
  frame: '액자',
  business_card: '명함',
  booklet: '책자',
  poster: '포스터',
  menu: '메뉴판',
};

export const PRICING_UNIT_LABELS: Record<PricingUnit, string> = {
  paper_based: '용지별출력단가',
  size_based: '규격별출력단가',
  per_item: '권당단가',
};

export const SALES_CATEGORY_LABELS: Record<SalesCategory, string> = {
  album: '앨범',
  print: '출력물',
  frame: '액자',
  goods: '굿즈',
  canvas: '캔버스',
  calendar: '달력',
  etc: '기타',
};

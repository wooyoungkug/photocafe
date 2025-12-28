export type CategoryLevel = 'large' | 'medium' | 'small';

export interface Category {
  id: string;
  name: string;
  level: CategoryLevel;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: {
    id: string;
    name: string;
    level: CategoryLevel;
  } | null;
  children?: Category[];
  _count?: {
    products: number;
    halfProducts: number;
  };
}

export interface CreateCategoryInput {
  name: string;
  level: CategoryLevel;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CategoryQueryParams {
  level?: CategoryLevel;
  parentId?: string;
  isActive?: boolean;
  search?: string;
}

export const CATEGORY_LEVEL_LABELS: Record<CategoryLevel, string> = {
  large: '대분류',
  medium: '중분류',
  small: '소분류',
};

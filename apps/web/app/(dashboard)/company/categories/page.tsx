"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FolderTree,
  Folder,
  FolderOpen,
  EyeOff,
  Menu,
  ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageHeader } from "@/components/layout/page-header";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useMoveCategoryUp,
  useMoveCategoryDown,
  useMoveCategoryToTop,
} from "@/hooks/use-categories";
import { useSalesCategoryTree } from "@/hooks/use-sales-categories";
import { useToast } from "@/hooks/use-toast";
import type {
  Category,
  CategoryLevel,
  CategoryType,
  LoginVisibility,
  ProductionFormType,
  PricingUnit,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { CATEGORY_LEVEL_LABELS, PRICING_UNIT_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEVEL_COLORS: Record<CategoryLevel, string> = {
  large: "bg-blue-100 text-blue-700 border-blue-200",
  medium: "bg-purple-100 text-purple-700 border-purple-200",
  small: "bg-green-100 text-green-700 border-green-200",
};

const LEVEL_ICONS: Record<CategoryLevel, string> = {
  large: "text-blue-500",
  medium: "text-purple-500",
  small: "text-green-500",
};

const categoryTypeOptions: { value: CategoryType; label: string }[] = [
  { value: "HTML", label: "HTML" },
  { value: "POD", label: "POD상품" },
  { value: "EDITOR", label: "편집상품" },
  { value: "HALF", label: "반제품상품" },
];

const loginVisibilityOptions: { value: LoginVisibility; label: string }[] = [
  { value: "always", label: "항상노출" },
  { value: "logged_in", label: "로그인시 노출" },
  { value: "logged_out", label: "비로그인시 노출" },
];

const productionFormOptions: { value: ProductionFormType; label: string }[] = [
  { value: "digital_print", label: "디지털출력" },
  { value: "compressed_album", label: "압축앨범" },
  { value: "photobook", label: "화보" },
  { value: "frame", label: "액자" },
  { value: "business_card", label: "명함" },
  { value: "booklet", label: "책자" },
  { value: "poster", label: "포스터" },
  { value: "menu", label: "메뉴판" },
];

const pricingUnitOptions: { value: PricingUnit; label: string }[] = [
  { value: "paper_based", label: "용지별출력단가" },
  { value: "size_based", label: "규격별출력단가" },
  { value: "per_item", label: "권당단가" },
];

interface FormData {
  name: string;
  level: CategoryLevel;
  parentId: string;
  sortOrder: number;
  isActive: boolean;
  isVisible: boolean;
  isTopMenu: boolean;
  loginVisibility: LoginVisibility;
  categoryType: CategoryType;
  productionForm: ProductionFormType | "none";
  isOutsourced: boolean;
  pricingUnit: PricingUnit | "none";
  description: string;
  linkUrl: string;
  htmlContent: string;
  salesCategoryId: string;
  iconUrl: string;
}

const defaultFormData: FormData = {
  name: "",
  level: "large",
  parentId: "",
  sortOrder: 0,
  isActive: true,
  isVisible: true,
  isTopMenu: false,
  loginVisibility: "always",
  categoryType: "HTML",
  productionForm: "none",
  isOutsourced: false,
  pricingUnit: "none",
  description: "",
  linkUrl: "",
  htmlContent: "",
  salesCategoryId: "",
  iconUrl: "",
};

export default function CategoriesPage() {
  const { toast } = useToast();
  const { accessToken } = useAuthStore();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [selectedParent, setSelectedParent] = useState<{
    id: string;
    name: string;
    level: CategoryLevel;
  } | null>(null);

  const { data: categories, isLoading, error } = useCategories();
  const { data: salesCategories } = useSalesCategoryTree();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const moveUpMutation = useMoveCategoryUp();
  const moveDownMutation = useMoveCategoryDown();
  const moveToTopMutation = useMoveCategoryToTop();

  const [formData, setFormData] = useState<FormData>(defaultFormData);

  const largeCategories = categories?.filter((c) => c.level === "large") ?? [];

  const getChildCategories = (parentId: string, level: CategoryLevel) => {
    return (
      categories?.filter((c) => c.parentId === parentId && c.level === level) ?? []
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = categories?.map((c) => c.id) ?? [];
    setExpandedIds(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      level: category.level,
      parentId: category.parentId ?? "",
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      isVisible: category.isVisible ?? true,
      isTopMenu: category.isTopMenu ?? false,
      loginVisibility: category.loginVisibility ?? "always",
      categoryType: category.categoryType ?? "HTML",
      productionForm: category.productionForm ?? "none",
      isOutsourced: category.isOutsourced ?? false,
      pricingUnit: category.pricingUnit ?? "none",
      description: category.description ?? "",
      linkUrl: category.linkUrl ?? "",
      htmlContent: category.htmlContent ?? "",
      salesCategoryId: category.salesCategoryId ?? "",
      iconUrl: category.iconUrl ?? "",
    });
  };

  const handleOpenCreateDialog = (parent?: {
    id: string;
    name: string;
    level: CategoryLevel;
  }) => {
    setEditingCategory(null);
    setSelectedParent(parent ?? null);

    let newLevel: CategoryLevel = "large";
    if (parent) {
      if (parent.level === "large") newLevel = "medium";
      else if (parent.level === "medium") newLevel = "small";
    }

    setFormData({
      ...defaultFormData,
      level: newLevel,
      parentId: parent?.id ?? "",
    });
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (category: Category) => {
    setEditingCategory(category);
    setSelectedParent(null);
    setFormData({
      name: category.name,
      level: category.level,
      parentId: category.parentId ?? "",
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      isVisible: category.isVisible ?? true,
      isTopMenu: category.isTopMenu ?? false,
      loginVisibility: category.loginVisibility ?? "always",
      categoryType: category.categoryType ?? "HTML",
      productionForm: category.productionForm ?? "none",
      isOutsourced: category.isOutsourced ?? false,
      pricingUnit: category.pricingUnit ?? "none",
      description: category.description ?? "",
      linkUrl: category.linkUrl ?? "",
      htmlContent: category.htmlContent ?? "",
      salesCategoryId: category.salesCategoryId ?? "",
      iconUrl: category.iconUrl ?? "",
    });
    setDialogOpen(true);
  };

  const handleOpenDeleteDialog = (category: Category) => {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const productionFormValue = formData.productionForm === "none" ? undefined : formData.productionForm;
    const pricingUnitValue = formData.pricingUnit === "none" ? undefined : formData.pricingUnit;
    const salesCategoryIdValue = formData.salesCategoryId || undefined;

    try {
      if (editingCategory) {
        const data: UpdateCategoryInput = {
          name: formData.name,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
          isVisible: formData.isVisible,
          isTopMenu: formData.isTopMenu,
          loginVisibility: formData.loginVisibility,
          categoryType: formData.categoryType,
          productionForm: productionFormValue ?? null,
          isOutsourced: formData.isOutsourced,
          pricingUnit: pricingUnitValue ?? null,
          description: formData.description || null,
          linkUrl: formData.linkUrl || null,
          htmlContent: formData.htmlContent || null,
          salesCategoryId: salesCategoryIdValue ?? null,
          iconUrl: formData.iconUrl || null,
        };
        await updateMutation.mutateAsync({
          id: editingCategory.id,
          data,
        });
        toast({
          variant: "success",
          title: "카테고리 수정 완료",
          description: `${formData.name} 카테고리가 수정되었습니다.`,
        });
      } else {
        const data: CreateCategoryInput = {
          name: formData.name,
          level: formData.level,
          parentId: formData.parentId || undefined,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
          isVisible: formData.isVisible,
          isTopMenu: formData.isTopMenu,
          loginVisibility: formData.loginVisibility,
          categoryType: formData.categoryType,
          productionForm: productionFormValue,
          isOutsourced: formData.isOutsourced,
          pricingUnit: pricingUnitValue,
          description: formData.description || undefined,
          linkUrl: formData.linkUrl || undefined,
          htmlContent: formData.htmlContent || undefined,
          salesCategoryId: salesCategoryIdValue,
          iconUrl: formData.iconUrl || undefined,
        };
        await createMutation.mutateAsync(data);
        toast({
          variant: "success",
          title: "카테고리 추가 완료",
          description: `${formData.name} 카테고리가 추가되었습니다.`,
        });
      }
      setDialogOpen(false);
      setSelectedCategory(null);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "오류 발생",
        description: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory) return;

    const productionFormValue = formData.productionForm === "none" ? null : formData.productionForm;
    const pricingUnitValue = formData.pricingUnit === "none" ? null : formData.pricingUnit;
    const salesCategoryIdValue = formData.salesCategoryId || null;

    try {
      const data: UpdateCategoryInput = {
        name: formData.name,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
        isVisible: formData.isVisible,
        isTopMenu: formData.isTopMenu,
        loginVisibility: formData.loginVisibility,
        categoryType: formData.categoryType,
        productionForm: productionFormValue,
        isOutsourced: formData.isOutsourced,
        pricingUnit: pricingUnitValue,
        description: formData.description || null,
        linkUrl: formData.linkUrl || null,
        htmlContent: formData.htmlContent || null,
        salesCategoryId: salesCategoryIdValue,
        iconUrl: formData.iconUrl || null,
      };
      await updateMutation.mutateAsync({
        id: selectedCategory.id,
        data,
      });
      toast({
        variant: "success",
        title: "카테고리 수정 완료",
        description: `${formData.name} 카테고리가 수정되었습니다.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "오류 발생",
        description: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    try {
      await deleteMutation.mutateAsync(deletingCategory.id);
      toast({
        variant: "success",
        title: "카테고리 삭제 완료",
        description: `${deletingCategory.name} 카테고리가 삭제되었습니다.`,
      });
      setDeleteDialogOpen(false);
      if (selectedCategory?.id === deletingCategory.id) {
        setSelectedCategory(null);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "삭제 실패",
        description: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  };

  const handleMoveUp = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await moveUpMutation.mutateAsync(id);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "이동 실패",
        description: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  };

  const handleMoveDown = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await moveDownMutation.mutateAsync(id);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "이동 실패",
        description: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  };

  const handleMoveToTop = async () => {
    if (!selectedCategory) return;
    try {
      await moveToTopMutation.mutateAsync(selectedCategory.id);
      toast({
        variant: "success",
        title: "이동 완료",
        description: "카테고리가 최상위로 이동되었습니다.",
      });
      setSelectedCategory(null);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "이동 실패",
        description: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  };

  const renderCategory = (
    category: Category,
    level: number,
    childLevel?: CategoryLevel
  ) => {
    const isExpanded = expandedIds.has(category.id);
    const children = childLevel ? getChildCategories(category.id, childLevel) : [];
    const hasChildren = children.length > 0;
    const productCount =
      (category._count?.products ?? 0) + (category._count?.halfProducts ?? 0);
    const isSelected = selectedCategory?.id === category.id;

    return (
      <div key={category.id} className="select-none">
        <div
          className={cn(
            "group flex items-center gap-2 py-2.5 px-3 rounded-lg transition-all duration-200 cursor-pointer",
            "hover:bg-gray-50 border border-transparent hover:border-gray-200",
            level === 1 && "ml-8",
            level === 2 && "ml-16",
            !category.isActive && "opacity-50",
            isSelected && "bg-primary/10 border-primary/30"
          )}
          onClick={() => handleSelectCategory(category)}
        >
          {/* 확장 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(category.id);
            }}
            className={cn(
              "p-1 rounded hover:bg-gray-200 transition-colors",
              !hasChildren && childLevel && "invisible"
            )}
            disabled={!hasChildren && !!childLevel}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {/* 카테고리 아이콘 또는 폴더 아이콘 */}
          {category.iconUrl ? (
            <img
              src={category.iconUrl.startsWith('/api')
                ? `http://localhost:3001${category.iconUrl}`
                : category.iconUrl}
              alt=""
              className="h-5 w-5 object-contain rounded"
            />
          ) : isExpanded ? (
            <FolderOpen className={cn("h-5 w-5", LEVEL_ICONS[category.level])} />
          ) : (
            <Folder className={cn("h-5 w-5", LEVEL_ICONS[category.level])} />
          )}

          {/* 카테고리명 */}
          <span className="flex-1 font-medium text-gray-900">{category.name}</span>

          {/* 상단메뉴 배지 */}
          {category.isTopMenu && (
            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
              <Menu className="h-3 w-3 mr-1" />
              상단메뉴
            </Badge>
          )}

          {/* 가격단위 배지 (반제품일 때만) */}
          {category.categoryType === "HALF" && category.pricingUnit && (
            <Badge variant="outline" className="text-xs bg-teal-50 text-teal-600 border-teal-200">
              {PRICING_UNIT_LABELS[category.pricingUnit]}
            </Badge>
          )}

          {/* 상품 수 */}
          <span className="text-xs text-muted-foreground w-12 text-right">
            {category._count?.halfProducts ?? 0}/{category._count?.products ?? 0}
          </span>

          {/* 노출 상태 */}
          {!category.isVisible && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs text-gray-400">
                  <EyeOff className="h-3 w-3" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>숨김 상태</TooltipContent>
            </Tooltip>
          )}

          {/* 액션 버튼 */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* 하위 카테고리 추가 (대분류, 중분류만) */}
            {category.level !== "small" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-500 hover:text-green-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCreateDialog({
                        id: category.id,
                        name: category.name,
                        level: category.level,
                      });
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {category.level === "large" ? "중분류 추가" : "소분류 추가"}
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-500 hover:text-primary"
                  onClick={(e) => handleMoveUp(category.id, e)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>위로 이동</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-500 hover:text-primary"
                  onClick={(e) => handleMoveDown(category.id, e)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>아래로 이동</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* 하위 카테고리 */}
        {isExpanded && hasChildren && (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-4 w-px bg-gray-200" />
            {children.map((child) =>
              renderCategory(
                child,
                level + 1,
                childLevel === "medium" ? "small" : undefined
              )
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSkeleton = () => (
    <div className="space-y-3 p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 flex-1 max-w-[200px]" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="홈페이지 메뉴관리"
        description="메뉴별 타입을 설정하여 시스템에 적용합니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "회사정보", href: "/company" },
          { label: "카테고리" },
        ]}
        actions={
          <Button onClick={() => handleOpenCreateDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            대분류 추가
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[500px_1fr] gap-6">
        {/* 좌측: 카테고리 트리 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground w-full">
              <span className="col-span-2">분류명</span>
              <span className="text-right">반제품/제품</span>
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[calc(100vh-300px)] overflow-y-auto">
            <div className="flex gap-2 px-4 py-2 border-b">
              <Button variant="outline" size="sm" onClick={expandAll}>
                모두 펼치기
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                모두 접기
              </Button>
            </div>
            {isLoading ? (
              renderSkeleton()
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                데이터를 불러오는데 실패했습니다.
              </div>
            ) : largeCategories.length === 0 ? (
              <EmptyState
                icon={FolderTree}
                title="등록된 카테고리가 없습니다"
                description="상품을 분류하기 위한 카테고리를 추가해보세요."
                action={
                  <Button onClick={() => handleOpenCreateDialog()} className="gap-2">
                    <Plus className="h-4 w-4" />
                    첫 번째 대분류 추가하기
                  </Button>
                }
              />
            ) : (
              <div className="space-y-1 p-2">
                {largeCategories.map((category) =>
                  renderCategory(category, 0, "medium")
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 우측: 카테고리 편집 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-lg font-semibold">카테고리 편집</CardTitle>
            {selectedCategory && selectedCategory.level !== "large" && (
              <Button
                variant="link"
                className="text-red-500 gap-1"
                onClick={handleMoveToTop}
              >
                <ArrowUp className="h-4 w-4" />
                최상위로 이동
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {selectedCategory ? (
              <div className="space-y-6">
                {/* 상단메뉴/숨김 */}
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <Label>카테고리명</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="w-40 space-y-2">
                    <Label>생산폼옵션</Label>
                    <Select
                      value={formData.productionForm}
                      onValueChange={(value) =>
                        setFormData({ ...formData, productionForm: value as ProductionFormType | "none" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">없음</SelectItem>
                        {productionFormOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <Checkbox
                      id="isOutsourced"
                      checked={formData.isOutsourced}
                      onCheckedChange={(checked: boolean | "indeterminate") =>
                        setFormData({ ...formData, isOutsourced: checked === true })
                      }
                    />
                    <Label htmlFor="isOutsourced" className="font-normal">
                      외주생산
                    </Label>
                  </div>
                </div>

                {/* 노출/숨김 */}
                <div className="space-y-2">
                  <Label>노출/숨김</Label>
                  <RadioGroup
                    value={formData.isVisible ? "visible" : "hidden"}
                    onValueChange={(v: string) =>
                      setFormData({ ...formData, isVisible: v === "visible" })
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="visible" id="visible" />
                      <Label htmlFor="visible" className="font-normal">
                        노출
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="hidden" id="hidden" />
                      <Label htmlFor="hidden" className="font-normal">
                        숨김
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* 상단메뉴 */}
                <div className="space-y-2">
                  <Label>상단메뉴</Label>
                  <RadioGroup
                    value={formData.isTopMenu ? "visible" : "hidden"}
                    onValueChange={(v: string) =>
                      setFormData({ ...formData, isTopMenu: v === "visible" })
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="visible" id="topMenuVisible" />
                      <Label htmlFor="topMenuVisible" className="font-normal">
                        노출
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="hidden" id="topMenuHidden" />
                      <Label htmlFor="topMenuHidden" className="font-normal">
                        숨김
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* 로그인메뉴 */}
                <div className="space-y-2">
                  <Label>로그인메뉴</Label>
                  <RadioGroup
                    value={formData.loginVisibility}
                    onValueChange={(v: string) =>
                      setFormData({ ...formData, loginVisibility: v as LoginVisibility })
                    }
                    className="flex gap-4"
                  >
                    {loginVisibilityOptions.map((opt) => (
                      <div key={opt.value} className="flex items-center gap-2">
                        <RadioGroupItem value={opt.value} id={`login-${opt.value}`} />
                        <Label htmlFor={`login-${opt.value}`} className="font-normal">
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* 카테고리타입 */}
                <div className="space-y-2">
                  <Label>카테고리타입</Label>
                  <RadioGroup
                    value={formData.categoryType}
                    onValueChange={(v: string) =>
                      setFormData({ ...formData, categoryType: v as CategoryType })
                    }
                    className="flex gap-4 flex-wrap"
                  >
                    {categoryTypeOptions.map((opt) => (
                      <div key={opt.value} className="flex items-center gap-2">
                        <RadioGroupItem value={opt.value} id={`type-${opt.value}`} />
                        <Label htmlFor={`type-${opt.value}`} className="font-normal">
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* 가격단위 (반제품일 때만 표시) */}
                {formData.categoryType === "HALF" && (
                  <div className="space-y-2">
                    <Label>가격단위</Label>
                    <Select
                      value={formData.pricingUnit}
                      onValueChange={(value) =>
                        setFormData({ ...formData, pricingUnit: value as PricingUnit | "none" })
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="가격단위 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">없음</SelectItem>
                        {pricingUnitOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 설명 */}
                <div className="space-y-2">
                  <Label>설명</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="카테고리 설명 입력"
                  />
                </div>

                {/* 이동경로 (링크) */}
                <div className="space-y-2">
                  <Label>이동경로</Label>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground">- 링크입력 :</span>
                    <Input
                      value={formData.linkUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, linkUrl: e.target.value })
                      }
                      placeholder="링크값이 없으면 자동으로 페이지가 생성됩니다."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setFormData({ ...formData, linkUrl: "" })}
                    >
                      내용삭제
                    </Button>
                  </div>
                  <p className="text-xs text-orange-500">
                    - 링크값이 없으면 자동으로 페이지가 생성됩니다.
                  </p>
                </div>

                {/* HTML 에디터 */}
                <div className="space-y-2">
                  <Label>내용입력 (HTML)</Label>
                  <Textarea
                    value={formData.htmlContent}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData({ ...formData, htmlContent: e.target.value })
                    }
                    placeholder="HTML 내용을 입력하세요..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>

                {/* 매출품목 분류 - 숨김 처리
                <div className="space-y-2">
                  <Label>매출품목 분류</Label>
                  <Select
                    value={formData.salesCategoryId || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, salesCategoryId: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="매출통계 분류 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택안함</SelectItem>
                      {salesCategories?.map((parentCat) => (
                        <div key={parentCat.id}>
                          <SelectItem value={parentCat.id} className="font-medium">
                            {parentCat.name}
                          </SelectItem>
                          {parentCat.children?.map((childCat) => (
                            <SelectItem key={childCat.id} value={childCat.id} className="pl-6">
                              └ {childCat.name}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    매출 통계 집계 시 사용되는 품목 분류입니다.
                  </p>
                </div>
                */}

                {/* 카테고리 아이콘 */}
                <div className="space-y-2">
                  <Label>카테고리 아이콘</Label>
                  <div className="flex gap-3 items-center">
                    {formData.iconUrl && (
                      <img
                        src={formData.iconUrl.startsWith('/api')
                          ? `http://localhost:3001${formData.iconUrl}`
                          : formData.iconUrl}
                        alt="카테고리 아이콘"
                        className="w-12 h-12 object-contain rounded border bg-gray-50"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="block w-full text-sm text-slate-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-indigo-50 file:text-indigo-700
                          hover:file:bg-indigo-100
                          cursor-pointer"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          // 토큰 확인 - 여러 소스에서 토큰 검색
                          let token = accessToken;
                          if (!token) {
                            token = localStorage.getItem('accessToken');
                          }
                          if (!token) {
                            // zustand persist storage에서도 확인
                            try {
                              const authStorage = localStorage.getItem('auth-storage');
                              if (authStorage) {
                                const parsed = JSON.parse(authStorage);
                                token = parsed?.state?.accessToken;
                              }
                            } catch (e) {
                              console.error('Failed to parse auth storage:', e);
                            }
                          }
                          if (!token) {
                            toast({
                              variant: "destructive",
                              title: "인증 필요",
                              description: "로그인이 필요합니다. 다시 로그인해주세요.",
                            });
                            return;
                          }

                          const formDataUpload = new FormData();
                          formDataUpload.append('file', file);

                          try {
                            const response = await fetch('http://localhost:3001/api/v1/upload/category-icon', {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                              },
                              body: formDataUpload,
                            });

                            if (response.status === 401) {
                              toast({
                                variant: "destructive",
                                title: "인증 만료",
                                description: "로그인이 만료되었습니다. 다시 로그인해주세요.",
                              });
                              return;
                            }

                            if (!response.ok) throw new Error('업로드 실패');

                            const result = await response.json();
                            setFormData({ ...formData, iconUrl: result.url });
                            toast({
                              variant: "success",
                              title: "아이콘 업로드 완료",
                              description: "아이콘이 업로드되었습니다.",
                            });
                          } catch (error) {
                            toast({
                              variant: "destructive",
                              title: "업로드 실패",
                              description: "아이콘 업로드에 실패했습니다.",
                            });
                          }
                        }}
                      />
                      {formData.iconUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData({ ...formData, iconUrl: "" })}
                        >
                          아이콘 삭제
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    카테고리 앞에 표시될 작은 이미지입니다. (권장 크기: 48x48px, 최대 5MB)
                  </p>
                </div>

                {/* 버튼 */}
                <div className="flex justify-center gap-2 pt-4">
                  <Button
                    onClick={handleUpdateCategory}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "저장 중..." : "저장하기"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCategory(null)}
                  >
                    취소하기
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleOpenDeleteDialog(selectedCategory)}
                  >
                    삭제하기
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                좌측에서 카테고리를 선택하세요.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>새 카테고리 추가</DialogTitle>
            <DialogDescription>
              {selectedParent
                ? `"${selectedParent.name}" 하위에 새 카테고리를 추가합니다.`
                : "새로운 대분류 카테고리를 추가합니다."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">카테고리명 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="카테고리명을 입력하세요"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>분류 레벨</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value: CategoryLevel) =>
                    setFormData({ ...formData, level: value })
                  }
                  disabled={!!selectedParent}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="large">대분류</SelectItem>
                    <SelectItem value="medium">중분류</SelectItem>
                    <SelectItem value="small">소분류</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>카테고리 타입</Label>
                <Select
                  value={formData.categoryType}
                  onValueChange={(value: CategoryType) =>
                    setFormData({ ...formData, categoryType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedParent && (
              <div className="space-y-2">
                <Label>상위 카테고리</Label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg border">
                  <Folder className={cn("h-4 w-4", LEVEL_ICONS[selectedParent.level])} />
                  <span className="text-sm">{selectedParent.name}</span>
                  <Badge
                    variant="outline"
                    className={cn("text-xs ml-auto", LEVEL_COLORS[selectedParent.level])}
                  >
                    {CATEGORY_LEVEL_LABELS[selectedParent.level]}
                  </Badge>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 py-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  setFormData({ ...formData, isActive: checked === true })
                }
              />
              <Label htmlFor="isActive" className="font-normal">
                활성화 상태
              </Label>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "저장 중..." : "추가하기"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              카테고리 삭제
            </DialogTitle>
            <DialogDescription className="pt-3">
              <strong className="text-gray-900">{deletingCategory?.name}</strong>{" "}
              카테고리를 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            <p>하위 카테고리나 연결된 상품이 있는 경우 삭제할 수 없습니다.</p>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "삭제 중..." : "삭제하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

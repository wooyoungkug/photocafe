"use client";

import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderTree,
  Folder,
  FolderOpen,
  Package,
  GripVertical,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
} from "@/hooks/use-categories";
import { useToast } from "@/hooks/use-toast";
import type { Category, CategoryLevel, CreateCategoryInput } from "@/lib/types";
import { CATEGORY_LEVEL_LABELS } from "@/lib/types";
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

export default function CategoriesPage() {
  const { toast } = useToast();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [selectedParent, setSelectedParent] = useState<{
    id: string;
    name: string;
    level: CategoryLevel;
  } | null>(null);

  const { data: categories, isLoading, error } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [formData, setFormData] = useState({
    name: "",
    level: "large" as CategoryLevel,
    parentId: "",
    sortOrder: 0,
    isActive: true,
  });

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
      name: "",
      level: newLevel,
      parentId: parent?.id ?? "",
      sortOrder: 0,
      isActive: true,
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
    });
    setDialogOpen(true);
  };

  const handleOpenDeleteDialog = (category: Category) => {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({
          id: editingCategory.id,
          data: {
            name: formData.name,
            sortOrder: formData.sortOrder,
            isActive: formData.isActive,
          },
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
        };
        await createMutation.mutateAsync(data);
        toast({
          variant: "success",
          title: "카테고리 추가 완료",
          description: `${formData.name} 카테고리가 추가되었습니다.`,
        });
      }
      setDialogOpen(false);
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
    } catch (err) {
      toast({
        variant: "destructive",
        title: "삭제 실패",
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

    return (
      <div key={category.id} className="select-none">
        <div
          className={cn(
            "group flex items-center gap-2 py-2.5 px-3 rounded-lg transition-all duration-200",
            "hover:bg-gray-50 border border-transparent hover:border-gray-200",
            level === 1 && "ml-8",
            level === 2 && "ml-16",
            !category.isActive && "opacity-50"
          )}
        >
          {/* 확장 버튼 */}
          <button
            onClick={() => toggleExpand(category.id)}
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

          {/* 드래그 핸들 */}
          <GripVertical className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab" />

          {/* 폴더 아이콘 */}
          {isExpanded ? (
            <FolderOpen className={cn("h-5 w-5", LEVEL_ICONS[category.level])} />
          ) : (
            <Folder className={cn("h-5 w-5", LEVEL_ICONS[category.level])} />
          )}

          {/* 카테고리명 */}
          <span className="flex-1 font-medium text-gray-900">{category.name}</span>

          {/* 레벨 배지 */}
          <Badge
            variant="outline"
            className={cn("text-xs font-normal", LEVEL_COLORS[category.level])}
          >
            {CATEGORY_LEVEL_LABELS[category.level]}
          </Badge>

          {/* 상품 수 */}
          {productCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-xs gap-1">
                  <Package className="h-3 w-3" />
                  {productCount}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>연결된 상품 {productCount}개</TooltipContent>
            </Tooltip>
          )}

          {/* 비활성 표시 */}
          {!category.isActive && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs text-gray-400">
                  <EyeOff className="h-3 w-3" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>비활성 상태</TooltipContent>
            </Tooltip>
          )}

          {/* 액션 버튼 */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {childLevel && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-primary"
                    onClick={() =>
                      handleOpenCreateDialog({
                        id: category.id,
                        name: category.name,
                        level: category.level,
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>하위 카테고리 추가</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-primary"
                  onClick={() => handleOpenEditDialog(category)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>수정</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-destructive"
                  onClick={() => handleOpenDeleteDialog(category)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>삭제</TooltipContent>
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
        title="카테고리 관리"
        description="상품 분류를 위한 카테고리를 관리합니다. (대분류 → 중분류 → 소분류)"
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

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">전체 카테고리</p>
                <p className="text-2xl font-bold">{categories?.length ?? 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                <FolderTree className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">대분류</p>
                <p className="text-2xl font-bold text-blue-600">
                  {categories?.filter((c) => c.level === "large").length ?? 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Folder className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">중분류</p>
                <p className="text-2xl font-bold text-purple-600">
                  {categories?.filter((c) => c.level === "medium").length ?? 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Folder className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">소분류</p>
                <p className="text-2xl font-bold text-green-600">
                  {categories?.filter((c) => c.level === "small").length ?? 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Folder className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 카테고리 트리 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg font-semibold">카테고리 목록</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              모두 펼치기
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              모두 접기
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
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
              description="상품을 분류하기 위한 카테고리를 추가해보세요. 대분류 → 중분류 → 소분류 순으로 계층을 구성할 수 있습니다."
              action={
                <Button onClick={() => handleOpenCreateDialog()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  첫 번째 대분류 추가하기
                </Button>
              }
            />
          ) : (
            <div className="space-y-1">
              {largeCategories.map((category) =>
                renderCategory(category, 0, "medium")
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "카테고리 수정" : "새 카테고리 추가"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "카테고리 정보를 수정합니다."
                : selectedParent
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
                className="h-11"
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
                  disabled={!!editingCategory || !!selectedParent}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="large">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        대분류
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        중분류
                      </div>
                    </SelectItem>
                    <SelectItem value="small">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        소분류
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortOrder">정렬 순서</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  min={0}
                  className="h-11"
                />
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
              <button
                type="button"
                role="switch"
                aria-checked={formData.isActive}
                onClick={() =>
                  setFormData({ ...formData, isActive: !formData.isActive })
                }
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  formData.isActive ? "bg-primary" : "bg-gray-200"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    formData.isActive ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
              <Label htmlFor="isActive" className="font-normal cursor-pointer">
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
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "저장 중..."
                  : editingCategory
                  ? "수정하기"
                  : "추가하기"}
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

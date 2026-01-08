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
  Pencil,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageHeader } from "@/components/layout/page-header";
import {
  useSalesCategories,
  useCreateSalesCategory,
  useUpdateSalesCategory,
  useDeleteSalesCategory,
  useMoveSalesCategoryUp,
  useMoveSalesCategoryDown,
  type SalesCategory,
  type CreateSalesCategoryInput,
  type UpdateSalesCategoryInput,
} from "@/hooks/use-sales-categories";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FormData {
  code: string;
  name: string;
  parentId: string;
  sortOrder: number;
  isActive: boolean;
  description: string;
}

const defaultFormData: FormData = {
  code: "",
  name: "",
  parentId: "",
  sortOrder: 0,
  isActive: true,
  description: "",
};

export default function SalesCategoriesPage() {
  const { toast } = useToast();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SalesCategory | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SalesCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<SalesCategory | null>(null);
  const [selectedParent, setSelectedParent] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data: categories, isLoading, error } = useSalesCategories();
  const createMutation = useCreateSalesCategory();
  const updateMutation = useUpdateSalesCategory();
  const deleteMutation = useDeleteSalesCategory();
  const moveUpMutation = useMoveSalesCategoryUp();
  const moveDownMutation = useMoveSalesCategoryDown();

  const [formData, setFormData] = useState<FormData>(defaultFormData);

  const largeCategories = categories?.filter((c) => c.depth === 1) ?? [];

  const getChildCategories = (parentId: string) => {
    return categories?.filter((c) => c.parentId === parentId) ?? [];
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

  const handleSelectCategory = (category: SalesCategory) => {
    setSelectedCategory(category);
    setFormData({
      code: category.code,
      name: category.name,
      parentId: category.parentId ?? "",
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      description: category.description ?? "",
    });
  };

  const handleOpenCreateDialog = (parent?: {
    id: string;
    name: string;
  }) => {
    setEditingCategory(null);
    setSelectedParent(parent ?? null);
    setFormData({
      ...defaultFormData,
      parentId: parent?.id ?? "",
    });
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (category: SalesCategory) => {
    setEditingCategory(category);
    setSelectedParent(null);
    setFormData({
      code: category.code,
      name: category.name,
      parentId: category.parentId ?? "",
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      description: category.description ?? "",
    });
    setDialogOpen(true);
  };

  const handleOpenDeleteDialog = (category: SalesCategory) => {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        const data: UpdateSalesCategoryInput = {
          code: formData.code,
          name: formData.name,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
          description: formData.description || undefined,
        };
        await updateMutation.mutateAsync({
          id: editingCategory.id,
          data,
        });
        toast({
          variant: "success",
          title: "수정 완료",
          description: `${formData.name} 분류가 수정되었습니다.`,
        });
      } else {
        const data: CreateSalesCategoryInput = {
          code: formData.code,
          name: formData.name,
          parentId: formData.parentId || undefined,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
          description: formData.description || undefined,
        };
        await createMutation.mutateAsync(data);
        toast({
          variant: "success",
          title: "추가 완료",
          description: `${formData.name} 분류가 추가되었습니다.`,
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

    try {
      const data: UpdateSalesCategoryInput = {
        code: formData.code,
        name: formData.name,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
        description: formData.description || undefined,
      };
      await updateMutation.mutateAsync({
        id: selectedCategory.id,
        data,
      });
      toast({
        variant: "success",
        title: "수정 완료",
        description: `${formData.name} 분류가 수정되었습니다.`,
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
        title: "삭제 완료",
        description: `${deletingCategory.name} 분류가 삭제되었습니다.`,
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

  const renderCategory = (category: SalesCategory, level: number) => {
    const isExpanded = expandedIds.has(category.id);
    const children = getChildCategories(category.id);
    const hasChildren = children.length > 0;
    const isSelected = selectedCategory?.id === category.id;
    const isLarge = category.depth === 1;

    return (
      <div key={category.id} className="select-none">
        <div
          className={cn(
            "group flex items-center gap-2 py-2.5 px-3 rounded-lg transition-all duration-200 cursor-pointer",
            "hover:bg-gray-50 border border-transparent hover:border-gray-200",
            level === 1 && "ml-8",
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
              !hasChildren && isLarge && "invisible"
            )}
            disabled={!hasChildren}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {/* 분류 코드 */}
          <span className="text-xs text-muted-foreground font-mono w-24">
            {category.code}
          </span>

          {/* 폴더 아이콘 */}
          {isExpanded ? (
            <FolderOpen className={cn("h-5 w-5", isLarge ? "text-blue-500" : "text-purple-500")} />
          ) : (
            <Folder className={cn("h-5 w-5", isLarge ? "text-blue-500" : "text-purple-500")} />
          )}

          {/* 분류명 */}
          <span className="flex-1 font-medium text-gray-900">{category.name}</span>

          {/* 대분류/소분류 배지 */}
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              isLarge
                ? "bg-blue-50 text-blue-600 border-blue-200"
                : "bg-purple-50 text-purple-600 border-purple-200"
            )}
          >
            {isLarge ? "대분류" : "소분류"}
          </Badge>

          {/* 하위 분류 수 */}
          {isLarge && (
            <span className="text-xs text-muted-foreground w-8 text-right">
              {children.length}
            </span>
          )}

          {/* 비활성 상태 */}
          {!category.isActive && (
            <Badge variant="outline" className="text-xs text-gray-400">
              비활성
            </Badge>
          )}

          {/* 액션 버튼 */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* 하위 분류 추가 (대분류만) */}
            {isLarge && (
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
                      });
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>소분류 추가</TooltipContent>
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

        {/* 하위 분류 */}
        {isExpanded && hasChildren && (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-4 w-px bg-gray-200" />
            {children.map((child) => renderCategory(child, level + 1))}
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
        title="매출품목분류 관리"
        description="매출 통계용 품목 분류를 관리합니다. 2단계 계층 구조를 지원합니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "회사정보", href: "/company" },
          { label: "매출품목분류" },
        ]}
        actions={
          <Button onClick={() => handleOpenCreateDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            대분류 추가
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-6">
        {/* 좌측: 분류 트리 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground w-full">
              <span>코드</span>
              <span className="col-span-2">분류명</span>
              <span className="text-right">하위</span>
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
                title="등록된 분류가 없습니다"
                description="매출 통계용 품목 분류를 추가해보세요."
                action={
                  <Button onClick={() => handleOpenCreateDialog()} className="gap-2">
                    <Plus className="h-4 w-4" />
                    첫 번째 대분류 추가하기
                  </Button>
                }
              />
            ) : (
              <div className="space-y-1 p-2">
                {largeCategories.map((category) => renderCategory(category, 0))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 우측: 분류 편집 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-lg font-semibold">분류 편집</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCategory ? (
              <div className="space-y-6">
                {/* 상위 분류 표시 */}
                {selectedCategory.parentId && (
                  <div className="space-y-2">
                    <Label>상위 분류</Label>
                    <Input
                      value={selectedCategory.parent?.name || "-"}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                )}

                {/* 분류 코드 */}
                <div className="space-y-2">
                  <Label>분류 코드 *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="예: album, print, frame"
                  />
                  <p className="text-xs text-muted-foreground">
                    영문 소문자, 숫자, 언더스코어(_)만 사용할 수 있습니다.
                  </p>
                </div>

                {/* 분류명 */}
                <div className="space-y-2">
                  <Label>분류명 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="예: 앨범, 출력물, 액자"
                  />
                </div>

                {/* 정렬 순서 */}
                <div className="space-y-2">
                  <Label>정렬 순서</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>

                {/* 활성화 */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked: boolean | "indeterminate") =>
                      setFormData({ ...formData, isActive: checked === true })
                    }
                  />
                  <Label htmlFor="isActive" className="font-normal">
                    활성화
                  </Label>
                </div>

                {/* 설명 */}
                <div className="space-y-2">
                  <Label>설명</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="분류에 대한 설명을 입력하세요"
                    className="min-h-[100px]"
                  />
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
                좌측에서 분류를 선택하세요.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "분류 수정" : "새 분류 추가"}
            </DialogTitle>
            <DialogDescription>
              {selectedParent
                ? `"${selectedParent.name}" 하위에 새 소분류를 추가합니다.`
                : editingCategory
                  ? "분류 정보를 수정합니다."
                  : "새로운 대분류를 추가합니다."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label htmlFor="code">분류 코드 *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="예: album, print, frame"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                영문 소문자, 숫자, 언더스코어(_)만 사용할 수 있습니다.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">분류명 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="예: 앨범, 출력물, 액자"
                required
              />
            </div>

            {selectedParent && (
              <div className="space-y-2">
                <Label>상위 분류</Label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg border">
                  <Folder className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">{selectedParent.name}</span>
                  <Badge variant="outline" className="text-xs ml-auto bg-blue-50 text-blue-600 border-blue-200">
                    대분류
                  </Badge>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="분류에 대한 설명 (선택사항)"
                className="min-h-[80px]"
              />
            </div>

            <div className="flex items-center gap-3 py-2">
              <Checkbox
                id="isActiveDialog"
                checked={formData.isActive}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  setFormData({ ...formData, isActive: checked === true })
                }
              />
              <Label htmlFor="isActiveDialog" className="font-normal">
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
              분류 삭제
            </DialogTitle>
            <DialogDescription className="pt-3">
              <strong className="text-gray-900">{deletingCategory?.name}</strong>{" "}
              분류를 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            <p>하위 분류가 있는 경우 삭제할 수 없습니다.</p>
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

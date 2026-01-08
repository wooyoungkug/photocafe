"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Settings2,
  ArrowUp,
  ArrowDown,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Ruler,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import {
  useProductionGroupTree,
  useCreateProductionGroup,
  useUpdateProductionGroup,
  useDeleteProductionGroup,
  useMoveProductionGroup,
  useCreateProductionSetting,
  useUpdateProductionSetting,
  useDeleteProductionSetting,
  useMoveProductionSetting,
  usePricingTypes,
  type ProductionGroup,
  type ProductionSetting,
  type PricingType,
} from "@/hooks/use-production";
import { useSpecifications } from "@/hooks/use-specifications";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// 가격 계산 방식 한글 라벨
const PRICING_TYPE_LABELS: Record<PricingType, string> = {
  paper_output: "[1.출력전용] 용지별 출력단가",
  binding_page: "[2.제본전용] 기본단가+page단가",
  finishing_qty: "[3.후가공] 규격별(수량)",
  finishing_page: "[3.후가공] 규격별(페이지당)",
  per_sheet: "장당가격 (규격입력안함)",
};

// 업체 타입 라벨
const VENDOR_TYPE_LABELS: Record<string, string> = {
  in_house: "본사",
  outsourced: "외주",
};

// 숫자 포맷
function formatCurrency(num: number): string {
  return new Intl.NumberFormat("ko-KR").format(num) + "원";
}

// 트리 노드 컴포넌트
function TreeNode({
  group,
  expandedIds,
  toggleExpand,
  selectedGroupId,
  onSelectGroup,
  level = 0,
}: {
  group: ProductionGroup;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  selectedGroupId: string | null;
  onSelectGroup: (group: ProductionGroup) => void;
  level?: number;
}) {
  const isExpanded = expandedIds.has(group.id);
  const hasChildren = group.children && group.children.length > 0;
  const hasSettings = group.settings && group.settings.length > 0;
  const isSelected = selectedGroupId === group.id;
  const isParent = group.depth === 1;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-colors",
          isSelected
            ? "bg-primary/10 border border-primary/30"
            : "hover:bg-muted/50",
          isParent && "font-semibold"
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => onSelectGroup(group)}
      >
        {/* 확장 버튼 */}
        {hasChildren ? (
          <button
            className="p-0.5 rounded hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(group.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* 폴더 아이콘 */}
        {isExpanded ? (
          <FolderOpen
            className={cn(
              "h-4 w-4",
              isParent ? "text-blue-500" : "text-purple-500"
            )}
          />
        ) : (
          <Folder
            className={cn(
              "h-4 w-4",
              isParent ? "text-blue-500" : "text-purple-500"
            )}
          />
        )}

        {/* 코드 */}
        <span className="text-xs text-muted-foreground font-mono w-16">
          {group.code}
        </span>

        {/* 이름 */}
        <span className="flex-1 truncate">{group.name}</span>

        {/* 뱃지 */}
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            isParent
              ? "bg-blue-50 text-blue-600 border-blue-200"
              : "bg-purple-50 text-purple-600 border-purple-200"
          )}
        >
          {isParent ? "대분류" : "소분류"}
        </Badge>

        {/* 설정 카운트 */}
        {hasSettings && (
          <Badge variant="secondary" className="text-xs">
            {group.settings?.length}
          </Badge>
        )}
      </div>

      {/* 하위 그룹 */}
      {isExpanded && hasChildren && (
        <div>
          {group.children?.map((child) => (
            <TreeNode
              key={child.id}
              group={child}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              selectedGroupId={selectedGroupId}
              onSelectGroup={onSelectGroup}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 설정 카드 컴포넌트
function SettingCard({
  setting,
  onEdit,
  onDelete,
  onMove,
}: {
  setting: ProductionSetting;
  onEdit: (setting: ProductionSetting) => void;
  onDelete: (setting: ProductionSetting) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  return (
    <Card className="mb-2">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {setting.codeName || setting.group?.name || "설정"}
              </span>
              <Badge variant="outline" className="text-xs">
                {VENDOR_TYPE_LABELS[setting.vendorType] || setting.vendorType}
              </Badge>
              {setting.settingName && (
                <Badge variant="secondary" className="text-xs">
                  {setting.settingName}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">적용단위:</span>
                <p className="font-medium text-xs mt-0.5">
                  {PRICING_TYPE_LABELS[setting.pricingType] || setting.pricingType}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">잡세팅비:</span>
                <span className="font-mono">{formatCurrency(Number(setting.settingFee))}</span>
              </div>

              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">기본단가:</span>
                <span className="font-mono">{formatCurrency(Number(setting.basePrice))}</span>
              </div>

              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">작업시간:</span>
                <span className="font-mono">{Number(setting.workDays)}일</span>
              </div>
            </div>

            {/* 규격 목록 */}
            {setting.specifications && setting.specifications.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center gap-1 mb-2">
                  <Ruler className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    규격 ({setting.specifications.length}개)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {setting.specifications.slice(0, 10).map((spec) => (
                    <Badge key={spec.id} variant="outline" className="text-xs font-mono">
                      {spec.specification?.name}
                    </Badge>
                  ))}
                  {setting.specifications.length > 10 && (
                    <Badge variant="secondary" className="text-xs">
                      +{setting.specifications.length - 10}개
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-col gap-1 ml-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onMove(setting.id, "up")}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onMove(setting.id, "down")}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(setting)}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(setting)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProductionSettingPage() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<ProductionGroup | null>(null);

  // 다이얼로그 상태
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isSettingDialogOpen, setIsSettingDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProductionGroup | null>(null);
  const [editingSetting, setEditingSetting] = useState<ProductionSetting | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: "group" | "setting"; item: any } | null>(null);
  const [parentGroupId, setParentGroupId] = useState<string | null>(null);

  // 폼 상태
  const [groupForm, setGroupForm] = useState({
    code: "",
    name: "",
  });
  const [settingForm, setSettingForm] = useState({
    codeName: "",
    vendorType: "in_house" as string,
    pricingType: "finishing_page" as PricingType,
    settingName: "",
    sCode: "",
    settingFee: 0,
    basePrice: 0,
    workDays: 0,
    weightInfo: "",
    specificationIds: [] as string[],
  });

  // API 호출
  const { data: groupTree, isLoading: isLoadingGroups } = useProductionGroupTree();
  const { data: specifications } = useSpecifications();
  const { data: pricingTypes } = usePricingTypes();

  const createGroupMutation = useCreateProductionGroup();
  const updateGroupMutation = useUpdateProductionGroup();
  const deleteGroupMutation = useDeleteProductionGroup();
  const moveGroupMutation = useMoveProductionGroup();

  const createSettingMutation = useCreateProductionSetting();
  const updateSettingMutation = useUpdateProductionSetting();
  const deleteSettingMutation = useDeleteProductionSetting();
  const moveSettingMutation = useMoveProductionSetting();

  // 선택된 그룹의 설정 목록
  const selectedSettings = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.settings || [];
  }, [selectedGroup]);

  // 핸들러 함수들
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
    if (groupTree) {
      const allIds = groupTree.map((g) => g.id);
      setExpandedIds(new Set(allIds));
    }
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleSelectGroup = (group: ProductionGroup) => {
    setSelectedGroup(group);
  };

  // 그룹 관련 핸들러
  const handleOpenGroupDialog = (parentId: string | null = null, group?: ProductionGroup) => {
    setParentGroupId(parentId);
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        code: group.code,
        name: group.name,
      });
    } else {
      setEditingGroup(null);
      setGroupForm({
        code: "",
        name: "",
      });
    }
    setIsGroupDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    try {
      if (editingGroup) {
        await updateGroupMutation.mutateAsync({
          id: editingGroup.id,
          ...groupForm,
        });
        toast({ title: "그룹이 수정되었습니다." });
      } else {
        await createGroupMutation.mutateAsync({
          ...groupForm,
          parentId: parentGroupId || undefined,
        });
        toast({ title: "그룹이 생성되었습니다." });
      }
      setIsGroupDialogOpen(false);
    } catch (error: any) {
      toast({ title: "오류 발생", description: error.message || "오류가 발생했습니다.", variant: "destructive" });
    }
  };

  // 설정 관련 핸들러
  const handleOpenSettingDialog = (setting?: ProductionSetting) => {
    if (!selectedGroup) {
      toast({ title: "그룹을 먼저 선택해주세요.", variant: "destructive" });
      return;
    }

    if (setting) {
      setEditingSetting(setting);
      setSettingForm({
        codeName: setting.codeName || "",
        vendorType: setting.vendorType,
        pricingType: setting.pricingType,
        settingName: setting.settingName || "",
        sCode: setting.sCode || "",
        settingFee: Number(setting.settingFee),
        basePrice: Number(setting.basePrice),
        workDays: Number(setting.workDays),
        weightInfo: setting.weightInfo || "",
        specificationIds: setting.specifications?.map((s) => s.specificationId) || [],
      });
    } else {
      setEditingSetting(null);
      setSettingForm({
        codeName: "",
        vendorType: "in_house",
        pricingType: "finishing_page",
        settingName: "",
        sCode: "",
        settingFee: 0,
        basePrice: 0,
        workDays: 0,
        weightInfo: "",
        specificationIds: [],
      });
    }
    setIsSettingDialogOpen(true);
  };

  const handleSaveSetting = async () => {
    try {
      if (editingSetting) {
        await updateSettingMutation.mutateAsync({
          id: editingSetting.id,
          ...settingForm,
        });
        toast({ title: "설정이 수정되었습니다." });
      } else {
        await createSettingMutation.mutateAsync({
          groupId: selectedGroup!.id,
          ...settingForm,
        });
        toast({ title: "설정이 생성되었습니다." });
      }
      setIsSettingDialogOpen(false);
    } catch (error: any) {
      toast({ title: "오류 발생", description: error.message || "오류가 발생했습니다.", variant: "destructive" });
    }
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      if (deletingItem.type === "group") {
        await deleteGroupMutation.mutateAsync(deletingItem.item.id);
        toast({ title: "그룹이 삭제되었습니다." });
        if (selectedGroup?.id === deletingItem.item.id) {
          setSelectedGroup(null);
        }
      } else {
        await deleteSettingMutation.mutateAsync(deletingItem.item.id);
        toast({ title: "설정이 삭제되었습니다." });
      }
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch (error: any) {
      toast({ title: "오류 발생", description: error.message || "오류가 발생했습니다.", variant: "destructive" });
    }
  };

  const handleMoveGroup = (id: string, direction: "up" | "down") => {
    moveGroupMutation.mutate({ id, direction });
  };

  const handleMoveSetting = (id: string, direction: "up" | "down") => {
    moveSettingMutation.mutate({ id, direction });
  };

  // 규격 선택 핸들러
  const handleToggleSpecification = (specId: string) => {
    setSettingForm((prev) => ({
      ...prev,
      specificationIds: prev.specificationIds.includes(specId)
        ? prev.specificationIds.filter((id) => id !== specId)
        : [...prev.specificationIds, specId],
    }));
  };

  const handleSelectAllSpecifications = () => {
    if (specifications) {
      setSettingForm((prev) => ({
        ...prev,
        specificationIds: specifications.map((s) => s.id),
      }));
    }
  };

  const handleDeselectAllSpecifications = () => {
    setSettingForm((prev) => ({
      ...prev,
      specificationIds: [],
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="생산옵션 설정"
        description="세부그룹(생산제품)별 가격 계산 방식, 규격, 작업시간을 설정합니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "가격관리", href: "/pricing" },
          { label: "생산옵션" },
        ]}
        actions={
          <Button onClick={() => handleOpenGroupDialog(null)} className="gap-2">
            <Plus className="h-4 w-4" />
            대분류 추가
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        {/* 좌측: 그룹 트리 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <CardTitle className="text-sm">세부그룹 (생산제품)</CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={expandAll}>
                펼치기
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                접기
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2 max-h-[calc(100vh-280px)] overflow-y-auto">
            {isLoadingGroups ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !groupTree || groupTree.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>등록된 그룹이 없습니다.</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => handleOpenGroupDialog(null)}
                >
                  대분류 추가하기
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {groupTree.map((group) => (
                  <TreeNode
                    key={group.id}
                    group={group}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    selectedGroupId={selectedGroup?.id || null}
                    onSelectGroup={handleSelectGroup}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 우측: 선택된 그룹의 설정 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <div>
              <CardTitle className="text-sm">
                {selectedGroup ? (
                  <>
                    {selectedGroup.name}
                    <span className="text-muted-foreground font-normal ml-2">
                      ({selectedGroup.code})
                    </span>
                  </>
                ) : (
                  "생산설정"
                )}
              </CardTitle>
              {selectedGroup && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedGroup.depth === 1 ? "대분류" : "소분류"} ·{" "}
                  {selectedSettings.length}개 설정
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {selectedGroup && (
                <>
                  {selectedGroup.depth === 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenGroupDialog(selectedGroup.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      소분류 추가
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenGroupDialog(selectedGroup.parentId, selectedGroup)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    그룹 수정
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleOpenSettingDialog()}
                    disabled={selectedGroup.depth === 1}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    설정 추가
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 max-h-[calc(100vh-280px)] overflow-y-auto">
            {!selectedGroup ? (
              <div className="text-center text-muted-foreground py-12">
                <Settings2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>좌측에서 그룹을 선택해주세요.</p>
              </div>
            ) : selectedGroup.depth === 1 ? (
              <div className="text-center text-muted-foreground py-12">
                <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>대분류입니다. 소분류를 추가해주세요.</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => handleOpenGroupDialog(selectedGroup.id)}
                >
                  소분류 추가하기
                </Button>
              </div>
            ) : selectedSettings.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Settings2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>등록된 설정이 없습니다.</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => handleOpenSettingDialog()}
                >
                  설정 추가하기
                </Button>
              </div>
            ) : (
              <div>
                {selectedSettings.map((setting) => (
                  <SettingCard
                    key={setting.id}
                    setting={setting}
                    onEdit={handleOpenSettingDialog}
                    onDelete={(s) => {
                      setDeletingItem({ type: "setting", item: s });
                      setIsDeleteDialogOpen(true);
                    }}
                    onMove={handleMoveSetting}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 그룹 다이얼로그 */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "그룹 수정" : parentGroupId ? "소분류 추가" : "대분류 추가"}
            </DialogTitle>
            <DialogDescription>
              {parentGroupId ? "소분류" : "대분류"} 그룹 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="groupCode">코드</Label>
              <Input
                id="groupCode"
                placeholder={parentGroupId ? "예: 010106" : "예: 0101"}
                value={groupForm.code}
                onChange={(e) =>
                  setGroupForm((prev) => ({ ...prev, code: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupName">그룹명</Label>
              <Input
                id="groupName"
                placeholder="예: 출력전용, 포토북"
                value={groupForm.name}
                onChange={(e) =>
                  setGroupForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSaveGroup}
              disabled={!groupForm.code || !groupForm.name}
            >
              {editingGroup ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 설정 다이얼로그 */}
      <Dialog open={isSettingDialogOpen} onOpenChange={setIsSettingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSetting ? "생산설정 수정" : "생산설정 추가"}
            </DialogTitle>
            <DialogDescription>
              {selectedGroup?.name} - 설정값 수정
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            {/* 좌측 설정 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>그룹명</Label>
                <Input value={selectedGroup?.name || ""} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="codeName">코드명</Label>
                <Input
                  id="codeName"
                  placeholder="코드명 입력"
                  value={settingForm.codeName}
                  onChange={(e) =>
                    setSettingForm((prev) => ({ ...prev, codeName: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>잡세팅비</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={settingForm.settingFee}
                      onChange={(e) =>
                        setSettingForm((prev) => ({
                          ...prev,
                          settingFee: Number(e.target.value),
                        }))
                      }
                    />
                    <span className="text-muted-foreground">원</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>기본단가</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={settingForm.basePrice}
                      onChange={(e) =>
                        setSettingForm((prev) => ({
                          ...prev,
                          basePrice: Number(e.target.value),
                        }))
                      }
                    />
                    <span className="text-muted-foreground">원</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>작업시간</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={settingForm.workDays}
                    onChange={(e) =>
                      setSettingForm((prev) => ({
                        ...prev,
                        workDays: Number(e.target.value),
                      }))
                    }
                    className="w-24"
                  />
                  <span className="text-muted-foreground text-sm">일 (※ 소수점 1자리까지 표현)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>적용단위</Label>
                <Select
                  value={settingForm.pricingType}
                  onValueChange={(value) =>
                    setSettingForm((prev) => ({
                      ...prev,
                      pricingType: value as PricingType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pricingTypes?.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    )) || Object.entries(PRICING_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>세팅명</Label>
                  <Input
                    placeholder="예: 박Color"
                    value={settingForm.settingName}
                    onChange={(e) =>
                      setSettingForm((prev) => ({
                        ...prev,
                        settingName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>업체</Label>
                  <Select
                    value={settingForm.vendorType}
                    onValueChange={(value) =>
                      setSettingForm((prev) => ({ ...prev, vendorType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_house">본사</SelectItem>
                      <SelectItem value="outsourced">외주</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>가중치 구분</Label>
                <Textarea
                  placeholder="가중치 구분을 엔터로 구분하여 입력"
                  value={settingForm.weightInfo}
                  onChange={(e) =>
                    setSettingForm((prev) => ({
                      ...prev,
                      weightInfo: e.target.value,
                    }))
                  }
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  ※ 가중치구분은 엔터로 하세요
                </p>
              </div>
            </div>

            {/* 우측 규격 선택 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>규격선택</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllSpecifications}
                  >
                    전체선택
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAllSpecifications}
                  >
                    전체해제
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
                <div className="grid grid-cols-3 gap-2">
                  {specifications?.map((spec) => (
                    <div key={spec.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`spec-${spec.id}`}
                        checked={settingForm.specificationIds.includes(spec.id)}
                        onCheckedChange={() => handleToggleSpecification(spec.id)}
                      />
                      <Label
                        htmlFor={`spec-${spec.id}`}
                        className="text-sm font-mono cursor-pointer"
                      >
                        {spec.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {(!specifications || specifications.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">
                    등록된 규격이 없습니다.
                  </p>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                선택된 규격: {settingForm.specificationIds.length}개
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveSetting}>
              {editingSetting ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>삭제 확인</DialogTitle>
            <DialogDescription>
              {deletingItem?.type === "group"
                ? `"${deletingItem.item.name}" 그룹을 삭제하시겠습니까?`
                : `이 설정을 삭제하시겠습니까?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

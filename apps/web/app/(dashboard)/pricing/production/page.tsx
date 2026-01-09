`"use client";
`
`import { useState, useMemo } from "react";
`import {
`  Plus,
`  ChevronDown,
`  ChevronRight,
`  Folder,
`  FolderOpen,
`  Settings2,
`  ArrowUp,
`  ArrowDown,
`  Edit,
`  Trash2,
`  Ruler,
`  Printer,
`  Droplets,
`} from "lucide-react";
`import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
`import { Button } from "@/components/ui/button";
`import { Input } from "@/components/ui/input";
`import { Label } from "@/components/ui/label";
`import { Badge } from "@/components/ui/badge";
`import { Skeleton } from "@/components/ui/skeleton";
`import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
`import {
`  Table,
`  TableBody,
`  TableCell,
`  TableHead,
`  TableHeader,
`  TableRow,
`} from "@/components/ui/table";
`import {
`  Dialog,
`  DialogContent,
`  DialogDescription,
`  DialogFooter,
`  DialogHeader,
`  DialogTitle,
`} from "@/components/ui/dialog";
`import {
`  Select,
`  SelectContent,
`  SelectItem,
`  SelectTrigger,
`  SelectValue,
`} from "@/components/ui/select";
`import { Checkbox } from "@/components/ui/checkbox";
`import { Textarea } from "@/components/ui/textarea";
`import { PageHeader } from "@/components/layout/page-header";
`import {
`  useProductionGroupTree,
`  useCreateProductionGroup,
`  useUpdateProductionGroup,
`  useDeleteProductionGroup,
`  useMoveProductionGroup,
`  useCreateProductionSetting,
`  useUpdateProductionSetting,
`  useDeleteProductionSetting,
`  useMoveProductionSetting,
`  usePricingTypes,
`  type ProductionGroup,
`  type ProductionSetting,
`  type PricingType,
`} from "@/hooks/use-production";
`import { useSpecifications, useInkjetSpecifications } from "@/hooks/use-specifications";
`import { usePapersByPrintMethod } from "@/hooks/use-paper";
`import { cn } from "@/lib/utils";
`import { toast } from "@/hooks/use-toast";
`
`// 가격 계산 방식 한글 라벨
`const PRICING_TYPE_LABELS: Record<PricingType, string> = {
`  paper_output: "[1.잉크젯출력] 용지별 출력단가",
`  binding_page: "[2.제본전용] 기본단가+page단가",
`  finishing_qty: "[3.후가공] 규격별(수량)",
`  finishing_page: "[3.후가공] 규격별(페이지당)",
`  per_sheet: "장당가격 (규격입력안함)",
`};
`
`// 업체 타입 라벨
`const VENDOR_TYPE_LABELS: Record<string, string> = {
`  in_house: "본사",
`  outsourced: "외주",
`};
`
`// 숫자 포맷
`function formatCurrency(num: number): string {
`  return new Intl.NumberFormat("ko-KR").format(num) + "원";
`}
`
`// 트리 노드 컴포넌트
`function TreeNode({
`  group,
`  expandedIds,
`  toggleExpand,
`  selectedGroupId,
`  onSelectGroup,
`  onMoveGroup,
`  level = 0,
`}: {
`  group: ProductionGroup;
`  expandedIds: Set<string>;
`  toggleExpand: (id: string) => void;
`  selectedGroupId: string | null;
`  onSelectGroup: (group: ProductionGroup) => void;
`  onMoveGroup: (id: string, direction: "up" | "down") => void;
`  level?: number;
`}) {
`  const isExpanded = expandedIds.has(group.id);
`  const hasChildren = group.children && group.children.length > 0;
`  const hasSettings = group.settings && group.settings.length > 0;
`  const isSelected = selectedGroupId === group.id;
`  const isParent = group.depth === 1;
`  const settingsCount = group.settings?.length || 0;
`
`  return (
`    <div>
`      <div
`        className={cn(
`          "group flex items-center gap-2 py-2.5 px-3 rounded-lg cursor-pointer transition-all",
`          isSelected
`            ? "bg-indigo-50 border border-indigo-200 shadow-sm"
`            : "hover:bg-gray-50 border border-transparent",
`          isParent ? "font-medium" : "font-normal"
`        )}
`        style={{ marginLeft: `${level * 16}px` }}
`        onClick={() => onSelectGroup(group)}
`      >
`        {/* 확장 버튼 */}
`        {hasChildren ? (
`          <button
`            className="p-0.5 rounded hover:bg-gray-200 transition-colors"
`            onClick={(e) => {
`              e.stopPropagation();
`              toggleExpand(group.id);
`            }}
`          >
`            {isExpanded ? (
`              <ChevronDown className="h-4 w-4 text-gray-500" />
`            ) : (
`              <ChevronRight className="h-4 w-4 text-gray-400" />
`            )}
`          </button>
`        ) : (
`          <span className="w-5" />
`        )}
`
`        {/* 폴더 아이콘 */}
`        {isExpanded ? (
`          <FolderOpen
`            className={cn(
`              "h-4 w-4 shrink-0",
`              isParent ? "text-indigo-500" : "text-violet-500"
`            )}
`          />
`        ) : (
`          <Folder
`            className={cn(
`              "h-4 w-4 shrink-0",
`              isParent ? "text-indigo-400" : "text-violet-400"
`            )}
`          />
`        )}
`
`        {/* 이름 */}
`        <span className={cn(
`          "flex-1 truncate",
`          isSelected ? "text-indigo-900" : "text-gray-700"
`        )}>
`          {group.name}
`        </span>
`
`        {/* 설정 카운트 (소분류만) */}
`        {!isParent && settingsCount > 0 && (
`          <span className="text-xs text-gray-400 tabular-nums">
`            {settingsCount}
`          </span>
`        )}
`
`        {/* 대분류/소분류 뱃지 */}
`        <span
`          className={cn(
`            "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
`            isParent
`              ? "bg-indigo-100 text-indigo-600"
`              : "bg-violet-100 text-violet-600"
`          )}
`        >
`          {isParent ? "대분류" : "소분류"}
`        </span>
`
`        {/* 이동 버튼 */}
`        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
`          <button
`            className="p-1 rounded hover:bg-gray-200 transition-colors"
`            onClick={(e) => {
`              e.stopPropagation();
`              onMoveGroup(group.id, "up");
`            }}
`            title="위로 이동"
`          >
`            <ArrowUp className="h-3.5 w-3.5 text-gray-500" />
`          </button>
`          <button
`            className="p-1 rounded hover:bg-gray-200 transition-colors"
`            onClick={(e) => {
`              e.stopPropagation();
`              onMoveGroup(group.id, "down");
`            }}
`            title="아래로 이동"
`          >
`            <ArrowDown className="h-3.5 w-3.5 text-gray-500" />
`          </button>
`        </div>
`      </div>
`
`      {/* 하위 그룹 */}
`      {isExpanded && hasChildren && (
`        <div className="mt-0.5">
`          {group.children?.map((child) => (
`            <TreeNode
`              key={child.id}
`              group={child}
`              expandedIds={expandedIds}
`              toggleExpand={toggleExpand}
`              selectedGroupId={selectedGroupId}
`              onSelectGroup={onSelectGroup}
`              onMoveGroup={onMoveGroup}
`              level={level + 1}
`            />
`          ))}
`        </div>
`      )}
`    </div>
`  );
`}
`
`
`// 설정 카드 컴포넌트
`function SettingCard({
`  setting,
`  onEdit,
`  onDelete,
`  onMove,
`}: {
`  setting: ProductionSetting;
`  onEdit: (setting: ProductionSetting) => void;
`  onDelete: (setting: ProductionSetting) => void;
`  onMove: (id: string, direction: "up" | "down") => void;
`}) {
`  return (
`    <div className="group border rounded-lg p-4 mb-3 bg-white hover:shadow-sm transition-shadow">
`      <div className="flex items-start gap-4">
`        {/* 메인 콘텐츠 */}
`        <div className="flex-1 min-w-0">
`          {/* 헤더 */}
`          <div className="flex items-center gap-2 mb-3">
`            <Settings2 className="h-4 w-4 text-indigo-500 shrink-0" />
`            <span className="font-semibold text-gray-900">
`              {setting.codeName || setting.group?.name || "설정"}
`            </span>
`            <Badge
`              variant="outline"
`              className={cn(
`                "text-xs shrink-0",
`                setting.vendorType === "in_house"
`                  ? "bg-blue-50 text-blue-700 border-blue-200"
`                  : "bg-orange-50 text-orange-700 border-orange-200"
`              )}
`            >
`              {VENDOR_TYPE_LABELS[setting.vendorType] || setting.vendorType}
`            </Badge>
`            {setting.settingName && (
`              <Badge variant="secondary" className="text-xs shrink-0">
`                {setting.settingName}
`              </Badge>
`            )}
`          </div>
`
`          {/* 정보 그리드 */}
`          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm mb-3">
`            <div>
`              <span className="text-gray-500 text-xs block">적용단위</span>
`              <span className="text-gray-900 text-xs font-medium">
`                {PRICING_TYPE_LABELS[setting.pricingType] || setting.pricingType}
`              </span>
`            </div>
`            <div>
`              <span className="text-gray-500 text-xs block">잡세팅비</span>
`              <span className="text-gray-900 font-mono font-medium">
`                {formatCurrency(Number(setting.settingFee))}
`              </span>
`            </div>
`            <div>
`              <span className="text-gray-500 text-xs block">기본단가</span>
`              <span className="text-gray-900 font-mono font-medium">
`                {formatCurrency(Number(setting.basePrice))}
`              </span>
`            </div>
`            <div>
`              <span className="text-gray-500 text-xs block">작업시간</span>
`              <span className="text-gray-900 font-mono font-medium">
`                {Number(setting.workDays)}일
`              </span>
`            </div>
`          </div>
`
`          {/* 규격 목록 */}
`          {setting.specifications && setting.specifications.length > 0 && (
`            <div className="pt-3 border-t border-gray-100">
`              <div className="flex items-center gap-1.5 mb-2">
`                <Ruler className="h-3.5 w-3.5 text-gray-400" />
`                <span className="text-xs text-gray-500 font-medium">
`                  적용 규격 ({setting.specifications.length}개)
`                </span>
`              </div>
`              <div className="flex flex-wrap gap-1.5">
`                {setting.specifications.slice(0, 8).map((spec) => (
`                  <span
`                    key={spec.id}
`                    className="inline-flex px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-700 rounded"
`                  >
`                    {spec.specification?.name}
`                  </span>
`                ))}
`                {setting.specifications.length > 8 && (
`                  <span className="inline-flex px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
`                    +{setting.specifications.length - 8}개
`                  </span>
`                )}
`              </div>
`            </div>
`          )}
`        </div>
`
`        {/* 액션 버튼 */}
`        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
`          <Button
`            variant="ghost"
`            size="icon"
`            className="h-7 w-7 text-gray-400 hover:text-gray-600"
`            onClick={() => onMove(setting.id, "up")}
`          >
`            <ArrowUp className="h-3.5 w-3.5" />
`          </Button>
`          <Button
`            variant="ghost"
`            size="icon"
`            className="h-7 w-7 text-gray-400 hover:text-gray-600"
`            onClick={() => onMove(setting.id, "down")}
`          >
`            <ArrowDown className="h-3.5 w-3.5" />
`          </Button>
`          <Button
`            variant="ghost"
`            size="icon"
`            className="h-7 w-7 text-gray-400 hover:text-indigo-600"
`            onClick={() => onEdit(setting)}
`          >
`            <Edit className="h-3.5 w-3.5" />
`          </Button>
`          <Button
`            variant="ghost"
`            size="icon"
`            className="h-7 w-7 text-gray-400 hover:text-red-600"
`            onClick={() => onDelete(setting)}
`          >
`            <Trash2 className="h-3.5 w-3.5" />
`          </Button>
`        </div>
`      </div>
`    </div>
`  );
`}
`
`// 인디고출력 설정 컴포넌트
`function IndigoOutputSettings() {
`  const { data: indigoPapers, isLoading } = usePapersByPrintMethod('indigo');
`
`  return (
`    <div className="space-y-4">
`      <div className="flex items-center justify-between">
`        <div>
`          <h3 className="text-lg font-semibold flex items-center gap-2">
`            <Printer className="h-5 w-5 text-indigo-600" />
`            인디고출력 설정
`          </h3>
`          <p className="text-sm text-muted-foreground mt-1">
`            인디고전용규격(315×467mm) 1장당 출력비를 용지별로 설정합니다.
`          </p>
`        </div>
`      </div>
`
`      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
`        <p className="text-blue-800">
`          <strong>안내:</strong> 인디고출력 세부 단가는 <strong>표준단가</strong> 또는 <strong>그룹단가</strong> 메뉴에서 설정합니다.
`          여기서는 인디고출력에 사용 가능한 용지 목록만 확인할 수 있습니다.
`        </p>
`      </div>
`
`      <Card>
`        <CardHeader className="py-3 border-b bg-gray-50">
`          <CardTitle className="text-sm">인디고출력 용지 목록</CardTitle>
`        </CardHeader>
`        <CardContent className="p-0">
`          {isLoading ? (
`            <div className="p-4 text-center text-muted-foreground">로딩 중...</div>
`          ) : !indigoPapers?.length ? (
`            <div className="p-8 text-center text-muted-foreground">
`              <Printer className="h-8 w-8 mx-auto mb-2 opacity-50" />
`              <p>인디고출력용 용지가 없습니다.</p>
`              <p className="text-xs mt-1">용지관리에서 인쇄방식이 "인디고출력"인 용지를 등록해주세요.</p>
`            </div>
`          ) : (
`            <Table>
`              <TableHeader>
`                <TableRow className="bg-gray-50">
`                  <TableHead className="w-[200px]">용지명</TableHead>
`                  <TableHead>평량</TableHead>
`                  <TableHead>제지사</TableHead>
`                  <TableHead>규격</TableHead>
`                  <TableHead className="text-center">단면가</TableHead>
`                  <TableHead className="text-center">양면가</TableHead>
`                  <TableHead className="text-center">상태</TableHead>
`                </TableRow>
`              </TableHeader>
`              <TableBody>
`                {indigoPapers.map((paper) => (
`                  <TableRow key={paper.id}>
`                    <TableCell className="font-medium">{paper.name}</TableCell>
`                    <TableCell>{paper.grammage ? `${paper.grammage}g` : '-'}</TableCell>
`                    <TableCell>{paper.manufacturer?.name || '-'}</TableCell>
`                    <TableCell className="text-sm text-gray-600">
`                      인디고전용 (315×467mm)
`                    </TableCell>
`                    <TableCell className="text-center">
`                      <span className="text-gray-400 text-sm">표준단가에서 설정</span>
`                    </TableCell>
`                    <TableCell className="text-center">
`                      <span className="text-gray-400 text-sm">표준단가에서 설정</span>
`                    </TableCell>
`                    <TableCell className="text-center">
`                      <Badge variant={paper.isActive ? 'default' : 'outline'} className="text-xs">
`                        {paper.isActive ? '활성' : '비활성'}
`                      </Badge>
`                    </TableCell>
`                  </TableRow>
`                ))}
`              </TableBody>
`            </Table>
`          )}
`        </CardContent>
`      </Card>
`    </div>
`  );
`}
`
`// 잉크젯출력 설정 컴포넌트
`function InkjetOutputSettings() {
`  const { data: inkjetPapers, isLoading: papersLoading } = usePapersByPrintMethod('inkjet');
`  const { data: inkjetSpecs, isLoading: specsLoading } = useInkjetSpecifications();
`
`  // 규격 분류
`  const specsByType = useMemo(() => {
`    if (!inkjetSpecs) return { inkjet: [], album: [], frame: [] };
`    return {
`      inkjet: inkjetSpecs.filter(s => s.forInkjet),
`      album: inkjetSpecs.filter(s => s.forAlbum),
`      frame: inkjetSpecs.filter(s => s.forFrame),
`    };
`  }, [inkjetSpecs]);
`
`  return (
`    <div className="space-y-4">
`      <div className="flex items-center justify-between">
`        <div>
`          <h3 className="text-lg font-semibold flex items-center gap-2">
`            <Droplets className="h-5 w-5 text-cyan-600" />
`            잉크젯출력 설정
`          </h3>
`          <p className="text-sm text-muted-foreground mt-1">
`            잉크젯 용지 + 규격(잉크젯출력/앨범전용/액자전용) 조합별 단면 출력가를 설정합니다.
`          </p>
`        </div>
`      </div>
`
`      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-sm">
`        <p className="text-cyan-800">
`          <strong>안내:</strong> 잉크젯출력 세부 단가는 <strong>표준단가</strong> 또는 <strong>그룹단가</strong> 메뉴에서 설정합니다.
`          여기서는 잉크젯출력에 사용 가능한 용지와 규격 목록만 확인할 수 있습니다.
`        </p>
`      </div>
`
`      <div className="grid grid-cols-2 gap-6">
`        {/* 잉크젯 용지 목록 */}
`        <Card>
`          <CardHeader className="py-3 border-b bg-gray-50">
`            <CardTitle className="text-sm">잉크젯출력 용지 ({inkjetPapers?.length || 0}개)</CardTitle>
`          </CardHeader>
`          <CardContent className="p-0 max-h-[400px] overflow-y-auto">
`            {papersLoading ? (
`              <div className="p-4 text-center text-muted-foreground">로딩 중...</div>
`            ) : !inkjetPapers?.length ? (
`              <div className="p-8 text-center text-muted-foreground">
`                <Droplets className="h-8 w-8 mx-auto mb-2 opacity-50" />
`                <p>잉크젯출력용 용지가 없습니다.</p>
`                <p className="text-xs mt-1">용지관리에서 인쇄방식이 "잉크젯출력"인 용지를 등록해주세요.</p>
`              </div>
`            ) : (
`              <Table>
`                <TableHeader>
`                  <TableRow className="bg-gray-50">
`                    <TableHead>용지명</TableHead>
`                    <TableHead>평량</TableHead>
`                    <TableHead className="text-center">상태</TableHead>
`                  </TableRow>
`                </TableHeader>
`                <TableBody>
`                  {inkjetPapers.map((paper) => (
`                    <TableRow key={paper.id}>
`                      <TableCell className="font-medium">{paper.name}</TableCell>
`                      <TableCell>{paper.grammage ? `${paper.grammage}g` : '-'}</TableCell>
`                      <TableCell className="text-center">
`                        <Badge variant={paper.isActive ? 'default' : 'outline'} className="text-xs">
`                          {paper.isActive ? '활성' : '비활성'}
`                        </Badge>
`                      </TableCell>
`                    </TableRow>
`                  ))}
`                </TableBody>
`              </Table>
`            )}
`          </CardContent>
`        </Card>
`
`        {/* 규격 목록 */}
`        <Card>
`          <CardHeader className="py-3 border-b bg-gray-50">
`            <CardTitle className="text-sm">출력 규격 ({inkjetSpecs?.length || 0}개)</CardTitle>
`          </CardHeader>
`          <CardContent className="p-4 max-h-[400px] overflow-y-auto">
`            {specsLoading ? (
`              <div className="text-center text-muted-foreground">로딩 중...</div>
`            ) : !inkjetSpecs?.length ? (
`              <div className="text-center text-muted-foreground py-4">
`                <Ruler className="h-8 w-8 mx-auto mb-2 opacity-50" />
`                <p>출력용 규격이 없습니다.</p>
`              </div>
`            ) : (
`              <div className="space-y-4">
`                {/* 잉크젯출력 */}
`                {specsByType.inkjet.length > 0 && (
`                  <div>
`                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
`                      <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">잉크젯출력</Badge>
`                      {specsByType.inkjet.length}개
`                    </h4>
`                    <div className="flex flex-wrap gap-1.5">
`                      {specsByType.inkjet.map(spec => (
`                        <span key={spec.id} className="px-2 py-1 text-xs font-mono bg-cyan-50 text-cyan-800 rounded border border-cyan-200">
`                          {spec.name}
`                        </span>
`                      ))}
`                    </div>
`                  </div>
`                )}
`
`                {/* 앨범전용 */}
`                {specsByType.album.length > 0 && (
`                  <div>
`                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
`                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">앨범전용</Badge>
`                      {specsByType.album.length}개
`                    </h4>
`                    <div className="flex flex-wrap gap-1.5">
`                      {specsByType.album.map(spec => (
`                        <span key={spec.id} className="px-2 py-1 text-xs font-mono bg-purple-50 text-purple-800 rounded border border-purple-200">
`                          {spec.name}
`                        </span>
`                      ))}
`                    </div>
`                  </div>
`                )}
`
`                {/* 액자전용 */}
`                {specsByType.frame.length > 0 && (
`                  <div>
`                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
`                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">액자전용</Badge>
`                      {specsByType.frame.length}개
`                    </h4>
`                    <div className="flex flex-wrap gap-1.5">
`                      {specsByType.frame.map(spec => (
`                        <span key={spec.id} className="px-2 py-1 text-xs font-mono bg-orange-50 text-orange-800 rounded border border-orange-200">
`                          {spec.name}
`                        </span>
`                      ))}
`                    </div>
`                  </div>
`                )}
`              </div>
`            )}
`          </CardContent>
`        </Card>
`      </div>
`    </div>
`  );
`}
`
`export default function ProductionSettingPage() {
`  const [activeTab, setActiveTab] = useState('production');
`  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
`  const [selectedGroup, setSelectedGroup] = useState<ProductionGroup | null>(null);
`
`  // 다이얼로그 상태
`  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
`  const [isSettingDialogOpen, setIsSettingDialogOpen] = useState(false);
`  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
`  const [editingGroup, setEditingGroup] = useState<ProductionGroup | null>(null);
`  const [editingSetting, setEditingSetting] = useState<ProductionSetting | null>(null);
`  const [deletingItem, setDeletingItem] = useState<{ type: "group" | "setting"; item: any } | null>(null);
`  const [parentGroupId, setParentGroupId] = useState<string | null>(null);
`
`  // 폼 상태
`  const [groupForm, setGroupForm] = useState({
`    code: "",
`    name: "",
`  });
`  const [settingForm, setSettingForm] = useState({
`    codeName: "",
`    vendorType: "in_house" as string,
`    pricingType: "finishing_page" as PricingType,
`    settingName: "",
`    sCode: "",
`    settingFee: 0,
`    basePrice: 0,
`    workDays: 0,
`    weightInfo: "",
`    specificationIds: [] as string[],
`  });
`
`  // API 호출
`  const { data: groupTree, isLoading: isLoadingGroups } = useProductionGroupTree();
`  const { data: specifications } = useSpecifications();
`  const { data: pricingTypes } = usePricingTypes();
`
`  const createGroupMutation = useCreateProductionGroup();
`  const updateGroupMutation = useUpdateProductionGroup();
`  const deleteGroupMutation = useDeleteProductionGroup();
`  const moveGroupMutation = useMoveProductionGroup();
`
`  const createSettingMutation = useCreateProductionSetting();
`  const updateSettingMutation = useUpdateProductionSetting();
`  const deleteSettingMutation = useDeleteProductionSetting();
`  const moveSettingMutation = useMoveProductionSetting();
`
`  // 선택된 그룹의 설정 목록
`  const selectedSettings = useMemo(() => {
`    if (!selectedGroup) return [];
`    return selectedGroup.settings || [];
`  }, [selectedGroup]);
`
`  // 핸들러 함수들
`  const toggleExpand = (id: string) => {
`    setExpandedIds((prev) => {
`      const next = new Set(prev);
`      if (next.has(id)) {
`        next.delete(id);
`      } else {
`        next.add(id);
`      }
`      return next;
`    });
`  };
`
`  const expandAll = () => {
`    if (groupTree) {
`      const allIds = groupTree.map((g) => g.id);
`      setExpandedIds(new Set(allIds));
`    }
`  };
`
`  const collapseAll = () => {
`    setExpandedIds(new Set());
`  };
`
`  const handleSelectGroup = (group: ProductionGroup) => {
`    setSelectedGroup(group);
`  };
`
`  // 그룹 관련 핸들러
`  const handleOpenGroupDialog = (parentId: string | null = null, group?: ProductionGroup) => {
`    setParentGroupId(parentId);
`    if (group) {
`      setEditingGroup(group);
`      setGroupForm({
`        code: group.code,
`        name: group.name,
`      });
`    } else {
`      setEditingGroup(null);
`      setGroupForm({
`        code: "",
`        name: "",
`      });
`    }
`    setIsGroupDialogOpen(true);
`  };
`
`  const handleSaveGroup = async () => {
`    try {
`      if (editingGroup) {
`        await updateGroupMutation.mutateAsync({
`          id: editingGroup.id,
`          ...groupForm,
`        });
`        toast({ title: "그룹이 수정되었습니다." });
`      } else {
`        await createGroupMutation.mutateAsync({
`          ...groupForm,
`          parentId: parentGroupId || undefined,
`        });
`        toast({ title: "그룹이 생성되었습니다." });
`      }
`      setIsGroupDialogOpen(false);
`    } catch (error: any) {
`      toast({ title: "오류 발생", description: error.message || "오류가 발생했습니다.", variant: "destructive" });
`    }
`  };
`
`  // 설정 관련 핸들러
`  const handleOpenSettingDialog = (setting?: ProductionSetting) => {
`    if (!selectedGroup) {
`      toast({ title: "그룹을 먼저 선택해주세요.", variant: "destructive" });
`      return;
`    }
`
`    if (setting) {
`      setEditingSetting(setting);
`      setSettingForm({
`        codeName: setting.codeName || "",
`        vendorType: setting.vendorType,
`        pricingType: setting.pricingType,
`        settingName: setting.settingName || "",
`        sCode: setting.sCode || "",
`        settingFee: Number(setting.settingFee),
`        basePrice: Number(setting.basePrice),
`        workDays: Number(setting.workDays),
`        weightInfo: setting.weightInfo || "",
`        specificationIds: setting.specifications?.map((s) => s.specificationId) || [],
`      });
`    } else {
`      setEditingSetting(null);
`      // 코드명 자동 생성: 그룹코드_순번
`      const nextNumber = (selectedGroup?.settings?.length || 0) + 1;
`      const autoCodeName = `${selectedGroup?.code || 'SET'}_${String(nextNumber).padStart(3, '0')}`;
`      setSettingForm({
`        codeName: autoCodeName,
`        vendorType: "in_house",
`        pricingType: "finishing_page",
`        settingName: "",
`        sCode: "",
`        settingFee: 0,
`        basePrice: 0,
`        workDays: 0,
`        weightInfo: "",
`        specificationIds: [],
`      });
`    }
`    setIsSettingDialogOpen(true);
`  };
`
`  const handleSaveSetting = async () => {
`    try {
`      if (editingSetting) {
`        await updateSettingMutation.mutateAsync({
`          id: editingSetting.id,
`          ...settingForm,
`        });
`        toast({ title: "설정이 수정되었습니다." });
`      } else {
`        await createSettingMutation.mutateAsync({
`          groupId: selectedGroup!.id,
`          ...settingForm,
`        });
`        toast({ title: "설정이 생성되었습니다." });
`      }
`      setIsSettingDialogOpen(false);
`    } catch (error: any) {
`      toast({ title: "오류 발생", description: error.message || "오류가 발생했습니다.", variant: "destructive" });
`    }
`  };
`
`  // 삭제 핸들러
`  const handleDelete = async () => {
`    if (!deletingItem) return;
`
`    try {
`      if (deletingItem.type === "group") {
`        await deleteGroupMutation.mutateAsync(deletingItem.item.id);
`        toast({ title: "그룹이 삭제되었습니다." });
`        if (selectedGroup?.id === deletingItem.item.id) {
`          setSelectedGroup(null);
`        }
`      } else {
`        await deleteSettingMutation.mutateAsync(deletingItem.item.id);
`        toast({ title: "설정이 삭제되었습니다." });
`      }
`      setIsDeleteDialogOpen(false);
`      setDeletingItem(null);
`    } catch (error: any) {
`      toast({ title: "오류 발생", description: error.message || "오류가 발생했습니다.", variant: "destructive" });
`    }
`  };
`
`  const handleMoveGroup = (id: string, direction: "up" | "down") => {
`    moveGroupMutation.mutate({ id, direction });
`  };
`
`  const handleMoveSetting = (id: string, direction: "up" | "down") => {
`    moveSettingMutation.mutate({ id, direction });
`  };
`
`  // 규격 선택 핸들러
`  const handleToggleSpecification = (specId: string) => {
`    setSettingForm((prev) => ({
`      ...prev,
`      specificationIds: prev.specificationIds.includes(specId)
`        ? prev.specificationIds.filter((id) => id !== specId)
`        : [...prev.specificationIds, specId],
`    }));
`  };
`
`  const handleSelectAllSpecifications = () => {
`    if (specifications) {
`      setSettingForm((prev) => ({
`        ...prev,
`        specificationIds: specifications.filter((spec) => { if (settingForm.pricingType === "paper_output") return spec.forInkjet; if (settingForm.pricingType === "binding_page") return spec.forAlbum; if (settingForm.pricingType === "per_sheet") return false; return true; }).map((s) => s.id),
`      }));
`    }
`  };
`
`  const handleDeselectAllSpecifications = () => {
`    setSettingForm((prev) => ({
`      ...prev,
`      specificationIds: [],
`    }));
`  };
`
`  return (
`    <div className="space-y-6">
`      <PageHeader
`        title="생산옵션 설정"
`        description="세부그룹(생산제품)별 가격 계산 방식, 규격, 작업시간을 설정합니다."
`        breadcrumbs={[
`          { label: "홈", href: "/" },
`          { label: "가격관리", href: "/pricing" },
`          { label: "생산옵션" },
`        ]}
`      />
`
`      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
`        <TabsList className="mb-4">
`          <TabsTrigger value="production" className="gap-2">
`            <Settings2 className="h-4 w-4" />
`            생산그룹 설정
`          </TabsTrigger>
`          <TabsTrigger value="indigo" className="gap-2">
`            <Printer className="h-4 w-4" />
`            인디고출력
`          </TabsTrigger>
`          <TabsTrigger value="inkjet" className="gap-2">
`            <Droplets className="h-4 w-4" />
`            잉크젯출력
`          </TabsTrigger>
`        </TabsList>
`
`        <TabsContent value="production" className="space-y-4">
`          <div className="flex justify-end">
`            <Button onClick={() => handleOpenGroupDialog(null)} className="gap-2">
`              <Plus className="h-4 w-4" />
`              대분류 추가
`            </Button>
`          </div>
`
`          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
`            {/* 좌측: 그룹 트리 */}
`            <Card className="flex flex-col">
`              <CardHeader className="border-b bg-gray-50/50 py-3 px-4">
`                <div className="flex items-center justify-between">
`                  <CardTitle className="text-sm font-semibold text-gray-700">
`                    세부그룹 (생산제품)
`                  </CardTitle>
`                  <div className="flex gap-1">
`                    <Button
`                      variant="ghost"
`                      size="sm"
`                      className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
`                      onClick={expandAll}
`                    >
`                      펼치기
`                    </Button>
`                    <Button
`                      variant="ghost"
`                      size="sm"
`                      className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
`                      onClick={collapseAll}
`                    >
`                      접기
`                    </Button>
`                  </div>
`                </div>
`              </CardHeader>
`              <CardContent className="p-2 flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
`                {isLoadingGroups ? (
`                  <div className="space-y-2 p-4">
`                    {[1, 2, 3].map((i) => (
`                      <Skeleton key={i} className="h-10 w-full" />
`                    ))}
`                  </div>
`                ) : !groupTree || groupTree.length === 0 ? (
`                  <div className="text-center text-muted-foreground py-8">
`                    <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
`                    <p>등록된 그룹이 없습니다.</p>
`                    <Button
`                      variant="link"
`                      className="mt-2"
`                      onClick={() => handleOpenGroupDialog(null)}
`                    >
`                      대분류 추가하기
`                    </Button>
`                  </div>
`                ) : (
`                  <div className="space-y-1">
`                    {groupTree.map((group) => (
`                      <TreeNode
`                        key={group.id}
`                        group={group}
`                        expandedIds={expandedIds}
`                        toggleExpand={toggleExpand}
`                        selectedGroupId={selectedGroup?.id || null}
`                        onSelectGroup={handleSelectGroup}
`                        onMoveGroup={handleMoveGroup}
`                      />
`                    ))}
`                  </div>
`                )}
`              </CardContent>
`            </Card>
`
`            {/* 우측: 선택된 그룹의 설정 */}
`            <Card className="flex flex-col">
`              <CardHeader className="border-b bg-gray-50/50 py-4 px-5">
`                <div className="flex items-center justify-between">
`                  <div>
`                    {selectedGroup ? (
`                      <>
`                        <div className="flex items-center gap-2">
`                          <CardTitle className="text-base font-semibold">
`                            {selectedGroup.name}
`                          </CardTitle>
`                          <span className="text-sm text-gray-500 font-mono">
`                            ({selectedGroup.code})
`                          </span>
`                        </div>
`                        <p className="text-sm text-gray-500 mt-1">
`                          {selectedGroup.depth === 1 ? "대분류" : "소분류"} · {selectedSettings.length}개 설정
`                        </p>
`                      </>
`                    ) : (
`                      <CardTitle className="text-base font-semibold text-gray-400">
`                        그룹을 선택하세요
`                      </CardTitle>
`                    )}
`                  </div>
`
`                  {selectedGroup && (
`                    <div className="flex items-center gap-2">
`                      <Button
`                        variant="outline"
`                        size="sm"
`                        className="h-8 text-gray-600"
`                        onClick={() => handleOpenGroupDialog(selectedGroup.parentId, selectedGroup)}
`                      >
`                        <Edit className="h-3.5 w-3.5 mr-1.5" />
`                        그룹 수정
`                      </Button>
`                      <Button
`                        variant="outline"
`                        size="sm"
`                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
`                        onClick={() => {
`                          setDeletingItem({ type: "group", item: selectedGroup });
`                          setIsDeleteDialogOpen(true);
`                        }}
`                      >
`                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
`                        그룹 삭제
`                      </Button>
`                      {selectedGroup.depth === 1 ? (
`                        <Button
`                          size="sm"
`                          className="h-8 bg-indigo-600 hover:bg-indigo-700"
`                          onClick={() => handleOpenGroupDialog(selectedGroup.id)}
`                        >
`                          <Plus className="h-3.5 w-3.5 mr-1.5" />
`                          소분류 추가
`                        </Button>
`                      ) : (
`                        <Button
`                          size="sm"
`                          className="h-8 bg-indigo-600 hover:bg-indigo-700"
`                          onClick={() => handleOpenSettingDialog()}
`                        >
`                          <Plus className="h-3.5 w-3.5 mr-1.5" />
`                          설정 추가
`                        </Button>
`                      )}
`                    </div>
`                  )}
`                </div>
`              </CardHeader>
`              <CardContent className="p-4 max-h-[calc(100vh-280px)] overflow-y-auto">
`                {!selectedGroup ? (
`                  <div className="text-center text-muted-foreground py-12">
`                    <Settings2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
`                    <p>좌측에서 그룹을 선택해주세요.</p>
`                  </div>
`                ) : selectedGroup.depth === 1 ? (
`                  <div className="text-center text-muted-foreground py-12">
`                    <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
`                    <p>대분류입니다. 소분류를 추가해주세요.</p>
`                    <Button
`                      variant="link"
`                      className="mt-2"
`                      onClick={() => handleOpenGroupDialog(selectedGroup.id)}
`                    >
`                      소분류 추가하기
`                    </Button>
`                  </div>
`                ) : selectedSettings.length === 0 ? (
`                  <div className="text-center text-muted-foreground py-12">
`                    <Settings2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
`                    <p>등록된 설정이 없습니다.</p>
`                    <Button
`                      variant="link"
`                      className="mt-2"
`                      onClick={() => handleOpenSettingDialog()}
`                    >
`                      설정 추가하기
`                    </Button>
`                  </div>
`                ) : (
`                  <div>
`                    {selectedSettings.map((setting) => (
`                      <SettingCard
`                        key={setting.id}
`                        setting={setting}
`                        onEdit={handleOpenSettingDialog}
`                        onDelete={(s) => {
`                          setDeletingItem({ type: "setting", item: s });
`                          setIsDeleteDialogOpen(true);
`                        }}
`                        onMove={handleMoveSetting}
`                      />
`                    ))}
`                  </div>
`                )}
`              </CardContent>
`            </Card>
`          </div>
`        </TabsContent>
`
`        <TabsContent value="indigo">
`          <IndigoOutputSettings />
`        </TabsContent>
`
`        <TabsContent value="inkjet">
`          <InkjetOutputSettings />
`        </TabsContent>
`      </Tabs>
`
`      {/* 그룹 다이얼로그 */}
`      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
`        <DialogContent className="max-w-md">
`          <DialogHeader>
`            <DialogTitle>
`              {editingGroup ? "그룹 수정" : parentGroupId ? "소분류 추가" : "대분류 추가"}
`            </DialogTitle>
`            <DialogDescription>
`              {parentGroupId ? "소분류" : "대분류"} 그룹 정보를 입력하세요.
`            </DialogDescription>
`          </DialogHeader>
`          <div className="space-y-4 py-4">
`            <div className="space-y-2">
`              <Label htmlFor="groupName">그룹명</Label>
`              <Input
`                id="groupName"
`                placeholder="예: 출력전용, 포토북"
`                value={groupForm.name}
`                onChange={(e) =>
`                  setGroupForm((prev) => ({ ...prev, name: e.target.value }))
`                }
`                autoFocus
`              />
`            </div>
`          </div>
`          <DialogFooter>
`            <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
`              취소
`            </Button>
`            <Button
`              onClick={handleSaveGroup}
`              disabled={!groupForm.name}
`            >
`              {editingGroup ? "수정" : "추가"}
`            </Button>
`          </DialogFooter>
`        </DialogContent>
`      </Dialog>
`
`      {/* 설정 다이얼로그 */}
`      <Dialog open={isSettingDialogOpen} onOpenChange={setIsSettingDialogOpen}>
`        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
`          <DialogHeader>
`            <DialogTitle>
`              {editingSetting ? "생산설정 수정" : "생산설정 추가"}
`            </DialogTitle>
`            <DialogDescription>
`              {selectedGroup?.name} - 설정값 수정
`            </DialogDescription>
`          </DialogHeader>
`          <div className="grid grid-cols-2 gap-6 py-4">
`            {/* 좌측 설정 */}
`            <div className="space-y-4">
`              <div className="space-y-2">
`                <Label>그룹명</Label>
`                <Input value={selectedGroup?.name || ""} disabled />
`              </div>
`
`              {/* 코드명은 자동 생성되므로 UI에서 숨김 */}
`
`              <div className="grid grid-cols-2 gap-4">
`                <div className="space-y-2">
`                  <Label>잡세팅비</Label>
`                  <div className="flex items-center gap-2">
`                    <Input
`                      type="number"
`                      value={settingForm.settingFee}
`                      onChange={(e) =>
`                        setSettingForm((prev) => ({
`                          ...prev,
`                          settingFee: Number(e.target.value),
`                        }))
`                      }
`                    />
`                    <span className="text-muted-foreground">원</span>
`                  </div>
`                </div>
`                <div className="space-y-2">
`                  <Label>기본단가</Label>
`                  <div className="flex items-center gap-2">
`                    <Input
`                      type="number"
`                      value={settingForm.basePrice}
`                      onChange={(e) =>
`                        setSettingForm((prev) => ({
`                          ...prev,
`                          basePrice: Number(e.target.value),
`                        }))
`                      }
`                    />
`                    <span className="text-muted-foreground">원</span>
`                  </div>
`                </div>
`              </div>
`
`              <div className="space-y-2">
`                <Label>작업시간</Label>
`                <div className="flex items-center gap-2">
`                  <Input
`                    type="number"
`                    step="0.1"
`                    value={settingForm.workDays}
`                    onChange={(e) =>
`                      setSettingForm((prev) => ({
`                        ...prev,
`                        workDays: Number(e.target.value),
`                      }))
`                    }
`                    className="w-24"
`                  />
`                  <span className="text-muted-foreground text-sm">일 (※ 소수점 1자리까지 표현)</span>
`                </div>
`              </div>
`
`              <div className="space-y-2">
`                <Label>적용단위</Label>
`                <Select
`                  value={settingForm.pricingType}
`                  onValueChange={(value) =>
`                    setSettingForm((prev) => ({
`                      ...prev,
`                      pricingType: value as PricingType,
`                    }))
`                  }
`                >
`                  <SelectTrigger>
`                    <SelectValue />
`                  </SelectTrigger>
`                  <SelectContent>
`                    {pricingTypes?.map((type) => (
`                      <SelectItem key={type.value} value={type.value}>
`                        {type.label}
`                      </SelectItem>
`                    )) || Object.entries(PRICING_TYPE_LABELS).map(([value, label]) => (
`                      <SelectItem key={value} value={value}>
`                        {label}
`                      </SelectItem>
`                    ))}
`                  </SelectContent>
`                </Select>
`              </div>
`
`              <div className="grid grid-cols-2 gap-4">
`                <div className="space-y-2">
`                  <Label>세팅명</Label>
`                  <Input
`                    placeholder="예: 박Color"
`                    value={settingForm.settingName}
`                    onChange={(e) =>
`                      setSettingForm((prev) => ({
`                        ...prev,
`                        settingName: e.target.value,
`                      }))
`                    }
`                  />
`                </div>
`                <div className="space-y-2">
`                  <Label>업체</Label>
`                  <Select
`                    value={settingForm.vendorType}
`                    onValueChange={(value) =>
`                      setSettingForm((prev) => ({ ...prev, vendorType: value }))
`                    }
`                  >
`                    <SelectTrigger>
`                      <SelectValue />
`                    </SelectTrigger>
`                    <SelectContent>
`                      <SelectItem value="in_house">본사</SelectItem>
`                      <SelectItem value="outsourced">외주</SelectItem>
`                    </SelectContent>
`                  </Select>
`                </div>
`              </div>
`
`              <div className="space-y-2">
`                <Label>가중치 구분</Label>
`                <Textarea
`                  placeholder="가중치 구분을 엔터로 구분하여 입력"
`                  value={settingForm.weightInfo}
`                  onChange={(e) =>
`                    setSettingForm((prev) => ({
`                      ...prev,
`                      weightInfo: e.target.value,
`                    }))
`                  }
`                  rows={3}
`                />
`                <p className="text-xs text-muted-foreground">
`                  ※ 가중치구분은 엔터로 하세요
`                </p>
`              </div>
`            </div>
`
`            {/* 우측 규격 선택 */}
`            <div className="space-y-4">
`              <div className="flex items-center justify-between">
`                <Label>규격선택</Label>
`                <div className="flex gap-2">
`                  <Button
`                    variant="outline"
`                    size="sm"
`                    onClick={handleSelectAllSpecifications}
`                  >
`                    전체선택
`                  </Button>
`                  <Button
`                    variant="outline"
`                    size="sm"
`                    onClick={handleDeselectAllSpecifications}
`                  >
`                    전체해제
`                  </Button>
`                </div>
`              </div>
`
`              {/* 적용단위별 규격 필터 안내 */}
`              <div className="text-xs text-muted-foreground bg-gray-50 rounded p-2">
`                {settingForm.pricingType === "paper_output" && "※ 잉크젯출력 규격만 표시됩니다."}
`                {settingForm.pricingType === "binding_page" && "※ 앨범전용 규격만 표시됩니다."}
`                {(settingForm.pricingType === "finishing_qty" || settingForm.pricingType === "finishing_page") && "※ 모든 규격이 표시됩니다."}
`                {settingForm.pricingType === "per_sheet" && "※ 장당가격은 규격 선택이 필요없습니다."}
`              </div>
`
`              <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
`                {settingForm.pricingType === "per_sheet" ? (
`                  <p className="text-center text-muted-foreground py-4">
`                    장당가격은 규격 선택이 필요없습니다.
`                  </p>
`                ) : (
`                  <>
`                    <div className="grid grid-cols-3 gap-2">
`                      {specifications
`                        ?.filter((spec) => {
`                          if (settingForm.pricingType === "paper_output") return spec.forInkjet;
`                          if (settingForm.pricingType === "binding_page") return spec.forAlbum;
`                          return true;
`                        })
`                        .map((spec) => (
`                          <div key={spec.id} className="flex items-center gap-2">
`                            <Checkbox
`                              id={\`spec-\${spec.id}\`}
`                              checked={settingForm.specificationIds.includes(spec.id)}
`                              onCheckedChange={() => handleToggleSpecification(spec.id)}
`                            />
`                            <Label
`                              htmlFor={\`spec-\${spec.id}\`}
`                              className="text-sm font-mono cursor-pointer"
`                            >
`                              {spec.name}
`                            </Label>
`                          </div>
`                        ))}
`                    </div>
`                    {(!specifications || specifications.filter((spec) => {
`                      if (settingForm.pricingType === "paper_output") return spec.forInkjet;
`                      if (settingForm.pricingType === "binding_page") return spec.forAlbum;
`                      return true;
`                    }).length === 0) && (
`                      <p className="text-center text-muted-foreground py-4">
`                        해당 용도의 규격이 없습니다.
`                      </p>
`                    )}
`                  </>
`                )}
`              </div>
`              </div>
`
`              <p className="text-sm text-muted-foreground">
`                선택된 규격: {settingForm.specificationIds.length}개
`              </p>
`            </div>
`          </div>
`          <DialogFooter>
`            <Button variant="outline" onClick={() => setIsSettingDialogOpen(false)}>
`              취소
`            </Button>
`            <Button onClick={handleSaveSetting}>
`              {editingSetting ? "수정" : "추가"}
`            </Button>
`          </DialogFooter>
`        </DialogContent>
`      </Dialog>
`
`      {/* 삭제 확인 다이얼로그 */}
`      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
`        <DialogContent>
`          <DialogHeader>
`            <DialogTitle>삭제 확인</DialogTitle>
`            <DialogDescription>
`              {deletingItem?.type === "group"
`                ? `"${deletingItem.item.name}" 그룹을 삭제하시겠습니까?`
`                : `이 설정을 삭제하시겠습니까?`}
`            </DialogDescription>
`          </DialogHeader>
`          <DialogFooter>
`            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
`              취소
`            </Button>
`            <Button variant="destructive" onClick={handleDelete}>
`              삭제
`            </Button>
`          </DialogFooter>
`        </DialogContent>
`      </Dialog>
`    </div>
`  );
`}

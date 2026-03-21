'use client';

import { useState } from 'react';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  useLeaveTypes,
  useCreateLeaveType,
  useUpdateLeaveType,
  useMinStaffingRules,
  useCreateMinStaffingRule,
  useUpdateMinStaffingRule,
  useDeleteMinStaffingRule,
  type LeaveType,
  type MinStaffingRule,
} from '@/hooks/use-leave';
import { useDepartments } from '@/hooks/use-staff';
import { useTeams } from '@/hooks/use-team';

// ==================== 페이지 컴포넌트 ====================

export default function LeaveSettingsPage() {
  const { toast } = useToast();

  // 탭 상태
  const [activeTab, setActiveTab] = useState('types');

  // 휴가 유형 다이얼로그 상태
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [typeForm, setTypeForm] = useState({
    code: '',
    name: '',
    defaultDays: 0,
    deductDays: 1,
    isActive: true,
    sortOrder: 0,
  });

  // 최소 인원 규칙 다이얼로그 상태
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<MinStaffingRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    departmentId: '',
    teamId: '',
    minCount: 1,
    isActive: true,
  });
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<MinStaffingRule | null>(null);

  // 데이터 조회
  const { data: leaveTypes, isLoading: typesLoading } = useLeaveTypes();
  const { data: rules, isLoading: rulesLoading } = useMinStaffingRules();
  const { data: departments } = useDepartments();
  const { data: teams } = useTeams(
    ruleForm.departmentId ? { departmentId: ruleForm.departmentId } : undefined
  );

  // Mutations
  const createType = useCreateLeaveType();
  const updateType = useUpdateLeaveType();
  const createRule = useCreateMinStaffingRule();
  const updateRule = useUpdateMinStaffingRule();
  const deleteRule = useDeleteMinStaffingRule();

  // ==================== 휴가 유형 핸들러 ====================

  const openTypeDialog = (type?: LeaveType) => {
    if (type) {
      setEditingType(type);
      setTypeForm({
        code: type.code,
        name: type.name,
        defaultDays: type.defaultDays,
        deductDays: type.deductDays,
        isActive: type.isActive,
        sortOrder: type.sortOrder,
      });
    } else {
      setEditingType(null);
      setTypeForm({
        code: '',
        name: '',
        defaultDays: 0,
        deductDays: 1,
        isActive: true,
        sortOrder: (leaveTypes?.length || 0) + 1,
      });
    }
    setTypeDialogOpen(true);
  };

  const handleSaveType = async () => {
    if (!typeForm.code || !typeForm.name) {
      toast({ title: '코드와 이름은 필수입니다', variant: 'destructive' });
      return;
    }
    try {
      if (editingType) {
        await updateType.mutateAsync({
          id: editingType.id,
          data: typeForm,
        });
        toast({ title: '휴가 유형이 수정되었습니다' });
      } else {
        await createType.mutateAsync(typeForm as any);
        toast({ title: '휴가 유형이 생성되었습니다' });
      }
      setTypeDialogOpen(false);
    } catch (err: any) {
      toast({ title: '저장 실패', description: err.message, variant: 'destructive' });
    }
  };

  // ==================== 최소 인원 규칙 핸들러 ====================

  const openRuleDialog = (rule?: MinStaffingRule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleForm({
        departmentId: rule.departmentId || '',
        teamId: rule.teamId || '',
        minCount: rule.minCount,
        isActive: rule.isActive,
      });
    } else {
      setEditingRule(null);
      setRuleForm({
        departmentId: '',
        teamId: '',
        minCount: 1,
        isActive: true,
      });
    }
    setRuleDialogOpen(true);
  };

  const handleSaveRule = async () => {
    if (ruleForm.minCount < 1) {
      toast({ title: '최소 인원은 1명 이상이어야 합니다', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        departmentId: ruleForm.departmentId || undefined,
        teamId: ruleForm.teamId || undefined,
        minCount: ruleForm.minCount,
        isActive: ruleForm.isActive,
      };
      if (editingRule) {
        await updateRule.mutateAsync({ id: editingRule.id, data: payload });
        toast({ title: '규칙이 수정되었습니다' });
      } else {
        await createRule.mutateAsync(payload as any);
        toast({ title: '규칙이 생성되었습니다' });
      }
      setRuleDialogOpen(false);
    } catch (err: any) {
      toast({ title: '저장 실패', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteRule = async () => {
    if (!deleteRuleTarget) return;
    try {
      await deleteRule.mutateAsync(deleteRuleTarget.id);
      toast({ title: '규칙이 삭제되었습니다' });
      setDeleteRuleTarget(null);
    } catch (err: any) {
      toast({ title: '삭제 실패', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-gray-700" />
        <h1 className="text-[24px] text-black font-normal">휴가 설정</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="types" className="text-[14px]">휴가 유형 관리</TabsTrigger>
          <TabsTrigger value="rules" className="text-[14px]">최소 근무인원 규칙</TabsTrigger>
        </TabsList>

        {/* 휴가 유형 관리 탭 */}
        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[18px] text-black font-bold">휴가 유형</CardTitle>
              <Button onClick={() => openTypeDialog()} size="sm" className="text-[14px]">
                <Plus className="h-4 w-4 mr-1" />
                유형 추가
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {typesLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[14px]">정렬</TableHead>
                      <TableHead className="text-[14px]">코드</TableHead>
                      <TableHead className="text-[14px]">이름</TableHead>
                      <TableHead className="text-[14px]">기본일수</TableHead>
                      <TableHead className="text-[14px]">차감일수</TableHead>
                      <TableHead className="text-[14px]">상태</TableHead>
                      <TableHead className="text-[14px]">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!leaveTypes || leaveTypes.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <p className="text-[14px] text-gray-400">등록된 휴가 유형이 없습니다</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaveTypes
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((type) => (
                          <TableRow key={type.id}>
                            <TableCell className="text-[14px] text-black font-normal">
                              {type.sortOrder}
                            </TableCell>
                            <TableCell className="text-[14px] text-black font-normal">
                              <Badge variant="outline" className="text-[12px]">
                                {type.code}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[14px] text-black font-normal">
                              {type.name}
                            </TableCell>
                            <TableCell className="text-[14px] text-black font-normal">
                              {type.defaultDays}일
                            </TableCell>
                            <TableCell className="text-[14px] text-black font-normal">
                              {type.deductDays}일
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[12px]',
                                  type.isActive
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-gray-50 text-gray-500 border-gray-200'
                                )}
                              >
                                {type.isActive ? '활성' : '비활성'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openTypeDialog(type)}
                                className="text-[12px]"
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" />
                                수정
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 최소 근무인원 규칙 탭 */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[18px] text-black font-bold">최소 근무인원 규칙</CardTitle>
              <Button onClick={() => openRuleDialog()} size="sm" className="text-[14px]">
                <Plus className="h-4 w-4 mr-1" />
                규칙 추가
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {rulesLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[14px]">부서</TableHead>
                      <TableHead className="text-[14px]">팀</TableHead>
                      <TableHead className="text-[14px]">최소 인원</TableHead>
                      <TableHead className="text-[14px]">상태</TableHead>
                      <TableHead className="text-[14px]">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!rules || rules.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <p className="text-[14px] text-gray-400">등록된 규칙이 없습니다</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="text-[14px] text-black font-normal">
                            {rule.department?.name || departments?.find((d: any) => d.id === rule.departmentId)?.name || '전체'}
                          </TableCell>
                          <TableCell className="text-[14px] text-black font-normal">
                            {rule.team?.name || '-'}
                          </TableCell>
                          <TableCell className="text-[14px] text-black font-bold">
                            {rule.minCount}명
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[12px]',
                                rule.isActive
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-gray-50 text-gray-500 border-gray-200'
                              )}
                            >
                              {rule.isActive ? '활성' : '비활성'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openRuleDialog(rule)}
                                className="text-[12px]"
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" />
                                수정
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteRuleTarget(rule)}
                                className="text-[12px] text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                삭제
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 휴가 유형 다이얼로그 */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">
              {editingType ? '휴가 유형 수정' : '휴가 유형 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">코드</Label>
                <Input
                  value={typeForm.code}
                  onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                  placeholder="annual"
                  className="text-[14px]"
                  disabled={!!editingType}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">이름</Label>
                <Input
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="연차"
                  className="text-[14px]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">기본 부여일수</Label>
                <Input
                  type="number"
                  value={typeForm.defaultDays}
                  onChange={(e) => setTypeForm({ ...typeForm, defaultDays: Number(e.target.value) })}
                  className="text-[14px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">차감 일수</Label>
                <Input
                  type="number"
                  value={typeForm.deductDays}
                  onChange={(e) => setTypeForm({ ...typeForm, deductDays: Number(e.target.value) })}
                  className="text-[14px]"
                  step="0.25"
                />
                <p className="text-[11px] text-gray-400">반차=0.5, 반반차=0.25</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">정렬 순서</Label>
                <Input
                  type="number"
                  value={typeForm.sortOrder}
                  onChange={(e) => setTypeForm({ ...typeForm, sortOrder: Number(e.target.value) })}
                  className="text-[14px]"
                />
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="type-active"
                    checked={typeForm.isActive}
                    onCheckedChange={(checked) =>
                      setTypeForm({ ...typeForm, isActive: checked === true })
                    }
                  />
                  <Label htmlFor="type-active" className="text-[14px] text-black font-normal">
                    활성화
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)} className="text-[14px]">
              취소
            </Button>
            <Button
              onClick={handleSaveType}
              disabled={createType.isPending || updateType.isPending}
              className="text-[14px]"
            >
              {(createType.isPending || updateType.isPending) && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 최소 인원 규칙 다이얼로그 */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">
              {editingRule ? '규칙 수정' : '규칙 추가'}
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              부서/팀별 최소 근무인원 규칙을 설정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">부서</Label>
              <Select
                value={ruleForm.departmentId || 'none'}
                onValueChange={(v) => setRuleForm({ ...ruleForm, departmentId: v === 'none' ? '' : v, teamId: '' })}
              >
                <SelectTrigger className="text-[14px]">
                  <SelectValue placeholder="전체 (선택 안함)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">전체 (선택 안함)</SelectItem>
                  {departments?.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {ruleForm.departmentId && (
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">팀 (선택)</Label>
                <Select
                  value={ruleForm.teamId || 'none'}
                  onValueChange={(v) => setRuleForm({ ...ruleForm, teamId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger className="text-[14px]">
                    <SelectValue placeholder="전체 (선택 안함)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">전체 (선택 안함)</SelectItem>
                    {teams?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">최소 근무인원</Label>
              <Input
                type="number"
                value={ruleForm.minCount}
                onChange={(e) => setRuleForm({ ...ruleForm, minCount: Number(e.target.value) })}
                min={1}
                className="text-[14px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="rule-active"
                checked={ruleForm.isActive}
                onCheckedChange={(checked) =>
                  setRuleForm({ ...ruleForm, isActive: checked === true })
                }
              />
              <Label htmlFor="rule-active" className="text-[14px] text-black font-normal">
                활성화
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)} className="text-[14px]">
              취소
            </Button>
            <Button
              onClick={handleSaveRule}
              disabled={createRule.isPending || updateRule.isPending}
              className="text-[14px]"
            >
              {(createRule.isPending || updateRule.isPending) && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 규칙 삭제 확인 */}
      <Dialog open={!!deleteRuleTarget} onOpenChange={(open) => !open && setDeleteRuleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">규칙 삭제</DialogTitle>
            <DialogDescription className="text-[14px]">
              이 최소 근무인원 규칙을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRuleTarget(null)} className="text-[14px]">
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRule}
              disabled={deleteRule.isPending}
              className="text-[14px]"
            >
              {deleteRule.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

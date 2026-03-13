'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useStaffList,
} from '@/hooks/use-staff';
import {
  useTeams,
  useTeam,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useAssignTeamMembers,
  useRemoveTeamMember,
  useSetTeamLeader,
} from '@/hooks/use-team';
import {
  Department,
  Team,
  TeamSummary,
  CreateDepartmentRequest,
  CreateTeamRequest,
} from '@/lib/types/staff';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Building2,
  Loader2,
  AlertCircle,
  ChevronRight,
  Crown,
  UserPlus,
  UserMinus,
  FolderTree,
  MoreHorizontal,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ==================== 부서/팀 관리 페이지 ====================

export default function DepartmentsPage() {
  const { toast } = useToast();

  // ---- 부서 상태 ----
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteDeptConfirm, setDeleteDeptConfirm] = useState<Department | null>(null);

  // ---- 팀 상태 ----
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | TeamSummary | null>(null);
  const [deleteTeamConfirm, setDeleteTeamConfirm] = useState<TeamSummary | null>(null);

  // ---- 팀 멤버 상태 ----
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [membersTeamId, setMembersTeamId] = useState<string | null>(null);

  // ---- 아코디언 상태 ----
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);

  // ==================== Queries ====================
  const { data: departments, isLoading: deptsLoading, error: deptsError } = useDepartments();
  const { data: selectedTeamDetail } = useTeam(membersTeamId || '');

  // 선택된 부서의 팀 목록
  const { data: teamsForDept, isLoading: teamsLoading } = useTeams(
    selectedDeptId ? { departmentId: selectedDeptId } : undefined
  );

  // 선택된 부서의 전체 직원 (부서배정되어있지만 팀 미배정인 직원 파악용)
  const { data: deptStaffData } = useStaffList(
    selectedDeptId
      ? { departmentId: selectedDeptId, limit: 200 }
      : { limit: 0 }
  );

  // 팀 멤버 다이얼로그용: 해당 부서 내 모든 직원
  const { data: allDeptStaff } = useStaffList(
    membersDialogOpen && selectedDeptId
      ? { departmentId: selectedDeptId, limit: 200 }
      : { limit: 0 }
  );

  // ==================== Mutations ====================
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const assignMembers = useAssignTeamMembers();
  const removeMember = useRemoveTeamMember();
  const setTeamLeader = useSetTeamLeader();

  // ==================== 파생 데이터 ====================
  const selectedDept = useMemo(
    () => departments?.find((d) => d.id === selectedDeptId) || null,
    [departments, selectedDeptId]
  );

  // 팀에 배정되지 않은 직원 목록
  const unassignedStaff = useMemo(() => {
    if (!deptStaffData?.data || !teamsForDept) return [];
    const assignedIds = new Set(
      teamsForDept.flatMap((t) => t.staff?.map((s) => s.id) || [])
    );
    return deptStaffData.data.filter((s) => !assignedIds.has(s.id) && !s.teamId);
  }, [deptStaffData, teamsForDept]);

  // 첫 부서 자동선택
  useEffect(() => {
    if (departments && departments.length > 0 && !selectedDeptId) {
      setSelectedDeptId(departments[0].id);
    }
  }, [departments, selectedDeptId]);

  // ==================== 부서 폼 ====================
  const [deptForm, setDeptForm] = useState<CreateDepartmentRequest>({
    code: '',
    name: '',
    description: '',
    sortOrder: 0,
    isActive: true,
  });

  const openDeptDialog = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setDeptForm({
        code: dept.code,
        name: dept.name,
        description: dept.description || '',
        sortOrder: dept.sortOrder,
        isActive: dept.isActive,
      });
    } else {
      setEditingDept(null);
      const nextSort = departments ? Math.max(0, ...departments.map((d) => d.sortOrder)) + 1 : 0;
      setDeptForm({
        code: '',
        name: '',
        description: '',
        sortOrder: nextSort,
        isActive: true,
      });
    }
    setDeptDialogOpen(true);
  };

  const handleDeptSubmit = async () => {
    if (!deptForm.code.trim()) {
      toast({ title: '오류', description: '부서 코드를 입력해주세요', variant: 'destructive' });
      return;
    }
    if (!deptForm.name.trim()) {
      toast({ title: '오류', description: '부서명을 입력해주세요', variant: 'destructive' });
      return;
    }

    try {
      if (editingDept) {
        await updateDepartment.mutateAsync({ id: editingDept.id, data: deptForm });
        toast({ title: '성공', description: '부서가 수정되었습니다' });
      } else {
        await createDepartment.mutateAsync(deptForm);
        toast({ title: '성공', description: '부서가 등록되었습니다' });
      }
      setDeptDialogOpen(false);
    } catch (error) {
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '오류가 발생했습니다',
        variant: 'destructive',
      });
    }
  };

  const handleDeptDelete = async () => {
    if (!deleteDeptConfirm) return;

    try {
      await deleteDepartment.mutateAsync(deleteDeptConfirm.id);
      toast({ title: '성공', description: '부서가 삭제되었습니다' });
      if (selectedDeptId === deleteDeptConfirm.id) {
        setSelectedDeptId(null);
      }
      setDeleteDeptConfirm(null);
    } catch (error) {
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다',
        variant: 'destructive',
      });
    }
  };

  // ==================== 팀 폼 ====================
  const [teamForm, setTeamForm] = useState<CreateTeamRequest>({
    code: '',
    name: '',
    departmentId: '',
    leaderId: '',
    description: '',
    sortOrder: 0,
    isActive: true,
  });

  const openTeamDialog = (team?: Team | TeamSummary) => {
    if (team) {
      setEditingTeam(team);
      setTeamForm({
        code: team.code,
        name: team.name,
        departmentId: selectedDeptId || '',
        leaderId: team.leaderId || '',
        description: ('description' in team ? team.description : '') || '',
        sortOrder: team.sortOrder,
        isActive: team.isActive,
      });
    } else {
      setEditingTeam(null);
      const nextSort = teamsForDept ? Math.max(0, ...teamsForDept.map((t) => t.sortOrder)) + 1 : 0;
      setTeamForm({
        code: '',
        name: '',
        departmentId: selectedDeptId || '',
        leaderId: '',
        description: '',
        sortOrder: nextSort,
        isActive: true,
      });
    }
    setTeamDialogOpen(true);
  };

  const handleTeamSubmit = async () => {
    if (!teamForm.code.trim()) {
      toast({ title: '오류', description: '팀 코드를 입력해주세요', variant: 'destructive' });
      return;
    }
    if (!teamForm.name.trim()) {
      toast({ title: '오류', description: '팀명을 입력해주세요', variant: 'destructive' });
      return;
    }
    if (!teamForm.departmentId) {
      toast({ title: '오류', description: '부서를 선택해주세요', variant: 'destructive' });
      return;
    }

    try {
      const submitData = {
        ...teamForm,
        leaderId: teamForm.leaderId || undefined,
      };

      if (editingTeam) {
        await updateTeam.mutateAsync({ id: editingTeam.id, data: submitData });
        toast({ title: '성공', description: '팀이 수정되었습니다' });
      } else {
        await createTeam.mutateAsync(submitData as CreateTeamRequest);
        toast({ title: '성공', description: '팀이 등록되었습니다' });
      }
      setTeamDialogOpen(false);
    } catch (error) {
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '오류가 발생했습니다',
        variant: 'destructive',
      });
    }
  };

  const handleTeamDelete = async () => {
    if (!deleteTeamConfirm) return;

    try {
      await deleteTeam.mutateAsync(deleteTeamConfirm.id);
      toast({ title: '성공', description: '팀이 삭제되었습니다' });
      setDeleteTeamConfirm(null);
    } catch (error) {
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다',
        variant: 'destructive',
      });
    }
  };

  // ==================== 팀 멤버 관리 ====================
  const openMembersDialog = (teamId: string) => {
    setMembersTeamId(teamId);
    setMembersDialogOpen(true);
  };

  const handleAssignMember = async (staffId: string) => {
    if (!membersTeamId || !selectedTeamDetail) return;

    try {
      const currentIds = selectedTeamDetail.staff?.map((s) => s.id) || [];
      await assignMembers.mutateAsync({
        teamId: membersTeamId,
        staffIds: [...currentIds, staffId],
      });
      toast({ title: '성공', description: '멤버가 추가되었습니다' });
    } catch (error) {
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '멤버 추가 중 오류가 발생했습니다',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (staffId: string) => {
    if (!membersTeamId) return;

    try {
      await removeMember.mutateAsync({ teamId: membersTeamId, staffId });
      toast({ title: '성공', description: '멤버가 제외되었습니다' });
    } catch (error) {
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '멤버 제외 중 오류가 발생했습니다',
        variant: 'destructive',
      });
    }
  };

  const handleSetLeader = async (staffId: string) => {
    if (!membersTeamId) return;

    try {
      await setTeamLeader.mutateAsync({ teamId: membersTeamId, staffId });
      toast({ title: '성공', description: '팀 리더가 변경되었습니다' });
    } catch (error) {
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '리더 변경 중 오류가 발생했습니다',
        variant: 'destructive',
      });
    }
  };

  // 멤버 다이얼로그에서 배정 가능한 직원 (해당 부서 소속이면서 이 팀에 아직 없는 직원)
  const availableForAssign = useMemo(() => {
    if (!allDeptStaff?.data || !selectedTeamDetail) return [];
    const memberIds = new Set(selectedTeamDetail.staff?.map((s) => s.id) || []);
    return allDeptStaff.data.filter((s) => !memberIds.has(s.id) && s.isActive);
  }, [allDeptStaff, selectedTeamDetail]);

  // ==================== 렌더링 ====================

  return (
    <div className="space-y-6">
      <PageHeader
        title="부서/팀 관리"
        description="부서와 팀 조직을 관리합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '회사정보', href: '/company' },
          { label: '부서/팀 관리' },
        ]}
        actions={
          <Button onClick={() => openDeptDialog()} className="text-[14px]">
            <Plus className="h-4 w-4 mr-1" />
            부서 추가
          </Button>
        }
      />

      {/* ==================== 메인 레이아웃 ==================== */}
      <div className="flex gap-4">
        {/* ---- 좌측 패널: 부서 목록 ---- */}
        <Card className="w-72 shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] text-black font-normal flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              부서 목록
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {deptsLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : deptsError ? (
              <div className="flex items-center justify-center py-8 text-destructive text-[14px]">
                <AlertCircle className="h-4 w-4 mr-1" />
                데이터 로딩 실패
              </div>
            ) : !departments || departments.length === 0 ? (
              <div className="text-center py-8 text-[14px] text-black font-normal opacity-60">
                등록된 부서가 없습니다
              </div>
            ) : (
              <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
                {departments
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((dept) => (
                    <div
                      key={dept.id}
                      className={`border-b last:border-b-0 ${
                        selectedDeptId === dept.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* 부서 행 */}
                      <div
                        className="flex items-center justify-between px-3 py-2.5 cursor-pointer group"
                        onClick={() => setSelectedDeptId(dept.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            type="button"
                            className="shrink-0"
                            aria-label="하위 부서 펼치기/접기"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedDepts((prev) =>
                                prev.includes(dept.id)
                                  ? prev.filter((id) => id !== dept.id)
                                  : [...prev, dept.id]
                              );
                            }}
                          >
                            <ChevronRight
                              className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                                expandedDepts.includes(dept.id) ? 'rotate-90' : ''
                              }`}
                            />
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[16px] text-black font-normal truncate">
                                {dept.name}
                              </span>
                              {!dept.isActive && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                  비활성
                                </Badge>
                              )}
                            </div>
                            <div className="text-[16px] text-gray-400">
                              {dept._count?.staff || 0}명 / {dept._count?.teams || 0}팀
                            </div>
                          </div>
                        </div>
                        {/* 호버 시 편집/삭제 버튼 */}
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeptDialog(dept);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-[14px]">수정</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteDeptConfirm(dept);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-[14px]">삭제</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>

                      {/* 하위 팀 목록 (확장 시) */}
                      {expandedDepts.includes(dept.id) && dept.teams && dept.teams.length > 0 && (
                        <div className="bg-gray-50/50">
                          {dept.teams
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map((team, idx) => (
                              <div
                                key={team.id}
                                className={`flex items-center gap-2 pl-8 pr-3 py-1.5 text-[14px] text-black font-normal ${
                                  idx < dept.teams!.length - 1 ? 'border-b border-gray-100' : ''
                                }`}
                              >
                                <span className="text-gray-300">
                                  {idx === dept.teams!.length - 1 ? '└' : '├'}
                                </span>
                                <span className="truncate flex-1">{team.name}</span>
                                <span className="text-[10px] text-gray-400 shrink-0">
                                  {team._count?.staff || 0}명
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- 우측 패널: 선택된 부서 상세 ---- */}
        <div className="flex-1 space-y-4">
          {!selectedDeptId || !selectedDept ? (
            <Card>
              <CardContent className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-[14px] text-black font-normal opacity-60">
                    좌측에서 부서를 선택해주세요
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 부서 정보 헤더 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-[14px] text-black font-normal flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {selectedDept.name}
                      {!selectedDept.isActive && (
                        <Badge variant="secondary" className="text-[9px] ml-1">비활성</Badge>
                      )}
                    </CardTitle>
                    {selectedDept.description && (
                      <p className="text-[10px] text-gray-400 mt-1">{selectedDept.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      코드: {selectedDept.code}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      정렬: {selectedDept.sortOrder}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[14px] h-7"
                      onClick={() => openDeptDialog(selectedDept)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      수정
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* 팀 목록 테이블 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-[14px] text-black font-normal flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    팀 목록
                    <Badge variant="secondary" className="text-[10px] ml-1">
                      {teamsForDept?.length || 0}개
                    </Badge>
                  </CardTitle>
                  <Button
                    size="sm"
                    className="text-[14px] h-7"
                    onClick={() => openTeamDialog()}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    팀 추가
                  </Button>
                </CardHeader>
                <CardContent>
                  {teamsLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : !teamsForDept || teamsForDept.length === 0 ? (
                    <div className="text-center py-10">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-[14px] text-black font-normal opacity-60">
                        등록된 팀이 없습니다
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 text-[14px] h-7"
                        onClick={() => openTeamDialog()}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        첫 팀 추가
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[14px] text-black font-normal w-20">
                            코드
                          </TableHead>
                          <TableHead className="text-[14px] text-black font-normal">
                            팀명
                          </TableHead>
                          <TableHead className="text-[14px] text-black font-normal">
                            팀 리더
                          </TableHead>
                          <TableHead className="text-[14px] text-black font-normal text-center w-20">
                            인원
                          </TableHead>
                          <TableHead className="text-[14px] text-black font-normal text-center w-20">
                            상태
                          </TableHead>
                          <TableHead className="text-[14px] text-black font-normal text-center w-16">
                            정렬
                          </TableHead>
                          <TableHead className="text-[14px] text-black font-normal text-right w-32">
                            작업
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamsForDept
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((team) => (
                            <TableRow key={team.id}>
                              <TableCell className="text-[14px] text-black font-normal font-mono">
                                {team.code}
                              </TableCell>
                              <TableCell className="text-[14px] text-black font-normal">
                                {team.name}
                              </TableCell>
                              <TableCell className="text-[14px] text-black font-normal">
                                {team.leader ? (
                                  <span className="flex items-center gap-1">
                                    <Crown className="h-3 w-3 text-amber-500" />
                                    {team.leader.name}
                                    {team.leader.position && (
                                      <span className="text-[10px] text-gray-400">
                                        ({team.leader.position})
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-[10px]">
                                  {team._count?.staff || 0}명
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={team.isActive ? 'default' : 'secondary'}
                                  className="text-[10px]"
                                >
                                  {team.isActive ? '활성' : '비활성'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center text-[14px] text-black font-normal">
                                {team.sortOrder}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => openMembersDialog(team.id)}
                                        >
                                          <Users className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-[14px]">멤버 관리</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => openTeamDialog(team)}
                                        >
                                          <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-[14px]">수정</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-destructive hover:text-destructive"
                                          onClick={() => setDeleteTeamConfirm(team)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-[14px]">삭제</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* 미배정 직원 */}
              {unassignedStaff.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[14px] text-black font-normal flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      미배정 직원
                      <Badge variant="secondary" className="text-[10px] ml-1">
                        {unassignedStaff.length}명
                      </Badge>
                    </CardTitle>
                    <p className="text-[10px] text-gray-400">
                      이 부서에 소속되어 있으나 팀에 배정되지 않은 직원입니다.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[14px] text-black font-normal w-24">
                            직원ID
                          </TableHead>
                          <TableHead className="text-[14px] text-black font-normal">
                            이름
                          </TableHead>
                          <TableHead className="text-[14px] text-black font-normal">
                            직책
                          </TableHead>
                          <TableHead className="text-[14px] text-black font-normal text-center w-20">
                            상태
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unassignedStaff.map((staff) => (
                          <TableRow key={staff.id}>
                            <TableCell className="text-[14px] text-black font-normal font-mono">
                              {staff.staffId}
                            </TableCell>
                            <TableCell className="text-[14px] text-black font-normal">
                              {staff.name}
                            </TableCell>
                            <TableCell className="text-[14px] text-black font-normal">
                              {staff.position || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={staff.isActive ? 'default' : 'secondary'}
                                className="text-[10px]"
                              >
                                {staff.isActive ? '활성' : '비활성'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* ==================== 부서 생성/수정 다이얼로그 ==================== */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[14px] text-black font-normal">
              {editingDept ? '부서 수정' : '부서 추가'}
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              {editingDept ? '부서 정보를 수정합니다.' : '새 부서를 등록합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">
                부서 코드 <span className="text-destructive">*</span>
              </Label>
              <Input
                className="text-[14px] text-black font-normal h-8"
                placeholder="예: DEPT001"
                value={deptForm.code}
                onChange={(e) => setDeptForm((prev) => ({ ...prev, code: e.target.value }))}
                disabled={!!editingDept}
              />
              {editingDept && (
                <p className="text-[10px] text-gray-400">코드는 수정할 수 없습니다.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">
                부서명 <span className="text-destructive">*</span>
              </Label>
              <Input
                className="text-[14px] text-black font-normal h-8"
                placeholder="예: 생산팀"
                value={deptForm.name}
                onChange={(e) => setDeptForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">설명</Label>
              <Textarea
                className="text-[14px] text-black font-normal min-h-[60px] resize-none"
                placeholder="부서에 대한 설명을 입력하세요"
                value={deptForm.description}
                onChange={(e) => setDeptForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">정렬 순서</Label>
                <Input
                  type="number"
                  className="text-[14px] text-black font-normal h-8"
                  value={deptForm.sortOrder}
                  onChange={(e) =>
                    setDeptForm((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">활성 상태</Label>
                <div className="flex items-center gap-2 h-8">
                  <Switch
                    checked={deptForm.isActive}
                    onCheckedChange={(checked) =>
                      setDeptForm((prev) => ({ ...prev, isActive: checked }))
                    }
                  />
                  <span className="text-[14px] text-black font-normal">
                    {deptForm.isActive ? '활성' : '비활성'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="text-[14px] h-8"
              onClick={() => setDeptDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              className="text-[14px] h-8"
              onClick={handleDeptSubmit}
              disabled={createDepartment.isPending || updateDepartment.isPending}
            >
              {(createDepartment.isPending || updateDepartment.isPending) && (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              )}
              {editingDept ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== 팀 생성/수정 다이얼로그 ==================== */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[14px] text-black font-normal">
              {editingTeam ? '팀 수정' : '팀 추가'}
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              {editingTeam
                ? '팀 정보를 수정합니다.'
                : `${selectedDept?.name || '선택된 부서'}에 새 팀을 등록합니다.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">
                팀 코드 <span className="text-destructive">*</span>
              </Label>
              <Input
                className="text-[14px] text-black font-normal h-8"
                placeholder="예: T001"
                value={teamForm.code}
                onChange={(e) => setTeamForm((prev) => ({ ...prev, code: e.target.value }))}
                disabled={!!editingTeam}
              />
              {editingTeam && (
                <p className="text-[10px] text-gray-400">코드는 수정할 수 없습니다.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">
                팀명 <span className="text-destructive">*</span>
              </Label>
              <Input
                className="text-[14px] text-black font-normal h-8"
                placeholder="예: 1팀"
                value={teamForm.name}
                onChange={(e) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">
                소속 부서 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={teamForm.departmentId}
                onValueChange={(val) => setTeamForm((prev) => ({ ...prev, departmentId: val }))}
              >
                <SelectTrigger className="text-[14px] text-black font-normal h-8">
                  <SelectValue placeholder="부서 선택" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((dept) => (
                    <SelectItem
                      key={dept.id}
                      value={dept.id}
                      className="text-[14px] text-black font-normal"
                    >
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">팀 리더</Label>
              <Select
                value={teamForm.leaderId || '_none'}
                onValueChange={(val) =>
                  setTeamForm((prev) => ({ ...prev, leaderId: val === '_none' ? '' : val }))
                }
              >
                <SelectTrigger className="text-[14px] text-black font-normal h-8">
                  <SelectValue placeholder="리더 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" className="text-[14px] text-black font-normal">
                    미지정
                  </SelectItem>
                  {deptStaffData?.data?.map((staff) => (
                    <SelectItem
                      key={staff.id}
                      value={staff.id}
                      className="text-[14px] text-black font-normal"
                    >
                      {staff.name}
                      {staff.position ? ` (${staff.position})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">설명</Label>
              <Textarea
                className="text-[14px] text-black font-normal min-h-[60px] resize-none"
                placeholder="팀에 대한 설명을 입력하세요"
                value={teamForm.description}
                onChange={(e) => setTeamForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">정렬 순서</Label>
                <Input
                  type="number"
                  className="text-[14px] text-black font-normal h-8"
                  value={teamForm.sortOrder}
                  onChange={(e) =>
                    setTeamForm((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">활성 상태</Label>
                <div className="flex items-center gap-2 h-8">
                  <Switch
                    checked={teamForm.isActive}
                    onCheckedChange={(checked) =>
                      setTeamForm((prev) => ({ ...prev, isActive: checked }))
                    }
                  />
                  <span className="text-[14px] text-black font-normal">
                    {teamForm.isActive ? '활성' : '비활성'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="text-[14px] h-8"
              onClick={() => setTeamDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              className="text-[14px] h-8"
              onClick={handleTeamSubmit}
              disabled={createTeam.isPending || updateTeam.isPending}
            >
              {(createTeam.isPending || updateTeam.isPending) && (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              )}
              {editingTeam ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== 팀 멤버 관리 다이얼로그 ==================== */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[14px] text-black font-normal flex items-center gap-2">
              <Users className="h-4 w-4" />
              팀 멤버 관리
              {selectedTeamDetail && (
                <Badge variant="outline" className="text-[10px] ml-1">
                  {selectedTeamDetail.name}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              팀 멤버를 추가/제외하고 리더를 지정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 현재 멤버 */}
            <div>
              <h4 className="text-[14px] text-black font-normal mb-2 flex items-center gap-1">
                현재 멤버
                <Badge variant="secondary" className="text-[10px]">
                  {selectedTeamDetail?.staff?.length || 0}명
                </Badge>
              </h4>
              {!selectedTeamDetail?.staff || selectedTeamDetail.staff.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-md">
                  <p className="text-[14px] text-black font-normal opacity-60">
                    배정된 멤버가 없습니다
                  </p>
                </div>
              ) : (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[14px] text-black font-normal">이름</TableHead>
                        <TableHead className="text-[14px] text-black font-normal">직책</TableHead>
                        <TableHead className="text-[14px] text-black font-normal text-center w-16">
                          리더
                        </TableHead>
                        <TableHead className="text-[14px] text-black font-normal text-right w-20">
                          작업
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTeamDetail.staff.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="text-[14px] text-black font-normal">
                            <span className="flex items-center gap-1">
                              {selectedTeamDetail.leaderId === member.id && (
                                <Crown className="h-3 w-3 text-amber-500" />
                              )}
                              {member.name}
                            </span>
                          </TableCell>
                          <TableCell className="text-[14px] text-black font-normal">
                            {member.position || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {selectedTeamDetail.leaderId === member.id ? (
                              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 hover:bg-amber-100">
                                리더
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] h-5 px-1.5"
                                onClick={() => handleSetLeader(member.id)}
                                disabled={setTeamLeader.isPending}
                              >
                                지정
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={removeMember.isPending}
                            >
                              <UserMinus className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <Separator />

            {/* 배정 가능한 직원 */}
            <div>
              <h4 className="text-[14px] text-black font-normal mb-2 flex items-center gap-1">
                배정 가능한 직원
                <Badge variant="secondary" className="text-[10px]">
                  {availableForAssign.length}명
                </Badge>
              </h4>
              {availableForAssign.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-md">
                  <p className="text-[14px] text-black font-normal opacity-60">
                    배정 가능한 직원이 없습니다
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    부서에 직원을 먼저 배치해주세요
                  </p>
                </div>
              ) : (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[14px] text-black font-normal">직원ID</TableHead>
                        <TableHead className="text-[14px] text-black font-normal">이름</TableHead>
                        <TableHead className="text-[14px] text-black font-normal">직책</TableHead>
                        <TableHead className="text-[14px] text-black font-normal text-right w-16">
                          추가
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableForAssign.map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell className="text-[14px] text-black font-normal font-mono">
                            {staff.staffId}
                          </TableCell>
                          <TableCell className="text-[14px] text-black font-normal">
                            {staff.name}
                          </TableCell>
                          <TableCell className="text-[14px] text-black font-normal">
                            {staff.position || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-blue-600 hover:text-blue-700"
                              onClick={() => handleAssignMember(staff.id)}
                              disabled={assignMembers.isPending}
                            >
                              <UserPlus className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="text-[14px] h-8"
              onClick={() => setMembersDialogOpen(false)}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== 부서 삭제 확인 다이얼로그 ==================== */}
      <Dialog open={!!deleteDeptConfirm} onOpenChange={() => setDeleteDeptConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[14px] text-black font-normal">부서 삭제</DialogTitle>
            <DialogDescription className="text-[14px]">
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[14px] text-black font-normal">
              <strong>{deleteDeptConfirm?.name}</strong> 부서를 삭제하시겠습니까?
            </p>
            {deleteDeptConfirm && (deleteDeptConfirm._count?.staff || 0) > 0 && (
              <p className="text-[14px] text-destructive mt-2">
                이 부서에 {deleteDeptConfirm._count?.staff}명의 직원이 소속되어 있습니다.
                직원을 먼저 다른 부서로 이동해주세요.
              </p>
            )}
            {deleteDeptConfirm && (deleteDeptConfirm._count?.teams || 0) > 0 && (
              <p className="text-[14px] text-destructive mt-1">
                이 부서에 {deleteDeptConfirm._count?.teams}개의 팀이 등록되어 있습니다.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="text-[14px] h-8"
              onClick={() => setDeleteDeptConfirm(null)}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              className="text-[14px] h-8"
              onClick={handleDeptDelete}
              disabled={deleteDepartment.isPending}
            >
              {deleteDepartment.isPending && (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              )}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== 팀 삭제 확인 다이얼로그 ==================== */}
      <Dialog open={!!deleteTeamConfirm} onOpenChange={() => setDeleteTeamConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[14px] text-black font-normal">팀 삭제</DialogTitle>
            <DialogDescription className="text-[14px]">
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[14px] text-black font-normal">
              <strong>{deleteTeamConfirm?.name}</strong> 팀을 삭제하시겠습니까?
            </p>
            {deleteTeamConfirm && (deleteTeamConfirm._count?.staff || 0) > 0 && (
              <p className="text-[14px] text-destructive mt-2">
                이 팀에 {deleteTeamConfirm._count?.staff}명의 멤버가 소속되어 있습니다.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="text-[14px] h-8"
              onClick={() => setDeleteTeamConfirm(null)}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              className="text-[14px] h-8"
              onClick={handleTeamDelete}
              disabled={deleteTeam.isPending}
            >
              {deleteTeam.isPending && (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              )}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

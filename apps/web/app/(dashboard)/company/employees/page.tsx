'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  useStaffList,
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useDepartments,
  useBranches,
  useChangeStaffPassword,
  useChangeStaffStatus,
  useIssueTemporaryPassword,
  useBulkImportStaff,
  useToggleSuperAdmin,
} from '@/hooks/use-staff';
import { useTeams } from '@/hooks/use-team';
import { useEntityAuditLogs } from '@/hooks/use-audit-log';
import { useImpersonateStaff } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { Staff, CreateStaffRequest, AuditLog, MENU_PERMISSIONS, CATEGORY_PERMISSIONS } from '@/lib/types/staff';
import { AddressSearch } from '@/components/address-search';
import { DepartmentSelect } from '@/components/department-select';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  User,
  Building2,
  Shield,
  Key,
  Loader2,
  AlertCircle,
  Check,
  X,
  Globe,
  LogIn,
  Upload,
  KeyRound,
  Power,
  History,
  FileText,
  MoreHorizontal,
  Crown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

// 정산등급 목록
const SETTLEMENT_GRADES = Array.from({ length: 16 }, (_, i) => ({
  value: i,
  label: i === 0 ? '0등급 (정산제외)' : `${i}등급`,
}));

export default function EmployeesPage() {
  const { toast } = useToast();
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.isSuperAdmin === true;
  const canManageStaff = isSuperAdmin || (currentUser?.canEditMemberInfo === true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // 검색 디바운스 (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Staff | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [impersonateConfirm, setImpersonateConfirm] = useState<Staff | null>(null);

  // Phase 9: 추가 상태
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [bulkParsedRows, setBulkParsedRows] = useState<CreateStaffRequest[]>([]);
  const [bulkParseError, setBulkParseError] = useState('');
  const [tempPasswordTarget, setTempPasswordTarget] = useState<Staff | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<Staff | null>(null);
  const [statusChangeValue, setStatusChangeValue] = useState('');
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [auditLogTarget, setAuditLogTarget] = useState<Staff | null>(null);
  const [superAdminToggleTarget, setSuperAdminToggleTarget] = useState<Staff | null>(null);
  const [superAdminToggleValue, setSuperAdminToggleValue] = useState(false);

  // Queries
  const { data: staffData, isLoading, error } = useStaffList({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    departmentId: departmentFilter !== 'all' ? departmentFilter : undefined,
    teamId: teamFilter !== 'all' ? teamFilter : undefined,
  });
  const { data: departments } = useDepartments();
  const { data: branches } = useBranches(true); // 활성 지점만 조회
  const { data: teams } = useTeams(
    departmentFilter !== 'all' ? { departmentId: departmentFilter } : undefined,
  );

  // 감사 로그 조회 (타겟이 설정된 경우)
  const { data: auditLogData } = useEntityAuditLogs(
    'staff',
    auditLogTarget?.id || '',
    { limit: 20 },
  );

  // Mutations
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const changePassword = useChangeStaffPassword();
  const impersonateStaff = useImpersonateStaff();
  const changeStatus = useChangeStaffStatus();
  const issueTempPassword = useIssueTemporaryPassword();
  const bulkImport = useBulkImportStaff();
  const toggleSuperAdmin = useToggleSuperAdmin();

  // 상세 정보 조회 (수정 시)
  const { data: staffDetail } = useStaff(editingStaff?.id || '');

  // 폼 상태
  const [formData, setFormData] = useState<CreateStaffRequest>({
    staffId: '',
    password: '',
    name: '',
    branchId: '',
    departmentId: '',
    position: '',
    phone: '',
    mobile: '',
    email: '',
    postalCode: '',
    address: '',
    addressDetail: '',
    settlementGrade: 1,
    allowedIps: [],
    isSuperAdmin: false,
    canEditInManagerView: false,
    canLoginAsManager: false,
    canChangeDepositStage: false,
    canChangeReceptionStage: false,
    canChangeCancelStage: false,
    canEditMemberInfo: false,
    canViewSettlement: false,
    canChangeOrderAmount: false,
    memberViewScope: 'own',
    salesViewScope: 'own',
    isPersonal: false,
    isDepartment: true,
    isCompany: false,
    menuPermissions: {},
    categoryPermissions: {},
    isActive: true,
    adminMemo: '',
  });

  // IP 입력 상태
  const [newIp, setNewIp] = useState('');

  const handleOpenDialog = (staff?: Staff) => {
    if (staff) {
      setEditingStaff(staff);
      setFormData({
        staffId: staff.staffId,
        password: '', // 비밀번호는 수정 시 빈 값
        name: staff.name,
        branchId: staff.branchId || '',
        departmentId: staff.departmentId || '',
        position: staff.position || '',
        phone: staff.phone || '',
        mobile: staff.mobile || '',
        email: staff.email || '',
        postalCode: staff.postalCode || '',
        address: staff.address || '',
        addressDetail: staff.addressDetail || '',
        settlementGrade: staff.settlementGrade,
        allowedIps: staff.allowedIps || [],
        isSuperAdmin: staff.isSuperAdmin ?? false,
        canEditInManagerView: staff.canEditInManagerView,
        canLoginAsManager: staff.canLoginAsManager,
        canChangeDepositStage: staff.canChangeDepositStage,
        canChangeReceptionStage: staff.canChangeReceptionStage,
        canChangeCancelStage: staff.canChangeCancelStage,
        canEditMemberInfo: staff.canEditMemberInfo,
        canViewSettlement: staff.canViewSettlement,
        canChangeOrderAmount: staff.canChangeOrderAmount,
        memberViewScope: staff.memberViewScope,
        salesViewScope: staff.salesViewScope,
        isPersonal: staff.isPersonal,
        isDepartment: staff.isDepartment,
        isCompany: staff.isCompany,
        menuPermissions: staff.menuPermissions || {},
        categoryPermissions: staff.categoryPermissions || {},
        isActive: staff.isActive,
        adminMemo: staff.adminMemo || '',
      });
    } else {
      setEditingStaff(null);
      setFormData({
        staffId: '',
        password: '',
        name: '',
        branchId: '',
        departmentId: '',
        position: '',
        phone: '',
        mobile: '',
        email: '',
        postalCode: '',
        address: '',
        addressDetail: '',
        settlementGrade: 1,
        allowedIps: [],
        isSuperAdmin: false,
        canEditInManagerView: false,
        canLoginAsManager: false,
        canChangeDepositStage: false,
        canChangeReceptionStage: false,
        canChangeCancelStage: false,
        canEditMemberInfo: false,
        canViewSettlement: false,
        canChangeOrderAmount: false,
        memberViewScope: 'own',
        salesViewScope: 'own',
        isPersonal: false,
        isDepartment: true,
        isCompany: false,
        menuPermissions: {},
        categoryPermissions: {},
        isActive: true,
        adminMemo: '',
      });
    }
    setActiveTab('basic');
    setIsDialogOpen(true);
  };

  const handleAddressComplete = (data: { postalCode: string; address: string }) => {
    setFormData((prev) => ({
      ...prev,
      postalCode: data.postalCode,
      address: data.address,
    }));
  };

  const handleAddIp = () => {
    if (!newIp.trim()) return;

    // IP 형식 검증
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newIp.trim())) {
      toast({
        title: '오류',
        description: '올바른 IP 형식이 아닙니다 (예: 192.168.0.1)',
        variant: 'destructive',
      });
      return;
    }

    if (formData.allowedIps?.includes(newIp.trim())) {
      toast({
        title: '오류',
        description: '이미 추가된 IP입니다',
        variant: 'destructive',
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      allowedIps: [...(prev.allowedIps || []), newIp.trim()],
    }));
    setNewIp('');
  };

  const handleRemoveIp = (ip: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedIps: prev.allowedIps?.filter((i) => i !== ip) || [],
    }));
  };

  const handleMenuPermissionChange = (code: string, checked: boolean) => {
    setFormData((prev) => {
      const newPermissions = { ...prev.menuPermissions };
      if (checked) {
        newPermissions[code] = { menuCode: code, canView: true };
      } else {
        delete newPermissions[code];
      }
      return {
        ...prev,
        menuPermissions: newPermissions,
      };
    });
  };

  const handleCategoryPermissionChange = (code: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      categoryPermissions: {
        ...prev.categoryPermissions,
        [code]: checked,
      },
    }));
  };

  // 메뉴 권한 전체선택/해제
  const handleMenuPermissionSelectAll = (checked: boolean) => {
    setFormData((prev) => {
      const newPermissions: typeof prev.menuPermissions = {};
      if (checked) {
        Object.values(MENU_PERMISSIONS).forEach((item) => {
          newPermissions[item.code] = { menuCode: item.code, canView: true };
        });
      }
      return {
        ...prev,
        menuPermissions: newPermissions,
      };
    });
  };

  // 카테고리 권한 전체선택/해제
  const handleCategoryPermissionSelectAll = (checked: boolean) => {
    setFormData((prev) => {
      const newPermissions: typeof prev.categoryPermissions = {};
      if (checked) {
        Object.values(CATEGORY_PERMISSIONS).forEach((item) => {
          newPermissions[item.code] = true;
        });
      }
      return {
        ...prev,
        categoryPermissions: newPermissions,
      };
    });
  };

  // 메뉴 권한 전체 선택 여부 확인
  const isAllMenuPermissionsSelected =
    Object.keys(MENU_PERMISSIONS).length > 0 &&
    Object.values(MENU_PERMISSIONS).every((item) => !!formData.menuPermissions?.[item.code]);

  // 카테고리 권한 전체 선택 여부 확인
  const isAllCategoryPermissionsSelected =
    Object.keys(CATEGORY_PERMISSIONS).length > 0 &&
    Object.values(CATEGORY_PERMISSIONS).every((item) => !!formData.categoryPermissions?.[item.code]);

  const handleSubmit = async () => {
    if (!formData.staffId.trim()) {
      toast({
        title: '오류',
        description: '직원 ID를 입력해주세요',
        variant: 'destructive',
      });
      return;
    }

    // staffId 형식 검증 (영문, 숫자, 언더스코어만 허용)
    if (!/^[a-zA-Z0-9_]+$/.test(formData.staffId.trim())) {
      toast({
        title: '오류',
        description: '직원 ID는 영문, 숫자, 언더스코어만 사용 가능합니다',
        variant: 'destructive',
      });
      return;
    }

    if (formData.staffId.trim().length < 2) {
      toast({
        title: '오류',
        description: '직원 ID는 최소 2자 이상이어야 합니다',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: '오류',
        description: '이름을 입력해주세요',
        variant: 'destructive',
      });
      return;
    }

    if (!editingStaff && !formData.password) {
      toast({
        title: '오류',
        description: '비밀번호를 입력해주세요',
        variant: 'destructive',
      });
      return;
    }

    if (!editingStaff && formData.password && formData.password.length < 4) {
      toast({
        title: '오류',
        description: '비밀번호는 최소 4자 이상이어야 합니다',
        variant: 'destructive',
      });
      return;
    }

    // 이메일 형식 검증 (입력된 경우)
    if (formData.email && formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast({
        title: '오류',
        description: '올바른 이메일 형식이 아닙니다',
        variant: 'destructive',
      });
      return;
    }

    try {
      const submitData = {
        ...formData,
        branchId: formData.branchId || undefined,
        departmentId: formData.departmentId || undefined,
        password: formData.password || undefined, // 비어있으면 제외
      };

      if (editingStaff) {
        await updateStaff.mutateAsync({ id: editingStaff.id, data: submitData });
        toast({
          title: '성공',
          description: '직원 정보가 수정되었습니다',
        });
      } else {
        await createStaff.mutateAsync(submitData as CreateStaffRequest);
        toast({
          title: '성공',
          description: '직원이 등록되었습니다',
        });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '오류가 발생했습니다',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteStaff.mutateAsync(deleteConfirm.id);
      toast({
        title: '성공',
        description: '직원이 삭제되었습니다',
      });
      setDeleteConfirm(null);
    } catch (error) {
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="직원 관리"
        description="직원 정보와 접근 권한을 관리합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '회사정보', href: '/company' },
          { label: '직원 관리' },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            직원 목록
          </CardTitle>
          {canManageStaff && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                일괄등록
              </Button>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                직원 등록
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* 필터 영역 */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름, 직원ID 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setTeamFilter('all'); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="부서" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 부서</SelectItem>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="팀" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 팀</SelectItem>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 테이블 */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              데이터를 불러오는데 실패했습니다.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>직원ID</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>소속</TableHead>
                    <TableHead>부서</TableHead>
                    <TableHead>팀</TableHead>
                    <TableHead>직책</TableHead>
                    <TableHead className="text-center">정산등급</TableHead>
                    <TableHead className="text-center">관리자 로그인</TableHead>
                    <TableHead className="text-center">최고관리자</TableHead>
                    <TableHead className="text-center">상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        등록된 직원이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffData?.data?.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-mono">{staff.staffId}</TableCell>
                        <TableCell className="font-medium">
                          {isSuperAdmin && staff.id !== currentUser?.id ? (
                            <button
                              type="button"
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                              onClick={() => setImpersonateConfirm(staff)}
                              title={`${staff.name}(으)로 로그인`}
                            >
                              {staff.name}
                              <LogIn className="h-3 w-3" />
                            </button>
                          ) : (
                            <span>{staff.name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {staff.branch ? (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {staff.branch.branchName}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{staff.department?.name || '-'}</TableCell>
                        <TableCell>{staff.team?.name || '-'}</TableCell>
                        <TableCell>{staff.position || '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={staff.settlementGrade === 0 ? 'secondary' : 'default'}>
                            {staff.settlementGrade}등급
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {staff.canLoginAsManager ? (
                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-gray-300 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {staff.isSuperAdmin ? (
                            <Crown className="h-4 w-4 text-yellow-500 mx-auto" />
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={staff.isActive ? 'default' : 'secondary'}>
                            {staff.isActive ? '활성' : '비활성'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(staff)}
                              title="수정"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canManageStaff && (
                                  <DropdownMenuItem onClick={() => setTempPasswordTarget(staff)}>
                                    <KeyRound className="h-4 w-4 mr-2" />
                                    임시 비밀번호 발급
                                  </DropdownMenuItem>
                                )}
                                {canManageStaff && (
                                  <DropdownMenuItem onClick={() => {
                                    setStatusChangeTarget(staff);
                                    setStatusChangeValue(staff.isActive ? 'suspended' : 'active');
                                    setStatusChangeReason('');
                                  }}>
                                    <Power className="h-4 w-4 mr-2" />
                                    상태 변경
                                  </DropdownMenuItem>
                                )}
                                {isSuperAdmin && staff.id !== currentUser?.id && (
                                  <DropdownMenuItem onClick={() => {
                                    setSuperAdminToggleTarget(staff);
                                    setSuperAdminToggleValue(!staff.isSuperAdmin);
                                  }}>
                                    <Crown className="h-4 w-4 mr-2" />
                                    {staff.isSuperAdmin ? '최고관리자 해제' : '최고관리자 지정'}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => setAuditLogTarget(staff)}>
                                  <History className="h-4 w-4 mr-2" />
                                  변경 이력
                                </DropdownMenuItem>
                                {canManageStaff && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setDeleteConfirm(staff)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    삭제
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* 페이지네이션 */}
              {staffData?.meta && staffData.meta.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    이전
                  </Button>
                  <span className="flex items-center px-4 text-sm">
                    {page} / {staffData.meta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === staffData.meta.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    다음
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 직원 추가/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {editingStaff ? '정보수정' : '직원 등록'}
            </DialogTitle>
            <DialogDescription>
              {editingStaff
                ? `${editingStaff.staffId} / ${editingStaff.name} 직원의 정보를 수정합니다.`
                : '새 직원을 등록합니다.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">기본정보</TabsTrigger>
              <TabsTrigger value="permissions">권한설정</TabsTrigger>
              <TabsTrigger value="access">접근권한</TabsTrigger>
            </TabsList>

            {/* 기본정보 탭 */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* 계정 정보 */}
              <div className="p-4 border rounded-lg bg-cyan-50 dark:bg-cyan-950">
                <h3 className="font-semibold mb-4 text-cyan-700 dark:text-cyan-300">계정 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="staffId">직원 ID *</Label>
                    <Input
                      id="staffId"
                      value={formData.staffId}
                      onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                      placeholder="smsl1122"
                      disabled={!!editingStaff}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      {editingStaff ? '비밀번호 변경' : '비밀번호 *'}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingStaff ? '변경시에만 입력' : '비밀번호 입력'}
                    />
                    <p className="text-xs text-muted-foreground">
                      숫자와 영문의 조합으로 4자 ~ 16자 크기로 해주세요. 변경을 원치 않으실때는 비워두세요
                    </p>
                  </div>
                </div>
              </div>

              {/* 인적 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">실명 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="송민석"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchId">소속선택</Label>
                  <Select
                    value={formData.branchId || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, branchId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="소속 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">---소속---</SelectItem>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.branchName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    ※ 본사 또는 외주업체 (업체로그인시 사용)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="settlementGrade">정산등급</Label>
                  <Select
                    value={String(formData.settlementGrade)}
                    onValueChange={(v) => setFormData({ ...formData, settlementGrade: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SETTLEMENT_GRADES.map((grade) => (
                        <SelectItem key={grade.value} value={String(grade.value)}>
                          {grade.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    ※ 0등급은 정산이 되지 않는 등급입니다.
                  </p>
                </div>
                <div className="space-y-2">
                  <DepartmentSelect
                    value={formData.departmentId || ''}
                    onChange={(v) => setFormData({ ...formData, departmentId: v })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position">직책</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="대리"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <PhoneInput
                    id="phone"
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    placeholder="055-000-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">핸드폰번호</Label>
                  <PhoneInput
                    id="mobile"
                    value={formData.mobile}
                    onChange={(value) => setFormData({ ...formData, mobile: value })}
                    placeholder="010-0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">e-Mail</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              {/* 주소 입력 */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-semibold">주소</Label>
                  <AddressSearch onComplete={handleAddressComplete} size="sm" />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">우편번호</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label htmlFor="address">주소</Label>
                    <Input id="address" value={formData.address} readOnly className="bg-muted" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressDetail">상세주소</Label>
                  <Input
                    id="addressDetail"
                    value={formData.addressDetail}
                    onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
                    placeholder="(참고주소)"
                  />
                </div>
              </div>

              {/* 입사일 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="joinDate">입사일</Label>
                  <Input
                    id="joinDate"
                    type="date"
                    value={formData.joinDate?.split('T')[0] || ''}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                  />
                </div>
              </div>

              {/* 직원 공개 범위 */}
              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                <h3 className="font-semibold mb-4 text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  직원 공개 범위
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  이 직원 정보를 누가 볼 수 있는지 설정합니다. (일정 관리와 동일한 방식)
                </p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.isPersonal}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          isPersonal: !!checked,
                          isDepartment: false,
                          isCompany: false
                        })
                      }
                    />
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">개인</span>
                    <span className="text-xs text-muted-foreground">(본인만)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.isDepartment}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          isPersonal: false,
                          isDepartment: !!checked,
                          isCompany: false
                        })
                      }
                    />
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">부서</span>
                    <span className="text-xs text-muted-foreground">(같은 부서)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.isCompany}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          isPersonal: false,
                          isDepartment: false,
                          isCompany: !!checked
                        })
                      }
                    />
                    <Globe className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">전체</span>
                    <span className="text-xs text-muted-foreground">(모든 직원)</span>
                  </label>
                </div>
              </div>

              {/* 최고 관리자 메모 */}
              <div className="space-y-2">
                <Label htmlFor="adminMemo">최고 관리자 메모</Label>
                <Textarea
                  id="adminMemo"
                  value={formData.adminMemo}
                  onChange={(e) => setFormData({ ...formData, adminMemo: e.target.value })}
                  placeholder="관리자만 볼 수 있는 메모"
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* 권한설정 탭 */}
            <TabsContent value="permissions" className="space-y-4 mt-4">
              {/* 최고관리자 권한 (최고관리자만 설정 가능) */}
              {isSuperAdmin && (
                <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950">
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-red-700 dark:text-red-300">
                    <Shield className="h-4 w-4" />
                    최고관리자 권한
                  </h3>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isSuperAdmin"
                      checked={formData.isSuperAdmin}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isSuperAdmin: checked === true })
                      }
                    />
                    <Label htmlFor="isSuperAdmin" className="text-sm">
                      최고관리자로 지정 (다른 직원으로 대리 로그인, 권한 부여 가능)
                    </Label>
                  </div>
                </div>
              )}

              {/* IP 접근 제한 */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  접근아이피 제한
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="IP 주소 입력 (예: 1.212.201.147)"
                      value={newIp}
                      onChange={(e) => setNewIp(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddIp()}
                    />
                    <Button type="button" onClick={handleAddIp}>
                      추가
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ※ 입력된 아이피에서만 접근이 가능합니다. (비어있으면 모든 IP 허용)
                  </p>
                  {formData.allowedIps && formData.allowedIps.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.allowedIps.map((ip) => (
                        <Badge key={ip} variant="secondary" className="flex items-center gap-1">
                          {ip}
                          <button
                            type="button"
                            aria-label={`IP ${ip} 삭제`}
                            onClick={() => handleRemoveIp(ip)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 단계변경 권한 */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-4">단계변경 권한</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="canChangeDepositStage"
                      checked={formData.canChangeDepositStage}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, canChangeDepositStage: checked === true })
                      }
                    />
                    <Label htmlFor="canChangeDepositStage" className="text-sm">
                      ※ 입금대기 주문건에대해 단계변경이 가능합니다.
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="canChangeReceptionStage"
                      checked={formData.canChangeReceptionStage}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, canChangeReceptionStage: checked === true })
                      }
                    />
                    <Label htmlFor="canChangeReceptionStage" className="text-sm">
                      ※ 접수대기 주문건에대해 단계변경이 가능합니다.
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="canChangeCancelStage"
                      checked={formData.canChangeCancelStage}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, canChangeCancelStage: checked === true })
                      }
                    />
                    <Label htmlFor="canChangeCancelStage" className="text-sm">
                      ※ 주문취소 주문건에대해 단계변경이 가능합니다.
                    </Label>
                  </div>
                </div>
              </div>

              {/* 직원 관리 권한 */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-4">직원 관리 권한</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="canEditMemberInfo"
                      checked={formData.canEditMemberInfo}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, canEditMemberInfo: checked === true })
                      }
                    />
                    <Label htmlFor="canEditMemberInfo" className="text-sm">
                      ※ 직원 정보 수정 및 상태변경(활성/비활성)이 가능합니다.
                    </Label>
                  </div>
                </div>
              </div>

              {/* 버튼 노출 권한 */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-4">버튼 노출 권한</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="canViewSettlement"
                      checked={formData.canViewSettlement}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, canViewSettlement: checked === true })
                      }
                    />
                    <Label htmlFor="canViewSettlement" className="text-sm">
                      ※ 정산마감 버튼이 노출 안됩니다.
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="canChangeOrderAmount"
                      checked={formData.canChangeOrderAmount}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, canChangeOrderAmount: checked === true })
                      }
                    />
                    <Label htmlFor="canChangeOrderAmount" className="text-sm">
                      ※ 주문금액변경 버튼이 노출 안됩니다.
                    </Label>
                  </div>
                </div>
              </div>

              {/* 조회 범위 */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-4">조회 범위</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>회원 조회 범위</Label>
                    <Select
                      value={formData.memberViewScope}
                      onValueChange={(v) => setFormData({ ...formData, memberViewScope: v as 'own' | 'all' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="own">본인 담당 회원만</SelectItem>
                        <SelectItem value="all">전체 회원</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>매출 조회 범위</Label>
                    <Select
                      value={formData.salesViewScope}
                      onValueChange={(v) => setFormData({ ...formData, salesViewScope: v as 'own' | 'all' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="own">본인 거래처만</SelectItem>
                        <SelectItem value="all">전체 거래처</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 접근권한 탭 */}
            <TabsContent value="access" className="space-y-4 mt-4">
              {/* 메뉴 접근 권한 */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">메뉴 접근 권한</h3>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="menu-select-all"
                      checked={isAllMenuPermissionsSelected}
                      onCheckedChange={(checked) => handleMenuPermissionSelectAll(checked === true)}
                    />
                    <Label htmlFor="menu-select-all" className="text-sm font-medium text-blue-600 cursor-pointer">
                      전체선택
                    </Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  ※ 하위메뉴(검정 글씨)선택 하실 때는 앞쪽에 상위메뉴(파란글씨)를 체크해주세요.
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(MENU_PERMISSIONS).map(([key, item]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={`menu-${key}`}
                        checked={!!formData.menuPermissions?.[item.code]}
                        onCheckedChange={(checked) =>
                          handleMenuPermissionChange(item.code, checked === true)
                        }
                      />
                      <Label htmlFor={`menu-${key}`} className="text-sm">
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 카테고리 접근 권한 */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">카테고리 접근 권한</h3>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="category-select-all"
                      checked={isAllCategoryPermissionsSelected}
                      onCheckedChange={(checked) => handleCategoryPermissionSelectAll(checked === true)}
                    />
                    <Label htmlFor="category-select-all" className="text-sm font-medium text-blue-600 cursor-pointer">
                      전체선택
                    </Label>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-4">
                  {Object.entries(CATEGORY_PERMISSIONS).map(([key, item]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={`cat-${key}`}
                        checked={!!formData.categoryPermissions?.[item.code]}
                        onCheckedChange={(checked) =>
                          handleCategoryPermissionChange(item.code, checked === true)
                        }
                      />
                      <Label htmlFor={`cat-${key}`} className="text-sm">
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              돌아가기
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createStaff.isPending || updateStaff.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {(createStaff.isPending || updateStaff.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              수정완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>직원 삭제</DialogTitle>
            <DialogDescription>
              &apos;{deleteConfirm?.name}&apos; 직원을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteStaff.isPending}
            >
              {deleteStaff.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 대리 로그인 확인 다이얼로그 */}
      <Dialog open={!!impersonateConfirm} onOpenChange={() => setImpersonateConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              대리 로그인
            </DialogTitle>
            <DialogDescription>
              &apos;{impersonateConfirm?.name}&apos; ({impersonateConfirm?.staffId}) 직원으로 로그인하시겠습니까?
              <br />
              현재 세션이 해당 직원의 권한으로 전환됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersonateConfirm(null)}>
              취소
            </Button>
            <Button
              onClick={() => {
                if (impersonateConfirm) {
                  impersonateStaff.mutate(impersonateConfirm.id, {
                    onSuccess: () => {
                      toast({
                        title: '대리 로그인',
                        description: `${impersonateConfirm.name} 직원으로 로그인되었습니다`,
                      });
                      setImpersonateConfirm(null);
                    },
                    onError: (error) => {
                      toast({
                        title: '오류',
                        description: error instanceof Error ? error.message : '대리 로그인에 실패했습니다',
                        variant: 'destructive',
                      });
                    },
                  });
                }
              }}
              disabled={impersonateStaff.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {impersonateStaff.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              로그인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 일괄등록 다이얼로그 */}
      <Dialog open={bulkImportOpen} onOpenChange={(open) => {
        setBulkImportOpen(open);
        if (!open) { setBulkCsvText(''); setBulkParsedRows([]); setBulkParseError(''); }
      }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              직원 일괄등록
            </DialogTitle>
            <DialogDescription>
              CSV 형식으로 직원 데이터를 입력하세요. 첫 줄은 헤더입니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-[11px] text-black font-normal mb-1">CSV 형식 예시 (staffId, password, name은 필수):</p>
              <pre className="text-[10px] text-gray-600 whitespace-pre-wrap">staffId,password,name,position,email,phone
hong01,pass1234,홍길동,대리,hong@email.com,010-1234-5678
kim01,pass1234,김철수,과장,kim@email.com,010-2345-6789</pre>
            </div>

            <Textarea
              value={bulkCsvText}
              onChange={(e) => setBulkCsvText(e.target.value)}
              placeholder="CSV 데이터를 여기에 붙여넣으세요..."
              rows={8}
              className="font-mono text-xs"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                  const lines = bulkCsvText.trim().split('\n');
                  if (lines.length < 2) { setBulkParseError('최소 2줄 이상 필요합니다 (헤더 + 데이터)'); return; }
                  const headers = lines[0].split(',').map(h => h.trim());
                  const requiredFields = ['staffId', 'password', 'name'];
                  const missing = requiredFields.filter(f => !headers.includes(f));
                  if (missing.length > 0) { setBulkParseError(`필수 필드 누락: ${missing.join(', ')}`); return; }
                  const rows: CreateStaffRequest[] = [];
                  for (let i = 1; i < lines.length; i++) {
                    const vals = lines[i].split(',').map(v => v.trim());
                    if (vals.length < headers.length) continue;
                    const row: any = {};
                    headers.forEach((h, idx) => { if (vals[idx]) row[h] = vals[idx]; });
                    rows.push(row as CreateStaffRequest);
                  }
                  setBulkParsedRows(rows);
                  setBulkParseError('');
                } catch { setBulkParseError('CSV 파싱 중 오류가 발생했습니다'); }
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              CSV 파싱
            </Button>

            {bulkParseError && (
              <div className="text-destructive text-[11px] flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {bulkParseError}
              </div>
            )}

            {bulkParsedRows.length > 0 && (
              <div className="border rounded-lg overflow-auto max-h-60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>직원ID</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>직책</TableHead>
                      <TableHead>이메일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkParsedRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-[11px]">{i + 1}</TableCell>
                        <TableCell className="text-[11px] font-mono">{row.staffId}</TableCell>
                        <TableCell className="text-[11px]">{row.name}</TableCell>
                        <TableCell className="text-[11px]">{row.position || '-'}</TableCell>
                        <TableCell className="text-[11px]">{row.email || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-2 bg-muted text-[11px] text-black font-normal">
                  총 {bulkParsedRows.length}건
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkImportOpen(false)}>
              취소
            </Button>
            <Button
              disabled={bulkParsedRows.length === 0 || bulkImport.isPending}
              onClick={async () => {
                try {
                  const result = await bulkImport.mutateAsync(bulkParsedRows);
                  toast({
                    title: '일괄등록 완료',
                    description: `${result.imported}건 등록 완료${result.errors.length > 0 ? `, ${result.errors.length}건 오류` : ''}`,
                  });
                  if (result.errors.length > 0) {
                    setBulkParseError(`오류 ${result.errors.length}건: ${result.errors.map(e => `[${e.row}] ${e.message}`).join(', ')}`);
                  } else {
                    setBulkImportOpen(false);
                  }
                } catch (error) {
                  toast({
                    title: '오류',
                    description: error instanceof Error ? error.message : '일괄등록 중 오류',
                    variant: 'destructive',
                  });
                }
              }}
            >
              {bulkImport.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {bulkParsedRows.length}건 등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 임시 비밀번호 발급 다이얼로그 */}
      <Dialog open={!!tempPasswordTarget} onOpenChange={() => setTempPasswordTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              임시 비밀번호 발급
            </DialogTitle>
            <DialogDescription>
              &apos;{tempPasswordTarget?.name}&apos; ({tempPasswordTarget?.staffId}) 직원에게 임시 비밀번호를 발급합니다.
              {tempPasswordTarget?.email && (
                <><br />이메일({tempPasswordTarget.email})로 발송됩니다.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTempPasswordTarget(null)}>
              취소
            </Button>
            <Button
              onClick={async () => {
                if (!tempPasswordTarget) return;
                try {
                  const result = await issueTempPassword.mutateAsync(tempPasswordTarget.id);
                  toast({
                    title: '임시 비밀번호 발급',
                    description: result.temporaryPassword
                      ? `임시 비밀번호: ${result.temporaryPassword}`
                      : result.message,
                  });
                  setTempPasswordTarget(null);
                } catch (error) {
                  toast({
                    title: '오류',
                    description: error instanceof Error ? error.message : '발급 실패',
                    variant: 'destructive',
                  });
                }
              }}
              disabled={issueTempPassword.isPending}
            >
              {issueTempPassword.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              발급
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 상태 변경 다이얼로그 */}
      <Dialog open={!!statusChangeTarget} onOpenChange={() => setStatusChangeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className="h-5 w-5" />
              직원 상태 변경
            </DialogTitle>
            <DialogDescription>
              &apos;{statusChangeTarget?.name}&apos; ({statusChangeTarget?.staffId}) 직원의 상태를 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>변경할 상태</Label>
              <Select value={statusChangeValue} onValueChange={setStatusChangeValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="suspended">정지</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>사유 (선택)</Label>
              <Textarea
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                placeholder="상태 변경 사유를 입력하세요"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusChangeTarget(null)}>
              취소
            </Button>
            <Button
              onClick={async () => {
                if (!statusChangeTarget) return;
                try {
                  await changeStatus.mutateAsync({
                    id: statusChangeTarget.id,
                    status: statusChangeValue,
                    reason: statusChangeReason || undefined,
                  });
                  toast({
                    title: '상태 변경',
                    description: `${statusChangeTarget.name} 직원의 상태가 변경되었습니다`,
                  });
                  setStatusChangeTarget(null);
                } catch (error) {
                  toast({
                    title: '오류',
                    description: error instanceof Error ? error.message : '상태 변경 실패',
                    variant: 'destructive',
                  });
                }
              }}
              disabled={changeStatus.isPending}
            >
              {changeStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 최고관리자 설정 확인 다이얼로그 */}
      <Dialog open={!!superAdminToggleTarget} onOpenChange={() => setSuperAdminToggleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              최고관리자 {superAdminToggleValue ? '지정' : '해제'}
            </DialogTitle>
            <DialogDescription>
              &apos;{superAdminToggleTarget?.name}&apos; ({superAdminToggleTarget?.staffId}) 직원을
              최고관리자로 {superAdminToggleValue ? '지정' : '해제'}하시겠습니까?
              {superAdminToggleValue && (
                <><br /><span className="text-orange-600 font-medium">최고관리자는 모든 작업을 수행할 수 있습니다.</span></>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuperAdminToggleTarget(null)}>
              취소
            </Button>
            <Button
              className={superAdminToggleValue ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
              variant={superAdminToggleValue ? 'default' : 'destructive'}
              onClick={async () => {
                if (!superAdminToggleTarget) return;
                try {
                  await toggleSuperAdmin.mutateAsync({
                    id: superAdminToggleTarget.id,
                    isSuperAdmin: superAdminToggleValue,
                  });
                  toast({
                    title: '최고관리자 설정',
                    description: `${superAdminToggleTarget.name} 직원의 최고관리자 권한이 ${superAdminToggleValue ? '부여' : '해제'}되었습니다`,
                  });
                  setSuperAdminToggleTarget(null);
                } catch (error) {
                  toast({
                    title: '오류',
                    description: error instanceof Error ? error.message : '설정 실패',
                    variant: 'destructive',
                  });
                }
              }}
              disabled={toggleSuperAdmin.isPending}
            >
              {toggleSuperAdmin.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {superAdminToggleValue ? '지정' : '해제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 감사 로그(변경 이력) 다이얼로그 */}
      <Dialog open={!!auditLogTarget} onOpenChange={() => setAuditLogTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              변경 이력 - {auditLogTarget?.name}
            </DialogTitle>
            <DialogDescription>
              {auditLogTarget?.staffId} 직원의 변경 내역입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {auditLogData?.data?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-[11px]">
                변경 이력이 없습니다.
              </div>
            ) : (
              auditLogData?.data?.map((log: AuditLog) => (
                <div key={log.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        log.action === 'create' ? 'default' :
                        log.action === 'delete' ? 'destructive' :
                        'secondary'
                      }>
                        {log.action === 'create' ? '생성' :
                         log.action === 'update' ? '수정' :
                         log.action === 'delete' ? '삭제' :
                         log.action === 'status_change' ? '상태변경' :
                         log.action === 'password_reset' ? '비밀번호초기화' :
                         log.action}
                      </Badge>
                      <span className="text-[11px] text-black font-normal">{log.performerName}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {new Date(log.createdAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="bg-muted rounded p-2 mt-1">
                      {Object.entries(log.changes).map(([key, change]: [string, any]) => (
                        <div key={key} className="text-[10px] text-gray-700">
                          <span className="font-medium">{key}</span>:{' '}
                          <span className="text-red-500 line-through">{String(change.old ?? '-')}</span>
                          {' → '}
                          <span className="text-green-600">{String(change.new ?? '-')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

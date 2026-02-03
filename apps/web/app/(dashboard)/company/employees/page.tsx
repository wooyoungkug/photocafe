'use client';

import { useState } from 'react';
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
} from '@/hooks/use-staff';
import { Staff, CreateStaffRequest, MENU_PERMISSIONS, CATEGORY_PERMISSIONS } from '@/lib/types/staff';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// 정산등급 목록
const SETTLEMENT_GRADES = Array.from({ length: 16 }, (_, i) => ({
  value: i,
  label: i === 0 ? '0등급 (정산제외)' : `${i}등급`,
}));

export default function EmployeesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Staff | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  // Queries
  const { data: staffData, isLoading, error } = useStaffList({
    page,
    limit: 20,
    search: search || undefined,
    departmentId: departmentFilter !== 'all' ? departmentFilter : undefined,
  });
  const { data: departments } = useDepartments();
  const { data: branches } = useBranches(true); // 활성 지점만 조회

  // Mutations
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const changePassword = useChangeStaffPassword();

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

    if (!editingStaff && !formData.password) {
      toast({
        title: '오류',
        description: '비밀번호를 입력해주세요',
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

      console.log('=== 직원 정보 저장 데이터 ===');
      console.log('submitData:', JSON.stringify(submitData, null, 2));
      console.log('menuPermissions:', submitData.menuPermissions);
      console.log('categoryPermissions:', submitData.categoryPermissions);
      console.log('isPersonal:', submitData.isPersonal);
      console.log('isDepartment:', submitData.isDepartment);
      console.log('isCompany:', submitData.isCompany);

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
      console.error('직원 정보 저장 오류:', error);
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
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            직원 등록
          </Button>
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
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
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
                    <TableHead>직책</TableHead>
                    <TableHead className="text-center">정산등급</TableHead>
                    <TableHead className="text-center">관리자 로그인</TableHead>
                    <TableHead className="text-center">상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        등록된 직원이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffData?.data?.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-mono">{staff.staffId}</TableCell>
                        <TableCell className="font-medium">{staff.name}</TableCell>
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
                          <Badge variant={staff.isActive ? 'default' : 'secondary'}>
                            {staff.isActive ? '활성' : '비활성'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(staff)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(staff)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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
                    {editingStaff && (
                      <p className="text-xs text-muted-foreground">
                        비밀번호는 잊으셨을경우 파란소프트로 연락주시거나 변경해서 사용해주세요.
                      </p>
                    )}
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
              {/* 기본 권한 */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  표지공장 로그인
                </h3>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isStaffLogin"
                    checked={false}
                    disabled
                  />
                  <Label htmlFor="isStaffLogin" className="text-sm">
                    표지공장 로그인
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ※ 표지공장은 아래의 접근권한 메뉴가 적용이 안됩니다.
                </p>
              </div>

              {/* View 권한 */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-4">View 권한</h3>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="canEditInManagerView"
                    checked={formData.canEditInManagerView}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, canEditInManagerView: checked === true })
                    }
                  />
                  <Label htmlFor="canEditInManagerView" className="text-sm">
                    체크시 관리자 화면에서 수정가능
                  </Label>
                </div>
              </div>

              {/* 접근 권한 */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-4">접근 권한</h3>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="canLoginAsManager"
                    checked={formData.canLoginAsManager}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, canLoginAsManager: checked === true })
                    }
                  />
                  <Label htmlFor="canLoginAsManager" className="text-sm">
                    체크시 관리자 로그인 허용
                  </Label>
                </div>
              </div>

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

              {/* 버튼 노출 권한 */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-4">버튼 노출 권한</h3>
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
                      ※ 회원수정 버튼이 노출 안됩니다.
                    </Label>
                  </div>
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
    </div>
  );
}

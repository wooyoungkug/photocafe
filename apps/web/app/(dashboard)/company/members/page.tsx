'use client';

import { useState, useMemo, useCallback, useEffect, memo, type ReactNode } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useClients,
  useClientGroups,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useNextClientCode,
} from '@/hooks/use-clients';
import { useClientConsultations } from '@/hooks/use-consultations';
import { useStaffList } from '@/hooks/use-staff';
import { Client, CreateClientDto } from '@/lib/types/client';
import { CONSULTATION_CATEGORY_COLORS, CONSULTATION_STATUS_CONFIG } from '@/lib/types/consultation';
import { AddressSearch } from '@/components/address-search';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  User,
  MapPin,
  CreditCard,
  MessageSquare,
  Users,
  Clock,
  Package,
  Layers,
  Star,
  Palette,
  DollarSign,
  ExternalLink,
  Key,
  UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { CopperPlateTab } from '@/components/members/copper-plate-tab';
import { IndividualPricingTab } from '@/components/members/individual-pricing-tab';
import { api } from '@/lib/api';

// 테이블 행 컴포넌트 메모이제이션
const MemberTableRow = memo(({
  member,
  onEdit,
  onResetPassword,
  onDelete,
  onImpersonate,
  getStatusBadge,
  getCreditBadge,
  managerName
}: {
  member: Client;
  onEdit: (member: Client) => void;
  onResetPassword: (member: Client) => void;
  onDelete: (member: Client) => void;
  onImpersonate: (member: Client) => void;
  getStatusBadge: (status: string) => ReactNode;
  getCreditBadge: (grade?: string) => ReactNode;
  managerName?: string;
}) => {
  return (
    <TableRow className="hover:bg-slate-50/50 transition-colors">
      <TableCell className="text-center">
        <button
          type="button"
          onClick={() => onImpersonate(member)}
          className="group text-left hover:bg-blue-50 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors"
          title="클릭하여 해당 회원으로 쇼핑몰 접속"
        >
          <div className="font-semibold text-blue-600 group-hover:text-blue-800 flex items-center gap-1">
            {member.clientName}
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {member.representative && (
            <div className="text-xs text-muted-foreground">{member.representative}</div>
          )}
        </button>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground text-center">
        {member.email || '-'}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground text-center">
        {member.mobile || member.phone || '-'}
      </TableCell>
      <TableCell className="text-center">
        {member.group ? (
          <span className="text-sm text-blue-600">{member.group.groupName}</span>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">
        {format(new Date(member.createdAt), 'yy.MM.dd')}
      </TableCell>
      <TableCell className="text-center">
        <span className="text-sm font-medium">{member._count?.consultations ?? 0}</span>
      </TableCell>
      <TableCell className="text-center">
        {(member._count?.openConsultations ?? 0) > 0 ? (
          <Badge variant="destructive" className="text-xs px-2">
            {member._count?.openConsultations}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">0</span>
        )}
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">
        {managerName || '-'}
      </TableCell>
      <TableCell className="text-center">{getCreditBadge(member.creditGrade)}</TableCell>
      <TableCell className="text-center">{getStatusBadge(member.status)}</TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(member)}
            className="hover:bg-blue-50 h-7 w-7 p-0"
            title="회원 정보 수정"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onResetPassword(member)}
            className="hover:bg-amber-50 h-7 w-7 p-0"
            title="비밀번호 초기화 (1111)"
          >
            <Key className="h-3.5 w-3.5 text-amber-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(member)}
            className="hover:bg-red-50 h-7 w-7 p-0"
            title="회원 삭제"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});
MemberTableRow.displayName = 'MemberTableRow';

export default function MembersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  // 검색어 디바운스 처리 (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // 검색 시 첫 페이지로
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: membersData, isLoading, error } = useClients({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    groupId: groupFilter !== 'all' ? groupFilter : undefined,
  });

  const { data: groupsData } = useClientGroups({ limit: 100 });
  const { data: staffData } = useStaffList({ limit: 100, isActive: true });
  // 영업담당자 ID → 이름 매핑
  const staffMap = useMemo(() => {
    const map = new Map<string, string>();
    staffData?.data?.forEach((staff) => {
      map.set(staff.id, staff.name);
    });
    return map;
  }, [staffData]);
  // 다이얼로그가 열리고 editingMember가 있을 때만 상담 이력 조회
  const { data: consultations } = useClientConsultations(
    editingMember?.id || '',
    5,
    { enabled: isDialogOpen && !!editingMember?.id }
  );
  const { refetch: refetchNextCode } = useNextClientCode(false);
  const createMember = useCreateClient();
  const updateMember = useUpdateClient();
  const deleteMember = useDeleteClient();

  const [formData, setFormData] = useState<CreateClientDto>({
    clientCode: '',
    clientName: '',
    businessNumber: '',
    representative: '',
    phone: '',
    mobile: '',
    email: '',
    postalCode: '',
    address: '',
    addressDetail: '',
    groupId: '',
    memberType: 'individual',
    creditGrade: 'B',
    paymentTerms: 30,
    paymentCondition: '당월말',
    creditPaymentDay: undefined,
    status: 'active',
    fileRetentionMonths: 3,
    assignedManager: '',
    practicalManagerName: '',
    practicalManagerPhone: '',
    approvalManagerName: '',
    approvalManagerPhone: '',
    adminMemo: '',
  });

  const handleOpenDialog = (member?: Client) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        clientCode: member.clientCode,
        clientName: member.clientName,
        businessNumber: member.businessNumber || '',
        representative: member.representative || '',
        phone: member.phone || '',
        mobile: member.mobile || '',
        email: member.email || '',
        postalCode: member.postalCode || '',
        address: member.address || '',
        addressDetail: member.addressDetail || '',
        groupId: member.groupId || '',
        memberType: member.memberType || 'individual',
        creditGrade: member.creditGrade || 'B',
        paymentTerms: member.paymentTerms || 30,
        paymentCondition: (member.paymentCondition as '당월말' | '익월말' | '2개월여신') || '당월말',
        creditPaymentDay: member.creditPaymentDay,
        status: member.status || 'active',
        fileRetentionMonths: member.fileRetentionMonths ?? 3,
        assignedManager: member.assignedManager || '',
        practicalManagerName: member.practicalManagerName || '',
        practicalManagerPhone: member.practicalManagerPhone || '',
        approvalManagerName: member.approvalManagerName || '',
        approvalManagerPhone: member.approvalManagerPhone || '',
        adminMemo: member.adminMemo || '',
      });
    } else {
      setEditingMember(null);
      // 새 회원 추가 시 다음 코드를 가져옴
      refetchNextCode().then((result) => {
        setFormData({
          clientCode: result.data?.code || '',
          clientName: '',
          businessNumber: '',
          representative: '',
          phone: '',
          mobile: '',
          email: '',
          postalCode: '',
          address: '',
          addressDetail: '',
          groupId: '',
          memberType: 'individual',
          creditGrade: 'B',
          paymentTerms: 30,
          paymentCondition: '당월말',
          creditPaymentDay: undefined,
          status: 'active',
          fileRetentionMonths: 3,
          assignedManager: '',
          practicalManagerName: '',
          practicalManagerPhone: '',
          approvalManagerName: '',
          approvalManagerPhone: '',
          adminMemo: '',
        });
      });
    }
    setActiveTab('basic');
    setIsDialogOpen(true);
  };

  const handleAddressComplete = (data: {
    postalCode: string;
    address: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      postalCode: data.postalCode,
      address: data.address,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.clientCode || !formData.clientName) {
      toast({ title: '필수 항목을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      const submitData = {
        ...formData,
        groupId: formData.groupId || undefined,
        assignedManager: formData.assignedManager || null,
      };

      if (editingMember) {
        await updateMember.mutateAsync({ id: editingMember.id, data: submitData });
        toast({ title: '회원 정보가 수정되었습니다.' });
      } else {
        await createMember.mutateAsync(submitData);
        toast({ title: '회원이 추가되었습니다.' });
      }
      setIsDialogOpen(false);
    } catch (err) {
      toast({ title: '오류가 발생했습니다.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      try {
        await deleteMember.mutateAsync(deleteConfirm.id);
        toast({ title: '회원이 삭제되었습니다.' });
        setDeleteConfirm(null);
      } catch (err) {
        toast({ title: '삭제에 실패했습니다.', variant: 'destructive' });
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">활성</Badge>;
      case 'inactive':
        return <Badge variant="secondary">비활성</Badge>;
      case 'suspended':
        return <Badge variant="destructive">정지</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCreditBadge = (grade?: string) => {
    if (!grade) return null;
    const colors: Record<string, string> = {
      A: 'bg-green-100 text-green-800 border-green-200',
      B: 'bg-blue-100 text-blue-800 border-blue-200',
      C: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      D: 'bg-red-100 text-red-800 border-red-200',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[grade]}`}>
        {grade}등급
      </span>
    );
  };

  // 대리 로그인 (회원으로 로그인된 쇼핑몰 새 창 열기)
  const handleImpersonate = async (member: Client) => {
    try {
      const result = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; name: string; email: string; clientId?: string };
      }>(`/auth/impersonate/${member.id}`);

      // 새 창에서 쇼핑몰 열기 (토큰을 URL 파라미터로 전달)
      const shopUrl = `/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}&userId=${result.user.id}&userName=${encodeURIComponent(result.user.name)}&userEmail=${encodeURIComponent(result.user.email || '')}&clientId=${result.user.clientId || result.user.id}&impersonated=true`;
      window.open(shopUrl, '_blank');
    } catch (err) {
      toast({ title: '대리 로그인에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleResetPassword = async (member: Client) => {
    if (!confirm(`${member.clientName}님의 비밀번호를 1111로 초기화하시겠습니까?`)) {
      return;
    }

    try {
      await api.patch(`/auth/reset-client-password/${member.id}`);
      toast({
        title: '비밀번호가 초기화되었습니다',
        description: '새 비밀번호: 1111',
      });
    } catch (err: any) {
      toast({
        title: '비밀번호 초기화에 실패했습니다',
        description: err.message || '오류가 발생했습니다',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="회원 관리"
        description="회원 정보를 관리합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '회사정보', href: '/company' },
          { label: '회원 관리' },
        ]}
      />

      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-blue-50/50 to-transparent">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            회원 목록
          </CardTitle>
          <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md">
            <Plus className="h-4 w-4 mr-2" />
            회원 추가
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {/* 필터 영역 */}
          <div className="flex flex-wrap gap-4 mb-6 p-4 bg-slate-50/50 rounded-xl border">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="회원명, 코드, 사업자번호 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 bg-white">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
                <SelectItem value="suspended">정지</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-40 bg-white">
                <SelectValue placeholder="그룹" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 그룹</SelectItem>
                {groupsData?.data?.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.groupName}
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
              <div className="rounded-xl border overflow-hidden bg-white">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="w-[14%] text-center">회원명</TableHead>
                      <TableHead className="w-[17%] text-center">이메일</TableHead>
                      <TableHead className="w-[10%] text-center">연락처</TableHead>
                      <TableHead className="w-[9%] text-center">그룹</TableHead>
                      <TableHead className="w-[8%] text-center whitespace-nowrap">등록일</TableHead>
                      <TableHead className="w-[5%] text-center whitespace-nowrap">상담</TableHead>
                      <TableHead className="w-[5%] text-center whitespace-nowrap">미완료</TableHead>
                      <TableHead className="w-[8%] text-center whitespace-nowrap">영업담당</TableHead>
                      <TableHead className="w-[6%] text-center whitespace-nowrap">신용</TableHead>
                      <TableHead className="w-[6%] text-center whitespace-nowrap">상태</TableHead>
                      <TableHead className="w-[8%] text-center whitespace-nowrap">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membersData?.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          등록된 회원이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      membersData?.data?.map((member) => (
                        <MemberTableRow
                          key={member.id}
                          member={member}
                          onEdit={handleOpenDialog}
                          onResetPassword={handleResetPassword}
                          onDelete={setDeleteConfirm}
                          onImpersonate={handleImpersonate}
                          getStatusBadge={getStatusBadge}
                          getCreditBadge={getCreditBadge}
                          managerName={member.assignedManager ? staffMap.get(member.assignedManager) : undefined}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 페이지네이션 */}
              {membersData?.meta && membersData.meta.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    이전
                  </Button>
                  <span className="flex items-center px-4 text-sm text-muted-foreground">
                    {page} / {membersData.meta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === membersData.meta.totalPages}
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

      {/* 회원 추가/수정 다이얼로그 - 확대된 3열 레이아웃 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5 text-blue-600" />
              {editingMember ? '회원 수정' : '회원 추가'}
            </DialogTitle>
            <DialogDescription>
              {editingMember ? `회원코드: ${editingMember.clientCode}` : '회원 정보를 입력하세요.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-8 mb-6">
              <TabsTrigger value="basic" className="flex items-center gap-1 text-xs px-2">
                <User className="h-3.5 w-3.5" />
                기본정보
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-1 text-xs px-2">
                <CreditCard className="h-3.5 w-3.5" />
                결제/배송
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-1 text-xs px-2" disabled={!editingMember}>
                <DollarSign className="h-3.5 w-3.5" />
                개별단가
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-1 text-xs px-2" disabled={!editingMember}>
                <Package className="h-3.5 w-3.5" />
                상품정보
              </TabsTrigger>
              <TabsTrigger value="plates" className="flex items-center gap-1 text-xs px-2" disabled={!editingMember}>
                <Layers className="h-3.5 w-3.5" />
                동판정보
              </TabsTrigger>
              <TabsTrigger value="myproducts" className="flex items-center gap-1 text-xs px-2" disabled={!editingMember}>
                <Star className="h-3.5 w-3.5" />
                MY상품
              </TabsTrigger>
              <TabsTrigger value="fabrics" className="flex items-center gap-1 text-xs px-2" disabled={!editingMember}>
                <Palette className="h-3.5 w-3.5" />
                표지원단정보
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1 text-xs px-2" disabled={!editingMember}>
                <MessageSquare className="h-3.5 w-3.5" />
                상담이력
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              {/* 고객 정보 섹션 */}
              <div className="p-5 border rounded-xl bg-gradient-to-r from-blue-50/70 to-transparent">
                <h3 className="font-semibold mb-4 text-blue-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  고객 정보
                </h3>

                {/* 회원 유형 선택 */}
                <div className="mb-6 p-4 bg-white rounded-lg border-2 border-blue-200">
                  <Label className="text-sm font-semibold text-blue-900 mb-3 block">회원 유형 선택 *</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="memberType"
                        value="individual"
                        checked={formData.memberType === 'individual'}
                        onChange={(e) => setFormData({ ...formData, memberType: e.target.value as 'individual' | 'business', groupId: '' })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm font-medium">개인고객</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="memberType"
                        value="business"
                        checked={formData.memberType === 'business'}
                        onChange={(e) => setFormData({ ...formData, memberType: e.target.value as 'individual' | 'business', groupId: '' })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm font-medium">스튜디오/사업자</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientCode" className="text-sm font-medium">회원 코드 *</Label>
                    <Input
                      id="clientCode"
                      value={formData.clientCode}
                      onChange={(e) => setFormData({ ...formData, clientCode: e.target.value })}
                      placeholder="M0001"
                      readOnly={!editingMember}
                      className={editingMember ? "bg-white" : "bg-slate-50 text-blue-600 font-mono"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientName" className="text-sm font-medium">
                      {formData.memberType === 'business' ? '상호(스튜디오) *' : '회원명 *'}
                    </Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder={formData.memberType === 'business' ? '포토스튜디오' : '홍길동'}
                      className="bg-white"
                    />
                  </div>

                  {/* 개인고객: 상호, 휴대폰번호 표시 */}
                  {formData.memberType === 'individual' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="representative" className="text-sm font-medium">상호(스튜디오)</Label>
                        <Input
                          id="representative"
                          value={formData.representative}
                          onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                          placeholder="풀로우스튜디오"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mobile" className="text-sm font-medium">휴대폰번호</Label>
                        <PhoneInput
                          id="mobile"
                          value={formData.mobile}
                          onChange={(value) => setFormData({ ...formData, mobile: value })}
                          placeholder="010-1234-5678"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">이메일</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="contact@example.com"
                          className="bg-white"
                        />
                      </div>
                    </>
                  )}

                  {/* 스튜디오/사업자 전용 필드 */}
                  {formData.memberType === 'business' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="businessNumber" className="text-sm font-medium">사업자등록번호</Label>
                        <Input
                          id="businessNumber"
                          value={formData.businessNumber}
                          onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
                          placeholder="123-45-67890"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="representative" className="text-sm font-medium">대표자명</Label>
                        <Input
                          id="representative"
                          value={formData.representative}
                          onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                          placeholder="홍길동"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium">자택(긴급)연락처</Label>
                        <PhoneInput
                          id="phone"
                          value={formData.phone}
                          onChange={(value) => setFormData({ ...formData, phone: value })}
                          placeholder="02-1234-5678"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mobile" className="text-sm font-medium">휴대폰번호</Label>
                        <PhoneInput
                          id="mobile"
                          value={formData.mobile}
                          onChange={(value) => setFormData({ ...formData, mobile: value })}
                          placeholder="010-1234-5678"
                          className="bg-white"
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">이메일</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="contact@example.com"
                          className="bg-white"
                        />
                      </div>
                    </>
                  )}

                  {/* 회원 그룹 선택 (기본값 자동 할당, 수정 가능) */}
                  <div className="space-y-2">
                    <Label htmlFor="groupId" className="text-sm font-medium">
                      회원 그룹 {!editingMember && <span className="text-xs text-blue-500">(기본: {formData.memberType === 'business' ? '스튜디오회원' : '일반고객그룹'})</span>}
                    </Label>
                    <Select
                      value={formData.groupId || 'auto'}
                      onValueChange={(v) => setFormData({ ...formData, groupId: v === 'auto' ? '' : v })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="그룹 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">
                          <span className="text-blue-600">자동 할당</span>
                          <span className="text-gray-400 ml-1 text-xs">({formData.memberType === 'business' ? '스튜디오회원' : '일반고객그룹'})</span>
                        </SelectItem>
                        {groupsData?.data?.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.groupName} (일반 {group.generalDiscount}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 영업담당자 선택 */}
                  <div className="space-y-2">
                    <Label htmlFor="assignedManager" className="text-sm font-medium">
                      영업담당자
                    </Label>
                    <Select
                      value={formData.assignedManager || 'none'}
                      onValueChange={(v) => setFormData({ ...formData, assignedManager: v === 'none' ? '' : v })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="담당자 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">담당자 없음</span>
                        </SelectItem>
                        {staffData?.data?.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            <span className="flex items-center gap-2">
                              {staff.name}
                              {staff.department && (
                                <span className="text-xs text-muted-foreground">({staff.department.name})</span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 원본 데이터 삭제기간 */}
                  <div className="space-y-2">
                    <Label htmlFor="fileRetentionMonths" className="text-sm font-medium">
                      원본 데이터 삭제기간
                    </Label>
                    <Select
                      value={String(formData.fileRetentionMonths ?? 3)}
                      onValueChange={(v) => setFormData({ ...formData, fileRetentionMonths: parseInt(v) })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1개월 (30일)</SelectItem>
                        <SelectItem value="2">2개월 (60일)</SelectItem>
                        <SelectItem value="3">3개월 (90일)</SelectItem>
                        <SelectItem value="6">6개월 (180일)</SelectItem>
                        <SelectItem value="12">12개월 (1년)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">거래 완료 후 원본 파일 보관 기간</p>
                  </div>
                </div>
              </div>

              {/* 주소 정보 섹션 */}
              <div className="p-5 border rounded-xl bg-gradient-to-r from-green-50/70 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-green-700 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    주소 정보
                  </h3>
                  <AddressSearch onComplete={handleAddressComplete} size="sm" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode" className="text-sm font-medium">우편번호</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="12345"
                      readOnly
                      className="bg-slate-50"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium">주소</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="주소 검색 버튼을 눌러주세요"
                      readOnly
                      className="bg-slate-50"
                    />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label htmlFor="addressDetail" className="text-sm font-medium">상세주소</Label>
                    <Input
                      id="addressDetail"
                      value={formData.addressDetail}
                      onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
                      placeholder="상세주소를 입력하세요 (예: 101동 202호)"
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 담당자 정보 섹션 */}
              <div className="p-5 border rounded-xl bg-gradient-to-r from-orange-50/70 to-transparent">
                <h3 className="font-semibold mb-4 text-orange-700 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  담당자 정보
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg border space-y-3">
                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">실무담당자</p>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">이름</Label>
                      <Input
                        value={formData.practicalManagerName || ''}
                        onChange={(e) => setFormData({ ...formData, practicalManagerName: e.target.value })}
                        placeholder="실무 담당자 이름"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">연락처</Label>
                      <PhoneInput
                        value={formData.practicalManagerPhone || ''}
                        onChange={(value) => setFormData({ ...formData, practicalManagerPhone: value })}
                        placeholder="010-0000-0000"
                        className="bg-white"
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border space-y-3">
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">결재담당자</p>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">이름</Label>
                      <Input
                        value={formData.approvalManagerName || ''}
                        onChange={(e) => setFormData({ ...formData, approvalManagerName: e.target.value })}
                        placeholder="결재 담당자 이름"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">연락처</Label>
                      <PhoneInput
                        value={formData.approvalManagerPhone || ''}
                        onChange={(value) => setFormData({ ...formData, approvalManagerPhone: value })}
                        placeholder="010-0000-0000"
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 관리자 메모 섹션 (고객 비공개) */}
              <div className="p-5 border rounded-xl bg-gradient-to-r from-slate-50/70 to-transparent">
                <h3 className="font-semibold mb-2 text-slate-700 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  관리자 메모
                  <span className="text-xs font-normal bg-red-100 text-red-600 px-2 py-0.5 rounded-full">고객 비공개</span>
                </h3>
                <p className="text-xs text-muted-foreground mb-3">이 메모는 관리자만 볼 수 있으며 고객에게는 표시되지 않습니다.</p>
                <Textarea
                  value={formData.adminMemo || ''}
                  onChange={(e) => setFormData({ ...formData, adminMemo: e.target.value })}
                  placeholder="내부 메모를 입력하세요 (특이사항, 주의사항 등)"
                  className="bg-white resize-none"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="payment" className="space-y-6">
              {/* 결제 설정 섹션 */}
              <div className="p-5 border rounded-xl bg-gradient-to-r from-purple-50/70 to-transparent">
                <h3 className="font-semibold mb-4 text-purple-700 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  결제 설정
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="creditGrade" className="text-sm font-medium">신용등급</Label>
                    <Select
                      value={formData.creditGrade}
                      onValueChange={(v) => setFormData({ ...formData, creditGrade: v as 'A' | 'B' | 'C' | 'D' })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            A등급 (우수)
                          </span>
                        </SelectItem>
                        <SelectItem value="B">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            B등급 (양호)
                          </span>
                        </SelectItem>
                        <SelectItem value="C">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-500" />
                            C등급 (보통)
                          </span>
                        </SelectItem>
                        <SelectItem value="D">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            D등급 (주의)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentCondition" className="text-sm font-medium">결제조건</Label>
                    <Select
                      value={formData.paymentCondition || '당월말'}
                      onValueChange={(v) => setFormData({ ...formData, paymentCondition: v as '당월말' | '익월말' | '2개월여신' })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="당월말">당월말</SelectItem>
                        <SelectItem value="익월말">익월말</SelectItem>
                        <SelectItem value="2개월여신">2개월여신</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="creditPaymentDay" className="text-sm font-medium">결제일 (매월 N일)</Label>
                    <Input
                      id="creditPaymentDay"
                      type="number"
                      min={1}
                      max={31}
                      value={formData.creditPaymentDay ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                        setFormData({ ...formData, creditPaymentDay: val });
                      }}
                      placeholder="예: 25"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium">상태</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v as 'active' | 'inactive' | 'suspended' })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            활성
                          </span>
                        </SelectItem>
                        <SelectItem value="inactive">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gray-400" />
                            비활성
                          </span>
                        </SelectItem>
                        <SelectItem value="suspended">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            정지
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

            </TabsContent>

            <TabsContent value="pricing" className="space-y-6">
              {editingMember && (
                <IndividualPricingTab
                  clientId={editingMember.id}
                  clientName={editingMember.clientName}
                />
              )}
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
              {/* 상품 정보 */}
              <div className="p-5 border rounded-xl bg-gradient-to-r from-indigo-50/70 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-indigo-700 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    등록 상품 목록
                  </h3>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    상품 추가
                  </Button>
                </div>
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>등록된 상품이 없습니다.</p>
                  <p className="text-xs mt-2">이 회원에게 특별 상품을 등록할 수 있습니다.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="plates" className="space-y-6">
              {editingMember && (
                <CopperPlateTab
                  clientId={editingMember.id}
                  clientName={editingMember.clientName}
                />
              )}
            </TabsContent>

            <TabsContent value="myproducts" className="space-y-6">
              {/* MY 상품 */}
              <div className="p-5 border rounded-xl bg-gradient-to-r from-pink-50/70 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-pink-700 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    MY 상품 (즐겨찾기)
                  </h3>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    MY상품 추가
                  </Button>
                </div>
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>등록된 MY상품이 없습니다.</p>
                  <p className="text-xs mt-2">자주 주문하는 상품을 MY상품으로 등록합니다.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fabrics" className="space-y-6">
              {/* 원단 정보 */}
              <div className="p-5 border rounded-xl bg-gradient-to-r from-teal-50/70 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-teal-700 flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    원단 정보
                  </h3>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    원단 등록
                  </Button>
                </div>
                <div className="text-center py-12 text-muted-foreground">
                  <Palette className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>등록된 원단이 없습니다.</p>
                  <p className="text-xs mt-2">이 회원이 사용하는 원단 정보를 관리합니다.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              {/* 상담 이력 */}
              <div className="p-5 border rounded-xl bg-gradient-to-r from-orange-50/70 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-orange-700 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    최근 상담 이력
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/company/consultations?clientId=${editingMember?.id}`, '_blank')}
                  >
                    전체 보기
                  </Button>
                </div>

                {consultations && consultations.length > 0 ? (
                  <div className="space-y-3">
                    {consultations.map((consultation) => (
                      <div key={consultation.id} className="p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className={`text-xs ${consultation.category?.colorCode
                                  ? CONSULTATION_CATEGORY_COLORS[consultation.category.colorCode]
                                  : CONSULTATION_CATEGORY_COLORS.gray
                                  }`}
                              >
                                {consultation.category?.name}
                              </Badge>
                              <Badge className={`text-xs ${CONSULTATION_STATUS_CONFIG[consultation.status]?.color}`}>
                                {CONSULTATION_STATUS_CONFIG[consultation.status]?.label}
                              </Badge>
                            </div>
                            <p className="font-medium text-sm">{consultation.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{consultation.content}</p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground flex flex-col items-end gap-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(consultation.consultedAt), 'MM/dd HH:mm', { locale: ko })}
                            </span>
                            <span>{consultation.counselorName}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>상담 이력이 없습니다.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMember.isPending || updateMember.isPending}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {(createMember.isPending || updateMember.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingMember ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              회원 삭제
            </DialogTitle>
            <DialogDescription>
              &apos;{deleteConfirm?.clientName}&apos; 회원을 삭제하시겠습니까?
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
              disabled={deleteMember.isPending}
            >
              {deleteMember.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

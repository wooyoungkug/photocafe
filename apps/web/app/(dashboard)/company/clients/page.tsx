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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useClients,
  useClientGroups,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from '@/hooks/use-clients';
import { useStaffList } from '@/hooks/use-staff';
import {
  useCopperPlatesByClient,
  useCreateCopperPlate,
  useUpdateCopperPlate,
  useDeleteCopperPlate,
  CopperPlate,
  CreateCopperPlateDto,
  FOIL_COLOR_LABELS,
  FOIL_POSITION_LABELS,
  PLATE_TYPE_LABELS,
  COPPER_PLATE_STATUS_LABELS,
  COPPER_PLATE_STATUS_COLORS,
  FOIL_COLOR_COLORS,
  FoilColor,
  FoilPosition,
  PlateType,
  CopperPlateStatus,
} from '@/hooks/use-copper-plates';
import { Client, CreateClientDto } from '@/lib/types/client';
import { useConsultations } from '@/hooks/use-cs';
import { api } from '@/lib/api';
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
  CreditCard,
  Package,
  Layers,
  Star,
  Scissors,
  MessageSquare,
  Image,
  FileText,
  MapPin,
} from 'lucide-react';

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Client | null>(null);

  const { data: clientsData, isLoading, error } = useClients({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    groupId: groupFilter !== 'all' ? groupFilter : undefined,
  });

  const { data: groupsData } = useClientGroups({ limit: 100 });
  const { data: staffData } = useStaffList({ limit: 1000, isActive: true });
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

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
    creditGrade: 'B',
    paymentTerms: 30,
    status: 'active',
  });

  // 영업담당자 상태
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [primaryStaffId, setPrimaryStaffId] = useState<string>('');

  // 탭 상태
  const [activeTab, setActiveTab] = useState('basic');

  // 동판 관련 상태
  const [isCopperPlateDialogOpen, setIsCopperPlateDialogOpen] = useState(false);
  const [editingCopperPlate, setEditingCopperPlate] = useState<CopperPlate | null>(null);
  const [deleteCopperPlateConfirm, setDeleteCopperPlateConfirm] = useState<CopperPlate | null>(null);
  const [copperPlateFormData, setCopperPlateFormData] = useState<CreateCopperPlateDto>({
    clientId: '',
    plateName: '',
    plateCode: '',
    plateType: 'copper',
    foilColor: 'gold',
    foilColorName: '',
    foilPosition: 'center',
    storageLocation: '',
    imageUrl: '',
    aiFileUrl: '',
    designFileUrl: '',
    appliedAlbumName: '',
    albumPhotoUrl: '',
    notes: '',
  });

  // 동판 데이터 조회 (편집 중인 회원의 동판만)
  const { data: copperPlates, isLoading: isCopperPlatesLoading } = useCopperPlatesByClient(
    editingClient?.id
  );
  const createCopperPlate = useCreateCopperPlate();
  const updateCopperPlate = useUpdateCopperPlate();
  const deleteCopperPlate = useDeleteCopperPlate();

  // 상담이력 조회 (편집 중인 회원의 상담만)
  const { data: consultationsData, isLoading: isConsultationsLoading } = useConsultations(
    editingClient?.id ? { clientId: editingClient.id, limit: 50 } : undefined
  );

  const handleOpenDialog = (client?: Client) => {
    setActiveTab('basic'); // 탭 초기화
    if (client) {
      setEditingClient(client);
      setFormData({
        clientCode: client.clientCode,
        clientName: client.clientName,
        businessNumber: client.businessNumber || '',
        representative: client.representative || '',
        phone: client.phone || '',
        mobile: client.mobile || '',
        email: client.email || '',
        postalCode: client.postalCode || '',
        address: client.address || '',
        addressDetail: client.addressDetail || '',
        groupId: client.groupId || '',
        creditGrade: client.creditGrade || 'B',
        paymentTerms: client.paymentTerms || 30,
        status: client.status || 'active',
        duplicateCheckMonths: client.duplicateCheckMonths ?? undefined,
        fileRetentionMonths: client.fileRetentionMonths ?? undefined,
      });

      // 영업담당자 정보 불러오기
      const assignedStaff = (client as any).assignedStaff || [];
      setSelectedStaffIds(assignedStaff.map((a: any) => a.staffId));
      const primary = assignedStaff.find((a: any) => a.isPrimary);
      setPrimaryStaffId(primary?.staffId || '');
    } else {
      setEditingClient(null);
      setFormData({
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
        creditGrade: 'B',
        paymentTerms: 30,
        status: 'active',
      });
      setSelectedStaffIds([]);
      setPrimaryStaffId('');
    }
    setIsDialogOpen(true);
  };

  // 동판 다이얼로그 열기
  const handleOpenCopperPlateDialog = (copperPlate?: CopperPlate) => {
    if (copperPlate) {
      setEditingCopperPlate(copperPlate);
      setCopperPlateFormData({
        clientId: copperPlate.clientId,
        plateName: copperPlate.plateName,
        plateCode: copperPlate.plateCode || '',
        plateType: copperPlate.plateType || 'copper',
        foilColor: copperPlate.foilColor,
        foilColorName: copperPlate.foilColorName || '',
        foilPosition: copperPlate.foilPosition || 'center',
        storageLocation: copperPlate.storageLocation || '',
        imageUrl: copperPlate.imageUrl || '',
        aiFileUrl: copperPlate.aiFileUrl || '',
        designFileUrl: copperPlate.designFileUrl || '',
        appliedAlbumName: copperPlate.appliedAlbumName || '',
        albumPhotoUrl: copperPlate.albumPhotoUrl || '',
        notes: copperPlate.notes || '',
        registeredAt: copperPlate.registeredAt?.split('T')[0] || '',
      });
    } else {
      setEditingCopperPlate(null);
      setCopperPlateFormData({
        clientId: editingClient?.id || '',
        plateName: '',
        plateCode: '',
        plateType: 'copper',
        foilColor: 'gold',
        foilColorName: '',
        foilPosition: 'center',
        storageLocation: '',
        imageUrl: '',
        aiFileUrl: '',
        designFileUrl: '',
        appliedAlbumName: '',
        albumPhotoUrl: '',
        notes: '',
        registeredAt: new Date().toISOString().split('T')[0],
      });
    }
    setIsCopperPlateDialogOpen(true);
  };

  // 동판 저장
  const handleSaveCopperPlate = async () => {
    const submitData = {
      ...copperPlateFormData,
      clientId: editingClient?.id || '',
    };

    if (editingCopperPlate) {
      await updateCopperPlate.mutateAsync({
        id: editingCopperPlate.id,
        dto: submitData
      });
    } else {
      await createCopperPlate.mutateAsync(submitData);
    }
    setIsCopperPlateDialogOpen(false);
  };

  // 동판 삭제
  const handleDeleteCopperPlate = async () => {
    if (deleteCopperPlateConfirm) {
      await deleteCopperPlate.mutateAsync(deleteCopperPlateConfirm.id);
      setDeleteCopperPlateConfirm(null);
    }
  };

  const handleSubmit = async () => {
    const submitData = {
      ...formData,
      groupId: formData.groupId || undefined,
    };

    let clientId: string;

    if (editingClient) {
      await updateClient.mutateAsync({ id: editingClient.id, data: submitData });
      clientId = editingClient.id;
    } else {
      const newClient = await createClient.mutateAsync(submitData);
      clientId = newClient.id;
    }

    // 영업담당자 할당
    if (selectedStaffIds.length > 0) {
      try {
        await api.patch(`/clients/${clientId}/staff`, {
          staffIds: selectedStaffIds,
          primaryStaffId: primaryStaffId || selectedStaffIds[0],
        });
      } catch (error) {
      }
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteClient.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">활성</Badge>;
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
      A: 'bg-green-100 text-green-800',
      B: 'bg-blue-100 text-blue-800',
      C: 'bg-yellow-100 text-yellow-800',
      D: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[grade]}`}>
        {grade}등급
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="거래처 관리"
        description="거래처 정보를 관리합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '회사정보', href: '/company' },
          { label: '거래처 관리' },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>거래처 목록</CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            거래처 추가
          </Button>
        </CardHeader>
        <CardContent>
          {/* 필터 영역 */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="거래처명, 코드, 사업자번호 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
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
              <SelectTrigger className="w-40">
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">거래처코드</TableHead>
                    <TableHead className="whitespace-nowrap">거래처명</TableHead>
                    <TableHead className="whitespace-nowrap">대표자</TableHead>
                    <TableHead className="whitespace-nowrap">연락처</TableHead>
                    <TableHead className="whitespace-nowrap">영업담당자</TableHead>
                    <TableHead className="whitespace-nowrap">그룹</TableHead>
                    <TableHead className="whitespace-nowrap">신용등급</TableHead>
                    <TableHead className="whitespace-nowrap">상태</TableHead>
                    <TableHead className="whitespace-nowrap text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientsData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        등록된 거래처가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientsData?.data?.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-mono whitespace-nowrap">{client.clientCode}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{client.clientName}</TableCell>
                        <TableCell className="whitespace-nowrap">{client.representative || '-'}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col gap-1 text-sm">
                            {client.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 flex-shrink-0" />
                                {client.phone}
                              </span>
                            )}
                            {client.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                {client.email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {client.assignedStaff && client.assignedStaff.length > 0 ? (
                            <div className="flex flex-col gap-1 text-sm">
                              {client.assignedStaff.map((assignment: any) => (
                                <span key={assignment.id} className="flex items-center gap-1">
                                  <User className="h-3 w-3 flex-shrink-0" />
                                  {assignment.staff.name}
                                  {assignment.isPrimary && (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0">주</Badge>
                                  )}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {client.group ? (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 flex-shrink-0" />
                              {client.group.groupName}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{getCreditBadge(client.creditGrade)}</TableCell>
                        <TableCell className="whitespace-nowrap">{getStatusBadge(client.status)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(client)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(client)}
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
              {clientsData?.meta && clientsData.meta.totalPages > 1 && (
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
                    {page} / {clientsData.meta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === clientsData.meta.totalPages}
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

      {/* 회원 추가/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? '회원 수정' : '회원 추가'}
            </DialogTitle>
            <DialogDescription>
              회원 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-4">
              <TabsTrigger value="basic" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                기본정보
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                결제/배송
              </TabsTrigger>
              <TabsTrigger value="product" className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                상품정보
              </TabsTrigger>
              <TabsTrigger value="copperplate" className="flex items-center gap-1" disabled={!editingClient}>
                <Layers className="h-3 w-3" />
                동판정보
              </TabsTrigger>
              <TabsTrigger value="myproduct" className="flex items-center gap-1" disabled={!editingClient}>
                <Star className="h-3 w-3" />
                MY상품
              </TabsTrigger>
              <TabsTrigger value="fabric" className="flex items-center gap-1" disabled={!editingClient}>
                <Scissors className="h-3 w-3" />
                원단정보
              </TabsTrigger>
              <TabsTrigger value="consultation" className="flex items-center gap-1" disabled={!editingClient}>
                <MessageSquare className="h-3 w-3" />
                상담이력
              </TabsTrigger>
            </TabsList>

            {/* 기본정보 탭 */}
            <TabsContent value="basic" className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  고객 정보
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientCode">회원 코드 *</Label>
                    <Input
                      id="clientCode"
                      value={formData.clientCode}
                      onChange={(e) => setFormData({ ...formData, clientCode: e.target.value })}
                      placeholder="M0001"
                      className="bg-green-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientName">회원명 *</Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder="홍길동"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessNumber">사업자등록번호</Label>
                    <Input
                      id="businessNumber"
                      value={formData.businessNumber}
                      onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
                      placeholder="123-45-67890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="representative">대표자명</Label>
                    <Input
                      id="representative"
                      value={formData.representative}
                      onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                      placeholder="홍길동"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">전화번호</Label>
                    <PhoneInput
                      id="phone"
                      value={formData.phone}
                      onChange={(value) => setFormData({ ...formData, phone: value })}
                      placeholder="02-1234-5678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">휴대폰번호</Label>
                    <PhoneInput
                      id="mobile"
                      value={formData.mobile}
                      onChange={(value) => setFormData({ ...formData, mobile: value })}
                      placeholder="010-1234-5678"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupId">회원 그룹</Label>
                    <Select
                      value={formData.groupId || 'none'}
                      onValueChange={(v) => setFormData({ ...formData, groupId: v === 'none' ? '' : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="그룹 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">그룹 없음</SelectItem>
                        {groupsData?.data?.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.groupName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 영업담당자 섹션 */}
                <div className="border rounded-lg p-4 mt-4">
                  <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    영업담당자
                  </h3>
                  <div className="space-y-3">
                    {staffData?.data && staffData.data.length > 0 ? (
                      staffData.data.map((staff) => {
                        const isSelected = selectedStaffIds.includes(staff.id);
                        return (
                          <div key={staff.id} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`staff-${staff.id}`}
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStaffIds([...selectedStaffIds, staff.id]);
                                  if (selectedStaffIds.length === 0) {
                                    setPrimaryStaffId(staff.id);
                                  }
                                } else {
                                  setSelectedStaffIds(selectedStaffIds.filter(id => id !== staff.id));
                                  if (primaryStaffId === staff.id) {
                                    setPrimaryStaffId('');
                                  }
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor={`staff-${staff.id}`} className="flex-1 cursor-pointer">
                              {staff.name} {staff.position && `(${staff.position})`}
                            </Label>
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  id={`primary-${staff.id}`}
                                  name="primaryStaff"
                                  checked={primaryStaffId === staff.id}
                                  onChange={() => setPrimaryStaffId(staff.id)}
                                  className="h-4 w-4"
                                />
                                <Label htmlFor={`primary-${staff.id}`} className="text-xs text-muted-foreground cursor-pointer">
                                  주담당자
                                </Label>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">등록된 직원이 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  주소 정보
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">우편번호</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="12345"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="address">주소</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="주소를 검색해 주세요..."
                    />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label htmlFor="addressDetail">상세주소</Label>
                    <Input
                      id="addressDetail"
                      value={formData.addressDetail}
                      onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
                      placeholder="상세주소를 입력해 주세요..."
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 결제/배송 탭 */}
            <TabsContent value="payment" className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  결제 정보
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="creditGrade">신용등급</Label>
                    <Select
                      value={formData.creditGrade}
                      onValueChange={(v) => setFormData({ ...formData, creditGrade: v as 'A' | 'B' | 'C' | 'D' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A등급 (우수)</SelectItem>
                        <SelectItem value="B">B등급 (양호)</SelectItem>
                        <SelectItem value="C">C등급 (보통)</SelectItem>
                        <SelectItem value="D">D등급 (주의)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">결제조건 (일)</Label>
                    <Input
                      id="paymentTerms"
                      type="number"
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: parseInt(e.target.value) || 0 })}
                      placeholder="30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">상태</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v as 'active' | 'inactive' | 'suspended' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">활성</SelectItem>
                        <SelectItem value="inactive">비활성</SelectItem>
                        <SelectItem value="suspended">정지</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                  주문 설정
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duplicateCheckMonths">중복주문 체크 기간</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="duplicateCheckMonths"
                        type="number"
                        min={0}
                        max={24}
                        value={formData.duplicateCheckMonths ?? ''}
                        onChange={(e) => setFormData({ ...formData, duplicateCheckMonths: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="시스템 기본값"
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">개월</span>
                    </div>
                    <p className="text-xs text-muted-foreground">비워두면 시스템 기본값 사용. 0이면 체크 안 함.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fileRetentionMonths">데이터 원본 보존기간</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="fileRetentionMonths"
                        type="number"
                        min={1}
                        max={120}
                        value={formData.fileRetentionMonths ?? ''}
                        onChange={(e) => setFormData({ ...formData, fileRetentionMonths: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="기본값 3"
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">개월</span>
                    </div>
                    <p className="text-xs text-muted-foreground">배송완료 후 원본파일 보관기간. 비워두면 기본 3개월.</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 상품정보 탭 */}
            <TabsContent value="product" className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  상품정보 기능은 준비 중입니다.
                </div>
              </div>
            </TabsContent>

            {/* 동판정보 탭 */}
            <TabsContent value="copperplate" className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    동판 목록
                  </h3>
                  <Button size="sm" onClick={() => handleOpenCopperPlateDialog()}>
                    <Plus className="h-4 w-4 mr-1" />
                    동판 추가
                  </Button>
                </div>

                {isCopperPlatesLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : copperPlates && copperPlates.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>동판/연판</TableHead>
                        <TableHead>동판명</TableHead>
                        <TableHead>박컬러</TableHead>
                        <TableHead>박위치</TableHead>
                        <TableHead>적용앨범</TableHead>
                        <TableHead>보유위치</TableHead>
                        <TableHead>등록일</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {copperPlates.map((plate) => (
                        <TableRow key={plate.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {PLATE_TYPE_LABELS[plate.plateType as PlateType] || '동판'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{plate.plateName}</TableCell>
                          <TableCell>
                            <Badge className={FOIL_COLOR_COLORS[plate.foilColor] || 'bg-gray-100'}>
                              {FOIL_COLOR_LABELS[plate.foilColor] || plate.foilColor}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {plate.foilPosition ? FOIL_POSITION_LABELS[plate.foilPosition as FoilPosition] : '-'}
                          </TableCell>
                          <TableCell>{plate.appliedAlbumName || '-'}</TableCell>
                          <TableCell>{plate.storageLocation || '-'}</TableCell>
                          <TableCell>{plate.registeredAt ? new Date(plate.registeredAt).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>
                            <Badge className={COPPER_PLATE_STATUS_COLORS[plate.status]}>
                              {COPPER_PLATE_STATUS_LABELS[plate.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {plate.imageUrl && (
                                <Button variant="ghost" size="sm" title="이미지 보기">
                                  <Image className="h-4 w-4" />
                                </Button>
                              )}
                              {plate.aiFileUrl && (
                                <Button variant="ghost" size="sm" title="AI 파일">
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => handleOpenCopperPlateDialog(plate)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteCopperPlateConfirm(plate)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Layers className="h-8 w-8 mb-2 opacity-50" />
                    <p>등록된 동판이 없습니다.</p>
                    <Button variant="link" size="sm" onClick={() => handleOpenCopperPlateDialog()}>
                      동판 추가하기
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* MY상품 탭 */}
            <TabsContent value="myproduct" className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  MY상품 기능은 준비 중입니다.
                </div>
              </div>
            </TabsContent>

            {/* 원단정보 탭 */}
            <TabsContent value="fabric" className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  원단정보 기능은 준비 중입니다.
                </div>
              </div>
            </TabsContent>

            {/* 상담이력 탭 */}
            <TabsContent value="consultation" className="space-y-4">
              <div className="border rounded-lg">
                {isConsultationsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !consultationsData?.data || consultationsData.data.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>상담 이력이 없습니다.</p>
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>상담번호</TableHead>
                        <TableHead>분류</TableHead>
                        <TableHead>제목</TableHead>
                        <TableHead>담당자</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>접수일</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consultationsData.data.map((consultation: any) => (
                        <TableRow key={consultation.id}>
                          <TableCell className="font-mono text-xs">
                            {consultation.consultNumber}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: consultation.category?.colorCode || '#6B7280',
                                color: consultation.category?.colorCode || '#6B7280',
                              }}
                            >
                              {consultation.category?.name || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {consultation.title}
                          </TableCell>
                          <TableCell>{consultation.counselorName}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                consultation.status === 'open' ? 'default' :
                                consultation.status === 'in_progress' ? 'secondary' :
                                consultation.status === 'resolved' ? 'outline' : 'outline'
                              }
                            >
                              {consultation.status === 'open' ? '접수' :
                               consultation.status === 'in_progress' ? '처리중' :
                               consultation.status === 'resolved' ? '해결' : '종료'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(consultation.consultedAt).toLocaleDateString('ko-KR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              <div className="text-xs text-muted-foreground text-right">
                총 {consultationsData?.meta?.total || 0}건
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createClient.isPending || updateClient.isPending}
            >
              {(createClient.isPending || updateClient.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingClient ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 동판 추가/수정 다이얼로그 */}
      <Dialog open={isCopperPlateDialogOpen} onOpenChange={setIsCopperPlateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCopperPlate ? '동판 수정' : '동판 추가'}
            </DialogTitle>
            <DialogDescription>
              동판 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="plateName">동판명 *</Label>
              <Input
                id="plateName"
                value={copperPlateFormData.plateName}
                onChange={(e) => setCopperPlateFormData({ ...copperPlateFormData, plateName: e.target.value })}
                placeholder="동판명을 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plateCode">동판 코드</Label>
              <Input
                id="plateCode"
                value={copperPlateFormData.plateCode}
                onChange={(e) => setCopperPlateFormData({ ...copperPlateFormData, plateCode: e.target.value })}
                placeholder="자동생성"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plateType">동판/연판 *</Label>
              <Select
                value={copperPlateFormData.plateType}
                onValueChange={(v) => setCopperPlateFormData({ ...copperPlateFormData, plateType: v as PlateType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="registeredAt">동판등록일</Label>
              <Input
                id="registeredAt"
                type="date"
                value={copperPlateFormData.registeredAt || ''}
                onChange={(e) => setCopperPlateFormData({ ...copperPlateFormData, registeredAt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="foilColor">박컬러 *</Label>
              <Select
                value={copperPlateFormData.foilColor}
                onValueChange={(v) => setCopperPlateFormData({ ...copperPlateFormData, foilColor: v as FoilColor })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FOIL_COLOR_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="foilPosition">박위치</Label>
              <Select
                value={copperPlateFormData.foilPosition || 'none'}
                onValueChange={(v) => setCopperPlateFormData({ ...copperPlateFormData, foilPosition: v === 'none' ? undefined : v as FoilPosition })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안함</SelectItem>
                  {Object.entries(FOIL_POSITION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appliedAlbumName">적용 앨범</Label>
              <Input
                id="appliedAlbumName"
                value={copperPlateFormData.appliedAlbumName}
                onChange={(e) => setCopperPlateFormData({ ...copperPlateFormData, appliedAlbumName: e.target.value })}
                placeholder="적용할 앨범명"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storageLocation">보유 위치</Label>
              <Input
                id="storageLocation"
                value={copperPlateFormData.storageLocation}
                onChange={(e) => setCopperPlateFormData({ ...copperPlateFormData, storageLocation: e.target.value })}
                placeholder="A-1-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aiFileUrl">AI 파일 URL</Label>
              <Input
                id="aiFileUrl"
                value={copperPlateFormData.aiFileUrl}
                onChange={(e) => setCopperPlateFormData({ ...copperPlateFormData, aiFileUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">이미지 파일 URL</Label>
              <Input
                id="imageUrl"
                value={copperPlateFormData.imageUrl}
                onChange={(e) => setCopperPlateFormData({ ...copperPlateFormData, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="albumPhotoUrl">적용된 앨범 사진 URL</Label>
              <Input
                id="albumPhotoUrl"
                value={copperPlateFormData.albumPhotoUrl}
                onChange={(e) => setCopperPlateFormData({ ...copperPlateFormData, albumPhotoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designFileUrl">디자인 파일 URL</Label>
              <Input
                id="designFileUrl"
                value={copperPlateFormData.designFileUrl}
                onChange={(e) => setCopperPlateFormData({ ...copperPlateFormData, designFileUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="notes">메모</Label>
              <Textarea
                id="notes"
                value={copperPlateFormData.notes}
                onChange={(e) => setCopperPlateFormData({ ...copperPlateFormData, notes: e.target.value })}
                placeholder="메모를 입력하세요"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCopperPlateDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSaveCopperPlate}
              disabled={createCopperPlate.isPending || updateCopperPlate.isPending}
            >
              {(createCopperPlate.isPending || updateCopperPlate.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingCopperPlate ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 동판 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteCopperPlateConfirm} onOpenChange={() => setDeleteCopperPlateConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>동판 삭제</DialogTitle>
            <DialogDescription>
              &apos;{deleteCopperPlateConfirm?.plateName}&apos; 동판을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCopperPlateConfirm(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCopperPlate}
              disabled={deleteCopperPlate.isPending}
            >
              {deleteCopperPlate.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>거래처 삭제</DialogTitle>
            <DialogDescription>
              &apos;{deleteConfirm?.clientName}&apos; 거래처를 삭제하시겠습니까?
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
              disabled={deleteClient.isPending}
            >
              {deleteClient.isPending && (
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

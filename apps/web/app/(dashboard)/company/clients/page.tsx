'use client';

import { useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  useClients,
  useClientGroups,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from '@/hooks/use-clients';
import { Client, CreateClientDto } from '@/lib/types/client';
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

  const handleOpenDialog = (client?: Client) => {
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
      });
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
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const submitData = {
      ...formData,
      groupId: formData.groupId || undefined,
    };

    if (editingClient) {
      await updateClient.mutateAsync({ id: editingClient.id, data: submitData });
    } else {
      await createClient.mutateAsync(submitData);
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
                    <TableHead>거래처코드</TableHead>
                    <TableHead>거래처명</TableHead>
                    <TableHead>대표자</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>그룹</TableHead>
                    <TableHead>신용등급</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientsData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        등록된 거래처가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientsData?.data?.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-mono">{client.clientCode}</TableCell>
                        <TableCell className="font-medium">{client.clientName}</TableCell>
                        <TableCell>{client.representative || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            {client.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {client.phone}
                              </span>
                            )}
                            {client.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {client.email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.group ? (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {client.group.groupName}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{getCreditBadge(client.creditGrade)}</TableCell>
                        <TableCell>{getStatusBadge(client.status)}</TableCell>
                        <TableCell className="text-right">
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

      {/* 거래처 추가/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? '거래처 수정' : '거래처 추가'}
            </DialogTitle>
            <DialogDescription>
              거래처 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientCode">거래처 코드 *</Label>
              <Input
                id="clientCode"
                value={formData.clientCode}
                onChange={(e) => setFormData({ ...formData, clientCode: e.target.value })}
                placeholder="C0001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientName">거래처명 *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="(주)포토카페"
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
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="02-1234-5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">휴대폰번호</Label>
              <Input
                id="mobile"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
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
                placeholder="contact@printing114.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">우편번호</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="서울시 강남구"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="addressDetail">상세주소</Label>
              <Input
                id="addressDetail"
                value={formData.addressDetail}
                onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
                placeholder="XX빌딩 3층"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupId">거래처 그룹</Label>
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
                      {group.groupName} (일반 {group.generalDiscount}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

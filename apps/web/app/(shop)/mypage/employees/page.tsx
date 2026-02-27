'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  useEmployeesByClient,
  useInvitationsByClient,
  useCreateInvitation,
  useCancelInvitation,
  useUpdateEmployment,
  useRemoveEmployment,
  useEmployeeDepartments,
  useCreateClientDepartment,
  useUpdateClientDepartment,
  useDeleteClientDepartment,
} from '@/hooks/use-employment';
import { Employment, Invitation, EmployeeRole, EmploymentStatus } from '@/lib/types/employment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  UserPlus,
  MoreHorizontal,
  Settings,
  Trash2,
  X,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Mail,
  Shield,
  Users,
  Building,
  ChevronDown,
  Plus,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function EmployeesPage() {
  const { user } = useAuthStore();
  const clientId = user?.type === 'employee' ? user.clientId : user?.id;

  const { data: employees, isLoading: employeesLoading } = useEmployeesByClient(clientId);
  const { data: invitations, isLoading: invitationsLoading } = useInvitationsByClient(clientId);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Employment | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Employment | null>(null);

  const pendingInvitations = invitations?.filter((i) => i.status === 'PENDING') || [];

  return (
    <div className="space-y-6 w-full mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[24px] font-medium flex items-center gap-2">
            <Users className="h-5 w-5" />
            직원관리
          </h2>
          <p className="text-[12px] text-gray-500 mt-0.5">
            거래처 소속 직원을 초대하고 권한을 관리합니다
          </p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" />
          직원 초대
        </Button>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] flex items-center gap-2">
              <Mail className="h-4 w-4" />
              대기 중인 초대 ({pendingInvitations.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-3 py-2 font-medium">요청일</th>
                    <th className="text-left px-3 py-2 font-medium">이메일</th>
                    <th className="text-left px-3 py-2 font-medium">가입 URL</th>
                    <th className="text-left px-3 py-2 font-medium">역할</th>
                    <th className="text-left px-3 py-2 font-medium">만료일</th>
                    <th className="text-center px-3 py-2 font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvitations.map((inv) => (
                    <InvitationRow key={inv.id} invitation={inv} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[13px] flex items-center gap-2">
            <Shield className="h-4 w-4" />
            소속 직원 ({employees?.length || 0}명)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employeesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : !employees || employees.length === 0 ? (
            <div className="text-center py-8 text-[12px] text-gray-500">
              등록된 직원이 없습니다. 직원 초대 버튼을 눌러 직원을 초대하세요.
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-3 py-2 font-medium">가입일</th>
                    <th className="text-left px-3 py-2 font-medium">이름</th>
                    <th className="text-left px-3 py-2 font-medium">이메일</th>
                    <th className="text-left px-3 py-2 font-medium">역할</th>
                    <th className="text-left px-3 py-2 font-medium">부서</th>
                    <th className="text-left px-3 py-2 font-medium">주문 열람</th>
                    <th className="text-left px-3 py-2 font-medium">상태</th>
                    <th className="text-left px-3 py-2 font-medium">최근 접속</th>
                    <th className="text-left px-3 py-2 font-medium">접속 IP</th>
                    <th className="text-right px-3 py-2 font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {(() => { const d = new Date(emp.joinedAt); return `${d.getFullYear()}년 ${String(d.getMonth()+1).padStart(2,'0')}월 ${String(d.getDate()).padStart(2,'0')}일`; })()}
                      </td>
                      <td className="px-3 py-2">{emp.member.clientName}</td>
                      <td className="px-3 py-2 text-gray-500">{emp.member.email}</td>
                      <td className="px-3 py-2">
                        {emp.memberClientId === emp.companyClientId
                          ? '최고관리자'
                          : emp.role === 'MANAGER' ? 'Manager' : emp.role === 'EDITOR' ? 'Artist' : emp.role === 'PHOTOGRAPHER' ? 'Photographer' : 'STAFF'}
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {emp.department || '-'}
                      </td>
                      <td className="px-3 py-2">
                        {emp.canViewAllOrders ? '전체' : '본인만'}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block text-[14px] ${
                            emp.status === 'ACTIVE'
                              ? 'text-black'
                              : 'text-red-600'
                          }`}
                        >
                          {emp.status === 'ACTIVE' ? '활성' : '정지'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {emp.member.lastLoginAt
                          ? (() => { const d = new Date(emp.member.lastLoginAt!); return `${d.getFullYear()}년 ${String(d.getMonth()+1).padStart(2,'0')}월 ${String(d.getDate()).padStart(2,'0')}일`; })()
                          : '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {emp.member.lastLoginIp || '-'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditTarget(emp)}>
                              <Settings className="h-3.5 w-3.5 mr-2" />
                              권한 설정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setRemoveTarget(emp)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              제거
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} clientId={clientId!} />
      {editTarget && (
        <EditPermissionDialog
          employment={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      {removeTarget && (
        <RemoveDialog
          employment={removeTarget}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}

// ==================== Invitation Row ====================

function InvitationRow({ invitation }: { invitation: Invitation }) {
  const cancelMutation = useCancelInvitation();
  const [copied, setCopied] = useState(false);

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/invite/${invitation.token}`
    : `/invite/${invitation.token}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('가입 URL이 복사되었습니다');
  };

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
        {(() => { const d = new Date(invitation.createdAt); return `${d.getFullYear()}년 ${String(d.getMonth()+1).padStart(2,'0')}월 ${String(d.getDate()).padStart(2,'0')}일`; })()}
      </td>
      <td className="px-3 py-2">{invitation.inviteeEmail}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="break-all text-gray-500 text-[14px]">
            {inviteUrl}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </td>
      <td className="px-3 py-2">
        <span className="text-[14px] text-black">
          {invitation.role === 'MANAGER' ? 'Manager' : invitation.role === 'EDITOR' ? 'Artist' : invitation.role === 'PHOTOGRAPHER' ? 'Photographer' : 'STAFF'}
        </span>
      </td>
      <td className="px-3 py-2 text-gray-500">
        {(() => { const d = new Date(invitation.expiresAt); return `${d.getFullYear()}년 ${String(d.getMonth()+1).padStart(2,'0')}월 ${String(d.getDate()).padStart(2,'0')}일`; })()}
      </td>
      <td className="px-3 py-2 text-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-red-500 hover:text-red-700"
          disabled={cancelMutation.isPending}
          onClick={() => {
            cancelMutation.mutate(invitation.id, {
              onSuccess: () => toast.success('초대가 취소되었습니다'),
              onError: () => toast.error('초대 취소에 실패했습니다'),
            });
          }}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          취소
        </Button>
      </td>
    </tr>
  );
}

// ==================== Invite Dialog ====================

function InviteDialog({
  open,
  onClose,
  clientId,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<EmployeeRole>('STAFF');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const createMutation = useCreateInvitation();

  const handleSubmit = () => {
    createMutation.mutate(
      { clientId, inviteeEmail: email, role },
      {
        onSuccess: (result) => {
          setInviteLink(result.inviteLink);
          toast.success('초대가 생성되었습니다');
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : '초대 생성에 실패했습니다');
        },
      },
    );
  };

  const handleCopy = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('STAFF');
    setInviteLink(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[24px] font-normal">직원 초대</DialogTitle>
          <DialogDescription className="text-[12px]">
            초대할 직원의 이메일과 역할을 입력하세요
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 text-[14px] text-green-700 bg-green-50 rounded-md">
              <Check className="h-4 w-4 flex-shrink-0" />
              <span>초대가 생성되었습니다. 아래 링크를 직원에게 전달해주세요.</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={inviteLink}
                className="text-[14px]"
              />
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={handleClose}>
                닫기
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[14px]">이메일</Label>
              <Input
                type="email"
                placeholder="employee@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-[14px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[14px]">역할</Label>
              <Select value={role} onValueChange={(v) => setRole(v as EmployeeRole)}>
                <SelectTrigger className="text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER" className="text-[14px]">Manager</SelectItem>
                  <SelectItem value="EDITOR" className="text-[14px]">Artist</SelectItem>
                  <SelectItem value="PHOTOGRAPHER" className="text-[14px]">Photographer</SelectItem>
                  <SelectItem value="STAFF" className="text-[14px]">STAFF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={handleClose}>
                취소
              </Button>
              <Button
                size="sm"
                disabled={!email || createMutation.isPending}
                onClick={handleSubmit}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                초대하기
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ==================== Edit Permission Dialog ====================

function EditPermissionDialog({
  employment,
  onClose,
}: {
  employment: Employment;
  onClose: () => void;
}) {
  const { user } = useAuthStore();
  const clientId = user?.type === 'employee' ? user.clientId : user?.id;

  // Manager 또는 소유자인지 판별
  const isManager =
    user?.type === 'client' ||
    (user?.type === 'employee' && user?.employeeRole === 'MANAGER');

  const [role, setRole] = useState<EmployeeRole>(employment.role);
  const [canViewAllOrders, setCanViewAllOrders] = useState(employment.canViewAllOrders);
  const [canManageProducts, setCanManageProducts] = useState(employment.canManageProducts);
  const [canViewSettlement, setCanViewSettlement] = useState(employment.canViewSettlement);
  const [status, setStatus] = useState<EmploymentStatus>(employment.status);
  const [department, setDepartment] = useState(employment.department || '');
  const [deptSearch, setDeptSearch] = useState('');
  const [deptOpen, setDeptOpen] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');
  const deptRef = useRef<HTMLDivElement>(null);

  const { data: departments = [] } = useEmployeeDepartments(clientId);
  const updateMutation = useUpdateEmployment();
  const createDeptMutation = useCreateClientDepartment();
  const updateDeptMutation = useUpdateClientDepartment();
  const deleteDeptMutation = useDeleteClientDepartment();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deptRef.current && !deptRef.current.contains(event.target as Node)) {
        setDeptOpen(false);
        setEditingDeptId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDepts = departments.filter((d) =>
    d.name.toLowerCase().includes(deptSearch.toLowerCase())
  );
  const exactMatch = departments.find(
    (d) => d.name.toLowerCase() === deptSearch.toLowerCase()
  );

  const handleSelectDept = (value: string) => {
    setDepartment(value);
    setDeptOpen(false);
    setDeptSearch('');
    setEditingDeptId(null);
  };

  const handleAddDept = () => {
    if (!clientId || !deptSearch.trim()) return;
    createDeptMutation.mutate(
      { clientId, name: deptSearch.trim() },
      {
        onSuccess: (created) => {
          setDepartment(created.name);
          setDeptSearch('');
          toast.success('부서가 추가되었습니다');
        },
        onError: () => toast.error('부서 추가에 실패했습니다'),
      },
    );
  };

  const handleEditDept = (deptId: string) => {
    if (!editingDeptName.trim()) return;
    // 현재 선택된 부서명이 변경되면 department 상태도 업데이트
    const oldDept = departments.find((d) => d.id === deptId);
    updateDeptMutation.mutate(
      { id: deptId, data: { name: editingDeptName.trim() } },
      {
        onSuccess: () => {
          if (oldDept && department === oldDept.name) {
            setDepartment(editingDeptName.trim());
          }
          setEditingDeptId(null);
          setEditingDeptName('');
          toast.success('부서명이 수정되었습니다');
        },
        onError: () => toast.error('부서명 수정에 실패했습니다'),
      },
    );
  };

  const handleDeleteDept = (deptId: string) => {
    const target = departments.find((d) => d.id === deptId);
    deleteDeptMutation.mutate(deptId, {
      onSuccess: () => {
        if (target && department === target.name) {
          setDepartment('');
        }
        toast.success('부서가 삭제되었습니다');
      },
      onError: () => toast.error('부서 삭제에 실패했습니다'),
    });
  };

  const handleSubmit = () => {
    updateMutation.mutate(
      {
        id: employment.id,
        data: { role, canViewAllOrders, canManageProducts, canViewSettlement, status, department },
      },
      {
        onSuccess: () => {
          toast.success('권한이 수정되었습니다');
          onClose();
        },
        onError: () => {
          toast.error('권한 수정에 실패했습니다');
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[18px] text-black font-bold">
            권한 설정 — {employment.member.clientName}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {employment.member.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[14px] text-black font-normal">역할</Label>
            <Select value={role} onValueChange={(v) => setRole(v as EmployeeRole)}>
              <SelectTrigger className="text-[14px] text-black font-normal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANAGER" className="text-[14px] text-black font-normal">Manager</SelectItem>
                <SelectItem value="EDITOR" className="text-[14px] text-black font-normal">Artist</SelectItem>
                <SelectItem value="PHOTOGRAPHER" className="text-[14px] text-black font-normal">Photographer</SelectItem>
                <SelectItem value="STAFF" className="text-[14px] text-black font-normal">STAFF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[14px] text-black font-normal">상태</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as EmploymentStatus)}>
              <SelectTrigger className="text-[14px] text-black font-normal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE" className="text-[14px] text-black font-normal">활성</SelectItem>
                <SelectItem value="SUSPENDED" className="text-[14px] text-black font-normal">정지</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[14px] text-black font-normal">부서</Label>
            <div ref={deptRef} className="relative">
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={deptOpen}
                className="w-full justify-between text-[14px] text-black font-normal h-9"
                onClick={() => setDeptOpen(!deptOpen)}
              >
                {department ? (
                  <span className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {department}
                  </span>
                ) : (
                  <span className="text-muted-foreground">부서 선택...</span>
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>

              {deptOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-0 text-popover-foreground shadow-md">
                  <div className="flex items-center border-b px-3">
                    <Input
                      placeholder={isManager ? '검색 또는 새 부서 입력...' : '부서 검색...'}
                      value={deptSearch}
                      onChange={(e) => setDeptSearch(e.target.value)}
                      className="border-0 focus-visible:ring-0 h-9 text-[14px]"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1">
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[14px] hover:bg-accent',
                        !department && 'bg-accent'
                      )}
                      onClick={() => handleSelectDept('')}
                    >
                      <Check className={cn('h-4 w-4', department ? 'opacity-0' : 'opacity-100')} />
                      <span className="text-muted-foreground">부서 없음</span>
                    </button>

                    {filteredDepts.map((dept) => (
                      <div
                        key={dept.id}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[14px] hover:bg-accent group',
                          department === dept.name && 'bg-accent'
                        )}
                      >
                        {editingDeptId === dept.id ? (
                          <div className="flex w-full items-center gap-1">
                            <Input
                              value={editingDeptName}
                              onChange={(e) => setEditingDeptName(e.target.value)}
                              className="h-7 text-[14px] flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditDept(dept.id);
                                if (e.key === 'Escape') { setEditingDeptId(null); setEditingDeptName(''); }
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleEditDept(dept.id)}
                              disabled={updateDeptMutation.isPending}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => { setEditingDeptId(null); setEditingDeptName(''); }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="flex flex-1 items-center gap-2"
                              onClick={() => handleSelectDept(dept.name)}
                            >
                              <Check className={cn('h-4 w-4', department === dept.name ? 'opacity-100' : 'opacity-0')} />
                              {dept.name}
                            </button>
                            {isManager && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  className="p-0.5 rounded hover:bg-gray-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingDeptId(dept.id);
                                    setEditingDeptName(dept.name);
                                  }}
                                >
                                  <Pencil className="h-3 w-3 text-gray-500" />
                                </button>
                                <button
                                  type="button"
                                  className="p-0.5 rounded hover:bg-red-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDept(dept.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}

                    {isManager && deptSearch.trim() && !exactMatch && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[14px] hover:bg-accent text-primary"
                        onClick={handleAddDept}
                        disabled={createDeptMutation.isPending}
                      >
                        <Plus className="h-4 w-4" />
                        <span>새 부서 추가: &quot;{deptSearch}&quot;</span>
                      </button>
                    )}

                    {filteredDepts.length === 0 && !deptSearch.trim() && (
                      <div className="py-4 text-center text-[14px] text-muted-foreground">
                        등록된 부서가 없습니다
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-[14px] text-black font-normal">권한</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="viewAllOrders"
                  checked={canViewAllOrders}
                  onCheckedChange={(v) => setCanViewAllOrders(v as boolean)}
                />
                <label htmlFor="viewAllOrders" className="text-[14px] text-black font-normal cursor-pointer">
                  전체 주문 열람 (미체크 시 본인 주문만)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="manageProducts"
                  checked={canManageProducts}
                  onCheckedChange={(v) => setCanManageProducts(v as boolean)}
                />
                <label htmlFor="manageProducts" className="text-[14px] text-black font-normal cursor-pointer">
                  상품 관리 (마이상품)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="viewSettlement"
                  checked={canViewSettlement}
                  onCheckedChange={(v) => setCanViewSettlement(v as boolean)}
                />
                <label htmlFor="viewSettlement" className="text-[14px] text-black font-normal cursor-pointer">
                  정산/입금 정보 열람
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button
            size="sm"
            disabled={updateMutation.isPending}
            onClick={handleSubmit}
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Remove Dialog ====================

function RemoveDialog({
  employment,
  onClose,
}: {
  employment: Employment;
  onClose: () => void;
}) {
  const removeMutation = useRemoveEmployment();

  const handleRemove = () => {
    removeMutation.mutate(employment.id, {
      onSuccess: () => {
        toast.success('직원이 제거되었습니다');
        onClose();
      },
      onError: () => {
        toast.error('직원 제거에 실패했습니다');
      },
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[14px] flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            직원 제거
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            <strong>{employment.member.clientName}</strong> ({employment.member.email})님을
            거래처에서 제거하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={removeMutation.isPending}
            onClick={handleRemove}
          >
            {removeMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            제거
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

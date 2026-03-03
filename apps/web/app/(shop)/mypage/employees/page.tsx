'use client';

import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
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
  Plus,
  Pencil,
  User,
  MapPin,
  Star,
  ShoppingBag,
  Calendar,
  Wallet,
  Camera,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeesPage() {
  const { user } = useAuthStore();
  const clientId = user?.type === 'employee' ? user.clientId : user?.id;

  const { data: employees, isLoading: employeesLoading } = useEmployeesByClient(clientId);
  const { data: invitations } = useInvitationsByClient(clientId);

  const isManager =
    user?.type === 'client' ||
    (user?.type === 'employee' && user?.employeeRole === 'MANAGER');

  const isOwner = user?.type === 'client';

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Employment | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Employment | null>(null);
  const [deptManageOpen, setDeptManageOpen] = useState(false);

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
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setDeptManageOpen(true)}>
            <Building className="h-4 w-4 mr-1" />
            부서 관리
          </Button>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            직원 초대
          </Button>
        </div>
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
                        {emp.memberClientId === emp.companyClientId ? null : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {emp.id !== user?.employmentId && (
                                <DropdownMenuItem onClick={() => setEditTarget(emp)}>
                                  <Settings className="h-3.5 w-3.5 mr-2" />
                                  권한 설정
                                </DropdownMenuItem>
                              )}
                              {isOwner && (
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => setRemoveTarget(emp)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  제거
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
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
          enableSchedule={user?.enableSchedule ?? true}
          enableRecruitment={user?.enableRecruitment ?? true}
          onClose={() => setEditTarget(null)}
        />
      )}
      {removeTarget && (
        <RemoveDialog
          employment={removeTarget}
          onClose={() => setRemoveTarget(null)}
        />
      )}
      {deptManageOpen && clientId && (
        <DepartmentManageDialog
          clientId={clientId}
          onClose={() => setDeptManageOpen(false)}
          onDepartmentRenamed={() => {}}
          onDepartmentDeleted={() => {}}
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
  enableSchedule,
  enableRecruitment,
  onClose,
}: {
  employment: Employment;
  enableSchedule: boolean;
  enableRecruitment: boolean;
  onClose: () => void;
}) {
  const { user } = useAuthStore();
  const clientId = user?.type === 'employee' ? user.clientId : user?.id;

  const [role, setRole] = useState<EmployeeRole>(employment.role);
  const [canViewAllOrders, setCanViewAllOrders] = useState(employment.canViewAllOrders); // 주문내역 범위: true=전체, false=본인것만
  const [canViewSettlement, setCanViewSettlement] = useState(employment.canViewSettlement);
  const [canViewAllSettlement, setCanViewAllSettlement] = useState(employment.canViewAllSettlement ?? false); // 월거래집계 범위
  const [canManageSchedule, setCanManageSchedule] = useState(employment.canManageSchedule);
  const [canManageRecruitment, setCanManageRecruitment] = useState(employment.canManageRecruitment);
  const [status, setStatus] = useState<EmploymentStatus>(employment.status);
  const [department, setDepartment] = useState(employment.department || '');

  const isManager = role === 'MANAGER';

  const { data: departments = [] } = useEmployeeDepartments(clientId);
  const updateMutation = useUpdateEmployment();

  const handleSubmit = () => {
    updateMutation.mutate(
      {
        id: employment.id,
        data: {
          role,
          canViewAllOrders,
          canManageProducts: true,
          canViewSettlement,
          canViewAllSettlement,
          canManageSchedule,
          canManageRecruitment,
          status,
          department,
        },
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[18px] text-black font-bold">
            권한 설정 — {employment.member.clientName}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {employment.member.email}
          </DialogDescription>
        </DialogHeader>

        {/* 기본 정보 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <Label className="text-[14px] text-black font-normal">부서</Label>
            <Select value={department || '__none__'} onValueChange={(v) => setDepartment(v === '__none__' ? '' : v)}>
              <SelectTrigger className="text-[14px] text-black font-normal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-[14px] text-gray-400">부서 없음</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name} className="text-[14px] text-black font-normal">
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 메뉴 접근 권한 - 사이드메뉴 형태 */}
        <div className="space-y-2">
          <Label className="text-[14px] text-black font-normal">메뉴 접근 권한</Label>

          {/* 고정 메뉴 */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-gray-50 border-b">
              <span className="text-[12px] font-medium text-gray-500">고정 메뉴</span>
            </div>
            <div className="divide-y">
              <PermMenuRow icon={<User className="h-3.5 w-3.5" />} label="회원정보" badge="항상" />
              <PermMenuRow
                icon={<Users className="h-3.5 w-3.5" />}
                label="직원관리"
                badge={isManager ? '매니저' : '최고관리자만'}
                badgeVariant={isManager ? 'blue' : 'gray'}
              />
              <PermMenuRow icon={<MapPin className="h-3.5 w-3.5" />} label="배송지 관리" badge="항상" />
              <PermMenuRow icon={<Star className="h-3.5 w-3.5" />} label="마이상품" badge="항상" />
            </div>
          </div>

          {/* 선택 메뉴 */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-gray-50 border-b">
              <span className="text-[12px] font-medium text-gray-500">선택 메뉴</span>
            </div>
            <div className="divide-y">
              <PermMenuScopeRow
                icon={<ShoppingBag className="h-3.5 w-3.5" />}
                label="주문내역"
                allValue={canViewAllOrders}
                onChange={setCanViewAllOrders}
              />
              <PermMenuToggleScopeRow
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="월거래집계"
                checked={canViewSettlement}
                onCheckedChange={(v) => {
                  setCanViewSettlement(v);
                  if (!v) setCanViewAllSettlement(false);
                }}
                allValue={canViewAllSettlement}
                onAllValueChange={setCanViewAllSettlement}
              />
              <PermMenuRow
                icon={<Wallet className="h-3.5 w-3.5" />}
                label="입금내역"
                badge="월거래집계 연동"
                badgeVariant={canViewSettlement ? 'blue' : 'gray'}
                dim={!canViewSettlement}
              />
              {enableSchedule && (
                <PermMenuToggleRow
                  icon={<Camera className="h-3.5 w-3.5" />}
                  label="일정관리"
                  checked={canManageSchedule}
                  onCheckedChange={setCanManageSchedule}
                />
              )}
              {enableRecruitment && (
                <PermMenuToggleRow
                  icon={<Briefcase className="h-3.5 w-3.5" />}
                  label="구인방"
                  checked={canManageRecruitment}
                  onCheckedChange={setCanManageRecruitment}
                />
              )}
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

// ==================== Permission Menu Row Helpers ====================

function PermMenuRow({
  icon,
  label,
  badge,
  badgeVariant = 'green',
  dim = false,
}: {
  icon: React.ReactNode;
  label: string;
  badge: string;
  badgeVariant?: 'green' | 'blue' | 'gray';
  dim?: boolean;
}) {
  const badgeClass =
    badgeVariant === 'green'
      ? 'bg-green-50 text-green-700 border-green-200'
      : badgeVariant === 'blue'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-gray-50 text-gray-500 border-gray-200';

  return (
    <div className={`flex items-center justify-between px-3.5 py-2.5 ${dim ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-2.5 text-[14px] text-black font-normal">
        <span className="text-gray-500">{icon}</span>
        {label}
      </div>
      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${badgeClass}`}>
        {badge}
      </span>
    </div>
  );
}

function PermMenuToggleRow({
  icon,
  label,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <div className={`flex items-center gap-2.5 text-[14px] font-normal ${checked ? 'text-black' : 'text-gray-400'}`}>
        <span className={checked ? 'text-gray-600' : 'text-gray-300'}>{icon}</span>
        {label}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/** 주문내역처럼 항상 보이지만 범위(전체/본인것만)를 선택하는 행 */
function PermMenuScopeRow({
  icon,
  label,
  allValue,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  allValue: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <div className="flex items-center gap-2.5 text-[14px] text-black font-normal">
        <span className="text-gray-600">{icon}</span>
        {label}
      </div>
      <div className="flex rounded border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`text-[12px] px-2.5 py-0.5 transition-colors ${
            allValue ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          전체
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`text-[12px] px-2.5 py-0.5 border-l border-gray-200 transition-colors ${
            !allValue ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          본인것만
        </button>
      </div>
    </div>
  );
}

/** ON/OFF 스위치 + 활성화 시 범위(전체/본인것만) 선택 행 */
function PermMenuToggleScopeRow({
  icon,
  label,
  checked,
  onCheckedChange,
  allValue,
  onAllValueChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  allValue: boolean;
  onAllValueChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <div className={`flex items-center gap-2.5 text-[14px] font-normal ${checked ? 'text-black' : 'text-gray-400'}`}>
        <span className={checked ? 'text-gray-600' : 'text-gray-300'}>{icon}</span>
        {label}
      </div>
      <div className="flex items-center gap-2">
        {checked && (
          <div className="flex rounded border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => onAllValueChange(true)}
              className={`text-[12px] px-2.5 py-0.5 transition-colors ${
                allValue ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => onAllValueChange(false)}
              className={`text-[12px] px-2.5 py-0.5 border-l border-gray-200 transition-colors ${
                !allValue ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              본인것만
            </button>
          </div>
        )}
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}

// ==================== Department Manage Dialog (Manager 전용) ====================

function DepartmentManageDialog({
  clientId,
  onClose,
  onDepartmentRenamed,
  onDepartmentDeleted,
}: {
  clientId: string;
  onClose: () => void;
  onDepartmentRenamed: (oldName: string, newName: string) => void;
  onDepartmentDeleted: (name: string) => void;
}) {
  const { data: departments = [] } = useEmployeeDepartments(clientId);
  const createMutation = useCreateClientDepartment();
  const updateMutation = useUpdateClientDepartment();
  const deleteMutation = useDeleteClientDepartment();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    createMutation.mutate(
      { clientId, name: newName.trim() },
      {
        onSuccess: () => {
          setNewName('');
          toast.success('부서가 추가되었습니다');
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : '부서 추가에 실패했습니다'),
      },
    );
  };

  const handleUpdate = (deptId: string, oldName: string) => {
    if (!editingName.trim() || editingName.trim() === oldName) {
      setEditingId(null);
      return;
    }
    updateMutation.mutate(
      { id: deptId, data: { name: editingName.trim() } },
      {
        onSuccess: () => {
          onDepartmentRenamed(oldName, editingName.trim());
          setEditingId(null);
          setEditingName('');
          toast.success('부서명이 수정되었습니다');
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : '부서명 수정에 실패했습니다'),
      },
    );
  };

  const handleDelete = (deptId: string, name: string) => {
    if (!confirm(`"${name}" 부서를 삭제하시겠습니까?`)) return;
    deleteMutation.mutate(deptId, {
      onSuccess: () => {
        onDepartmentDeleted(name);
        toast.success('부서가 삭제되었습니다');
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : '부서 삭제에 실패했습니다'),
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[18px] text-black font-bold flex items-center gap-2">
            <Building className="h-5 w-5" />
            부서 관리
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            부서를 추가, 수정, 삭제할 수 있습니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* 부서 추가 */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="새 부서명 입력..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="text-[14px] flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            />
            <Button
              size="sm"
              disabled={!newName.trim() || createMutation.isPending}
              onClick={handleAdd}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {/* 부서 목록 */}
          <div className="border rounded-md divide-y">
            {departments.length === 0 ? (
              <div className="py-6 text-center text-[14px] text-gray-400">
                등록된 부서가 없습니다
              </div>
            ) : (
              departments.map((dept) => (
                <div key={dept.id} className="flex items-center gap-2 px-3 py-2">
                  {editingId === dept.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 text-[14px] flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(dept.id, dept.name);
                          if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleUpdate(dept.id, dept.name)}
                        disabled={updateMutation.isPending}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => { setEditingId(null); setEditingName(''); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-[14px] text-black font-normal flex-1">{dept.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => { setEditingId(dept.id); setEditingName(dept.name); }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDelete(dept.id, dept.name)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button size="sm" onClick={onClose}>닫기</Button>
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

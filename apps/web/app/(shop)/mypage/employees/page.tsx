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
} from 'lucide-react';
import { toast } from 'sonner';

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
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-3 py-2 font-medium">이름</th>
                    <th className="text-left px-3 py-2 font-medium">이메일</th>
                    <th className="text-left px-3 py-2 font-medium">역할</th>
                    <th className="text-left px-3 py-2 font-medium">주문 열람</th>
                    <th className="text-left px-3 py-2 font-medium">상태</th>
                    <th className="text-left px-3 py-2 font-medium">최근 접속</th>
                    <th className="text-right px-3 py-2 font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2">{emp.member.clientName}</td>
                      <td className="px-3 py-2 text-gray-500">{emp.member.email}</td>
                      <td className="px-3 py-2">
                        <span className="text-[14px] text-black">
                          {emp.role === 'MANAGER' ? '관리자' : emp.role === 'EDITOR' ? '편집자' : '직원'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {emp.canViewAllOrders ? '전체' : '본인만'}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                            emp.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {emp.status === 'ACTIVE' ? '활성' : '정지'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {emp.member.lastLoginAt
                          ? new Date(emp.member.lastLoginAt).toLocaleDateString('ko-KR')
                          : '-'}
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
          {invitation.role === 'MANAGER' ? '관리자' : invitation.role === 'EDITOR' ? '편집자' : '직원'}
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
                  <SelectItem value="MANAGER" className="text-[14px]">관리자 (직원관리 가능)</SelectItem>
                  <SelectItem value="EDITOR" className="text-[14px]">편집자</SelectItem>
                  <SelectItem value="STAFF" className="text-[14px]">직원</SelectItem>
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
  const [role, setRole] = useState<EmployeeRole>(employment.role);
  const [canViewAllOrders, setCanViewAllOrders] = useState(employment.canViewAllOrders);
  const [canManageProducts, setCanManageProducts] = useState(employment.canManageProducts);
  const [canViewSettlement, setCanViewSettlement] = useState(employment.canViewSettlement);
  const [status, setStatus] = useState<EmploymentStatus>(employment.status);
  const updateMutation = useUpdateEmployment();

  const handleSubmit = () => {
    updateMutation.mutate(
      {
        id: employment.id,
        data: { role, canViewAllOrders, canManageProducts, canViewSettlement, status },
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
          <DialogTitle className="text-[14px]">
            권한 설정 — {employment.member.clientName}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {employment.member.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[11px]">역할</Label>
            <Select value={role} onValueChange={(v) => setRole(v as EmployeeRole)}>
              <SelectTrigger className="text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANAGER" className="text-[11px]">관리자</SelectItem>
                <SelectItem value="EDITOR" className="text-[11px]">편집자</SelectItem>
                <SelectItem value="STAFF" className="text-[11px]">직원</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px]">상태</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as EmploymentStatus)}>
              <SelectTrigger className="text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE" className="text-[11px]">활성</SelectItem>
                <SelectItem value="SUSPENDED" className="text-[11px]">정지</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-[11px]">권한</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="viewAllOrders"
                  checked={canViewAllOrders}
                  onCheckedChange={(v) => setCanViewAllOrders(v as boolean)}
                />
                <label htmlFor="viewAllOrders" className="text-[11px] cursor-pointer">
                  전체 주문 열람 (미체크 시 본인 주문만)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="manageProducts"
                  checked={canManageProducts}
                  onCheckedChange={(v) => setCanManageProducts(v as boolean)}
                />
                <label htmlFor="manageProducts" className="text-[11px] cursor-pointer">
                  상품 관리 (마이상품)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="viewSettlement"
                  checked={canViewSettlement}
                  onCheckedChange={(v) => setCanViewSettlement(v as boolean)}
                />
                <label htmlFor="viewSettlement" className="text-[11px] cursor-pointer">
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

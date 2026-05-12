'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, ExternalLink, Loader2, Check, X, FileText } from 'lucide-react';
import {
  useBusinessUpgradeRequests,
  useProcessBusinessUpgrade,
  useClientBusinessCertUrl,
  type BusinessUpgradeRequest,
  type BusinessUpgradeRequestStatus,
} from '@/hooks/use-admin-business-upgrade';

const STATUS_LABEL: Record<BusinessUpgradeRequestStatus, string> = {
  pending: '승인 대기',
  approved: '승인됨',
  rejected: '반려됨',
};

export default function BusinessUpgradesPage() {
  const [status, setStatus] = useState<BusinessUpgradeRequestStatus>('pending');
  const { data: requests, isLoading, error } = useBusinessUpgradeRequests(status);
  const processUpgrade = useProcessBusinessUpgrade();
  const certUrl = useClientBusinessCertUrl();

  const [rejectTarget, setRejectTarget] = useState<BusinessUpgradeRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const handleViewCert = async (id: string) => {
    setActionError(null);
    try {
      const res = await certUrl.mutateAsync(id);
      window.open(res.url, '_blank', 'noopener');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : '등록증을 불러오지 못했습니다.');
    }
  };

  const handleApprove = async (id: string) => {
    setActionError(null);
    try {
      await processUpgrade.mutateAsync({ id, action: 'approve' });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : '승인 처리에 실패했습니다.');
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionError(null);
    try {
      await processUpgrade.mutateAsync({
        id: rejectTarget.id,
        action: 'reject',
        rejectReason: rejectReason.trim() || undefined,
      });
      setRejectTarget(null);
      setRejectReason('');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : '반려 처리에 실패했습니다.');
    }
  };

  const list = requests ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="사업자 회원 전환 신청"
        description="개인회원의 사업자 회원 전환 신청을 검토하고 승인/반려합니다."
      />

      <div className="flex items-center gap-2">
        <span className="text-[14px] text-black font-normal">상태</span>
        <Select value={status} onValueChange={(v) => setStatus(v as BusinessUpgradeRequestStatus)}>
          <SelectTrigger className="w-[140px] h-9 text-[14px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">승인 대기</SelectItem>
            <SelectItem value="approved">승인됨</SelectItem>
            <SelectItem value="rejected">반려됨</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 p-3 text-[13px] text-red-800 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-[14px] text-red-600">목록을 불러오지 못했습니다.</div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center text-[14px] text-gray-500">
              {STATUS_LABEL[status]} 상태의 신청이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[13px]">회원명</TableHead>
                  <TableHead className="text-[13px]">이메일</TableHead>
                  <TableHead className="text-[13px]">사업자등록번호</TableHead>
                  <TableHead className="text-[13px]">대표자</TableHead>
                  <TableHead className="text-[13px]">신청일</TableHead>
                  <TableHead className="text-[13px]">등록증</TableHead>
                  <TableHead className="text-[13px] text-right">처리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="text-[14px]">{req.clientName || '-'}</TableCell>
                    <TableCell className="text-[14px]">{req.email || '-'}</TableCell>
                    <TableCell className="text-[14px]">{req.businessNumber || '-'}</TableCell>
                    <TableCell className="text-[14px]">{req.representative || '-'}</TableCell>
                    <TableCell className="text-[14px]">
                      {req.submittedAt ? new Date(req.submittedAt).toLocaleDateString('ko-KR') : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[12px]"
                        onClick={() => handleViewCert(req.id)}
                        disabled={certUrl.isPending}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        보기
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      {status === 'pending' ? (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 text-[12px] bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleApprove(req.id)}
                            disabled={processUpgrade.isPending}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[12px] border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setRejectTarget(req);
                              setRejectReason('');
                            }}
                            disabled={processUpgrade.isPending}
                          >
                            <X className="h-3 w-3 mr-1" />
                            반려
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                          <Badge
                            className={
                              status === 'approved'
                                ? 'bg-green-600 hover:bg-green-600 text-white text-[12px]'
                                : 'bg-red-500 hover:bg-red-500 text-white text-[12px]'
                            }
                          >
                            {STATUS_LABEL[status]}
                          </Badge>
                          {status === 'rejected' && req.rejectReason && (
                            <span className="text-[12px] text-gray-500">{req.rejectReason}</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">신청 반려</DialogTitle>
            <DialogDescription className="text-[14px] text-black font-normal">
              {rejectTarget?.clientName ? `${rejectTarget.clientName} 회원의 ` : ''}사업자 전환 신청을 반려합니다. 반려 사유를 입력해 주세요.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="반려 사유 (예: 사업자등록증 식별 불가)"
            className="text-[14px] min-h-[80px]"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={processUpgrade.isPending}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processUpgrade.isPending}>
              {processUpgrade.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              반려
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  ArrowRightLeft,
  ClipboardCheck,
  Wallet,
  Calendar,
  XCircle,
  Trash2,
  Copy,
  CircleDollarSign,
  Database,
  HardDriveDownload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useBulkUpdateStatus,
  useBulkCancel,
  useBulkDelete,
  useBulkDuplicate,
  useBulkResetAmount,
  useBulkUpdateReceiptDate,
  useDataCleanup,
  useBulkDeleteOriginals,
} from '@/hooks/use-order-bulk-actions';
import { ConfirmActionDialog } from './confirm-action-dialog';
import { ChangeReceiptDateDialog } from './change-receipt-date-dialog';
import { DataCleanupDialog } from './data-cleanup-dialog';

const STATUS_OPTIONS = [
  { value: 'pending_receipt', label: '접수대기' },
  { value: 'receipt_completed', label: '접수완료' },
  { value: 'in_production', label: '생산진행' },
  { value: 'ready_for_shipping', label: '배송준비' },
  { value: 'shipped', label: '배송완료' },
  { value: 'cancelled', label: '취소' },
];

interface BulkActionToolbarProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function BulkActionToolbar({
  selectedIds,
  onClearSelection,
  onActionComplete,
}: BulkActionToolbarProps) {
  const [cancelDialog, setCancelDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState(false);
  const [resetAmountDialog, setResetAmountDialog] = useState(false);
  const [receiptDateDialog, setReceiptDateDialog] = useState(false);
  const [dataCleanupDialog, setDataCleanupDialog] = useState(false);
  const [deleteOriginalsDialog, setDeleteOriginalsDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const bulkUpdateStatus = useBulkUpdateStatus();
  const bulkCancel = useBulkCancel();
  const bulkDelete = useBulkDelete();
  const bulkDuplicate = useBulkDuplicate();
  const bulkResetAmount = useBulkResetAmount();
  const bulkUpdateReceiptDate = useBulkUpdateReceiptDate();
  const dataCleanup = useDataCleanup();
  const bulkDeleteOriginals = useBulkDeleteOriginals();

  const orderIds = Array.from(selectedIds);
  const count = selectedIds.size;

  const handleResult = (result: { success: number; failed?: string[] }, action: string) => {
    const failCount = result.failed?.length || 0;
    if (failCount > 0) {
      alert(`${action}: ${result.success}건 성공, ${failCount}건 실패`);
    } else {
      alert(`${action}: ${result.success}건 완료`);
    }
    onActionComplete();
  };

  const handleStatusChange = (status: string) => {
    const label = STATUS_OPTIONS.find(s => s.value === status)?.label || status;
    bulkUpdateStatus.mutate({ orderIds, status }, {
      onSuccess: (result) => handleResult(result, `상태변경 → ${label}`),
    });
  };

  const handleReceiptComplete = () => {
    bulkUpdateStatus.mutate({ orderIds, status: 'receipt_completed' }, {
      onSuccess: (result) => handleResult(result, '접수완료'),
    });
  };

  const handlePaymentPending = () => {
    bulkUpdateStatus.mutate({ orderIds, status: 'pending_receipt', note: '입금대기 처리' }, {
      onSuccess: (result) => handleResult(result, '입금대기'),
    });
  };

  const handleCancel = () => {
    bulkCancel.mutate({ orderIds, reason: cancelReason || undefined }, {
      onSuccess: (result) => {
        handleResult(result, '주문취소');
        setCancelDialog(false);
        setCancelReason('');
      },
    });
  };

  const handleDelete = () => {
    bulkDelete.mutate({ orderIds }, {
      onSuccess: (result) => {
        handleResult(result, '주문삭제');
        setDeleteDialog(false);
      },
    });
  };

  const handleDuplicate = () => {
    bulkDuplicate.mutate({ orderIds }, {
      onSuccess: (result) => {
        handleResult(result, '주문복제');
        setDuplicateDialog(false);
      },
    });
  };

  const handleResetAmount = () => {
    bulkResetAmount.mutate({ orderIds }, {
      onSuccess: (result) => {
        handleResult(result, '0원 처리');
        setResetAmountDialog(false);
      },
    });
  };

  const handleReceiptDateChange = (date: string) => {
    bulkUpdateReceiptDate.mutate({ orderIds, receiptDate: date }, {
      onSuccess: (result) => {
        handleResult(result, '접수일 변경');
        setReceiptDateDialog(false);
      },
    });
  };

  const handleDeleteOriginals = () => {
    bulkDeleteOriginals.mutate({ orderIds }, {
      onSuccess: (result) => {
        handleResult(result, '원본 이미지 삭제');
        setDeleteOriginalsDialog(false);
      },
    });
  };

  const handleDataCleanup = (data: { startDate: string; endDate: string; deleteThumbnails: boolean }) => {
    dataCleanup.mutate(data, {
      onSuccess: (result) => {
        alert(`데이터 삭제: ${result.deleted}건 삭제 완료`);
        onActionComplete();
        setDataCleanupDialog(false);
      },
    });
  };

  const isAnyLoading = bulkUpdateStatus.isPending || bulkCancel.isPending || bulkDelete.isPending ||
    bulkDuplicate.isPending || bulkResetAmount.isPending || bulkUpdateReceiptDate.isPending || dataCleanup.isPending ||
    bulkDeleteOriginals.isPending;

  return (
    <>
      <div className="sticky bottom-0 z-40 -mx-6 px-6">
        <div className="bg-gray-900 text-white rounded-t-lg shadow-2xl px-4 py-2.5 flex items-center justify-between gap-2">
          {/* 왼쪽: 선택 정보 */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-xs">{count}건 선택</Badge>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-7 text-xs px-2"
              onClick={onClearSelection}>
              <X className="h-3 w-3 mr-1" />
              해제
            </Button>
          </div>

          {/* 오른쪽: 액션 버튼들 */}
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {/* 단계변경 드롭다운 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-700 h-7 text-xs px-2" disabled={isAnyLoading}>
                  <ArrowRightLeft className="h-3 w-3 mr-1" />
                  단계변경
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuItem key={opt.value} onClick={() => handleStatusChange(opt.value)}>
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-4 bg-gray-600 mx-1" />

            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-700 h-7 text-xs px-2"
              onClick={handleReceiptComplete} disabled={isAnyLoading}>
              <ClipboardCheck className="h-3 w-3 mr-1" />
              접수완료
            </Button>

            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-700 h-7 text-xs px-2"
              onClick={handlePaymentPending} disabled={isAnyLoading}>
              <Wallet className="h-3 w-3 mr-1" />
              입금대기
            </Button>

            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-700 h-7 text-xs px-2"
              onClick={() => setReceiptDateDialog(true)} disabled={isAnyLoading}>
              <Calendar className="h-3 w-3 mr-1" />
              접수일변경
            </Button>

            <div className="w-px h-4 bg-gray-600 mx-1" />

            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-gray-700 h-7 text-xs px-2"
              onClick={() => setCancelDialog(true)} disabled={isAnyLoading}>
              <XCircle className="h-3 w-3 mr-1" />
              주문취소
            </Button>

            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-gray-700 h-7 text-xs px-2"
              onClick={() => setDeleteDialog(true)} disabled={isAnyLoading}>
              <Trash2 className="h-3 w-3 mr-1" />
              주문삭제
            </Button>

            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-700 h-7 text-xs px-2"
              onClick={() => setDuplicateDialog(true)} disabled={isAnyLoading}>
              <Copy className="h-3 w-3 mr-1" />
              주문복제
            </Button>

            <Button variant="ghost" size="sm" className="text-orange-400 hover:text-orange-300 hover:bg-gray-700 h-7 text-xs px-2"
              onClick={() => setResetAmountDialog(true)} disabled={isAnyLoading}>
              <CircleDollarSign className="h-3 w-3 mr-1" />
              0원으로
            </Button>

            <div className="w-px h-4 bg-gray-600 mx-1" />

            <Button variant="ghost" size="sm" className="text-orange-400 hover:text-orange-300 hover:bg-gray-700 h-7 text-xs px-2"
              onClick={() => setDeleteOriginalsDialog(true)} disabled={isAnyLoading}>
              <HardDriveDownload className="h-3 w-3 mr-1" />
              원본삭제
            </Button>

            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-gray-700 h-7 text-xs px-2"
              onClick={() => setDataCleanupDialog(true)} disabled={isAnyLoading}>
              <Database className="h-3 w-3 mr-1" />
              데이터삭제
            </Button>
          </div>
        </div>
      </div>

      {/* 주문취소 다이얼로그 */}
      <ConfirmActionDialog
        open={cancelDialog}
        onOpenChange={setCancelDialog}
        title="주문 일괄 취소"
        description={`선택한 ${count}건의 주문을 취소합니다. 배송완료된 주문은 제외됩니다.`}
        confirmLabel="취소 실행"
        variant="destructive"
        isLoading={bulkCancel.isPending}
        onConfirm={handleCancel}
      >
        <Textarea
          placeholder="취소 사유 (선택)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={2}
        />
      </ConfirmActionDialog>

      {/* 주문삭제 다이얼로그 */}
      <ConfirmActionDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="주문 일괄 삭제"
        description={`선택한 ${count}건의 주문을 영구 삭제합니다. 접수대기/취소 상태만 삭제 가능하며, 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제 실행"
        variant="destructive"
        isLoading={bulkDelete.isPending}
        onConfirm={handleDelete}
      />

      {/* 주문복제 다이얼로그 */}
      <ConfirmActionDialog
        open={duplicateDialog}
        onOpenChange={setDuplicateDialog}
        title="주문 일괄 복제"
        description={`선택한 ${count}건의 주문을 복제합니다. 새 주문번호가 부여되며 접수대기 상태로 생성됩니다.`}
        confirmLabel="복제 실행"
        isLoading={bulkDuplicate.isPending}
        onConfirm={handleDuplicate}
      />

      {/* 0원 처리 다이얼로그 */}
      <ConfirmActionDialog
        open={resetAmountDialog}
        onOpenChange={setResetAmountDialog}
        title="금액 0원 처리"
        description={`선택한 ${count}건의 주문금액을 모두 0원으로 변경합니다.`}
        confirmLabel="0원 처리"
        variant="destructive"
        isLoading={bulkResetAmount.isPending}
        onConfirm={handleResetAmount}
      />

      {/* 접수일 변경 다이얼로그 */}
      <ChangeReceiptDateDialog
        open={receiptDateDialog}
        onOpenChange={setReceiptDateDialog}
        selectedCount={count}
        isLoading={bulkUpdateReceiptDate.isPending}
        onConfirm={handleReceiptDateChange}
      />

      {/* 원본 이미지 일괄 삭제 다이얼로그 */}
      <ConfirmActionDialog
        open={deleteOriginalsDialog}
        onOpenChange={setDeleteOriginalsDialog}
        title="원본 이미지 일괄 삭제"
        description={`선택한 ${count}건의 주문에서 원본 이미지를 삭제합니다. 배송완료 + PDF 완료 항목만 삭제됩니다.`}
        confirmLabel="원본 삭제 실행"
        variant="destructive"
        isLoading={bulkDeleteOriginals.isPending}
        onConfirm={handleDeleteOriginals}
      />

      {/* 데이터 삭제 다이얼로그 */}
      <DataCleanupDialog
        open={dataCleanupDialog}
        onOpenChange={setDataCleanupDialog}
        isLoading={dataCleanup.isPending}
        onConfirm={handleDataCleanup}
      />
    </>
  );
}

'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { cancelUpload } from '@/lib/background-upload';

interface UploadProgressModalProps {
  isOpen: boolean;
  newCartItemIds: string[];
  primaryIds: string[];
  onClose: () => void;
}

export function UploadProgressModal({
  isOpen,
  newCartItemIds,
  primaryIds,
  onClose,
}: UploadProgressModalProps) {
  const router = useRouter();
  const cartItems = useCartStore((state) => state.items);

  const idSet = useMemo(() => new Set(newCartItemIds), [newCartItemIds]);
  const primaryIdSet = useMemo(() => new Set(primaryIds), [primaryIds]);

  // 이번 배치에 해당하는 카트 아이템만 필터
  const uploadItems = useMemo(
    () => cartItems.filter((item) => idSet.has(item.id)),
    [cartItems, idSet],
  );

  // 폴더별 그룹핑
  const folderGroups = useMemo(() => {
    const groups = new Map<string, typeof uploadItems>();
    uploadItems.forEach((item) => {
      const folderId = item.albumOrderInfo?.folderId || item.id;
      if (!groups.has(folderId)) groups.set(folderId, []);
      groups.get(folderId)!.push(item);
    });
    return groups;
  }, [uploadItems]);

  // primary 아이템만으로 진행률 계산 (폴더당 1개, 중복 방지)
  const primaryItems = useMemo(
    () => uploadItems.filter((item) => primaryIdSet.has(item.id)),
    [uploadItems, primaryIdSet],
  );

  const aggregateProgress = useMemo(() => {
    const totalFiles = primaryItems.reduce((sum, item) => sum + (item.totalFileCount || 0), 0);
    const uploadedFiles = primaryItems.reduce((sum, item) => sum + (item.uploadedFileCount || 0), 0);
    const overallPercent = totalFiles > 0 ? Math.round((uploadedFiles / totalFiles) * 100) : 0;
    return { totalFiles, uploadedFiles, overallPercent };
  }, [primaryItems]);

  const allCompleted =
    primaryItems.length > 0 && primaryItems.every((item) => item.uploadStatus === 'completed');
  const anyFailed = primaryItems.some((item) => item.uploadStatus === 'failed');
  const anyCancelled = primaryItems.some((item) => (item.uploadStatus as string) === 'cancelled');
  const isUploading = !allCompleted && !anyFailed && !anyCancelled;

  // 전체 완료 시 자동으로 장바구니 이동
  useEffect(() => {
    if (allCompleted && isOpen) {
      const timer = setTimeout(() => {
        onClose();
        router.push('/cart');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [allCompleted, isOpen, onClose, router]);

  const handleCancel = () => {
    primaryIds.forEach((id) => cancelUpload(id));
    setTimeout(onClose, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className={cn('sm:max-w-md', isUploading && '[&>button.absolute]:hidden')}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (isUploading) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {allCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : anyFailed || anyCancelled ? (
              <XCircle className="h-5 w-5 text-red-600" />
            ) : (
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            )}
            {allCompleted
              ? '업로드 완료'
              : anyFailed
                ? '업로드 실패'
                : anyCancelled
                  ? '업로드 중단됨'
                  : '원본 파일 업로드 중...'}
          </DialogTitle>
          <DialogDescription>
            {allCompleted
              ? '모든 파일이 업로드되었습니다. 장바구니로 이동합니다.'
              : anyFailed
                ? '일부 파일 업로드에 실패했습니다. 장바구니에서 재시도할 수 있습니다.'
                : anyCancelled
                  ? '업로드가 중단되었습니다.'
                  : '원본 파일을 서버에 업로드하고 있습니다. 잠시만 기다려 주세요.'}
          </DialogDescription>
        </DialogHeader>

        {/* 전체 진행률 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">전체 진행률</span>
            <span className="font-medium tabular-nums">
              {aggregateProgress.uploadedFiles}/{aggregateProgress.totalFiles}건 ({aggregateProgress.overallPercent}%)
            </span>
          </div>
          <Progress value={aggregateProgress.overallPercent} className="h-2.5" />
        </div>

        {/* 폴더별 진행률 */}
        {folderGroups.size > 1 && (
          <div className="max-h-48 overflow-y-auto space-y-2">
            {Array.from(folderGroups.entries()).map(([folderId, items]) => {
              const primary = items.find((i) => primaryIdSet.has(i.id)) || items[0];
              const folderName = primary.albumOrderInfo?.folderName || folderId;
              const status = primary.uploadStatus;
              const progress = primary.uploadProgress || 0;
              const uploaded = primary.uploadedFileCount || 0;
              const total = primary.totalFileCount || 0;

              return (
                <div key={folderId} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                  <FolderOpen className="h-4 w-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium truncate">{folderName}</span>
                      <span className="text-gray-500 tabular-nums ml-2 shrink-0">
                        {status === 'completed' ? (
                          <span className="text-green-600">완료</span>
                        ) : status === 'failed' ? (
                          <span className="text-red-600">실패</span>
                        ) : (
                          `${uploaded}/${total}건`
                        )}
                      </span>
                    </div>
                    <Progress value={status === 'completed' ? 100 : progress} className="h-1.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-end gap-2 pt-1">
          {isUploading && (
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              업로드 중단
            </Button>
          )}
          {(anyFailed || anyCancelled) && (
            <Button
              size="sm"
              onClick={() => {
                onClose();
                router.push('/cart');
              }}
            >
              장바구니로 이동
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

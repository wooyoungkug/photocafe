'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  FolderOpen,
  FileImage,
  AlertTriangle,
  Plus,
  Minus,
  Eye,
  Check,
} from 'lucide-react';
import {
  useAlbumOrderStore,
  type AlbumFolderData,
  type AlbumUploadedFile,
} from '@/stores/album-order-store';
import { formatFileSize } from '@/lib/album-utils';

export function StepFolderAnalysis() {
  const { folders, updateFolderQuantity } = useAlbumOrderStore();
  const [selectedFolder, setSelectedFolder] = useState<AlbumFolderData | null>(null);
  const [thumbnailDialogOpen, setThumbnailDialogOpen] = useState(false);

  // 폴더 썸네일 보기
  const handleViewThumbnails = (folder: AlbumFolderData) => {
    setSelectedFolder(folder);
    setThumbnailDialogOpen(true);
  };

  // 부수 변경
  const handleQuantityChange = (folderId: string, delta: number) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      const newQuantity = Math.max(1, folder.quantity + delta);
      updateFolderQuantity(folderId, newQuantity);
    }
  };

  if (folders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>업로드된 폴더가 없습니다.</p>
        <p className="text-sm">이전 단계에서 폴더를 업로드해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 폴더 목록 */}
      <div className="space-y-4">
        {folders.map((folder, index) => (
          <Card
            key={folder.id}
            className={cn(
              'overflow-hidden',
              folder.hasRatioMismatch && 'border-yellow-400 border-2'
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* 폴더 번호 */}
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{index + 1}</span>
                </div>

                {/* 썸네일 */}
                <div
                  className="w-20 h-20 bg-gray-100 rounded flex-shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => handleViewThumbnails(folder)}
                >
                  {folder.files[0]?.thumbnailUrl ? (
                    <img
                      src={folder.files[0].thumbnailUrl}
                      alt={folder.folderName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  {/* 파일 수 오버레이 */}
                  <div className="absolute bottom-0 right-0 bg-black/60 text-white text-xs px-1 rounded-tl">
                    {folder.fileCount}
                  </div>
                </div>

                {/* 폴더 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h5 className="font-medium truncate">{folder.folderName}</h5>
                    {folder.hasRatioMismatch && (
                      <Badge
                        variant="outline"
                        className="text-yellow-600 border-yellow-400"
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        비율 불일치
                      </Badge>
                    )}
                  </div>

                  {/* 규격 정보 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div className="bg-muted/50 rounded px-2 py-1">
                      <span className="text-muted-foreground">규격:</span>{' '}
                      {folder.representativeSpec ? (
                        <span className="font-medium">
                          {folder.representativeSpec.widthInch}x
                          {folder.representativeSpec.heightInch}"
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="bg-muted/50 rounded px-2 py-1">
                      <span className="text-muted-foreground">파일:</span>{' '}
                      <span className="font-medium">{folder.fileCount}개</span>
                    </div>
                    <div className="bg-muted/50 rounded px-2 py-1">
                      <span className="text-muted-foreground">용량:</span>{' '}
                      <span className="font-medium">{formatFileSize(folder.totalSize)}</span>
                    </div>
                    <div className="bg-muted/50 rounded px-2 py-1">
                      <span className="text-muted-foreground">페이지:</span>{' '}
                      <span className="font-medium">{folder.pageCount}p</span>
                    </div>
                  </div>

                  {/* 첫장/막장 표시 */}
                  <div className="flex items-center gap-2 mt-2">
                    {folder.files.some((f) => f.isFirst) && (
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        첫장 포함
                      </Badge>
                    )}
                    {folder.files.some((f) => f.isLast) && (
                      <Badge className="bg-orange-100 text-orange-700 text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        막장 포함
                      </Badge>
                    )}
                    {folder.files.some((f) => f.isCoverPage) && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        첫막장 포함
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 부수 조절 */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">부수</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleQuantityChange(folder.id, -1)}
                      disabled={folder.quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      value={folder.quantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        updateFolderQuantity(folder.id, Math.max(1, value));
                      }}
                      className="w-16 h-8 text-center"
                      min={1}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleQuantityChange(folder.id, 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* 썸네일 보기 버튼 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewThumbnails(folder)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  보기
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 요약 정보 */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3">주문 요약</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">총 폴더:</span>{' '}
            <span className="font-medium">{folders.length}개</span>
          </div>
          <div>
            <span className="text-muted-foreground">총 파일:</span>{' '}
            <span className="font-medium">
              {folders.reduce((sum, f) => sum + f.fileCount, 0)}개
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">총 부수:</span>{' '}
            <span className="font-medium">
              {folders.reduce((sum, f) => sum + f.quantity, 0)}부
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">총 용량:</span>{' '}
            <span className="font-medium">
              {formatFileSize(folders.reduce((sum, f) => sum + f.totalSize, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* 썸네일 다이얼로그 */}
      <ThumbnailDialog
        folder={selectedFolder}
        open={thumbnailDialogOpen}
        onOpenChange={setThumbnailDialogOpen}
      />
    </div>
  );
}

// 썸네일 다이얼로그 컴포넌트
function ThumbnailDialog({
  folder,
  open,
  onOpenChange,
}: {
  folder: AlbumFolderData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!folder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            {folder.folderName}
            <Badge variant="secondary">{folder.fileCount}개 파일</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] p-4">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {folder.files.map((file, index) => (
              <ThumbnailItem key={file.id} file={file} index={index} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 썸네일 아이템 컴포넌트
function ThumbnailItem({
  file,
  index,
}: {
  file: AlbumUploadedFile;
  index: number;
}) {
  return (
    <div
      className={cn(
        'relative aspect-square rounded overflow-hidden border',
        file.hasRatioWarning && 'border-yellow-400 border-2',
        file.isFirst && 'ring-2 ring-green-500',
        file.isLast && 'ring-2 ring-orange-500',
        file.isCoverPage && 'ring-2 ring-purple-500'
      )}
    >
      {file.thumbnailUrl ? (
        <img
          src={file.thumbnailUrl}
          alt={file.filename}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <FileImage className="w-6 h-6 text-gray-400" />
        </div>
      )}

      {/* 순서 번호 */}
      <div className="absolute top-0 left-0 bg-black/60 text-white text-[10px] px-1">
        {index + 1}
      </div>

      {/* 상태 배지 */}
      {file.isFirst && (
        <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-[10px] text-center">
          첫장
        </div>
      )}
      {file.isLast && (
        <div className="absolute bottom-0 left-0 right-0 bg-orange-500 text-white text-[10px] text-center">
          막장
        </div>
      )}
      {file.isCoverPage && (
        <div className="absolute bottom-0 left-0 right-0 bg-purple-500 text-white text-[10px] text-center">
          첫막장
        </div>
      )}
      {file.hasRatioWarning && !file.isFirst && !file.isLast && !file.isCoverPage && (
        <div className="absolute bottom-0 left-0 right-0 bg-yellow-500 text-white text-[10px] text-center">
          비율 불일치
        </div>
      )}
    </div>
  );
}

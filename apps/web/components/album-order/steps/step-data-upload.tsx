'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FolderOpen, X, AlertTriangle, FileImage, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  useAlbumOrderStore,
  type AlbumFolderData,
  type AlbumUploadedFile,
} from '@/stores/album-order-store';
import {
  detectCoverPageType,
  analyzeRepresentativeSpec,
  findRatioMismatchFiles,
  formatFileSize,
  pixelsToInches,
} from '@/lib/album-utils';

// 지원 파일 형식
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.pdf', '.psd'];

// 이미지 메타데이터 추출
async function extractImageMetadata(file: File): Promise<{
  widthPx: number;
  heightPx: number;
  dpi: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        widthPx: img.naturalWidth,
        heightPx: img.naturalHeight,
        dpi: 300,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지 로드 실패'));
    };

    img.src = url;
  });
}

// 인치 계산
function pxToInch(px: number, dpi: number): number {
  return Math.round((px / dpi) * 10) / 10;
}

export function StepDataUpload() {
  const { folders, setFolders, addFolder, removeFolder, pageLayout } = useAlbumOrderStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 파일 처리
  const processFile = async (
    file: File,
    relativePath: string
  ): Promise<AlbumUploadedFile> => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const coverType = detectCoverPageType(file.name);

    const uploadedFile: AlbumUploadedFile = {
      id,
      file,
      filename: file.name,
      originalName: file.name,
      url: URL.createObjectURL(file),
      widthPx: 0,
      heightPx: 0,
      widthInch: 0,
      heightInch: 0,
      dpi: 300,
      fileSize: file.size,
      sortOrder: 0,
      isFirst: coverType === 'first' || coverType === 'firstlast',
      isLast: coverType === 'last',
      isCoverPage: coverType === 'firstlast',
      hasRatioWarning: false,
      relativePath,
    };

    // 이미지 메타데이터 추출
    if (file.type.startsWith('image/')) {
      try {
        const meta = await extractImageMetadata(file);
        uploadedFile.widthPx = meta.widthPx;
        uploadedFile.heightPx = meta.heightPx;
        uploadedFile.dpi = meta.dpi;
        uploadedFile.widthInch = pxToInch(meta.widthPx, meta.dpi);
        uploadedFile.heightInch = pxToInch(meta.heightPx, meta.dpi);
        uploadedFile.thumbnailUrl = uploadedFile.url;
      } catch (error) {
        uploadedFile.warningMessage = '이미지 분석 실패';
      }
    }

    return uploadedFile;
  };

  // 폴더/파일 읽기 (재귀, 4단계까지)
  const readEntries = async (
    entry: FileSystemEntry,
    path: string = '',
    depth: number = 0
  ): Promise<{ file: File; relativePath: string }[]> => {
    if (depth > 4) return [];

    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      return new Promise((resolve) => {
        fileEntry.file((file) => {
          const ext = '.' + file.name.split('.').pop()?.toLowerCase();
          if (ACCEPTED_EXTENSIONS.includes(ext)) {
            resolve([{ file, relativePath: path }]);
          } else {
            resolve([]);
          }
        }, () => resolve([]));
      });
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();
      const newPath = path ? `${path}/${entry.name}` : entry.name;

      return new Promise((resolve) => {
        const allFiles: { file: File; relativePath: string }[] = [];

        const readBatch = () => {
          reader.readEntries(async (entries) => {
            if (entries.length === 0) {
              resolve(allFiles);
              return;
            }

            for (const childEntry of entries) {
              const childFiles = await readEntries(childEntry, newPath, depth + 1);
              allFiles.push(...childFiles);
            }

            readBatch();
          }, () => resolve(allFiles));
        };

        readBatch();
      });
    }

    return [];
  };

  // 폴더별 그룹화
  const groupFilesByFolder = (
    files: { file: File; relativePath: string }[]
  ): Map<string, { file: File; relativePath: string }[]> => {
    const groups = new Map<string, { file: File; relativePath: string }[]>();

    files.forEach((item) => {
      // 폴더 경로에서 최상위 폴더명 추출
      const parts = item.relativePath.split('/');
      const folderName = parts[0] || '기본 폴더';

      const existing = groups.get(folderName);
      if (existing) {
        existing.push(item);
      } else {
        groups.set(folderName, [item]);
      }
    });

    return groups;
  };

  // 드래그앤드롭 핸들러
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setIsProcessing(true);

    try {
      const items = e.dataTransfer.items;
      const allFiles: { file: File; relativePath: string }[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            const entryFiles = await readEntries(entry);
            allFiles.push(...entryFiles);
          } else {
            const file = item.getAsFile();
            if (file) {
              const ext = '.' + file.name.split('.').pop()?.toLowerCase();
              if (ACCEPTED_EXTENSIONS.includes(ext)) {
                allFiles.push({ file, relativePath: '' });
              }
            }
          }
        }
      }

      if (allFiles.length === 0) {
        toast({
          title: '지원하지 않는 파일 형식',
          description: '지원 형식: JPG, PNG, TIFF, PDF, PSD',
          variant: 'destructive',
        });
        return;
      }

      // 폴더별 그룹화
      const folderGroups = groupFilesByFolder(allFiles);
      const newFolders: AlbumFolderData[] = [];

      for (const [folderName, folderFiles] of folderGroups) {
        // 이미 존재하는 폴더인지 확인
        const existingFolder = folders.find((f) => f.folderName === folderName);
        if (existingFolder) {
          toast({
            title: '중복 폴더',
            description: `${folderName} 폴더가 이미 존재합니다.`,
            variant: 'destructive',
          });
          continue;
        }

        // 파일 처리
        const processedFiles: AlbumUploadedFile[] = [];
        let totalSize = 0;

        for (const { file, relativePath } of folderFiles) {
          const processed = await processFile(file, relativePath);
          processedFiles.push(processed);
          totalSize += file.size;
        }

        // 대표 규격 분석
        const representativeSpec = analyzeRepresentativeSpec(processedFiles);

        // 비율 불일치 파일 감지
        let hasRatioMismatch = false;
        if (representativeSpec) {
          const mismatchFiles = findRatioMismatchFiles(processedFiles, representativeSpec);
          mismatchFiles.forEach((f) => {
            const file = processedFiles.find((pf) => pf.id === f.id);
            if (file) {
              file.hasRatioWarning = true;
              file.warningMessage = '비율 불일치';
            }
          });
          hasRatioMismatch = mismatchFiles.length > 0;
        }

        // 정렬
        processedFiles.sort((a, b) => {
          if (a.isFirst && !b.isFirst) return -1;
          if (!a.isFirst && b.isFirst) return 1;
          if (a.isLast && !b.isLast) return 1;
          if (!a.isLast && b.isLast) return -1;
          return a.originalName.localeCompare(b.originalName, 'ko');
        });

        // sortOrder 부여
        processedFiles.forEach((f, idx) => {
          f.sortOrder = idx;
        });

        const folderData: AlbumFolderData = {
          id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          folderName,
          folderPath: folderFiles[0].relativePath,
          files: processedFiles,
          representativeSpec,
          totalSize,
          fileCount: processedFiles.length,
          pageCount: processedFiles.length,
          quantity: 1,
          hasRatioMismatch,
        };

        newFolders.push(folderData);
      }

      // 폴더 추가
      newFolders.forEach((folder) => addFolder(folder));

      toast({
        title: '업로드 완료',
        description: `${newFolders.length}개 폴더, ${allFiles.length}개 파일이 추가되었습니다.`,
      });
    } catch (error) {
      toast({
        title: '업로드 실패',
        description: '파일 처리 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [folders, addFolder, toast]);

  // 폴더 삭제
  const handleRemoveFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      folder.files.forEach((f) => {
        if (f.url) URL.revokeObjectURL(f.url);
      });
    }
    removeFolder(folderId);
  };

  // 전체 삭제
  const handleClearAll = () => {
    folders.forEach((folder) => {
      folder.files.forEach((f) => {
        if (f.url) URL.revokeObjectURL(f.url);
      });
    });
    setFolders([]);
  };

  return (
    <div className="space-y-6">
      {/* 드롭존 */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-gray-400',
          isProcessing && 'opacity-50 pointer-events-none'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              'p-4 rounded-full transition-colors',
              isDragging ? 'bg-primary/10' : 'bg-gray-100'
            )}
          >
            {isDragging ? (
              <FolderOpen className="h-10 w-10 text-primary" />
            ) : (
              <Upload className="h-10 w-10 text-gray-400" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-700">
              {isProcessing
                ? '처리 중...'
                : isDragging
                ? '여기에 놓으세요'
                : '폴더를 드래그하세요'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              폴더별로 자동 그룹화 (하위폴더 4단계까지 지원)
            </p>
            <p className="text-xs text-gray-400 mt-2">
              지원 형식: JPG, PNG, TIFF, PDF, PSD
            </p>
          </div>
        </div>
      </div>

      {/* 업로드된 폴더 목록 */}
      {folders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              업로드된 폴더 ({folders.length}개)
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              전체 삭제
            </Button>
          </div>

          <div className="space-y-3">
            {folders.map((folder) => (
              <Card
                key={folder.id}
                className={cn(
                  'overflow-hidden',
                  folder.hasRatioMismatch && 'border-yellow-400 border-2'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {/* 썸네일 */}
                      <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                        {folder.files[0]?.thumbnailUrl ? (
                          <img
                            src={folder.files[0].thumbnailUrl}
                            alt={folder.folderName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FolderOpen className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* 폴더 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium truncate">{folder.folderName}</h5>
                          {folder.hasRatioMismatch && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-400">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              비율 불일치
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <FileImage className="w-4 h-4" />
                            {folder.fileCount}개
                          </span>
                          <span>{formatFileSize(folder.totalSize)}</span>
                          {folder.representativeSpec && (
                            <span>
                              {folder.representativeSpec.widthInch}x
                              {folder.representativeSpec.heightInch}"
                            </span>
                          )}
                        </div>
                        {/* 첫장/막장 표시 */}
                        <div className="flex items-center gap-2 mt-2">
                          {folder.files.some((f) => f.isFirst) && (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              첫장 포함
                            </Badge>
                          )}
                          {folder.files.some((f) => f.isLast) && (
                            <Badge className="bg-orange-100 text-orange-700 text-xs">
                              막장 포함
                            </Badge>
                          )}
                          {folder.files.some((f) => f.isCoverPage) && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs">
                              첫막장 포함
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 삭제 버튼 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFolder(folder.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 요약 정보 */}
      {folders.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-sm">
              총 {folders.length}개 폴더,{' '}
              {folders.reduce((sum, f) => sum + f.fileCount, 0)}개 파일 (
              {formatFileSize(folders.reduce((sum, f) => sum + f.totalSize, 0))})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

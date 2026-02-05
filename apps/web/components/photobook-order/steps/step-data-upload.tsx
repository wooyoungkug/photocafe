'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePhotobookOrderStore, type PhotobookFile } from '@/stores/photobook-order-store';
import {
  formatFileSize,
  calculateNormalizedRatio,
  formatPhotobookOrderInfo,
} from '@/lib/album-utils';
import {
  Upload,
  Folder,
  FileImage,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/tiff'];
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tif', '.tiff'];

export function StepDataUpload() {
  const {
    orderTitle,
    files,
    specWidth,
    specHeight,
    pageCount,
    quantity,
    totalFileSize,
    validationStatus,
    validationResult,
    editStyle,
    setOrderTitle,
    addFiles,
    removeFile,
    clearFiles,
    approveValidation,
  } = usePhotobookOrderStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 파일 메타데이터 추출
  const extractMetadata = useCallback(
    async (file: File, index: number): Promise<PhotobookFile> => {
      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(url);
          const dpi = 300; // 기본 DPI
          const widthInch = img.naturalWidth / dpi;
          const heightInch = img.naturalHeight / dpi;

          resolve({
            id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            fileName: file.name,
            originalName: file.name,
            fileSize: file.size,
            pageNumber: index + 1,
            widthPx: img.naturalWidth,
            heightPx: img.naturalHeight,
            dpi,
            widthInch: Math.round(widthInch * 10) / 10,
            heightInch: Math.round(heightInch * 10) / 10,
            sizeMatchStatus: 'PENDING',
            ratio: calculateNormalizedRatio(widthInch, heightInch),
          });
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({
            id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            fileName: file.name,
            originalName: file.name,
            fileSize: file.size,
            pageNumber: index + 1,
            widthPx: 0,
            heightPx: 0,
            dpi: 300,
            widthInch: 0,
            heightInch: 0,
            sizeMatchStatus: 'PENDING',
            ratio: 0,
          });
        };

        img.src = url;
      });
    },
    []
  );

  // 파일 처리
  const processFiles = useCallback(
    async (fileList: FileList | File[], folderName?: string) => {
      setIsProcessing(true);

      const validFiles: File[] = [];
      for (const file of Array.from(fileList)) {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (ACCEPTED_EXTENSIONS.includes(ext)) {
          validFiles.push(file);
        }
      }

      // 파일명 기준 정렬
      validFiles.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));

      // 메타데이터 추출
      const processed = await Promise.all(
        validFiles.map((file, index) => extractMetadata(file, files.length + index))
      );

      addFiles(processed);

      // 폴더명으로 주문 제목 설정
      if (folderName && !orderTitle) {
        setOrderTitle(folderName);
      }

      setIsProcessing(false);
    },
    [files.length, orderTitle, addFiles, setOrderTitle, extractMetadata]
  );

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const allFiles: File[] = [];
    let folderName = '';

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = item.webkitGetAsEntry?.();

      if (entry?.isDirectory) {
        folderName = entry.name;
        const dirFiles = await readDirectory(entry as FileSystemDirectoryEntry);
        allFiles.push(...dirFiles);
      } else if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) allFiles.push(file);
      }
    }

    if (allFiles.length > 0) {
      processFiles(allFiles, folderName);
    }
  };

  // 디렉토리 읽기
  const readDirectory = (dir: FileSystemDirectoryEntry): Promise<File[]> => {
    return new Promise((resolve) => {
      const reader = dir.createReader();
      const files: File[] = [];

      const readBatch = () => {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) {
            resolve(files);
            return;
          }

          for (const entry of entries) {
            if (entry.isFile) {
              const fileEntry = entry as FileSystemFileEntry;
              const file = await new Promise<File>((res) => {
                fileEntry.file((f) => res(f));
              });
              files.push(file);
            }
          }

          readBatch();
        });
      };

      readBatch();
    });
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // 검증 상태 아이콘
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXACT':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'RATIO_MATCH':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'RATIO_MISMATCH':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* 주문 제목 */}
      <div>
        <Label className="text-sm mb-1 block">주문 제목</Label>
        <Input
          value={orderTitle}
          onChange={(e) => setOrderTitle(e.target.value)}
          placeholder="폴더명이 자동으로 입력됩니다"
        />
      </div>

      {/* 업로드 영역 */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm text-gray-500">파일 분석 중...</span>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-4 mb-3">
              <Folder className="w-10 h-10 text-gray-400" />
              <FileImage className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-2">
              폴더 또는 이미지 파일을 드래그하거나
            </p>
            <label className="inline-block">
              <input
                type="file"
                multiple
                accept={ACCEPTED_TYPES.join(',')}
                onChange={handleFileSelect}
                className="sr-only"
              />
              <Button type="button" variant="outline" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  파일 선택
                </span>
              </Button>
            </label>
            <p className="text-xs text-gray-400 mt-2">
              JPG, PNG, TIFF 지원 (권장: 300dpi)
            </p>
          </>
        )}
      </div>

      {/* 업로드된 파일 정보 */}
      {files.length > 0 && (
        <>
          {/* 요약 정보 */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="font-medium mb-1">
              {formatPhotobookOrderInfo(
                orderTitle || '화보',
                specWidth,
                specHeight,
                300,
                pageCount,
                quantity,
                totalFileSize
              )}
            </div>
            <div className="flex gap-4 text-gray-500">
              <span>파일: {files.length}개</span>
              <span>페이지: {pageCount}p</span>
              <span>용량: {formatFileSize(totalFileSize)}</span>
            </div>
          </div>

          {/* 검증 상태 요약 */}
          {validationResult && (
            <div
              className={`rounded-lg p-3 text-sm ${
                validationStatus === 'REJECTED'
                  ? 'bg-red-50 border border-red-200'
                  : validationStatus === 'PENDING'
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-green-50 border border-green-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {validationStatus === 'REJECTED' ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : validationStatus === 'PENDING' ? (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  <span className="font-medium">
                    {validationStatus === 'REJECTED'
                      ? '비율 불일치 파일이 있습니다'
                      : validationStatus === 'PENDING'
                      ? '확인이 필요한 파일이 있습니다'
                      : '모든 파일 정상'}
                  </span>
                </div>

                {validationStatus === 'PENDING' && (
                  <Button size="sm" onClick={approveValidation}>
                    승인
                  </Button>
                )}
              </div>

              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-green-600">
                  정상: {validationResult.summary.exactMatch}
                </span>
                <span className="text-yellow-600">
                  비율일치: {validationResult.summary.ratioMatch}
                </span>
                <span className="text-red-600">
                  비율불일치: {validationResult.summary.ratioMismatch}
                </span>
              </div>
            </div>
          )}

          {/* 파일 목록 */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 grid grid-cols-12 gap-2">
              <span className="col-span-1">#</span>
              <span className="col-span-4">파일명</span>
              <span className="col-span-2">크기(px)</span>
              <span className="col-span-2">규격</span>
              <span className="col-span-2">상태</span>
              <span className="col-span-1"></span>
            </div>

            <div className="max-h-48 overflow-y-auto divide-y">
              {files.map((file, index) => (
                <div
                  key={file.id}
                  className={`px-3 py-2 text-sm grid grid-cols-12 gap-2 items-center ${
                    file.sizeMatchStatus === 'RATIO_MISMATCH'
                      ? 'bg-red-50 border-l-2 border-red-500'
                      : file.sizeMatchStatus === 'RATIO_MATCH'
                      ? 'bg-yellow-50 border-l-2 border-yellow-500'
                      : ''
                  }`}
                >
                  <span className="col-span-1 text-gray-500">{index + 1}</span>
                  <span className="col-span-4 truncate" title={file.fileName}>
                    {file.fileName}
                  </span>
                  <span className="col-span-2 text-xs text-gray-500">
                    {file.widthPx}x{file.heightPx}
                  </span>
                  <span className="col-span-2 text-xs">
                    {file.widthInch}x{file.heightInch}"
                  </span>
                  <span className="col-span-2 flex items-center gap-1">
                    {getStatusIcon(file.sizeMatchStatus)}
                    <Badge
                      variant={
                        file.sizeMatchStatus === 'EXACT'
                          ? 'default'
                          : file.sizeMatchStatus === 'RATIO_MATCH'
                          ? 'secondary'
                          : 'destructive'
                      }
                      className="text-xs"
                    >
                      {file.sizeMatchStatus === 'EXACT'
                        ? '정상'
                        : file.sizeMatchStatus === 'RATIO_MATCH'
                        ? '비율OK'
                        : file.sizeMatchStatus === 'RATIO_MISMATCH'
                        ? '비율NG'
                        : '-'}
                    </Badge>
                  </span>
                  <span className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFile(file.id)}
                    >
                      <Trash2 className="w-3 h-3 text-gray-400" />
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 전체 삭제 */}
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={clearFiles}>
              전체 삭제
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

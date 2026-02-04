'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, AlertTriangle, FileImage, FolderOpen, GripVertical, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// 지원 파일 형식
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/tiff',
  'image/tif',
  'application/pdf',
  'image/vnd.adobe.photoshop',
];

const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.pdf', '.psd'];

interface UploadedFile {
  id: string;
  file: File;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;

  // 규격 정보
  widthPx: number;
  heightPx: number;
  widthInch: number;
  heightInch: number;
  dpi: number;

  // 페이지 유형
  pageType: 'single' | 'spread';

  // 정렬 정보
  sortOrder: number;
  isFirst: boolean;
  isLast: boolean;

  // 유효성
  hasWarning: boolean;
  warningMessage?: string;

  // 상태
  status: 'uploading' | 'analyzing' | 'ready' | 'error';
  progress: number;
  relativePath?: string; // 폴더 경로
}

interface OutputDataUploaderProps {
  onFilesChange?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  className?: string;
}

// 파일명에서 첫장/막장 판별
function parseFilename(filename: string): { isFirst: boolean; isLast: boolean } {
  const name = filename.toLowerCase();
  const isFirst = name.includes('첫장') || (name.includes('첫') && name.includes('막장'));
  const isLast = name.includes('막장') || (name.includes('막') && !name.includes('첫'));

  // "첫막장"의 경우 첫장으로 처리
  if (name.includes('첫막장')) {
    return { isFirst: true, isLast: false };
  }

  return { isFirst, isLast };
}

// 파일 정렬 함수
function sortFiles(files: UploadedFile[]): UploadedFile[] {
  return [...files].sort((a, b) => {
    // 첫장은 맨 앞
    if (a.isFirst && !b.isFirst) return -1;
    if (!a.isFirst && b.isFirst) return 1;

    // 막장은 맨 뒤
    if (a.isLast && !b.isLast) return 1;
    if (!a.isLast && b.isLast) return -1;

    // 나머지는 파일명 순
    return a.originalName.localeCompare(b.originalName, 'ko');
  }).map((file, idx) => ({ ...file, sortOrder: idx }));
}

// 이미지 메타데이터 추출 (클라이언트 사이드)
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

      // 기본 DPI 추정 (EXIF 없는 경우)
      let dpi = 300; // 기본값

      resolve({
        widthPx: img.naturalWidth,
        heightPx: img.naturalHeight,
        dpi,
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

// 인치 포맷
function formatInches(widthInch: number, heightInch: number): string {
  return `${widthInch}x${heightInch}`;
}

export function OutputDataUploader({
  onFilesChange,
  maxFiles = 100,
  className,
}: OutputDataUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [pageType, setPageType] = useState<'single' | 'spread'>('single');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 기준 규격 (첫 번째 파일 기준)
  const baseFile = files.find(f => f.status === 'ready');
  const baseSpec = baseFile ? {
    widthInch: baseFile.widthInch,
    heightInch: baseFile.heightInch,
    dpi: baseFile.dpi,
  } : null;

  // 파일 변경 시 콜백
  useEffect(() => {
    onFilesChange?.(files);
  }, [files, onFilesChange]);

  // 파일 처리
  const processFile = async (file: File, relativePath?: string): Promise<UploadedFile> => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { isFirst, isLast } = parseFilename(file.name);

    const uploadedFile: UploadedFile = {
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
      pageType,
      sortOrder: 0,
      isFirst,
      isLast,
      hasWarning: false,
      status: 'analyzing',
      progress: 0,
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
        uploadedFile.status = 'ready';
      } catch (error) {
        uploadedFile.status = 'error';
        uploadedFile.hasWarning = true;
        uploadedFile.warningMessage = '이미지 분석 실패';
      }
    } else if (file.type === 'application/pdf') {
      // PDF는 서버에서 분석 필요
      uploadedFile.status = 'ready';
      uploadedFile.warningMessage = 'PDF 파일 (서버 분석 필요)';
    } else {
      uploadedFile.status = 'ready';
    }

    return uploadedFile;
  };

  // 경고 체크
  const checkWarnings = (fileList: UploadedFile[]): UploadedFile[] => {
    const base = fileList.find(f => f.status === 'ready' && f.widthPx > 0);
    if (!base) return fileList;

    return fileList.map(f => {
      if (f.status !== 'ready' || f.widthPx === 0) return f;

      const warnings: string[] = [];

      // 규격 비교
      if (f.widthInch !== base.widthInch || f.heightInch !== base.heightInch) {
        warnings.push(`규격 불일치: ${formatInches(f.widthInch, f.heightInch)} (기준: ${formatInches(base.widthInch, base.heightInch)})`);
      }

      // 해상도 비교
      if (Math.abs(f.dpi - base.dpi) > 10) {
        warnings.push(`해상도 불일치: ${f.dpi}dpi (기준: ${base.dpi}dpi)`);
      }

      return {
        ...f,
        hasWarning: warnings.length > 0,
        warningMessage: warnings.join(', '),
      };
    });
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

  // 폴더/파일 읽기 (재귀, 4단계까지)
  const readEntries = async (
    entry: FileSystemEntry,
    path: string = '',
    depth: number = 0
  ): Promise<File[]> => {
    if (depth > 4) return []; // 4단계 제한

    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      return new Promise((resolve) => {
        fileEntry.file((file) => {
          // 지원 파일 형식 체크
          const ext = '.' + file.name.split('.').pop()?.toLowerCase();
          if (ACCEPTED_EXTENSIONS.includes(ext)) {
            // relativePath 정보 추가를 위해 새 File 객체 생성
            Object.defineProperty(file, 'relativePath', {
              value: path,
              writable: false,
            });
            resolve([file]);
          } else {
            resolve([]);
          }
        }, () => resolve([]));
      });
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();

      return new Promise((resolve) => {
        const allFiles: File[] = [];

        const readBatch = () => {
          reader.readEntries(async (entries) => {
            if (entries.length === 0) {
              resolve(allFiles);
              return;
            }

            for (const childEntry of entries) {
              const childPath = path ? `${path}/${entry.name}` : entry.name;
              const childFiles = await readEntries(childEntry, childPath, depth + 1);
              allFiles.push(...childFiles);
            }

            readBatch(); // 더 읽기
          }, () => resolve(allFiles));
        };

        readBatch();
      });
    }

    return [];
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const allFiles: File[] = [];

    // DataTransferItemList에서 파일/폴더 읽기
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
              allFiles.push(file);
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

    // 최대 파일 수 체크
    if (files.length + allFiles.length > maxFiles) {
      toast({
        title: '파일 수 초과',
        description: `최대 ${maxFiles}개까지 업로드 가능합니다.`,
        variant: 'destructive',
      });
      return;
    }

    // 파일 처리
    const processedFiles: UploadedFile[] = [];
    for (const file of allFiles) {
      const relativePath = (file as any).relativePath;
      const processed = await processFile(file, relativePath);
      processedFiles.push(processed);
    }

    // 정렬 및 경고 체크
    const newFiles = sortFiles([...files, ...processedFiles]);
    const checkedFiles = checkWarnings(newFiles);
    setFiles(checkedFiles);

    toast({
      title: '파일 추가 완료',
      description: `${processedFiles.length}개 파일이 추가되었습니다.`,
    });
  }, [files, maxFiles, pageType, toast]);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // 최대 파일 수 체크
    if (files.length + selectedFiles.length > maxFiles) {
      toast({
        title: '파일 수 초과',
        description: `최대 ${maxFiles}개까지 업로드 가능합니다.`,
        variant: 'destructive',
      });
      return;
    }

    // 파일 처리
    const processedFiles: UploadedFile[] = [];
    for (const file of selectedFiles) {
      const processed = await processFile(file);
      processedFiles.push(processed);
    }

    // 정렬 및 경고 체크
    const newFiles = sortFiles([...files, ...processedFiles]);
    const checkedFiles = checkWarnings(newFiles);
    setFiles(checkedFiles);

    // input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [files, maxFiles, pageType, toast]);

  // 파일 삭제
  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== id);
      return checkWarnings(sortFiles(newFiles));
    });
  }, []);

  // 전체 삭제
  const handleClearAll = useCallback(() => {
    files.forEach(f => URL.revokeObjectURL(f.url));
    setFiles([]);
  }, [files]);

  // 경고 파일 수
  const warningCount = files.filter(f => f.hasWarning).length;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            출력데이터 업로드
          </CardTitle>
          {files.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              전체 삭제
            </Button>
          )}
        </div>

        {/* 페이지 유형 선택 */}
        <div className="flex items-center gap-4 mt-2">
          <Label className="text-sm text-gray-500">페이지 유형:</Label>
          <RadioGroup
            value={pageType}
            onValueChange={(v) => setPageType(v as 'single' | 'spread')}
            className="flex gap-4"
          >
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="single" id="single" />
              <Label htmlFor="single" className="text-sm cursor-pointer">단면</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="spread" id="spread" />
              <Label htmlFor="spread" className="text-sm cursor-pointer">펼침면</Label>
            </div>
          </RadioGroup>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 드롭존 */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-gray-400'
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS.join(',')}
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              'p-4 rounded-full transition-colors',
              isDragging ? 'bg-primary/10' : 'bg-gray-100'
            )}>
              {isDragging ? (
                <FolderOpen className="h-10 w-10 text-primary" />
              ) : (
                <Upload className="h-10 w-10 text-gray-400" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-700">
                {isDragging ? '여기에 놓으세요' : '파일 또는 폴더를 드래그하세요'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                또는 클릭하여 파일 선택 (하위폴더 4단계까지 지원)
              </p>
              <p className="text-xs text-gray-400 mt-2">
                지원 형식: JPG, PNG, TIFF, PDF, PSD
              </p>
            </div>
          </div>
        </div>

        {/* 경고 메시지 */}
        {warningCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">
              {warningCount}개 파일의 규격 또는 해상도가 다릅니다. 확인해주세요.
            </span>
          </div>
        )}

        {/* 기준 규격 정보 */}
        {baseSpec && (
          <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            <Check className="h-4 w-4" />
            <span>기준 규격: {formatInches(baseSpec.widthInch, baseSpec.heightInch)} / {baseSpec.dpi}dpi</span>
            <span className="text-blue-500">({files.length}개 파일)</span>
          </div>
        )}

        {/* 파일 목록 */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {files.map((file, idx) => (
              <div
                key={file.id}
                className={cn(
                  'flex items-center gap-3 p-3 border rounded-lg bg-white',
                  file.hasWarning && 'border-red-400 border-2'
                )}
              >
                {/* 순서 */}
                <div className="flex items-center gap-1 text-gray-400">
                  <GripVertical className="h-4 w-4 cursor-move" />
                  <span className="text-xs w-6 text-center">{idx + 1}</span>
                </div>

                {/* 썸네일 */}
                <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                  {file.thumbnailUrl ? (
                    <img
                      src={file.thumbnailUrl}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* 파일 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{file.originalName}</p>
                    {file.isFirst && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">첫장</Badge>
                    )}
                    {file.isLast && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">막장</Badge>
                    )}
                  </div>
                  {file.relativePath && (
                    <p className="text-xs text-gray-400 truncate">📁 {file.relativePath}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {file.widthPx > 0 && (
                      <>
                        <span className="text-xs text-gray-500">
                          {formatInches(file.widthInch, file.heightInch)} inch
                        </span>
                        <span className="text-xs text-gray-500">
                          {file.widthPx}x{file.heightPx}px
                        </span>
                        <span className="text-xs text-gray-500">
                          {file.dpi}dpi
                        </span>
                      </>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {file.pageType === 'spread' ? '펼침면' : '단면'}
                    </Badge>
                  </div>
                  {file.hasWarning && file.warningMessage && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {file.warningMessage}
                    </p>
                  )}
                </div>

                {/* 삭제 버튼 */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-red-500"
                  onClick={() => handleRemoveFile(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OutputDataUploader;

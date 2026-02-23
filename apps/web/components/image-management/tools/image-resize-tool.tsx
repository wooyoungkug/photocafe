'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FolderOpen, ImageIcon, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { extractDPIFromJPEG, canvasToJPEGWithDPI } from '@/lib/image-tools/dpi-utils';
import { saveToFolder, fallbackDownload, pickDirectory } from '@/lib/image-tools/file-utils';
import { ToolGuide } from './tool-guide';
import { ToolUsageCounter } from './tool-usage-counter';

interface LoadedFile {
  name: string;
  file: File;
  handle?: FileSystemFileHandle;
  width: number;
  height: number;
  dpi: number;
  widthInch: number;
  heightInch: number;
  url: string;
}

export function ImageResizeTool() {
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [originalFolderName, setOriginalFolderName] = useState('');
  const [newWidth, setNewWidth] = useState(0);
  const [newHeight, setNewHeight] = useState(0);
  const [newDPI, setNewDPI] = useState(300);
  const [keepRatio, setKeepRatio] = useState(true);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const trackUseRef = useRef<(() => void) | null>(null);

  // webkitdirectory 속성 설정
  const setFolderInputRefCb = useCallback((el: HTMLInputElement | null) => {
    (folderInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    if (el) {
      el.setAttribute('webkitdirectory', '');
      el.setAttribute('directory', '');
    }
  }, []);

  const loadImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('이미지 로드 실패'));
      };
      img.src = url;
    });
  };

  const processFiles = useCallback(
    async (imageFiles: File[], folderName?: string) => {
      if (imageFiles.length === 0) {
        toast.error('이미지 파일이 없습니다.');
        return;
      }

      toast.info(`${imageFiles.length}개 파일 로드 중...`);

      const loadedFiles: LoadedFile[] = [];

      for (const file of imageFiles) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const dpi = extractDPIFromJPEG(arrayBuffer);
          const { width, height } = await loadImageDimensions(file);
          const widthInch = width / dpi;
          const heightInch = height / dpi;

          loadedFiles.push({
            name: file.name,
            file,
            width,
            height,
            dpi,
            widthInch,
            heightInch,
            url: URL.createObjectURL(file),
          });
        } catch (err) {
          console.error(`파일 로드 실패: ${file.name}`, err);
        }
      }

      if (loadedFiles.length === 0) {
        toast.error('로드할 수 있는 이미지가 없습니다.');
        return;
      }

      setFiles(loadedFiles);
      if (folderName) setOriginalFolderName(folderName);

      // Set defaults from first image
      const first = loadedFiles[0];
      const wInch = first.widthInch;
      const hInch = first.heightInch;
      setOriginalWidth(wInch);
      setOriginalHeight(hInch);
      setNewWidth(parseFloat(wInch.toFixed(2)));
      setNewHeight(parseFloat(hInch.toFixed(2)));
      setNewDPI(first.dpi);
      setAspectRatio(wInch / hInch);

      toast.success(`${loadedFiles.length}개 파일 로드 완료`);
    },
    [],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;

      const allFiles: File[] = [];
      let folderName = '';

      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (!entry) continue;

        if (entry.isDirectory) {
          folderName = entry.name;
          const dirFiles = await readDirectory(entry as FileSystemDirectoryEntry);
          allFiles.push(...dirFiles);
        } else if (entry.isFile) {
          const file = await readEntryAsFile(entry as FileSystemFileEntry);
          if (file.type.startsWith('image/')) allFiles.push(file);
        }
      }

      await processFiles(allFiles, folderName || 'dropped');
    },
    [processFiles],
  );

  const readEntryAsFile = (entry: FileSystemFileEntry): Promise<File> =>
    new Promise((resolve, reject) => entry.file(resolve, reject));

  const readDirectory = async (dirEntry: FileSystemDirectoryEntry): Promise<File[]> => {
    const reader = dirEntry.createReader();
    const allFiles: File[] = [];

    const readBatch = (): Promise<FileSystemEntry[]> =>
      new Promise((resolve, reject) => reader.readEntries(resolve, reject));

    let batch = await readBatch();
    while (batch.length > 0) {
      for (const entry of batch) {
        if (entry.isFile) {
          const file = await readEntryAsFile(entry as FileSystemFileEntry);
          if (file.type.startsWith('image/')) allFiles.push(file);
        } else if (entry.isDirectory) {
          const subFiles = await readDirectory(entry as FileSystemDirectoryEntry);
          allFiles.push(...subFiles);
        }
      }
      batch = await readBatch();
    }
    return allFiles;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputFiles = e.target.files;
      if (!inputFiles || inputFiles.length === 0) return;

      const imageFiles = Array.from(inputFiles).filter((f) => f.type.startsWith('image/'));
      await processFiles(imageFiles, 'files');
      e.target.value = '';
    },
    [processFiles],
  );

  const handleFolderInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputFiles = e.target.files;
      if (!inputFiles || inputFiles.length === 0) return;

      const imageFiles = Array.from(inputFiles).filter((f) => f.type.startsWith('image/'));
      // Extract folder name from the first file's webkitRelativePath
      const firstPath = inputFiles[0]?.webkitRelativePath || '';
      const folderName = firstPath.split('/')[0] || 'folder';

      await processFiles(imageFiles, folderName);
      e.target.value = '';
    },
    [processFiles],
  );

  const handleLoadFolder = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      folderInputRef.current?.click();
      return;
    }

    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
      setDirHandle(handle);
      setOriginalFolderName(handle.name);

      const imageFiles: File[] = [];
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          if (file.type.startsWith('image/')) {
            imageFiles.push(file);
          }
        }
      }

      await processFiles(imageFiles, handle.name);
    } catch {
      // user cancelled
    }
  }, [processFiles]);

  const handleWidthChange = useCallback(
    (value: number) => {
      setNewWidth(value);
      if (keepRatio && aspectRatio > 0) {
        setNewHeight(parseFloat((value / aspectRatio).toFixed(2)));
      }
    },
    [keepRatio, aspectRatio],
  );

  const handleHeightChange = useCallback(
    (value: number) => {
      setNewHeight(value);
      if (keepRatio && aspectRatio > 0) {
        setNewWidth(parseFloat((value * aspectRatio).toFixed(2)));
      }
    },
    [keepRatio, aspectRatio],
  );

  const handleExecute = useCallback(async () => {
    if (files.length === 0) {
      toast.error('먼저 파일을 업로드해 주세요.');
      return;
    }

    if (newWidth <= 0 || newHeight <= 0 || newDPI <= 0) {
      toast.error('너비, 높이, DPI 값을 올바르게 입력해 주세요.');
      return;
    }

    setProcessing(true);
    setProgress(0);

    const targetPixelW = Math.round(newWidth * newDPI);
    const targetPixelH = Math.round(newHeight * newDPI);

    // Select output directory
    let outputHandle: FileSystemDirectoryHandle | null = null;
    const subfolderName = `${originalFolderName}_${newWidth}x${newHeight}`;

    if ('showDirectoryPicker' in window) {
      try {
        const baseHandle = await pickDirectory();
        if (baseHandle) {
          outputHandle = await baseHandle.getDirectoryHandle(subfolderName, { create: true });
        }
      } catch {
        // user cancelled, fall through to fallback download
      }
    }

    try {
      for (let i = 0; i < files.length; i++) {
        const loadedFile = files[i];

        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`이미지 로드 실패: ${loadedFile.name}`));
          img.src = loadedFile.url;
        });

        const canvas = document.createElement('canvas');
        canvas.width = targetPixelW;
        canvas.height = targetPixelH;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetPixelW, targetPixelH);

        const { blob } = await canvasToJPEGWithDPI(canvas, newDPI, 1.0);

        if (outputHandle) {
          await saveToFolder(outputHandle, blob, loadedFile.name);
        } else {
          fallbackDownload(blob, loadedFile.name);
        }

        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      toast.success(`${files.length}개 파일 리사이즈 완료`);
      trackUseRef.current?.();
    } catch (err) {
      console.error('리사이즈 오류:', err);
      toast.error('리사이즈 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  }, [files, newWidth, newHeight, newDPI, originalFolderName]);

  const resultPixelW = Math.round(newWidth * newDPI);
  const resultPixelH = Math.round(newHeight * newDPI);
  const scalePercent =
    originalWidth > 0 ? Math.round((newWidth / originalWidth) * 100) : 100;

  return (
    <div className="space-y-4">
      {/* Usage Guide */}
      <ToolGuide title="이미지 리사이즈 사용 가이드">
        <div className="pt-3 space-y-3">
          <svg viewBox="0 0 400 130" className="w-full max-w-[400px] mx-auto" xmlns="http://www.w3.org/2000/svg">
            {/* Different-sized rectangles (before) */}
            <rect x="15" y="10" width="30" height="50" rx="3" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.5" />
            <rect x="55" y="20" width="45" height="40" rx="3" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.5" />
            <rect x="110" y="5" width="25" height="55" rx="3" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.5" />
            <text x="65" y="80" textAnchor="middle" fontSize="11" fill="#64748B" fontFamily="sans-serif">다양한 크기</text>

            {/* Arrow */}
            <path d="M 150 35 L 210 35" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrowResize)" />
            <defs>
              <marker id="arrowResize" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M 0 0 L 8 3 L 0 6 Z" fill="#3B82F6" />
              </marker>
            </defs>
            <text x="180" y="28" textAnchor="middle" fontSize="10" fill="#3B82F6" fontFamily="sans-serif">배치 변환</text>

            {/* Same-sized rectangles (after) */}
            <rect x="225" y="15" width="40" height="40" rx="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
            <rect x="275" y="15" width="40" height="40" rx="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
            <rect x="325" y="15" width="40" height="40" rx="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
            <text x="305" y="75" textAnchor="middle" fontSize="11" fill="#64748B" fontFamily="sans-serif">통일된 크기</text>

            {/* DPI label */}
            <rect x="260" y="90" width="90" height="26" rx="13" fill="#3B82F6" />
            <text x="305" y="108" textAnchor="middle" fontSize="13" fill="white" fontWeight="bold" fontFamily="sans-serif">300 DPI</text>
          </svg>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>여러 파일을 한번에 리사이즈 (배치 처리)</li>
            <li>가로 또는 세로 기준으로 크기 지정</li>
            <li>DPI 변경 가능 (72~600)</li>
            <li>원본 비율 유지</li>
          </ul>
        </div>
      </ToolGuide>

      {/* Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer
              ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Upload className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-700">
                  폴더 또는 이미지를 드래그하여 놓으세요
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  JPG, PNG 형식 지원 (폴더 또는 다중 선택)
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadFolder();
                  }}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  폴더 선택
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  파일 선택
                </Button>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          <input
            ref={setFolderInputRefCb}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={handleFolderInput}
          />
        </CardContent>
      </Card>

      {/* File Count */}
      {files.length > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {files.length}개 파일 로드됨
          </Badge>
          {originalFolderName && (
            <Badge variant="outline">
              폴더: {originalFolderName}
            </Badge>
          )}
        </div>
      )}

      {/* Settings */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">리사이즈 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Size Inputs (inches) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>너비 (inch)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={newWidth}
                  onChange={(e) => handleWidthChange(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>높이 (inch)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={newHeight}
                  onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>DPI</Label>
                <Input
                  type="number"
                  step="1"
                  min="72"
                  value={newDPI}
                  onChange={(e) => setNewDPI(parseInt(e.target.value) || 300)}
                />
              </div>
            </div>

            {/* Keep Ratio */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="keepRatio"
                checked={keepRatio}
                onCheckedChange={(checked) => setKeepRatio(!!checked)}
              />
              <Label htmlFor="keepRatio" className="cursor-pointer">
                가로세로 비율 유지
              </Label>
            </div>

            {/* Result Pixels */}
            <div className="rounded-lg bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">결과 픽셀 크기</span>
                <span className="text-sm font-semibold">
                  {resultPixelW} x {resultPixelH} px
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">배율</span>
                <Badge variant={scalePercent === 100 ? 'secondary' : scalePercent > 100 ? 'success' : 'warning'}>
                  {scalePercent}%
                </Badge>
              </div>
            </div>

            {/* Progress */}
            {processing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">처리 진행률</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Execute Button */}
            <Button
              onClick={handleExecute}
              disabled={files.length === 0 || processing}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              {processing ? `처리 중... (${progress}%)` : `${files.length}개 파일 리사이즈 실행`}
            </Button>
          </CardContent>
        </Card>
      )}

      <ToolUsageCounter toolId="image-resize" onTrackUse={(fn) => { trackUseRef.current = fn; }} />
    </div>
  );
}

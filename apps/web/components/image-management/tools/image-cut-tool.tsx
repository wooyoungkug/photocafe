'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Scissors, Download, Info, Eye, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { extractDPIFromJPEG, canvasToJPEGWithDPI } from '@/lib/image-tools/dpi-utils';
import { saveToFolder, fallbackDownload, isJpegOrPng } from '@/lib/image-tools/file-utils';
import { ToolGuide } from './tool-guide';
import { ToolUsageCounter } from './tool-usage-counter';

export function ImageCutTool() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [originalDPI, setOriginalDPI] = useState(300);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [leftBlob, setLeftBlob] = useState<Blob | null>(null);
  const [rightBlob, setRightBlob] = useState<Blob | null>(null);
  const [leftUrl, setLeftUrl] = useState('');
  const [rightUrl, setRightUrl] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const trackUseRef = useRef<(() => void) | null>(null);
  const sourceFileHandleRef = useRef<FileSystemFileHandle | null>(null);

  const cleanup = useCallback(() => {
    if (leftUrl) URL.revokeObjectURL(leftUrl);
    if (rightUrl) URL.revokeObjectURL(rightUrl);
  }, [leftUrl, rightUrl]);

  const loadImage = useCallback((file: File) => {
    cleanup();
    setShowResult(false);
    setLeftBlob(null);
    setRightBlob(null);
    setLeftUrl('');
    setRightUrl('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const dpi = extractDPIFromJPEG(arrayBuffer);
      setOriginalDPI(dpi);

      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setFileName(file.name.replace(/\.[^.]+$/, ''));
        setShowInfo(true);
        setShowPreview(true);
      };
      img.src = URL.createObjectURL(file);
    };
    reader.readAsArrayBuffer(file);
  }, [cleanup]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
    e.target.value = '';
  }, [loadImage]);

  const handleClickUpload = useCallback(async () => {
    if ('showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [{ description: '이미지 파일', accept: { 'image/*': ['.jpg', '.jpeg', '.png'] } }],
          multiple: false,
        });
        sourceFileHandleRef.current = fileHandle;
        const file = await fileHandle.getFile();
        loadImage(file);
      } catch { /* 사용자가 파일 선택 취소 */ }
    } else {
      fileInputRef.current?.click();
    }
  }, [loadImage]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && isJpegOrPng(file)) {
      const item = e.dataTransfer.items[0];
      if (item && 'getAsFileSystemHandle' in item) {
        try {
          const handle = await (item as any).getAsFileSystemHandle();
          if (handle?.kind === 'file') {
            sourceFileHandleRef.current = handle as FileSystemFileHandle;
          }
        } catch { /* 핸들 획득 실패 - 무시 */ }
      }
      loadImage(file);
    } else {
      toast.error('JPEG 또는 PNG 파일만 지원합니다.');
    }
  }, [loadImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleCut = useCallback(async () => {
    if (!originalImage) return;

    setProcessing(true);
    cleanup();

    try {
      const { naturalWidth: width, naturalHeight: height } = originalImage;
      const halfWidth = Math.floor(width / 2);
      const rightWidth = width - halfWidth;

      // Left canvas: exact left half
      const leftCanvas = leftCanvasRef.current;
      if (!leftCanvas) return;
      leftCanvas.width = halfWidth;
      leftCanvas.height = height;
      const leftCtx = leftCanvas.getContext('2d');
      if (!leftCtx) return;
      leftCtx.drawImage(
        originalImage,
        0, 0, halfWidth, height,
        0, 0, halfWidth, height,
      );

      // Right canvas: exact right half
      const rightCanvas = rightCanvasRef.current;
      if (!rightCanvas) return;
      rightCanvas.width = rightWidth;
      rightCanvas.height = height;
      const rightCtx = rightCanvas.getContext('2d');
      if (!rightCtx) return;
      rightCtx.drawImage(
        originalImage,
        halfWidth, 0, rightWidth, height,
        0, 0, rightWidth, height,
      );

      const leftResult = await canvasToJPEGWithDPI(leftCanvas, originalDPI);
      const rightResult = await canvasToJPEGWithDPI(rightCanvas, originalDPI);

      setLeftBlob(leftResult.blob);
      setLeftUrl(leftResult.url);
      setRightBlob(rightResult.blob);
      setRightUrl(rightResult.url);
      setShowResult(true);

      toast.success('자르기 완료! 결과를 확인하세요.');
      trackUseRef.current?.();
    } catch (err) {
      console.error('Cut error:', err);
      toast.error('이미지 자르기 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  }, [originalImage, originalDPI, cleanup]);

  /** showSaveFilePicker로 원본 경로에서 저장 다이얼로그 열기 */
  const saveWithPicker = useCallback(async (blob: Blob, suggestedName: string): Promise<boolean> => {
    if (!('showSaveFilePicker' in window)) return false;
    try {
      const options: any = {
        suggestedName,
        types: [{ description: 'JPEG Image', accept: { 'image/jpeg': ['.jpg', '.jpeg'] } }],
      };
      if (sourceFileHandleRef.current) {
        options.startIn = sourceFileHandleRef.current;
      }
      const fileHandle = await (window as any).showSaveFilePicker(options);
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch {
      return false; // 사용자 취소
    }
  }, []);

  const handleSelectDirectory = useCallback(async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const options: any = { mode: 'readwrite' };
        if (sourceFileHandleRef.current) {
          options.startIn = sourceFileHandleRef.current;
        }
        const handle = await (window as any).showDirectoryPicker(options);
        setDirectoryHandle(handle);
        toast.success(`저장 폴더: ${handle.name}`);
      } catch { /* 사용자가 취소 */ }
    }
  }, []);

  const leftFileName = `${fileName}+L.jpg`;
  const rightFileName = `${fileName}+R.jpg`;

  const handleSaveLeft = useCallback(async () => {
    if (!leftBlob) return;
    if (directoryHandle) {
      const ok = await saveToFolder(directoryHandle, leftBlob, leftFileName);
      if (ok) toast.success(`${leftFileName} 저장 완료`);
      else toast.error('저장 실패');
    } else {
      const ok = await saveWithPicker(leftBlob, leftFileName);
      if (!ok) fallbackDownload(leftBlob, leftFileName);
    }
  }, [leftBlob, directoryHandle, leftFileName, saveWithPicker]);

  const handleSaveRight = useCallback(async () => {
    if (!rightBlob) return;
    if (directoryHandle) {
      const ok = await saveToFolder(directoryHandle, rightBlob, rightFileName);
      if (ok) toast.success(`${rightFileName} 저장 완료`);
      else toast.error('저장 실패');
    } else {
      const ok = await saveWithPicker(rightBlob, rightFileName);
      if (!ok) fallbackDownload(rightBlob, rightFileName);
    }
  }, [rightBlob, directoryHandle, rightFileName, saveWithPicker]);

  const handleSaveBoth = useCallback(async () => {
    if (!leftBlob || !rightBlob) return;
    if (directoryHandle) {
      const ok1 = await saveToFolder(directoryHandle, leftBlob, leftFileName);
      const ok2 = await saveToFolder(directoryHandle, rightBlob, rightFileName);
      if (ok1 && ok2) toast.success('양쪽 모두 저장 완료');
      else toast.error('일부 파일 저장 실패');
    } else {
      const ok1 = await saveWithPicker(leftBlob, leftFileName);
      if (!ok1) return; // 취소 시 중단
      const ok2 = await saveWithPicker(rightBlob, rightFileName);
      if (ok1 && ok2) toast.success('양쪽 모두 저장 완료');
    }
  }, [leftBlob, rightBlob, directoryHandle, leftFileName, rightFileName, saveWithPicker]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Guide */}
      <ToolGuide title="이미지 자르기 사용 방법">
        <div className="pt-3 space-y-3">
          <svg viewBox="0 0 400 120" className="w-full max-w-[400px]" xmlns="http://www.w3.org/2000/svg">
            {/* Wide original image A|B with scissors */}
            <rect x="10" y="20" width="140" height="80" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
            <line x1="80" y1="20" x2="80" y2="100" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="4 2" />
            <text x="45" y="65" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#3B82F6">A</text>
            <text x="115" y="65" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#3B82F6">B</text>
            {/* Scissors icon */}
            <text x="80" y="14" textAnchor="middle" fontSize="14" fill="#EF4444">&#9986;</text>
            {/* Arrow */}
            <path d="M170 60 L220 60" stroke="#64748B" strokeWidth="2" fill="none" markerEnd="url(#cut-arrow)" />
            <defs>
              <marker id="cut-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748B" />
              </marker>
            </defs>
            {/* Left result A */}
            <rect x="240" y="20" width="60" height="80" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
            <text x="270" y="65" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#3B82F6">A</text>
            <text x="270" y="112" textAnchor="middle" fontSize="11" fill="#64748B">왼쪽</text>
            {/* Right result B */}
            <rect x="320" y="20" width="60" height="80" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
            <text x="350" y="65" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#3B82F6">B</text>
            <text x="350" y="112" textAnchor="middle" fontSize="11" fill="#64748B">오른쪽</text>
          </svg>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>가로 이미지를 정확히 절반으로 자르기</li>
            <li>앨범 분리와 달리 여백 없이 원본 그대로 자름</li>
            <li>왼쪽/오른쪽 개별 저장 또는 일괄 저장</li>
            <li>DPI 보존</li>
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
            onClick={handleClickUpload}
            className={`
              border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer
              ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}
            `}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
                <Upload className="h-7 w-7 text-orange-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-700">
                  이미지를 드래그하거나 클릭하여 선택하세요
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  JPEG, PNG 형식 지원 (이미지를 정확히 반으로 자릅니다)
                </p>
              </div>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleFileSelect}
          />
        </CardContent>
      </Card>

      {/* Image Info */}
      {showInfo && originalImage && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="font-semibold text-sm">이미지 정보</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-2 bg-slate-50 rounded">
                <p className="text-xs text-slate-500">파일명</p>
                <p className="text-sm font-medium truncate">{fileName}</p>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded">
                <p className="text-xs text-slate-500">원본 크기</p>
                <p className="text-sm font-medium">{originalImage.naturalWidth} x {originalImage.naturalHeight}</p>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded">
                <p className="text-xs text-slate-500">DPI</p>
                <Badge variant="secondary">{originalDPI}</Badge>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded">
                <p className="text-xs text-slate-500">자른 후 크기</p>
                <p className="text-sm font-medium text-orange-600">
                  {Math.floor(originalImage.naturalWidth / 2)} x {originalImage.naturalHeight} (각)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Original Preview */}
      {showPreview && originalImage && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-500" />
              <span className="font-semibold text-sm">원본 미리보기</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="border rounded-lg overflow-hidden bg-gray-100 relative">
              <img
                src={originalImage.src}
                alt="원본 이미지"
                className="w-full h-auto object-contain max-h-[400px]"
              />
              {/* Center cut line indicator */}
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-red-500 opacity-60" />
            </div>
            <div className="mt-3 flex justify-center">
              <Button onClick={handleCut} disabled={processing} size="lg">
                <Scissors className="h-4 w-4 mr-2" />
                {processing ? '자르는 중...' : '반으로 자르기'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden canvases */}
      <canvas ref={leftCanvasRef} className="hidden" />
      <canvas ref={rightCanvasRef} className="hidden" />

      {/* Results */}
      {showResult && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-orange-500" />
                <span className="font-semibold text-sm">자르기 결과</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSelectDirectory}>
                <FolderOpen className="h-4 w-4 mr-2" />
                {directoryHandle ? directoryHandle.name : '저장 폴더 선택'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left half */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">왼쪽 (+L)</Badge>
                    <span className="text-xs text-slate-500 truncate">{leftFileName}</span>
                  </div>
                  {leftBlob && (
                    <span className="text-xs text-slate-500">{formatFileSize(leftBlob.size)}</span>
                  )}
                </div>
                <div className="border rounded-lg overflow-hidden bg-gray-100">
                  {leftUrl && (
                    <img src={leftUrl} alt="왼쪽" className="w-full h-auto object-contain max-h-[300px]" />
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={handleSaveLeft}>
                  <Download className="h-4 w-4 mr-2" />
                  왼쪽 저장
                </Button>
              </div>

              {/* Right half */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">오른쪽 (+R)</Badge>
                    <span className="text-xs text-slate-500 truncate">{rightFileName}</span>
                  </div>
                  {rightBlob && (
                    <span className="text-xs text-slate-500">{formatFileSize(rightBlob.size)}</span>
                  )}
                </div>
                <div className="border rounded-lg overflow-hidden bg-gray-100">
                  {rightUrl && (
                    <img src={rightUrl} alt="오른쪽" className="w-full h-auto object-contain max-h-[300px]" />
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={handleSaveRight}>
                  <Download className="h-4 w-4 mr-2" />
                  오른쪽 저장
                </Button>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <Button onClick={handleSaveBoth} size="lg">
                <Download className="h-4 w-4 mr-2" />
                양쪽 모두 저장
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ToolUsageCounter toolId="image-cut" onTrackUse={(fn) => { trackUseRef.current = fn; }} />
    </div>
  );
}

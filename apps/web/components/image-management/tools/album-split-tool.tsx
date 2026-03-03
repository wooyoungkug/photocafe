'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Scissors, Download, Info, Eye, FolderOpen, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { extractDPIFromJPEG, canvasToJPEGWithDPI } from '@/lib/image-tools/dpi-utils';
import { saveToFolder, fallbackDownload, pickDirectory, isJpegOrPng } from '@/lib/image-tools/file-utils';
import { ToolGuide } from './tool-guide';
import { ToolUsageCounter } from './tool-usage-counter';

export function AlbumSplitTool() {
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

  const [savedLeft, setSavedLeft] = useState(false);
  const [savedRight, setSavedRight] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [originalDeleted, setOriginalDeleted] = useState(false);
  const uploadZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const trackUseRef = useRef<(() => void) | null>(null);
  const resultCardRef = useRef<HTMLDivElement>(null);
  const sourceFileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const sourceDirectoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      setTimeout(() => ctx.close(), 500);
    } catch { /* AudioContext unavailable */ }
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, []);

  const cleanup = useCallback(() => {
    if (leftUrl) URL.revokeObjectURL(leftUrl);
    if (rightUrl) URL.revokeObjectURL(rightUrl);
  }, [leftUrl, rightUrl]);

  const resetTool = useCallback(() => {
    cleanup();
    setOriginalImage(null);
    setFileName('');
    setOriginalDPI(300);
    setLeftBlob(null);
    setRightBlob(null);
    setLeftUrl('');
    setRightUrl('');
    setShowInfo(false);
    setShowPreview(false);
    setShowResult(false);
    setSavedLeft(false);
    setSavedRight(false);
    setDeleteConfirming(false);
    setOriginalDeleted(false);
    sourceFileHandleRef.current = null;
    sourceDirectoryHandleRef.current = null;
    // 업로드 영역으로 스크롤
    uploadZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [cleanup]);

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
        setFileName(file.name);
        setShowInfo(true);
        setShowPreview(true);
        scrollToBottom();
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
      // 드래그 & 드롭에서도 파일 핸들 저장 시도
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

  const handleSplit = useCallback(async () => {
    if (!originalImage) return;

    setProcessing(true);
    cleanup();

    try {
      const { width, height } = originalImage;
      const halfWidth = Math.floor(width / 2);

      // Left canvas (first page): full size, white fill, draw RIGHT half of original at right side
      const leftCanvas = leftCanvasRef.current;
      if (!leftCanvas) return;
      leftCanvas.width = width;
      leftCanvas.height = height;
      const leftCtx = leftCanvas.getContext('2d');
      if (!leftCtx) return;
      leftCtx.fillStyle = '#FFFFFF';
      leftCtx.fillRect(0, 0, width, height);
      // Draw left portion of original at (halfWidth, 0) on canvas
      leftCtx.drawImage(
        originalImage,
        0, 0, halfWidth, height,
        halfWidth, 0, halfWidth, height,
      );

      // Right canvas (last page): full size, white fill, draw LEFT half starting from halfWidth
      const rightCanvas = rightCanvasRef.current;
      if (!rightCanvas) return;
      rightCanvas.width = width;
      rightCanvas.height = height;
      const rightCtx = rightCanvas.getContext('2d');
      if (!rightCtx) return;
      rightCtx.fillStyle = '#FFFFFF';
      rightCtx.fillRect(0, 0, width, height);
      // Draw right portion of original at (0, 0) on canvas
      rightCtx.drawImage(
        originalImage,
        halfWidth, 0, width - halfWidth, height,
        0, 0, width - halfWidth, height,
      );

      const leftResult = await canvasToJPEGWithDPI(leftCanvas, originalDPI);
      const rightResult = await canvasToJPEGWithDPI(rightCanvas, originalDPI);

      setLeftBlob(leftResult.blob);
      setLeftUrl(leftResult.url);
      setRightBlob(rightResult.blob);
      setRightUrl(rightResult.url);
      setShowResult(true);

      scrollToBottom();
      playBeep();
      toast.success('분리 완료! 결과를 확인하세요.');
      trackUseRef.current?.();
    } catch (err) {
      console.error('Split error:', err);
      toast.error('이미지 분리 중 오류가 발생했습니다.');
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

  const handleSaveLeft = useCallback(async () => {
    if (!leftBlob) return;
    const filename = '첫장.jpg';
    if (directoryHandle) {
      const ok = await saveToFolder(directoryHandle, leftBlob, filename);
      if (ok) { toast.success(`${filename} 저장 완료`); setSavedLeft(true); }
      else toast.error('저장 실패');
    } else {
      const ok = await saveWithPicker(leftBlob, filename);
      if (ok) { toast.success(`${filename} 저장 완료`); setSavedLeft(true); }
    }
  }, [leftBlob, directoryHandle, saveWithPicker]);

  const handleSaveRight = useCallback(async () => {
    if (!rightBlob) return;
    const filename = '막장.jpg';
    if (directoryHandle) {
      const ok = await saveToFolder(directoryHandle, rightBlob, filename);
      if (ok) { toast.success(`${filename} 저장 완료`); setSavedRight(true); }
      else toast.error('저장 실패');
    } else {
      const ok = await saveWithPicker(rightBlob, filename);
      if (ok) { toast.success(`${filename} 저장 완료`); setSavedRight(true); }
    }
  }, [rightBlob, directoryHandle, saveWithPicker]);

  const handleSaveBoth = useCallback(async () => {
    if (!leftBlob || !rightBlob) return;
    if (directoryHandle) {
      const ok1 = await saveToFolder(directoryHandle, leftBlob, '첫장.jpg');
      const ok2 = await saveToFolder(directoryHandle, rightBlob, '막장.jpg');
      if (ok1 && ok2) {
        toast.success('첫장 + 막장 저장 완료! 잠시 후 초기화됩니다.');
        setTimeout(resetTool, 1500);
      } else toast.error('일부 파일 저장 실패');
    } else {
      const ok1 = await saveWithPicker(leftBlob, '첫장.jpg');
      if (!ok1) return; // 취소 시 중단
      const ok2 = await saveWithPicker(rightBlob, '막장.jpg');
      if (ok1 && ok2) {
        toast.success('첫장 + 막장 저장 완료! 잠시 후 초기화됩니다.');
        setTimeout(resetTool, 1500);
      }
    }
  }, [leftBlob, rightBlob, directoryHandle, resetTool, saveWithPicker]);

  const handleDeleteOriginal = useCallback(async () => {
    if (!fileName) return;

    // 1) FileSystemFileHandle.remove() 지원 브라우저 (Chrome 117+)
    if (sourceFileHandleRef.current && 'remove' in (sourceFileHandleRef.current as any)) {
      try {
        await (sourceFileHandleRef.current as any).remove();
        toast.success(`${fileName} 삭제 완료`);
        setOriginalDeleted(true);
        setDeleteConfirming(false);
        return;
      } catch { /* 권한 없음 등 → 폴더 선택 방식으로 폴백 */ }
    }

    // 2) 폴더 선택 후 removeEntry
    if (!sourceDirectoryHandleRef.current) {
      if (!('showDirectoryPicker' in window)) {
        toast.error('이 브라우저는 원본 삭제를 지원하지 않습니다.');
        setDeleteConfirming(false);
        return;
      }
      try {
        const options: any = { mode: 'readwrite' };
        if (sourceFileHandleRef.current) options.startIn = sourceFileHandleRef.current;
        sourceDirectoryHandleRef.current = await (window as any).showDirectoryPicker(options);
      } catch {
        setDeleteConfirming(false);
        return; // 사용자 취소
      }
    }

    try {
      await (sourceDirectoryHandleRef.current as any).removeEntry(fileName);
      toast.success(`${fileName} 삭제 완료`);
      setOriginalDeleted(true);
    } catch {
      toast.error('삭제 실패: 해당 폴더에서 파일을 찾을 수 없습니다.');
      sourceDirectoryHandleRef.current = null;
    }
    setDeleteConfirming(false);
  }, [fileName]);

  // 첫장·막장 개별 저장이 모두 완료되면 자동 초기화
  useEffect(() => {
    if (savedLeft && savedRight) {
      toast.success('첫장 + 막장 모두 저장됐습니다! 잠시 후 초기화됩니다.');
      const timer = setTimeout(resetTool, 1500);
      return () => clearTimeout(timer);
    }
  }, [savedLeft, savedRight, resetTool]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Usage Guide */}
      <ToolGuide title="앨범 분리 사용 가이드">
        <div className="pt-3 space-y-3">
          <svg viewBox="0 0 400 140" className="w-full max-w-[400px] mx-auto" xmlns="http://www.w3.org/2000/svg">
            {/* Wide spread image (A|B) */}
            <rect x="15" y="15" width="120" height="60" rx="4" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.5" />
            <text x="45" y="50" textAnchor="middle" fontSize="14" fill="#3B82F6" fontWeight="bold" fontFamily="sans-serif">A</text>
            <text x="105" y="50" textAnchor="middle" fontSize="14" fill="#3B82F6" fontWeight="bold" fontFamily="sans-serif">B</text>
            {/* Center dashed line */}
            <line x1="75" y1="18" x2="75" y2="72" stroke="#64748B" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x="75" y="92" textAnchor="middle" fontSize="11" fill="#64748B" fontFamily="sans-serif">펼침면 (A|B)</text>

            {/* Scissors icon */}
            <g transform="translate(155, 30)">
              <circle cx="8" cy="5" r="5" fill="none" stroke="#3B82F6" strokeWidth="1.5" />
              <circle cx="8" cy="25" r="5" fill="none" stroke="#3B82F6" strokeWidth="1.5" />
              <line x1="12" y1="8" x2="25" y2="22" stroke="#3B82F6" strokeWidth="2" />
              <line x1="12" y1="22" x2="25" y2="8" stroke="#3B82F6" strokeWidth="2" />
            </g>

            {/* First page result: white + B */}
            <rect x="205" y="10" width="80" height="50" rx="4" fill="white" stroke="#3B82F6" strokeWidth="2" />
            <rect x="245" y="10" width="40" height="50" rx="0" fill="#DBEAFE" />
            <rect x="245" y="10" width="40" height="50" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
            <line x1="245" y1="10" x2="245" y2="60" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 2" />
            <text x="225" y="30" textAnchor="middle" fontSize="10" fill="#CBD5E1" fontFamily="sans-serif">흰색</text>
            <text x="265" y="42" textAnchor="middle" fontSize="13" fill="#3B82F6" fontWeight="bold" fontFamily="sans-serif">B</text>
            <text x="245" y="78" textAnchor="middle" fontSize="11" fill="#3B82F6" fontWeight="bold" fontFamily="sans-serif">첫장</text>

            {/* Last page result: A + white */}
            <rect x="305" y="10" width="80" height="50" rx="4" fill="white" stroke="#3B82F6" strokeWidth="2" />
            <rect x="305" y="10" width="40" height="50" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
            <line x1="345" y1="10" x2="345" y2="60" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 2" />
            <text x="325" y="42" textAnchor="middle" fontSize="13" fill="#3B82F6" fontWeight="bold" fontFamily="sans-serif">A</text>
            <text x="365" y="30" textAnchor="middle" fontSize="10" fill="#CBD5E1" fontFamily="sans-serif">흰색</text>
            <text x="345" y="78" textAnchor="middle" fontSize="11" fill="#3B82F6" fontWeight="bold" fontFamily="sans-serif">막장</text>

            {/* Arrow from original to scissors area */}
            <path d="M 140 45 L 155 45" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrowSplit)" />
            <defs>
              <marker id="arrowSplit" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M 0 0 L 8 3 L 0 6 Z" fill="#3B82F6" />
              </marker>
            </defs>

            {/* Description at bottom */}
            <text x="200" y="105" textAnchor="middle" fontSize="11" fill="#64748B" fontFamily="sans-serif">가로형 펼침면을 세로 중앙에서 분리</text>
          </svg>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>가로형 앨범 펼침면을 세로 중앙에서 분리</li>
            <li>첫장: 왼쪽 절반 → 오른쪽에 배치 (왼쪽은 흰색)</li>
            <li>막장: 오른쪽 절반 → 왼쪽에 배치 (오른쪽은 흰색)</li>
            <li>DPI 보존, 개별 또는 일괄 저장</li>
          </ul>
        </div>
      </ToolGuide>

      {/* Upload Zone */}
      <div ref={uploadZoneRef}>
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
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <Upload className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-700">
                  앨범 이미지를 드래그하거나 클릭하여 선택하세요
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  JPEG, PNG 형식 지원 (가로형 앨범 펼침 이미지)
                </p>
              </div>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            title="앨범 이미지 선택"
            onChange={handleFileSelect}
          />
        </CardContent>
      </Card>
      </div>

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
                <p className="text-xs text-slate-500">크기</p>
                <p className="text-sm font-medium">{originalImage.naturalWidth} x {originalImage.naturalHeight}</p>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded">
                <p className="text-xs text-slate-500">DPI</p>
                <Badge variant="secondary">{originalDPI}</Badge>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded">
                <p className="text-xs text-slate-500">분리 후 크기</p>
                <p className="text-sm font-medium">
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
            <div className="border rounded-lg overflow-hidden bg-gray-100">
              <img
                src={originalImage.src}
                alt="원본 이미지"
                className="w-full h-auto object-contain max-h-[400px]"
              />
            </div>
            <div className="mt-3 flex justify-center">
              <Button onClick={handleSplit} disabled={processing} size="lg">
                <Scissors className="h-4 w-4 mr-2" />
                {processing ? '분리 중...' : '첫장 / 막장 분리'}
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
        <Card ref={resultCardRef}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-violet-500" />
                <span className="font-semibold text-sm">분리 결과</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSelectDirectory}>
                <FolderOpen className="h-4 w-4 mr-2" />
                {directoryHandle ? directoryHandle.name : '저장 폴더 선택'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left (First page) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">첫장</Badge>
                  {leftBlob && (
                    <span className="text-xs text-slate-500">{formatFileSize(leftBlob.size)}</span>
                  )}
                </div>
                <div className="border rounded-lg overflow-hidden bg-gray-100">
                  {leftUrl && (
                    <img src={leftUrl} alt="첫장" className="w-full h-auto object-contain max-h-[300px]" />
                  )}
                </div>
                <Button
                  variant={savedLeft ? 'secondary' : 'outline'}
                  size="sm"
                  className={`w-full ${savedLeft ? 'text-green-700 border-green-300 bg-green-50' : ''}`}
                  onClick={handleSaveLeft}
                  disabled={savedLeft}
                >
                  {savedLeft ? <CheckCircle className="h-4 w-4 mr-2 text-green-600" /> : <Download className="h-4 w-4 mr-2" />}
                  {savedLeft ? '첫장 저장 완료' : '첫장 저장'}
                </Button>
              </div>

              {/* Right (Last page) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">막장</Badge>
                  {rightBlob && (
                    <span className="text-xs text-slate-500">{formatFileSize(rightBlob.size)}</span>
                  )}
                </div>
                <div className="border rounded-lg overflow-hidden bg-gray-100">
                  {rightUrl && (
                    <img src={rightUrl} alt="막장" className="w-full h-auto object-contain max-h-[300px]" />
                  )}
                </div>
                <Button
                  variant={savedRight ? 'secondary' : 'outline'}
                  size="sm"
                  className={`w-full ${savedRight ? 'text-green-700 border-green-300 bg-green-50' : ''}`}
                  onClick={handleSaveRight}
                  disabled={savedRight}
                >
                  {savedRight ? <CheckCircle className="h-4 w-4 mr-2 text-green-600" /> : <Download className="h-4 w-4 mr-2" />}
                  {savedRight ? '막장 저장 완료' : '막장 저장'}
                </Button>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <Button onClick={handleSaveBoth} size="lg">
                <Download className="h-4 w-4 mr-2" />
                첫장 + 막장 모두 저장
              </Button>
            </div>

            {/* 원본 삭제 */}
            {!originalDeleted ? (
              <div className="mt-4 border-t pt-4">
                {!deleteConfirming ? (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400"
                      onClick={() => setDeleteConfirming(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      원본 삭제
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-700">원본 파일을 삭제하시겠습니까?</p>
                        <p className="text-xs text-red-500 mt-0.5">
                          <span className="font-medium">{fileName}</span> 을(를) 영구 삭제합니다. 되돌릴 수 없습니다.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirming(false)}
                      >
                        취소
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleDeleteOriginal}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        삭제 확인
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 border-t pt-4 flex justify-center">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-slate-400" />
                  원본 파일 삭제 완료
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ToolUsageCounter toolId="album-split" onTrackUse={(fn) => { trackUseRef.current = fn; }} />
    </div>
  );
}

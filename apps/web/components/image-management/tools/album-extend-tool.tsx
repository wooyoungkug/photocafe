'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Expand, Download, Info, Eye, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { extractDPIFromJPEG, canvasToJPEGWithDPI } from '@/lib/image-tools/dpi-utils';
import { saveToFolder, isJpegOrPng } from '@/lib/image-tools/file-utils';
import { ToolGuide } from './tool-guide';
import { ToolUsageCounter } from './tool-usage-counter';

export function AlbumExtendTool() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [originalDPI, setOriginalDPI] = useState(300);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [outputName, setOutputName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackUseRef = useRef<(() => void) | null>(null);
  const sourceFileHandleRef = useRef<FileSystemFileHandle | null>(null);

  const cleanup = useCallback(() => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [resultUrl]);

  const loadImage = useCallback((file: File) => {
    cleanup();
    setShowResult(false);
    setResultBlob(null);
    setResultUrl('');

    const baseName = file.name.replace(/\.[^.]+$/, '');
    setOutputName(baseName);

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

  const handleExtend = useCallback(async (type: 'first' | 'last') => {
    if (!originalImage) return;

    setProcessing(true);
    cleanup();

    try {
      const { naturalWidth: w, naturalHeight: h } = originalImage;
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = w * 2;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (type === 'first') {
        // First page: blank on left, image on right
        ctx.drawImage(originalImage, w, 0);
      } else {
        // Last page: image on left, blank on right
        ctx.drawImage(originalImage, 0, 0);
      }

      const result = await canvasToJPEGWithDPI(canvas, originalDPI);
      setResultBlob(result.blob);
      setResultUrl(result.url);
      setShowResult(true);

      const label = type === 'first' ? '첫장' : '막장';
      toast.success(`${label} 늘리기 완료!`);
      trackUseRef.current?.();
    } catch (err) {
      console.error('Extend error:', err);
      toast.error('이미지 늘리기 중 오류가 발생했습니다.');
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

  const handleSave = useCallback(async () => {
    if (!resultBlob) return;
    const filename = `${outputName || 'output'}.jpg`;
    if (directoryHandle) {
      const ok = await saveToFolder(directoryHandle, resultBlob, filename);
      if (ok) toast.success(`${filename} 저장 완료`);
      else toast.error('저장 실패');
    } else {
      const ok = await saveWithPicker(resultBlob, filename);
      if (!ok) {
        // showSaveFilePicker 미지원 브라우저 폴백
        const url = URL.createObjectURL(resultBlob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    }
  }, [resultBlob, directoryHandle, outputName, saveWithPicker]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Usage Guide */}
      <ToolGuide title="앨범 늘리기 사용 가이드">
        <div className="pt-3 space-y-3">
          <svg viewBox="0 0 400 130" className="w-full max-w-[400px] mx-auto" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="arrowExtend" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M 0 0 L 8 3 L 0 6 Z" fill="#3B82F6" />
              </marker>
            </defs>

            {/* Original small image (A) */}
            <rect x="20" y="20" width="50" height="50" rx="4" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.5" />
            <text x="45" y="50" textAnchor="middle" fontSize="14" fill="#3B82F6" fontWeight="bold" fontFamily="sans-serif">A</text>
            <text x="45" y="88" textAnchor="middle" fontSize="11" fill="#64748B" fontFamily="sans-serif">단면 원본</text>

            {/* Arrow */}
            <path d="M 80 45 L 110 45" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrowExtend)" />

            {/* First page extend: white + A */}
            <rect x="120" y="15" width="100" height="50" rx="4" fill="white" stroke="#3B82F6" strokeWidth="2" />
            <rect x="170" y="15" width="50" height="50" rx="0" fill="#DBEAFE" />
            <rect x="120" y="15" width="100" height="50" rx="4" fill="none" stroke="#3B82F6" strokeWidth="2" />
            <line x1="170" y1="15" x2="170" y2="65" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 2" />
            <text x="145" y="44" textAnchor="middle" fontSize="10" fill="#CBD5E1" fontFamily="sans-serif">흰색</text>
            <text x="195" y="46" textAnchor="middle" fontSize="13" fill="#3B82F6" fontWeight="bold" fontFamily="sans-serif">A</text>
            <text x="170" y="82" textAnchor="middle" fontSize="11" fill="#3B82F6" fontWeight="bold" fontFamily="sans-serif">첫장 늘리기</text>

            {/* Arrow for last page */}
            <path d="M 80 45 L 110 95" stroke="#3B82F6" strokeWidth="1.5" fill="none" strokeDasharray="4 2" />
            <path d="M 110 95 L 120 95" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrowExtend)" />

            {/* Last page extend: A + white */}
            <rect x="130" y="70" width="100" height="50" rx="4" fill="white" stroke="#3B82F6" strokeWidth="2" />
            <rect x="130" y="70" width="50" height="50" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
            <line x1="180" y1="70" x2="180" y2="120" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 2" />
            <text x="155" y="100" textAnchor="middle" fontSize="13" fill="#3B82F6" fontWeight="bold" fontFamily="sans-serif">A</text>
            <text x="205" y="99" textAnchor="middle" fontSize="10" fill="#CBD5E1" fontFamily="sans-serif">흰색</text>
            <text x="180" y="135" textAnchor="middle" fontSize="11" fill="#3B82F6" fontWeight="bold" fontFamily="sans-serif">막장 늘리기</text>

            {/* Size annotation */}
            <line x1="270" y1="25" x2="270" y2="55" stroke="#64748B" strokeWidth="1" />
            <line x1="265" y1="25" x2="275" y2="25" stroke="#64748B" strokeWidth="1" />
            <line x1="265" y1="55" x2="275" y2="55" stroke="#64748B" strokeWidth="1" />
            <text x="290" y="35" fontSize="10" fill="#64748B" fontFamily="sans-serif">원본</text>
            <text x="290" y="47" fontSize="10" fill="#64748B" fontFamily="sans-serif">세로</text>

            <line x1="300" y1="15" x2="380" y2="15" stroke="#64748B" strokeWidth="1" />
            <line x1="300" y1="10" x2="300" y2="20" stroke="#64748B" strokeWidth="1" />
            <line x1="380" y1="10" x2="380" y2="20" stroke="#64748B" strokeWidth="1" />
            <text x="340" y="30" textAnchor="middle" fontSize="10" fill="#64748B" fontFamily="sans-serif">가로 x 2</text>
          </svg>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>단면(첫장/막장) 이미지를 펼침(양면) 크기로 확장</li>
            <li>첫장 늘리기: 왼쪽에 흰색 여백 추가</li>
            <li>막장 늘리기: 오른쪽에 흰색 여백 추가</li>
            <li>DPI 보존, 출력 크기 = 원본 가로 x 2</li>
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
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <Upload className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-700">
                  앨범 이미지를 드래그하거나 클릭하여 선택하세요
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  JPEG, PNG 형식 지원 (첫장 또는 막장 단면 이미지)
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
                <p className="text-xs text-slate-500">늘린 후 크기</p>
                <p className="text-sm font-medium text-green-600">
                  {originalImage.naturalWidth * 2} x {originalImage.naturalHeight}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Original Preview + Actions */}
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
            <div className="mt-4 flex flex-col sm:flex-row justify-center gap-3">
              <Button
                onClick={() => handleExtend('first')}
                disabled={processing}
                variant="default"
                size="lg"
              >
                <Expand className="h-4 w-4 mr-2" />
                {processing ? '처리 중...' : '첫장 늘리기 (왼쪽 여백)'}
              </Button>
              <Button
                onClick={() => handleExtend('last')}
                disabled={processing}
                variant="secondary"
                size="lg"
              >
                <Expand className="h-4 w-4 mr-2" />
                {processing ? '처리 중...' : '막장 늘리기 (오른쪽 여백)'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Result */}
      {showResult && resultUrl && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Expand className="h-4 w-4 text-violet-500" />
                <span className="font-semibold text-sm">결과</span>
                {resultBlob && (
                  <span className="text-xs text-slate-500">({formatFileSize(resultBlob.size)})</span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleSelectDirectory}>
                <FolderOpen className="h-4 w-4 mr-2" />
                {directoryHandle ? directoryHandle.name : '저장 폴더 선택'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="border rounded-lg overflow-hidden bg-gray-100">
              <img
                src={resultUrl}
                alt="결과 이미지"
                className="w-full h-auto object-contain max-h-[400px]"
              />
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="output-name" className="text-sm whitespace-nowrap">파일명:</Label>
                <Input
                  id="output-name"
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                  className="max-w-xs"
                  placeholder="출력 파일명"
                />
                <span className="text-sm text-slate-500">.jpg</span>
              </div>
              <div className="flex justify-center">
                <Button onClick={handleSave} size="lg">
                  <Download className="h-4 w-4 mr-2" />
                  저장
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ToolUsageCounter toolId="album-extend" onTrackUse={(fn) => { trackUseRef.current = fn; }} />
    </div>
  );
}

'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, ImageIcon, Eye, Play, Info, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { extractDPIFromJPEG, canvasToJPEGWithDPI } from '@/lib/image-tools/dpi-utils';
import { saveToFolder, fallbackDownload, pickDirectory } from '@/lib/image-tools/file-utils';
import { processRestore } from '@/lib/image-tools/image-processing';
import { ToolGuide } from './tool-guide';
import { ToolUsageCounter } from './tool-usage-counter';

interface ImageInfo {
  fileName: string;
  size: string;
  fileSize: string;
  dpi: number;
}

export function ImageRestoreTool() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [originalDPI, setOriginalDPI] = useState(300);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [scale, setScale] = useState(1);
  const [originalArrayBuffer, setOriginalArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [amount, setAmount] = useState(100);
  const [radius, setRadius] = useState(2);
  const [showInfo, setShowInfo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [outputFileName, setOutputFileName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const origCanvasRef = useRef<HTMLCanvasElement>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);
  const trackUseRef = useRef<(() => void) | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileLoad = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    setOriginalArrayBuffer(arrayBuffer);

    const dpi = extractDPIFromJPEG(arrayBuffer);
    setOriginalDPI(dpi);

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      setOriginalImage(img);
      setFileName(file.name);

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      setOutputFileName(`${baseName}_restored`);

      const info: ImageInfo = {
        fileName: file.name,
        size: `${img.width} x ${img.height}px`,
        fileSize: formatFileSize(file.size),
        dpi,
      };
      setImageInfo(info);
      setShowInfo(true);
      setShowPreview(false);
      setShowCompare(false);

      toast.success(`이미지 로드 완료: ${file.name}`);
    };

    img.onerror = () => {
      toast.error('이미지를 불러올 수 없습니다.');
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await handleFileLoad(files[0]);
      }
    },
    [handleFileLoad],
  );

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
      const file = e.target.files?.[0];
      if (file) await handleFileLoad(file);
      e.target.value = '';
    },
    [handleFileLoad],
  );

  const handleSelectFolder = useCallback(async () => {
    const handle = await pickDirectory();
    if (handle) {
      setDirectoryHandle(handle);
      toast.success(`저장 폴더 선택: ${handle.name}`);
    }
  }, []);

  const handlePreview = useCallback(() => {
    if (!originalImage) {
      toast.error('먼저 이미지를 업로드해 주세요.');
      return;
    }

    // Draw original on origCanvas
    const origCanvas = origCanvasRef.current;
    if (origCanvas) {
      const maxPreviewW = 400;
      const ratio = Math.min(maxPreviewW / originalImage.width, 1);
      origCanvas.width = Math.round(originalImage.width * ratio);
      origCanvas.height = Math.round(originalImage.height * ratio);
      const ctx = origCanvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(originalImage, 0, 0, origCanvas.width, origCanvas.height);
      }
    }

    // Preview with processRestore at preview scale
    const resultCanvas = resultCanvasRef.current;
    if (resultCanvas) {
      const maxPreviewW = 400;
      const previewScale = Math.min(maxPreviewW / originalImage.width, 1) * scale;
      const processed = processRestore(originalImage, previewScale, amount, radius);
      resultCanvas.width = processed.width;
      resultCanvas.height = processed.height;
      const ctx = resultCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(processed, 0, 0);
      }
    }

    setShowPreview(true);
    setShowCompare(true);
  }, [originalImage, scale, amount, radius]);

  const handleExecute = useCallback(async () => {
    if (!originalImage) {
      toast.error('먼저 이미지를 업로드해 주세요.');
      return;
    }

    setProcessing(true);
    toast.info('이미지 처리 중...');

    try {
      // Use requestAnimationFrame to allow UI update before heavy processing
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => setTimeout(resolve, 50));

      const processed = processRestore(originalImage, scale, amount, radius);
      const finalFileName = `${outputFileName || 'restored'}.jpg`;

      const { blob } = await canvasToJPEGWithDPI(processed, originalDPI, 1.0);

      if (directoryHandle) {
        const success = await saveToFolder(directoryHandle, blob, finalFileName);
        if (success) {
          toast.success(`저장 완료: ${finalFileName}`);
          trackUseRef.current?.();
        } else {
          toast.error('저장에 실패했습니다. 다운로드로 대체합니다.');
          fallbackDownload(blob, finalFileName);
        }
      } else {
        fallbackDownload(blob, finalFileName);
        toast.success(`다운로드 완료: ${finalFileName}`);
        trackUseRef.current?.();
      }
    } catch (err) {
      console.error('이미지 처리 오류:', err);
      toast.error('이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  }, [originalImage, scale, amount, radius, outputFileName, originalDPI, directoryHandle]);

  const scaleOptions = [1, 1.5, 2, 3, 4];

  return (
    <div className="space-y-4">
      {/* Usage Guide */}
      <ToolGuide title="이미지 복원 사용 가이드">
        <div className="pt-3 space-y-3">
          <svg viewBox="0 0 400 120" className="w-full max-w-[400px] mx-auto" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="blurFilter">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
              </filter>
            </defs>
            {/* Blurry image (before) */}
            <rect x="20" y="15" width="80" height="60" rx="4" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.5" filter="url(#blurFilter)" />
            <rect x="35" y="30" width="50" height="30" rx="2" fill="#93C5FD" filter="url(#blurFilter)" />
            <text x="60" y="95" textAnchor="middle" fontSize="11" fill="#64748B" fontFamily="sans-serif">흐릿한 원본</text>

            {/* Arrow */}
            <path d="M 120 45 L 165 45" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrowRestore)" />
            <defs>
              <marker id="arrowRestore" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M 0 0 L 8 3 L 0 6 Z" fill="#3B82F6" />
              </marker>
            </defs>
            <text x="142" y="38" textAnchor="middle" fontSize="10" fill="#3B82F6" fontFamily="sans-serif">복원</text>

            {/* Sharp image (after) */}
            <rect x="180" y="15" width="80" height="60" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
            <rect x="195" y="30" width="50" height="30" rx="2" fill="#3B82F6" />
            <text x="220" y="95" textAnchor="middle" fontSize="11" fill="#64748B" fontFamily="sans-serif">선명한 결과</text>

            {/* Upscale indicator */}
            <path d="M 280 45 L 310 45" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrowRestore)" />
            <rect x="320" y="8" width="70" height="74" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
            <rect x="335" y="20" width="40" height="50" rx="2" fill="#3B82F6" />
            <text x="355" y="100" textAnchor="middle" fontSize="11" fill="#64748B" fontFamily="sans-serif">업스케일</text>

            {/* Scale text */}
            <text x="200" y="115" textAnchor="middle" fontSize="12" fill="#3B82F6" fontWeight="bold" fontFamily="sans-serif">1x → 2x ~ 4x</text>
          </svg>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>Unsharp Mask로 선명도 향상 (강도, 반경 조절 가능)</li>
            <li>1x~4x 업스케일로 해상도 증가</li>
            <li>DPI 정보 보존</li>
            <li>JPEG/PNG 지원</li>
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
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-700">
                  이미지를 드래그하여 놓거나 클릭하세요
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  JPG, PNG 형식 지원 (단일 이미지)
                </p>
              </div>
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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleFileInput}
          />
        </CardContent>
      </Card>

      {/* Image Info */}
      {showInfo && imageInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              이미지 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500">파일명</p>
                <p className="text-sm font-medium truncate">{imageInfo.fileName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">크기</p>
                <p className="text-sm font-medium">{imageInfo.size}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">파일 크기</p>
                <p className="text-sm font-medium">{imageInfo.fileSize}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">DPI</p>
                <Badge variant="secondary">{imageInfo.dpi} DPI</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings */}
      {showInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">보정 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upscale Buttons */}
            <div className="space-y-2">
              <Label>업스케일 배율</Label>
              <div className="flex gap-2 flex-wrap">
                {scaleOptions.map((s) => (
                  <Button
                    key={s}
                    variant={scale === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setScale(s)}
                  >
                    {s}x
                  </Button>
                ))}
              </div>
              {originalImage && (
                <p className="text-xs text-slate-500">
                  결과 크기: {Math.round(originalImage.width * scale)} x{' '}
                  {Math.round(originalImage.height * scale)}px
                </p>
              )}
            </div>

            {/* Sharpness Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>선명도 강도 (Amount)</Label>
                <span className="text-sm font-medium text-slate-700">{amount}%</span>
              </div>
              <Slider
                value={[amount]}
                onValueChange={([v]) => setAmount(v)}
                min={0}
                max={300}
                step={1}
              />
              <p className="text-xs text-slate-500">0~300% (기본값: 100%)</p>
            </div>

            {/* Blur Radius */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>블러 반경 (Radius)</Label>
                <span className="text-sm font-medium text-slate-700">{radius}</span>
              </div>
              <Slider
                value={[radius]}
                onValueChange={([v]) => setRadius(v)}
                min={1}
                max={10}
                step={0.5}
              />
              <p className="text-xs text-slate-500">1~10 (기본값: 2)</p>
            </div>

            {/* Output Filename */}
            <div className="space-y-2">
              <Label>출력 파일명</Label>
              <div className="flex gap-2">
                <Input
                  value={outputFileName}
                  onChange={(e) => setOutputFileName(e.target.value)}
                  placeholder="파일명 입력"
                  className="flex-1"
                />
                <span className="flex items-center text-sm text-slate-500">.jpg</span>
              </div>
            </div>

            {/* Save Folder */}
            <div className="space-y-2">
              <Label>저장 폴더</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectFolder}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  폴더 선택
                </Button>
                {directoryHandle ? (
                  <Badge variant="success">{directoryHandle.name}</Badge>
                ) : (
                  <span className="text-xs text-slate-500">
                    미선택 시 다운로드로 저장
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={!originalImage || processing}
              >
                <Eye className="h-4 w-4 mr-2" />
                미리보기
              </Button>
              <Button
                onClick={handleExecute}
                disabled={!originalImage || processing}
              >
                <Play className="h-4 w-4 mr-2" />
                {processing ? '처리 중...' : '실행'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Before / After Preview */}
      {showCompare && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">미리보기 비교</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-center text-slate-600">원본 (Before)</p>
                <div className="border rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center min-h-[200px]">
                  <canvas
                    ref={origCanvasRef}
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-center text-slate-600">보정 후 (After)</p>
                <div className="border rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center min-h-[200px]">
                  <canvas
                    ref={resultCanvasRef}
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ToolUsageCounter toolId="image-restore" onTrackUse={(fn) => { trackUseRef.current = fn; }} />
    </div>
  );
}

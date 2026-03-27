'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, RotateCw, Download, Info, AlertTriangle, CheckCircle, FolderOpen, Trash2, X, FolderUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { extractDPIFromJPEG, canvasToJPEGWithDPI } from '@/lib/image-tools/dpi-utils';
import { saveToFolder, isJpegOrPng } from '@/lib/image-tools/file-utils';
import { ToolGuide } from './tool-guide';
import { ToolUsageCounter } from './tool-usage-counter';

interface ImageInfo {
  file: File;
  img: HTMLImageElement;
  dpi: number;
  widthPx: number;
  heightPx: number;
  widthInch: number;
  heightInch: number;
  isLandscape: boolean;
  colorSpace: string; // 'RGB' | 'CMYK' | 'Grayscale' | 'Unknown'
  resultBlob: Blob | null;
  resultUrl: string;
  saved: boolean;
  processing: boolean;
}

/** JPEG SOF 마커에서 컬러 스페이스 감지 */
function detectColorSpace(arrayBuffer: ArrayBuffer): string {
  const data = new Uint8Array(arrayBuffer);
  if (data[0] !== 0xFF || data[1] !== 0xD8) return 'Unknown';

  let offset = 2;
  while (offset < data.length - 4) {
    const marker = (data[offset] << 8) | data[offset + 1];

    // SOF markers (SOF0~SOF3, SOF5~SOF7, SOF9~SOF11, SOF13~SOF15)
    if (
      (marker >= 0xFFC0 && marker <= 0xFFC3) ||
      (marker >= 0xFFC5 && marker <= 0xFFC7) ||
      (marker >= 0xFFC9 && marker <= 0xFFCB) ||
      (marker >= 0xFFCD && marker <= 0xFFCF)
    ) {
      const numComponents = data[offset + 9];
      if (numComponents === 1) return 'Grayscale';
      if (numComponents === 3) return 'RGB';
      if (numComponents === 4) return 'CMYK';
      return `Unknown(${numComponents}ch)`;
    }

    if (marker === 0xFFD9 || marker === 0xFFDA) break;

    // Skip segment
    if (offset + 3 < data.length) {
      const segLen = (data[offset + 2] << 8) | data[offset + 3];
      offset += 2 + segLen;
    } else {
      break;
    }
  }
  return 'Unknown';
}

export function ImageRotateTool() {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [directoryHandle, _setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingAll, setProcessingAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadZoneRef = useRef<HTMLDivElement>(null);
  const trackUseRef = useRef<(() => void) | null>(null);

  // state + ref 동기화 (비동기 콜백에서 항상 최신 값 참조)
  const setDirectoryHandle = useCallback((handle: FileSystemDirectoryHandle | null) => {
    directoryHandleRef.current = handle;
    _setDirectoryHandle(handle);
  }, []);

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

  const loadImages = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(f => isJpegOrPng(f));
    if (imageFiles.length === 0) {
      toast.error('JPEG 또는 PNG 파일만 지원합니다.');
      return;
    }

    const newImages: ImageInfo[] = [];

    for (const file of imageFiles) {
      const arrayBuffer = await file.arrayBuffer();
      const dpi = extractDPIFromJPEG(arrayBuffer);
      const colorSpace = file.type === 'image/png' ? 'RGB' : detectColorSpace(arrayBuffer);

      const img = await new Promise<HTMLImageElement>((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.src = URL.createObjectURL(file);
      });

      const widthPx = img.naturalWidth;
      const heightPx = img.naturalHeight;
      const effectiveDpi = dpi > 0 ? dpi : 300;

      newImages.push({
        file,
        img,
        dpi,
        widthPx,
        heightPx,
        widthInch: +(widthPx / effectiveDpi).toFixed(2),
        heightInch: +(heightPx / effectiveDpi).toFixed(2),
        isLandscape: widthPx > heightPx,
        colorSpace,
        resultBlob: null,
        resultUrl: '',
        saved: false,
        processing: false,
      });
    }

    setImages(prev => [...prev, ...newImages]);
    toast.success(`${newImages.length}개 이미지 로드 완료`);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) loadImages(files);
    e.target.value = '';
  }, [loadImages]);

  const folderInputRef = useRef<HTMLInputElement>(null);

  // webkitdirectory 속성 설정 (비표준이라 ref로 설정)
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const handleClickUpload = useCallback(async () => {
    // 파일 선택 대신 항상 폴더 선택으로 유도 (원본 폴더에 저장하기 위해)
    if ('showDirectoryPicker' in window) {
      try {
        const options: any = { mode: 'readwrite' };
        if (directoryHandle) options.startIn = directoryHandle;
        const dirHandle = await (window as any).showDirectoryPicker(options);
        setDirectoryHandle(dirHandle);

        const files: File[] = [];
        for await (const [name, handle] of dirHandle.entries()) {
          if (handle.kind === 'file' && /\.(jpe?g|png)$/i.test(name)) {
            const file = await (handle as FileSystemFileHandle).getFile();
            files.push(file);
          }
        }

        if (files.length === 0) {
          toast.error('폴더에 JPEG/PNG 파일이 없습니다.');
          return;
        }

        files.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        loadImages(files);
        toast.success(`폴더: ${dirHandle.name} (${files.length}개 이미지) → 회전 후 같은 폴더에 저장됩니다`);
      } catch { /* 사용자 취소 */ }
    } else {
      fileInputRef.current?.click();
    }
  }, [loadImages, directoryHandle]);

  const handleFolderUpload = useCallback(async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const options: any = { mode: 'readwrite' };
        if (directoryHandle) options.startIn = directoryHandle;
        const dirHandle = await (window as any).showDirectoryPicker(options);
        setDirectoryHandle(dirHandle);

        const files: File[] = [];
        for await (const [name, handle] of dirHandle.entries()) {
          if (handle.kind === 'file' && /\.(jpe?g|png)$/i.test(name)) {
            const file = await (handle as FileSystemFileHandle).getFile();
            files.push(file);
          }
        }

        if (files.length === 0) {
          toast.error('폴더에 JPEG/PNG 파일이 없습니다.');
          return;
        }

        files.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        loadImages(files);
        toast.success(`폴더: ${dirHandle.name} (${files.length}개 이미지) → 자동 저장 활성화`);
      } catch { /* 사용자 취소 */ }
    } else {
      // showDirectoryPicker 미지원 → webkitdirectory fallback
      folderInputRef.current?.click();
    }
  }, [loadImages, directoryHandle]);

  /** DataTransferItem에서 폴더 포함 파일 추출 */
  const extractFilesFromDrop = useCallback(async (dataTransfer: DataTransfer): Promise<File[]> => {
    const files: File[] = [];
    const items = Array.from(dataTransfer.items);

    const readDirectory = (dirEntry: FileSystemDirectoryEntry): Promise<File[]> => {
      return new Promise((resolve) => {
        const reader = dirEntry.createReader();
        const results: File[] = [];
        const readEntries = () => {
          reader.readEntries(async (entries) => {
            if (entries.length === 0) {
              resolve(results);
              return;
            }
            for (const entry of entries) {
              if (entry.isFile && /\.(jpe?g|png)$/i.test(entry.name)) {
                const file = await new Promise<File>((res) => {
                  (entry as FileSystemFileEntry).file(res);
                });
                results.push(file);
              }
            }
            readEntries(); // 다음 배치
          });
        };
        readEntries();
      });
    };

    for (const item of items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        const dirFiles = await readDirectory(entry as FileSystemDirectoryEntry);
        files.push(...dirFiles);
      } else if (entry?.isFile) {
        const file = item.getAsFile();
        if (file && isJpegOrPng(file)) files.push(file);
      }
    }

    return files;
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // 폴더 드롭 지원: webkitGetAsEntry 사용
    const hasItems = e.dataTransfer.items && e.dataTransfer.items.length > 0;
    if (hasItems) {
      const files = await extractFilesFromDrop(e.dataTransfer);
      if (files.length > 0) {
        files.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        loadImages(files);
      } else {
        toast.error('JPEG 또는 PNG 파일이 없습니다.');
      }
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) loadImages(files);
  }, [loadImages, extractFilesFromDrop]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages(prev => {
      const item = prev[index];
      if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      if (item.img.src.startsWith('blob:')) URL.revokeObjectURL(item.img.src);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  /** 단일 이미지 회전 처리 */
  const processImage = useCallback(async (info: ImageInfo): Promise<{ blob: Blob; url: string }> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    if (info.isLandscape) {
      // 가로형 → 90도 시계방향 회전하여 세로형으로
      canvas.width = info.heightPx;
      canvas.height = info.widthPx;
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(info.img, 0, 0);
    } else {
      // 세로형 → 그대로
      canvas.width = info.widthPx;
      canvas.height = info.heightPx;
      ctx.drawImage(info.img, 0, 0);
    }

    const result = await canvasToJPEGWithDPI(canvas, info.dpi || 300);
    return result;
  }, []);

  /** 전체 일괄 회전 처리 */
  const handleRotateAll = useCallback(async () => {
    if (images.length === 0) return;
    setProcessingAll(true);

    try {
      const updated = [...images];
      for (let i = 0; i < updated.length; i++) {
        if (updated[i].resultBlob) continue; // 이미 처리된 건 스킵
        updated[i] = { ...updated[i], processing: true };
        setImages([...updated]);

        const result = await processImage(updated[i]);
        updated[i] = {
          ...updated[i],
          resultBlob: result.blob,
          resultUrl: result.url,
          processing: false,
        };
        setImages([...updated]);
      }

      playBeep();
      trackUseRef.current?.();

      // 자동 저장 — ref에서 최신 directoryHandle 참조
      let saveHandle = directoryHandleRef.current;
      if (!saveHandle && 'showDirectoryPicker' in window) {
        try {
          toast.info('저장할 폴더를 선택하세요.');
          saveHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
          setDirectoryHandle(saveHandle);
        } catch {
          // 사용자 취소 → 저장 없이 종료
          toast.success('전체 회전 완료! (저장 폴더 미선택)');
          return;
        }
      }

      if (saveHandle) {
        let allSaved = true;
        for (let i = 0; i < updated.length; i++) {
          if (updated[i].saved || !updated[i].resultBlob) continue;
          const ok = await saveToFolder(saveHandle, updated[i].resultBlob!, updated[i].file.name);
          if (ok) {
            updated[i] = { ...updated[i], saved: true };
          } else {
            allSaved = false;
          }
        }
        setImages([...updated]);
        toast.success(allSaved ? '전체 회전 + 저장 완료!' : '회전 완료! (일부 저장 실패)');
      } else {
        toast.success('전체 회전 완료!');
      }
    } catch (err) {
      console.error('Rotate error:', err);
      toast.error('이미지 회전 중 오류가 발생했습니다.');
    } finally {
      setProcessingAll(false);
    }
  }, [images, processImage, directoryHandle, playBeep]);

  const handleSelectDirectory = useCallback(async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        setDirectoryHandle(handle);
        toast.success(`저장 폴더: ${handle.name}`);
      } catch { /* 사용자 취소 */ }
    }
  }, []);

  const handleSaveAll = useCallback(async () => {
    const toSave = images.filter(img => img.resultBlob && !img.saved);
    if (toSave.length === 0) {
      toast.info('저장할 이미지가 없습니다.');
      return;
    }

    const saveHandle = directoryHandleRef.current;
    if (saveHandle) {
      const updated = [...images];
      let count = 0;
      for (let i = 0; i < updated.length; i++) {
        if (!updated[i].resultBlob || updated[i].saved) continue;
        const ok = await saveToFolder(saveHandle, updated[i].resultBlob!, updated[i].file.name);
        if (ok) {
          updated[i] = { ...updated[i], saved: true };
          count++;
        }
      }
      setImages(updated);
      toast.success(`${count}개 파일 저장 완료!`);
    } else {
      // 폴더 미선택 → 개별 다운로드
      for (const img of toSave) {
        if (!img.resultBlob) continue;
        const url = URL.createObjectURL(img.resultBlob);
        const link = document.createElement('a');
        link.download = img.file.name;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
      toast.success(`${toSave.length}개 파일 다운로드 시작!`);
    }
  }, [images, directoryHandle]);

  const handleReset = useCallback(() => {
    images.forEach(img => {
      if (img.resultUrl) URL.revokeObjectURL(img.resultUrl);
      if (img.img.src.startsWith('blob:')) URL.revokeObjectURL(img.img.src);
    });
    setImages([]);
  }, [images]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const landscapeCount = images.filter(img => img.isLandscape).length;
  const portraitCount = images.filter(img => !img.isLandscape).length;
  const warningCount = images.filter(img => img.colorSpace !== 'RGB').length;
  const lowDpiCount = images.filter(img => img.dpi < 200).length;
  const processedCount = images.filter(img => img.resultBlob).length;

  return (
    <div className="space-y-4">
      {/* Usage Guide */}
      <ToolGuide title="이미지 회전 사용 가이드">
        <div className="pt-3 space-y-3">
          <svg viewBox="0 0 400 120" className="w-full max-w-[400px] mx-auto" xmlns="http://www.w3.org/2000/svg">
            {/* 가로형 이미지 */}
            <rect x="15" y="25" width="100" height="65" rx="4" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.5" />
            <text x="65" y="62" textAnchor="middle" fontSize="11" fill="#3B82F6" fontWeight="bold" fontFamily="sans-serif">가로형</text>
            <text x="65" y="105" textAnchor="middle" fontSize="10" fill="#64748B" fontFamily="sans-serif">Landscape</text>

            {/* 회전 화살표 */}
            <g transform="translate(130, 40)">
              <path d="M 0 15 Q 15 -5 30 15" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrowRotate)" />
              <text x="15" y="35" textAnchor="middle" fontSize="10" fill="#3B82F6" fontFamily="sans-serif">90°</text>
            </g>
            <defs>
              <marker id="arrowRotate" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M 0 0 L 8 3 L 0 6 Z" fill="#3B82F6" />
              </marker>
            </defs>

            {/* 회전된 세로형 */}
            <rect x="180" y="10" width="65" height="100" rx="4" fill="#DCFCE7" stroke="#86EFAC" strokeWidth="1.5" />
            <text x="212" y="65" textAnchor="middle" fontSize="11" fill="#16A34A" fontWeight="bold" fontFamily="sans-serif">세로형</text>

            {/* 이미 세로형 */}
            <rect x="280" y="10" width="65" height="100" rx="4" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1.5" />
            <text x="312" y="55" textAnchor="middle" fontSize="10" fill="#6B7280" fontFamily="sans-serif">세로형</text>
            <text x="312" y="70" textAnchor="middle" fontSize="10" fill="#6B7280" fontFamily="sans-serif">(그대로)</text>
            <text x="312" y="125" textAnchor="middle" fontSize="10" fill="#64748B" fontFamily="sans-serif">Portrait → 유지</text>
          </svg>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>가로형 이미지 → 90° 시계방향 회전하여 세로형으로 변환</li>
            <li>세로형 이미지 → 회전 없이 그대로 유지</li>
            <li>규격(인치), 해상도(DPI), 색상 모드(RGB/CMYK) 자동 검사</li>
            <li>CMYK·저해상도 이미지는 경고 표시</li>
            <li>DPI 보존, 일괄 처리 및 저장 지원</li>
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
                    클릭하여 폴더를 선택하세요
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    JPEG, PNG 형식 지원 · 폴더 내 이미지를 회전 후 같은 폴더에 저장합니다
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-center mt-3">
              <Button
                variant="outline"
                onClick={(e) => { e.stopPropagation(); handleFolderUpload(); }}
              >
                <FolderUp className="h-4 w-4 mr-2" />
                폴더 전체 업로드
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="hidden"
              title="이미지 선택"
              onChange={handleFileSelect}
            />
            <input
              ref={folderInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="hidden"
              title="폴더 선택"
              onChange={handleFileSelect}
            />
          </CardContent>
        </Card>
      </div>

      {/* Image List with Info */}
      {images.length > 0 && (
        <>
          {/* Summary Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    총 {images.length}개
                  </Badge>
                  {landscapeCount > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      <RotateCw className="h-3 w-3 mr-1" />
                      가로→세로 {landscapeCount}개
                    </Badge>
                  )}
                  {portraitCount > 0 && (
                    <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">
                      세로 유지 {portraitCount}개
                    </Badge>
                  )}
                  {warningCount > 0 && (
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      비RGB {warningCount}개
                    </Badge>
                  )}
                  {lowDpiCount > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      저해상도 {lowDpiCount}개
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectDirectory}>
                    <FolderOpen className="h-4 w-4 mr-1" />
                    {directoryHandle ? directoryHandle.name : '저장 폴더'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    초기화
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-medium text-slate-600 w-8">#</th>
                      <th className="px-3 py-2.5 text-left font-medium text-slate-600">미리보기</th>
                      <th className="px-3 py-2.5 text-left font-medium text-slate-600">파일명</th>
                      <th className="px-3 py-2.5 text-center font-medium text-slate-600">크기(px)</th>
                      <th className="px-3 py-2.5 text-center font-medium text-slate-600">규격(인치)</th>
                      <th className="px-3 py-2.5 text-center font-medium text-slate-600">해상도</th>
                      <th className="px-3 py-2.5 text-center font-medium text-slate-600">색상</th>
                      <th className="px-3 py-2.5 text-center font-medium text-slate-600">방향</th>
                      <th className="px-3 py-2.5 text-center font-medium text-slate-600">상태</th>
                      <th className="px-3 py-2.5 text-center font-medium text-slate-600 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {images.map((info, idx) => (
                      <tr key={idx} className={`hover:bg-slate-50/50 ${info.colorSpace !== 'RGB' ? 'bg-red-50/30' : ''}`}>
                        <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="w-12 h-12 rounded border bg-gray-100 overflow-hidden flex items-center justify-center">
                            <img
                              src={info.resultUrl || info.img.src}
                              alt={info.file.name}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-700 truncate max-w-[200px]">{info.file.name}</p>
                          <p className="text-xs text-slate-400">{formatFileSize(info.file.size)}</p>
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {info.widthPx} × {info.heightPx}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {info.widthInch}" × {info.heightInch}"
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge
                            variant="secondary"
                            className={info.dpi < 200 ? 'bg-yellow-100 text-yellow-700' : ''}
                          >
                            {info.dpi} DPI
                          </Badge>
                          {info.dpi < 200 && (
                            <p className="text-xs text-yellow-600 mt-0.5">저해상도</p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {info.colorSpace === 'RGB' ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">RGB</Badge>
                          ) : (
                            <div>
                              <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {info.colorSpace}
                              </Badge>
                              <p className="text-xs text-red-500 mt-0.5">RGB 아님!</p>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {info.isLandscape ? (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                              <RotateCw className="h-3 w-3 mr-1" />
                              가로→세로
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">
                              세로 유지
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {info.processing ? (
                            <span className="text-blue-500 text-xs">처리중...</span>
                          ) : info.saved ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          ) : info.resultBlob ? (
                            <CheckCircle className="h-4 w-4 text-blue-500 mx-auto" />
                          ) : (
                            <span className="text-xs text-slate-400">대기</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => removeImage(idx)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {(warningCount > 0 || lowDpiCount > 0) && (
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {warningCount > 0 && (
                      <p className="text-sm text-yellow-800">
                        <strong>{warningCount}개</strong> 이미지가 RGB 모드가 아닙니다.
                        인쇄용 이미지는 RGB 모드여야 합니다. 포토샵에서 이미지 모드를 RGB로 변환해주세요.
                      </p>
                    )}
                    {lowDpiCount > 0 && (
                      <p className="text-sm text-yellow-800">
                        <strong>{lowDpiCount}개</strong> 이미지가 200 DPI 미만입니다.
                        인쇄 품질을 위해 최소 300 DPI를 권장합니다.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-3">
            <Button
              size="lg"
              onClick={handleRotateAll}
              disabled={processingAll || images.length === 0}
            >
              <RotateCw className={`h-4 w-4 mr-2 ${processingAll ? 'animate-spin' : ''}`} />
              {processingAll ? '처리 중...' : `전체 회전 (${landscapeCount}개 회전 + ${portraitCount}개 유지)`}
            </Button>
            {processedCount > 0 && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleSaveAll}
              >
                <Download className="h-4 w-4 mr-2" />
                전체 저장 ({processedCount}개)
              </Button>
            )}
          </div>
        </>
      )}

      <ToolUsageCounter toolId="image-rotate" onTrackUse={(fn) => { trackUseRef.current = fn; }} />
    </div>
  );
}

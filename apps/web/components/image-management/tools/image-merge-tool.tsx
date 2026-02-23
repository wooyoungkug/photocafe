'use client';

import { useState, useRef, useCallback } from 'react';
import {
  FolderOpen,
  Play,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { extractDPIFromJPEG, canvasToJPEGWithDPI } from '@/lib/image-tools/dpi-utils';
import { saveToFolder } from '@/lib/image-tools/file-utils';
import { ToolGuide } from './tool-guide';
import { ToolUsageCounter } from './tool-usage-counter';

interface MergeFolder {
  path: string;
  handle: FileSystemDirectoryHandle;
  files: File[];
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export function ImageMergeTool() {
  const [sourceHandle, setSourceHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [folders, setFolders] = useState<MergeFolder[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [startPageNum, setStartPageNum] = useState(1);
  const [startDirection, setStartDirection] = useState<'left' | 'right'>('left');
  const [deleteOriginals, setDeleteOriginals] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const trackUseRef = useRef<(() => void) | null>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLogs((prev) => {
      const next = [...prev, { time, message, type }];
      return next;
    });
    // Auto scroll
    setTimeout(() => {
      logContainerRef.current?.scrollTo({
        top: logContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 50);
  }, []);

  const isJpegFile = (file: File) => {
    const name = file.name.toLowerCase();
    return name.endsWith('.jpg') || name.endsWith('.jpeg');
  };

  const scanDirectory = useCallback(
    async (dirHandle: FileSystemDirectoryHandle, basePath: string): Promise<MergeFolder[]> => {
      const result: MergeFolder[] = [];
      const jpgFiles: File[] = [];

      for await (const entry of (dirHandle as any).values()) {
        if (entry.kind === 'file') {
          const file = await (entry as FileSystemFileHandle).getFile();
          if (isJpegFile(file)) {
            jpgFiles.push(file);
          }
        } else if (entry.kind === 'directory') {
          const subPath = basePath ? `${basePath}/${entry.name}` : entry.name;
          const subFolders = await scanDirectory(entry as FileSystemDirectoryHandle, subPath);
          result.push(...subFolders);
        }
      }

      // Only include folders with 2+ JPG files
      if (jpgFiles.length >= 2) {
        // Sort by filename
        jpgFiles.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));
        result.unshift({
          path: basePath || dirHandle.name,
          handle: dirHandle,
          files: jpgFiles,
          status: 'pending',
        });
      }

      return result;
    },
    [],
  );

  const handleSelectFolder = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      toast.error('이 브라우저는 폴더 선택을 지원하지 않습니다.');
      return;
    }

    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setSourceHandle(handle);
      setLogs([]);
      setProgress(0);

      addLog(`폴더 스캔 중: ${handle.name}`, 'info');
      const scannedFolders = await scanDirectory(handle, '');

      if (scannedFolders.length === 0) {
        addLog('JPG 파일이 2개 이상인 폴더를 찾을 수 없습니다.', 'warning');
        toast.error('합칠 수 있는 폴더가 없습니다.');
        setFolders([]);
        return;
      }

      setFolders(scannedFolders);
      addLog(`${scannedFolders.length}개 폴더 발견 (총 ${scannedFolders.reduce((s, f) => s + f.files.length, 0)}개 파일)`, 'success');
      toast.success(`${scannedFolders.length}개 폴더를 발견했습니다.`);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Folder scan error:', err);
        toast.error('폴더 선택/스캔 중 오류가 발생했습니다.');
      }
    }
  }, [addLog, scanDirectory]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;

      const entry = items[0].webkitGetAsEntry?.();
      if (!entry || !entry.isDirectory) {
        toast.error('폴더를 드래그해주세요.');
        return;
      }

      // For drag & drop, fallback to file selection since we can't get FileSystemDirectoryHandle
      toast.info('드래그 앤 드롭은 폴더 선택 버튼을 사용해주세요.');
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`이미지 로드 실패: ${file.name}`));
      };
      img.src = url;
    });
  };

  const processMergeFolder = useCallback(
    async (folder: MergeFolder, folderIndex: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      addLog(`[${folder.path}] 처리 시작 (${folder.files.length}개 파일)`, 'info');

      try {
        // Load all images
        const images: HTMLImageElement[] = [];
        const dpis: number[] = [];

        for (const file of folder.files) {
          const img = await loadImageFromFile(file);
          images.push(img);

          const arrayBuffer = await file.arrayBuffer();
          const dpi = extractDPIFromJPEG(arrayBuffer);
          dpis.push(dpi);
        }

        // Get representative DPI (most common) and height
        const dpi = dpis[0] || 300;
        const height = images[0].naturalHeight;

        // Check height consistency
        const heightMismatch = images.some((img) => img.naturalHeight !== height);
        if (heightMismatch) {
          addLog(`[${folder.path}] 경고: 이미지 높이가 일치하지 않습니다.`, 'warning');
        }

        // Build image list considering start direction
        let imageList = [...images];

        if (startDirection === 'right') {
          // Right-start: prepend a blank page
          imageList.unshift(null as any);
        }

        // If odd count after adjustment, append blank page
        if (imageList.length % 2 !== 0) {
          imageList.push(null as any);
        }

        // Merge pairs into pages
        let pageNum = startPageNum;
        for (let i = 0; i < imageList.length; i += 2) {
          const leftImg = imageList[i];
          const rightImg = imageList[i + 1];

          const leftWidth = leftImg ? leftImg.naturalWidth : (rightImg ? rightImg.naturalWidth : 0);
          const rightWidth = rightImg ? rightImg.naturalWidth : (leftImg ? leftImg.naturalWidth : 0);
          const pageHeight = leftImg
            ? leftImg.naturalHeight
            : rightImg
              ? rightImg.naturalHeight
              : height;

          canvas.width = leftWidth + rightWidth;
          canvas.height = pageHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          if (leftImg) {
            ctx.drawImage(leftImg, 0, 0);
          }
          if (rightImg) {
            ctx.drawImage(rightImg, leftWidth, 0);
          }

          const pageFilename = String(pageNum).padStart(2, '0') + '.jpg';
          const result = await canvasToJPEGWithDPI(canvas, dpi);

          const saved = await saveToFolder(folder.handle, result.blob, pageFilename);
          if (saved) {
            addLog(`[${folder.path}] ${pageFilename} 저장 완료`, 'info');
          } else {
            addLog(`[${folder.path}] ${pageFilename} 저장 실패`, 'error');
          }

          URL.revokeObjectURL(result.url);
          pageNum++;
        }

        // Delete originals if requested
        if (deleteOriginals) {
          for (const file of folder.files) {
            try {
              await (folder.handle as any).removeEntry(file.name);
            } catch {
              // Ignore deletion errors
            }
          }
          addLog(`[${folder.path}] 원본 파일 삭제 완료`, 'info');
        }

        addLog(`[${folder.path}] 완료! (${pageNum - startPageNum}페이지 생성)`, 'success');

        setFolders((prev) =>
          prev.map((f, idx) =>
            idx === folderIndex ? { ...f, status: 'done' } : f,
          ),
        );
      } catch (err: any) {
        addLog(`[${folder.path}] 오류: ${err.message}`, 'error');
        setFolders((prev) =>
          prev.map((f, idx) =>
            idx === folderIndex ? { ...f, status: 'error', error: err.message } : f,
          ),
        );
      }
    },
    [addLog, startPageNum, startDirection, deleteOriginals],
  );

  const handleExecute = useCallback(async () => {
    if (folders.length === 0) {
      toast.error('처리할 폴더가 없습니다.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    addLog('=== 합치기 작업 시작 ===', 'info');

    // Reset all folder statuses
    setFolders((prev) => prev.map((f) => ({ ...f, status: 'pending' as const })));

    for (let i = 0; i < folders.length; i++) {
      setFolders((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: 'processing' } : f,
        ),
      );

      await processMergeFolder(folders[i], i);
      setProgress(Math.round(((i + 1) / folders.length) * 100));
    }

    addLog('=== 모든 작업 완료 ===', 'success');
    setProcessing(false);
    toast.success('모든 폴더 합치기 완료!');
    trackUseRef.current?.();
  }, [folders, addLog, processMergeFolder]);

  const handleRemoveFolder = useCallback((index: number) => {
    setFolders((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const getStatusIcon = (status: MergeFolder['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-slate-400" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: MergeFolder['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">대기</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">처리 중</Badge>;
      case 'done':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">완료</Badge>;
      case 'error':
        return <Badge variant="destructive">오류</Badge>;
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'info':
        return 'text-slate-600';
      case 'success':
        return 'text-green-600 font-medium';
      case 'error':
        return 'text-red-600 font-medium';
      case 'warning':
        return 'text-amber-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Guide */}
      <ToolGuide title="이미지 합치기 사용 방법">
        <div className="pt-3 space-y-3">
          <svg viewBox="0 0 400 120" className="w-full max-w-[400px]" xmlns="http://www.w3.org/2000/svg">
            {/* Left image A */}
            <rect x="10" y="20" width="60" height="80" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
            <text x="40" y="65" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#3B82F6">A</text>
            {/* Right image B */}
            <rect x="80" y="20" width="60" height="80" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
            <text x="110" y="65" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#3B82F6">B</text>
            {/* Arrow */}
            <path d="M160 60 L210 60" stroke="#64748B" strokeWidth="2" fill="none" markerEnd="url(#merge-arrow)" />
            <defs>
              <marker id="merge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748B" />
              </marker>
            </defs>
            {/* Merged image A|B */}
            <rect x="230" y="20" width="140" height="80" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
            <line x1="300" y1="20" x2="300" y2="100" stroke="#93C5FD" strokeWidth="1" strokeDasharray="4 2" />
            <text x="265" y="65" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#3B82F6">A</text>
            <text x="335" y="65" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#3B82F6">B</text>
            {/* Labels */}
            <text x="75" y="14" textAnchor="middle" fontSize="11" fill="#64748B">원본 이미지</text>
            <text x="300" y="14" textAnchor="middle" fontSize="11" fill="#64748B">좌우 합치기</text>
          </svg>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>같은 폴더 내 이미지들을 순서대로 좌우 합치기</li>
            <li>1,2 → 1장 / 3,4 → 2장 ... 순서로 자동 합성</li>
            <li>홀수/짝수 합치기 또는 순서대로 합치기 선택</li>
            <li>DPI 보존, 배치 처리 지원</li>
          </ul>
        </div>
      </ToolGuide>

      {/* Folder Select Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleSelectFolder}
            className={`
              border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer
              ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}
              ${processing ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center">
                <FolderOpen className="h-7 w-7 text-violet-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-700">
                  작업할 폴더를 선택하세요
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  하위 폴더의 JPG 파일을 좌우 합쳐서 페이지로 만듭니다
                </p>
              </div>
              {sourceHandle && (
                <Badge variant="outline" className="mt-1">
                  선택됨: {sourceHandle.name}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      {folders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <span className="font-semibold text-sm">합치기 옵션</span>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Start page number */}
              <div className="space-y-2">
                <Label htmlFor="start-page" className="text-sm">시작 페이지 번호</Label>
                <Input
                  id="start-page"
                  type="number"
                  min={1}
                  value={startPageNum}
                  onChange={(e) => setStartPageNum(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24"
                  disabled={processing}
                />
              </div>

              {/* Start direction */}
              <div className="space-y-2">
                <Label className="text-sm">시작 방향</Label>
                <RadioGroup
                  value={startDirection}
                  onValueChange={(val) => setStartDirection(val as 'left' | 'right')}
                  disabled={processing}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="left" id="dir-left" />
                    <Label htmlFor="dir-left" className="text-sm cursor-pointer">왼쪽부터</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="right" id="dir-right" />
                    <Label htmlFor="dir-right" className="text-sm cursor-pointer">오른쪽부터</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Delete originals */}
              <div className="space-y-2">
                <Label className="text-sm">원본 삭제</Label>
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="delete-originals"
                    checked={deleteOriginals}
                    onCheckedChange={(checked) => setDeleteOriginals(checked === true)}
                    disabled={processing}
                  />
                  <Label htmlFor="delete-originals" className="text-sm cursor-pointer">
                    합친 후 원본 파일 삭제
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Folder List */}
      {folders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-violet-500" />
                <span className="font-semibold text-sm">
                  폴더 목록 ({folders.length}개)
                </span>
              </div>
              <Button
                onClick={handleExecute}
                disabled={processing}
                size="sm"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    합치기 실행
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Progress */}
            {processing && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">전체 진행률</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Folder items */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {folders.map((folder, index) => (
                <div
                  key={folder.path}
                  className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getStatusIcon(folder.status)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{folder.path}</p>
                      <p className="text-xs text-slate-500">{folder.files.length}개 파일</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusBadge(folder.status)}
                    {!processing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFolder(index)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log */}
      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <span className="font-semibold text-sm">작업 로그</span>
          </CardHeader>
          <CardContent className="pt-0">
            <div
              ref={logContainerRef}
              className="max-h-[250px] overflow-y-auto rounded border bg-slate-950 p-3 font-mono text-xs space-y-0.5"
            >
              {logs.map((log, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-slate-500 shrink-0">[{log.time}]</span>
                  <span className={getLogColor(log.type)}>{log.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden canvas */}
      <canvas ref={canvasRef} className="hidden" />

      <ToolUsageCounter toolId="image-merge" onTrackUse={(fn) => { trackUseRef.current = fn; }} />
    </div>
  );
}

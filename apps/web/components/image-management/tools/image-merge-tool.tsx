'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  FolderOpen,
  FolderDown,
  Play,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Layers,
  ChevronDown,
  ImageIcon,
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

interface ImageInfo {
  url: string;
  width: number;
  height: number;
  dpi: number;
  fileName: string;
  fileSize: number;
}

interface MergeFolder {
  path: string;
  handle: FileSystemDirectoryHandle;
  files: File[];
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
  originals: ImageInfo[];
  results: ImageInfo[];
}

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

/** 썸네일 이미지 + 규격/해상도 오버레이 */
function ImageThumbnail({ info, wide }: { info: ImageInfo; wide?: boolean }) {
  return (
    <div className="flex flex-col items-center shrink-0">
      <div
        className={`relative border rounded overflow-hidden bg-gray-50 ${
          wide ? 'w-[160px] h-[60px]' : 'w-[100px] h-[75px]'
        }`}
      >
        {info.url ? (
          <img
            src={info.url}
            alt={info.fileName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
        {/* 규격/해상도 오버레이 */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/65 text-white px-1 py-[2px] text-center leading-tight">
          <div className="text-[9px] font-medium">{info.width}×{info.height}</div>
          <div className="text-[8px] opacity-80">{info.dpi}dpi · {formatFileSize(info.fileSize)}</div>
        </div>
      </div>
      <p className={`text-[9px] text-slate-500 mt-0.5 truncate text-center ${wide ? 'max-w-[160px]' : 'max-w-[100px]'}`}>
        {info.fileName}
      </p>
    </div>
  );
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
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const trackUseRef = useRef<(() => void) | null>(null);

  // Object URL 정리
  useEffect(() => {
    return () => {
      folders.forEach((folder) => {
        folder.originals.forEach((info) => {
          if (info.url) URL.revokeObjectURL(info.url);
        });
        folder.results.forEach((info) => {
          if (info.url) URL.revokeObjectURL(info.url);
        });
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLogs((prev) => [...prev, { time, message, type }]);
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

  /** 파일에서 이미지 정보 로드 (썸네일 URL, 크기, DPI) */
  const loadImageInfo = useCallback(async (file: File): Promise<ImageInfo> => {
    const url = URL.createObjectURL(file);
    let dpi = 300;
    try {
      const arrayBuffer = await file.arrayBuffer();
      dpi = extractDPIFromJPEG(arrayBuffer);
    } catch {
      // DPI 추출 실패 시 기본값 사용
    }

    return new Promise<ImageInfo>((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          url,
          width: img.naturalWidth,
          height: img.naturalHeight,
          dpi,
          fileName: file.name,
          fileSize: file.size,
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          url: '',
          width: 0,
          height: 0,
          dpi: 300,
          fileName: file.name,
          fileSize: file.size,
        });
      };
      img.src = url;
    });
  }, []);

  /** 폴더별 원본 이미지 썸네일 로드 */
  const loadFolderOriginals = useCallback(
    async (scannedFolders: MergeFolder[]) => {
      setLoadingThumbnails(true);
      for (let fi = 0; fi < scannedFolders.length; fi++) {
        const folder = scannedFolders[fi];
        const infos = await Promise.all(folder.files.map((file) => loadImageInfo(file)));
        setFolders((prev) =>
          prev.map((f, idx) => (idx === fi ? { ...f, originals: infos } : f)),
        );
      }
      setLoadingThumbnails(false);
    },
    [loadImageInfo],
  );

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

      if (jpgFiles.length >= 2) {
        jpgFiles.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));
        result.unshift({
          path: basePath || dirHandle.name,
          handle: dirHandle,
          files: jpgFiles,
          status: 'pending',
          originals: [],
          results: [],
        });
      }

      return result;
    },
    [],
  );

  const processDirectoryHandle = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      // 기존 URL 정리
      folders.forEach((folder) => {
        folder.originals.forEach((info) => { if (info.url) URL.revokeObjectURL(info.url); });
        folder.results.forEach((info) => { if (info.url) URL.revokeObjectURL(info.url); });
      });

      setSourceHandle(handle);
      setLogs([]);
      setProgress(0);
      setExpandedFolders(new Set());

      addLog(`폴더 스캔 중: ${handle.name}`, 'info');
      const scannedFolders = await scanDirectory(handle, '');

      if (scannedFolders.length === 0) {
        addLog('JPG 파일이 2개 이상인 폴더를 찾을 수 없습니다.', 'warning');
        toast.error('합칠 수 있는 폴더가 없습니다.');
        setFolders([]);
        return;
      }

      setFolders(scannedFolders);
      addLog(
        `${scannedFolders.length}개 폴더 발견 (총 ${scannedFolders.reduce((s, f) => s + f.files.length, 0)}개 파일)`,
        'success',
      );
      toast.success(`${scannedFolders.length}개 폴더를 발견했습니다.`);

      // 백그라운드에서 원본 썸네일 로드
      loadFolderOriginals(scannedFolders);

      // 첫 번째 폴더 자동 펼치기
      setExpandedFolders(new Set([0]));
    },
    [addLog, scanDirectory, loadFolderOriginals, folders],
  );

  const handleSelectFolder = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      toast.error('이 브라우저는 폴더 선택을 지원하지 않습니다.');
      return;
    }

    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      await processDirectoryHandle(handle);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Folder scan error:', err);
        toast.error('폴더 선택/스캔 중 오류가 발생했습니다.');
      }
    }
  }, [processDirectoryHandle]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;

      const item = items[0];
      if ('getAsFileSystemHandle' in item) {
        try {
          const handle = await (item as any).getAsFileSystemHandle();
          if (handle?.kind === 'directory') {
            const dirHandle = handle as FileSystemDirectoryHandle;
            const permission = await (dirHandle as any).requestPermission({ mode: 'readwrite' });
            if (permission !== 'granted') {
              toast.error('폴더 쓰기 권한이 필요합니다. 권한을 허용해주세요.');
              return;
            }
            await processDirectoryHandle(dirHandle);
            return;
          }
          toast.error('폴더를 드래그해주세요. (파일이 아닌 폴더)');
          return;
        } catch (err: any) {
          console.error('Drop handle error:', err);
        }
      }

      const entry = items[0].webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        toast.info('이 브라우저에서는 폴더 선택 버튼을 클릭하여 선택해주세요.');
      } else {
        toast.error('폴더를 드래그해주세요.');
      }
    },
    [processDirectoryHandle],
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
        const images: HTMLImageElement[] = [];
        const dpis: number[] = [];

        for (const file of folder.files) {
          const img = await loadImageFromFile(file);
          images.push(img);

          const arrayBuffer = await file.arrayBuffer();
          const dpi = extractDPIFromJPEG(arrayBuffer);
          dpis.push(dpi);
        }

        const dpi = dpis[0] || 300;
        const height = images[0].naturalHeight;

        const heightMismatch = images.some((img) => img.naturalHeight !== height);
        if (heightMismatch) {
          addLog(`[${folder.path}] 경고: 이미지 높이가 일치하지 않습니다.`, 'warning');
        }

        let imageList = [...images];

        if (startDirection === 'right') {
          imageList.unshift(null as any);
          addLog(`[${folder.path}] 오른쪽 시작: 첫 페이지 왼쪽에 빈 페이지(흰색) 추가`, 'info');
        }

        if (imageList.length % 2 !== 0) {
          imageList.push(null as any);
          addLog(`[${folder.path}] 마지막 페이지 오른쪽에 빈 페이지(흰색) 추가`, 'info');
        }

        const pageResults: ImageInfo[] = [];
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

          // 합친 결과 썸네일 저장 (URL 유지)
          pageResults.push({
            url: result.url,
            width: canvas.width,
            height: canvas.height,
            dpi,
            fileName: pageFilename,
            fileSize: result.blob.size,
          });

          pageNum++;
        }

        // 원본 삭제
        if (deleteOriginals) {
          for (const file of folder.files) {
            try {
              await (folder.handle as any).removeEntry(file.name);
            } catch {
              // 삭제 오류 무시
            }
          }
          addLog(`[${folder.path}] 원본 파일 삭제 완료`, 'info');
        }

        addLog(`[${folder.path}] 완료! (${pageNum - startPageNum}페이지 생성)`, 'success');

        setFolders((prev) =>
          prev.map((f, idx) =>
            idx === folderIndex ? { ...f, status: 'done', results: pageResults } : f,
          ),
        );

        // 처리 완료된 폴더 자동 펼치기
        setExpandedFolders((prev) => new Set([...prev, folderIndex]));
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

    // 이전 결과 URL 정리
    folders.forEach((folder) => {
      folder.results.forEach((info) => { if (info.url) URL.revokeObjectURL(info.url); });
    });

    setFolders((prev) => prev.map((f) => ({ ...f, status: 'pending' as const, results: [] })));

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
    setFolders((prev) => {
      const folder = prev[index];
      folder.originals.forEach((info) => { if (info.url) URL.revokeObjectURL(info.url); });
      folder.results.forEach((info) => { if (info.url) URL.revokeObjectURL(info.url); });
      return prev.filter((_, i) => i !== index);
    });
    setExpandedFolders((prev) => {
      const next = new Set<number>();
      prev.forEach((v) => {
        if (v < index) next.add(v);
        else if (v > index) next.add(v - 1);
      });
      return next;
    });
  }, []);

  const toggleFolder = useCallback((index: number) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
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
        <div className="pt-3 space-y-4">
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

          {/* Start direction examples */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border space-y-1.5">
              <p className="text-xs font-medium text-slate-700">왼쪽 시작 (기본)</p>
              <div className="flex items-center gap-1">
                <div className="flex border rounded overflow-hidden">
                  <span className="px-2.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold border-r border-dashed border-blue-200">A</span>
                  <span className="px-2.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold">B</span>
                </div>
                <div className="flex border rounded overflow-hidden">
                  <span className="px-2.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold border-r border-dashed border-blue-200">C</span>
                  <span className="px-2.5 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold border-dashed">빈</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">A,B,C 3장 → [A|B] [C|빈] (홀수 시 끝에 빈 페이지)</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border space-y-1.5">
              <p className="text-xs font-medium text-slate-700">오른쪽 시작</p>
              <div className="flex items-center gap-1">
                <div className="flex border rounded overflow-hidden">
                  <span className="px-2.5 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold border-r border-dashed border-slate-300">빈</span>
                  <span className="px-2.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold">A</span>
                </div>
                <div className="flex border rounded overflow-hidden">
                  <span className="px-2.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold border-r border-dashed border-blue-200">B</span>
                  <span className="px-2.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold">C</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">A,B,C 3장 → [빈|A] [B|C] (첫 페이지 왼쪽에 빈 페이지)</p>
              <div className="flex items-center gap-1 mt-1">
                <div className="flex border rounded overflow-hidden">
                  <span className="px-2.5 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold border-r border-dashed border-slate-300">빈</span>
                  <span className="px-2.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold">A</span>
                </div>
                <div className="flex border rounded overflow-hidden">
                  <span className="px-2.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold border-r border-dashed border-blue-200">B</span>
                  <span className="px-2.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold">C</span>
                </div>
                <div className="flex border rounded overflow-hidden">
                  <span className="px-2.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold border-r border-dashed border-blue-200">D</span>
                  <span className="px-2.5 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold border-dashed">빈</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">A~D 4장 → [빈|A] [B|C] [D|빈] (앞뒤 빈 페이지 자동 추가)</p>
            </div>
          </div>

          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>같은 폴더 내 이미지들을 순서대로 좌우 합치기</li>
            <li>1,2 → 1장 / 3,4 → 2장 ... 순서로 자동 합성</li>
            <li>왼쪽 시작 / 오른쪽 시작 선택 (빈 페이지 자동 추가)</li>
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
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isDragOver ? 'bg-blue-100' : 'bg-violet-100'}`}>
                {isDragOver
                  ? <FolderDown className="h-7 w-7 text-blue-600 animate-bounce" />
                  : <FolderOpen className="h-7 w-7 text-violet-600" />
                }
              </div>
              <div>
                <p className="text-base font-semibold text-slate-700">
                  {isDragOver ? '여기에 폴더를 놓으세요' : '폴더를 드래그하거나 클릭하여 선택'}
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
                    <Label htmlFor="dir-left" className="cursor-pointer">
                      <span className="text-sm">왼쪽 시작</span>
                      <span className="text-[10px] text-slate-500 block">첫 이미지 왼쪽 배치</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="right" id="dir-right" />
                    <Label htmlFor="dir-right" className="cursor-pointer">
                      <span className="text-sm">오른쪽 시작</span>
                      <span className="text-[10px] text-slate-500 block">첫 이미지 오른쪽 배치 (왼쪽 빈 페이지)</span>
                    </Label>
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

      {/* Folder List with Thumbnails */}
      {folders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-violet-500" />
                <span className="font-semibold text-sm">
                  폴더 목록 ({folders.length}개)
                </span>
                {loadingThumbnails && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    썸네일 로딩...
                  </span>
                )}
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
            <div className="space-y-2">
              {folders.map((folder, index) => {
                const isExpanded = expandedFolders.has(index);
                const hasOriginals = folder.originals.length > 0;
                const hasResults = folder.results.length > 0;

                return (
                  <div
                    key={folder.path}
                    className="border rounded-lg bg-slate-50 overflow-hidden"
                  >
                    {/* 폴더 헤더 */}
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleFolder(index)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${
                            isExpanded ? '' : '-rotate-90'
                          }`}
                        />
                        {getStatusIcon(folder.status)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{folder.path}</p>
                          <p className="text-xs text-slate-500">
                            {folder.files.length}개 파일
                            {hasResults && ` → ${folder.results.length}페이지 생성`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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

                    {/* 펼침 영역: 원본 + 결과 썸네일 */}
                    {isExpanded && (
                      <div className="border-t bg-white px-3 py-3 space-y-4">
                        {/* 원본 이미지 썸네일 */}
                        {hasOriginals && (
                          <div>
                            <p className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
                              <ImageIcon className="h-3.5 w-3.5" />
                              업로드 원본 ({folder.originals.length}개)
                            </p>
                            <div className="flex flex-wrap gap-2 max-h-[280px] overflow-y-auto">
                              {folder.originals.map((info, i) => (
                                <ImageThumbnail key={i} info={info} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 로딩 중 */}
                        {!hasOriginals && loadingThumbnails && (
                          <div className="flex items-center justify-center py-4 text-xs text-slate-400">
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            이미지 정보 로딩 중...
                          </div>
                        )}

                        {/* 합친 결과 썸네일 */}
                        {hasResults && (
                          <div>
                            <p className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              합친 결과 ({folder.results.length}페이지)
                            </p>
                            <div className="flex flex-wrap gap-2 max-h-[280px] overflow-y-auto">
                              {folder.results.map((info, i) => (
                                <ImageThumbnail key={i} info={info} wide />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 아직 처리 전이고 썸네일도 없을 때 */}
                        {!hasOriginals && !hasResults && !loadingThumbnails && (
                          <p className="text-xs text-slate-400 text-center py-2">
                            이미지 정보가 없습니다.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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

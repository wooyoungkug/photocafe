'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Scissors, Download, Info, Eye, FolderOpen, CheckCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { extractDPIFromJPEG, canvasToJPEGWithDPI } from '@/lib/image-tools/dpi-utils';
import { saveToFolder, isJpegOrPng } from '@/lib/image-tools/file-utils';
import {
  saveFolderHandle,
  getFolderHandle,
  clearFolderHandle,
  queryHandlePermission,
  requestHandlePermission,
  addFolderHandleToCache,
  findFolderForFile,
  getAllFolderHandles,
  clearAllFolderHandles,
} from '@/lib/image-tools/folder-handle-store';
import { ToolGuide } from './tool-guide';
import { ToolUsageCounter } from './tool-usage-counter';
import { formatThumbFileLabel } from '@/lib/format-thumb-file-label';

const STORAGE_KEY = 'album-split-folder';

// 출력 파일명 패턴 (자동저장 결과물은 목록에서 제외)
const OUTPUT_FILE_PATTERN = /^(첫장|막장|.*_첫장|.*_막장)\.(jpe?g|png)$/i;

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
  const [deleteOriginalOnSave, setDeleteOriginalOnSave] = useState(false);
  const [originalDeleted, setOriginalDeleted] = useState(false);

  // 연속 작업용: 폴더 내 파일 목록 및 현재 인덱스
  const [folderFiles, setFolderFiles] = useState<{ name: string; handle: FileSystemFileHandle }[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  const uploadZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const trackUseRef = useRef<(() => void) | null>(null);
  const resultCardRef = useRef<HTMLDivElement>(null);
  const sourceFileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const sourceDirectoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  // 마운트 시 저장된 폴더 핸들 복원 (사용자 제스처 없이도 'granted' 상태면 즉시 사용)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getFolderHandle(STORAGE_KEY);
      if (!cached || cancelled) return;
      const perm = await queryHandlePermission(cached);
      if (perm === 'granted' && !cancelled) {
        setDirectoryHandle(cached);
      }
      // 'prompt' 상태는 사용자 제스처가 필요하므로 handleClickUpload 에서 처리
    })();
    return () => { cancelled = true; };
  }, []);

  // directoryHandle 이 새로 설정될 때마다 IDB 에 동기화
  useEffect(() => {
    if (directoryHandle) {
      saveFolderHandle(STORAGE_KEY, directoryHandle).catch(() => {});
    }
  }, [directoryHandle]);

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

  const resetTool = useCallback((keepFolder = true) => {
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
    setOriginalDeleted(false);
    sourceFileHandleRef.current = null;
    if (!keepFolder) {
      setDeleteOriginalOnSave(false);
      setDirectoryHandle(null);
      setFolderFiles([]);
      setCurrentFileIndex(0);
      sourceDirectoryHandleRef.current = null;
    }
    // 업로드 영역으로 스크롤
    uploadZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [cleanup]);

  /** 폴더 내 이미지 파일 목록 스캔 (출력 결과물 제외) */
  const scanFolderFiles = useCallback(async (dirHandle: FileSystemDirectoryHandle) => {
    const files: { name: string; handle: FileSystemFileHandle }[] = [];
    for await (const [name, handle] of (dirHandle as any).entries()) {
      if (handle.kind === 'file' && /\.(jpe?g|png)$/i.test(name) && !OUTPUT_FILE_PATTERN.test(name)) {
        files.push({ name, handle: handle as FileSystemFileHandle });
      }
    }
    files.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));
    return files;
  }, []);

  /** 폴더에서 특정 인덱스의 파일 로드 */
  const loadFileAtIndex = useCallback(async (
    files: { name: string; handle: FileSystemFileHandle }[],
    index: number
  ) => {
    if (index < 0 || index >= files.length) return false;
    const entry = files[index];
    sourceFileHandleRef.current = entry.handle;
    const file = await entry.handle.getFile();
    setCurrentFileIndex(index);
    // loadImage 로직 인라인 (순환 참조 방지)
    cleanup();
    setShowResult(false);
    setShowPreview(false);
    setShowInfo(false);
    setOriginalImage(null);
    setLeftBlob(null);
    setRightBlob(null);
    setLeftUrl('');
    setRightUrl('');
    setSavedLeft(false);
    setSavedRight(false);
    setOriginalDeleted(false);

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
    return true;
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
    if ('showDirectoryPicker' in window) {
      try {
        // 이미 폴더가 선택되어 있고 파일 목록이 있으면 다음 파일 로드
        if (directoryHandle && folderFiles.length > 0) {
          const nextIndex = currentFileIndex + 1;
          if (nextIndex < folderFiles.length) {
            const loaded = await loadFileAtIndex(folderFiles, nextIndex);
            if (loaded) {
              toast.success(`${folderFiles[nextIndex].name} (${nextIndex + 1}/${folderFiles.length})`);
              return;
            }
          } else {
            toast.success('모든 파일 처리 완료!');
            resetTool(false);
            return;
          }
        }

        // 캐시된 폴더가 있으면 권한만 재요청 → 다이얼로그 없이 즉시 사용 (최근 사용 폴더 우선)
        let dirHandle: FileSystemDirectoryHandle | null = null;
        if (!directoryHandle) {
          const cached = await getFolderHandle(STORAGE_KEY);
          if (cached) {
            const perm = await requestHandlePermission(cached);
            if (perm === 'granted') {
              dirHandle = cached;
              setDirectoryHandle(cached);
            }
          }
        }

        // 캐시가 없거나 권한 거부 시 폴더 선택 다이얼로그
        if (!dirHandle) {
          const options: any = { mode: 'readwrite' };
          if (directoryHandle) options.startIn = directoryHandle;
          dirHandle = await (window as any).showDirectoryPicker(options);
          setDirectoryHandle(dirHandle);
          await saveFolderHandle(STORAGE_KEY, dirHandle!);
          await addFolderHandleToCache(dirHandle!);
        }

        // 폴더 내 이미지 파일 목록 (출력 결과물 제외)
        const files = await scanFolderFiles(dirHandle!);
        if (files.length === 0) {
          toast.error('폴더에 JPEG/PNG 파일이 없습니다.');
          return;
        }
        setFolderFiles(files);
        setCurrentFileIndex(0);

        // 첫 번째 파일 로드
        const firstFile = files[0];
        sourceFileHandleRef.current = firstFile.handle;
        const file = await firstFile.handle.getFile();
        loadImage(file);
        toast.success(`폴더: ${dirHandle!.name} (${files.length}개 이미지) → 자동 저장 활성화`);
      } catch { /* 사용자가 취소 */ }
    } else if ('showOpenFilePicker' in window) {
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
  }, [loadImage, directoryHandle, folderFiles, currentFileIndex, loadFileAtIndex, scanFolderFiles, resetTool]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && isJpegOrPng(file)) {
      // 드래그된 파일 핸들 캡쳐
      const item = e.dataTransfer.items[0];
      let droppedFileHandle: FileSystemFileHandle | null = null;
      if (item && 'getAsFileSystemHandle' in item) {
        try {
          const handle = await (item as any).getAsFileSystemHandle();
          if (handle?.kind === 'file') {
            droppedFileHandle = handle as FileSystemFileHandle;
            sourceFileHandleRef.current = droppedFileHandle;
          }
        } catch { /* 핸들 획득 실패 - 무시 */ }
      }

      // 저장 폴더 결정: 캐시된 폴더 중 이 파일을 포함하는 폴더 자동 검색
      let saveFolder: FileSystemDirectoryHandle | null = null;
      if (droppedFileHandle) {
        const matched = await findFolderForFile(droppedFileHandle);
        if (matched) {
          const perm = await requestHandlePermission(matched);
          if (perm === 'granted') {
            saveFolder = matched;
            toast.success(`자동 매칭: ${matched.name} (저장 폴더)`);
          }
        }
      }

      // 매칭 폴더 없음 → 폴더 피커 1회 (소스 파일 위치에서 열림)
      if (!saveFolder && 'showDirectoryPicker' in window) {
        try {
          const options: any = { mode: 'readwrite' };
          if (droppedFileHandle) options.startIn = droppedFileHandle;
          saveFolder = await (window as any).showDirectoryPicker(options);
          if (saveFolder) {
            await addFolderHandleToCache(saveFolder);
            await saveFolderHandle(STORAGE_KEY, saveFolder); // 최근 사용도 갱신
            toast.success(`저장 폴더 등록: ${saveFolder.name} — 이 폴더의 파일은 다음부터 자동 저장됩니다.`);
          }
        } catch {
          toast.info('폴더를 선택하지 않아 저장 시 다이얼로그가 표시됩니다.', { duration: 5000 });
        }
      }

      if (saveFolder) setDirectoryHandle(saveFolder);

      loadImage(file);
    } else {
      toast.error('JPEG 또는 PNG 파일만 지원합니다.');
    }
  }, [loadImage, directoryHandle]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  /** 원본 파일 삭제 (확인 없이 즉시 실행) - 반환값: 성공 여부 */
  const doDeleteOriginal = useCallback(async (): Promise<boolean> => {
    if (!fileName) return false;

    // 1) FileSystemFileHandle.remove() 지원 브라우저 (Chrome 117+)
    if (sourceFileHandleRef.current && 'remove' in (sourceFileHandleRef.current as any)) {
      try {
        await (sourceFileHandleRef.current as any).remove();
        setOriginalDeleted(true);
        return true;
      } catch { /* 권한 없음 → 폴더 선택 방식으로 폴백 */ }
    }

    // 2) 폴더 선택 후 removeEntry
    if (!sourceDirectoryHandleRef.current) {
      if (!('showDirectoryPicker' in window)) return false;
      try {
        const options: any = { mode: 'readwrite' };
        if (sourceFileHandleRef.current) options.startIn = sourceFileHandleRef.current;
        sourceDirectoryHandleRef.current = await (window as any).showDirectoryPicker(options);
      } catch {
        return false; // 사용자 취소
      }
    }

    try {
      await (sourceDirectoryHandleRef.current as any).removeEntry(fileName);
      setOriginalDeleted(true);
      return true;
    } catch {
      toast.error('원본 삭제 실패: 해당 폴더에서 파일을 찾을 수 없습니다.');
      sourceDirectoryHandleRef.current = null;
      return false;
    }
  }, [fileName]);

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
      trackUseRef.current?.();

      // 자동 저장: directoryHandle이 있으면 즉시 저장
      if (directoryHandle) {
        // 파일명 기반 저장 (첫장.jpg, 막장.jpg)
        const leftName = `첫장.jpg`;
        const rightName = `막장.jpg`;

        const ok1 = await saveToFolder(directoryHandle, leftResult.blob, leftName);
        const ok2 = await saveToFolder(directoryHandle, rightResult.blob, rightName);
        if (ok1 && ok2) {
          let deleted = false;
          if (deleteOriginalOnSave) {
            deleted = await doDeleteOriginal();
          }

          // 다음 파일 자동 로드
          const nextIndex = currentFileIndex + 1;
          const hasNext = folderFiles.length > 0 && nextIndex < folderFiles.length;

          toast.success(
            deleteOriginalOnSave
              ? deleted
                ? `자동 저장 + 원본 삭제 완료!${hasNext ? ` (${nextIndex + 1}/${folderFiles.length} 로드 중...)` : ' 모든 파일 처리 완료!'}`
                : '자동 저장 완료! (원본 삭제 실패)'
              : `${leftName}, ${rightName} 자동 저장 완료!${hasNext ? ` (${nextIndex + 1}/${folderFiles.length} 로드 중...)` : ' 모든 파일 처리 완료!'}`,
          );

          if (hasNext) {
            // 폴더 파일 목록 재스캔 (삭제된 원본 제외)
            const updatedFiles = await scanFolderFiles(directoryHandle);
            setFolderFiles(updatedFiles);
            // 다음 미처리 파일 찾기 (현재 파일 이후의 파일)
            const currentName = fileName;
            const nextFileIdx = updatedFiles.findIndex(f => f.name.localeCompare(currentName, 'ko', { numeric: true }) > 0);
            if (nextFileIdx >= 0) {
              setTimeout(async () => {
                await loadFileAtIndex(updatedFiles, nextFileIdx);
                scrollToBottom();
              }, 800);
            } else {
              setTimeout(() => resetTool(true), 1500);
            }
          } else {
            setTimeout(() => resetTool(false), 1500);
          }
        } else {
          toast.error('자동 저장 실패 - 수동으로 저장해주세요.');
        }
      } else {
        toast.success('분리 완료! 결과를 확인하세요.');
      }
    } catch (err) {
      console.error('Split error:', err);
      toast.error('이미지 분리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  }, [originalImage, originalDPI, cleanup, directoryHandle, deleteOriginalOnSave, doDeleteOriginal, resetTool, fileName, folderFiles, currentFileIndex, scanFolderFiles, loadFileAtIndex, scrollToBottom]);

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
    const saveName = `첫장.jpg`;
    if (directoryHandle) {
      const ok = await saveToFolder(directoryHandle, leftBlob, saveName);
      if (ok) { toast.success(`${saveName} 저장 완료`); setSavedLeft(true); }
      else toast.error('저장 실패');
    } else {
      const ok = await saveWithPicker(leftBlob, saveName);
      if (ok) { toast.success(`${saveName} 저장 완료`); setSavedLeft(true); }
    }
  }, [leftBlob, directoryHandle, saveWithPicker]);

  const handleSaveRight = useCallback(async () => {
    if (!rightBlob) return;
    const saveName = `막장.jpg`;
    if (directoryHandle) {
      const ok = await saveToFolder(directoryHandle, rightBlob, saveName);
      if (ok) { toast.success(`${saveName} 저장 완료`); setSavedRight(true); }
      else toast.error('저장 실패');
    } else {
      const ok = await saveWithPicker(rightBlob, saveName);
      if (ok) { toast.success(`${saveName} 저장 완료`); setSavedRight(true); }
    }
  }, [rightBlob, directoryHandle, saveWithPicker]);

  const handleSaveBoth = useCallback(async () => {
    if (!leftBlob || !rightBlob) return;
    const leftName = `첫장.jpg`;
    const rightName = `막장.jpg`;

    let saved = false;
    if (directoryHandle) {
      const ok1 = await saveToFolder(directoryHandle, leftBlob, leftName);
      const ok2 = await saveToFolder(directoryHandle, rightBlob, rightName);
      if (ok1 && ok2) saved = true;
      else toast.error('일부 파일 저장 실패');
    } else {
      const ok1 = await saveWithPicker(leftBlob, leftName);
      if (!ok1) return; // 취소 시 중단
      const ok2 = await saveWithPicker(rightBlob, rightName);
      if (ok2) saved = true;
    }

    if (!saved) return;

    let deleted = false;
    if (deleteOriginalOnSave) {
      deleted = await doDeleteOriginal();
    }

    toast.success(
      deleteOriginalOnSave
        ? deleted ? '저장 + 원본 삭제 완료! 잠시 후 초기화됩니다.' : '저장 완료! (원본 삭제 실패) 잠시 후 초기화됩니다.'
        : '첫장 + 막장 저장 완료! 잠시 후 초기화됩니다.',
    );
    setTimeout(resetTool, 1500);
  }, [leftBlob, rightBlob, directoryHandle, resetTool, saveWithPicker, deleteOriginalOnSave, doDeleteOriginal, fileName]);

  // 첫장·막장 개별 저장이 모두 완료되면 자동 초기화
  useEffect(() => {
    if (savedLeft && savedRight) {
      toast.success('첫장 + 막장 모두 저장됐습니다! 잠시 후 초기화됩니다.');
      const timer = setTimeout(resetTool, 1500);
      return () => clearTimeout(timer);
    }
  }, [savedLeft, savedRight, resetTool]);

  // 자동 처리: 이미지 로드 시 자동으로 분리 실행 (항상 활성)
  const handleSplitRef = useRef<() => void>(() => {});
  const handleSaveBothRef = useRef<() => void>(() => {});
  useEffect(() => {
    handleSplitRef.current = handleSplit;
  }, [handleSplit]);
  useEffect(() => {
    handleSaveBothRef.current = handleSaveBoth;
  }, [handleSaveBoth]);

  // 같은 이미지에 split 이 중복 트리거되지 않도록 가드
  const autoSplitTriggeredForRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    if (
      originalImage &&
      showPreview &&
      !processing &&
      !showResult &&
      autoSplitTriggeredForRef.current !== originalImage
    ) {
      autoSplitTriggeredForRef.current = originalImage;
      const timer = setTimeout(() => {
        handleSplitRef.current();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [originalImage, showPreview, processing, showResult]);

  // 결과 표시 후 "첫장 + 막장 모두 저장" 버튼 자동 클릭
  // 폴더 핸들이 있으면 handleSplit 내부에서 이미 저장하므로 여기서는 발화 안 함
  const autoSavedForBlobRef = useRef<Blob | null>(null);
  useEffect(() => {
    if (
      showResult &&
      leftBlob &&
      rightBlob &&
      !processing &&
      !directoryHandle &&
      autoSavedForBlobRef.current !== leftBlob
    ) {
      autoSavedForBlobRef.current = leftBlob;
      const timer = setTimeout(() => {
        handleSaveBothRef.current();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [showResult, leftBlob, rightBlob, processing, directoryHandle]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 캐시된 폴더 개수 표시용
  const [cachedFolderCount, setCachedFolderCount] = useState(0);
  const refreshFolderCount = useCallback(async () => {
    const all = await getAllFolderHandles();
    setCachedFolderCount(all.length);
  }, []);
  useEffect(() => { refreshFolderCount(); }, [refreshFolderCount, directoryHandle]);

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
          {/* 저장 폴더 / 옵션 */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <FolderOpen className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-800">현재 폴더:</span>
              <span className="text-slate-700">
                {directoryHandle ? directoryHandle.name : '없음 (업로드 시 자동 요청)'}
              </span>
              {cachedFolderCount > 0 && (
                <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                  기억된 폴더 {cachedFolderCount}개
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-blue-700 hover:bg-blue-100"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!('showDirectoryPicker' in window)) {
                    toast.error('이 브라우저는 폴더 자동저장을 지원하지 않습니다. Chrome 또는 Edge를 사용하세요.');
                    return;
                  }
                  try {
                    const options: any = { mode: 'readwrite' };
                    if (sourceFileHandleRef.current) options.startIn = sourceFileHandleRef.current;
                    else if (directoryHandle) options.startIn = directoryHandle;
                    const handle = await (window as any).showDirectoryPicker(options);
                    setDirectoryHandle(handle);
                    await saveFolderHandle(STORAGE_KEY, handle);
                    await addFolderHandleToCache(handle);
                    await refreshFolderCount();
                    const files = await scanFolderFiles(handle);
                    if (files.length > 0) {
                      setFolderFiles(files);
                      setCurrentFileIndex(0);
                    } else {
                      setFolderFiles([]);
                      setCurrentFileIndex(0);
                    }
                    toast.success(`폴더 추가: ${handle.name}`);
                  } catch { /* 사용자 취소 */ }
                }}
              >
                {directoryHandle ? '폴더 추가' : '폴더 선택'}
              </Button>
              {(directoryHandle || cachedFolderCount > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-slate-500 hover:bg-slate-100"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setDirectoryHandle(null);
                    setFolderFiles([]);
                    setCurrentFileIndex(0);
                    await clearFolderHandle(STORAGE_KEY);
                    await clearAllFolderHandles();
                    await refreshFolderCount();
                    toast.info('기억된 모든 폴더를 지웠습니다.');
                  }}
                >
                  전체 해제
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="delete-original-top"
                checked={deleteOriginalOnSave}
                onCheckedChange={(checked) => setDeleteOriginalOnSave(checked === true)}
                className="border-red-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
              />
              <Label htmlFor="delete-original-top" className="text-sm cursor-pointer text-red-600 flex items-center gap-1">
                <Trash2 className="h-3.5 w-3.5" />
                저장 후 원본 삭제
              </Label>
            </div>
          </div>
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
                  {directoryHandle && folderFiles.length > 0
                    ? `클릭하여 다음 파일 로드 (${currentFileIndex + 1}/${folderFiles.length})`
                    : '앨범 이미지를 드래그하거나 클릭하여 선택하세요'}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {directoryHandle
                    ? `폴더: ${directoryHandle.name} (자동 저장 활성화)`
                    : 'JPEG, PNG 형식 지원 (가로형 앨범 펼침 이미지)'}
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
                <p className="text-sm font-medium truncate" title={fileName}>{formatThumbFileLabel(fileName)}</p>
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

            <div className="mt-4 space-y-3">
              {/* 원본 삭제 체크박스 */}
              <div className="flex items-center justify-center gap-2">
                <Checkbox
                  id="delete-original-on-save"
                  checked={deleteOriginalOnSave}
                  onCheckedChange={(checked) => setDeleteOriginalOnSave(checked === true)}
                  disabled={originalDeleted}
                  className="border-red-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                />
                <Label
                  htmlFor="delete-original-on-save"
                  className={`text-sm cursor-pointer flex items-center gap-1 ${originalDeleted ? 'text-slate-400 line-through' : 'text-red-600'}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  원본 삭제
                </Label>
                {originalDeleted && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    삭제 완료
                  </span>
                )}
              </div>

              {/* 모두 저장 버튼 */}
              <div className="flex justify-center">
                <Button onClick={handleSaveBoth} size="lg">
                  <Download className="h-4 w-4 mr-2" />
                  {deleteOriginalOnSave ? '저장 + 원본 삭제' : '첫장 + 막장 모두 저장'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ToolUsageCounter toolId="album-split" onTrackUse={(fn) => { trackUseRef.current = fn; }} />
    </div>
  );
}

'use client';

import { useCallback, useRef } from 'react';
import { uploadAlbumFile, type AlbumFileMetadata, type UploadedFileResult } from '@/lib/file-upload';
import { dataUrlToFile } from '@/lib/background-upload';
import { useMultiFolderUploadStore, type UploadedFolder, type UploadedFile } from '@/stores/multi-folder-upload-store';
import {
  addSessionFolder,
  updateSessionFolder,
  removeSessionFolder,
  loadUploadSession,
  clearUploadSession,
  type UploadSessionFolder,
  type UploadSessionFolderMeta,
} from '@/lib/upload-session';
import { useAuthStore } from '@/stores/auth-store';

const THROTTLE_MS = 200;

function generateTempFolderId(): string {
  return `tf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface QueueItem {
  folderId: string;
  tempFolderId: string;
  file: File;
  metadata: AlbumFileMetadata;
  fileIndex: number;
  totalFiles: number;
}

function extractFolderMeta(folder: UploadedFolder): UploadSessionFolderMeta {
  return {
    pageLayout: folder.pageLayout,
    bindingDirection: folder.bindingDirection,
    albumWidth: folder.albumWidth,
    albumHeight: folder.albumHeight,
    albumLabel: folder.albumLabel,
    fileSpecWidth: folder.fileSpecWidth,
    fileSpecHeight: folder.fileSpecHeight,
    fileSpecLabel: folder.fileSpecLabel,
    specLabel: folder.specLabel,
    dpi: folder.dpi,
    pageCount: folder.pageCount,
    quantity: folder.quantity,
    coverSourceType: folder.coverSourceType,
    coverAutoDetected: folder.coverAutoDetected,
    printMethod: folder.printMethod,
    colorMode: folder.colorMode,
    selectedPaperId: folder.selectedPaperId,
    selectedPaperName: folder.selectedPaperName,
    specificationId: folder.specificationId,
    selectedFabricId: folder.selectedFabricId,
    selectedFabricName: folder.selectedFabricName,
    selectedFabricThumbnail: folder.selectedFabricThumbnail,
    selectedFabricPrice: folder.selectedFabricPrice,
    selectedFabricCategory: folder.selectedFabricCategory,
    selectedFabricColorCode: folder.selectedFabricColorCode,
    selectedFabricColorName: folder.selectedFabricColorName,
    foilName: folder.foilName,
    foilColor: folder.foilColor,
    foilPosition: folder.foilPosition,
  };
}

export function useImmediateUpload(productId: string) {
  const queueRef = useRef<QueueItem[]>([]);
  const isProcessingRef = useRef(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const lastProgressUpdateRef = useRef<number>(0);

  const { updateFolderUploadStatus } = useMultiFolderUploadStore.getState();

  // 폴더별 업로드 진행 상태 추적
  const folderProgressRef = useRef<Map<string, { uploaded: number; total: number; serverFiles: UploadedFileResult[] }>>(new Map());

  const flushProgress = useCallback((folderId: string) => {
    const now = Date.now();
    if (now - lastProgressUpdateRef.current < THROTTLE_MS) return;
    lastProgressUpdateRef.current = now;

    const progress = folderProgressRef.current.get(folderId);
    if (!progress) return;

    const percent = progress.total > 0
      ? Math.round((progress.uploaded / progress.total) * 100)
      : 0;

    updateFolderUploadStatus(folderId, {
      immediateUploadProgress: percent,
      immediateUploadedCount: progress.uploaded,
    });
  }, [updateFolderUploadStatus]);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const { accessToken } = useAuthStore.getState();

    while (queueRef.current.length > 0) {
      const item = queueRef.current[0];

      // 해당 폴더의 AbortController 확인
      const controller = abortControllersRef.current.get(item.folderId);
      if (!controller || controller.signal.aborted) {
        queueRef.current.shift();
        continue;
      }

      let success = false;
      const maxRetries = 3;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (controller.signal.aborted) break;

        try {
          const result = await uploadAlbumFile(
            item.file,
            item.metadata,
            accessToken,
            undefined,
            controller.signal,
          );

          // 진행 상태 업데이트
          const progress = folderProgressRef.current.get(item.folderId);
          if (progress) {
            progress.uploaded++;
            progress.serverFiles.push(result);
            flushProgress(item.folderId);
          }

          success = true;
          break;
        } catch (err: any) {
          if (err?.name === 'AbortError') break;
          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          }
        }
      }

      queueRef.current.shift();

      if (!success && !controller.signal.aborted) {
        // 해당 폴더 업로드 실패 처리
        const progress = folderProgressRef.current.get(item.folderId);
        updateFolderUploadStatus(item.folderId, {
          immediateUploadStatus: 'partial',
          immediateUploadProgress: progress
            ? Math.round((progress.uploaded / progress.total) * 100) : 0,
          immediateUploadedCount: progress?.uploaded ?? 0,
        });
        updateSessionFolder(productId, item.folderId, {
          uploadStatus: 'partial',
          uploadedFileCount: progress?.uploaded ?? 0,
        });
        // 이 폴더의 나머지 파일도 큐에서 제거
        queueRef.current = queueRef.current.filter(q => q.folderId !== item.folderId);
        continue;
      }

      // 폴더 업로드 완료 체크
      const progress = folderProgressRef.current.get(item.folderId);
      if (progress && progress.uploaded === progress.total) {
        const serverFiles = progress.serverFiles.map(r => ({
          tempFileId: r.tempFileId,
          fileUrl: r.fileUrl,
          thumbnailUrl: r.thumbnailUrl,
          sortOrder: r.sortOrder,
          fileName: r.fileName,
        }));

        updateFolderUploadStatus(item.folderId, {
          immediateUploadStatus: 'completed',
          immediateUploadProgress: 100,
          immediateUploadedCount: progress.total,
          immediateServerFiles: serverFiles,
        });

        updateSessionFolder(productId, item.folderId, {
          uploadStatus: 'completed',
          uploadedFileCount: progress.total,
        });

        // 업로드 완료 후 File 객체 메모리 해제
        const { folders } = useMultiFolderUploadStore.getState();
        const folder = folders.find(f => f.id === item.folderId);
        if (folder) {
          const clearedFiles = folder.files.map(f => ({
            ...f,
            file: undefined,
            canvasDataUrl: undefined,
            // 서버 썸네일 URL로 교체
            thumbnailUrl: f.thumbnailUrl || serverFiles.find(sf => sf.sortOrder === f.pageNumber)?.thumbnailUrl,
          }));
          useMultiFolderUploadStore.getState().updateFolder(item.folderId, { files: clearedFiles });
        }
      }
    }

    isProcessingRef.current = false;
  }, [productId, flushProgress, updateFolderUploadStatus]);

  const enqueueFolder = useCallback((folder: UploadedFolder) => {
    const tempFolderId = generateTempFolderId();

    // AbortController 생성
    const controller = new AbortController();
    abortControllersRef.current.set(folder.id, controller);

    // Store 업데이트
    updateFolderUploadStatus(folder.id, {
      tempFolderId,
      immediateUploadStatus: 'uploading',
      immediateUploadProgress: 0,
      immediateUploadedCount: 0,
    });

    // 진행 상태 초기화
    folderProgressRef.current.set(folder.id, {
      uploaded: 0,
      total: folder.files.length,
      serverFiles: [],
    });

    // 세션에 저장
    const sessionFolder: UploadSessionFolder = {
      folderId: folder.id,
      tempFolderId,
      folderName: folder.folderName,
      uploadStatus: 'uploading',
      uploadedFileCount: 0,
      totalFileCount: folder.files.length,
      folderMeta: extractFolderMeta(folder),
      createdAt: Date.now(),
    };
    addSessionFolder(productId, sessionFolder);

    // 파일을 큐에 추가
    folder.files.forEach((uploadedFile: UploadedFile, idx: number) => {
      let file: File | null = null;
      if (uploadedFile.file) {
        file = uploadedFile.file;
      } else if (uploadedFile.canvasDataUrl) {
        file = dataUrlToFile(uploadedFile.canvasDataUrl, uploadedFile.fileName);
      }

      if (!file) return;

      const metadata: AlbumFileMetadata = {
        tempFolderId,
        folderName: folder.folderName,
        sortOrder: uploadedFile.pageNumber,
        fileName: uploadedFile.fileName,
        width: uploadedFile.widthPx,
        height: uploadedFile.heightPx,
        widthInch: uploadedFile.widthInch,
        heightInch: uploadedFile.heightInch,
        dpi: uploadedFile.dpi,
        fileSize: uploadedFile.fileSize,
      };

      queueRef.current.push({
        folderId: folder.id,
        tempFolderId,
        file,
        metadata,
        fileIndex: idx,
        totalFiles: folder.files.length,
      });
    });

    // 큐 처리 시작
    processQueue();
  }, [productId, processQueue, updateFolderUploadStatus]);

  const cancelFolderUpload = useCallback((folderId: string) => {
    // AbortController abort
    const controller = abortControllersRef.current.get(folderId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(folderId);
    }

    // 큐에서 해당 폴더 항목 제거
    queueRef.current = queueRef.current.filter(q => q.folderId !== folderId);

    // 진행 상태 제거
    folderProgressRef.current.delete(folderId);

    // 세션에서 제거
    removeSessionFolder(productId, folderId);
  }, [productId]);

  const retryFolder = useCallback((folder: UploadedFolder) => {
    // 기존 상태 정리
    cancelFolderUpload(folder.id);
    // 다시 시작
    enqueueFolder(folder);
  }, [cancelFolderUpload, enqueueFolder]);

  const restoreSession = useCallback(async (): Promise<boolean> => {
    const session = loadUploadSession(productId);
    if (!session || session.folders.length === 0) return false;

    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/api\/v1\/?$/, '');
    let restored = false;

    for (const sf of session.folders) {
      if (sf.uploadStatus !== 'completed') {
        // 미완료 세션은 제거
        removeSessionFolder(productId, sf.folderId);
        continue;
      }

      try {
        const res = await fetch(`${API_BASE}/api/v1/upload/temp/${sf.tempFolderId}/files`);
        if (!res.ok) {
          removeSessionFolder(productId, sf.folderId);
          continue;
        }

        const data = await res.json();
        if (!data.files || data.files.length === 0) {
          removeSessionFolder(productId, sf.folderId);
          continue;
        }

        // UploadedFile[] 재구성 (file=undefined, 서버 URL 사용)
        const files: UploadedFile[] = data.files.map((serverFile: any, idx: number) => ({
          id: `restored-${sf.folderId}-${idx}`,
          file: undefined,
          fileName: serverFile.fileName,
          filePath: sf.folderName,
          fileSize: serverFile.fileSize,
          pageNumber: serverFile.sortOrder,
          widthPx: 0, // 서버에서 메타데이터 미저장 - 복원 시 0
          heightPx: 0,
          dpi: sf.folderMeta.dpi || 0,
          widthInch: 0,
          heightInch: 0,
          ratio: 0,
          coverType: 'INNER_PAGE' as const,
          thumbnailUrl: serverFile.thumbnailUrl,
          status: 'EXACT_MATCH' as const,
        }));

        const meta = sf.folderMeta;
        const restoredFolder: UploadedFolder = {
          id: sf.folderId,
          folderName: sf.folderName,
          orderTitle: sf.folderName,
          folderPath: sf.folderName,
          depth: 0,
          files,
          totalFileSize: data.files.reduce((sum: number, f: any) => sum + (f.fileSize || 0), 0),
          pageCount: meta.pageCount,
          pageLayout: meta.pageLayout,
          bindingDirection: meta.bindingDirection,
          fileSpecWidth: meta.fileSpecWidth,
          fileSpecHeight: meta.fileSpecHeight,
          fileSpecLabel: meta.fileSpecLabel,
          albumWidth: meta.albumWidth,
          albumHeight: meta.albumHeight,
          albumRatio: meta.albumWidth && meta.albumHeight ? meta.albumWidth / meta.albumHeight : 1,
          albumLabel: meta.albumLabel,
          dpi: meta.dpi,
          specWidth: meta.albumWidth,
          specHeight: meta.albumHeight,
          specRatio: meta.albumWidth && meta.albumHeight ? meta.albumWidth / meta.albumHeight : 1,
          specLabel: meta.specLabel,
          validationStatus: 'EXACT_MATCH',
          isApproved: true,
          isSelected: true,
          exactMatchCount: files.length,
          ratioMatchCount: 0,
          ratioMismatchCount: 0,
          mismatchFiles: [],
          splitCoverResults: [],
          hasCombinedCover: false,
          quantity: meta.quantity,
          availableSizes: [],
          additionalOrders: [],
          specFoundInDB: true,
          coverSourceType: meta.coverSourceType,
          coverAutoDetected: meta.coverAutoDetected,
          printMethod: meta.printMethod,
          colorMode: meta.colorMode,
          selectedPaperId: meta.selectedPaperId,
          selectedPaperName: meta.selectedPaperName,
          specificationId: meta.specificationId,
          selectedFabricId: meta.selectedFabricId,
          selectedFabricName: meta.selectedFabricName,
          selectedFabricThumbnail: meta.selectedFabricThumbnail,
          selectedFabricPrice: meta.selectedFabricPrice,
          selectedFabricCategory: meta.selectedFabricCategory,
          selectedFabricColorCode: meta.selectedFabricColorCode,
          selectedFabricColorName: meta.selectedFabricColorName,
          foilName: meta.foilName,
          foilColor: meta.foilColor,
          foilPosition: meta.foilPosition,
          uploadedAt: sf.createdAt,
          tempFolderId: sf.tempFolderId,
          immediateUploadStatus: 'completed',
          immediateUploadProgress: 100,
          immediateUploadedCount: data.files.length,
          immediateServerFiles: data.files.map((f: any) => ({
            tempFileId: `${sf.tempFolderId}/${f.fileName}`,
            fileUrl: f.fileUrl,
            thumbnailUrl: f.thumbnailUrl,
            sortOrder: f.sortOrder,
            fileName: f.fileName,
          })),
        };

        // store에 추가 (addFolder의 중복 체크를 우회하기 위해 직접 updateFolder 또는 addFolder 사용)
        const { addFolder } = useMultiFolderUploadStore.getState();
        const result = addFolder(restoredFolder);
        if (result.added) {
          restored = true;
        }
      } catch {
        removeSessionFolder(productId, sf.folderId);
      }
    }

    return restored;
  }, [productId]);

  return { enqueueFolder, cancelFolderUpload, retryFolder, restoreSession };
}

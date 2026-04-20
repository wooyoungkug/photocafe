'use client';

import { useCallback, useRef } from 'react';
import { uploadAlbumFile, UploadError, type AlbumFileMetadata, type UploadedFileResult } from '@/lib/file-upload';
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
  const folderProgressRef = useRef<Map<string, {
    uploaded: number;
    total: number;
    serverFiles: UploadedFileResult[];
    failedFiles: Array<{ fileName: string; sortOrder: number; errorMessage: string }>;
  }>>(new Map());

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
    if (isProcessingRef.current) {
      console.log('[ImmediateUpload] processQueue skipped - already processing');
      return;
    }
    isProcessingRef.current = true;
    console.log('[ImmediateUpload] processQueue started, queue length:', queueRef.current.length);

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
          console.log('[ImmediateUpload] uploading file:', item.metadata.fileName, 'to folder:', item.tempFolderId);
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
          console.error('[ImmediateUpload] upload error:', err?.message || err, { fileName: item.metadata.fileName, attempt });
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
        // folder의 파일 메타데이터를 매칭하여 포함
        const { folders } = useMultiFolderUploadStore.getState();
        const currentFolder = folders.find(f => f.id === item.folderId);
        const serverFiles = progress.serverFiles.map(r => {
          const origFile = currentFolder?.files.find(f => (f.newFileName || f.fileName) === r.fileName);
          return {
            tempFileId: r.tempFileId,
            fileUrl: r.fileUrl,
            thumbnailUrl: r.thumbnailUrl,
            sortOrder: r.sortOrder,
            fileName: r.fileName,
            widthPx: origFile?.widthPx || 0,
            heightPx: origFile?.heightPx || 0,
            widthInch: origFile?.widthInch || 0,
            heightInch: origFile?.heightInch || 0,
            dpi: origFile?.dpi || 0,
            fileSize: origFile?.fileSize || r.size || 0,
          };
        });

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
        // 썸네일은 서버 생성이 비동기(fire-and-forget)이므로 기존 data URL 유지
        const folder = useMultiFolderUploadStore.getState().folders.find(f => f.id === item.folderId);
        if (folder) {
          const clearedFiles = folder.files.map(f => {
            const serverThumbUrl = serverFiles.find(sf => sf.sortOrder === f.pageNumber)?.thumbnailUrl;
            return {
              ...f,
              file: undefined,
              canvasDataUrl: undefined,
              // 기존 data URL 썸네일을 우선 유지, 없을 때만 서버 URL 사용
              thumbnailUrl: f.thumbnailUrl || serverThumbUrl,
              // 서버 썸네일 URL 별도 보관 (복원 시 사용)
              serverThumbnailUrl: serverThumbUrl,
            };
          });
          useMultiFolderUploadStore.getState().updateFolder(item.folderId, { files: clearedFiles });
        }
      }
    }

    isProcessingRef.current = false;
  }, [productId, flushProgress, updateFolderUploadStatus]);

  const enqueueFolder = useCallback((folder: UploadedFolder) => {
    const tempFolderId = generateTempFolderId();
    console.log('[ImmediateUpload] enqueueFolder called', { folderId: folder.id, folderName: folder.folderName, fileCount: folder.files.length, filesWithFile: folder.files.filter(f => f.file || f.canvasDataUrl).length });

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

      if (!file) {
        console.warn('[ImmediateUpload] No file for:', uploadedFile.fileName, { hasFile: !!uploadedFile.file, hasCanvas: !!uploadedFile.canvasDataUrl });
        return;
      }

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
        // folderMeta의 albumWidth/Height는 앨범 규격 (spread면 절반 크기)
        // 파일 원본 크기를 역산: spread이면 가로 × 2
        const metaDpi = sf.folderMeta.dpi || 300;
        const albumW = sf.folderMeta.albumWidth || sf.folderMeta.fileSpecWidth || 0;
        const albumH = sf.folderMeta.albumHeight || sf.folderMeta.fileSpecHeight || 0;
        const isSpread = sf.folderMeta.pageLayout === 'spread';
        const rawFileW = isSpread ? albumW * 2 : albumW;
        const rawFileH = albumH;
        const metaRatio = rawFileW && rawFileH ? rawFileW / rawFileH : 0;
        const files: UploadedFile[] = data.files.map((serverFile: any, idx: number) => ({
          id: `restored-${sf.folderId}-${idx}`,
          file: undefined,
          fileName: serverFile.fileName,
          filePath: sf.folderName,
          fileSize: serverFile.fileSize,
          pageNumber: serverFile.sortOrder,
          widthPx: Math.round(rawFileW * metaDpi),
          heightPx: Math.round(rawFileH * metaDpi),
          dpi: metaDpi,
          widthInch: rawFileW,
          heightInch: rawFileH,
          ratio: metaRatio,
          coverType: 'INNER_PAGE' as const,
          thumbnailUrl: serverFile.thumbnailUrl,
          status: 'EXACT_MATCH' as const,
        }));

        // 썸네일 이미지를 로드하여 실제 비율 추출 (비동기, 표시 품질 개선)
        const thumbBaseUrl = API_BASE || '';
        files.forEach((f) => {
          if (!f.thumbnailUrl) return;
          const img = new Image();
          img.onload = () => {
            const { updateFileInFolder } = useMultiFolderUploadStore.getState();
            if (typeof updateFileInFolder === 'function') {
              updateFileInFolder(sf.folderId, f.id, {
                widthPx: img.naturalWidth,
                heightPx: img.naturalHeight,
              });
            }
          };
          img.src = f.thumbnailUrl.startsWith('http') ? f.thumbnailUrl : `${thumbBaseUrl}${f.thumbnailUrl}`;
        });

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
          immediateServerFiles: data.files.map((f: any, idx: number) => {
            const reconstructed = files[idx];
            return {
              tempFileId: `${sf.tempFolderId}/${f.fileName}`,
              fileUrl: f.fileUrl,
              thumbnailUrl: f.thumbnailUrl,
              sortOrder: f.sortOrder,
              fileName: f.fileName,
              widthPx: reconstructed?.widthPx || 0,
              heightPx: reconstructed?.heightPx || 0,
              widthInch: reconstructed?.widthInch || 0,
              heightInch: reconstructed?.heightInch || 0,
              dpi: reconstructed?.dpi || 0,
              fileSize: f.fileSize || reconstructed?.fileSize || 0,
            };
          }),
        };

        // addFolder로 추가 (validateFolder로 availableSizes 등 계산)
        // 이후 specificationId를 세션 메타에서 복원 (validateFolder가 파일 크기 기반으로 덮어쓰므로)
        const { addFolder, updateFolder: updateFolderInStore } = useMultiFolderUploadStore.getState();
        const result = addFolder(restoredFolder);
        if (result.added) {
          if (meta.specificationId) {
            updateFolderInStore(sf.folderId, { specificationId: meta.specificationId });
          }
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

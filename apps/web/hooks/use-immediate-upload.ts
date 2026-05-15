'use client';

import { useCallback, useRef } from 'react';
import {
  uploadAlbumFile,
  uploadAlbumFilePresigned,
  uploadAlbumFileMultipart,
  MULTIPART_THRESHOLD,
  UploadError,
  getStorageOverride,
  type AlbumFileMetadata,
  type UploadedFileResult,
} from '@/lib/file-upload';
import { dataUrlToFile } from '@/lib/background-upload';

const CONCURRENCY = 4; // 동시 업로드 수 (B2 직접 업로드 대응)
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
    startedAt: number;
    bytesUploaded: number;
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

    const elapsedSec = Math.max(1, (now - progress.startedAt) / 1000);
    const speed = progress.bytesUploaded / elapsedSec; // bytes/sec

    updateFolderUploadStatus(folderId, {
      immediateUploadProgress: percent,
      immediateUploadedCount: progress.uploaded,
      immediateUploadSpeed: speed,
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

    // 단일 아이템 처리 함수 (재시도 포함)
    // 반환: { item, success, lastError }
    const processOneItem = async (item: QueueItem): Promise<{
      item: QueueItem;
      success: boolean;
      lastError: UploadError | Error | null;
      aborted: boolean;
    }> => {
      const controller = abortControllersRef.current.get(item.folderId);
      if (!controller || controller.signal.aborted) {
        return { item, success: false, lastError: null, aborted: true };
      }

      let success = false;
      let lastError: UploadError | Error | null = null;
      const maxRetries = 3;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (controller.signal.aborted) {
          return { item, success: false, lastError, aborted: true };
        }

        try {
          console.log('[ImmediateUpload] uploading file:', item.metadata.fileName, 'to folder:', item.tempFolderId);

          // 업로드 경로 선택: 큰 파일 → Multipart, 작은 파일 → 단일 Presigned
          // 둘 다 실패 시(400 = B2 미설정 등) 서버 경유 폴백
          let result: UploadedFileResult;
          const useMultipart = item.file.size >= MULTIPART_THRESHOLD;
          try {
            if (useMultipart) {
              result = await uploadAlbumFileMultipart(
                item.file,
                item.metadata,
                accessToken,
                undefined,
                controller.signal,
              );
            } else {
              result = await uploadAlbumFilePresigned(
                item.file,
                item.metadata,
                accessToken,
                undefined,
                controller.signal,
              );
            }
          } catch (presignErr) {
            if (
              presignErr instanceof UploadError &&
              presignErr.kind === 'server' &&
              presignErr.status === 400
            ) {
              result = await uploadAlbumFile(
                item.file,
                item.metadata,
                accessToken,
                undefined,
                controller.signal,
              );
            } else {
              throw presignErr;
            }
          }

          // 진행 상태 업데이트
          const progress = folderProgressRef.current.get(item.folderId);
          if (progress) {
            progress.uploaded++;
            progress.bytesUploaded += item.file.size || 0;
            progress.serverFiles.push(result);
            flushProgress(item.folderId);
          }

          success = true;
          break;
        } catch (err: any) {
          lastError = err;
          console.error('[ImmediateUpload] upload error:', err?.message || err, { fileName: item.metadata.fileName, attempt });
          if (err?.name === 'AbortError') {
            return { item, success: false, lastError, aborted: true };
          }
          // 재시도 불가 에러면 즉시 중단
          if (err instanceof UploadError && !err.retriable) break;
          if (attempt < maxRetries - 1) {
            const base = 1000 * Math.pow(2, attempt);
            const jitter = Math.floor(Math.random() * 300);
            await new Promise(r => setTimeout(r, base + jitter));
          }
        }
      }

      return { item, success, lastError, aborted: false };
    };

    // 폴더 완료/부분실패 체크 후 상태 업데이트
    const checkFolderCompletion = (folderId: string) => {
      const progress = folderProgressRef.current.get(folderId);
      const hasMoreForFolder = queueRef.current.some(q => q.folderId === folderId);
      if (!progress || hasMoreForFolder) return;

      if (progress.failedFiles.length > 0) {
        // 모두 처리했으나 일부 실패 → partial
        updateFolderUploadStatus(folderId, {
          immediateUploadStatus: 'partial',
          immediateUploadProgress: Math.round((progress.uploaded / progress.total) * 100),
          immediateUploadedCount: progress.uploaded,
          immediateFailedFiles: progress.failedFiles,
        });
        updateSessionFolder(productId, folderId, {
          uploadStatus: 'partial',
          uploadedFileCount: progress.uploaded,
        });
        return;
      }

      if (progress.uploaded === progress.total && progress.failedFiles.length === 0) {
        finalizeFolderSuccess(folderId, progress);
      }
    };

    // 폴더 성공 마무리 처리 (메모리 해제 등)
    function finalizeFolderSuccess(
      folderId: string,
      progress: { uploaded: number; total: number; serverFiles: UploadedFileResult[]; failedFiles: any[]; startedAt: number; bytesUploaded: number },
    ) {
      // folder의 파일 메타데이터를 매칭하여 포함
      const { folders } = useMultiFolderUploadStore.getState();
      const currentFolder = folders.find(f => f.id === folderId);
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

      const elapsedMs = Math.max(1, Date.now() - progress.startedAt);
      const avgSpeed = (progress.bytesUploaded * 1000) / elapsedMs; // bytes/sec
      const storageOverride = getStorageOverride();
      const storage: 'b2' | 'r2' = storageOverride === 'r2' ? 'r2' : 'b2';

      updateFolderUploadStatus(folderId, {
        immediateUploadStatus: 'completed',
        immediateUploadProgress: 100,
        immediateUploadedCount: progress.total,
        immediateServerFiles: serverFiles,
        immediateUploadAvgSpeed: avgSpeed,
        immediateUploadElapsedMs: elapsedMs,
        immediateUploadTotalBytes: progress.bytesUploaded,
        immediateUploadStorage: storage,
      });

      const completedAt = Date.now();
      updateSessionFolder(productId, folderId, {
        uploadStatus: 'completed',
        uploadedFileCount: progress.total,
        uploadStartedAt: progress.startedAt,
        uploadCompletedAt: completedAt,
        uploadElapsedMs: elapsedMs,
        uploadTotalBytes: progress.bytesUploaded,
        uploadAvgSpeed: avgSpeed,
        uploadStorage: storage,
      });

      // 업로드 완료 후 File 객체 메모리 해제
      // 썸네일은 서버 생성이 비동기(fire-and-forget)이므로 기존 data URL 유지
      const folder = useMultiFolderUploadStore.getState().folders.find(f => f.id === folderId);
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
        useMultiFolderUploadStore.getState().updateFolder(folderId, { files: clearedFiles });
      }
    }

    // 배치 단위 병렬 처리: 최대 CONCURRENCY 개씩 동시 실행
    while (queueRef.current.length > 0) {
      // 1) 배치 추출 (선두에서 최대 CONCURRENCY 개)
      //    유효하지 않은(중단된 폴더) 아이템은 즉시 스킵
      const batch: QueueItem[] = [];
      while (batch.length < CONCURRENCY && queueRef.current.length > 0) {
        const next = queueRef.current.shift()!;
        const ctrl = abortControllersRef.current.get(next.folderId);
        if (!ctrl || ctrl.signal.aborted) {
          // 중단된 폴더의 잔여 아이템은 버림
          continue;
        }
        batch.push(next);
      }

      if (batch.length === 0) continue;

      // 2) 병렬 실행
      const results = await Promise.allSettled(batch.map(b => processOneItem(b)));

      // 3) 결과 반영 (성공/실패 카운트)
      const touchedFolderIds = new Set<string>();
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const item = batch[i];
        touchedFolderIds.add(item.folderId);

        if (r.status === 'fulfilled') {
          const { success, lastError, aborted } = r.value;
          if (aborted) continue;
          if (!success) {
            const progress = folderProgressRef.current.get(item.folderId);
            if (progress) {
              progress.failedFiles.push({
                fileName: item.metadata.fileName,
                sortOrder: item.metadata.sortOrder,
                errorMessage: lastError?.message || '알 수 없는 오류',
              });
            }
          }
        } else {
          // processOneItem 자체가 예외를 던진 경우 (이론상 없음)
          const progress = folderProgressRef.current.get(item.folderId);
          if (progress) {
            progress.failedFiles.push({
              fileName: item.metadata.fileName,
              sortOrder: item.metadata.sortOrder,
              errorMessage: (r.reason as Error)?.message || '알 수 없는 오류',
            });
          }
        }
      }

      // 4) 배치 처리 후 영향받은 폴더들의 완료 여부 체크
      for (const folderId of touchedFolderIds) {
        checkFolderCompletion(folderId);
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
      failedFiles: [],
      startedAt: Date.now(),
      bytesUploaded: 0,
    });

    // 세션에 저장
    const startedAt = Date.now();
    const sessionFolder: UploadSessionFolder = {
      folderId: folder.id,
      tempFolderId,
      folderName: folder.folderName,
      uploadStatus: 'uploading',
      uploadedFileCount: 0,
      totalFileCount: folder.files.length,
      folderMeta: extractFolderMeta(folder),
      createdAt: startedAt,
      uploadStartedAt: startedAt,
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

  // 실패한 파일만 선택적으로 재업로드
  const retryFailedFiles = useCallback((folder: UploadedFolder) => {
    const failedList = folder.immediateFailedFiles;
    const tempFolderId = folder.tempFolderId;
    if (!failedList || failedList.length === 0 || !tempFolderId) {
      console.warn('[ImmediateUpload] retryFailedFiles: no failed files or no tempFolderId');
      return;
    }

    // 기존 AbortController 재사용 또는 새로 생성
    let controller = abortControllersRef.current.get(folder.id);
    if (!controller || controller.signal.aborted) {
      controller = new AbortController();
      abortControllersRef.current.set(folder.id, controller);
    }

    // 진행 상태 유지 - 실패 리스트만 초기화
    const progress = folderProgressRef.current.get(folder.id);
    if (progress) {
      progress.failedFiles = [];
    } else {
      folderProgressRef.current.set(folder.id, {
        uploaded: folder.immediateUploadedCount || 0,
        total: folder.files.length,
        serverFiles: [],
        failedFiles: [],
        startedAt: Date.now(),
        bytesUploaded: 0,
      });
    }

    // 상태를 uploading으로 전환
    updateFolderUploadStatus(folder.id, {
      immediateUploadStatus: 'uploading',
      immediateFailedFiles: [],
    });

    // 실패한 파일만 큐에 추가
    const failedSortOrders = new Set(failedList.map(f => f.sortOrder));
    folder.files.forEach((uploadedFile: UploadedFile, idx: number) => {
      if (!failedSortOrders.has(uploadedFile.pageNumber)) return;

      let file: File | null = null;
      if (uploadedFile.file) {
        file = uploadedFile.file;
      } else if (uploadedFile.canvasDataUrl) {
        file = dataUrlToFile(uploadedFile.canvasDataUrl, uploadedFile.fileName);
      }

      if (!file) {
        console.warn('[ImmediateUpload] retryFailedFiles: no File for', uploadedFile.fileName);
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

    processQueue();
  }, [processQueue, updateFolderUploadStatus]);

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
          immediateUploadAvgSpeed: sf.uploadAvgSpeed,
          immediateUploadElapsedMs: sf.uploadElapsedMs,
          immediateUploadTotalBytes: sf.uploadTotalBytes,
          immediateUploadStorage: sf.uploadStorage,
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

  return { enqueueFolder, cancelFolderUpload, retryFolder, retryFailedFiles, restoreSession };
}

import { uploadAlbumFile, deleteTempFolder, type AlbumFileMetadata } from './file-upload';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';

const CONCURRENCY = 8;          // 동시 업로드 수 (20+ 파일 대응)
const THROTTLE_MS = 200;        // progress 업데이트 최소 간격

function generateTempFolderId(): string {
  return `tf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const byteString = atob(parts[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new File([new Blob([ab], { type: mime })], fileName, { type: mime });
}

export interface FolderUploadData {
  folderId: string;
  folderName: string;
  files: Array<{
    file?: File;
    canvasDataUrl?: string;
    fileName: string;
    sortOrder: number;
    widthPx: number;
    heightPx: number;
    widthInch: number;
    heightInch: number;
    dpi: number;
    fileSize: number;
  }>;
}

// 재시도를 위해 진행 중인 업로드의 파일 참조 보관
const pendingFileRefs = new Map<string, FolderUploadData>();

// 진행 중인 업로드의 AbortController 보관
const activeAbortControllers = new Map<string, AbortController>();

/**
 * 폴더의 원본 파일들을 백그라운드로 서버에 업로드
 * - 동시 3개 병렬 업로드
 * - progress 쓰로틀링 (200ms)
 * - AbortController로 중단 가능
 */
export function startBackgroundUpload(
  cartItemIds: string[],
  folderData: FolderUploadData,
) {
  const tempFolderId = generateTempFolderId();
  const { updateUploadStatus } = useCartStore.getState();
  const { accessToken } = useAuthStore.getState();

  // 재시도용 파일 참조 저장
  const primaryId = cartItemIds[0];
  pendingFileRefs.set(primaryId, folderData);

  // AbortController 생성
  const abortController = new AbortController();
  activeAbortControllers.set(primaryId, abortController);

  // 업로드할 파일 준비
  const uploadFiles = folderData.files
    .map((f) => {
      let file: File | null = null;
      if (f.file) {
        file = f.file;
      } else if (f.canvasDataUrl) {
        file = dataUrlToFile(f.canvasDataUrl, f.fileName);
      }
      if (!file) return null;
      return {
        file,
        metadata: {
          tempFolderId,
          folderName: folderData.folderName,
          sortOrder: f.sortOrder,
          fileName: f.fileName,
          width: f.widthPx,
          height: f.heightPx,
          widthInch: f.widthInch,
          heightInch: f.heightInch,
          dpi: f.dpi,
          fileSize: f.fileSize,
        } satisfies AlbumFileMetadata,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  if (uploadFiles.length === 0) return;

  // 관련 카트 아이템 모두 업데이트하는 헬퍼
  const updateAll = (updates: Parameters<typeof updateUploadStatus>[1]) => {
    cartItemIds.forEach((id) => updateUploadStatus(id, updates));
  };

  // 초기 상태 설정
  updateAll({
    uploadStatus: 'uploading',
    uploadProgress: 0,
    uploadedFileCount: 0,
    totalFileCount: uploadFiles.length,
    tempFolderId,
  });

  const { signal } = abortController;

  // 비동기 병렬 업로드 시작
  (async () => {
    const serverFiles: Array<{
      tempFileId: string;
      fileUrl: string;
      thumbnailUrl: string;
      sortOrder: number;
      fileName: string;
      widthPx: number;
      heightPx: number;
      widthInch: number;
      heightInch: number;
      dpi: number;
      fileSize: number;
    }> = [];

    // 파일별 progress 추적
    const fileProgress = new Float32Array(uploadFiles.length);
    let completedCount = 0;
    let lastProgressUpdate = 0;

    const flushProgress = () => {
      let sum = 0;
      for (let i = 0; i < fileProgress.length; i++) {
        sum += fileProgress[i];
      }
      const overall = Math.round(sum / uploadFiles.length);
      updateAll({ uploadProgress: overall });
      lastProgressUpdate = Date.now();
    };

    const throttledProgress = () => {
      const now = Date.now();
      if (now - lastProgressUpdate >= THROTTLE_MS) {
        flushProgress();
      }
    };

    // 단일 파일 업로드 (재시도 포함)
    const uploadOne = async (index: number) => {
      const { file, metadata } = uploadFiles[index];
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError');

        try {
          const result = await uploadAlbumFile(
            file,
            metadata,
            accessToken,
            (percent) => {
              fileProgress[index] = percent;
              throttledProgress();
            },
            signal,
          );

          fileProgress[index] = 100;
          serverFiles.push({
            tempFileId: result.tempFileId,
            fileUrl: result.fileUrl,
            thumbnailUrl: result.thumbnailUrl,
            sortOrder: result.sortOrder,
            fileName: result.fileName || metadata.fileName,
            widthPx: metadata.width,
            heightPx: metadata.height,
            widthInch: metadata.widthInch,
            heightInch: metadata.heightInch,
            dpi: metadata.dpi,
            fileSize: metadata.fileSize,
          });

          completedCount++;
          updateAll({
            uploadedFileCount: completedCount,
            serverFiles: [...serverFiles],
          });

          lastError = null;
          break;
        } catch (err) {
          if ((err as DOMException).name === 'AbortError') throw err;
          lastError = err as Error;
          if (attempt < maxRetries - 1) {
            await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
          }
        }
      }

      if (lastError) throw lastError;
    };

    try {
      // 병렬 업로드: CONCURRENCY 개씩 동시 실행 (allSettled로 부분 실패 허용)
      let i = 0;
      let failedCount = 0;
      while (i < uploadFiles.length) {
        if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError');

        const batch: Promise<void>[] = [];
        for (let j = 0; j < CONCURRENCY && i < uploadFiles.length; j++, i++) {
          batch.push(uploadOne(i));
        }
        const results = await Promise.allSettled(batch);

        // 배치 내 실패 건 카운트 (AbortError면 즉시 중단)
        for (const r of results) {
          if (r.status === 'rejected') {
            if ((r.reason as DOMException)?.name === 'AbortError') {
              throw r.reason;
            }
            failedCount++;
          }
        }
      }

      flushProgress();

      if (failedCount > 0 && serverFiles.length > 0) {
        // 부분 성공: 성공한 파일은 유지하되 상태를 failed로 표시
        updateAll({
          uploadStatus: 'failed',
          uploadProgress: Math.round((serverFiles.length / uploadFiles.length) * 100),
          serverFiles: [...serverFiles],
        });
        // pendingFileRefs 유지 → 재시도 가능
      } else if (failedCount > 0) {
        // 전체 실패
        updateAll({
          uploadStatus: 'failed',
          serverFiles: [],
        });
      } else {
        // 전체 성공
        updateAll({
          uploadStatus: 'completed',
          uploadProgress: 100,
        });
        pendingFileRefs.delete(primaryId);
      }
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') {
        // 중단됨 → 서버 임시파일 삭제
        deleteTempFolder(tempFolderId, accessToken).catch(() => {});
        updateAll({
          uploadStatus: 'cancelled' as any,
          uploadProgress: 0,
          serverFiles: [],
        });
        pendingFileRefs.delete(primaryId);
      } else {
        updateAll({
          uploadStatus: 'failed',
          serverFiles: [...serverFiles],
        });
      }
    } finally {
      activeAbortControllers.delete(primaryId);
    }
  })();
}

/**
 * 진행 중인 업로드를 중단하고 서버 임시파일 삭제
 */
export function cancelUpload(cartItemId: string): boolean {
  const controller = activeAbortControllers.get(cartItemId);
  if (!controller) return false;

  controller.abort();
  return true;
}

/**
 * 업로드 중단 가능 여부 확인
 */
export function canCancelUpload(cartItemId: string): boolean {
  return activeAbortControllers.has(cartItemId);
}

/**
 * 실패한 업로드를 재시도
 * (같은 세션에서만 가능 - 페이지 새로고침 시 File 참조 소멸)
 */
export function retryBackgroundUpload(cartItemId: string): boolean {
  const folderData = pendingFileRefs.get(cartItemId);
  if (!folderData) return false;

  const { items } = useCartStore.getState();
  const relatedItems = items.filter(
    (item) =>
      item.albumOrderInfo?.folderId === folderData.folderId &&
      item.uploadStatus === 'failed'
  );
  if (relatedItems.length === 0) return false;

  startBackgroundUpload(
    relatedItems.map((i) => i.id),
    folderData,
  );
  return true;
}

/**
 * 재시도 가능 여부 확인
 */
export function canRetryUpload(cartItemId: string): boolean {
  return pendingFileRefs.has(cartItemId);
}

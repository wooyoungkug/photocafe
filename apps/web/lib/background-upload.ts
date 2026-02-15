import { uploadAlbumFile, type AlbumFileMetadata } from './file-upload';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';

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

/**
 * 폴더의 원본 파일들을 백그라운드로 서버에 업로드
 * @param cartItemIds - 같은 폴더를 참조하는 장바구니 아이템 ID 배열
 * @param folderData - 업로드할 폴더 데이터 (파일 포함)
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

  // 업로드할 파일 준비 (File 객체 또는 canvasDataUrl → File 변환)
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

  // 비동기 순차 업로드 시작
  (async () => {
    const serverFiles: Array<{
      tempFileId: string;
      fileUrl: string;
      thumbnailUrl: string;
      sortOrder: number;
    }> = [];

    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const { file, metadata } = uploadFiles[i];
        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const result = await uploadAlbumFile(
              file,
              metadata,
              accessToken,
              (percent) => {
                const overall = Math.round(
                  ((i + percent / 100) / uploadFiles.length) * 100
                );
                updateAll({ uploadProgress: overall });
              },
            );

            serverFiles.push({
              tempFileId: result.tempFileId,
              fileUrl: result.fileUrl,
              thumbnailUrl: result.thumbnailUrl,
              sortOrder: result.sortOrder,
            });
            lastError = null;
            break;
          } catch (err) {
            lastError = err as Error;
            if (attempt < maxRetries - 1) {
              await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
            }
          }
        }

        if (lastError) throw lastError;

        updateAll({
          uploadedFileCount: i + 1,
          serverFiles: [...serverFiles],
        });
      }

      updateAll({
        uploadStatus: 'completed',
        uploadProgress: 100,
      });
      pendingFileRefs.delete(primaryId);
    } catch (error) {
      updateAll({
        uploadStatus: 'failed',
        serverFiles: [...serverFiles],
      });
    }
  })();
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const API_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

export interface AlbumFileMetadata {
  tempFolderId: string;
  folderName: string;
  sortOrder: number;
  fileName: string;
  width: number;
  height: number;
  widthInch: number;
  heightInch: number;
  dpi: number;
  fileSize: number;
}

export interface UploadedFileResult {
  tempFileId: string;
  fileName: string;
  originalName: string;
  size: number;
  fileUrl: string;
  thumbnailUrl: string;
  sortOrder: number;
}

/**
 * 앨범 원본 파일 1개를 서버에 업로드
 * XMLHttpRequest 사용 (upload progress 지원)
 */
export function uploadAlbumFile(
  file: File,
  metadata: AlbumFileMetadata,
  token: string | null,
  onProgress?: (percent: number) => void,
): Promise<UploadedFileResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    // text fields must come BEFORE file so multer's destination callback can access req.body
    formData.append('tempFolderId', metadata.tempFolderId);
    formData.append('folderName', metadata.folderName);
    formData.append('sortOrder', String(metadata.sortOrder));
    formData.append('fileName', metadata.fileName);
    formData.append('width', String(metadata.width));
    formData.append('height', String(metadata.height));
    formData.append('widthInch', String(metadata.widthInch));
    formData.append('heightInch', String(metadata.heightInch));
    formData.append('dpi', String(metadata.dpi));
    formData.append('fileSize', String(metadata.fileSize));
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve(result);
        } catch {
          reject(new Error('Invalid response'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('POST', `${API_BASE}/api/v1/upload/album-file`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });
}

/**
 * 여러 파일을 순차 업로드 (메모리 절약)
 */
export async function uploadAlbumFiles(
  files: Array<{ file: File; metadata: AlbumFileMetadata }>,
  token: string | null,
  onFileProgress?: (fileIndex: number, percent: number) => void,
  onFileComplete?: (fileIndex: number, result: UploadedFileResult) => void,
  onOverallProgress?: (completedCount: number, totalCount: number) => void,
): Promise<UploadedFileResult[]> {
  const results: UploadedFileResult[] = [];
  const maxRetries = 3;

  for (let i = 0; i < files.length; i++) {
    const { file, metadata } = files[i];
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await uploadAlbumFile(
          file,
          metadata,
          token,
          (percent) => onFileProgress?.(i, percent),
        );
        results.push(result);
        onFileComplete?.(i, result);
        onOverallProgress?.(i + 1, files.length);
        lastError = null;
        break;
      } catch (err) {
        lastError = err as Error;
        if (attempt < maxRetries - 1) {
          // exponential backoff
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    if (lastError) {
      throw new Error(`파일 업로드 실패 (${metadata.fileName}): ${lastError.message}`);
    }
  }

  return results;
}

/**
 * 임시 폴더 삭제
 */
export async function deleteTempFolder(
  tempFolderId: string,
  token: string | null,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/upload/temp/${tempFolderId}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
  }
}

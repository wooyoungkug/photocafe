const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const API_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

const UPLOAD_TIMEOUT_MS = 10 * 60 * 1000; // 10분

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly kind: 'network' | 'timeout' | 'abort' | 'client' | 'server' | 'unknown',
    public readonly status?: number,
    public readonly retriable: boolean = false,
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

function parseErrorResponse(responseText: string, status: number, statusText: string): string {
  if (!responseText) return `Upload failed: ${status} ${statusText}`;
  try {
    const body = JSON.parse(responseText);
    const msg = body?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
    if (typeof body?.error === 'string') return body.error;
  } catch {
    // not JSON
  }
  return `Upload failed: ${status} ${statusText}`;
}

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
  signal?: AbortSignal,
): Promise<UploadedFileResult> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload cancelled', 'AbortError'));
      return;
    }

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
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    // AbortSignal 연결
    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort, { once: true });

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      signal?.removeEventListener('abort', onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve(result);
        } catch {
          reject(new UploadError('서버 응답을 파싱할 수 없습니다.', 'server', xhr.status, true));
        }
      } else {
        const msg = parseErrorResponse(xhr.responseText, xhr.status, xhr.statusText);
        // 4xx (413, 400-416 등) 는 재시도해도 실패 - 429만 예외적으로 재시도 가능
        const retriable = xhr.status === 0 || xhr.status === 429 || xhr.status >= 500;
        const kind = xhr.status >= 500 ? 'server' : 'client';
        reject(new UploadError(msg, kind, xhr.status, retriable));
      }
    });

    xhr.addEventListener('error', () => {
      signal?.removeEventListener('abort', onAbort);
      reject(new UploadError('네트워크 오류 - 서버 연결에 실패했습니다.', 'network', undefined, true));
    });
    xhr.addEventListener('timeout', () => {
      signal?.removeEventListener('abort', onAbort);
      reject(new UploadError('업로드 타임아웃 - 서버 응답이 너무 느립니다.', 'timeout', undefined, true));
    });
    xhr.addEventListener('abort', () => {
      signal?.removeEventListener('abort', onAbort);
      reject(new UploadError('업로드가 취소되었습니다.', 'abort', undefined, false));
    });

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
        // UploadError의 retriable=false 이거나 abort면 즉시 실패
        if (err instanceof UploadError && (!err.retriable || err.kind === 'abort')) {
          break;
        }
        if (attempt < maxRetries - 1) {
          // exponential backoff + jitter (0~300ms)
          const base = 1000 * Math.pow(2, attempt);
          const jitter = Math.floor(Math.random() * 300);
          await new Promise(r => setTimeout(r, base + jitter));
        }
      }
    }

    if (lastError) {
      throw new Error(`파일 업로드 실패 (${metadata.fileName}): ${lastError.message}`);
    }
  }

  return results;
}

// ===== 앨범수리 교체페이지 파일 업로드 =====

export interface RepairFileResult {
  fileName: string;
  originalName: string;
  size: number;
  fileUrl: string;
  thumbnailUrl: string;
  pageNumber: number;
}

/**
 * 앨범수리 교체페이지 파일 1개 업로드
 */
export function uploadRepairFile(
  file: File,
  tempRepairId: string,
  pageNumber: number,
  token: string | null,
  onProgress?: (percent: number) => void,
): Promise<RepairFileResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('tempRepairId', tempRepairId);
    formData.append('pageNumber', String(pageNumber));
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
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Invalid response'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new DOMException('Upload cancelled', 'AbortError')));

    xhr.open('POST', `${API_BASE}/api/v1/upload/repair-file`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });
}

// ===== Presigned URL 직접 업로드 (B2 Direct Upload) =====

export interface PresignedUploadRequest {
  tempFolderId: string;
  folderName: string;
  sortOrder: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  width: number;
  height: number;
  widthInch: number;
  heightInch: number;
  dpi: number;
}

export interface PresignedUploadResponse {
  presignedUrl: string;
  b2Key: string;
  tempFileId: string;
  fileName: string;
  thumbnailUrl: string;
  sortOrder: number;
  expiresAt: string;
}

/**
 * 서버에서 B2 presigned PUT URL 발급
 */
export async function requestPresignedUrl(
  request: PresignedUploadRequest,
  token: string | null,
): Promise<PresignedUploadResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/upload/album-file-presign`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
  } catch (err) {
    throw new UploadError(
      `Presigned URL 요청 네트워크 오류: ${(err as Error).message}`,
      'network',
      undefined,
      true,
    );
  }

  if (!res.ok) {
    let bodyText = '';
    try {
      bodyText = await res.text();
    } catch {
      // ignore
    }
    const msg = parseErrorResponse(bodyText, res.status, res.statusText);
    // 400은 B2 미설정 등 서버 설정 문제 → 폴백 트리거용으로 retriable=false
    const retriable = res.status === 0 || res.status === 429 || res.status >= 500;
    const kind = res.status >= 500 ? 'server' : res.status === 400 ? 'server' : 'client';
    throw new UploadError(msg, kind, res.status, retriable);
  }

  try {
    return await res.json();
  } catch {
    throw new UploadError('Presigned URL 응답을 파싱할 수 없습니다.', 'server', res.status, true);
  }
}

/**
 * B2에 파일 직접 PUT 업로드 (서버 경유 없음)
 */
export function uploadToB2Direct(
  presignedUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload cancelled', 'AbortError'));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort, { once: true });

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      signal?.removeEventListener('abort', onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        const msg = parseErrorResponse(xhr.responseText, xhr.status, xhr.statusText);
        const retriable = xhr.status === 0 || xhr.status === 429 || xhr.status >= 500;
        const kind = xhr.status >= 500 ? 'server' : 'client';
        reject(new UploadError(`B2 직접 업로드 실패: ${msg}`, kind, xhr.status, retriable));
      }
    });

    xhr.addEventListener('error', () => {
      signal?.removeEventListener('abort', onAbort);
      reject(new UploadError('B2 직접 업로드 네트워크 오류', 'network', undefined, true));
    });
    xhr.addEventListener('timeout', () => {
      signal?.removeEventListener('abort', onAbort);
      reject(new UploadError('B2 직접 업로드 타임아웃', 'timeout', undefined, true));
    });
    xhr.addEventListener('abort', () => {
      signal?.removeEventListener('abort', onAbort);
      reject(new UploadError('업로드가 취소되었습니다.', 'abort', undefined, false));
    });

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });
}

/**
 * 서버에 B2 업로드 완료 알림
 */
export async function confirmPresignedUpload(
  params: {
    tempFolderId: string;
    b2Key: string;
    fileName: string;
    originalName: string;
    sortOrder: number;
    fileSize: number;
    width: number;
    height: number;
    widthInch: number;
    heightInch: number;
    dpi: number;
  },
  token: string | null,
): Promise<UploadedFileResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/upload/album-file-confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
  } catch (err) {
    throw new UploadError(
      `Confirm 요청 네트워크 오류: ${(err as Error).message}`,
      'network',
      undefined,
      true,
    );
  }

  if (!res.ok) {
    let bodyText = '';
    try {
      bodyText = await res.text();
    } catch {
      // ignore
    }
    const msg = parseErrorResponse(bodyText, res.status, res.statusText);
    const retriable = res.status === 0 || res.status === 429 || res.status >= 500;
    const kind = res.status >= 500 ? 'server' : 'client';
    throw new UploadError(`업로드 확인 실패: ${msg}`, kind, res.status, retriable);
  }

  try {
    return await res.json();
  } catch {
    throw new UploadError('Confirm 응답을 파싱할 수 없습니다.', 'server', res.status, true);
  }
}

/**
 * 3단계 통합: presign 발급 → B2 직접 업로드 → 서버 confirm
 * 실패 시 UploadError를 던짐
 */
export async function uploadAlbumFilePresigned(
  file: File,
  metadata: AlbumFileMetadata,
  token: string | null,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<UploadedFileResult> {
  if (signal?.aborted) {
    throw new DOMException('Upload cancelled', 'AbortError');
  }

  const contentType = file.type || 'image/jpeg';

  // 1단계: presigned URL 발급
  let presigned: PresignedUploadResponse;
  try {
    presigned = await requestPresignedUrl(
      {
        tempFolderId: metadata.tempFolderId,
        folderName: metadata.folderName,
        sortOrder: metadata.sortOrder,
        fileName: metadata.fileName,
        contentType,
        fileSize: metadata.fileSize,
        width: metadata.width,
        height: metadata.height,
        widthInch: metadata.widthInch,
        heightInch: metadata.heightInch,
        dpi: metadata.dpi,
      },
      token,
    );
  } catch (err) {
    if (err instanceof UploadError) {
      // presigned URL 발급 자체가 실패하면 폴백 트리거: retriable=false 로 강제
      if (err.kind === 'server' && err.status === 400) {
        throw new UploadError(err.message, 'server', err.status, false);
      }
      throw err;
    }
    throw new UploadError(
      `Presigned URL 발급 실패: ${(err as Error).message}`,
      'server',
      undefined,
      false,
    );
  }

  if (signal?.aborted) {
    throw new DOMException('Upload cancelled', 'AbortError');
  }

  // 2단계: B2 직접 업로드
  try {
    await uploadToB2Direct(presigned.presignedUrl, file, contentType, onProgress, signal);
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') throw err;
    if (err instanceof UploadError) throw err;
    throw new UploadError(
      `B2 업로드 실패: ${(err as Error).message}`,
      'network',
      undefined,
      true,
    );
  }

  if (signal?.aborted) {
    throw new DOMException('Upload cancelled', 'AbortError');
  }

  // 3단계: 서버 confirm
  try {
    const result = await confirmPresignedUpload(
      {
        tempFolderId: metadata.tempFolderId,
        b2Key: presigned.b2Key,
        fileName: presigned.fileName,
        originalName: metadata.fileName,
        sortOrder: metadata.sortOrder,
        fileSize: metadata.fileSize,
        width: metadata.width,
        height: metadata.height,
        widthInch: metadata.widthInch,
        heightInch: metadata.heightInch,
        dpi: metadata.dpi,
      },
      token,
    );
    return result;
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError(
      `업로드 확인 실패: ${(err as Error).message}`,
      'server',
      undefined,
      true,
    );
  }
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

/**
 * 파일 저장 유틸리티
 * - saveToFolder: File System Access API로 폴더에 저장
 * - fallbackDownload: 다운로드 폴백
 * - requestWritePermission: 쓰기 권한 요청
 */

export async function saveToFolder(
  directoryHandle: FileSystemDirectoryHandle,
  blob: Blob,
  filename: string,
): Promise<boolean> {
  if (!directoryHandle) return false;
  try {
    const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (err) {
    console.error('파일 저장 오류:', err);
    return false;
  }
}

export function fallbackDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export async function requestWritePermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    const currentPermission = await (handle as any).queryPermission({ mode: 'readwrite' });
    if (currentPermission === 'granted') return true;
    const permission = await (handle as any).requestPermission({ mode: 'readwrite' });
    return permission === 'granted';
  } catch {
    return false;
  }
}

/** 폴더 선택 다이얼로그 (File System Access API) */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!('showDirectoryPicker' in window)) return null;
  try {
    return await (window as any).showDirectoryPicker({ mode: 'readwrite' });
  } catch {
    return null;
  }
}

/** 이미지 파일 여부 판별 (MIME type + 확장자 fallback) */
export function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  // Windows 드래그 앤 드롭 시 file.type이 빈 문자열일 수 있음
  const name = file.name.toLowerCase();
  return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp') || name.endsWith('.bmp') || name.endsWith('.gif');
}

/** JPEG/PNG 파일 여부 판별 (MIME type + 확장자 fallback) */
export function isJpegOrPng(file: File): boolean {
  if (file.type === 'image/jpeg' || file.type === 'image/png') return true;
  const name = file.name.toLowerCase();
  return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png');
}

/** 이미지 파일 선택 다이얼로그 */
export async function pickImageFile(): Promise<{ file: File; handle?: FileSystemFileHandle } | null> {
  if ('showOpenFilePicker' in window) {
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [{ description: '이미지 파일', accept: { 'image/*': ['.jpg', '.jpeg', '.png'] } }],
        multiple: false,
      });
      const file = await fileHandle.getFile();
      return { file, handle: fileHandle };
    } catch {
      return null;
    }
  }
  return null;
}

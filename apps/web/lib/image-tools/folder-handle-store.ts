/**
 * IndexedDB 기반 FileSystemDirectoryHandle 영구 저장소.
 * 브라우저 세션을 넘어 폴더 권한 핸들을 기억해 자동저장 다이얼로그를 제거한다.
 */

const DB_NAME = 'photocafe-image-tools';
const STORE = 'folder-handles';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFolderHandle(key: string, handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(handle, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IDB 사용 불가 환경 (Private 모드 등) — 조용히 무시
  }
}

export async function getFolderHandle(key: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return handle;
  } catch {
    return null;
  }
}

export async function clearFolderHandle(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

/** 저장된 핸들의 현재 읽기/쓰기 권한 상태 확인 */
export async function queryHandlePermission(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
  try {
    return await (handle as any).queryPermission({ mode: 'readwrite' });
  } catch {
    return 'denied';
  }
}

/** 사용자 제스처 컨텍스트에서 권한 요청 (이미 허용됐다면 즉시 granted 반환) */
export async function requestHandlePermission(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
  try {
    return await (handle as any).requestPermission({ mode: 'readwrite' });
  } catch {
    return 'denied';
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 다중 폴더 캐시 — 파일 출처 폴더별로 다른 저장 위치 자동 매칭
// ─────────────────────────────────────────────────────────────────────────

const MULTI_KEY = 'cached-folders-list';

export async function getAllFolderHandles(): Promise<FileSystemDirectoryHandle[]> {
  try {
    const db = await openDB();
    const result = await new Promise<FileSystemDirectoryHandle[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(MULTI_KEY);
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return [];
  }
}

/** 캐시에 폴더 추가 (이미 존재하면 무시) */
export async function addFolderHandleToCache(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const all = await getAllFolderHandles();
    for (const existing of all) {
      try {
        if (await existing.isSameEntry(handle)) return;
      } catch { /* 무시 */ }
    }
    all.push(handle);
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(all, MULTI_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* 무시 */ }
}

export async function clearAllFolderHandles(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(MULTI_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* 무시 */ }
}

/**
 * 주어진 파일 핸들을 포함하는 캐시 폴더 검색.
 * `FileSystemDirectoryHandle.resolve()` 를 사용하므로 권한 없이도 동작.
 */
export async function findFolderForFile(
  fileHandle: FileSystemFileHandle,
  folders?: FileSystemDirectoryHandle[],
): Promise<FileSystemDirectoryHandle | null> {
  const list = folders ?? await getAllFolderHandles();
  for (const folder of list) {
    try {
      const path = await (folder as any).resolve(fileHandle);
      if (path && path.length > 0) return folder;
    } catch { /* 다음 폴더 시도 */ }
  }
  return null;
}

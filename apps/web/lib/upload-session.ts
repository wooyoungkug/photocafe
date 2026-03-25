/**
 * 즉시 서버 업로드 세션 관리 (localStorage 기반)
 * 새로고침 시 서버에 업로드된 파일을 복원하기 위한 세션 정보 저장
 */

import type { PageLayoutType, BindingDirection, CoverSourceType } from '@/stores/multi-folder-upload-store';

export interface UploadSessionFolderMeta {
  pageLayout: PageLayoutType;
  bindingDirection: BindingDirection | null;
  albumWidth: number;
  albumHeight: number;
  albumLabel: string;
  fileSpecWidth: number;
  fileSpecHeight: number;
  fileSpecLabel: string;
  specLabel: string;
  dpi: number;
  pageCount: number;
  quantity: number;
  coverSourceType: CoverSourceType | null;
  coverAutoDetected: boolean;
  printMethod?: 'indigo' | 'inkjet';
  colorMode?: '4c' | '6c';
  selectedPaperId?: string | null;
  selectedPaperName?: string | null;
  specificationId?: string;
  selectedFabricId?: string | null;
  selectedFabricName?: string | null;
  selectedFabricThumbnail?: string | null;
  selectedFabricPrice?: number | null;
  selectedFabricCategory?: string | null;
  selectedFabricColorCode?: string | null;
  selectedFabricColorName?: string | null;
  foilName?: string | null;
  foilColor?: string | null;
  foilPosition?: string | null;
}

export interface UploadSessionFolder {
  folderId: string;
  tempFolderId: string;
  folderName: string;
  uploadStatus: 'uploading' | 'completed' | 'partial';
  uploadedFileCount: number;
  totalFileCount: number;
  folderMeta: UploadSessionFolderMeta;
  createdAt: number;
}

export interface UploadSession {
  sessionId: string;
  productId: string;
  folders: UploadSessionFolder[];
  createdAt: number;
}

const SESSION_KEY_PREFIX = 'upload-session-';

function getKey(productId: string): string {
  return `${SESSION_KEY_PREFIX}${productId}`;
}

export function loadUploadSession(productId: string): UploadSession | null {
  try {
    const raw = localStorage.getItem(getKey(productId));
    if (!raw) return null;
    return JSON.parse(raw) as UploadSession;
  } catch {
    return null;
  }
}

export function saveUploadSession(session: UploadSession): void {
  try {
    localStorage.setItem(getKey(session.productId), JSON.stringify(session));
  } catch {
    // localStorage full 등 무시
  }
}

export function updateSessionFolder(
  productId: string,
  folderId: string,
  updates: Partial<UploadSessionFolder>,
): void {
  const session = loadUploadSession(productId);
  if (!session) return;

  const idx = session.folders.findIndex(f => f.folderId === folderId);
  if (idx >= 0) {
    session.folders[idx] = { ...session.folders[idx], ...updates };
  }
  saveUploadSession(session);
}

export function addSessionFolder(
  productId: string,
  folder: UploadSessionFolder,
): void {
  let session = loadUploadSession(productId);
  if (!session) {
    session = {
      sessionId: `sess-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      productId,
      folders: [],
      createdAt: Date.now(),
    };
  }
  // 중복 방지
  const existing = session.folders.findIndex(f => f.folderId === folder.folderId);
  if (existing >= 0) {
    session.folders[existing] = folder;
  } else {
    session.folders.push(folder);
  }
  saveUploadSession(session);
}

export function removeSessionFolder(productId: string, folderId: string): void {
  const session = loadUploadSession(productId);
  if (!session) return;

  session.folders = session.folders.filter(f => f.folderId !== folderId);
  if (session.folders.length === 0) {
    clearUploadSession(productId);
  } else {
    saveUploadSession(session);
  }
}

export function clearUploadSession(productId: string): void {
  try {
    localStorage.removeItem(getKey(productId));
  } catch {
    // ignore
  }
}

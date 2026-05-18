'use client';

import { useEffect } from 'react';
import { useMultiFolderUploadStore } from '@/stores/multi-folder-upload-store';

/**
 * 업로드 중일 때 페이지 이탈 경고
 *
 * 어느 폴더든 immediateUploadStatus === 'uploading' 이면 beforeunload 핸들러를 등록.
 * 사용자가 탭 닫기 / 새로고침 / 뒤로가기 시도하면 브라우저 기본 경고 표시.
 */
export function useUploadBeforeUnload() {
  const hasUploading = useMultiFolderUploadStore((s) =>
    s.folders.some((f) => f.immediateUploadStatus === 'uploading'),
  );

  useEffect(() => {
    if (!hasUploading) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '업로드가 진행 중입니다. 지금 나가면 미완료 파일은 다시 올려야 합니다.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUploading]);
}

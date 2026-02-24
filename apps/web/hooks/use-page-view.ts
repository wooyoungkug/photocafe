'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { generateUUID } from '@/lib/utils';

function getOrCreateSessionId(): string {
  const KEY = 'analytics-session-id';
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = generateUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

export function usePageView() {
  const pathname = usePathname();
  const lastPath = useRef<string>('');

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    const sessionId = getOrCreateSessionId();

    api
      .post('/analytics/page-view', {
        path: pathname,
        title: document.title || pathname,
        referer: document.referrer || undefined,
        sessionId,
      })
      .catch(() => {
        // 접속 로그 실패는 무시
      });
  }, [pathname]);
}

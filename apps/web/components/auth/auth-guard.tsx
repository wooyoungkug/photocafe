'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  loginPath?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// 전역 인증 캐시 (페이지 이동 시에도 유지)
let authCache: { authenticated: boolean; timestamp: number } | null = null;
const AUTH_CACHE_DURATION = 30000; // 30초간 캐시 유지

// 인증 쿠키 기반 세션 복구 시도
async function tryRecoverSession(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include',
    });
    if (!res.ok) return false;
    await res.json().catch(() => ({}));

    return true;
  } catch {
    return false;
  }
}

export function AuthGuard({ children, requireAdmin = false, loginPath = '/admin-login' }: AuthGuardProps) {
  // 캐시된 인증 상태가 있으면 즉시 사용
  const initialStatus = authCache && (Date.now() - authCache.timestamp < AUTH_CACHE_DURATION) && authCache.authenticated
    ? 'authenticated'
    : 'loading';

  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthorized'>(initialStatus);
  const checkedRef = useRef(initialStatus === 'authenticated');

  useEffect(() => {
    // 이미 인증됨 상태면 스킵
    if (checkedRef.current && status === 'authenticated') return;
    if (typeof window === 'undefined') return;

    const checkAuth = async () => {
      try {
        let meRes = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
        if (!meRes.ok) {
          const recovered = await tryRecoverSession();
          if (!recovered) {
            console.warn('[AuthGuard] 인증 세션 없음 → 로그인 페이지로 이동');
            checkedRef.current = true;
            authCache = null;
            // 쿠키도 정리
              window.location.href = loginPath;
            return;
          }
          meRes = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
        }

        if (!meRes.ok) {
          console.warn('[AuthGuard] 토큰 복구 실패 → 로그인 페이지로 이동');
          checkedRef.current = true;
          authCache = null;
          // 쿠키도 정리
          window.location.href = loginPath;
          return;
        }

        // requireAdmin인 경우 auth-storage에서 role 확인
        if (requireAdmin) {
          const authStorage = localStorage.getItem('auth-storage') || sessionStorage.getItem('auth-storage');
          if (authStorage) {
            try {
              const parsed = JSON.parse(authStorage);
              const userRole = parsed?.state?.user?.role;
              if (userRole !== 'admin' && userRole !== 'staff') {
                setStatus('unauthorized');
                checkedRef.current = true;
                return;
              }
            } catch {
              // 파싱 실패시 무시
            }
          }
        }

        // 인증 성공 - 캐시에 저장
        authCache = { authenticated: true, timestamp: Date.now() };
        setStatus('authenticated');
        checkedRef.current = true;
      } catch {
        checkedRef.current = true;
        authCache = null;
        document.cookie = 'auth-verified=; path=/; max-age=0';
        window.location.href = loginPath;
      }
    };

    checkAuth();
  }, [requireAdmin, loginPath, status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-gray-500">로딩중...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한 없음</h1>
          <p className="text-gray-500 mb-6">관리자만 접근할 수 있는 페이지입니다</p>
          <button
            type="button"
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

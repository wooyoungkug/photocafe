'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  loginPath?: string;
}

// 전역 인증 캐시 (페이지 이동 시에도 유지)
let authCache: { authenticated: boolean; timestamp: number } | null = null;
const AUTH_CACHE_DURATION = 30000; // 30초간 캐시 유지

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

    // 즉시 체크 (딜레이 제거)
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

        if (!token) {
          checkedRef.current = true;
          authCache = null;
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
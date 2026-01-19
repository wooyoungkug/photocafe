'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthorized'>('loading');

  useEffect(() => {
    // 클라이언트에서만 실행
    if (typeof window === 'undefined') return;

    const checkAuth = () => {
      try {
        const token = localStorage.getItem('accessToken');

        if (!token) {
          // 로그인 페이지로 리다이렉트
          window.location.href = '/login';
          return;
        }

        if (requireAdmin) {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            const userRole = parsed?.state?.user?.role;

            if (userRole && userRole !== 'admin') {
              setStatus('unauthorized');
              return;
            }
          }
        }

        setStatus('authenticated');
      } catch (error) {
        console.error('AuthGuard error:', error);
        window.location.href = '/login';
      }
    };

    // 약간의 딜레이 후 체크 (hydration 완료 대기)
    const timer = setTimeout(checkAuth, 50);
    return () => clearTimeout(timer);
  }, [requireAdmin]);

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
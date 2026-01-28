'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthorized'>('loading');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // 클라이언트에서만 실행, 한 번만 체크
    if (typeof window === 'undefined' || checked) return;

    const checkAuth = () => {
      try {
        // localStorage와 sessionStorage에서 직접 토큰 확인
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

        console.log('[AuthGuard] 토큰 확인:', {
          hasToken: !!token,
          requireAdmin,
          token: token?.substring(0, 20) + '...',
        });

        if (!token) {
          console.log('[AuthGuard] 토큰 없음 - 로그인 페이지로 이동');
          setChecked(true);
          // 토큰이 없으면 로그인 페이지로
          window.location.href = '/login';
          return;
        }

        // requireAdmin인 경우 auth-storage에서 role 확인
        if (requireAdmin) {
          const authStorage = localStorage.getItem('auth-storage') || sessionStorage.getItem('auth-storage');
          if (authStorage) {
            try {
              const parsed = JSON.parse(authStorage);
              const userRole = parsed?.state?.user?.role;
              console.log('[AuthGuard] 사용자 role:', userRole);

              if (userRole !== 'admin') {
                console.log('[AuthGuard] 관리자 권한 없음');
                setStatus('unauthorized');
                setChecked(true);
                return;
              }
            } catch (e) {
              console.error('[AuthGuard] auth-storage 파싱 에러:', e);
            }
          }
        }

        console.log('[AuthGuard] 인증 성공');
        setStatus('authenticated');
        setChecked(true);
      } catch (error) {
        console.error('AuthGuard error:', error);
        setChecked(true);
        window.location.href = '/login';
      }
    };

    // 약간의 딜레이를 주어 storage가 준비될 시간 확보
    const timer = setTimeout(checkAuth, 100);
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
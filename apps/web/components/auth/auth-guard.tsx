'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'redirecting'>('loading');

  useEffect(() => {
    try {
      // 클라이언트에서 토큰 체크 (rehydrate는 Providers에서 처리)
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setStatus('redirecting');
        router.replace('/login');
      } else {
        setStatus('authenticated');
      }
    } catch (error) {
      console.error('AuthGuard error:', error);
      setStatus('redirecting');
      router.replace('/login');
    }
  }, [router]);

  // 로딩 중 또는 리다이렉트 중일 때
  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {status === 'redirecting' ? '로그인 페이지로 이동 중...' : '인증 확인 중...'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

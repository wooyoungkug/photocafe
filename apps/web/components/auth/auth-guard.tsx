'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
    } else {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, [router]);

  // 체크 중이면 children을 바로 렌더링 (깜빡임 방지)
  // 토큰 체크는 백그라운드에서 진행
  if (isChecking) {
    // SSR에서는 children 렌더링, 클라이언트에서 토큰 없으면 리다이렉트
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-gray-500">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

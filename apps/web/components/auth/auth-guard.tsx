'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, setLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // 클라이언트에서 hydration 후 체크
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.replace('/login');
      } else {
        setLoading(false);
        setIsChecking(false);
      }
    };

    // hydration 완료 후 체크
    checkAuth();
  }, [router, setLoading]);

  // 로딩 중이거나 체크 중일 때
  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 인증되지 않은 경우 (리다이렉트 중)
  if (!isAuthenticated && !localStorage.getItem('accessToken')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

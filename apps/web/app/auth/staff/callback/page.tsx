'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

function StaffCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('처리 중...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const oauthCode = searchParams.get('code');

    if (!oauthCode) {
      setError('잘못된 접근입니다. 로그인 페이지를 이용해주세요.');
      return;
    }

    // React Strict Mode 이중 실행 방지
    const processKey = `staff-auth-processing-${oauthCode}`;
    if (sessionStorage.getItem(processKey)) return;
    sessionStorage.setItem(processKey, 'true');

    const processAuth = async () => {
      try {
        setStatus('인증 처리 중...');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
        const res = await fetch(`${apiUrl}/auth/exchange-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: oauthCode }),
        });

        if (!res.ok) {
          throw new Error('인증 코드 교환에 실패했습니다.');
        }

        const data = await res.json();

        useAuthStore.getState().setAuth({
          user: {
            id: data.user?.id || '',
            email: data.user?.email || data.user?.staffId || '',
            name: data.user?.name || '직원',
            role: data.user?.role || 'admin',
            staffId: data.user?.staffId,
            isSuperAdmin: data.user?.isSuperAdmin ?? false,
          },
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          rememberMe: true,
        });

        sessionStorage.removeItem(processKey);
        setStatus('로그인 성공! 대시보드로 이동합니다...');

        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      } catch (e) {
        sessionStorage.removeItem(processKey);
        setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
      }
    };

    processAuth();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900">
        <div className="max-w-md w-full bg-red-900/30 border border-red-800/50 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">로그인 오류</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/admin-login')}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4" />
      <p className="text-slate-400">{status}</p>
    </div>
  );
}

export default function StaffCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4" />
          <p className="text-slate-400">로그인 처리 중...</p>
        </div>
      }
    >
      <StaffCallbackContent />
    </Suspense>
  );
}

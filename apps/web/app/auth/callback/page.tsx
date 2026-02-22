'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

function AuthCallbackContent() {
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

        // React Strict Mode 이중 실행 방지 (같은 코드로 중복 처리 차단)
        const processKey = `auth-processing-${oauthCode}`;
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

                // Zustand setAuth로 인증 상태 설정 (스토어 + persist 동시 처리)
                useAuthStore.getState().setAuth({
                    user: {
                        id: data.user?.id || '',
                        email: data.user?.email || '',
                        name: data.user?.name || '회원',
                        role: 'client',
                        ...(data.user?.clientId && { clientId: data.user.clientId }),
                        ...(data.user?.clientName && { clientName: data.user.clientName }),
                        ...(data.user?.mobile && { mobile: data.user.mobile }),
                    },
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                    rememberMe: true,
                });

                sessionStorage.removeItem(processKey);
                setStatus('로그인 성공! 쇼핑몰로 이동합니다...');

                // 클라이언트 사이드 내비게이션 (Zustand 인메모리 상태 유지)
                setTimeout(() => {
                    router.push('/');
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
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
                <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">로그인 오류</h2>
                    <p className="text-red-700 mb-4">{error}</p>
                    <button
                        type="button"
                        onClick={() => router.push('/login')}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        로그인 페이지로 이동
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">{status}</p>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">로그인 처리 중...</p>
                </div>
            }
        >
            <AuthCallbackContent />
        </Suspense>
    );
}

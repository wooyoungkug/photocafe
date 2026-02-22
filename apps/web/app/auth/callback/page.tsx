'use client';

import { useEffect, Suspense, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('처리 중...');
    const [error, setError] = useState<string | null>(null);
    const processedRef = useRef(false);

    useEffect(() => {
        if (processedRef.current) return;
        processedRef.current = true;

        const processAuth = async () => {
            try {
                const oauthCode = searchParams.get('code');

                let token = '';
                let refreshToken = '';
                let userData = { id: '', email: '', name: '회원', role: 'client' };
                let clientId = '';

                if (!oauthCode) {
                    // OAuth 코드 없이 접근 — 차단 (토큰 직접 전달 금지)
                    setError('잘못된 접근입니다. 로그인 페이지를 이용해주세요.');
                    return;
                }

                // OAuth 코드 교환 방식만 허용 (네이버/카카오)
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
                token = data.accessToken;
                refreshToken = data.refreshToken;
                userData = {
                    id: data.user?.id || '',
                    email: data.user?.email || '',
                    name: data.user?.name || '회원',
                    role: 'client',
                };
                clientId = data.user?.clientId || data.user?.id || '';

                localStorage.setItem('accessToken', token);

                // Zustand persist store 직접 업데이트
                const authStorageData = {
                    state: {
                        user: {
                            id: userData.id || '',
                            email: userData.email || '',
                            name: userData.name || (isImpersonated ? '회원' : '관리자'),
                            role: userData.role || (isImpersonated ? 'client' : 'admin'),
                            ...(clientId && { clientId }),
                        },
                        accessToken: token,
                        refreshToken: refreshToken,
                        isAuthenticated: true,
                        rememberMe: true,
                    },
                    version: 0,
                };
                localStorage.setItem('auth-storage', JSON.stringify(authStorageData));
                localStorage.setItem('refreshToken', refreshToken);

                setStatus('로그인 성공! 쇼핑몰로 이동합니다...');
                const redirectUrl = '/';

                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 300);

            } catch (e) {
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

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
        // 이미 처리됐으면 스킵
        if (processedRef.current) return;
        processedRef.current = true;

        const processAuth = async () => {
            try {
                // 'token' 또는 'accessToken' 둘 다 지원
                const token = searchParams.get('token') || searchParams.get('accessToken');
                const userParam = searchParams.get('user');
                const isImpersonated = searchParams.get('impersonated') === 'true';

                // 대리 로그인 시 URL 파라미터에서 사용자 정보 가져오기
                const userId = searchParams.get('userId') || '';
                const userName = searchParams.get('userName') || '';
                const userEmail = searchParams.get('userEmail') || '';

                if (!token) {
                    setError('토큰이 없습니다');
                    return;
                }

                // Store token in localStorage
                localStorage.setItem('accessToken', token);

                // Parse user data
                let userData = { id: '', email: '', name: '관리자', role: 'admin' };

                if (isImpersonated) {
                    // 대리 로그인: URL 파라미터에서 사용자 정보 구성
                    userData = {
                        id: userId,
                        email: userEmail,
                        name: userName || '회원',
                        role: 'client',
                    };
                    setStatus('회원으로 로그인 중...');
                } else if (userParam) {
                    try {
                        userData = JSON.parse(userParam);
                        localStorage.setItem('user', JSON.stringify(userData));
                        setStatus('로그인 성공! 대시보드로 이동합니다...');
                    } catch {
                        setStatus('사용자 정보 파싱 실패, 대시보드로 이동합니다...');
                    }
                }

                const refreshToken = searchParams.get('refreshToken') || '';

                // Zustand persist store 직접 업데이트 (AuthGuard에서 확인하는 auth-storage)
                const authStorageData = {
                    state: {
                        user: {
                            id: userData.id || '',
                            email: userData.email || '',
                            name: userData.name || (isImpersonated ? '회원' : '관리자'),
                            role: userData.role || (isImpersonated ? 'client' : 'admin'),
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

                // 대리 로그인이면 쇼핑몰로, 아니면 대시보드로 이동
                const redirectUrl = isImpersonated ? '/' : '/dashboard';
                setStatus(isImpersonated ? '쇼핑몰로 이동합니다...' : '대시보드로 이동합니다...');

                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 300);

            } catch (e) {
                console.error('Auth callback error:', e);
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

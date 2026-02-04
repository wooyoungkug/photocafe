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
                // Admin login callback params (from API login page)
                // 'token' 또는 'accessToken' 둘 다 지원
                const token = searchParams.get('token') || searchParams.get('accessToken');
                const userParam = searchParams.get('user');

                console.log('Auth callback - token exists:', !!token);
                console.log('Auth callback - user param exists:', !!userParam);

                if (!token) {
                    setError('토큰이 없습니다');
                    return;
                }

                // Store token in localStorage
                localStorage.setItem('accessToken', token);

                if (userParam) {
                    try {
                        // userParam은 이미 URLSearchParams에 의해 디코딩되어 있음
                        const userData = JSON.parse(userParam);
                        localStorage.setItem('user', JSON.stringify(userData));
                        setStatus('로그인 성공! 대시보드로 이동합니다...');
                    } catch (e) {
                        console.error('Failed to parse user data:', e);
                        setStatus('사용자 정보 파싱 실패, 대시보드로 이동합니다...');
                    }
                }

                // Parse user data
                let userData = { id: '', email: '', name: '관리자', role: 'admin' };
                if (userParam) {
                    try {
                        userData = JSON.parse(userParam);
                    } catch {
                        // Use default
                    }
                }

                const refreshToken = searchParams.get('refreshToken') || '';

                // Zustand persist store 직접 업데이트 (AuthGuard에서 확인하는 auth-storage)
                const authStorageData = {
                    state: {
                        user: {
                            id: userData.id || '',
                            email: userData.email || '',
                            name: userData.name || '관리자',
                            role: userData.role || 'admin',
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

                console.log('Auth data saved to localStorage');
                console.log('accessToken:', localStorage.getItem('accessToken'));
                console.log('auth-storage:', localStorage.getItem('auth-storage'));

                setStatus('로그인 완료! 대시보드로 이동합니다...');

                // Redirect to dashboard (use window.location for full page reload)
                setTimeout(() => {
                    window.location.href = '/dashboard';
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

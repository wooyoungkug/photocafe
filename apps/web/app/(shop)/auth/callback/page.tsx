'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2 } from 'lucide-react';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setAuth } = useAuthStore();

    useEffect(() => {
        // OAuth callback params
        let accessToken = searchParams.get('accessToken');
        let refreshToken = searchParams.get('refreshToken');
        const userId = searchParams.get('userId');
        const userName = searchParams.get('userName');
        const userEmail = searchParams.get('userEmail');

        // Admin login callback params (from API login page)
        const token = searchParams.get('token');
        const userParam = searchParams.get('user');

        // Handle admin login callback
        if (token) {
            accessToken = token;
            refreshToken = searchParams.get('refreshToken') || '';

            // Store tokens in localStorage for AuthGuard
            localStorage.setItem('accessToken', token);
            if (refreshToken) {
                localStorage.setItem('refreshToken', refreshToken);
            }

            if (userParam) {
                try {
                    const userData = JSON.parse(userParam);
                    localStorage.setItem('user', JSON.stringify(userData));

                    setAuth({
                        user: {
                            id: userData.id,
                            email: userData.email || '',
                            name: userData.name || '관리자',
                            role: userData.role || 'admin',
                        },
                        accessToken: token,
                        refreshToken: refreshToken || '',
                        rememberMe: true, // 백엔드 로그인은 항상 localStorage 사용
                    });

                    // Redirect to dashboard for admin
                    router.push('/dashboard');
                    return;
                } catch (e) {
                    console.error('Failed to parse user data:', e);
                }
            }
        }

        // Handle OAuth callback
        if (accessToken && refreshToken && userId) {
            // 로그인 상태 저장
            setAuth({
                user: {
                    id: userId,
                    email: userEmail || '',
                    name: userName || '사용자',
                    role: 'client',
                },
                accessToken,
                refreshToken,
                rememberMe: true, // OAuth 로그인도 localStorage 사용
            });

            // 메인 페이지로 리다이렉트
            router.push('/');
        } else if (!token) {
            // 토큰이 없으면 로그인 페이지로 리다이렉트
            router.push('/login?error=oauth_failed');
        }
    }, [searchParams, setAuth, router]);

    return (
        <div className="min-h-[calc(100vh-300px)] flex flex-col items-center justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">로그인 처리 중...</p>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-[calc(100vh-300px)] flex flex-col items-center justify-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">로그인 처리 중...</p>
                </div>
            }
        >
            <AuthCallbackContent />
        </Suspense>
    );
}

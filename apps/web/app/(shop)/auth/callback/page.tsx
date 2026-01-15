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
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const userId = searchParams.get('userId');
        const userName = searchParams.get('userName');
        const userEmail = searchParams.get('userEmail');

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
            });

            // 메인 페이지로 리다이렉트
            router.push('/');
        } else {
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

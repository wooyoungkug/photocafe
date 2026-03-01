'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, Loader2, User, Building2 } from 'lucide-react';

type LoginPhase = 'social' | 'context-selection';

interface LoginContext {
  type: 'personal' | 'employee';
  label?: string;
  clientName?: string;
  clientId?: string;
  employmentId?: string;
  companyClientId?: string;
  companyName?: string;
  role?: string;
  isOwner?: boolean;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { setAuth } = useAuthStore();

  const [phase, setPhase] = useState<LoginPhase>('social');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Context selection state
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [contexts, setContexts] = useState<LoginContext[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  // OAuth 콜백에서 컨텍스트 선택이 필요한 경우 처리
  useEffect(() => {
    const pendingData = sessionStorage.getItem('pending-context-selection');
    if (pendingData) {
      try {
        const { tempToken: token } = JSON.parse(pendingData);
        if (token) {
          setTempToken(token);
          loadContexts(token);
        }
      } catch {
        // ignore
      }
      sessionStorage.removeItem('pending-context-selection');
    }
  }, []);

  const loadContexts = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await api.get<{ contexts: LoginContext[] }>(
        `/auth/my-contexts?tempToken=${encodeURIComponent(token)}`,
      );
      if (response.contexts && response.contexts.length > 0) {
        setContexts(response.contexts);
        setPhase('context-selection');
      }
    } catch {
      setError('컨텍스트 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectContext = async (context: LoginContext) => {
    if (!tempToken) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await api.post<{
        user: { id: string; email: string; name: string; role: string; [key: string]: any };
        accessToken: string;
        refreshToken: string;
      }>('/auth/select-context', {
        tempToken,
        contextType: context.type,
        employmentId: context.type === 'employee' ? context.employmentId : undefined,
        rememberMe: true,
      });

      setAuth({
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        rememberMe: true,
      });

      const redirectTo = searchParams.get('redirect') || '/';
      router.push(redirectTo);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '로그인 컨텍스트 선택에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSocial = () => {
    setPhase('social');
    setTempToken(null);
    setContexts([]);
    setError(null);
  };

  // ============================================================
  // Phase: Context Selection
  // ============================================================
  if (phase === 'context-selection') {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <Link href="/" className="inline-block mb-4">
            <div className="w-12 h-12 bg-[#E4007F] rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
          </Link>
          <CardTitle className="text-2xl">계정 선택</CardTitle>
          <CardDescription>로그인할 계정을 선택해주세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {contexts.map((context, index) => (
            <Button
              key={context.type === 'personal' ? 'personal' : context.employmentId || index}
              variant="outline"
              className="w-full h-auto py-3 px-4 justify-start gap-3"
              disabled={isLoading}
              onClick={() => handleSelectContext(context)}
            >
              {context.type === 'personal' ? (
                <User className="h-5 w-5 text-muted-foreground shrink-0" />
              ) : (
                <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="text-left">
                {context.type === 'personal' ? (
                  <>
                    <div className="text-[14px] text-black font-normal">
                      내 계정 (개인 쇼핑몰)
                    </div>
                    {context.clientName && (
                      <div className="text-[12px] text-muted-foreground">
                        {context.clientName}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-[16px] text-blue-600 font-normal">
                      {context.companyName || ''}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {context.clientName} ({context.isOwner ? '최고관리자' : context.role === 'MANAGER' ? 'Manager' : context.role === 'EDITOR' ? 'Editor' : 'Staff'})
                    </div>
                  </>
                )}
              </div>
            </Button>
          ))}
        </CardContent>
        <CardFooter>
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleBackToSocial}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            돌아가기
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // ============================================================
  // Phase: Social Login (OAuth only)
  // ============================================================
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <Link href="/" className="inline-block mb-4">
          <div className="w-12 h-12 bg-[#E4007F] rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-2xl">P</span>
          </div>
        </Link>
        <CardTitle className="text-2xl">로그인</CardTitle>
        <CardDescription>Printing114에 오신 것을 환영합니다</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <a
          href={`${apiUrl}/auth/naver`}
          className="inline-flex items-center justify-center w-full h-12 rounded-md text-sm font-medium bg-[#03C75A] hover:bg-[#02b351] text-white transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            className="mr-2 h-5 w-5"
            fill="currentColor"
          >
            <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
          </svg>
          네이버로 로그인
        </a>

        <a
          href={`${apiUrl}/auth/kakao`}
          className="inline-flex items-center justify-center w-full h-12 rounded-md text-sm font-medium bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            className="mr-2 h-5 w-5"
            fill="currentColor"
          >
            <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.65 1.73 4.973 4.342 6.324-.143.532-.548 2.043-.623 2.359-.096.397.146.392.307.286.126-.083 2.016-1.368 2.838-1.925.698.103 1.43.157 2.136.157 5.523 0 10-3.463 10-7.691C21 6.463 17.523 3 12 3z" />
          </svg>
          카카오로 로그인
        </a>

        <a
          href={`${apiUrl}/auth/google`}
          className="inline-flex items-center justify-center w-full h-12 rounded-md text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            className="mr-2 h-5 w-5"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google로 로그인
        </a>
      </CardContent>

      <CardFooter className="flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground text-center">
          소셜 계정으로 간편하게 로그인하세요.<br />
          처음 로그인 시 자동으로 회원가입됩니다.
        </p>
        <Link href="/register" className="w-full">
          <Button variant="outline" className="w-full">
            회원가입
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function LoginFormFallback() {
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-2xl">P</span>
        </div>
        <CardTitle className="text-2xl">로그인</CardTitle>
        <CardDescription>Printing114에 오신 것을 환영합니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-300px)] flex items-center justify-center p-4">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

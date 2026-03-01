'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useClientLogin } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, Loader2, User, Building2, UserPlus, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const clientLogin = useClientLogin();

  const [phase, setPhase] = useState<LoginPhase>('social');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notRegistered, setNotRegistered] = useState(false);
  const [notRegisteredProvider, setNotRegisteredProvider] = useState<string | null>(null);
  const [justRegistered, setJustRegistered] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);

  // ID/password login state
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  // Context selection state
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [contexts, setContexts] = useState<LoginContext[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  const handleIdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginId || !password) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    try {
      const response = await clientLogin.mutateAsync({ loginId, password });

      if (response.needsContext && response.tempToken) {
        setTempToken(response.tempToken);
        await loadContexts(response.tempToken);
        return;
      }

      if (response.accessToken && response.user) {
        setAuth({
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken!,
          rememberMe: true,
        });
        const redirectTo = searchParams.get('redirect') || '/';
        router.push(redirectTo);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setError(errorMessage);
    }
  };

  // URL 에러 파라미터 감지 (미가입, 이메일 중복 등)
  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setJustRegistered(true);
    }
    const errorParam = searchParams.get('error');
    if (errorParam === 'NOT_REGISTERED') {
      setNotRegistered(true);
      setNotRegisteredProvider(searchParams.get('provider'));
    } else if (errorParam === 'EMAIL_DUPLICATE') {
      const message = searchParams.get('message');
      setError(message || '이미 다른 소셜 계정으로 가입된 이메일입니다.');
    }
  }, [searchParams]);

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
        {justRegistered && (
          <div className="p-4 rounded-md bg-green-50 border border-green-200 text-center">
            <p className="text-[14px] text-green-800 font-medium">
              회원가입이 완료되었습니다.
            </p>
            <p className="text-[13px] text-green-700 mt-1">
              아이디와 비밀번호로 로그인해주세요.
            </p>
          </div>
        )}

        {notRegistered && (
          <div className="p-4 rounded-md bg-amber-50 border border-amber-200 text-center">
            <AlertCircle className="h-5 w-5 text-amber-600 mx-auto" />
            <p className="text-[14px] text-amber-800 font-medium mt-2">
              가입되지 않은 계정입니다.
            </p>
            <p className="text-[13px] text-amber-700 mt-1">
              회원가입 후 이용해주세요.
            </p>
            {notRegisteredProvider ? (
              <Button
                size="sm"
                className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => setShowRegisterConfirm(true)}
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                {notRegisteredProvider === 'naver' ? '네이버' : notRegisteredProvider === 'kakao' ? '카카오' : 'Google'}로 회원가입하기
              </Button>
            ) : (
              <Link href="/register">
                <Button
                  size="sm"
                  className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  회원가입 하기
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* 소셜 회원가입 확인 다이얼로그 */}
        <Dialog open={showRegisterConfirm} onOpenChange={setShowRegisterConfirm}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-[18px] text-black font-bold">회원가입 확인</DialogTitle>
              <DialogDescription className="text-[14px] text-black font-normal">
                {notRegisteredProvider === 'naver' ? '네이버' : notRegisteredProvider === 'kakao' ? '카카오' : 'Google'} 계정으로 회원가입하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowRegisterConfirm(false)}
              >
                취소
              </Button>
              <a href={`${apiUrl}/auth/${notRegisteredProvider}`}>
                <Button className="bg-[#E4007F] hover:bg-[#C5006D] text-white">
                  회원가입
                </Button>
              </a>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {error && (
          <div className="p-4 rounded-md bg-red-50 border border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] text-red-800 font-medium">{error}</p>
                <p className="text-[13px] text-red-600 mt-1">
                  기존에 가입한 소셜 계정으로 로그인해주세요.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 아이디/비밀번호 로그인 - 소셜 미가입 상태에서는 숨김 */}
        {!notRegistered && (
          <>
            <form onSubmit={handleIdLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="loginId" className="text-[14px] text-black font-normal">아이디</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="loginId"
                    type="text"
                    placeholder="아이디 입력"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="pl-10 h-11"
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[14px] text-black font-normal">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="비밀번호 입력"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-[#E4007F] hover:bg-[#C5006D] text-white"
                disabled={clientLogin.isPending}
              >
                {clientLogin.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                로그인
              </Button>
            </form>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">또는</span>
              </div>
            </div>
          </>
        )}

        <a
          href={`${apiUrl}/auth/naver-login`}
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
          href={`${apiUrl}/auth/kakao-login`}
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
        <p className="text-[14px] text-black font-normal text-center">
          아직 회원이 아니신가요?
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

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle2, Loader2, Zap } from 'lucide-react';

const isDev = process.env.NODE_ENV === 'development';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');

  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.post<{
        user: { id: string; email: string; name: string; role: string };
        accessToken: string;
        refreshToken: string;
      }>('/auth/client/login', { email, password });

      setAuth({
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        rememberMe,
      });

      const redirectTo = searchParams.get('redirect') || '/';
      router.push(redirectTo);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNaverLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin;
    const redirectUri = encodeURIComponent(`${frontendUrl}/api/auth/callback/naver`);
    const state = Math.random().toString(36).substring(7);
    window.location.href = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
  };

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
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {registered && (
            <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 rounded-md">
              <CheckCircle2 className="h-4 w-4" />
              <span>회원가입이 완료되었습니다. 로그인해주세요.</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">비밀번호</Label>
              <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
                비밀번호 찾기
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
              로그인 상태 유지
            </label>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                로그인 중...
              </>
            ) : (
              '로그인'
            )}
          </Button>

          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                간편 로그인
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full bg-[#03C75A] hover:bg-[#02b351] text-white hover:text-white border-0"
            size="lg"
            onClick={() => {
              window.location.href = `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/auth/naver`;
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="mr-2 h-5 w-5"
              fill="currentColor"
            >
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
            </svg>
            네이버로 로그인
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            아직 회원이 아니신가요?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              회원가입
            </Link>
          </p>


          <Button
            type="button"
            variant="outline"
            className="w-full bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] border-0"
            onClick={() => {
              window.location.href = `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/auth/kakao`;
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="mr-2 h-5 w-5"
              fill="currentColor"
            >
              <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.65 1.73 4.973 4.342 6.324-.143.532-.548 2.043-.623 2.359-.096.397.146.392.307.286.126-.083 2.016-1.368 2.838-1.925.698.103 1.43.157 2.136.157 5.523 0 10-3.463 10-7.691C21 6.463 17.523 3 12 3z" />
            </svg>
            카카오로 로그인
          </Button>

          {isDev && (
            <Button
              type="button"
              variant="outline"
              className="w-full border-amber-500/50 bg-amber-50 text-amber-700 hover:bg-amber-100"
              size="sm"
              disabled={isLoading}
              onClick={async () => {
                setError(null);
                setIsLoading(true);
                try {
                  const response = await api.post<{
                    user: { id: string; email: string; name: string; role: string };
                    accessToken: string;
                    refreshToken: string;
                  }>('/auth/client/login', {
                    email: process.env.NEXT_PUBLIC_DEV_CLIENT_EMAIL || '',
                    password: process.env.NEXT_PUBLIC_DEV_CLIENT_PASSWORD || '',
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
                  const errorMessage = err instanceof Error ? err.message : '개발 로그인 실패';
                  setError(errorMessage);
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              <Zap className="mr-2 h-4 w-4" />
              DEV 빠른 로그인
            </Button>
          )}
        </CardFooter>
      </form>
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

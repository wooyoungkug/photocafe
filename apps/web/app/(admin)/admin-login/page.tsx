'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || '/api/v1';
}


export default function AdminLoginPage() {
  const router = useRouter();
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiUrl = getApiUrl();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/auth/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ staffId, password }),
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await res.json()
        : { message: 'API 응답 형식이 올바르지 않습니다. 관리자에게 문의해주세요.' };

      if (!res.ok) {
        throw new Error(data.message || '로그인에 실패했습니다');
      }

      useAuthStore.getState().setAuth({
        user: {
          id: data.user?.id || '',
          email: data.user?.email || '',
          name: data.user?.name || '직원',
          role: data.user?.role || 'admin',
          staffId: data.user?.staffId,
          isSuperAdmin: data.user?.isSuperAdmin ?? false,
        },
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        rememberMe: true,
      });

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-900/50 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <Image
              src="/images/photocafe_logo_v3.png"
              alt="PhotoCafe"
              width={220}
              height={66}
              priority
              className="h-[66px] w-auto"
            />
          </div>
          <CardTitle className="text-2xl text-white">관리자 로그인</CardTitle>
          <CardDescription className="text-slate-400">
            직원 ID/비밀번호로 로그인하세요
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-900/30 border border-red-800/50 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* admin-login 전용 form. 브라우저의 일반 사용자 이메일/비밀번호 자동완성을
              방지하기 위해 name 을 staff 전용으로 두고 autoComplete=off. */}
          {/* 소셜 로그인 */}
          <div className="space-y-2">
            <a
              href={`${apiUrl}/auth/staff/naver`}
              className="inline-flex items-center justify-center w-full h-11 rounded-md text-sm font-medium bg-[#03C75A] hover:bg-[#02b351] text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" fill="currentColor">
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
              </svg>
              네이버로 로그인
            </a>
            <a
              href={`${apiUrl}/auth/staff/kakao`}
              className="inline-flex items-center justify-center w-full h-11 rounded-md text-sm font-medium bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.65 1.73 4.973 4.342 6.324-.143.532-.548 2.043-.623 2.359-.096.397.146.392.307.286.126-.083 2.016-1.368 2.838-1.925.698.103 1.43.157 2.136.157 5.523 0 10-3.463 10-7.691C21 6.463 17.523 3 12 3z" />
              </svg>
              카카오로 로그인
            </a>
            <a
              href={`${apiUrl}/auth/staff/google`}
              className="inline-flex items-center justify-center w-full h-11 rounded-md text-sm font-medium border border-slate-600 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google로 로그인
            </a>
          </div>

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900/50 px-2 text-slate-500">또는 ID로 로그인</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
            <Input
              name="staffLoginId"
              placeholder="직원 ID"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              autoComplete="off"
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              disabled={isLoading}
            />
            <Input
              type="password"
              name="staffLoginPw"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isLoading || !staffId || !password}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              로그인
            </Button>
          </form>

        </CardContent>

        <CardFooter />
      </Card>
    </div>
  );
}

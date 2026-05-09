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
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('photocafe.co.kr')) {
    return 'https://api.photocafe.co.kr/api/v1';
  }
  return 'http://localhost:3001/api/v1';
}


export default function AdminLoginPage() {
  const router = useRouter();
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
              src="/images/photocafe_logo_v2.png"
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
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isLoading || !staffId || !password}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              로그인
            </Button>
          </form>

        </CardContent>

        <CardFooter />
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

function resolveApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window === 'undefined') return '/api/v1';
  // 운영 환경에서 env 누락 시 프론트 도메인 상대경로 대신 API 도메인으로 강제
  if (window.location.hostname.endsWith('photocafe.co.kr')) {
    return 'https://api.photocafe.co.kr/api/v1';
  }
  return '/api/v1';
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
      const apiUrl = resolveApiUrl();
      const res = await fetch(`${apiUrl}/auth/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/30">
            <Shield className="w-8 h-8 text-white" />
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

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              placeholder="직원 ID"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              disabled={isLoading}
            />
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

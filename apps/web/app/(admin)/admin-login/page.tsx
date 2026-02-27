'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Loader2, Shield, Zap } from 'lucide-react';

const isDev = process.env.NODE_ENV === 'development';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface StaffLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    staffId: string;
    name: string;
    role: string;
    email?: string;
    isSuperAdmin?: boolean;
    branch?: { id: string; branchCode: string; branchName: string };
    department?: { id: string; code: string; name: string };
  };
}

export default function AdminLoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 개발 환경 자동 로그인
  useEffect(() => {
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === 'true'
    ) {
      const autoLogin = async () => {
        try {
          setIsLoading(true);
          const devId = process.env.NEXT_PUBLIC_DEV_ADMIN_ID;
          const devPw = process.env.NEXT_PUBLIC_DEV_ADMIN_PASSWORD;
          if (!devId || !devPw) { setIsLoading(false); return; }
          const response = await api.post<StaffLoginResponse>('/auth/admin/login', {
            staffId: devId,
            password: devPw,
            rememberMe: true,
          });

          setAuth({
            user: {
              id: response.user.id,
              email: response.user.email || response.user.staffId,
              name: response.user.name,
              role: response.user.role,
              staffId: response.user.staffId,
              isSuperAdmin: response.user.isSuperAdmin ?? false,
            },
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            rememberMe: true,
          });

          router.push('/dashboard');
        } catch {
          // 자동 로그인 실패 시 수동 로그인 폼 표시
          setIsLoading(false);
        }
      };
      autoLogin();
      return;
    }

    // 컴포넌트 마운트 시 저장된 로그인 정보 불러오기
    if (typeof window !== 'undefined') {
      const savedStaffId = localStorage.getItem('savedStaffId');
      const savedRememberMe = localStorage.getItem('savedRememberMe') === 'true';

      if (savedRememberMe && savedStaffId) {
        setStaffId(savedStaffId);
        setRememberMe(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.post<StaffLoginResponse>('/auth/admin/login', {
        staffId,
        password,
        rememberMe,
      });

      // 로그인 정보 저장 (rememberMe가 true일 때만)
      if (typeof window !== 'undefined') {
        if (rememberMe) {
          localStorage.setItem('savedStaffId', staffId);
          localStorage.setItem('savedRememberMe', 'true');
        } else {
          localStorage.removeItem('savedStaffId');
          localStorage.removeItem('savedRememberMe');
        }
      }

      setAuth({
        user: {
          id: response.user.id,
          email: response.user.email || response.user.staffId,
          name: response.user.name,
          role: response.user.role,
          staffId: response.user.staffId,
          isSuperAdmin: response.user.isSuperAdmin ?? false,
        },
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        rememberMe,
      });

      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setError(errorMessage);
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
            직원 ID와 비밀번호를 입력하세요
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-900/30 border border-red-800/50 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="staffId" className="text-slate-200">
                직원 ID
              </Label>
              <Input
                id="staffId"
                type="text"
                placeholder="직원 ID를 입력하세요"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                required
                autoComplete="username"
                disabled={isLoading}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">
                비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                className="border-slate-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
              />
              <label
                htmlFor="remember"
                className="text-sm text-slate-400 cursor-pointer select-none"
              >
                로그인 상태 유지
              </label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              size="lg"
              disabled={isLoading}
            >
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
                <span className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-900 px-2 text-slate-500">또는</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-400 text-center">
                처음 방문이신가요? 소셜 로그인으로 가입 요청
              </p>
              <div className="flex gap-2">
                <a
                  href={`${API_URL}/auth/staff/naver`}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-medium text-white transition-colors bg-[#03C75A]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/></svg>
                  네이버
                </a>
                <a
                  href={`${API_URL}/auth/staff/kakao`}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-medium text-black/85 transition-colors bg-[#FEE500]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.735 1.81 5.13 4.534 6.487l-1.15 4.23a.3.3 0 00.462.334l4.96-3.278c.39.032.785.05 1.194.05 5.523 0 10-3.463 10-7.732S17.523 3 12 3"/></svg>
                  카카오
                </a>
                <a
                  href={`${API_URL}/auth/staff/google`}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-medium text-slate-200 border border-slate-600 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  구글
                </a>
              </div>
            </div>

            {isDev && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-amber-600/50 bg-amber-900/20 text-amber-400 hover:bg-amber-900/40 hover:text-amber-300"
                size="sm"
                disabled={isLoading}
                onClick={async () => {
                  setError(null);
                  setIsLoading(true);
                  try {
                    const response = await api.post<StaffLoginResponse>('/auth/admin/login', {
                      staffId: process.env.NEXT_PUBLIC_DEV_ADMIN_ID || '',
                      password: process.env.NEXT_PUBLIC_DEV_ADMIN_PASSWORD || '',
                      rememberMe: true,
                    });
                    setAuth({
                      user: {
                        id: response.user.id,
                        email: response.user.email || response.user.staffId,
                        name: response.user.name,
                        role: response.user.role,
                        staffId: response.user.staffId,
                        isSuperAdmin: response.user.isSuperAdmin ?? false,
                      },
                      accessToken: response.accessToken,
                      refreshToken: response.refreshToken,
                      rememberMe: true,
                    });
                    router.push('/dashboard');
                  } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : '개발 로그인 실패';
                    setError(errorMessage);
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                <Zap className="mr-2 h-4 w-4" />
                DEV 빠른 로그인 (admin)
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

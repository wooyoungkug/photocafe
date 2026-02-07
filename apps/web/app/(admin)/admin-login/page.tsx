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
import { AlertCircle, Loader2, Shield } from 'lucide-react';

interface StaffLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    staffId: string;
    name: string;
    role: string;
    email?: string;
    branch?: { id: string; branchCode: string; branchName: string };
    department?: { id: string; code: string; name: string };
  };
}

export default function AdminLoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 컴포넌트 마운트 시 저장된 로그인 정보 불러오기
  useEffect(() => {
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

            <p className="text-xs text-slate-500 text-center">
              직원 계정이 없으시면 관리자에게 문의하세요
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

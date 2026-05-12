'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useResetPassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, Lock } from 'lucide-react';

function ResetPasswordCardShell({ children, description }: { children: React.ReactNode; description?: string }) {
  return (
    <div className="min-h-[calc(100vh-300px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-[400px] shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4 mx-auto">
            <div className="w-12 h-12 bg-[#E4007F] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
            <Image
              src="/images/photocafe-logo.png"
              alt="Photocafe"
              width={2363}
              height={626}
              priority
              className="h-[40px] w-auto"
            />
          </Link>
          <CardTitle className="text-[18px] text-black font-bold">비밀번호 재설정</CardTitle>
          {description && (
            <CardDescription className="text-[14px] text-black font-normal">{description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </div>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const resetPassword = useResetPassword();

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <ResetPasswordCardShell>
        <div className="p-4 rounded-md bg-amber-50 border border-amber-200 text-center">
          <AlertCircle className="h-5 w-5 text-amber-600 mx-auto" />
          <p className="text-[14px] text-amber-800 font-medium mt-2">
            잘못된 접근입니다. 비밀번호 찾기를 다시 시도해 주세요.
          </p>
        </div>
        <Link href="/forgot-password" className="block">
          <Button className="w-full h-11 bg-[#E4007F] hover:bg-[#C5006D] text-white">비밀번호 찾기</Button>
        </Link>
      </ResetPasswordCardShell>
    );
  }

  if (done) {
    return (
      <ResetPasswordCardShell>
        <div className="p-4 rounded-md bg-green-50 border border-green-200 text-center">
          <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
          <p className="text-[14px] text-green-800 font-medium mt-2">
            비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.
          </p>
        </div>
        <Link href="/login" className="block">
          <Button className="w-full h-11 bg-[#E4007F] hover:bg-[#C5006D] text-white">로그인 페이지로</Button>
        </Link>
      </ResetPasswordCardShell>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    try {
      await resetPassword.mutateAsync({ token, newPassword: password });
      setDone(true);
    } catch {
      setError('만료되었거나 잘못된 링크입니다. 비밀번호 찾기를 다시 시도해 주세요.');
    }
  };

  const linkExpired = error === '만료되었거나 잘못된 링크입니다. 비밀번호 찾기를 다시 시도해 주세요.';

  return (
    <ResetPasswordCardShell description="새로 사용할 비밀번호를 입력해 주세요.">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 text-[14px] text-red-800 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            {linkExpired && (
              <Link href="/forgot-password" className="block text-center">
                <span className="text-[13px] text-blue-700 underline">비밀번호 찾기 다시 시도</span>
              </Link>
            )}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[14px] text-black font-normal">새 비밀번호</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="password"
              type="password"
              placeholder="새 비밀번호 입력 (8자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-11"
              autoComplete="new-password"
              autoFocus
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="passwordConfirm" className="text-[14px] text-black font-normal">비밀번호 확인</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="passwordConfirm"
              type="password"
              placeholder="비밀번호 다시 입력"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="pl-10 h-11"
              autoComplete="new-password"
            />
          </div>
        </div>
        <Button
          type="submit"
          className="w-full h-11 bg-[#E4007F] hover:bg-[#C5006D] text-white"
          disabled={resetPassword.isPending}
        >
          {resetPassword.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          비밀번호 재설정
        </Button>
      </form>
      <div className="text-center">
        <Link href="/login" className="text-[13px] text-gray-500 hover:text-gray-700 underline">
          로그인 페이지로
        </Link>
      </div>
    </ResetPasswordCardShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-300px)] flex items-center justify-center p-4">
          <Card className="w-full max-w-[400px] shadow-lg">
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

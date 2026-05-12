'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForgotPassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const [loginId, setLoginId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = loginId.trim();
    if (!trimmed) {
      setError('아이디(이메일)를 입력해 주세요.');
      return;
    }
    try {
      const res = await forgotPassword.mutateAsync({ loginId: trimmed });
      setSentEmail(res?.maskedEmail || '');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '메일 발송에 실패했습니다.';
      setError(message);
    }
  };

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
          <CardTitle className="text-[18px] text-black font-bold">비밀번호 찾기</CardTitle>
          <CardDescription className="text-[14px] text-black font-normal">
            가입 시 사용한 아이디(이메일)를 입력하시면 재설정 링크를 보내드립니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {sentEmail !== null ? (
            <div className="space-y-4">
              <div className="p-4 rounded-md bg-green-50 border border-green-200 text-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                <p className="text-[14px] text-green-800 font-medium mt-2 leading-relaxed">
                  {sentEmail ? <strong>{sentEmail}</strong> : '입력하신 이메일'} 으로 재설정 링크를 발송했습니다.
                </p>
                <p className="text-[13px] text-green-700 mt-1">메일함을 확인해 주세요. (1시간 유효)</p>
              </div>
              <Link href="/login" className="block">
                <Button className="w-full h-11 bg-[#E4007F] hover:bg-[#C5006D] text-white">
                  로그인 페이지로
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="flex items-center gap-2 p-3 text-[14px] text-red-800 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="loginId" className="text-[14px] text-black font-normal">
                  아이디(이메일)
                </Label>
                <Input
                  id="loginId"
                  type="text"
                  placeholder="아이디(이메일) 입력"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="h-11"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-[#E4007F] hover:bg-[#C5006D] text-white"
                disabled={forgotPassword.isPending}
              >
                {forgotPassword.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                재설정 메일 발송
              </Button>
            </form>
          )}

          <div className="text-center">
            <Link href="/login" className="text-[13px] text-gray-500 hover:text-gray-700 underline">
              로그인 페이지로
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

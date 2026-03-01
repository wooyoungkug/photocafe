'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useClientRegister, useCheckLoginId } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, User, Lock, UserPlus, Phone, Mail, LogIn } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = useClientRegister();
  const checkLoginId = useCheckLoginId();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loginIdChecked, setLoginIdChecked] = useState(false);
  const [loginIdAvailable, setLoginIdAvailable] = useState<boolean | null>(null);
  const [socialConfirmProvider, setSocialConfirmProvider] = useState<string | null>(null);

  // 이미 가입된 회원 감지 상태
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [alreadyRegisteredProvider, setAlreadyRegisteredProvider] = useState<string | null>(null);
  const [alreadyRegisteredAt, setAlreadyRegisteredAt] = useState<string | null>(null);

  // URL 에러 파라미터 감지 (이미 가입된 회원)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'ALREADY_REGISTERED') {
      setAlreadyRegistered(true);
      setAlreadyRegisteredProvider(searchParams.get('provider'));
      setAlreadyRegisteredAt(searchParams.get('registeredAt'));
    }
  }, [searchParams]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  const handleCheckLoginId = async () => {
    if (!loginId) {
      setError('아이디를 입력해주세요.');
      return;
    }
    if (loginId.length < 4) {
      setError('아이디는 4자 이상이어야 합니다.');
      return;
    }
    setError(null);
    try {
      const result = await checkLoginId.mutateAsync(loginId);
      setLoginIdChecked(true);
      setLoginIdAvailable(result.available);
      if (!result.available) {
        setError('이미 사용 중인 아이디입니다.');
      }
    } catch {
      setError('중복 확인에 실패했습니다.');
    }
  };

  const handleLoginIdChange = (value: string) => {
    setLoginId(value);
    setLoginIdChecked(false);
    setLoginIdAvailable(null);
  };

  const formatPhoneNumber = useCallback((value: string) => {
    return value.replace(/[^0-9]/g, '').slice(0, 11);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginId || !password || !name || !contactEmail) {
      setError('필수 항목을 모두 입력해주세요.');
      return;
    }

    if (loginId.length < 4) {
      setError('아이디는 4자 이상이어야 합니다.');
      return;
    }

    if (!loginIdChecked || !loginIdAvailable) {
      setError('아이디 중복확인을 해주세요.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      await register.mutateAsync({
        loginId,
        password,
        name,
        contactEmail,
        phone: phone || undefined,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '회원가입에 실패했습니다.';
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-[calc(100vh-300px)] flex items-center justify-center p-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <Link href="/" className="inline-block mb-4">
            <div className="w-12 h-12 bg-[#E4007F] rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
          </Link>
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>Printing114 계정을 만들어보세요</CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-3">
            {/* 아이디 */}
            <div className="space-y-1.5">
              <Label htmlFor="loginId" className="text-[14px] text-black font-normal">아이디</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="loginId"
                    type="text"
                    placeholder="아이디 입력 (4자 이상)"
                    value={loginId}
                    onChange={(e) => handleLoginIdChange(e.target.value)}
                    className="pl-10 h-11"
                    autoComplete="username"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-4 shrink-0"
                  onClick={handleCheckLoginId}
                  disabled={checkLoginId.isPending || loginId.length < 4}
                >
                  {checkLoginId.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : '중복확인'}
                </Button>
              </div>
              {loginIdChecked && loginIdAvailable && (
                <p className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  사용 가능한 아이디입니다.
                </p>
              )}
            </div>

            {/* 비밀번호 */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[14px] text-black font-normal">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호 입력 (6자 이상)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* 비밀번호 확인 */}
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

            {/* 이름 */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[14px] text-black font-normal">이름</Label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="이름 입력"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-11"
                  autoComplete="name"
                />
              </div>
            </div>

            {/* 이메일 */}
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail" className="text-[14px] text-black font-normal">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="이메일 입력"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="pl-10 h-11"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* 전화번호 (선택) */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[14px] text-black font-normal">
                전화번호 <span className="text-gray-400 text-xs">(선택)</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  className="pl-10 h-11"
                  autoComplete="tel"
                  maxLength={11}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-[#E4007F] hover:bg-[#C5006D] text-white mt-2"
              disabled={register.isPending}
            >
              {register.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              회원가입
            </Button>
          </form>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">또는 소셜 계정으로 가입</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setSocialConfirmProvider('naver')}
              className="inline-flex items-center justify-center w-full h-12 rounded-md text-sm font-medium bg-[#03C75A] hover:bg-[#02b351] text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" fill="currentColor">
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
              </svg>
              네이버로 가입
            </button>

            <button
              type="button"
              onClick={() => setSocialConfirmProvider('kakao')}
              className="inline-flex items-center justify-center w-full h-12 rounded-md text-sm font-medium bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.65 1.73 4.973 4.342 6.324-.143.532-.548 2.043-.623 2.359-.096.397.146.392.307.286.126-.083 2.016-1.368 2.838-1.925.698.103 1.43.157 2.136.157 5.523 0 10-3.463 10-7.691C21 6.463 17.523 3 12 3z" />
              </svg>
              카카오로 가입
            </button>

            <button
              type="button"
              onClick={() => setSocialConfirmProvider('google')}
              className="inline-flex items-center justify-center w-full h-12 rounded-md text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google로 가입
            </button>

          {/* 이미 가입된 회원 안내 다이얼로그 */}
          <Dialog open={alreadyRegistered} onOpenChange={(open) => !open && setAlreadyRegistered(false)}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="text-[18px] text-black font-bold">이미 가입된 회원입니다</DialogTitle>
                <DialogDescription className="text-[14px] text-black font-normal">
                  {alreadyRegisteredProvider === 'naver' ? '네이버' : alreadyRegisteredProvider === 'kakao' ? '카카오' : 'Google'} 계정으로{' '}
                  {alreadyRegisteredAt && (
                    <strong>{alreadyRegisteredAt}</strong>
                  )}
                  에 가입하셨습니다.
                  <br />
                  로그인 페이지에서 로그인하시겠습니까?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setAlreadyRegistered(false)}
                >
                  닫기
                </Button>
                <Button
                  className="bg-[#E4007F] hover:bg-[#C5006D] text-white"
                  onClick={() => router.push('/login')}
                >
                  <LogIn className="mr-1.5 h-4 w-4" />
                  로그인하기
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>

          {/* 소셜 회원가입 확인 다이얼로그 */}
          <Dialog open={!!socialConfirmProvider} onOpenChange={(open) => !open && setSocialConfirmProvider(null)}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="text-[18px] text-black font-bold">회원가입 확인</DialogTitle>
                <DialogDescription className="text-[14px] text-black font-normal">
                  {socialConfirmProvider === 'naver' ? '네이버' : socialConfirmProvider === 'kakao' ? '카카오' : 'Google'} 계정으로 회원가입하시겠습니까?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setSocialConfirmProvider(null)}
                >
                  취소
                </Button>
                <a href={`${apiUrl}/auth/${socialConfirmProvider === 'google' ? 'google' : `${socialConfirmProvider}-register`}`}>
                  <Button className="bg-[#E4007F] hover:bg-[#C5006D] text-white">
                    회원가입
                  </Button>
                </a>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-[14px] text-black font-normal text-center">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              로그인
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-300px)] flex items-center justify-center p-4 py-8">
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

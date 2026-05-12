'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useResendVerification, useVerifyEmailToken } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, Mail, LogIn, Info, User } from 'lucide-react';

const PROVIDER_LABEL: Record<string, string> = {
  naver: '네이버',
  kakao: '카카오',
  google: 'Google',
};

function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = local.slice(0, Math.min(2, local.length));
  const stars = '*'.repeat(Math.max(1, local.length - visible.length));
  return `${visible}${stars}${domain}`;
}

function isFakeOAuthEmail(email: string): boolean {
  return /^kakao_[a-z0-9_-]+@kakao\.com$/i.test(email)
    || /^naver_[a-z0-9_-]+@naver\.com$/i.test(email)
    || /^google_[a-z0-9_-]+@gmail\.com$/i.test(email);
}

/** 소셜 가입자 전용 — 실제 이메일 입력 후 재발송 */
function OAuthResendBox({ loginId, providerLabel }: { loginId: string; providerLabel: string }) {
  const resend = useResendVerification();
  const [contactEmail, setContactEmail] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const handleSend = async () => {
    if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      setMsg({ type: 'error', text: '올바른 이메일 주소를 입력해 주세요.' });
      return;
    }
    setMsg(null);
    try {
      await resend.mutateAsync({ loginId, contactEmail: contactEmail.trim() });
      setMsg({ type: 'ok', text: `${contactEmail} 로 인증 메일을 보냈습니다. 메일함을 확인해 주세요.` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('429') || message.toLowerCase().includes('too many')) {
        setMsg({ type: 'error', text: '잠시 후 다시 시도해 주세요. (1분에 1회만 가능)' });
      } else {
        setMsg({ type: 'error', text: '발송에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
      }
    }
  };

  return (
    <div className="space-y-3 text-left">
      <p className="text-[14px] text-gray-600 leading-relaxed text-center">
        {providerLabel} 계정으로 가입하셨습니다.<br />
        인증 메일을 받을 <strong>실제 이메일 주소</strong>를 입력해 주세요.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="contactEmail" className="text-[14px] text-black font-normal">이메일 주소</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="contactEmail"
              type="email"
              placeholder="example@email.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="pl-10 h-10"
            />
          </div>
          <Button
            type="button"
            className="h-10 px-4 shrink-0 bg-[#E4007F] hover:bg-[#C5006D] text-white"
            onClick={handleSend}
            disabled={resend.isPending}
          >
            {resend.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '인증 메일 받기'}
          </Button>
        </div>
      </div>
      {msg && (
        <p className={`text-[13px] ${msg.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

/** 일반 회원 재발송 박스 */
function ResendBox({ initialLoginId = '' }: { initialLoginId?: string }) {
  const resend = useResendVerification();
  const [loginId, setLoginId] = useState(initialLoginId);
  const [resendMsg, setResendMsg] = useState<{ type: 'ok' | 'error' | 'verified'; text: string } | null>(null);

  const handleResend = async () => {
    if (!loginId.trim()) {
      setResendMsg({ type: 'error', text: '아이디를 입력해 주세요.' });
      return;
    }
    setResendMsg(null);
    try {
      const res = await resend.mutateAsync({ loginId: loginId.trim() });
      if (res?.alreadyVerified) {
        setResendMsg({ type: 'verified', text: '이미 인증이 완료된 계정입니다. 로그인해 주세요.' });
      } else {
        setResendMsg({ type: 'ok', text: '인증 메일을 재발송했습니다. 메일함을 확인해 주세요.' });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '재발송에 실패했습니다.';
      if (message.includes('429') || message.toLowerCase().includes('too many')) {
        setResendMsg({ type: 'error', text: '잠시 후 다시 시도해 주세요. (1분에 1회만 가능)' });
      } else {
        setResendMsg({ type: 'error', text: message || '재발송에 실패했습니다.' });
      }
    }
  };

  return (
    <div className="mt-2 rounded-md bg-gray-50 border border-gray-200 p-3 space-y-2 text-left">
      <p className="text-[13px] text-gray-600">인증 메일을 받지 못하셨나요? 아이디를 입력하면 다시 보내드립니다.</p>
      <div className="space-y-1.5">
        <Label htmlFor="resendLoginId" className="text-[14px] text-black font-normal">아이디</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="resendLoginId"
              type="text"
              placeholder="가입 시 사용한 아이디"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <Button type="button" variant="outline" className="h-10 px-4 shrink-0" onClick={handleResend} disabled={resend.isPending}>
            {resend.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '재발송'}
          </Button>
        </div>
      </div>
      {resendMsg && (
        <p className={`text-[13px] ${resendMsg.type === 'ok' || resendMsg.type === 'verified' ? 'text-green-600' : 'text-red-600'}`}>
          {resendMsg.text}
        </p>
      )}
    </div>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const pending = searchParams.get('pending');
  const provider = searchParams.get('provider') ?? '';
  const emailParam = searchParams.get('email') ?? '';

  const verifyToken = useVerifyEmailToken();
  const [tokenState, setTokenState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [verifiedEmail, setVerifiedEmail] = useState<string | undefined>(undefined);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setTokenState('loading');
    verifyToken
      .mutateAsync(token)
      .then((res) => {
        if (cancelled) return;
        setVerifiedEmail(res?.email);
        setTokenState('success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTokenError(err instanceof Error ? err.message : '인증에 실패했습니다.');
        setTokenState('error');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const providerLabel = provider ? PROVIDER_LABEL[provider] || provider : null;
  const isFakeEmail = emailParam ? isFakeOAuthEmail(emailParam) : false;

  return (
    <div className="min-h-[calc(100vh-300px)] flex items-center justify-center p-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <Link href="/" className="inline-block mb-4">
            <div className="w-12 h-12 bg-[#E4007F] rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
          </Link>
          <CardTitle className="text-2xl">이메일 인증</CardTitle>
          <CardDescription>Photocafe 계정 이메일 인증</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-center">
          {/* 토큰 인증 처리 */}
          {token && tokenState === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-[#E4007F]" />
              <p className="text-[14px] text-black font-normal">이메일 인증을 확인하고 있습니다...</p>
            </div>
          )}

          {token && tokenState === 'success' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <p className="text-[16px] text-black font-medium">이메일 인증이 완료되었습니다.</p>
                <p className="text-[14px] text-gray-600 font-normal">
                  {verifiedEmail ? <strong>{verifiedEmail}</strong> : ''} 이제 로그인할 수 있습니다.
                </p>
              </div>
              <Link href="/login">
                <Button className="w-full h-11 bg-[#E4007F] hover:bg-[#C5006D] text-white">
                  <LogIn className="mr-1.5 h-4 w-4" />
                  로그인하러 가기
                </Button>
              </Link>
            </div>
          )}

          {token && tokenState === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <p className="text-[16px] text-black font-medium">인증에 실패했습니다.</p>
                <p className="text-[14px] text-red-600 font-normal">{tokenError || '인증 링크가 만료되었거나 잘못되었습니다.'}</p>
              </div>
              <ResendBox />
              <Link href="/login">
                <Button variant="outline" className="w-full h-11">로그인 페이지로</Button>
              </Link>
            </div>
          )}

          {/* 소셜 가입 — 가짜 이메일: 실제 이메일 입력 폼 표시 */}
          {!token && pending === '1' && isFakeEmail && providerLabel && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-2">
                <Info className="h-12 w-12 text-blue-500" />
                <p className="text-[16px] text-black font-medium">이메일 인증이 필요합니다</p>
              </div>
              <OAuthResendBox loginId={emailParam} providerLabel={providerLabel} />
              <Link href="/login">
                <Button variant="outline" className="w-full h-11">로그인 페이지로</Button>
              </Link>
            </div>
          )}

          {/* 소셜 가입 — 실제 이메일로 발송된 경우 */}
          {!token && pending === '1' && !isFakeEmail && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <Info className="h-12 w-12 text-blue-500" />
                <p className="text-[16px] text-black font-medium">이메일 인증이 필요합니다</p>
                <p className="text-[14px] text-gray-600 font-normal leading-relaxed">
                  {providerLabel ? `${providerLabel} 계정으로 가입되었습니다. ` : ''}
                  인증 링크를 보냈습니다. 메일함을 확인해 인증을 완료한 뒤 다시 로그인해 주세요.
                </p>
                {emailParam && (
                  <div className="flex items-center gap-2 rounded-md bg-blue-50 border border-blue-200 px-4 py-2">
                    <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-[14px] text-blue-800 font-medium">{maskEmail(emailParam)}</span>
                  </div>
                )}
              </div>
              <ResendBox initialLoginId={emailParam} />
              <Link href="/login">
                <Button variant="outline" className="w-full h-11">로그인 페이지로</Button>
              </Link>
            </div>
          )}

          {/* 잘못된 접근 */}
          {!token && pending !== '1' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <Mail className="h-12 w-12 text-gray-400" />
                <p className="text-[14px] text-gray-600 font-normal">
                  이메일 인증 페이지입니다. 가입 시 받은 메일의 인증 링크를 클릭해 주세요.
                </p>
              </div>
              <ResendBox />
              <Link href="/login">
                <Button variant="outline" className="w-full h-11">로그인 페이지로</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  );
}
